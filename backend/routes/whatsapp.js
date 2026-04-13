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

const router = express.Router();

const ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || '';
const ULTRAMSG_TOKEN    = process.env.ULTRAMSG_TOKEN    || '';
const WEBHOOK_TOKEN     = process.env.WHATSAPP_WEBHOOK_TOKEN || ''; // optional secret to validate UltraMsg calls

// ── Reply generator ───────────────────────────────────────────────────────────
async function generateReply(text) {
  const lower = (text || '').toLowerCase().trim();

  if (/مرحبا|هلا|اهلا|سلام|hi\b|hello|أهلاً|اهلاً/i.test(lower)) {
    return 'أهلاً وسهلاً! 👋\nمرحباً بك في XTOX - السوق المحلي الذكي.\nكيف يمكنني مساعدتك؟\n\n1️⃣ نشر إعلان\n2️⃣ البحث عن إعلانات\n3️⃣ التواصل مع الدعم\n4️⃣ معرفة المزيد عن XTOX';
  }

  if (/^1$|نشر|إعلان|اعلان|بيع|أبيع/.test(lower)) {
    return '📢 لنشر إعلانك:\nزر الموقع: https://xtox.app\nاضغط "نشر إعلان" وسجّل دخولك.\n\nهل تحتاج مساعدة أخرى؟\n1 - نشر\n2 - بحث\n3 - دعم\n4 - عن XTOX';
  }

  if (/^2$|بحث|ابحث|عايز|محتاج|شراء|أشتري/.test(lower)) {
    return '🔍 للبحث عن إعلانات:\nزر: https://xtox.app\nاستخدم خاصية البحث في الأعلى.\n\nهل تحتاج مساعدة أخرى؟\n1 - نشر\n2 - بحث\n3 - دعم\n4 - عن XTOX';
  }

  if (/^3$|دعم|support|مشكلة|مشكله|خطأ|خطا|شكوى/.test(lower)) {
    return '🆘 للتواصل مع الدعم الفني:\nأرسل لنا تفاصيل مشكلتك هنا وسنرد قريباً.\nأو راسلنا على: support@xtox.app\n\nساعات العمل: 9 ص - 10 م (GMT+3)';
  }

  if (/^4$|عن|about|xtox|اكستوكس|اكس توكس/.test(lower)) {
    return 'ℹ️ XTOX هو السوق المحلي الذكي للبيع والشراء في منطقتك.\n🌐 https://xtox.app\n📱 متاح على الويب والجوال\n\nانشر إعلانك مجاناً الآن! 🚀';
  }

  if (/سعر|ترويج|ترقية|مميز|featured|boost/.test(lower)) {
    return '🚀 خطط الترويج في XTOX:\n🆓 مجاني — 3 أيام (مرة كل شهرين)\n⚡ أساسي — 7 أيام · $2\n🌟 مميز — 14 يوم · $5\n👑 بريميوم — 30 يوم · $15\n\nللترقية: https://xtox.app/promote';
  }

  // Default
  return 'شكراً لتواصلك مع XTOX! 🙏\nلم أفهم رسالتك جيداً.\n\nاكتب:\n1️⃣ للنشر\n2️⃣ للبحث\n3️⃣ للدعم\n4️⃣ عن XTOX\n\nأو زر موقعنا: https://xtox.app';
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

    const reply = await generateReply(body);
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
    service: 'XTOX WhatsApp Chatbot',
    configured: !!(ULTRAMSG_INSTANCE && ULTRAMSG_TOKEN),
    note: 'Set ULTRAMSG_INSTANCE and ULTRAMSG_TOKEN in Railway env vars, then point UltraMsg webhook to /api/whatsapp/webhook',
  });
});

export default router;
