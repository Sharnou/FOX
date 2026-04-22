import { CATEGORIES } from '../config/categories.js';

const GROQ_KEY = process.env.GROQ_API_KEY;
const OPENAI_KEY = process.env.OPENAI_API_KEY;

// Build a concise taxonomy string for the AI prompt
const TAXONOMY_STR = CATEGORIES.map(c =>
  `- ${c.id} (${c.nameEn} / ${c.name}): [${c.subcategories.map(s => s.id).join(', ')}]`
).join('\n');

const SYSTEM_PROMPT = `You are an expert Arabic marketplace product classifier for XTOX (Egyptian & Arab marketplace, similar to OLX).
Given an ad's title and description, classify it into the most accurate category and subcategory.

Available taxonomy:
${TAXONOMY_STR}

Rules:
- Respond with ONLY valid JSON: {"category": "category_id", "subcategory": "subcategory_id"}
- Use the exact IDs from the taxonomy above (snake_case)
- Choose the MOST SPECIFIC subcategory that fits
- If truly ambiguous, use "general" / "other"
- Fishing rods/equipment → sports/fishing
- Phone cases → electronics/accessories_tech  
- Car seats → cars/car_accessories
- Kittens/puppies → pets/cats or pets/dogs`;

async function classifyWithGroq(title, description) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Title: ${title}\nDescription: ${description || ''}` }
      ],
      max_tokens: 80,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function classifyWithOpenAI(title, description) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: `Title: ${title}\nDescription: ${description || ''}` }
      ],
      max_tokens: 80,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

// Keyword-based fallback classifier (no API needed)
function classifyByKeywords(title, description) {
  const text = `${title} ${description || ''}`.toLowerCase();

  // ── Direct keyword rules (highest priority, checked before category loop) ──
  // Fishing
  if (/سنار|صنار|صيد|سمك|شبكة صيد|بكرة|طعم/.test(text)) return { category: 'رياضة', subcategory: 'صيد وأدواته', condition: 'مستعمل' };
  // Electronics - Mobile
  if (/موبايل|ايفون|iphone|سامسونج|samsung|هاتف|تليفون|شاومي|اوبو|ريلمي/.test(text)) return { category: 'إلكترونيات', subcategory: 'موبايلات', condition: null };
  // Electronics - Laptop
  if (/لابتوب|laptop|كمبيوتر|dell|hp|lenovo|asus|ماك/.test(text)) return { category: 'إلكترونيات', subcategory: 'لابتوب وكمبيوتر', condition: null };
  // Electronics - TV
  if (/تليفزيون|تلفزيون|شاشة|lcd|oled/.test(text)) return { category: 'إلكترونيات', subcategory: 'تلفزيونات وشاشات', condition: null };
  // Cars
  if (/سيارة|عربية|اتوبيس|موتوسيكل|موتو/.test(text)) return { category: 'سيارات', subcategory: 'ملاكي', condition: null };
  // Real estate
  if (/شقة|فيلا|ايجار|للبيع|عقار|ارض|دور/.test(text)) return { category: 'عقارات', subcategory: 'شقق للإيجار', condition: null };
  // Pets
  if (/كلب|قطة|طير|عصفور|ببغاء|حيوان/.test(text)) return { category: 'حيوانات أليفة', subcategory: 'كلاب', condition: null };
  // Clothes
  if (/فستان|جاكيت|بنطلون|ملابس|حذاء|احذية/.test(text)) return { category: 'أزياء وملابس', subcategory: 'ملابس نساء', condition: null };
  // Furniture
  if (/كنبة|اثاث|طاولة|كرسي|دولاب|سرير/.test(text)) return { category: 'أثاث ومستلزمات منزلية', subcategory: 'أثاث صالون', condition: null };
  // ─────────────────────────────────────────────────────────────────────────

  let bestMatch = null;
  let bestScore = 0;

  for (const cat of CATEGORIES) {
    if (cat.id === 'general') continue;
    const score = cat.keywords.filter(kw => text.includes(kw.toLowerCase())).length;
    if (score > bestScore) {
      bestScore = score;
      bestMatch = cat;
    }
  }

  if (!bestMatch || bestScore === 0) return { category: 'general', subcategory: 'other' };

  // Pick best subcategory by keyword match
  let bestSub = bestMatch.subcategories[0];
  let bestSubScore = 0;
  for (const sub of bestMatch.subcategories) {
    const subText = `${sub.name} ${sub.nameEn}`.toLowerCase();
    const subScore = subText.split(/\s+/).filter(w => text.includes(w) && w.length > 2).length;
    if (subScore > bestSubScore) { bestSubScore = subScore; bestSub = sub; }
  }

  return { category: bestMatch.id, subcategory: bestSub.id };
}

// Validate AI output against known taxonomy
function validateResult(result) {
  const cat = CATEGORIES.find(c => c.id === result.category);
  if (!cat) return false;
  const sub = cat.subcategories.find(s => s.id === result.subcategory);
  return !!sub;
}

/**
 * Main function — classify an ad's category and subcategory
 * Priority: Groq → OpenAI → keyword fallback
 */
async function autoCategorize(title, description = '') {
  // Try Groq first (fast, free tier)
  try {
    const result = await classifyWithGroq(title, description);
    if (result.category && result.subcategory && validateResult(result)) {
      return { ...result, provider: 'groq' };
    }
  } catch (err) {
    console.warn('[autoCategorize] Groq failed:', err.message);
  }

  // Fallback to OpenAI
  try {
    const result = await classifyWithOpenAI(title, description);
    if (result.category && result.subcategory && validateResult(result)) {
      return { ...result, provider: 'openai' };
    }
  } catch (err) {
    console.warn('[autoCategorize] OpenAI failed:', err.message);
  }

  // Final fallback: keyword matching
  const result = classifyByKeywords(title, description);
  return { ...result, provider: 'keywords' };
}

export { autoCategorize, classifyByKeywords };

// ─────────────────────────────────────────────────────────────────────────────
// classifyAdFull — enriched classification that also returns product condition
// Used by the AI Ad Enrichment System (jobs/adEnrichment.js)
// ─────────────────────────────────────────────────────────────────────────────

const FULL_SYSTEM_PROMPT = `أنت خبير تصنيف إعلانات عربية متخصص. حلل نص الإعلان وأعد JSON فقط بدون أي نص آخر:
{
  "category": "التصنيف الرئيسي",
  "subcategory": "التصنيف الفرعي الأدق",
  "condition": "جديد|مستعمل - ممتاز|مستعمل - جيد|مستعمل - مقبول|لا ينطبق",
  "confidence": 0.95,
  "reasoning": "سبب التصنيف"
}

التصنيفات المتاحة فقط:
إلكترونيات (موبايلات، لابتوب، تابلت، كاميرات، سماعات، شاشات، ألعاب فيديو، أجهزة منزلية)
سيارات (سيارات ملاكي، دراجات نارية، قطع غيار، إكسسوارات سيارات)
عقارات (شقق للإيجار، شقق للبيع، فيلل، أراضي، مكاتب)
ملابس (ملابس رجالي، ملابس حريمي، ملابس أطفال، أحذية، اكسسوارات)
أثاث (غرف نوم، أنتريهات، مطابخ، مكاتب وكراسي، ديكور)
خدمات (صيانة، تعليم وتدريس، تصميم، سباكة وكهرباء، نقل وشحن)
وظائف (تقنية ومعلومات، مبيعات وتسويق، طب وصحة، تعليم، هندسة)
حيوانات (كلاب، قطط، طيور، أسماك، مستلزمات حيوانات)
رياضة (معدات رياضية، ملابس رياضية، دراجات، كرة قدم، صيد وأدواته، سنارة صيد)
كتب وتعليم (كتب مدرسية، روايات، كورسات، أدوات مكتبية)
ألعاب أطفال (ألعاب تعليمية، دمى، سكوتر ودراجات أطفال)
صحة وجمال (عطور، مستحضرات تجميل، أجهزة طبية، مكملات غذائية)
طعام ومشروبات (طعام منزلي، مواد غذائية، حلويات)
أخرى (أدوات منزلية، مقتنيات ونادر، هدايا)

قاعدة مهمة: condition = "لا ينطبق" للعقارات، الخدمات، الوظائف فقط.

أمثلة:
- سناره / صنارة / سنارة صيد / سمك → رياضة / صيد وأدواته
- عود / جيتار / ناي → هوايات / آلات موسيقية
- كتاب / رواية / مذكرات → هوايات / كتب ومجلات
- طيور / عصافير / بغبغان → حيوانات / طيور
- عفش / أثاث / كنبة → أثاث / أثاث صالون`;

async function classifyFullWithGroq(text) {
  const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${GROQ_KEY}` },
    body: JSON.stringify({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: FULL_SYSTEM_PROMPT },
        { role: 'user', content: `صنف هذا الإعلان:\n${text.slice(0, 800)}` }
      ],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) throw new Error(`Groq error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

async function classifyFullWithOpenAI(text) {
  const res = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${OPENAI_KEY}` },
    body: JSON.stringify({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: FULL_SYSTEM_PROMPT },
        { role: 'user', content: `صنف هذا الإعلان:\n${text.slice(0, 800)}` }
      ],
      max_tokens: 200,
      temperature: 0.1,
      response_format: { type: 'json_object' }
    })
  });
  if (!res.ok) throw new Error(`OpenAI error: ${res.status}`);
  const data = await res.json();
  return JSON.parse(data.choices[0].message.content);
}

/**
 * Full ad classification — returns category, subcategory, condition, confidence, provider.
 * Priority: Groq → OpenAI → keyword fallback (no condition from keywords)
 * @param {string} text - Combined ad text (title + description + price + city)
 * @returns {Promise<{category, subcategory, condition, confidence, reasoning, provider}>}
 */
export async function classifyAdFull(text) {
  // Try Groq first (fast, free tier)
  try {
    if (GROQ_KEY) {
      const result = await classifyFullWithGroq(text);
      if (result.category && result.subcategory) {
        return {
          category: result.category,
          subcategory: result.subcategory,
          condition: result.condition || '',
          confidence: result.confidence || 0.8,
          reasoning: result.reasoning || '',
          provider: 'groq',
        };
      }
    }
  } catch (err) {
    console.warn('[classifyAdFull] Groq failed:', err.message);
  }

  // Fallback to OpenAI
  try {
    if (OPENAI_KEY) {
      const result = await classifyFullWithOpenAI(text);
      if (result.category && result.subcategory) {
        return {
          category: result.category,
          subcategory: result.subcategory,
          condition: result.condition || '',
          confidence: result.confidence || 0.8,
          reasoning: result.reasoning || '',
          provider: 'openai',
        };
      }
    }
  } catch (err) {
    console.warn('[classifyAdFull] OpenAI failed:', err.message);
  }

  // Final fallback: keyword matching (no condition info)
  const basic = classifyByKeywords(text, '');
  return {
    category: basic.category,
    subcategory: basic.subcategory,
    condition: '',
    confidence: 0.4,
    reasoning: 'keyword fallback',
    provider: 'keywords',
  };
}
