/**
 * backend/test-email.js — Self-test for email OTP delivery
 *
 * Usage (from backend/ directory):
 *   EMAIL_USER=your@gmail.com EMAIL_PASS='cbrh bngn shsh zajm' node test-email.js
 *
 * What it tests:
 *   1. Transporter creation (smtp.gmail.com:587)
 *   2. Actual send to EMAIL_USER itself (sends OTP 123456 to your own inbox)
 *
 * Expected output on success:
 *   ✅ Email sent successfully! Check your inbox at: your@gmail.com
 *
 * Common errors:
 *   EAUTH  → Wrong email/password, or App Password not enabled
 *            Go to: myaccount.google.com → Security → App Passwords
 *   ESOCKET / ETIMEDOUT → Network firewall blocking port 587
 */
import 'dotenv/config';
import nodemailer from 'nodemailer';

const EMAIL_USER = process.env.EMAIL_USER;
const EMAIL_PASS = process.env.EMAIL_PASS;

if (!EMAIL_USER) {
  console.error('❌ EMAIL_USER env var is not set.');
  console.error('   Run: EMAIL_USER=your@gmail.com EMAIL_PASS="xxxx xxxx xxxx xxxx" node test-email.js');
  process.exit(1);
}
if (!EMAIL_PASS) {
  console.error('❌ EMAIL_PASS env var is not set.');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: 'smtp.gmail.com',
  port: 587,
  secure: false,
  auth: { user: EMAIL_USER, pass: EMAIL_PASS },
  tls: { rejectUnauthorized: false },
});

console.log('📧 Testing SMTP connection to smtp.gmail.com:587...');
console.log('   EMAIL_USER:', EMAIL_USER);

try {
  await transporter.verify();
  console.log('✅ SMTP connection verified.');
} catch (err) {
  console.error('❌ SMTP verify failed:', err.message);
  if (err.code === 'EAUTH') {
    console.error('   → Check EMAIL_USER and EMAIL_PASS.');
    console.error('   → Use a Gmail App Password (myaccount.google.com → Security → App Passwords).');
    console.error('   → 2-Step Verification must be enabled first.');
  }
  if (err.code === 'ESOCKET' || err.code === 'ETIMEDOUT') {
    console.error('   → Port 587 may be blocked by your network/firewall.');
    console.error('   → Try from Railway (not local network) where port 587 is open.');
  }
  process.exit(1);
}

const TEST_OTP = '123456';
console.log(`\n📨 Sending test OTP (${TEST_OTP}) to: ${EMAIL_USER} ...`);

try {
  await transporter.sendMail({
    from: `"XTOX Test" <${EMAIL_USER}>`,
    to: EMAIL_USER,
    subject: `[TEST] رمز التحقق: ${TEST_OTP}`,
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:auto;padding:32px;background:#f9fafb;border-radius:12px">
        <h2 style="color:#002f34">🧪 XTOX Email Test</h2>
        <p>If you received this email, the mailer is working correctly.</p>
        <div style="font-size:44px;font-weight:900;letter-spacing:10px;color:#6366f1;text-align:center;padding:24px;background:#fff;border-radius:10px;border:2px solid #e0e7ff">${TEST_OTP}</div>
        <p style="color:#64748b;font-size:14px">This is a test — ignore this email.</p>
      </div>
    `,
  });
  console.log(`\n✅ Email sent successfully! Check your inbox at: ${EMAIL_USER}`);
  console.log('   ✓ mailer.js is working correctly.');
  console.log('   ✓ EMAIL_USER and EMAIL_PASS are valid.');
} catch (err) {
  console.error('\n❌ Email send failed:', err.message);
  if (err.code === 'EAUTH') console.error('   → Wrong email/password or App Password not set up correctly');
  if (err.code === 'ESOCKET') console.error('   → Network issue — try from Railway environment');
  process.exit(1);
}
