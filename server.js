const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 8000;

// In-memory OTP store: { phone -> { otp, expiry, attempts } }
const otpStore = new Map();

app.use(cors());
app.use(express.json());

// ─── WhatsApp OTP Simulation Endpoints ───────────────────────────────────────

// POST /whatsapp/send-otp
// Simulates sending an OTP via WhatsApp (no real message sent)
app.post('/whatsapp/send-otp', (req, res) => {
  let phone = (req.body.phone || '').trim().replace(/\s/g, '');
  if (!phone) return res.status(400).json({ success: false, message: 'Phone number required' });
  phone = '+' + phone.replace(/\D/g, '');

  const otp = String(Math.floor(100000 + Math.random() * 900000));
  const expiry = Date.now() + 10 * 60 * 1000; // 10 minutes

  otpStore.set(phone, { otp, expiry, attempts: 0 });

  console.log(`[FAKE WhatsApp OTP] Phone: ${phone} → OTP: ${otp}`);

  res.json({
    success: true,
    message: 'OTP sent to WhatsApp (FAKE API - check /whatsapp/debug)',
    // Only exposed in fake API for testing:
    debug_otp: otp,
    phone
  });
});

// POST /whatsapp/verify-otp
// Verifies the OTP
app.post('/whatsapp/verify-otp', (req, res) => {
  let phone = (req.body.phone || '').trim().replace(/\s/g, '');
  const inputOtp = (req.body.otp || '').trim();

  if (!phone || !inputOtp) {
    return res.status(400).json({ success: false, message: 'Phone and OTP required' });
  }
  phone = '+' + phone.replace(/\D/g, '');

  const record = otpStore.get(phone);
  if (!record) return res.status(400).json({ success: false, message: 'No OTP found for this number' });
  if (Date.now() > record.expiry) {
    otpStore.delete(phone);
    return res.status(400).json({ success: false, message: 'OTP expired' });
  }
  record.attempts += 1;
  if (record.attempts > 5) {
    otpStore.delete(phone);
    return res.status(429).json({ success: false, message: 'Too many attempts' });
  }
  if (inputOtp !== record.otp) {
    return res.status(400).json({ success: false, message: 'Invalid OTP', attempts_left: 5 - record.attempts });
  }

  otpStore.delete(phone);
  res.json({ success: true, message: 'OTP verified successfully', phone });
});

// GET /whatsapp/debug — shows all active OTPs (TESTING ONLY)
app.get('/whatsapp/debug', (req, res) => {
  const active = {};
  for (const [phone, data] of otpStore.entries()) {
    active[phone] = {
      otp: data.otp,
      expires_in_seconds: Math.max(0, Math.round((data.expiry - Date.now()) / 1000)),
      attempts: data.attempts
    };
  }
  res.json({ note: 'FAKE API - Testing only. Never expose in production.', active_otps: active });
});

// ─── Static JSON file endpoints (original Fake API) ──────────────────────────
app.use(express.static(path.join(__dirname, 'data')));

// Serve .json files without extension too (e.g. /user/1 → /user/1.json)
app.get('*', (req, res) => {
  const filePath = path.join(__dirname, 'data', req.path + '.json');
  if (fs.existsSync(filePath)) {
    res.sendFile(filePath);
  } else {
    res.status(404).json({ error: 'Not found', path: req.path });
  }
});

app.listen(PORT, () => {
  console.log(`XTOX Fake API running on port ${PORT}`);
  console.log(`OTP debug: http://localhost:${PORT}/whatsapp/debug`);
});
