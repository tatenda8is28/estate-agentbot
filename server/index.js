const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const { createClient } = require('@supabase/supabase-js');
const { OpenAI } = require('openai');
require('dotenv').config();

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const BOT_START_TIME = new Date(); // When bot came online
const NEWSLETTER_KEYWORDS = ['newsletter', 'subscribe', 'unsubscribe', 'promotion', 'deal', 'offer', 'click here', 'limited time', 'don\'t miss'];
const IRRELEVANT_PATTERNS = /^(ok|thanks|no|yes|👍|😊|lol|haha|good|bye|hello|hi)$/i;

const client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: { headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] }
});

function isRelevantMessage(msg) {
    // 1. Ignore group chats
    if (msg.from.endsWith('@g.us')) {
        console.log('⏭️ Skipped: Group message');
        return false;
    }

    // 2. Ignore status updates
    if (msg.isStatus) {
        console.log('⏭️ Skipped: Status message');
        return false;
    }

    // 3. Ignore bot's own messages
    if (msg.fromMe) {
        console.log('⏭️ Skipped: Bot message');
        return false;
    }

    // 4. Ignore contact cards
    if (msg.type === 'vcard' || msg.body.includes('vcard')) {
        console.log('⏭️ Skipped: Contact card');
        return false;
    }

    // 5. Ignore media without captions (images, videos, documents)
    if (msg.type === 'image' || msg.type === 'video' || msg.type === 'document' || msg.type === 'audio') {
        if (!msg.caption || msg.caption.trim().length === 0) {
            console.log(`⏭️ Skipped: Media without caption (${msg.type})`);
            return false;
        }
    }

    // 6. Ignore newsletter/marketing messages
    const lowerText = msg.body.toLowerCase();
    if (NEWSLETTER_KEYWORDS.some(keyword => lowerText.includes(keyword))) {
        console.log('⏭️ Skipped: Newsletter/Marketing message');
        return false;
    }

    // 7. Ignore very short irrelevant responses
    if (IRRELEVANT_PATTERNS.test(msg.body)) {
        console.log('⏭️ Skipped: Irrelevant short response');
        return false;
    }

    // 8. Ignore messages from before bot session started (avoiding old unread messages)
    const msgTime = msg.timestamp * 1000; // Convert to milliseconds
    if (msgTime < BOT_START_TIME.getTime()) {
        console.log('⏭️ Skipped: Message from before bot started');
        return false;
    }

    // 9. Ignore duplicate/spam patterns
    if (msg.body.length > 500 && msg.body.split(msg.body.charAt(0)).length > 20) {
        console.log('⏭️ Skipped: Spam pattern detected');
        return false;
    }

    // 10. Ignore link-only messages (unless property-related)
    if (msg.body.startsWith('http') && !msg.body.includes('property') && !msg.body.includes('house') && !msg.body.includes('apartment')) {
        console.log('⏭️ Skipped: Link-only message');
        return false;
    }

    return true;
}

async function getAIIntelligence(text, history, prospect) {
    try {
        const response = await openai.chat.completions.create({
            model: "gpt-4o",
            messages: [
                {
                    role: "system",
                    content: `You are an Elite Real Estate Assistant. 
                    Current Lead Info: Name: ${prospect.prospect_name || 'Unknown'}, Budget: ${prospect.target_budget || 'Not specified'}, Area: ${prospect.preferred_area || 'Not specified'}.
                    Rules: 
                    1. Never ask for info you already have.
                    2. Acknowledge locations (e.g. "Northcliff is a great investment").
                    3. Keep replies under 3 sentences.
                    4. Be warm, professional, and helpful.
                    5. Return JSON only with: "reply", "extracted_data" (name, budget, location, score).
                    6. Score: "Hot" (ready to buy), "Warm" (interested), "Cool" (browsing).`
                },
                ...history.slice(-6), // Send last 6 messages for context
                { role: "user", content: text }
            ],
            response_format: { type: "json_object" }
        });
        return JSON.parse(response.choices[0].message.content);
    } catch (e) {
        console.error('AI Error:', e.message);
        return { reply: "I'm looking into those property details for you now. 🏠", extracted_data: {} };
    }
}

client.on('qr', qr => qrcode.generate(qr, { small: true }));
client.on('ready', () => {
    console.log('🚀 ESTATE ENGINE: Online');
    console.log(`📅 Bot session started at: ${BOT_START_TIME.toLocaleString()}`);
});

client.on('message', async (msg) => {
    // 🔍 RELEVANCY CHECK
    if (!isRelevantMessage(msg)) return;

    const waNumber = msg.from;
    const text = msg.body;

    console.log(`📨 New message from ${waNumber}: "${text.substring(0, 50)}..."`);

    try {
        // 1. IDENTIFY PROSPECT
        let { data: prospect } = await supabase.from('re_prospect_leads').select('*').eq('wa_number', waNumber).single();
        if (!prospect) {
            console.log(`✨ New prospect created: ${waNumber}`);
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
        console.error("❌ Error:", err);
    }
});

client.initialize();
