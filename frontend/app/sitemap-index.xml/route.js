export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE = 'https://fox-kohl-eight.vercel.app';

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// Supported country-specific sitemaps — all 8 language zones
const COUNTRY_SITEMAPS = [
  // Arabic (ar)
  { code: 'EG', lang: 'ar', label: 'Egypt' },
  { code: 'SA', lang: 'ar', label: 'Saudi Arabia' },
  { code: 'AE', lang: 'ar', label: 'UAE' },
  { code: 'KW', lang: 'ar', label: 'Kuwait' },
  { code: 'QA', lang: 'ar', label: 'Qatar' },
  { code: 'JO', lang: 'ar', label: 'Jordan' },
  { code: 'MA', lang: 'ar', label: 'Morocco' },
  { code: 'DZ', lang: 'ar', label: 'Algeria' },
  { code: 'TN', lang: 'ar', label: 'Tunisia' },
  { code: 'IQ', lang: 'ar', label: 'Iraq' },
  // English (en)
  { code: 'US', lang: 'en', label: 'United States' },
  { code: 'GB', lang: 'en', label: 'United Kingdom' },
  // French (fr)
  { code: 'FR', lang: 'fr', label: 'France' },
  // Russian (ru)
  { code: 'RU', lang: 'ru', label: 'Russia' },
  // German (de)
  { code: 'DE', lang: 'de', label: 'Germany' },
  // Spanish (es)
  { code: 'ES', lang: 'es', label: 'Spain' },
  // Turkish (tr)
  { code: 'TR', lang: 'tr', label: 'Turkey' },
  // Chinese (zh)
  { code: 'CN', lang: 'zh', label: 'China' },
];

export async function GET() {
  const today = new Date().toISOString();

  // Main sitemap always listed first
  const sitemaps = [
    `  <sitemap>\n    <loc>${esc(`${BASE}/sitemap.xml`)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`,
    ...COUNTRY_SITEMAPS.map(c =>
      `  <sitemap>\n    <loc>${esc(`${BASE}/sitemap.xml?country=${c.code}`)}</loc>\n    <lastmod>${today}</lastmod>\n  </sitemap>`
    ),
  ];

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
    sitemaps.join('\n'),
    '</sitemapindex>',
  ].join('\n');

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
