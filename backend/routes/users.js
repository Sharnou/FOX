import fetch from 'node-fetch';
import express from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { detectFraud } from '../server/fraud.js';
import { getOrCreateCountry } from '../server/countries.js';

const router = express.Router();
const otpStore = new Map();

// Seed super admin on first run
export async function seedSuperAdmin() {
  const email = 'ahmed_sharnou@yahoo.com';
  const exists = await User.findOne({ email });
  if (!exists) {
    const hash = await bcrypt.hash('XTOX_Admin_2026!', 10);
    await User.create({
      email,
      password: hash,
      name: 'Ahmed Sharnou',
      country: 'EG',
      city: 'Cairo',
      role: 'admin',
      isVerified: true,
      reputation: 100
    });
    console.log('✅ Super admin created: ahmed_sharnou@yahoo.com');
  }
}

router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    otpStore.set(phone, { otp, expires: Date.now() + 10 * 60 * 1000 });
    console.log(`OTP for ${phone}: ${otp}`);
    res.json({ success: true, debug_otp: process.env.NODE_ENV === 'development' ? otp : undefined });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp, name, country: countryCode, city } = req.body;
    const record = otpStore.get(phone);
    if (!record || record.otp !== otp || Date.now() > record.expires)
      return res.status(400).json({ error: 'Invalid or expired OTP' });
    otpStore.delete(phone);
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const fraud = await detectFraud(ip);
    if (fraud.isFraud) return res.status(400).json({ error: 'Account creation restricted' });
    await getOrCreateCountry(countryCode, countryCode);
    let user = await User.findOne({ phone });
    if (!user) user = await User.create({ phone, name: name || phone, country: countryCode, city, registrationIp: ip });
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, name: user.name, country: user.country, role: user.role } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

router.post('/register', async (req, res) => {
  try {
    const { email, password, name, country: countryCode, city } = req.body;
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const fraud = await detectFraud(ip);
    if (fraud.isFraud) return res.status(400).json({ error: 'Account creation restricted' });
    await getOrCreateCountry(countryCode, countryCode);
    const existing = await User.findOne({ email });
    if (existing) return res.status(400).json({ error: 'Email already registered' });
    const hash = await bcrypt.hash(password, 10);
    // Auto-detect country from IP if not provided
    let finalCountry = countryCode;
    if (!finalCountry || finalCountry === 'unknown') {
      try {
        const geoRes = await fetch(`http://ip-api.com/json/${ip}?fields=countryCode`);
        const geoData = await geoRes.json();
        finalCountry = geoData.countryCode || 'EG';
      } catch { finalCountry = 'EG'; }
    }
    const user = await User.create({ email, password: hash, name, country: finalCountry, city, registrationIp: ip });
    const token = jwt.sign({ id: user._id, role: user.role, country: user.country }, process.env.JWT_SECRET, { expiresIn: '90d' });
    res.json({ token, user: { id: user._id, email, name, country: user.country } });
  } catch (e) { res.status(500).json({ error: e.message }); }
});

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

export default router;
