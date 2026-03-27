import jwt from 'jsonwebtoken';
export function auth(req, res, next) {
  const token = req.headers.authorization?.replace('Bearer ', '');
  if (!token) return res.status(401).json({ error: 'Unauthorized' });
  try { req.user = jwt.verify(token, process.env.JWT_SECRET); next(); }
  catch { res.status(401).json({ error: 'Invalid token' }); }
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
