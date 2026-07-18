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
const NEWSLETTER_KEYWORDS = ['newsletter', 'subscribe', 'unsubscribe', 'promotion', 'deal', 'offer', 'click here', 'limited time', 'don\'t miss'];
const IRRELEVANT_PATTERNS = /^(ok|thanks|no|yes|👍|😊|lol|haha|good|bye|hello|hi)$/i;

// ============ AI RESPONSE ENDPOINT ============
app.post('/api/ai-response', async (req, res) => {
  try {
    const { userMessage, conversationHistory, prospectId } = req.body;

    console.log('🤖 AI Request - Prospect:', prospectId);

    // Fetch prospect details
    const { data: prospect, error: prospectError } = await supabase
      .from('re_prospect_leads')
      .select('*')
      .eq('id', prospectId)
      .single();

    if (prospectError) {
      console.error('Error fetching prospect:', prospectError);
      return res.status(400).json({ error: 'Prospect not found' });
    }

    console.log('📍 Prospect Area:', prospect?.preferred_area, 'Budget:', prospect?.target_budget);

    // Fetch matching properties - PROPERLY BUILD QUERY
    let propertiesQuery = supabase.from('re_properties').select('*');

    // Apply filters
    if (prospect?.preferred_area) {
      propertiesQuery = propertiesQuery.ilike('location', `%${prospect.preferred_area}%`);
    }

    if (prospect?.target_budget) {
      const budget = parseInt(prospect.target_budget.toString().replace(/[^\d]/g, '')) || 0;
      if (budget > 0) {
        propertiesQuery = propertiesQuery.lte('price', budget.toString());
      }
    }

    // Execute query with order and limit
    const { data: properties, error: propertiesError } = await propertiesQuery
      .order('price', { ascending: true })
      .limit(5);

    if (propertiesError) {
      console.error('Error fetching properties:', propertiesError);
    }

    console.log('🏠 Found properties:', properties?.length || 0);

    // Build property context
    let propertyContext = '';
    if (properties && properties.length > 0) {
      propertyContext = `\n\n🏠 AVAILABLE PROPERTIES:\n${properties
        .map(
          (p) =>
            `• **${p.title}** in ${p.location}\n   📍 ${p.address}\n   💰 R${parseInt(p.price).toLocaleString()}\n   🛏️ ${p.bedrooms}bd ${p.bathroom}ba\n   📝 ${p.description?.substring(0, 60) || 'Modern property'}...`
        )
        .join('\n\n')}`;
    } else {
      propertyContext = '\n\n❌ No matching properties in database yet.';
    }

    const systemPrompt = `You are an ELITE REAL ESTATE MASTER SELLER for South Africa.

PROSPECT PROFILE:
- Name: ${prospect?.prospect_name || 'Valued Client'}
- Budget: R${prospect?.target_budget || 'Flexible'}
- Area: ${prospect?.preferred_area || 'Open to options'}
- Bedrooms: ${prospect?.bedrooms || 'Not specified'}
- Stage: ${prospect?.lead_stage || 'Discovery'}

${propertyContext}

YOUR MISSION:
1. REFERENCE specific properties by name and price
2. Highlight how each property matches their needs
3. Build urgency and excitement
4. Ask qualifying questions
5. Move toward scheduling viewings
6. Keep responses 2-3 sentences, warm and professional
7. Use local SA property terms (sectional title, garden, pool, etc)

CRITICAL: Always mention specific property names and prices when recommending.`;

    console.log('📤 Calling OpenAI with property context...');

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        { role: 'system', content: systemPrompt },
        ...conversationHistory.slice(-5).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 300,
    });

    const aiResponse = response.choices?.[0]?.message?.content || 'How can I assist you further?';

    console.log('✅ AI Response:', aiResponse.substring(0, 80) + '...');

    res.json({ reply: aiResponse });
  } catch (error) {
    console.error('❌ AI Response Error:', error.message);
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
  const lowerText = msg.body.toLowerCase();
  if (NEWSLETTER_KEYWORDS.some((keyword) => lowerText.includes(keyword))) return false;
  if (IRRELEVANT_PATTERNS.test(msg.body)) return false;
  const msgTime = msg.timestamp * 1000;
  if (msgTime < BOT_START_TIME.getTime()) return false;
  if (msg.body.length > 500 && msg.body.split(msg.body.charAt(0)).length > 20) return false;
  if (msg.body.startsWith('http') && !msg.body.includes('property') && !msg.body.includes('house') && !msg.body.includes('apartment')) return false;
  return true;
}

async function getAIIntelligence(text, history, prospect) {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are Elite Real Estate Assistant extracting lead intelligence.
                    
Current Lead: Name: ${prospect.prospect_name || 'Unknown'}, Budget: ${prospect.target_budget || 'Not specified'}, Area: ${prospect.preferred_area || 'Not specified'}.

Extract and respond with ONLY valid JSON:
{
  "reply": "Your response here - warm, professional, 2-3 sentences",
  "extracted_data": {
    "name": "name if mentioned",
    "budget": "budget if mentioned",
    "location": "area if mentioned",
    "score": "Hot|Warm|Cool based on intent"
  }
}

Rules:
- Score "Hot" if asking to buy/view immediately
- Score "Warm" if interested but asking questions
- Score "Cool" if just browsing
- Never ask for info you already have
- Keep reply natural and warm`,
        },
        ...history.slice(-4),
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });

    const parsed = JSON.parse(response.choices[0].message.content);
    console.log('📊 Extracted Score:', parsed.extracted_data?.score);
    return parsed;
  } catch (e) {
    console.error('AI Intelligence Error:', e.message);
    return {
      reply: "I'm analyzing property options for you. 🏠",
      extracted_data: { score: 'Warm' },
    };
  }
}

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => {
  console.log('🚀 ESTATE BOT: Online');
  console.log(`📅 Started: ${BOT_START_TIME.toLocaleString()}`);
});

client.on('message', async (msg) => {
  if (!isRelevantMessage(msg)) return;

  const waNumber = msg.from;
  const text = msg.body;

  console.log(`\n📨 Message from ${waNumber}: "${text.substring(0, 60)}..."`);

  try {
    // Get or create prospect
    let { data: prospect } = await supabase.from('re_prospect_leads').select('*').eq('wa_number', waNumber).single();
    if (!prospect) {
      console.log('✨ New prospect created');
      const { data: newP } = await supabase.from('re_prospect_leads').insert([{ wa_number: waNumber }]).select().single();
      prospect = newP;
    }

    // Get conversation history
    let { data: log } = await supabase.from('re_interaction_logs').select('*').eq('prospect_id', prospect.id).single();

    let convo = [];
    if (log?.conversation) {
      try {
        const parsed = JSON.parse(log.conversation);
        convo = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Parse error:', e);
        convo = [];
      }
    }

    // Add user message
    convo.push({ role: 'user', content: text, t: new Date().toISOString() });

    // Get AI response with intelligence extraction
    const ai = await getAIIntelligence(text, convo, prospect);
    convo.push({ role: 'assistant', content: ai.reply, t: new Date().toISOString() });

    // Save conversation
    const { error: saveError } = await supabase.from('re_interaction_logs').upsert({
      prospect_id: prospect.id,
      conversation: JSON.stringify(convo),
      last_updated_at: new Date().toISOString(),
    });

    if (saveError) console.error('Save error:', saveError);

    // Update prospect with extracted data
    if (ai.extracted_data) {
      const updates = {};
      if (ai.extracted_data.name) updates.prospect_name = ai.extracted_data.name;
      if (ai.extracted_data.budget) updates.target_budget = ai.extracted_data.budget;
      if (ai.extracted_data.location) updates.preferred_area = ai.extracted_data.location;
      if (ai.extracted_data.score) {
        updates.lead_score = ai.extracted_data.score;
        // Auto-move to Interested if Hot or Warm
        if (ai.extracted_data.score === 'Hot') {
          updates.lead_stage = 'Interested';
          console.log('🔥 Lead upgraded to HOT - Moving to Interested');
        } else if (ai.extracted_data.score === 'Warm' && prospect.lead_stage === 'Discovery') {
          updates.lead_stage = 'Interested';
          console.log('🌡️ Lead is WARM - Moving to Interested');
        }
      }

      if (Object.keys(updates).length > 0) {
        const { error: updateError } = await supabase
          .from('re_prospect_leads')
          .update(updates)
          .eq('id', prospect.id);

        if (updateError) {
          console.error('Update error:', updateError);
        } else {
          console.log('✅ Prospect updated:', updates);
        }
      }
    }

    msg.reply(ai.reply);
    console.log('✅ Reply sent\n');
  } catch (err) {
    console.error('❌ Error:', err.message);
    msg.reply('I apologize, I encountered an issue. Please try again.');
  }
});

client.initialize();

// Start API server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`\n✅ API Server: http://localhost:${PORT}\n`);
});
