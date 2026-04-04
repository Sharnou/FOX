import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import { dbState, MemUser } from '../server/memoryStore.js';

// Use in-memory store when MongoDB is unavailable
function getUserModel() { return dbState.usingMemoryStore ? MemUser : User; }
import { detectFraud } from '../server/fraud.js';
import { getOrCreateCountry } from '../server/countries.js';

const router = express.Router();
const otpStore = new Map();

// ── JWT secret with fallback so sign() never hangs/throws on missing secret ──
const JWT_SECRET = process.env.JWT_SECRET || 'fox-default-secret';

// ── Rate Limiters ──────────────────────────────────────────────────────────
const registerLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many registration attempts, please try again later.' }
});

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many login attempts, please try again later.' }
});

const otpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP requests, please try again later.' }
});

const verifyOtpLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many OTP verification attempts, please try again later.' }
});
// ──────────────────────────────────────────────────────────────────────────

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

// ── Helper: reject after ms ──────────────────────────────────────────────
function timeout(ms, label = 'request') {
  return new Promise((_, reject) =>
    setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms)
  );
}

// ── Verify Google Token (with 8-second timeout on every network call) ──
async function verifyGoogleToken(idToken) {
  // Method 1: google-auth-library (most secure)
  try {
    const { OAuth2Client } = await import('google-auth-library');
    const CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
    const client = new OAuth2Client(CLIENT_ID);
    // Race against 8-second timeout so a slow Google cert fetch never hangs
    const ticket = await Promise.race([
      client.verifyIdToken({ idToken, audience: CLIENT_ID }),
      timeout(8000, 'google-auth-library verifyIdToken')
    ]);
    const payload = ticket.getPayload();
    return {
      email: payload.email,
      name: payload.name,
      avatar: payload.picture,
      googleId: payload.sub
    };
  } catch (e1) {
    // Method 2: Fallback to tokeninfo endpoint (8-second AbortSignal timeout)
    try {
      const controller = new AbortController();
      const timer = setTimeout(() => controller.abort(), 8000);
      let res;
      try {
        res = await fetch(
          `https://oauth2.googleapis.com/tokeninfo?id_token=${idToken}`,
          { signal: controller.signal }
        );
      } finally {
        clearTimeout(timer);
      }
      const data = await res.json();
      if (data.error) throw new Error('Invalid Google token: ' + data.error);
      return { email: data.email, name: data.name, avatar: data.picture, googleId: data.sub };
    } catch (e2) {
      throw new Error('Google token verification failed: ' + e2.message);
    }
  }
}

// ── Verify Microsoft Token (with 8-second timeout) ──
async function verifyMicrosoftToken(accessToken) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8000);
  let res;
  try {
    res = await fetch('https://graph.microsoft.com/v1.0/me', {
      headers: { Authorization: `Bearer ${accessToken}` },
      signal: controller.signal
    });
  } finally {
    clearTimeout(timer);
  }
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
  let user = await getUserModel().findOne({ email });
  if (!user) {
    await getOrCreateCountry(country, country);
    user = await getUserModel().create({
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
  // Hard cap: respond within 10 seconds no matter what
  res.setTimeout(10000, () => {
    if (!res.headersSent) res.status(504).json({ error: 'Google auth timed out. Please try again.' });
  });
  try {
    const { idToken, country } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const profile = await verifyGoogleToken(idToken);
    const user = await findOrCreateOAuthUser('google', profile, ip, country);
    // JWT_SECRET fallback ensures sign() never throws on missing env var
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, JWT_SECRET, { expiresIn: '90d' });
    if (res.headersSent) return;
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role, avatar: user.avatar } });
  } catch (e) {
    if (!res.headersSent) res.status(400).json({ error: e.message });
  }
});

// ── Microsoft OAuth ──
router.post('/auth/microsoft', async (req, res) => {
  res.setTimeout(10000, () => {
    if (!res.headersSent) res.status(504).json({ error: 'Microsoft auth timed out. Please try again.' });
  });
  try {
    const { accessToken, country } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const profile = await verifyMicrosoftToken(accessToken);
    const user = await findOrCreateOAuthUser('microsoft', profile, ip, country);
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, JWT_SECRET, { expiresIn: '90d' });
    if (res.headersSent) return;
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role } });
  } catch (e) {
    if (!res.headersSent) res.status(400).json({ error: e.message });
  }
});

// ── Apple OAuth ──
router.post('/auth/apple', async (req, res) => {
  res.setTimeout(10000, () => {
    if (!res.headersSent) res.status(504).json({ error: 'Apple auth timed out. Please try again.' });
  });
  try {
    const { idToken, country } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const profile = await verifyAppleToken(idToken);
    const user = await findOrCreateOAuthUser('apple', profile, ip, country);
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, JWT_SECRET, { expiresIn: '90d' });
    if (res.headersSent) return;
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role } });
  } catch (e) {
    if (!res.headersSent) res.status(400).json({ error: e.message });
  }
});

// ── Send OTP via WhatsApp or SMS ──
router.post('/send-otp', otpLimiter, async (req, res) => {
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

router.post('/verify-otp', verifyOtpLimiter, async (req, res) => {
  try {
    const { phone, otp, name, country: countryCode, city } = req.body;
    const record = otpStore.get(phone);
    if (!record || record.otp !== otp || Date.now() > record.expires)
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    otpStore.delete(phone);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    await getOrCreateCountry(countryCode, countryCode);
    let user = await getUserModel().findOne({ phone });
    if (!user) user = await getUserModel().create({ phone, name: name || phone, country: countryCode, city, registrationIp: ip, isVerified: true });
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, name: user.name, country: user.country, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Email Register ──
router.post('/register', registerLimiter, async (req, res) => {
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
    // Check MongoDB connection state
    const mongooseReg = await import('mongoose');
    if (mongooseReg.default.connection.readyState !== 1 && !dbState.usingMemoryStore) {
      return res.status(503).json({ error: 'Server starting up — please try again / الخادم يبدأ — حاول مرة أخرى' });
    }
    const fraud = dbState.usingMemoryStore ? { isFraud: false } : await detectFraud(ip);
    if (fraud.isFraud) return res.status(400).json({ error: 'Account creation restricted' });
    if (!dbState.usingMemoryStore) await getOrCreateCountry(countryCode, countryCode);
    const existing = await getUserModel().findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    let finalCountry = countryCode;
    if (!finalCountry || finalCountry === 'unknown') {
      try { const g = await (await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`)).json(); finalCountry = g.countryCode || 'EG'; } catch { finalCountry = 'EG'; }
    }
    const user = await getUserModel().create({ email, password: hash, name, country: finalCountry, city, registrationIp: ip });
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, email, name, country: user.country } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Email Login ──
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    // Check MongoDB connection state before querying (avoids 30s buffer wait)
    const mongoose = await import('mongoose');
    if (mongoose.default.connection.readyState !== 1 && !dbState.usingMemoryStore) {
      return res.status(503).json({ error: 'Server starting up — please try again in a few seconds / الخادم يبدأ — حاول مرة أخرى' });
    }
    const user = await getUserModel().findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.isBanned && (!user.banExpiresAt || user.banExpiresAt > new Date()))
      return res.status(403).json({ error: 'Banned', until: user.banExpiresAt });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    user.lastActive = new Date(); await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// Update own profile (phone, whatsapp, avatar, name, city, visibility)
router.put('/me', auth, async (req, res) => {
  try {
    const { name, city, avatar, phone, whatsapp, showPhone, showWhatsapp } = req.body;

    // ── Input Validation & Sanitization ───────────────────────────────────
    const update = {};

    if (name !== undefined) {
      const cleanName = typeof name === 'string' ? name.trim().slice(0, 100) : null;
      if (cleanName !== null && cleanName.length < 2) {
        return res.status(400).json({ error: 'Name must be at least 2 characters' });
      }
      if (cleanName !== null) update.name = cleanName;
    }

    if (city !== undefined) {
      const cleanCity = typeof city === 'string' ? city.trim().slice(0, 60) : null;
      if (cleanCity !== null) update.city = cleanCity;
    }

    if (avatar !== undefined) {
      if (typeof avatar !== 'string') {
        return res.status(400).json({ error: 'Avatar must be a string' });
      }
      const isValidUrl = avatar.startsWith('http://') || avatar.startsWith('https://') || avatar.startsWith('data:');
      if (!isValidUrl) {
        return res.status(400).json({ error: 'Avatar must be a valid URL or data URI' });
      }
      update.avatar = avatar.trim().slice(0, 2000000); // allow base64
    }

    if (phone !== undefined) {
      const cleanPhone = typeof phone === 'string' ? phone.trim().replace(/[^0-9+\-\s()]/g, '').slice(0, 20) : null;
      if (cleanPhone !== null) update.phone = cleanPhone;
    }

    if (whatsapp !== undefined) {
      const cleanWhatsapp = typeof whatsapp === 'string' ? whatsapp.trim().replace(/[^0-9+\-\s()]/g, '').slice(0, 20) : null;
      if (cleanWhatsapp !== null) update.whatsapp = cleanWhatsapp;
    }

    if (showPhone !== undefined) update.showPhone = Boolean(showPhone);
    if (showWhatsapp !== undefined) update.showWhatsapp = Boolean(showWhatsapp);
    // ──────────────────────────────────────────────────────────────────────

    const user = await getUserModel().findByIdAndUpdate(req.user.id, update, { new: true });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── GET current user profile ──────────────────────────────────────────────────
// Used by profile/edit page and other client components
router.get('/me', auth, async (req, res) => {
  try {
    const user = await getUserModel().findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── FIX 4: Chat enable/disable toggle for sellers ──────────────────────────
router.patch('/chat-toggle', auth, async (req, res) => {
  try {
    const UserModel = getUserModel();
    const user = await UserModel.findById(req.user.id);
    if (!user) return res.status(404).json({ error: 'User not found' });
    user.chatEnabled = !user.chatEnabled;
    await user.save();
    res.json({ chatEnabled: user.chatEnabled });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
