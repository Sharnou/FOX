import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import { detectFraud } from '../server/fraud.js';
import { getOrCreateCountry } from '../server/countries.js';

const router = express.Router();
const otpStore = new Map();

export async function seedSuperAdmin() {
  const email = 'ahmed_sharnou@yahoo.com';
  const hash = await bcrypt.hash('Aa123123', 10);
  await User.findOneAndUpdate(
    { email },
    {
      email,
      password: hash,
      name: 'Ahmed Sharnou',
      country: 'EG',
      city: 'Cairo',
      role: 'admin',
      reputation: 100
    },
    { upsert: true, new: true }
  );
  console.log('✅ Super admin ready: ahmed_sharnou@yahoo.com / Aa123123');
}

// ── Verify Google Token ──
async function verifyGoogleToken(idToken) {
  // Method 1: google-auth-library (most secure - ChatGPT recommended)
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const client = new OAuth2Client(CLIENT_ID);
    const ticket = await client.verifyIdToken({
      idToken,
      audience: CLIENT_ID
    });
    const payload = ticket.getPayload();
    return {
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
      googleId: payload.sub
    };
  } catch (e1) {
    // Method 2: Fallback to tokeninfo endpoint
    try {
      const res = await fetch(`https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`);
      const data = await res.json();
      if (data.error) throw new Error('Invalid Google token: ' + data.error);
      return { email: data.email, name: data.name, avatar: data.picture, googleId: data.sub };
    } catch (e2) {
      throw new Error('Google token verification failed: ' + e2.message);
    }
  }
}

// ── Verify Microsoft Token ──
async function verifyMicrosoftToken(accessToken) {
  const res = await fetch('https://graph.microsoft.com/v1.0/me', {
    headers: { Authorization: `Bearer ${accessToken}` }
  });
  const data = await res.json();
  if (data.error) throw new Error('Invalid Microsoft token');
  return { email: data.mail || data.userPrincipalName, name: data.displayName, microsoftId: data.id };
}

// ── Verify Apple Token ──
async function verifyAppleToken(idToken) {
  const payload = JSON.parse(Buffer.from(idToken.split('.')[1], 'base64').toString());
  if (!payload.email) throw new Error('Invalid Apple token');
  return { email: payload.email, name: payload.name || payload.email.split('@')[0], appleId: payload.sub };
}

// Helper: create/find OAuth user
async function findOrCreateOAuthUser(provider, profile, ip, country) {
  const { email, name, avatar } = profile;
  const fraud = await detectFraud(ip);
  if (fraud.isFraud) throw new Error('Account creation restricted');
  let user = await User.findOne({ email });
  if (!user) {
    await getOrCreateCountry(country, country);
    user = await User.create({
      email, name, avatar,
      country: country || 'EG',
      registrationIp: ip,
      isVerified: true,
      [`${provider}Id`]: profile[`${provider}Id`]
    });
  } else {
    if (!user[`${provider}Id`] && profile[`${provider}Id`]) {
      user[`${provider}Id`] = profile[`${provider}Id`];
      await user.save();
    }
  }
  user.lastActive = new Date();
  await user.save();
  return user;
}

// ── Google OAuth ──
router.post('/auth/google', async (req, res) => {
  try {
    const { idToken, country } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const profile = await verifyGoogleToken(idToken);
    const user = await findOrCreateOAuthUser('google', profile, ip, country);
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role, avatar: user.avatar } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Microsoft OAuth ──
router.post('/auth/microsoft', async (req, res) => {
  try {
    const { accessToken, country } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const profile = await verifyMicrosoftToken(accessToken);
    const user = await findOrCreateOAuthUser('microsoft', profile, ip, country);
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Apple OAuth ──
router.post('/auth/apple', async (req, res) => {
  try {
    const { idToken, country } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const profile = await verifyAppleToken(idToken);
    const user = await findOrCreateOAuthUser('apple', profile, ip, country);
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role } });
  } catch (e) { res.status(400).json({ error: e.message }); }
});

// ── Send OTP via WhatsApp or SMS ──
router.post('/send-otp', async (req, res) => {
  try {
    const { phone, via = 'whatsapp' } = req.body;
    if (!phone) return res.status(400).json({ error: 'Phone number required' });

    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, expires: Date.now() + 10 * 60 * 1000 });

    const message = `رمز التحقق XTOX: ${otp}\nXTOX verification code: ${otp}\nValid for 10 minutes.`;

    // Method 1: UltraMsg (free WhatsApp API - no credit card)
    if (process.env.ULTRAMSG_INSTANCE && process.env.ULTRAMSG_TOKEN) {
      try {
        const cleanPhone = phone.replace(/[^0-9+]/g, '');
        const res2 = await fetch(`https://api.ultramsg.com/${process.env.ULTRAMSG_INSTANCE}/messages/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: new URLSearchParams({
            token: process.env.ULTRAMSG_TOKEN,
            to: cleanPhone,
            body: message,
            priority: '1'
          })
        });
        const data = await res2.json();
        if (data.sent === 'true' || data.id) {
          console.log(`[OTP] Sent via UltraMsg to ${phone}`);
          return res.json({ success: true, method: 'whatsapp', provider: 'ultramsg' });
        }
      } catch (e) {
        console.warn('[OTP] UltraMsg failed:', e.message);
      }
    }

    // Method 2: Twilio WhatsApp (if configured)
    if (process.env.TWILIO_SID && process.env.TWILIO_TOKEN) {
      try {
        const { default: twilio } = await import('twilio');
        const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_TOKEN);
        await client.messages.create({
          from: `whatsapp:${process.env.TWILIO_WHATSAPP_NUMBER || '+14155238886'}`,
          to: `whatsapp:${phone}`,
          body: message
        });
        console.log(`[OTP] Sent via Twilio to ${phone}`);
        return res.json({ success: true, method: 'whatsapp', provider: 'twilio' });
      } catch (e) {
        console.warn('[OTP] Twilio failed:', e.message);
      }
    }

    // Method 3: Whapi.Cloud (5-day free trial, no credit card)
    if (process.env.WHAPI_TOKEN) {
      try {
        const cleanPhone = phone.replace(/[^0-9]/g, '');
        const res3 = await fetch('https://gate.whapi.cloud/messages/text', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${process.env.WHAPI_TOKEN}` },
          body: JSON.stringify({ to: `${cleanPhone}@s.whatsapp.net`, body: message })
        });
        const data = await res3.json();
        if (data.id || data.sent) {
          console.log(`[OTP] Sent via Whapi to ${phone}`);
          return res.json({ success: true, method: 'whatsapp', provider: 'whapi' });
        }
      } catch (e) {
        console.warn('[OTP] Whapi failed:', e.message);
      }
    }

    // Fallback: dev mode — log OTP to console
    console.log(`[OTP] DEV MODE - Code for ${phone}: ${otp}`);
    res.json({ 
      success: true, 
      method: 'console',
      message: 'No WhatsApp provider configured. Add ULTRAMSG_INSTANCE + ULTRAMSG_TOKEN to Railway.',
      debug_otp: process.env.NODE_ENV === 'development' ? otp : undefined
    });
  } catch (e) { 
    res.status(500).json({ error: e.message }); 
  }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name, country: countryCode, city } = req.body;
    const record = otpStore.get(phone);
    if (!record || record.otp !== otp || Date.now() > record.expires)
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    otpStore.delete(phone);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await getOrCreateCountry(countryCode, countryCode);
    let user = await User.findOne({ phone });
    if (!user) user = await User.create({ phone, name: name || phone, country: countryCode, city, registrationIp: ip, isVerified: true });
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, name: user.name, country: user.country, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Email Register ──
router.post('/register', async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword, name: rawName, country: countryCode, city } = req.body;

    // ── Input Validation & Sanitization ───────────────────────────────────
    const email    = typeof rawEmail    === 'string' ? rawEmail.trim().toLowerCase()   : '';
    const password = typeof rawPassword === 'string' ? rawPassword                     : '';
    const name     = typeof rawName     === 'string' ? rawName.trim().slice(0, 100)    : '';

    // Required fields
    if (!email || !password || !name) {
      return res.status(400).json({ error: 'الاسم والبريد الإلكتروني وكلمة المرور مطلوبة' });
    }
    // Email format
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
    if (!emailRe.test(email)) {
      return res.status(400).json({ error: 'صيغة البريد الإلكتروني غير صحيحة' });
    }
    // Password minimum length
    if (password.length < 8) {
      return res.status(400).json({ error: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل' });
    }
    // Name minimum length
    if (name.length < 2) {
      return res.status(400).json({ error: 'الاسم يجب أن يكون حرفين على الأقل' });
    }
    // ──────────────────────────────────────────────────────────────────────

    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const fraud = await detectFraud(ip);
    if (fraud.isFraud) return res.status(400).json({ error: 'Account creation restricted' });
    await getOrCreateCountry(countryCode, countryCode);
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    let finalCountry = countryCode;
    if (!finalCountry || finalCountry === 'unknown') {
      try { const g = await (await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`)).json(); finalCountry = g.countryCode || 'EG'; } catch { finalCountry = 'EG'; }
    }
    const user = await User.create({ email, password: hash, name, country: finalCountry, city, registrationIp: ip });
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, email, name, country: user.country } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Email Login ──
router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.isBanned && (!user.banExpiresAt || user.banExpiresAt > new Date()))
      return res.status(403).json({ error: 'Banned', until: user.banExpiresAt });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    user.lastActive = new Date(); await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// Update own profile (phone, whatsapp, avatar, name, city, visibility)
router.put('/me', auth, async (req, res) => {
  try {
    const { name, city, avatar, phone, whatsapp, showPhone, showWhatsapp } = req.body;
    const update = {};
    if (name !== undefined) update.name = name;
    if (city !== undefined) update.city = city;
    if (avatar !== undefined) update.avatar = avatar;
    if (phone !== undefined) update.phone = phone;
    if (whatsapp !== undefined) update.whatsapp = whatsapp;
    if (showPhone !== undefined) update.showPhone = showPhone;
    if (showWhatsapp !== undefined) update.showWhatsapp = showWhatsapp;

    const user = await User.findByIdAndUpdate(req.user.id, update, { new: true }).select('-password -registrationIp');
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});

export default router;
