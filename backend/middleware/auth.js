// CORS is handled in index.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { dbState } from '../server/memoryStore.js';

const JWT_SECRET = process.env.JWT_SECRET || 'fox-default-secret';

export function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    // Update lastSeen non-blocking — skip when using in-memory store (no MongoDB)
    if (!dbState.usingMemoryStore) {
      User.updateOne({ _id: req.user.id }, { lastSeen: new Date() }).exec().catch(() => {});
    }
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'انتهت صلاحية الجلسة / Session expired' });
    }
    res.status(401).json({ error: 'غير مصرح / Invalid token' });
  }
}

export function adminAuth(req, res, next) {
  auth(req, res, () => {
    if (!['admin', 'sub_admin'].includes(req.user.role)) return res.status(403).json({ error: 'Forbidden' });
    next();
  });
}

export function superAdminAuth(req, res, next) {
  auth(req, res, () => {
    if (req.user.role !== 'admin') return res.status(403).json({ error: 'Super admin only' });
    next();
  });
}
