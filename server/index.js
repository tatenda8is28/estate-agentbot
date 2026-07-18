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

// Store bot start time
const BOT_START_TIME = new Date();
const NEWSLETTER_KEYWORDS = ['newsletter', 'subscribe', 'unsubscribe', 'promotion', 'deal', 'offer', 'click here', 'limited time', 'don\'t miss'];
const IRRELEVANT_PATTERNS = /^(ok|thanks|no|yes|👍|😊|lol|haha|good|bye|hello|hi)$/i;

// ============ AI RESPONSE ENDPOINT ============
app.post('/api/ai-response', async (req, res) => {
  try {
    const { userMessage, conversationHistory, prospectId } = req.body;

    // Fetch prospect details
    const { data: prospect } = await supabase
      .from('re_prospect_leads')
      .select('*')
      .eq('id', prospectId)
      .single();

    // Fetch matching properties based on prospect preferences
    let propertiesQuery = supabase.from('re_properties').select('*').limit(5);

    if (prospect?.preferred_area) {
      propertiesQuery = propertiesQuery.ilike('location', `%${prospect.preferred_area}%`);
    }

    if (prospect?.target_budget) {
      const budget = parseInt(prospect.target_budget.toString().replace(/[^\d]/g, '')) || 0;
      if (budget > 0) {
        propertiesQuery = propertiesQuery.lte('price', budget.toString());
      }
    }

    const { data: properties } = await propertiesQuery.order('price', { ascending: true });

    // Build property context
    let propertyContext = '';
    if (properties && properties.length > 0) {
      propertyContext = `\n\n🏠 AVAILABLE PROPERTIES IN THEIR AREA:\n${properties
        .slice(0, 5)
        .map(
          (p) =>
            `• ${p.title} - ${p.location}\n  Address: ${p.address}\n  Price: R${parseInt(p.price).toLocaleString()}\n  Details: ${p.bedrooms} bed, ${p.bathroom} bath\n  ${p.description?.substring(0, 50)}...`
        )
        .join('\n\n')}`;
    }

    const response = await openai.chat.completions.create({
      model: 'gpt-4o',
      messages: [
        {
          role: 'system',
          content: `You are an ELITE REAL ESTATE MASTER SELLER representing a luxury property platform in South Africa. You are persuasive, knowledgeable, and results-driven.

PROSPECT PROFILE:
- Name: ${prospect?.prospect_name || 'Valued Client'}
- Budget: R${prospect?.target_budget || 'Flexible'}
- Preferred Area: ${prospect?.preferred_area || 'Open'}
- Looking for: ${prospect?.bedrooms ? `${prospect.bedrooms} bedrooms` : 'Property'}
- Current Stage: ${prospect?.lead_stage || 'Discovery'}

${propertyContext}

YOUR OBJECTIVES:
1. Understand their exact needs and pain points
2. Present properties that match their criteria (reference specific listings above)
3. Highlight area benefits and investment potential
4. Overcome objections with confidence
5. Move them toward scheduling viewings
6. Be warm, professional, and persuasive
7. Keep responses concise (2-3 sentences) but impactful
8. Include property names when relevant
9. Always be ready to facilitate immediate viewings
10. Build urgency when appropriate

TONE: Confident, friendly, solution-focused. Use their preferred area name. Reference specific properties.`,
        },
        ...conversationHistory.slice(-5).map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        { role: 'user', content: userMessage },
      ],
      temperature: 0.8,
      max_tokens: 250,
    });

    const aiResponse = response.choices?.[0]?.message?.content || 'How else can I assist you today?';

    res.json({ reply: aiResponse });
  } catch (error) {
    console.error('AI Response Error:', error);
    res.status(500).json({ error: 'Failed to generate response' });
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
          content: `You are an Elite Real Estate Assistant. 
                    Current Lead Info: Name: ${prospect.prospect_name || 'Unknown'}, Budget: ${prospect.target_budget || 'Not specified'}, Area: ${prospect.preferred_area || 'Not specified'}.
                    Rules: 
                    1. Never ask for info you already have.
                    2. Acknowledge locations (e.g. "Northcliff is a great investment").
                    3. Keep replies under 3 sentences.
                    4. Be warm, professional, and helpful.
                    5. Return JSON only with: "reply", "extracted_data" (name, budget, location, score).
                    6. Score: "Hot" (ready to buy), "Warm" (interested), "Cool" (browsing).`,
        },
        ...history.slice(-6),
        { role: 'user', content: text },
      ],
      response_format: { type: 'json_object' },
    });
    return JSON.parse(response.choices[0].message.content);
  } catch (e) {
    console.error('AI Error:', e.message);
    return { reply: "I'm looking into those property details for you now. 🏠", extracted_data: {} };
  }
}

client.on('qr', (qr) => qrcode.generate(qr, { small: true }));
client.on('ready', () => {
  console.log('🚀 ESTATE ENGINE: Online');
  console.log(`📅 Bot session started at: ${BOT_START_TIME.toLocaleString()}`);
});

client.on('message', async (msg) => {
  if (!isRelevantMessage(msg)) return;

  const waNumber = msg.from;
  const text = msg.body;

  console.log(`📨 New message from ${waNumber}: "${text.substring(0, 50)}..."`);

  try {
    let { data: prospect } = await supabase.from('re_prospect_leads').select('*').eq('wa_number', waNumber).single();
    if (!prospect) {
      console.log(`✨ New prospect created: ${waNumber}`);
      const { data: newP } = await supabase.from('re_prospect_leads').insert([{ wa_number: waNumber }]).select().single();
      prospect = newP;
    }

    let { data: log } = await supabase.from('re_interaction_logs').select('conversation').eq('prospect_id', prospect.id).single();

    let convo = [];
    if (log && log.conversation) {
      try {
        const parsed = JSON.parse(log.conversation);
        convo = Array.isArray(parsed) ? parsed : [];
      } catch (e) {
        console.error('Error parsing conversation:', e);
        convo = [];
      }
    }

    convo.push({ role: 'user', content: text, t: new Date().toISOString() });
    const ai = await getAIIntelligence(text, convo, prospect);
    convo.push({ role: 'assistant', content: ai.reply, t: new Date().toISOString() });

    await supabase.from('re_interaction_logs').upsert({
      prospect_id: prospect.id,
      conversation: JSON.stringify(convo),
      last_updated_at: new Date().toISOString(),
    });

    if (ai.extracted_data) {
      const updates = {};
      if (ai.extracted_data.name) updates.prospect_name = ai.extracted_data.name;
      if (ai.extracted_data.budget) updates.target_budget = ai.extracted_data.budget;
      if (ai.extracted_data.location) updates.preferred_area = ai.extracted_data.location;
      if (ai.extracted_data.score) updates.lead_score = ai.extracted_data.score;

      if (Object.keys(updates).length > 0) {
        await supabase.from('re_prospect_leads').update(updates).eq('id', prospect.id);
        console.log(`📊 Updated prospect data:`, updates);
      }
    }

    msg.reply(ai.reply);
    console.log(`✅ Reply sent to ${waNumber}`);
  } catch (err) {
    console.error('❌ Error:', err);
  }
});

client.initialize();

// Start express server
const PORT = 3001;
app.listen(PORT, () => {
  console.log(`✅ API Server running on http://localhost:${PORT}`);
});
