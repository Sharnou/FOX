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
