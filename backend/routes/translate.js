import express from 'express';

const router = express.Router();

// POST /api/translate
// Body: { text: string, targetLang?: string, context?: string }
// Returns: { translated: string, provider: string }
router.post('/', async (req, res) => {
  try {
    const { text, targetLang = 'en', context = '' } = req.body;

    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'No text provided' });
    }
    if (text.length > 3000) {
      return res.status(400).json({ error: 'Text too long (max 3000 chars)' });
    }

    const OPENAI_KEY = process.env.OPENAI_API_KEY || process.env.OPENAI_ANALYSIS_KEY;
    const GROQ_KEY = process.env.GROQ_API_KEY;

    const systemPrompt = `You are a translation assistant. Translate the following text to ${targetLang}. Return ONLY the translated text, no explanations, no quotes, no extra commentary.`;

    // ── Try Groq first (fast, free tier) ────────────────────────────────
    if (GROQ_KEY) {
      try {
        const groqRes = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${GROQ_KEY}`,
          },
          body: JSON.stringify({
            model: 'llama-3.3-70b-versatile',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: text },
            ],
            max_tokens: 1000,
            temperature: 0.3,
          }),
        });
        if (groqRes.ok) {
          const data = await groqRes.json();
          const translated = data.choices?.[0]?.message?.content?.trim();
          if (translated) {
            return res.json({ translated, provider: 'groq' });
          }
        } else {
          console.warn('[translate] Groq non-OK:', groqRes.status);
        }
      } catch (groqErr) {
        console.warn('[translate] Groq error:', groqErr.message);
      }
    }

    // ── Fallback to OpenAI ───────────────────────────────────────────────
    if (OPENAI_KEY) {
      try {
        const oaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_KEY}`,
          },
          body: JSON.stringify({
            model: 'gpt-4o-mini',
            messages: [
              { role: 'system', content: `Translate to ${targetLang}. Return ONLY the translation.` },
              { role: 'user', content: text },
            ],
            max_tokens: 1000,
          }),
        });
        if (oaiRes.ok) {
          const data = await oaiRes.json();
          const translated = data.choices?.[0]?.message?.content?.trim();
          if (translated) {
            return res.json({ translated, provider: 'openai' });
          }
        } else {
          console.warn('[translate] OpenAI non-OK:', oaiRes.status);
        }
      } catch (oaiErr) {
        console.warn('[translate] OpenAI error:', oaiErr.message);
      }
    }

    // ── Final fallback: LibreTranslate (free, no key) ────────────────────
    try {
      const libreRes = await fetch('https://libretranslate.com/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          q: text,
          source: 'auto',
          target: targetLang.slice(0, 2),
          format: 'text',
        }),
      });
      if (libreRes.ok) {
        const data = await libreRes.json();
        if (data.translatedText) {
          return res.json({ translated: data.translatedText, provider: 'libre' });
        }
      } else {
        console.warn('[translate] LibreTranslate non-OK:', libreRes.status);
      }
    } catch (libreErr) {
      console.warn('[translate] LibreTranslate error:', libreErr.message);
    }

    return res.status(503).json({ error: 'خدمة الترجمة غير متاحة حالياً. حاول مرة أخرى.' });
  } catch (err) {
    console.error('[translate] Unexpected error:', err);
    return res.status(500).json({ error: 'فشلت الترجمة. حاول مرة أخرى.' });
  }
});

export default router;
