const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
app.use(express.json());
app.use(cors());

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BOT_START_TIME = new Date();

// ============ UNIFIED AI FUNCTION ============
async function generateAIResponse(userText, conversationHistory, prospect) {
  try {
    console.log('\n🤖 === AI PROCESSING START ===');
    console.log('📝 User:', userText);
    console.log('👤 Prospect:', prospect.prospect_name, '| Area:', prospect.preferred_area, '| Budget:', prospect.target_budget);

    // FETCH PROPERTIES - CORRECT COLUMN NAMES
    let propertiesQuery = supabase
      .from('re_properties')
      .select('id, title, location, text, price, image_url1');

    if (prospect?.preferred_area) {
      propertiesQuery = propertiesQuery.ilike('location', `%${prospect.preferred_area}%`);
    }

    if (prospect?.target_budget) {
      const budgetStr = prospect.target_budget.toString().replace(/[^\d]/g, '');
      const budget = parseInt(budgetStr) || 0;
      if (budget > 0) {
        propertiesQuery = propertiesQuery.lte('price', budget.toString());
      }
    }

    const { data: properties, error: propError } = await propertiesQuery
      .order('price', { ascending: true })
      .limit(6);

    if (propError) {
      console.error('❌ Property fetch error:', propError.message);
    } else {
      console.log(`✅ Found ${properties?.length || 0} matching properties from DATABASE`);
      if (properties && properties.length > 0) {
        properties.forEach(p => {
          const priceNum = parseInt(p.price) || 0;
          console.log(`   • "${p.title}" in ${p.location} - R${priceNum.toLocaleString()}`);
        });
      }
    }

    // BUILD PROPERTY CONTEXT
    let propertyContext = '';
    if (properties && properties.length > 0) {
      propertyContext = `\n\n📍 MATCHING PROPERTIES FROM DATABASE:\n`;
      properties.forEach((p, i) => {
        const priceNum = parseInt(p.price) || 0;
        propertyContext += `\n${i + 1}. "${p.title}"
   Location: ${p.location}
   Price: R${priceNum.toLocaleString()}
   URL: ${p.text || 'Property link'}`;
      });
    } else {
      propertyContext = '\n\n⚠️ No matching properties found in database for this criteria.';
    }

    const systemPrompt = `You are a professional South African real estate agent.

PROSPECT PROFILE:
- Name: ${prospect.prospect_name || 'Client'}
- Budget: R${prospect.target_budget || 'Not specified'}
- Area: ${prospect.preferred_area || 'Not specified'}
- Stage: ${prospect.lead_stage || 'Discovery'}

${propertyContext}

CRITICAL RULES:
1. REFERENCE EXACT PROPERTY NAMES AND PRICES from the list above
2. If properties found: "I found 'Property Title' in ${prospect.preferred_area} for R[price]"
3. If no properties: "We don't currently have properties matching that, but let me help find options"
4. Be warm, professional, persuasive
5. Build urgency for viewings
6. Max 3 sentences
7. DO NOT mention "database" or "list" - speak naturally`;

    console.log('📤 Calling OpenAI...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-5).map(msg => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: userText },
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const aiReply = response.choices?.[0]?.message?.content || 'How can I help?';
    console.log('✅ AI Reply:', aiReply.substring(0, 120) + '...');

    // SCORE DETECTION
    let leadScore = prospect.lead_score || 'Cool';
    let newLeadStage = prospect.lead_stage || 'Discovery';

    const lowerUser = userText.toLowerCase();
    const lowerReply = aiReply.toLowerCase();

    if (
      lowerUser.includes('show') || 
      lowerUser.includes('see') || 
      lowerUser.includes('viewing') ||
      lowerUser.includes('book') ||
      lowerUser.includes('schedule') ||
      lowerReply.includes('viewing') ||
      lowerReply.includes('schedule')
    ) {
      leadScore = 'Hot';
      newLeadStage = 'Interested';
    } else if (
      lowerUser.includes('looking') ||
      lowerUser.includes('interested') ||
      lowerUser.includes('find') ||
      lowerUser.includes('apartment') ||
      lowerUser.includes('house') ||
      lowerUser.includes('property') ||
      properties?.length > 0
    ) {
      leadScore = 'Warm';
      if (prospect.lead_stage === 'Discovery') {
        newLeadStage = 'Interested';
      }
    }

    console.log(`📊 Score: ${leadScore} | Stage: ${prospect.lead_stage} → ${newLeadStage}`);

    return {
      reply: aiReply,
      extracted_data: {
        score: leadScore,
        newStage: newLeadStage,
      },
    };
  } catch (error) {
    console.error('❌ AI Error:', error.message);
    throw error;
  }
}

// ============ API ENDPOINT ============
app.post('/api/ai-response', async (req, res) => {
  try {
    const { userMessage, conversationHistory, prospectId } = req.body;

    const { data: prospect, error: prospectError } = await supabase
      .from('re_prospect_leads')
      .select('*')
      .eq('id', prospectId)
      .single();

    if (prospectError || !prospect) {
      return res.status(400).json({ error: 'Prospect not found' });
    }

    const result = await generateAIResponse(userMessage, conversationHistory, prospect);

    // Update prospect
    if (result.extracted_data.score !== prospect.lead_score || result.extracted_data.newStage !== prospect.lead_stage) {
      const updates = {
        lead_score: result.extracted_data.score,
        lead_stage: result.extracted_data.newStage,
      };

      console.log('🔄 Updating prospect:', updates);

      await supabase
        .from('re_prospect_leads')
        .update(updates)
        .eq('id', prospect.id);
    }

    res.json({ reply: result.reply });
  } catch (error) {
    console.error('API Error:', error.message);
    res.status(500).json({ error: error.message });
  }
});

// ============ WHATSAPP BOT ============
const client = new Client({
  authStrategy: new LocalAuth(),
  puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] },
});

function isRelevantMessage(msg) {
  if (msg.from.endsWith('@g.us')) return false;
  if (msg.isStatus) return false;
  if (msg.fromMe) return false;
  if (msg.type === 'vcard' || msg.body.includes('vcard')) return false;
  if (msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'audio') {
    if (!msg.caption || msg.caption.trim().length === 0) return false;
  }
  const msgTime = msg.timestamp * 1000;
  if (msgTime < BOT_START_TIME.getTime()) return false;
  return true;
}

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => {
  console.log('🚀 ESTATE BOT: Online');
});

client.on('message', async (msg) => {
  if (!isRelevantMessage(msg)) return;

  const waNumber = msg.from;
  const text = msg.body;

  console.log(`\n📱 WhatsApp from ${waNumber}: "${text.substring(0, 60)}..."`);

  try {
    let { data: prospect } = await supabase
      .from('re_prospect_leads')
      .select('*')
      .eq('wa_number', waNumber)
      .single();

    if (!prospect) {
      console.log('✨ New prospect created');
      const { data: newP } = await supabase
        .from('re_prospect_leads')
        .insert([{ wa_number: waNumber }])
        .select()
        .single();
      prospect = newP;
    }

    let { data: log } = await supabase
      .from('re_interaction_logs')
      .select('*')
      .eq('prospect_id', prospect.id)
      .single();

    let convo = [];
    if (log?.conversation) {
      try {
        convo = JSON.parse(log.conversation);
        if (!Array.isArray(convo)) convo = [];
      } catch (e) {
        convo = [];
      }
    }

    convo.push({ role: 'user', content: text, t: new Date().toISOString() });

    const aiResult = await generateAIResponse(text, convo, prospect);
    convo.push({ role: 'assistant', content: aiResult.reply, t: new Date().toISOString() });

    await supabase.from('re_interaction_logs').upsert({
      prospect_id: prospect.id,
      conversation: JSON.stringify(convo),
      last_updated_at: new Date().toISOString(),
    });

    const updates = {
      lead_score: aiResult.extracted_data.score,
      lead_stage: aiResult.extracted_data.newStage,
    };

    await supabase
      .from('re_prospect_leads')
      .update(updates)
      .eq('id', prospect.id);

    console.log('✅ Prospect updated:', updates);

    msg.reply(aiResult.reply);
    console.log('✅ Reply sent\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
  }
});

client.initialize();

const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n✅ Server: http://localhost:${PORT}\n`);
});
