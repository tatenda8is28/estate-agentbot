const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

async function getAIIntelligence(text, history, prospect) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an Elite Real Estate Assistant. 
                    Current Lead Info: Name: ${prospect.prospect_name}, Budget: ${prospect.target_budget}, Area: ${prospect.preferred_area}.
                    Rules: 
                    1. Never ask for info you already have.
                    2. Acknowledge locations (e.g. "Northcliff is a great investment").
                    3. Keep replies under 3 sentences.
                    4. Return JSON only with: "reply", "extracted_data" (name, budget, location, score).`
                },
                ...history.slice(-6), // Send last 6 messages for context
                { role: "user", content: text }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (e) {
        return { reply: "I'm looking into those property details for you now.", extracted_data: {} };
    }
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => console.log('🚀 ESTATE ENGINE: Online'));

client.on('message', async (msg) => {
    if (msg.from.endsWith('@g.us') || msg.isStatus || msg.fromMe) return;

    const waNumber = msg.from;
    const text = msg.body;

    try {
        // 1. IDENTIFY PROSPECT
        let { data: prospect } = await supabase.from('re_prospect_leads').select('*').eq('wa_number', waNumber).single();
        if (!prospect) {
            const { data: newP } = await supabase.from('re_prospect_leads').insert([{ wa_number: waNumber }]).select().single();
            prospect = newP;
        }

        // 2. GET SINGLE-ROW CONVERSATION
        let { data: log } = await supabase.from('re_interaction_logs').select('conversation').eq('prospect_id', prospect.id).single();
        let convo = log ? log.conversation : [];

        // 3. APPEND INBOUND & GET AI REPLY
        convo.push({ role: 'user', content: text, t: new Date().toISOString() });
        const ai = await getAIIntelligence(text, convo, prospect);
        convo.push({ role: 'assistant', content: ai.reply, t: new Date().toISOString() });

        // 4. UPSERT CONVERSATION (Single Row)
        await supabase.from('re_interaction_logs').upsert({
            prospect_id: prospect.id,
            conversation: convo,
            last_updated_at: new Date().toISOString()
        });

        // 5. UPDATE PROSPECT DATA
        if (ai.extracted_data) {
            await supabase.from('re_prospect_leads').update({
                prospect_name: ai.extracted_data.name || prospect.prospect_name,
                target_budget: ai.extracted_data.budget || prospect.target_budget,
                preferred_area: ai.extracted_data.location || prospect.preferred_area,
                lead_score: ai.extracted_data.score?.toString() || prospect.lead_score
            }).eq('id', prospect.id);
        }

        msg.reply(ai.reply);

    } catch (err) { console.error("Error:", err); }
});

client.initialize();