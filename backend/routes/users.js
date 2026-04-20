import express from 'express';
import { sendOTPEmail } from '../utils/mailer.js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import fetch from 'node-fetch';
import rateLimit from 'express-rate-limit';
import { auth } from '../middleware/auth.js';
import User from '../models/User.js';
import { dbState, MemUser } from '../server/memoryStore.js';
import { getActiveDB } from '../server/dbManager.js';
import { CouchbaseUser } from '../server/couchbaseModels.js';

// Smart model selector: MongoDB → Couchbase → in-memory
function getUserModel() {
  const db = getActiveDB();
  if (db === 'mongodb')   return User;
  if (db === 'couchbase') return CouchbaseUser;
  return MemUser;
}
import { detectFraud } from '../server/fraud.js';
import { getOrCreateCountry } from '../server/countries.js';

const router = express.Router();
const otpStore = new Map();

// ── JWT secret with fallback so sign() never hangs/throws on missing secret ──
const JWT_SECRET = process.env.JWT_SECRET || 'fox-default-secret';
const PLATFORM_COUNTRY = process.env.PLATFORM_COUNTRY || 'EG';

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
      $set: {
        email,
        password: hash,
        name: 'Ahmed Elsharnouby',
        country: 'EG',
        city: 'Cairo',
        role: 'admin',
        reputation: 100,
      },
      $setOnInsert: {
        xtoxId: 'XTOX-000002',
        createdAt: new Date(),
      },
    },
    { upsert: true, returnDocument: 'after' }
  );
  console.log('✅ Super admin ready: ahmed_sharnou@yahoo.com / Aa123123 | name: Ahmed Elsharnouby | XTOX-000002');
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
    if (country) await getOrCreateCountry(country, country);
    user = await getUserModel().create({
      email, name, avatar,
      country: PLATFORM_COUNTRY, // Platform locked — always use PLATFORM_COUNTRY
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
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country, xtoxId: user.xtoxId || null }, JWT_SECRET, { expiresIn: '90d' });
    if (res.headersSent) return;
    res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role, avatar: user.avatar } });
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
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country, xtoxId: user.xtoxId || null }, JWT_SECRET, { expiresIn: '90d' });
    if (res.headersSent) return;
    res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role, avatar: user.avatar || null } });
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
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country, xtoxId: user.xtoxId || null }, JWT_SECRET, { expiresIn: '90d' });
    if (res.headersSent) return;
    res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role, avatar: user.avatar || null } });
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

    // Method 1: Email OTP (replaces UltraMsg)
    const emailTarget = req.body.email || null;
    if (emailTarget) {
      try {
        await sendOTPEmail(emailTarget, otp);
        console.log('[OTP] Sent via Email to', emailTarget);
        return res.json({ success: true, method: 'email' });
      } catch (e) {
        console.warn('[OTP] Email send failed:', e.message);
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
    console.log('[OTP] DEV MODE - Code for ' + phone + ': ' + otp);
    res.json({
      success: true,
      method: 'console',
      message: 'No email provider configured. Add EMAIL_USER + EMAIL_PASS to Railway.',
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
    if (countryCode) await getOrCreateCountry(countryCode, countryCode);
    let user = await getUserModel().findOne({ phone });
    if (!user) {
      // ── Account linking: check if email user exists with this phone ──
      const emailBody = req.body.email;
      if (emailBody) {
        const emailUser = await getUserModel().findOne({ email: emailBody.trim().toLowerCase() });
        if (emailUser) {
          // Link phone to existing email account — same _id, same xtoxId
          emailUser.phone = phone;
          emailUser.whatsappVerified = true;
          if (!emailUser.xtoxId) {
            const _seq = Date.now().toString(36).toUpperCase().slice(-5);
            emailUser.xtoxId = 'XTOX-' + _seq + Math.random().toString(36).toUpperCase().slice(-2);
          }
          await emailUser.save();
          user = emailUser;
        }
      }
    }
    if (!user) {
      const _seq = Date.now().toString(36).toUpperCase().slice(-5);
      const newId = 'XTOX-' + _seq + Math.random().toString(36).toUpperCase().slice(-2);
      user = await getUserModel().create({ phone, name: name || phone, country: PLATFORM_COUNTRY, city, registrationIp: ip, isVerified: true, xtoxId: newId }); // Platform locked
    }
    if (!user.xtoxId) {
      const _seq = Date.now().toString(36).toUpperCase().slice(-5);
      user.xtoxId = 'XTOX-' + _seq + Math.random().toString(36).toUpperCase().slice(-2);
      await user.save();
    }
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country, xtoxId: user.xtoxId }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, name: user.name, country: user.country, role: user.role, xtoxId: user.xtoxId } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Email Register ──
router.post('/register', registerLimiter, async (req, res) => {
  try {
    const { email: rawEmail, password: rawPassword, name: rawName, country: countryCode, city, phone: rawPhone } = req.body;

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
    if (getActiveDB() === 'mongodb') {
      const mongooseReg = await import('mongoose');
      if (mongooseReg.default.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Server starting up — please try again / الخادم يبدأ — حاول مرة أخرى' });
      }
    }
    const fraud = getActiveDB() !== 'mongodb' ? { isFraud: false } : await detectFraud(ip);
    if (fraud.isFraud) return res.status(400).json({ error: 'Account creation restricted' });
    if (getActiveDB() === 'mongodb' && countryCode) await getOrCreateCountry(countryCode, countryCode);
    // Check if email already registered
    let existing = await getUserModel().findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    let finalCountry = PLATFORM_COUNTRY; // Platform locked to PLATFORM_COUNTRY; ignore user-supplied country
    if (!finalCountry || finalCountry === 'unknown') finalCountry = 'EG';
    // Generate a unique xtoxId for this email-registered user so they can post ads
    const _regSeq = Date.now().toString(36).toUpperCase().slice(-5);
    const newXtoxId = 'XTOX-' + _regSeq + Math.random().toString(36).toUpperCase().slice(-2);
    const cleanPhone = rawPhone ? String(rawPhone).replace(/[^+\d\s\-()]/g, '').slice(0, 20) : undefined;

    // ── Account linking: if phone is provided, check if a WhatsApp user already exists ──
    let user;
    if (cleanPhone) {
      const phoneUser = await getUserModel().findOne({ $or: [{ phone: cleanPhone }, { whatsappPhone: cleanPhone }] });
      if (phoneUser) {
        // Link email to existing WhatsApp account — same _id, same xtoxId
        phoneUser.email = email;
        phoneUser.password = hash;
        phoneUser.emailVerified = true;
        phoneUser.name = phoneUser.name || name;
        if (!phoneUser.xtoxId) phoneUser.xtoxId = newXtoxId;
        phoneUser.lastActive = new Date();
        await phoneUser.save();
        user = phoneUser;
      }
    }
    if (!user) {
      user = await getUserModel().create({ email, password: hash, name, country: finalCountry, city,
        xtoxId: newXtoxId,
        phone: cleanPhone,
        registrationIp: ip });
    }
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country, xtoxId: user.xtoxId || newXtoxId }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role || 'user', avatar: user.avatar || null, phone: user.phone || null, xtoxId: user.xtoxId || newXtoxId } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── Email Login ──
router.post('/login', loginLimiter, async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ error: 'Email and password required' });
    // Check connection state before querying (avoids 30s buffer wait)
    if (getActiveDB() === 'mongodb') {
      const mongoose = await import('mongoose');
      if (mongoose.default.connection.readyState !== 1) {
        return res.status(503).json({ error: 'Server starting up — please try again in a few seconds / الخادم يبدأ — حاول مرة أخرى' });
      }
    }
    const user = await getUserModel().findOne({ email });
    if (!user) return res.status(400).json({ error: 'Invalid credentials' });
    if (user.isBanned && (!user.banExpiresAt || user.banExpiresAt > new Date()))
      return res.status(403).json({ error: 'Banned', until: user.banExpiresAt });
    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(400).json({ error: 'Invalid credentials' });
    // Auto-assign xtoxId if this is an old account that didn't have one
    if (!user.xtoxId) {
      const _loginSeq = Date.now().toString(36).toUpperCase().slice(-5);
      user.xtoxId = 'XTOX-' + _loginSeq + Math.random().toString(36).toUpperCase().slice(-2);
    }
    user.lastActive = new Date(); await user.save();
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country, xtoxId: user.xtoxId }, JWT_SECRET, { expiresIn: '90d' });
    res.json({ success: true, token, user: { id: user._id, email: user.email, name: user.name, country: user.country, role: user.role, avatar: user.avatar || null, xtoxId: user.xtoxId } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// Update own profile (phone, whatsapp, avatar, name, city, visibility)
router.put('/me', auth, async (req, res) => {
  try {
    // Immutable fields — never allow updating _id or email (primary identifier)
    delete req.body._id;
    delete req.body.email;
    delete req.body.createdAt;
    const { name, city, avatar, phone, whatsapp, showPhone, showWhatsapp, bio, username } = req.body;

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

    if (bio !== undefined) {
      const cleanBio = typeof bio === 'string' ? bio.trim().slice(0, 500) : null;
      if (cleanBio !== null) update.bio = cleanBio;
    }

    if (username !== undefined) {
      const cleanUsername = typeof username === 'string' ? username.trim().slice(0, 100) : null;
      if (cleanUsername !== null && cleanUsername.length > 0) {
        update.username = cleanUsername;
        update.name = cleanUsername; // keep name in sync
      }
    }
    // ──────────────────────────────────────────────────────────────────────

    const user = await getUserModel().findByIdAndUpdate(req.user.id, update, { returnDocument: 'after' });
    res.json(user);
  } catch (e) { res.status(500).json({ error: e.message }); }
});


// ── GET current user profile ──────────────────────────────────────────────────
// Used by profile/edit page and other client components
router.get('/me', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const user = await getUserModel().findById(uid).lean().catch(() => null)
      || await getUserModel().findById(uid);
    if (!user) return res.status(404).json({ error: 'User not found' });
    // Strip password from response
    const rawUser = user.toObject ? user.toObject() : user;
    const { password, ...safeUser } = rawUser;
    res.json({ user: safeUser });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

// ── PATCH current user profile (username, phone, city, bio, chatEnabled) ──────
router.patch('/me', auth, async (req, res) => {
  try {
    const uid = req.user.id;
    const { username, phone, city, bio, chatEnabled } = req.body || {};
    const updates = {};

    if (username !== undefined) {
      const clean = typeof username === 'string' ? username.trim().slice(0, 100) : null;
      if (clean !== null && clean.length > 0) {
        updates.username = clean;
        updates.name = clean; // keep 'name' field in sync
      }
    }
    if (phone !== undefined) {
      const clean = typeof phone === 'string' ? phone.trim().replace(/[^+\d\s\-()]/g, '').slice(0, 20) : null;
      if (clean !== null) updates.phone = clean;
    }
    if (city !== undefined) {
      const clean = typeof city === 'string' ? city.trim().slice(0, 60) : null;
      if (clean !== null) updates.city = clean;
    }
    if (bio !== undefined) {
      const clean = typeof bio === 'string' ? bio.trim().slice(0, 500) : null;
      if (clean !== null) updates.bio = clean;
    }
    if (chatEnabled !== undefined) updates.chatEnabled = Boolean(chatEnabled);

    const UserModel = getUserModel();
    const updated = await UserModel.findByIdAndUpdate(
      uid,
      { $set: updates },
      { returnDocument: 'after' }
    );

    if (!updated) return res.status(404).json({ message: 'المستخدم غير موجود' });
    const rawUser = updated.toObject ? updated.toObject() : updated;
    const { password, ...safeUser } = rawUser;
    res.json({ user: safeUser, message: 'تم التحديث بنجاح' });
  } catch (e) {
    res.status(500).json({ message: e.message });
  }
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

// ── GET /api/users/me/points-history — returns point log for current user ──
router.get('/me/points-history', auth, async (req, res) => {
  try {
    const UserModel = getUserModel();
    const user = await UserModel.findById(req.user.id)
      .select('reputationPoints monthlyPoints pointsHistory tier tierBadge');
    if (!user) return res.status(404).json({ error: 'User not found' });
    const userObj = user.toObject ? user.toObject() : user;
    // Compute tier inline in case virtuals not applied to lean objects
    const pts = userObj.reputationPoints || 0;
    const tier = pts >= 500 ? 'Platinum' : pts >= 200 ? 'Gold' : pts >= 50 ? 'Silver' : 'Bronze';
    const tierEmoji = { Bronze: '🥉', Silver: '🥈', Gold: '🥇', Platinum: '💎' }[tier];
    res.json({
      reputationPoints: userObj.reputationPoints || 0,
      monthlyPoints:    userObj.monthlyPoints    || 0,
      tier,
      tierBadge: `${tierEmoji} ${tier}`,
      pointsHistory: (userObj.pointsHistory || []).slice(-20).reverse(),
    });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
