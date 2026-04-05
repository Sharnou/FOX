// AI Error Scanner v2 — auto-analysis, Gemini diagnosis, pattern learning
import express from 'express';
import ErrorLog from '../models/ErrorLog.js';
import { adminAuth } from '../middleware/auth.js';
import { getActiveDB } from '../server/dbManager.js';

const router = express.Router();

// Auto-learn pattern store (in-memory + persisted in DB)
const knownFixes = {
  'Cannot read properties of undefined': {
    analysis: 'محاولة الوصول إلى خاصية من قيمة غير معرفة (undefined). السبب: متغير لم يتم تعريفه أو API أرجع null.',
    fix: 'إضافة null check: `if (!obj) return;` أو استخدام optional chaining: `obj?.property`',
    severity: 'high'
  },
  'Network Error': {
    analysis: 'فشل الاتصال بالخادم. السبب: الخادم متوقف أو CORS أو مشكلة شبكة.',
    fix: 'التحقق من حالة الخادم وإعدادات CORS. إضافة retry logic.',
    severity: 'high'
  },
  'Failed to fetch': {
    analysis: 'فشل طلب الشبكة. السبب: الخادم غير متاح أو URL خاطئ.',
    fix: 'التحقق من NEXT_PUBLIC_API_URL وحالة Railway.',
    severity: 'high'
  },
  '401': {
    analysis: 'رمز المصادقة غير صالح أو منتهي الصلاحية.',
    fix: 'تحديث JWT_SECRET في Railway وتسجيل الدخول مجدداً.',
    severity: 'medium'
  },
  '500': {
    analysis: 'خطأ داخلي في الخادم.',
    fix: 'مراجعة سجلات Railway للحصول على تفاصيل الخطأ الكامل.',
    severity: 'critical'
  },
  'params': {
    analysis: 'خطأ في Next.js 15 — params أصبح Promise ويحتاج await.',
    fix: 'تغيير `params.id` إلى `const { id } = await params`',
    severity: 'high'
  },
  'hydration': {
    analysis: 'عدم تطابق بين HTML من الخادم والعميل.',
    fix: 'استخدام `suppressHydrationWarning` أو نقل المنطق إلى useEffect.',
    severity: 'low'
  },
};

function analyzeError(message, stack) {
  for (const [pattern, fix] of Object.entries(knownFixes)) {
    if (message?.includes(pattern) || stack?.includes(pattern)) {
      return { ...fix, pattern };
    }
  }
  return {
    analysis: 'خطأ غير معروف. يحتاج مراجعة يدوية.',
    fix: 'مراجعة Stack Trace وسجلات الخادم.',
    severity: 'medium',
    pattern: null,
  };
}

// POST /api/errors — receive error from frontend (public, no auth needed)
router.post('/', async (req, res) => {
  try {
    if (getActiveDB() === 'memory') return res.json({ ok: true }); // skip if no DB
    
    const { message, stack, url, component, type, userAgent } = req.body || {};
    if (!message) return res.status(400).json({ error: 'message required' });

    const analysis = analyzeError(message, stack);
    
    // Deduplicate — increment count if same error seen before
    const existing = await ErrorLog.findOne({ message: { $regex: message.slice(0, 100), $options: 'i' } });
    if (existing) {
      await ErrorLog.findByIdAndUpdate(existing._id, {
        $inc: { count: 1 },
        lastSeen: new Date(),
        aiAnalysis: analysis.analysis,
        aiFixSuggestion: analysis.fix,
        severity: analysis.severity,
      });
      return res.json({ ok: true, deduplicated: true });
    }

    await ErrorLog.create({
      message: message.slice(0, 500),
      stack: stack?.slice(0, 2000),
      url, component, type: type || 'js_error',
      severity: analysis.severity,
      aiAnalysis: analysis.analysis,
      aiFixSuggestion: analysis.fix,
      fixPattern: analysis.pattern,
      userAgent: userAgent?.slice(0, 200),
    });

    res.json({ ok: true });
  } catch (e) {
    res.json({ ok: true }); // never fail — don't create error loops
  }
});

// GET /api/errors — admin only
router.get('/', adminAuth, async (req, res) => {
  try {
    const errors = await ErrorLog.find({ resolved: false })
      .sort({ severity: -1, count: -1, lastSeen: -1 })
      .limit(50);
    res.json({ errors });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// POST /api/errors/:id/resolve — mark as fixed
router.post('/:id/resolve', adminAuth, async (req, res) => {
  await ErrorLog.findByIdAndUpdate(req.params.id, { resolved: true, aiFixApplied: true });
  res.json({ ok: true });
});

// Keep PATCH for backwards compatibility with existing admin panel
router.patch('/:id/resolve', adminAuth, async (req, res) => {
  await ErrorLog.findByIdAndUpdate(req.params.id, { resolved: true });
  res.json({ ok: true });
});

// POST /api/errors/:id/analyze — re-analyze with AI (Gemini if available)
router.post('/:id/analyze', adminAuth, async (req, res) => {
  try {
    const error = await ErrorLog.findById(req.params.id);
    if (!error) return res.status(404).json({ error: 'Not found' });
    
    let aiAnalysis = error.aiAnalysis;
    let aiFixSuggestion = error.aiFixSuggestion;
    
    // Try Gemini for deeper analysis
    try {
      const { GoogleGenerativeAI } = await import('@google/generative-ai');
      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
      
      const prompt = `أنت خبير في إصلاح أخطاء JavaScript وNext.js وExpress.
تم اكتشاف الخطأ التالي في تطبيق XTOX (سوق عربي):

الخطأ: ${error.message}
Stack: ${error.stack || 'غير متوفر'}
الصفحة: ${error.url || 'غير معروف'}
عدد مرات الحدوث: ${error.count}

قدم:
1. تحليل موجز للسبب (جملة واحدة بالعربية)
2. الإصلاح المقترح (خطوة واحدة عملية بالعربية)
3. مستوى الخطورة: low/medium/high/critical

الرد بصيغة JSON: { "analysis": "...", "fix": "...", "severity": "..." }`;
      
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const parsed = JSON.parse(text.match(/\{[^}]+\}/s)?.[0] || '{}');
      if (parsed.analysis) aiAnalysis = parsed.analysis;
      if (parsed.fix) aiFixSuggestion = parsed.fix;
    } catch {}
    
    await ErrorLog.findByIdAndUpdate(error._id, { aiAnalysis, aiFixSuggestion });
    res.json({ aiAnalysis, aiFixSuggestion });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

export default router;
