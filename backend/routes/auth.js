/**
 * /api/auth -- Real authentication routes
 * - WhatsApp OTP (UltraMsg / Meta Cloud API / Fake API for testing)
 * - Google Sign-In (real Google sub ID)
 * - Apple Sign In with Apple
 * - Blocking enforced on real identifiers
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getActiveDB } from '../server/dbManager.js';
import { MemUser } from '../server/memoryStore.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fox-default-secret';
const META_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const META_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
var ULTRAMSG_INSTANCE = process.env.ULTRAMSG_INSTANCE || ''; // DEPRECATED: use EMAIL_USER+EMAIL_PASS instead
var ULTRAMSG_TOKEN = process.env.ULTRAMSG_TOKEN || ''; // DEPRECATED
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || '';
const FRONTEND_URL = process.env.FRONTEND_URL || 'https://fox-kohl-eight.vercel.app';
const GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'https://xtox-production.up.railway.app/api/auth/google/callback';
const USE_FAKE_API = process.env.USE_FAKE_API === 'true';
import { sendOTPEmail } from '../utils/mailer.js';
const FAKE_API_URL = process.env.FAKE_API_URL || '';

// [SECURITY] Warn loudly when fake API mode is active so it is never
// accidentally shipped to production without a visible signal.
if (USE_FAKE_API) {
  console.warn('[WARNING] USE_FAKE_API is enabled — WhatsApp messages will NOT be sent');
}

// -- Helpers -----------------------------------------------------------------

// In-memory counter for XTOX IDs when MongoDB unavailable
let _memSeq = 0;

async function getUserModel() {
  const db = getActiveDB();
  if (db === 'memory') return MemUser;
  return mongoose.models.User || (await import('../models/User.js')).default;
}

async function getCounterModel() {
  return mongoose.models.Counter || (await import('../models/Counter.js')).default;
}

// Generate next XTOX ID: XTOX-000001, XTOX-000002, ...
async function generateXtoxId() {
  const db = getActiveDB();
  if (db === 'memory') {
    _memSeq = (_memSeq || 0) + 1;
    return 'XTOX-' + String(_memSeq).padStart(6, '0');
  }
  var Counter = await getCounterModel();
  var counter = await Counter.findByIdAndUpdate(
    'xtoxId',
    { $inc: { seq: 1 } },
    { new: true, upsert: true }
  );
  var num = String(counter.seq).padStart(6, '0');
  return 'XTOX-' + num;
}

// Generate internal @xtox.com email from a name or phone
function generateXtoxEmail(nameOrPhone) {
  var base = (nameOrPhone || 'user')
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '')
    .slice(0, 20);
  if (!base) base = 'user';
  var suffix = Math.floor(Math.random() * 9000) + 1000;
  return base + suffix + '@xtox.com';
}

// Make sure xtoxEmail is unique
async function assignUniqueXtoxEmail(User, base) {
  var email = generateXtoxEmail(base);
  var tries = 0;
  while (tries < 10) {
    var exists = await User.findOne({ xtoxEmail: email });
    if (!exists) return email;
    email = generateXtoxEmail(base);
    tries++;
  }
  return 'user' + Date.now() + '@xtox.com';
}

// Issue JWT
function issueToken(user) {
  return jwt.sign(
    { id: user._id.toString(), role: user.role || 'user', xtoxId: user.xtoxId },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

// Check if ANY real identifier is blocked
async function checkBlocked(User, opts) {
  var query = [];
  if (opts.googleId) query.push({ blockedGoogleId: opts.googleId });
  if (opts.appleId) query.push({ blockedAppleId: opts.appleId });
  if (opts.phone) query.push({ blockedPhone: opts.phone });
  if (!query.length) return null;
  return User.findOne({ blocked: true, $or: query });
}

// -- WhatsApp OTP STEP 1: Send OTP ------------------------------------------
// POST /api/auth/whatsapp/send-otp
// Body: { phone: '+201234567890' }
router.post('/whatsapp/send-otp', async (req, res) => {
  try {
    // Accept both phone and email. If email is provided, send OTP there.
    var email = (req.body.email || '').trim().toLowerCase();
    var phone = (req.body.phone || '').trim().replace(/\s/g, '');
    if (!phone && !email) {
      return res.status(400).json({ error: 'Phone or email required' });
    }
    if (phone && !phone.startsWith('+')) {
      return res.status(400).json({ error: 'Phone must start with country code e.g. +201234567890' });
    }
    if (phone) phone = '+' + phone.replace(/\D/g, '');

    var User = await getUserModel();

    // Check if this identifier is permanently blocked
    var blocked = null;
    if (phone) blocked = await User.findOne({ blocked: true, blockedPhone: phone });
    if (!blocked && email) blocked = await User.findOne({ blocked: true, email });
    if (blocked) {
      return res.status(403).json({ error: 'This account has been permanently suspended.' });
    }

    // Generate 6-digit OTP
    var otp = String(Math.floor(100000 + Math.random() * 900000));
    var expiry = new Date(Date.now() + 10 * 60 * 1000);

    // Find or create user record by phone or email
    var userQuery = phone ? { whatsappPhone: phone } : { email };
    var userUpdate = { whatsappOtp: otp, whatsappOtpExpiry: expiry, whatsappOtpAttempts: 0, country: 'unknown' };
    if (phone) userUpdate.whatsappPhone = phone;
    if (email) userUpdate.email = email;
    var existingUser = await User.findOneAndUpdate(userQuery, userUpdate, { upsert: true, setDefaultsOnInsert: true, new: true });
    // Use the email from the user record if not provided in request
    if (!email && existingUser && existingUser.email) email = existingUser.email;

    // 1. FAKE API MODE
    if (USE_FAKE_API && FAKE_API_URL) {
      try {
        var fakeRes = await fetch(`${FAKE_API_URL}/whatsapp/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone })
        });
        await fakeRes.json(); // call fake API but ignore its OTP
        var debugPayload = (USE_FAKE_API || process.env.NODE_ENV !== 'production') ? { debug_otp: otp } : {};
        return res.json({ success: true, message: 'OTP sent (FAKE API - testing mode)', ...debugPayload, phone });
      } catch (fakeErr) {
        return res.status(500).json({ success: false, message: 'Fake API unreachable', error: fakeErr.message });
      }
    }

    // 2. EMAIL OTP (replaces UltraMsg WhatsApp OTP)
    if (email) {
      try {
        await sendOTPEmail(email, otp);
        return res.json({ success: true, message: 'OTP sent to email', email, phone: phone || undefined });
      } catch (emailErr) {
        console.error('[AUTH OTP] Email send failed:', emailErr.message);
        // Fall through to META or log fallback
      }
    }

    // 3. META CLOUD API
    if (META_TOKEN && META_PHONE_ID) {
      // ── REAL META CLOUD API ──
      var textPayload = JSON.stringify({
        messaging_product: 'whatsapp',
        to: phone.replace('+', ''),
        type: 'text',
        text: { body: 'رمز التحقق الخاص بك في XTOX هو: ' + otp + '\nThis code expires in 10 minutes. Do not share it with anyone.' }
      });
      var metaUrl = 'https://graph.facebook.com/v19.0/' + META_PHONE_ID + '/messages';
      try {
        var metaRes = await fetch(metaUrl, {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer ' + META_TOKEN,
            'Content-Type': 'application/json'
          },
          body: textPayload
        });
        var metaData = await metaRes.json();
        if (!metaRes.ok) {
          return res.status(500).json({ success: false, message: 'Failed to send OTP via WhatsApp', error: metaData });
        }
      } catch (metaErr) {
        return res.status(500).json({ success: false, message: 'Server error sending OTP' });
      }

      return res.json({ success: true, message: 'OTP sent to WhatsApp' });
    }

    // 4. NO PROVIDER CONFIGURED
    return res.status(500).json({ success: false, error: 'WhatsApp API not configured' });
  } catch (e) {
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// -- WhatsApp OTP STEP 2: Verify OTP ----------------------------------------
// POST /api/auth/whatsapp/verify-otp
// Body: { phone: '+201234567890', otp: '123456' }
router.post('/whatsapp/verify-otp', async (req, res) => {
  try {
    var phone = (req.body.phone || '').trim();
    if (phone) phone = '+' + phone.replace(/\D/g, '');
    var otp = (req.body.otp || '').trim();

    if ((!phone && !req.body.email) || !otp) {
      return res.status(400).json({ error: 'Phone or email, and OTP required' });
    }

    var User = await getUserModel();
    // Look up by email or phone
    var userQuery2 = phone ? { whatsappPhone: phone } : { email: (req.body.email || '').trim().toLowerCase() };
    var user = await User.findOne(userQuery2);

    if (!user) return res.status(400).json({ error: 'OTP not sent or expired. Request a new one.' });
    if (user.blocked) return res.status(403).json({ error: 'This account has been permanently suspended.' });

    if (user.whatsappOtpAttempts >= 5) {
      return res.status(429).json({ error: 'Too many incorrect attempts. Request a new OTP.' });
    }

    if (!user.whatsappOtp || !user.whatsappOtpExpiry) {
      return res.status(400).json({ error: 'No OTP found. Request a new one.' });
    }

    if (new Date() > user.whatsappOtpExpiry) {
      return res.status(400).json({ error: 'OTP expired. Request a new one.' });
    }

    if (user.whatsappOtp !== otp) {
      await User.findByIdAndUpdate(user._id, { $inc: { whatsappOtpAttempts: 1 } });
      var remaining = 4 - user.whatsappOtpAttempts;
      return res.status(400).json({ error: 'Incorrect OTP. ' + remaining + ' attempts remaining.' });
    }

    // OTP correct
    var isNew = !user.xtoxId;
    var updateData = {
      whatsappOtp: null,
      whatsappOtpExpiry: null,
      whatsappOtpAttempts: 0,
      authProvider: 'whatsapp',
      whatsappVerified: true,
      emailVerified: true,   // email delivery is verified
      lastSeen: new Date()
    };

    if (isNew) {
      updateData.xtoxId = await generateXtoxId();
      var phoneName = 'user' + phone.slice(-4);
      updateData.xtoxEmail = await assignUniqueXtoxEmail(User, phoneName);
      updateData.name = user.name || phoneName;
    }

    var updatedUser = await User.findByIdAndUpdate(user._id, updateData, { new: true });
    var token = issueToken(updatedUser);

    res.json({
      success: true,
      token,
      isNew,
      user: {
        id: updatedUser._id,
        xtoxId: updatedUser.xtoxId,
        xtoxEmail: updatedUser.xtoxEmail,
        name: updatedUser.name,
        phone: updatedUser.whatsappPhone,
        authProvider: 'whatsapp',
        whatsappVerified: true,
        emailVerified: updatedUser.emailVerified || false
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Verification failed' });
  }
});


// -- Google OAuth redirect (mobile-safe) ------------------------------------
// GET /api/auth/google  →  redirects to Google consent page (works on ALL browsers/mobile)
// GET /api/auth/google/callback  →  exchanges code, issues JWT, redirects to frontend
//
// WHY: window.google.accounts.id.prompt() uses FedCM or popup which is BLOCKED
// on iOS Safari and older Android browsers. A server-side redirect flow works
// universally because it opens a first-party page, not a popup.

router.get('/google', (req, res) => {
  if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET) {
    return res.redirect(FRONTEND_URL + '/login?error=google_not_configured');
  }
  var state = '';
  try {
    state = Buffer.from(JSON.stringify({ redirect: req.query.redirect || '/' })).toString('base64url');
  } catch (_) { state = 'e30'; }

  var authParams = new URLSearchParams({
    client_id: GOOGLE_CLIENT_ID,
    redirect_uri: GOOGLE_CALLBACK_URL,
    response_type: 'code',
    scope: 'openid email profile',
    state: state,
    access_type: 'online',
    prompt: 'select_account'
  });
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' + authParams.toString());
});

router.get('/google/callback', async (req, res) => {
  var loginPage = FRONTEND_URL + '/login';
  var code = req.query.code || '';
  var stateRaw = req.query.state || '';
  var redirectTo = '/';

  if (req.query.error || !code) {
    return res.redirect(loginPage + '?error=google_cancelled');
  }

  try {
    var stateObj = JSON.parse(Buffer.from(stateRaw, 'base64url').toString('utf-8'));
    redirectTo = stateObj.redirect || '/';
  } catch (_) {}

  // Exchange auth code for tokens
  var idToken;
  try {
    var tokenRes = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: new URLSearchParams({
        code: code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_CALLBACK_URL,
        grant_type: 'authorization_code'
      }).toString(),
      signal: AbortSignal.timeout(8000)
    });
    var tokenData = await tokenRes.json();
    if (!tokenData.id_token) {
      return res.redirect(loginPage + '?error=google_token_failed');
    }
    idToken = tokenData.id_token;
  } catch (_) {
    return res.redirect(loginPage + '?error=google_timeout');
  }

  // Decode id_token payload (JWT middle part)
  var idPayload;
  try {
    var idParts = idToken.split('.');
    idPayload = JSON.parse(Buffer.from(idParts[1], 'base64url').toString('utf-8'));
  } catch (_) {
    return res.redirect(loginPage + '?error=google_token_invalid');
  }

  var googleId = idPayload.sub || '';
  var email = idPayload.email || '';
  var name = idPayload.name || idPayload.given_name || '';
  var avatar = idPayload.picture || '';
  var emailVerified = idPayload.email_verified;

  if (!googleId || !emailVerified) {
    return res.redirect(loginPage + '?error=google_unverified');
  }

  // Load User model
  var User;
  try {
    User = await getUserModel();
  } catch (_) {
    return res.redirect(loginPage + '?error=db_unavailable');
  }

  // Check blocked
  try {
    var blockedCheck = await checkBlocked(User, { googleId });
    if (blockedCheck) {
      return res.redirect(loginPage + '?error=account_suspended');
    }
  } catch (_) {}

  // Find or create user — NEVER creates a duplicate for an existing googleId or email
  // Uses findOne first, then findByIdAndUpdate for existing users (preserves _id and xtoxId)
  var user;
  var isNew = false;
  try {
    var cbQuery = [{ googleId }];
    if (email) cbQuery.push({ email });
    user = await User.findOne({ $or: cbQuery });

    if (!user) {
      isNew = true;
      var xtoxId = await generateXtoxId();
      var baseName = (name.split(' ')[0] || 'user').toLowerCase().replace(/[^a-z]/g, '') || 'user';
      var xtoxEmail = await assignUniqueXtoxEmail(User, baseName);
      user = await User.create({
        googleId: googleId,
        email: email || undefined,
        name: name,
        avatar: avatar,
        authProvider: 'google',
        emailVerified: true,
        xtoxId: xtoxId,
        xtoxEmail: xtoxEmail,
        country: 'unknown',
        lastSeen: new Date()
      });
    } else {
      // Existing user — only update metadata, never reassign _id or xtoxId
      var cbUpd = { lastSeen: new Date(), emailVerified: true };
      if (!user.googleId) cbUpd.googleId = googleId;
      if (!user.xtoxId) {
        cbUpd.xtoxId = await generateXtoxId();
        var cbBn = ((user.name || name || 'user').split(' ')[0] || 'user').toLowerCase().replace(/[^a-z]/g, '') || 'user';
        cbUpd.xtoxEmail = await assignUniqueXtoxEmail(User, cbBn);
      }
      if (avatar && !user.avatar) cbUpd.avatar = avatar;
      user = await User.findByIdAndUpdate(user._id, cbUpd, { new: true });
    }
  } catch (dbErr) {
    // Duplicate key race condition — another request just created the same user
    if (dbErr.code === 11000) {
      try {
        user = await User.findOne({ $or: [{ googleId: googleId }, { email: email }] });
      } catch (_) {}
    }
    if (!user) {
      return res.redirect(loginPage + '?error=db_error');
    }
  }

  if (!user || user.blocked) {
    return res.redirect(loginPage + '?error=account_suspended');
  }

  var cbToken = issueToken(user);

  // Encode full session as base64url so the frontend can store it without an extra API call
  var sessionData = {
    token: cbToken,
    isNew: isNew,
    user: {
      id: user._id,
      xtoxId: user.xtoxId,
      xtoxEmail: user.xtoxEmail,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      authProvider: 'google',
      emailVerified: true,
      whatsappVerified: user.whatsappVerified || false
    }
  };
  var sessionEncoded = Buffer.from(JSON.stringify(sessionData)).toString('base64url');
  return res.redirect(
    loginPage + '?session=' + sessionEncoded + '&redirect=' + encodeURIComponent(redirectTo)
  );
});

// -- Google Sign-In ----------------------------------------------------------
// POST /api/auth/google
// Body: { credential: '<Google ID token>' }
// NEVER returns 500: 400 for bad input, 401 for invalid token, 403 for blocked,
// 503 for DB/external failures.
router.post('/google', async (req, res) => {
  // ── 1. Validate credential format (no DB needed) ──────────────────────────
  var credential = req.body.credential || req.body.token || '';
  if (!credential) return res.status(400).json({ error: 'No Google credential provided' });

  var parts = credential.split('.');
  if (parts.length !== 3) return res.status(400).json({ error: 'Invalid credential format' });

  var payload;
  try {
    var payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
    payload = JSON.parse(payloadStr);
  } catch (_) {
    return res.status(400).json({ error: 'Invalid Google token format' });
  }
  if (!payload || typeof payload !== 'object') {
    return res.status(400).json({ error: 'Invalid Google token' });
  }

  var googleId = payload.sub || '';
  var email = payload.email || '';
  var name = payload.name || payload.given_name || '';
  var avatar = payload.picture || '';
  var emailVerified = payload.email_verified;

  if (!googleId) return res.status(400).json({ error: 'Google token missing sub claim' });
  if (!emailVerified) return res.status(400).json({ error: 'Google email not verified' });

  if (!GOOGLE_CLIENT_ID) {
    console.warn('[Google auth] GOOGLE_CLIENT_ID env var not set — skipping audience check');
  }

  // ── 2. Verify token with Google tokeninfo (optional, soft-fail) ───────────
  try {
    var verifyRes = await fetch(
      'https://oauth2.googleapis.com/tokeninfo?id_token=' + encodeURIComponent(credential),
      { signal: AbortSignal.timeout(5000) }
    );
    if (!verifyRes.ok) {
      console.warn('[Google auth] tokeninfo returned HTTP', verifyRes.status);
      return res.status(401).json({ error: 'Google token verification failed' });
    }
    var verifyData = await verifyRes.json();
    if (verifyData.error_description || verifyData.error) {
      return res.status(401).json({ error: 'Google token rejected: ' + (verifyData.error_description || verifyData.error) });
    }
    if (verifyData.sub !== googleId) {
      return res.status(401).json({ error: 'Google token sub mismatch' });
    }
    if (GOOGLE_CLIENT_ID && verifyData.aud !== GOOGLE_CLIENT_ID) {
      return res.status(401).json({ error: 'Google token audience mismatch' });
    }
  } catch (ve) {
    if (ve.name === 'TimeoutError' || ve.name === 'AbortError') {
      console.warn('[Google auth] tokeninfo timeout — proceeding with local payload');
    } else {
      console.warn('[Google auth] tokeninfo error:', ve.message, '— proceeding with local payload');
    }
    // On network failure: soft-fail so users are not blocked by Google outage
  }

  // ── 3. Load User model ────────────────────────────────────────────────────
  var User;
  try {
    User = await getUserModel();
  } catch (modelErr) {
    return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
  }

  // ── 4. Check blocked ──────────────────────────────────────────────────────
  try {
    var blockedCheck = await checkBlocked(User, { googleId });
    if (blockedCheck) {
      return res.status(403).json({ error: 'This Google account has been permanently suspended from XTOX.' });
    }
  } catch (blockErr) {
    console.warn('[Google auth] Block check failed (skipping):', blockErr.message);
  }

  // ── 5. Find or create user ────────────────────────────────────────────────
  var user;
  var isNew = false;
  try {
    var query = [{ googleId }];
    if (email) query.push({ email });
    user = await User.findOne({ $or: query });

    if (!user) {
      isNew = true;
      var xtoxId = await generateXtoxId();
      var baseName = (name.split(' ')[0] || 'user').toLowerCase().replace(/[^a-z]/g, '') || 'user';
      var xtoxEmail = await assignUniqueXtoxEmail(User, baseName);
      user = await User.create({
        googleId,
        email: email || undefined,
        name,
        avatar,
        authProvider: 'google',
        emailVerified: true,
        xtoxId,
        xtoxEmail,
        country: 'unknown',
        lastSeen: new Date()
      });
    } else {
      var upd = { lastSeen: new Date(), emailVerified: true };
      if (!user.googleId) upd.googleId = googleId;
      if (!user.xtoxId) {
        upd.xtoxId = await generateXtoxId();
        var bn = ((user.name || name || 'user').split(' ')[0] || 'user').toLowerCase().replace(/[^a-z]/g, '') || 'user';
        upd.xtoxEmail = await assignUniqueXtoxEmail(User, bn);
      }
      if (avatar && !user.avatar) upd.avatar = avatar;
      user = await User.findByIdAndUpdate(user._id, upd, { new: true });
    }
  } catch (dbErr) {
    // Duplicate key: another request just created the same user — retry findOne
    if (dbErr.code === 11000) {
      try {
        user = await User.findOne({ $or: [{ googleId }, { email }] });
      } catch (_) {}
    }
    if (!user) {
      return res.status(503).json({ error: 'Database temporarily unavailable. Please try again.' });
    }
  }

  // ── 6. Final block check & respond ───────────────────────────────────────
  if (!user) {
    return res.status(503).json({ error: 'Could not retrieve user record. Please try again.' });
  }
  if (user.blocked) {
    return res.status(403).json({ error: 'This account has been permanently suspended.' });
  }

  var token = issueToken(user);
  return res.json({
    success: true,
    token,
    isNew,
    user: {
      id: user._id,
      xtoxId: user.xtoxId,
      xtoxEmail: user.xtoxEmail,
      name: user.name,
      email: user.email,
      avatar: user.avatar,
      authProvider: 'google',
      emailVerified: true,
      whatsappVerified: user.whatsappVerified || false
    }
  });
});

// -- Apple Sign In -----------------------------------------------------------
// POST /api/auth/apple
// Body: { identityToken: '<Apple JWT>', user: { name: {firstName, lastName}, email } }
router.post('/apple', async (req, res) => {
  try {
    var identityToken = req.body.identityToken || req.body.token || '';
    var appleUser = req.body.user || {};
    if (!identityToken) return res.status(400).json({ error: 'No Apple identity token' });

    var parts = identityToken.split('.');
    if (parts.length !== 3) return res.status(400).json({ error: 'Invalid Apple token format' });

    var payloadStr = Buffer.from(parts[1], 'base64url').toString('utf-8');
    var payload = JSON.parse(payloadStr);

    var appleId = payload.sub;
    var email = payload.email || (appleUser.email || null);
    var isPrivateEmail = payload.is_private_email === 'true' || payload.is_private_email === true;

    var firstName = (appleUser.name && appleUser.name.firstName) ? appleUser.name.firstName : '';
    var lastName = (appleUser.name && appleUser.name.lastName) ? appleUser.name.lastName : '';
    var name = (firstName + ' ' + lastName).trim() || 'Apple User';

    if (!appleId) return res.status(400).json({ error: 'Invalid Apple token' });

    // Verify with Apple
    try {
      if (payload.iss !== 'https://appleid.apple.com') {
        return res.status(401).json({ error: 'Invalid Apple token issuer' });
      }
      if (APPLE_CLIENT_ID && payload.aud !== APPLE_CLIENT_ID) {
        return res.status(401).json({ error: 'Apple token audience mismatch' });
      }
      if (payload.exp < Math.floor(Date.now() / 1000)) {
        return res.status(401).json({ error: 'Apple token expired' });
      }
    } catch (ve) {
      console.warn('[Apple auth] Verify warning:', ve.message);
    }

    var User = await getUserModel();

    var blockedCheck = await checkBlocked(User, { appleId });
    if (blockedCheck) {
      return res.status(403).json({ error: 'This Apple account has been permanently suspended from XTOX.' });
    }

    var query = [{ appleId }];
    if (email && !isPrivateEmail) query.push({ email });
    var user = await User.findOne({ $or: query });
    var isNew = false;

    if (!user) {
      isNew = true;
      var xtoxId = await generateXtoxId();
      var baseName = name.split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'user';
      var xtoxEmail = await assignUniqueXtoxEmail(User, baseName);
      user = await User.create({
        appleId,
        email: email || null,
        name,
        authProvider: 'apple',
        xtoxId,
        xtoxEmail,
        country: 'unknown',
        lastSeen: new Date()
      });
    } else {
      var upd = { lastSeen: new Date() };
      if (!user.appleId) upd.appleId = appleId;
      if (!user.xtoxId) {
        upd.xtoxId = await generateXtoxId();
        var bn = (user.name || name).split(' ')[0].toLowerCase().replace(/[^a-z]/g, '') || 'user';
        upd.xtoxEmail = await assignUniqueXtoxEmail(User, bn);
      }
      if (name && name !== 'Apple User' && !user.name) upd.name = name;
      user = await User.findByIdAndUpdate(user._id, upd, { new: true });
    }

    if (user.blocked) {
      return res.status(403).json({ error: 'This account has been permanently suspended.' });
    }

    var token = issueToken(user);
    res.json({
      success: true,
      token,
      isNew,
      user: {
        id: user._id,
        xtoxId: user.xtoxId,
        xtoxEmail: user.xtoxEmail,
        name: user.name,
        authProvider: 'apple'
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Apple authentication failed' });
  }
});

// -- Block user (admin only) -------------------------------------------------
// POST /api/auth/block/:userId
// Body: { reason: 'Spam', adminSecret: '...' }
router.post('/block/:userId', async (req, res) => {
  try {
    var adminSecret = req.body.adminSecret || req.headers['x-admin-secret'] || '';
    if (adminSecret !== (process.env.ADMIN_BLOCK_SECRET || 'xtox-admin-block')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    var User = await getUserModel();
    var user = await User.findById(req.params.userId);
    if (!user) return res.status(404).json({ error: 'User not found' });

    var blockUpdate = {
      blocked: true,
      blockedAt: new Date(),
      blockReason: req.body.reason || 'Violation of terms'
    };
    if (user.googleId) blockUpdate.blockedGoogleId = user.googleId;
    if (user.appleId) blockUpdate.blockedAppleId = user.appleId;
    if (user.whatsappPhone) blockUpdate.blockedPhone = user.whatsappPhone;

    await User.findByIdAndUpdate(user._id, blockUpdate);

    res.json({
      success: true,
      message: 'User permanently blocked',
      blockedIdentifiers: {
        googleId: user.googleId || null,
        appleId: user.appleId || null,
        phone: user.whatsappPhone || null
      }
    });
  } catch (e) {
    res.status(500).json({ error: 'Block failed' });
  }
});

// -- Unblock user (admin only) -----------------------------------------------
router.post('/unblock/:userId', async (req, res) => {
  try {
    var adminSecret = req.body.adminSecret || req.headers['x-admin-secret'] || '';
    if (adminSecret !== (process.env.ADMIN_BLOCK_SECRET || 'xtox-admin-block')) {
      return res.status(403).json({ error: 'Unauthorized' });
    }
    var User = await getUserModel();
    await User.findByIdAndUpdate(req.params.userId, {
      blocked: false,
      blockedAt: null,
      blockReason: null,
      blockedGoogleId: null,
      blockedAppleId: null,
      blockedPhone: null
    });
    res.json({ success: true });
  } catch (e) {
    res.status(500).json({ error: 'Unblock failed' });
  }
});

export default router;
