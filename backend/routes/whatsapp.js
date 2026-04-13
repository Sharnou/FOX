/**
 * /api/whatsapp — WhatsApp Chatbot (UltraMsg webhook + OpenAI)
 *
 * Fixes applied:
 *   Bug F  — Import is ESM (correct for this repo's "type":"module")
 *   Bug G  — OpenAI client guarded; hardcoded fallback always available
 *   Bug H  — Webhook responds 200 IMMEDIATELY, then processes async
 *             (prevents UltraMsg timeouts & duplicate retries)
 *   Bug I  — sendReply uses JSON body (more reliable than form-urlencoded)
 *             and graceful no-op when ULTRAMSG env vars not set
 *
 * Env vars required (Railway):
 *   OPENAI_API_KEY        — enables intelligent Arabic chatbot replies
 *   ULTRAMSG_INSTANCE     — UltraMsg instance ID (for sending replies)
 *   ULTRAMSG_TOKEN        — UltraMsg API token (for sending replies)
 *   WHATSAPP_WEBHOOK_TOKEN— optional secret to validate incoming webhooks
 */
import express from 'express';
import OpenAI from 'openai';

const router = express.Router();

const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || '';
const ULTRAMSG_TOKEN    = process.env.ULTRAMSG_TOKEN    || '';
const WEBHOOK_TOKEN     = process.env.WHATSAPP_WEBHOOK_TOKEN || '';

// OpenAI client — only created when API key is available
const openai = process.env.OPENAI_API_KEY
  ? new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
  : null;

// In-memory conversation history per phone number (last 10 messages)
const conversations = new Map();

// ── System prompt for the AI ─────────────────────────────────────────────────
const SYSTEM_PROMPT = `أنت مساعد ذكي لموقع XTOX، السوق المحلي العربي للبيع والشراء (مثل OLX وDubizzle).
الموقع: https://xtox.app
مهمتك: مساعدة المستخدمين عبر واتساب بشكل ودي واحترافي باللغة العربية.
يمكنك المساعدة في: نشر الإعلانات، البحث، التواصل، الدفع، الباقات المميزة، وحل المشاكل.
خطط الترويج: 🆓 مجاني (3 أيام، مرة كل شهرين) | ⚡ أساسي $2/7أيام | 🌟 مميز $5/14يوم | 👑 بريميوم $15/30يوم
للترقية: https://xtox.app/promote
كن مختصراً وودياً (لا تتجاوز 200 كلمة). إذا طُلب شيء خارج XTOX أرشد المستخدم للموقع بلطف.`;

// ── Fallback: hardcoded Arabic replies (Bug G: always available) ─────────────
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

// ── AI-powered reply generator ───────────────────────────────────────────────
async function generateReply(from, userMessage) {
  // Bug G: If OpenAI is configured, use it with conversation memory
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
      // Bug G: fallback on any OpenAI error — never crash the webhook
      console.error('[WHATSAPP BOT] OpenAI error, using hardcoded fallback:', aiErr.message);
    }
  }
  // Fallback: hardcoded replies (works with no OPENAI_API_KEY too)
  return hardcodedReply(userMessage);
}

// ── Send reply via UltraMsg (Bug I: JSON body, graceful no-op) ───────────────
async function sendReply(to, text) {
  if (!ULTRAMSG_INSTANCE || !ULTRAMSG_TOKEN) {
    console.warn('[WHATSAPP BOT] ULTRAMSG_INSTANCE or ULTRAMSG_TOKEN not set — reply suppressed:', text);
    return;
  }
  // UltraMsg expects E.164 format (+201234...).  Strip the @c.us suffix if present.
  const phone = to.includes('@') ? '+' + to.split('@')[0] : to;
  try {
    const res = await fetch(
      `https://api.ultramsg.com/${ULTRAMSG_INSTANCE}/messages/chat`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: ULTRAMSG_TOKEN, to: phone, body: text }),
      }
    );
    const data = await res.json();
    if (data.sent !== 'true' && data.sent !== true) {
      console.error('[WHATSAPP BOT] UltraMsg send failed:', JSON.stringify(data));
    } else {
      console.log('[WHATSAPP BOT] Replied to', phone);
    }
  } catch (err) {
    console.error('[WHATSAPP BOT] sendReply fetch error:', err.message);
  }
}

// ── POST /api/whatsapp/webhook ────────────────────────────────────────────────
// UltraMsg sends this when a WhatsApp message arrives.
// No auth middleware — UltraMsg webhooks do not carry JWT tokens.
//
// Bug H FIX: respond 200 immediately BEFORE async work.
// This prevents UltraMsg from timing out (it expects <10s) and retrying,
// which would cause duplicate replies.
router.post('/webhook', express.json(), (req, res) => {
  // ── Respond 200 immediately (Bug H) ──────────────────────────────────────
  res.sendStatus(200);

  try {
    // Optional: validate UltraMsg webhook token
    if (WEBHOOK_TOKEN) {
      const incoming = req.headers['x-ultramsg-token'] || req.body?.token || '';
      if (incoming !== WEBHOOK_TOKEN) {
        console.warn('[WHATSAPP BOT] Invalid webhook token — ignoring');
        return;
      }
    }

    const { event_type, data } = req.body || {};

    // Only handle incoming text messages (skip status updates, receipts, etc.)
    if (event_type !== 'message_received' || !data) return;

    const from = data.from;
    const body = data.body || '';
    const type = data.type || 'chat';

    // Skip non-text messages and messages sent by the bot itself
    if (!from || type !== 'chat' || data.fromMe) return;
    if (!body.trim()) return;

    console.log(`[WHATSAPP BOT] Message from ${from}: "${body}"`);

    // Process fully async — the 200 response has already been sent above
    generateReply(from, body)
      .then(reply => sendReply(from, reply))
      .catch(err => console.error('[WHATSAPP BOT] Async processing error:', err.message));

  } catch (err) {
    // Even synchronous errors are swallowed here — 200 was already sent
    console.error('[WHATSAPP BOT] Webhook sync error:', err.message);
  }
});

// ── GET /api/whatsapp/webhook — health / config check ────────────────────────
router.get('/webhook', (req, res) => {
  res.json({
    ok: true,
    service: 'XTOX WhatsApp Chatbot (OpenAI-powered)',
    openai_configured: !!process.env.OPENAI_API_KEY,
    ultramsg_configured: !!(ULTRAMSG_INSTANCE && ULTRAMSG_TOKEN),
    webhook_token_set: !!WEBHOOK_TOKEN,
    note: [
      'Set OPENAI_API_KEY for intelligent AI replies.',
      'Set ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN to enable sending replies.',
      'Point UltraMsg webhook URL to: POST /api/whatsapp/webhook',
    ].join(' | '),
  });
});

export default router;
