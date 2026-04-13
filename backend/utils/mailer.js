/**
 * backend/utils/mailer.js — Email OTP delivery via nodemailer (Gmail SMTP)
 *
 * Required env vars (set in Railway):
 *   EMAIL_USER  — Gmail address e.g. xtox.noreply@gmail.com
 *   EMAIL_PASS  — Gmail App Password (16-char, no spaces needed)
 *                 Generate at: myaccount.google.com → Security → App Passwords
 *
 * Uses explicit smtp.gmail.com:587 (TLS/STARTTLS) instead of `service:'gmail'`
 * for maximum compatibility across different server environments.
 */
import nodemailer from 'nodemailer';

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  const user = process.env.EMAIL_USER;
  const pass = process.env.EMAIL_PASS;
  if (!user || !pass) {
    console.warn('[MAILER] EMAIL_USER or EMAIL_PASS not set — emails will fail');
  }
  transporter = nodemailer.createTransport({
    host: 'smtp.gmail.com',
    port: 587,
    secure: false, // STARTTLS (not SSL/465)
    auth: { user, pass },
    tls: { rejectUnauthorized: false }, // avoids cert errors on some hosts
  });
  return transporter;
}

export async function sendOTPEmail(to, otp, lang = 'ar') {
  const isAr = lang === 'ar';
  const t = getTransporter();
  await t.sendMail({
    from: '"XTOX" <' + process.env.EMAIL_USER + '>',
    to,
    subject: isAr ? 'رمز التحقق: ' + otp : 'Verification code: ' + otp,
    html: '<div dir="' + (isAr ? 'rtl' : 'ltr') + '" style="font-family:Cairo,Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px"><h2 style="color:#002f34;margin-bottom:8px">' + (isAr ? 'رمز التحقق الخاص بك' : 'Your verification code') + '</h2><p style="color:#64748b;margin:0 0 16px">' + (isAr ? 'أدخل هذا الرمز لتأكيد هويتك في XTOX.' : 'Enter this code to verify your identity on XTOX.') + '</p><div style="font-size:44px;font-weight:900;letter-spacing:10px;color:#6366f1;text-align:center;padding:24px;background:#fff;border-radius:10px;margin:0 0 16px;border:2px solid #e0e7ff">' + otp + '</div><p style="color:#64748b;font-size:14px;margin:0 0 8px">' + (isAr ? '⏳ صالح لمدة 10 دقائق فقط.' : '⏳ Valid for 10 minutes only.') + '</p><p style="color:#94a3b8;font-size:13px;margin:0">' + (isAr ? '🔒 لا تشاركه مع أحد. XTOX لن تطلب منك هذا الرمز.' : '🔒 Do not share it. XTOX will never ask for this code.') + '</p><hr style="border:none;border-top:1px solid #e2e8f0;margin:24px 0"><p style="color:#cbd5e1;font-size:11px;text-align:center;margin:0">XTOX — xtox.app</p></div>',
  });
  console.log('[MAILER] OTP email sent to ' + to);
}

export default { sendOTPEmail };
