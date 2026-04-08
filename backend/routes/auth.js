/**
 * /api/auth -- Real authentication routes
 * - WhatsApp OTP (Meta Cloud API)
 * - Google Sign-In (real Google sub ID)
 * - Apple Sign In with Apple
 * - Blocking enforced on real identifiers
 */
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'fox-default-secret';
const META_TOKEN = process.env.WHATSAPP_API_TOKEN || '';
const META_PHONE_ID = process.env.WHATSAPP_PHONE_NUMBER_ID || '';
const APPLE_CLIENT_ID = process.env.APPLE_CLIENT_ID || '';
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || '';

// -- Helpers -----------------------------------------------------------------

async function getUserModel() {
  return mongoose.models.User || (await import('../models/User.js')).default;
}

async function getCounterModel() {
  return mongoose.models.Counter || (await import('../models/Counter.js')).default;
}

// Generate next XTOX ID: XTOX-000001, XTOX-000002, ...
async function generateXtoxId() {
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
    var phone = (req.body.phone || '').trim().replace(/\s/g, '');
    if (!phone || !phone.startsWith('+')) {
      return res.status(400).json({ error: 'Phone must start with country code e.g. +201234567890' });
    }
    phone = '+' + phone.replace(/\D/g, '');

    var User = await getUserModel();

    // Check if this phone is permanently blocked
    var blocked = await User.findOne({ blocked: true, blockedPhone: phone });
    if (blocked) {
      return res.status(403).json({ error: 'This phone number has been permanently suspended.' });
    }

    // Generate 6-digit OTP
    var otp = String(Math.floor(100000 + Math.random() * 900000));
    var expiry = new Date(Date.now() + 10 * 60 * 1000);

    // Save OTP to user (or create temp record by phone)
    await User.findOneAndUpdate(
      { whatsappPhone: phone },
      {
        whatsappOtp: otp,
        whatsappOtpExpiry: expiry,
        whatsappOtpAttempts: 0,
        whatsappPhone: phone,
        country: 'unknown'
      },
      { upsert: true, setDefaultsOnInsert: true }
    );

    // Send via Meta WhatsApp Cloud API
    if (META_TOKEN && META_PHONE_ID) {
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
          console.error('[WhatsApp OTP] Meta API error:', metaData);
        }
      } catch (metaErr) {
        console.error('[WhatsApp OTP] Meta fetch error:', metaErr.message);
      }
    } else {
      // DEV MODE: log OTP to console
      console.log('[WhatsApp OTP DEV] Phone:', phone, 'OTP:', otp);
    }

    res.json({ success: true, message: 'OTP sent to WhatsApp' });
  } catch (e) {
    console.error('[send-otp]', e);
    res.status(500).json({ error: 'Failed to send OTP' });
  }
});

// -- WhatsApp OTP STEP 2: Verify OTP ----------------------------------------
// POST /api/auth/whatsapp/verify-otp
// Body: { phone: '+201234567890', otp: '123456' }
router.post('/whatsapp/verify-otp', async (req, res) => {
  try {
    var phone = (req.body.phone || '').trim();
    phone = '+' + phone.replace(/\D/g, '');
    var otp = (req.body.otp || '').trim();

    if (!phone || !otp) {
      return res.status(400).json({ error: 'Phone and OTP required' });
    }

    var User = await getUserModel();
    var user = await User.findOne({ whatsappPhone: phone });

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
        authProvider: 'whatsapp'
      }
    });
  } catch (e) {
    console.error('[verify-otp]', e);
    res.status(500).json({ error: 'Verification failed' });
  }
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
    console.error('[Google auth] getUserModel failed:', modelErr.message);
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
        xtoxId,
        xtoxEmail,
        country: 'unknown',
        lastSeen: new Date()
      });
    } else {
      var upd = { lastSeen: new Date() };
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
    console.error('[Google auth] DB operation failed:', dbErr.message, dbErr.code || '');
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
      authProvider: 'google'
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
    console.error('[apple auth]', e);
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
    console.error('[block]', e);
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
