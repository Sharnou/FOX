import express from 'express';
import Report from '../models/Report.js';
import { auth, adminAuth } from '../middleware/auth.js';

const router = express.Router();

// Allowed report types
const REPORT_TYPES = ['spam', 'fraud', 'inappropriate', 'duplicate', 'wrong_category', 'offensive', 'other'];

// POST /api/reports — Submit a report (authenticated users)
router.post('/', auth, async (req, res) => {
  try {
    const { targetId, type, reason } = req.body;

    const errors = [];
    if (!targetId || typeof targetId !== 'string' || targetId.length > 100)
      errors.push('targetId is required (max 100 chars)');
    if (!type || !REPORT_TYPES.includes(type))
      errors.push(`type must be one of: ${REPORT_TYPES.join(', ')}`);
    if (!reason || typeof reason !== 'string' || reason.trim().length < 5 || reason.length > 500)
      errors.push('reason must be 5–500 characters');
    if (errors.length) return res.status(400).json({ errors });

    // Prevent duplicate reports from the same user on the same target
    const existing = await Report.findOne({ reporterId: req.user.id, targetId });
    if (existing)
      return res.status(409).json({ error: 'لقد أبلغت عن هذا المحتوى بالفعل / You already reported this item' });

    const report = await Report.create({
      reporterId: req.user.id,
      targetId,
      type,
      reason: reason.trim(),
      resolved: false,
    });

    res.status(201).json({
      message: 'تم الإبلاغ بنجاح / Report submitted successfully',
      id: report._id,
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports/mine — Fetch current user's own submitted reports
router.get('/mine', auth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(50, parseInt(req.query.limit) || 20);
    const skip  = (page - 1) * limit;

    const [reports, total] = await Promise.all([
      Report.find({ reporterId: req.user.id })
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
      Report.countDocuments({ reporterId: req.user.id }),
    ]);

    res.json({ reports, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// GET /api/reports — Admin: list all reports with pagination + filters
router.get('/', adminAuth, async (req, res) => {
  try {
    const page  = Math.max(1, parseInt(req.query.page)  || 1);
    const limit = Math.min(100, parseInt(req.query.limit) || 50);
    const skip  = (page - 1) * limit;

    const filter = {};
    if (req.query.resolved === 'true')  filter.resolved = true;
    if (req.query.resolved === 'false') filter.resolved = false;
    if (req.query.type && REPORT_TYPES.includes(req.query.type)) filter.type = req.query.type;

    const [reports, total] = await Promise.all([
      Report.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit).lean(),
      Report.countDocuments(filter),
    ]);

    res.json({ reports, total, page, pages: Math.ceil(total / limit) });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// PATCH /api/reports/:id/resolve — Admin: mark a report as resolved
router.patch('/:id/resolve', adminAuth, async (req, res) => {
  try {
    const report = await Report.findByIdAndUpdate(
      req.params.id,
      { resolved: true },
      { returnDocument: 'after' }
    );
    if (!report) return res.status(404).json({ error: 'Report not found' });
    res.json({ message: 'تم حل البلاغ / Report resolved', report });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
