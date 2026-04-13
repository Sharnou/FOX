/**
 * /api/whatsapp — WhatsApp Chatbot (UltraMsg webhook)
 *
 * Root cause of "not responding":
 *   Issue E — no webhook endpoint existed. The app used UltraMsg to SEND
 *   OTPs but never registered a webhook to RECEIVE and REPLY to messages.
 *
 * Fix:
 *   1. This file creates POST /api/whatsapp/webhook (no auth middleware —
 *      UltraMsg webhooks do not send JWT tokens).
 *   2. Registered in backend/server/index.js as app.use('/api/whatsapp', ...).
 *   3. Set ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN in Railway env vars, then
 *      configure the UltraMsg webhook URL in the UltraMsg dashboard to:
 *        https://xtox-production.up.railway.app/api/whatsapp/webhook
 */
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || ''; // Still used for SENDING replies
const ULTRAMSG_TOKEN    = process.env.ULTRAMSG_TOKEN    || ''; // Still used for SENDING replies
const WEBHOOK_TOKEN     = process.env.WHATSAPP_WEBHOOK_TOKEN || ''; // optional secret to validate UltraMsg calls

// OpenAI client — used for intelligent chatbot replies
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// In-memory conversation history per phone number (last 10 messages)
const conversations = new Map();

// ── AI-powered reply generator (OpenAI) ──────────────────────────────────────
const SYSTEM_PROMPT = `أنت مساعد ذكي لموقع XTOX، السوق المحلي العربي للبيع والشراء (مثل OLX وDubizzle).
الموقع: https://xtox.app
مهمتك: مساعدة المستخدمين عبر واتساب بشكل ودي واحترافي باللغة العربية.
يمكنك المساعدة في: نشر الإعلانات، البحث، التواصل، الدفع، الباقات المميزة، وحل المشاكل.
خطط الترويج: 🆓 مجاني (3 أيام، مرة كل شهرين) | ⚡ أساسي $2/7أيام | 🌟 مميز $5/14يوم | 👑 بريميوم $15/30يوم
للترقية: https://xtox.app/promote
كن مختصراً وودياً (لا تتجاوز 200 كلمة). إذا طُلب شيء خارج XTOX أرشد المستخدم للموقع بلطف.`;

// Fallback hardcoded replies when OpenAI is unavailable
function hardcodedReply(text) {
  const lower = (text || '').toLowerCase().trim();
  if (/مرحبا|هلا|اهلا|سلام|hi\b|hello|أهلاً/i.test(lower))
    return 'أهلاً وسهلاً! 👋 مرحباً في XTOX - السوق المحلي الذكي.\nكيف يمكنني مساعدتك؟\n1️⃣ نشر إعلان  2️⃣ بحث  3️⃣ دعم  4️⃣ عن XTOX';
  if (/^1$|نشر|إعلان|بيع/.test(lower))
    return '📢 انشر إعلانك على https://xtox.app ← "نشر إعلان"';
  if (/^2$|بحث|شراء|محتاج/.test(lower))
    return '🔍 ابحث على https://xtox.app عبر شريط البحث';
  if (/^3$|دعم|مشكلة|شكوى/.test(lower))
    return '🆘 راسلنا: support@xtox.app\nساعات العمل: 9ص-10م (GMT+3)';
  if (/سعر|ترويج|مميز|boost/.test(lower))
    return '🚀 خطط الترويج:\n🆓 مجاني 3أيام | ⚡ $2/7أيام | 🌟 $5/14يوم | 👑 $15/30يوم\nhttps://xtox.app/promote';
  return 'شكراً لتواصلك مع XTOX! 🙏\nاكتب: 1(نشر) 2(بحث) 3(دعم) أو زر https://xtox.app';
}

async function generateReply(from, userMessage) {
  // If OpenAI is configured, use it with conversation memory
  if (openai) {
    try {
      if (!conversations.has(from)) conversations.set(from, []);
      const history = conversations.get(from);
      history.push({ role: 'user', content: userMessage });
      if (history.length > 10) history.splice(0, history.length - 10);

      const completion = await openai.chat.completions.create({
        model: 'gpt-4o-mini',
        messages: [{ role: 'system', content: SYSTEM_PROMPT }, ...history],
        max_tokens: 300,
        temperature: 0.7,
      });

      const reply = completion.choices[0].message.content;
      history.push({ role: 'assistant', content: reply });
      conversations.set(from, history);
      return reply;
    } catch (aiErr) {
      console.error('[WHATSAPP BOT] OpenAI error, using fallback:', aiErr.message);
    }
  }
  // Fallback: hardcoded replies
  return hardcodedReply(userMessage);
}

// ── Send reply via UltraMsg ───────────────────────────────────────────────────
async function sendReply(to, text) {
  if (!ULTRAMSG_INSTANCE || !ULTRAMSG_TOKEN) {
    console.warn('[WHATSAPP BOT] ULTRAMSG_INSTANCE or ULTRAMSG_TOKEN not set — cannot send reply');
    return;
  }
  // UltraMsg expects the "to" in E.164 format (+20123...)
  // It may arrive as "201234567890@c.us" — strip the @c.us
  const phone = to.includes('@') ? '+' + to.split('@')[0] : to;
  try {
    const body = new URLSearchParams();
    body.append('token', ULTRAMSG_TOKEN);
    body.append('to', phone);
    body.append('body', text);
    const res = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`,
      { method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' }, body: body.toString() }
    );
    const data = await res.json();
    if (data.sent !== 'true' && data.sent !== true) {
      console.error('[WHATSAPP BOT] Send failed:', data);
    } else {
      console.log('[WHATSAPP BOT] Replied to', phone);
    }
  } catch (err) {
    console.error('[WHATSAPP BOT] sendReply error:', err.message);
  }
}

// ── POST /api/whatsapp/webhook ────────────────────────────────────────────────
// UltraMsg sends this when a message arrives. No auth middleware — UltraMsg
// webhooks do not carry JWT tokens.
router.post('/webhook', express.json(), async (req, res) => {
  try {
    // Optional: validate UltraMsg token header
    if (WEBHOOK_TOKEN) {
      const incoming = req.headers['x-ultramsg-token'] || req.body?.token || '';
      if (incoming !== WEBHOOK_TOKEN) {
        return res.status(403).json({ error: 'invalid_token' });
      }
    }

    const { event_type, data } = req.body || {};

    // Only handle incoming text messages (ignore status updates, receipts, etc.)
    if (event_type !== 'message_received' || !data) {
      return res.json({ ok: true, skipped: true });
    }

    const from = data.from;
    const body = data.body || '';
    const type = data.type || 'chat';

    // Skip non-text messages and messages from the bot itself
    if (!from || type !== 'chat' || data.fromMe) {
      return res.json({ ok: true, skipped: true });
    }

    console.log(`[WHATSAPP BOT] Message from ${from}: "${body}"`);

    const reply = await generateReply(from, body);
    await sendReply(from, reply);

    res.json({ ok: true });
  } catch (err) {
    console.error('[WHATSAPP BOT] Webhook error:', err);
    res.status(500).json({ error: err.message });
  }
});

// ── GET /api/whatsapp/webhook — health check ──────────────────────────────────
router.get('/webhook', (req, res) => {
  res.json({
    ok: true,
    service: 'XTOX WhatsApp Chatbot (OpenAI-powered)',
    ultramsg_configured: !!(ULTRAMSG_INSTANCE && ULTRAMSG_TOKEN),
    openai_configured: !!process.env.OPENAI_API_KEY,
    note: 'Set OPENAI_API_KEY for intelligent replies. ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN for sending. Point UltraMsg webhook to /api/whatsapp/webhook',
  });
});

export default router;
