import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// All English source keys from translations
async function getEnglishTranslations() {
  const mod = await import('../../../translations/index');
  const trans = mod.translations || mod.default;
  return trans['en'] || {};
}

export async function GET(request) {
  const { searchParams } = new URL(request.url);
  const lang = searchParams.get('lang');

  if (!lang || lang === 'en') {
    return NextResponse.json({ error: 'Invalid lang' }, { status: 400 });
  }

  try {
    const enTrans = await getEnglishTranslations();
    const keys = Object.keys(enTrans);
    const values = Object.values(enTrans);

    // Translate in batches of 50 to avoid token limits
    const BATCH_SIZE = 50;
    const resultTranslations = {};

    for (let i = 0; i < keys.length; i += BATCH_SIZE) {
      const batchKeys = keys.slice(i, i + BATCH_SIZE);
      const batchValues = values.slice(i, i + BATCH_SIZE);

      const payload = batchKeys.map((k, j) => `${k}: ${batchValues[j]}`).join('\n');

      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [
            {
              role: 'system',
              content: `You are a professional translator. Translate UI strings from English to language code "${lang}".
                       Return ONLY valid JSON object mapping the exact same keys to translated values.
                       Keep technical terms, brand names (XTOX), and placeholders ({{name}}, {count}) unchanged.
                       Short UI strings only — keep them concise.`,
            },
            {
              role: 'user',
              content: `Translate these key: value pairs to language "${lang}". Return JSON only:\n\n${payload}`,
            },
          ],
          temperature: 0.1,
          max_tokens: 4000,
        }),
      });

      if (res.ok) {
        const data = await res.json();
        const content = data.choices?.[0]?.message?.content || '{}';
        try {
          const parsed = JSON.parse(content.replace(/```json\n?|\n?```/g, '').trim());
          Object.assign(resultTranslations, parsed);
        } catch {}
      }

      // Rate limit: 100ms between batches
      if (i + BATCH_SIZE < keys.length) {
        await new Promise(r => setTimeout(r, 100));
      }
    }

    return NextResponse.json({ lang, translations: resultTranslations });
  } catch (error) {
    return NextResponse.json({ error: 'Translation failed', detail: error.message }, { status: 500 });
  }
}
