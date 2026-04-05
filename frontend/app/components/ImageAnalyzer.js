'use client';
import { useRef, useState, useCallback } from 'react';

// ─── Auto-learn storage ───────────────────────────────────────────────────────
const LEARN_KEY = 'xtox_image_learn_v1';

function getLearnedSuggestions(category) {
  try {
    const data = JSON.parse(localStorage.getItem(LEARN_KEY) || '{}');
    return data[category] || { titles: [], descriptions: [] };
  } catch { return { titles: [], descriptions: [] }; }
}

function saveLearning(category, title, description) {
  try {
    const data = JSON.parse(localStorage.getItem(LEARN_KEY) || '{}');
    if (!data[category]) data[category] = { titles: [], descriptions: [] };
    // Keep top 10 per category, most recent first
    if (title && !data[category].titles.includes(title)) {
      data[category].titles.unshift(title);
      data[category].titles = data[category].titles.slice(0, 10);
    }
    if (description && !data[category].descriptions.includes(description)) {
      data[category].descriptions.unshift(description);
      data[category].descriptions = data[category].descriptions.slice(0, 10);
    }
    localStorage.setItem(LEARN_KEY, JSON.stringify(data));
  } catch {}
}

// ─── MobileNet → Arabic marketplace category mapping ────────────────────────
const CLASS_MAP = {
  // Electronics
  'laptop':            { category: 'Electronics', ar: 'لابتوب',          desc: 'لابتوب بحالة ممتازة، يعمل بكفاءة عالية.' },
  'notebook':          { category: 'Electronics', ar: 'لابتوب',          desc: 'لابتوب نظيف وجاهز للاستخدام.' },
  'computer':          { category: 'Electronics', ar: 'كمبيوتر',         desc: 'جهاز كمبيوتر بمواصفات جيدة.' },
  'cellular telephone':{ category: 'Electronics', ar: 'هاتف ذكي',        desc: 'هاتف ذكي بحالة ممتازة مع جميع الملحقات.' },
  'mobile phone':      { category: 'Electronics', ar: 'جوال',            desc: 'جوال نظيف يعمل بشكل مثالي.' },
  'iPod':              { category: 'Electronics', ar: 'جهاز صوتي',       desc: 'جهاز صوتي بحالة جيدة.' },
  'television':        { category: 'Electronics', ar: 'تلفزيون',         desc: 'تلفزيون بشاشة واضحة وصورة عالية الجودة.' },
  'screen':            { category: 'Electronics', ar: 'شاشة',            desc: 'شاشة بدقة عالية وألوان واضحة.' },
  'monitor':           { category: 'Electronics', ar: 'شاشة كمبيوتر',    desc: 'شاشة كمبيوتر بحالة ممتازة.' },
  'camera':            { category: 'Electronics', ar: 'كاميرا',          desc: 'كاميرا احترافية بعدسات واضحة.' },
  'headphone':         { category: 'Electronics', ar: 'سماعات',          desc: 'سماعات بجودة صوت ممتازة.' },
  'speaker':           { category: 'Electronics', ar: 'مكبر صوت',        desc: 'مكبر صوت بصوت قوي وواضح.' },
  // Home
  'refrigerator':      { category: 'General',     ar: 'ثلاجة',           desc: 'ثلاجة تعمل بكفاءة عالية، بحالة جيدة.' },
  'washing machine':   { category: 'General',     ar: 'غسالة',           desc: 'غسالة ملابس بحالة ممتازة.' },
  'microwave':         { category: 'General',     ar: 'ميكروويف',        desc: 'ميكروويف يعمل بشكل مثالي.' },
  // Vehicles
  'car':               { category: 'Vehicles',    ar: 'سيارة',           desc: 'سيارة بحالة جيدة، مجهزة بالكامل.' },
  'bicycle':           { category: 'Vehicles',    ar: 'دراجة هوائية',    desc: 'دراجة هوائية بحالة ممتازة.' },
  'motorcycle':        { category: 'Vehicles',    ar: 'دراجة نارية',     desc: 'دراجة نارية بحالة جيدة.' },
  // Furniture
  'chair':             { category: 'General',     ar: 'كرسي',            desc: 'كرسي مريح بحالة ممتازة.' },
  'sofa':              { category: 'General',     ar: 'كنبة',            desc: 'كنبة أنيقة ومريحة بحالة ممتازة.' },
  'table':             { category: 'General',     ar: 'طاولة',           desc: 'طاولة متينة بحالة جيدة.' },
  // Fashion
  'jersey':            { category: 'Fashion',     ar: 'ملابس رياضية',    desc: 'ملابس رياضية نظيفة بحالة ممتازة.' },
  'shoe':              { category: 'Fashion',     ar: 'حذاء',            desc: 'حذاء بحالة جيدة، استخدام خفيف.' },
  'watch':             { category: 'Fashion',     ar: 'ساعة',            desc: 'ساعة أنيقة بحالة ممتازة.' },
  'sunglasses':        { category: 'Fashion',     ar: 'نظارات شمسية',    desc: 'نظارات شمسية أنيقة بحالة ممتازة.' },
};

function mapClassToInfo(className) {
  const lower = className.toLowerCase();
  for (const [key, val] of Object.entries(CLASS_MAP)) {
    if (lower.includes(key)) return val;
  }
  return { category: 'General', ar: className, desc: 'منتج بحالة ممتازة للبيع.' };
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function ImageAnalyzer({ onResult }) {
  const [status, setStatus] = useState('idle'); // idle | loading | 'Classifying...' | done | error
  const [result, setResult] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const imgRef = useRef(null);
  const fileRef = useRef(null);

  const analyze = useCallback(async (file) => {
    if (!file) return;
    setStatus('loading');
    setResult(null);

    const url = URL.createObjectURL(file);
    setPreviewUrl(url);

    try {
      // Dynamic imports to avoid SSR issues
      setStatus('جاري تحميل نماذج الذكاء الاصطناعي...');

      const [mobilenet, Tesseract] = await Promise.all([
        import('@tensorflow-models/mobilenet'),
        import('tesseract.js'),
      ]);

      // Make sure TF backend is ready
      await import('@tensorflow/tfjs');

      setStatus('جاري التعرف على محتوى الصورة...');

      // Wait for the <img> to finish loading
      await new Promise((resolve) => {
        const img = imgRef.current;
        if (!img) return resolve();
        if (img.complete && img.naturalWidth > 0) return resolve();
        img.onload = resolve;
        img.onerror = resolve;
      });

      // Classify with MobileNet
      const model = await mobilenet.load({ version: 2, alpha: 1.0 });
      const predictions = await model.classify(imgRef.current, 5);
      const top = predictions[0];
      const info = mapClassToInfo(top.className);

      // OCR with Tesseract
      setStatus('جاري استخراج النص من الصورة...');
      let ocrText = '';
      try {
        const TesseractModule = Tesseract.default || Tesseract;
        const { data } = await TesseractModule.recognize(imgRef.current, 'eng+ara', {
          logger: () => {},
        });
        ocrText = data.text?.trim() || '';
      } catch (ocrErr) {
        console.warn('[Tesseract OCR] failed:', ocrErr);
      }

      // Build suggestions — prefer previously learned ones
      const learned = getLearnedSuggestions(info.category);
      const firstOcrLine = ocrText.split('\n').find(l => l.trim().length > 2)?.trim().slice(0, 40) || '';
      const suggestedTitle =
        learned.titles[0] ||
        `${info.ar}${firstOcrLine ? ' - ' + firstOcrLine : ' - بحالة ممتازة'}`;
      const suggestedDesc =
        learned.descriptions[0] ||
        `${info.desc}${ocrText ? '\n\nنص مستخرج من الصورة: ' + ocrText.slice(0, 200) : ''}`;

      const res = {
        title: suggestedTitle,
        description: suggestedDesc,
        category: info.category,
        confidence: Math.round(top.probability * 100),
        rawClass: top.className,
        ocrText,
        allPredictions: predictions,
      };

      setResult(res);
      setStatus('done');
      onResult?.(res);
    } catch (err) {
      console.error('[ImageAnalyzer] analysis failed:', err);
      setStatus('error');
    }
  }, [onResult]);

  const handleFile = (e) => {
    const file = e.target.files?.[0];
    if (file) analyze(file);
  };

  const confirmAndLearn = () => {
    if (result) {
      saveLearning(result.category, result.title, result.description);
      alert('✅ تم الحفظ! سيتحسن النظام في المرة القادمة');
    }
  };

  const isProcessing = status !== 'idle' && status !== 'done' && status !== 'error';

  return (
    <div style={{
      border: '2px dashed #6366f1',
      borderRadius: 12,
      padding: 16,
      marginBottom: 16,
      background: '#fafaff',
    }}>
      <p style={{ fontWeight: 'bold', marginBottom: 8, color: '#6366f1', margin: '0 0 10px' }}>
        📸 تحليل الصورة تلقائياً (بدون إنترنت / Offline AI)
      </p>

      {/* Image preview */}
      {previewUrl && (
        <img
          ref={imgRef}
          src={previewUrl}
          alt="preview"
          crossOrigin="anonymous"
          style={{ maxWidth: '100%', maxHeight: 200, borderRadius: 8, marginBottom: 8, display: 'block' }}
        />
      )}
      {/* Hidden img used for TF.js when no preview yet */}
      {!previewUrl && <img ref={imgRef} style={{ display: 'none' }} alt="" />}

      {/* File input */}
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        onChange={handleFile}
        style={{ marginBottom: 8, display: 'block' }}
        disabled={isProcessing}
      />

      {/* Status messages */}
      {status === 'loading' && (
        <p style={{ color: '#6366f1', margin: '4px 0' }}>⏳ جاري التحليل...</p>
      )}
      {isProcessing && status !== 'loading' && (
        <p style={{ color: '#6366f1', fontSize: 12, margin: '4px 0' }}>⏳ {status}</p>
      )}
      {status === 'error' && (
        <p style={{ color: 'red', margin: '4px 0' }}>❌ فشل التحليل — حاول صورة أخرى</p>
      )}

      {/* Results */}
      {result && (
        <div style={{ background: '#f0f0ff', borderRadius: 8, padding: 12, marginTop: 8 }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            <strong>🔍 تم التعرف على:</strong> {result.rawClass} ({result.confidence}% ثقة)
          </p>
          <p style={{ margin: '6px 0 0', fontSize: 12, color: '#555' }}>
            📝 عنوان مقترح: <strong>{result.title}</strong>
          </p>
          {result.ocrText && (
            <p style={{ margin: '4px 0 0', fontSize: 12, color: '#555' }}>
              🔤 نص مستخرج: {result.ocrText.slice(0, 120)}
            </p>
          )}
          <p style={{ margin: '4px 0 0', fontSize: 11, color: '#888' }}>
            فئة مقترحة: {result.category}
          </p>
          <button
            onClick={confirmAndLearn}
            style={{
              marginTop: 10,
              background: '#6366f1',
              color: 'white',
              border: 'none',
              borderRadius: 6,
              padding: '5px 14px',
              cursor: 'pointer',
              fontSize: 12,
              fontFamily: 'inherit',
            }}
          >
            ✅ تأكيد وتعليم النظام (Auto-Learn)
          </button>
        </div>
      )}
    </div>
  );
}
