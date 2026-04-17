/**
 * backend/utils/mailer.js — Email OTP delivery
 *
 * Priority order:
 *  1. Resend (resend.com) — set RESEND_API_KEY in Railway
 *  2. Nodemailer / Gmail SMTP — set EMAIL_USER + EMAIL_PASS in Railway
 *  3. Console fallback — OTP is logged to Railway console (visible in Railway logs)
 *
 * Required env vars (at least one set):
 *   RESEND_API_KEY  — Resend API key (get free at resend.com)
 *   EMAIL_USER      — Gmail address e.g. xtox.noreply@gmail.com
 *   EMAIL_PASS      — Gmail App Password (16-char, no spaces)
 *   EMAIL_FROM      — Optional override e.g. "XTOX <hello@yourdomain.com>"
 *
 * With no env vars set:
 *   - OTP is printed to Railway console so admin can see it
 *   - Login still works (admin can copy OTP from logs)
 */
import nodemailer from 'nodemailer';

// ─── Resend ──────────────────────────────────────────────────────────────────
async function sendViaResend(to, subject, html) {
  const { Resend } = await import('resend');
  const resend = new Resend(process.env.RESEND_API_KEY);
  const from = process.env.EMAIL_FROM || 'XTOX <onboarding@resend.dev>';
  const { data, error } = await resend.emails.send({ from, to: [to], subject, html });
  if (error) throw new Error(error.message || JSON.stringify(error));
  console.log('[MAILER/Resend] Email sent to', to, '| id:', data?.id);
  return { provider: 'resend', id: data?.id };
}

// ─── Nodemailer (Gmail SMTP) ──────────────────────────────────────────────────
let _transporter = null;
function getTransporter() {
  if (_transporter) return _transporter;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) throw new Error('EMAIL_USER or EMAIL_PASS not set');
  _transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false,
    auth: { user, pass },
    tls: { rejectUnauthorized: false },
  });
  return _transporter;
}
async function sendViaNodemailer(to, subject, html) {
  const t = getTransporter();
  const from = process.env.EMAIL_FROM || ('"XTOX" <' + process.env.EMAIL_USER + '>');
  await t.sendMail({ from, to, subject, html });
  console.log('[MAILER/Nodemailer] Email sent to', to);
  return { provider: 'nodemailer' };
}

// ─── OTP email HTML builder ───────────────────────────────────────────────────
function buildOTPHtml(otp, lang = 'ar') {
  const isAr = lang === 'ar';
  return `
    <div dir="${isAr ? 'rtl' : 'ltr'}" style="font-family:Cairo,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
      <h2 style="color:#002f34;margin-bottom:8px">${isAr ? 'رمز التحقق الخاص بك' : 'Your verification code'}</h2>
      <p style="color:#64748b;margin:0 0 16px">${isAr ? 'أدخل هذا الرمز لتأكيد هويتك في XTOX.' : 'Enter this code to verify your identity on XTOX.'}</p>
      <div style="font-size:44px;font-weight:900;letter-spacing:10px;color:#6366f1;text-align:center;padding:24px;background:#fff;border-radius:10px;margin:0 0 16px;border:2px solid #e0e7ff">${otp}</div>
      <p style="color:#64748b;font-size:14px;margin:0 0 8px">${isAr ? '⏳ صالح لمدة 10 دقائق فقط.' : '⏳ Valid for 10 minutes only.'}</p>
      <p style="color:#94a3b8;font-size:13px;margin:0">${isAr ? '🔒 لا تشاركه مع أحد. XTOX لن تطلب منك هذا الرمز.' : '🔒 Do not share it. XTOX will never ask for this code.'}</p>
      <hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0">
      <p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0">XTOX — xtox.app</p>
    </div>`;
}

// ─── Main export ─────────────────────────────────────────────────────────────
export async function sendOTPEmail(to, otp, lang = 'ar', custom = null) {
  let subject, html;

  if (custom && custom.subject && custom.html) {
    subject = custom.subject;
    html = custom.html;
  } else {
    const isAr = lang === 'ar';
    subject = isAr ? `رمز التحقق: ${otp}` : `Verification code: ${otp}`;
    html = buildOTPHtml(otp, lang);
  }

  // 1. Try Resend (preferred — no domain required for onboarding@resend.dev)
  if (process.env.RESEND_API_KEY) {
    try {
      return await sendViaResend(to, subject, html);
    } catch (err) {
      console.error('[MAILER/Resend] Failed:', err.message, '— trying nodemailer fallback');
    }
  }

  // 2. Try Nodemailer / Gmail SMTP
  if (process.env.EMAIL_USER && process.env.EMAIL_PASS) {
    try {
      return await sendViaNodemailer(to, subject, html);
    } catch (err) {
      console.error('[MAILER/Nodemailer] Failed:', err.message, '— using console fallback');
    }
  }

  // 3. Console fallback — OTP visible in Railway logs
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  console.log('[EMAIL OTP FALLBACK] No email provider configured.');
  console.log(`  To:  ${to}`);
  console.log(`  OTP: ${otp}`);
  console.log('  → Set RESEND_API_KEY in Railway to send real emails.');
  console.log('  → Or set EMAIL_USER + EMAIL_PASS (Gmail App Password).');
  console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
  return { provider: 'console', mock: true };
}

export default { sendOTPEmail };
