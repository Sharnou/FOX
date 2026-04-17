'use client';

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
  'refrigerator':      { category: 'General',     ar: 'ثلاجة',           desc: 'ثلاجة تعمل بكفاءة عالية، بحالة جيدة.' },
  'washing machine':   { category: 'General',     ar: 'غسالة',           desc: 'غسالة ملابس بحالة ممتازة.' },
  'microwave':         { category: 'General',     ar: 'ميكروويف',        desc: 'ميكروويف يعمل بشكل مثالي.' },
  'car':               { category: 'Vehicles',    ar: 'سيارة',           desc: 'سيارة بحالة جيدة، مجهزة بالكامل.' },
  'bicycle':           { category: 'Vehicles',    ar: 'دراجة هوائية',    desc: 'دراجة هوائية بحالة ممتازة.' },
  'motorcycle':        { category: 'Vehicles',    ar: 'دراجة نارية',     desc: 'دراجة نارية بحالة جيدة.' },
  'chair':             { category: 'General',     ar: 'كرسي',            desc: 'كرسي مريح بحالة ممتازة.' },
  'sofa':              { category: 'General',     ar: 'كنبة',            desc: 'كنبة أنيقة ومريحة بحالة ممتازة.' },
  'table':             { category: 'General',     ar: 'طاولة',           desc: 'طاولة متينة بحالة جيدة.' },
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

// ─── Main exported analysis function — call this from sell page ─────────────
export async function analyzeImageFile(file) {
  return new Promise(async (resolve) => {
    try {
      const tf = await import('@tensorflow/tfjs');
      const mobilenet = await import('@tensorflow-models/mobilenet');
      const Tesseract = await import('tesseract.js');

      // Create a hidden img element
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.style.display = 'none';
      document.body.appendChild(img);

      const url = URL.createObjectURL(file);
      img.src = url;
      await new Promise(r => { img.onload = r; img.onerror = r; });

      // MobileNet v2 max quality, top 10
      const model = await mobilenet.load({ version: 2, alpha: 1.0 });
      const predictions = await model.classify(img, 10);
      const top = predictions[0];
      const info = mapClassToInfo(top.className);

      // Tesseract LSTM_ONLY — most accurate
      let ocrText = '';
      try {
        const TesseractModule = Tesseract.default || Tesseract;
        const oem = TesseractModule.OEM || { LSTM_ONLY: 1 };
        const worker = await TesseractModule.createWorker('eng+ara', oem.LSTM_ONLY);
        const { data } = await worker.recognize(img);
        ocrText = data.text?.trim() || '';
        await worker.terminate();
      } catch {}

      document.body.removeChild(img);
      URL.revokeObjectURL(url);

      const learned = getLearnedSuggestions(info.category);
      const suggestedTitle = learned.titles[0] || info.ar + (ocrText ? ' - ' + ocrText.split('\n')[0].slice(0, 30) : ' - بحالة ممتازة');
      const suggestedDesc = learned.descriptions[0] || info.desc + (ocrText ? '\n\nنص مستخرج: ' + ocrText.slice(0, 300) : '');

      resolve({
        title: suggestedTitle,
        description: suggestedDesc,
        category: info.category,
        confidence: Math.round(top.probability * 100),
        rawClass: top.className,
        ocrText,
      });
    } catch (e) {
      console.warn('[ImageAnalyzer] failed:', e.message);
      resolve(null); // silent fail
    }
  });
}

export function saveLearningResult(category, title, description) {
  saveLearning(category, title, description);
}

// Default export renders nothing — component is invisible
export default function ImageAnalyzer() {
  return null;
}
