// CORS is handled in index.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { dbState } from '../server/memoryStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fox-default-secret';

// #160: Robust JWT extraction — supports:
//   Authorization: Bearer <token>
//   Authorization: <token>     (plain token, no Bearer prefix)
function extractToken(req) {
  const header = (req.headers.authorization || '').trim();
  if (!header) return null;
  if (header.startsWith('Bearer ')) return header.slice(7).trim();
  // Plain token format (no Bearer prefix)
  if (header.length > 20 && !header.includes(' ')) return header;
  // "Bearer" with space but missing token
  return null;
}

export function auth(req, res, next) {
  const token = extractToken(req);
  // #160: Handle missing Authorization header gracefully (401, not 500)
  if (!token) return res.status(401).json({ success: false, error: 'لم يتم توفير رمز المصادقة' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    // Update lastSeen non-blocking — skip when using in-memory store (no MongoDB)
    if (!dbState.usingMemoryStore) {
      User.updateOne({ _id: req.user.id }, { lastSeen: new Date() }).exec().catch(() => {});
    }
    next();
  } catch (err) {
    // #160: Differentiate expired vs malformed JWT
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'انتهت صلاحية الجلسة. يرجى تسجيل الدخول مجدداً.' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'رمز المصادقة غير صالح.' });
    }
    return res.status(401).json({ success: false, error: 'رمز المصادقة غير صالح أو منتهي الصلاحية.' });
  }
}

export function optionalAuth(req, res, next) {
  const token = extractToken(req);
  if (token) {
    try { req.user = jwt.verify(token, JWT_SECRET); } catch {}
  }
  next();
}

export function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (!['admin', 'sub_admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'ممنوع — صلاحيات المشرف مطلوبة' });
    next();
  });
}

export function superAdminAuth(req, res, next) {
  auth(req, res, () => {
    if (!['admin', 'superadmin'].includes(req.user.role)) return res.status(403).json({ success: false, error: 'ممنوع — صلاحيات المشرف الرئيسي مطلوبة' });
    next();
  });
}
