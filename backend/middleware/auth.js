// CORS is handled in index.js
import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET);
    // Update lastSeen non-blocking — wires up isOnline/onlineStatus virtuals (run 86 User.js)
    User.updateOne({ _id: req.user.id }, { lastSeen: new Date() }).exec().catch(() => {});
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
