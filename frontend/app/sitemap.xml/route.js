export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const BASE = 'https://fox-kohl-eight.vercel.app';
const API  = 'https://xtox-production.up.railway.app';
const LANGS = ['ar','en','fr','ru','de','es','tr','zh'];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function hreflang(path) {
  const loc = `${BASE}${path}`;
  return LANGS.map(l =>
    `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(loc)}?lang=${l}"/>`
  ).join('\n') + `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(loc)}"/>`;
}

function entry({ path, freq, pri, withHreflang = false, image = null, lastmod = null }) {
  const loc = esc(`${BASE}${path}`);
  const date = lastmod || new Date().toISOString().slice(0, 10);
  const imgBlock = image
    ? `\n    <image:image>\n      <image:loc>${esc(image.url)}</image:loc>\n      <image:title>${esc(image.title)}</image:title>\n    </image:image>`
    : '';
  const altBlock = withHreflang ? '\n' + hreflang(path) : '';
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${date}</lastmod>`,
    `    <changefreq>${freq}</changefreq>`,
    `    <priority>${pri}</priority>`,
    imgBlock,
    altBlock,
    '  </url>',
  ].filter(Boolean).join('\n');
}

// Country → language map for geo-targeted hreflang
const COUNTRY_LANG_MAP = {
  'EG': 'ar', 'SA': 'ar', 'AE': 'ar', 'JO': 'ar', 'LB': 'ar', 'KW': 'ar',
  'QA': 'ar', 'BH': 'ar', 'OM': 'ar', 'MA': 'ar', 'DZ': 'ar', 'TN': 'ar',
  'IQ': 'ar', 'LY': 'ar', 'SY': 'ar', 'YE': 'ar', 'SD': 'ar', 'PS': 'ar',
  'FR': 'fr', 'DE': 'de', 'TR': 'tr', 'RU': 'ru', 'CN': 'zh', 'ES': 'es',
  'US': 'en', 'GB': 'en', 'CA': 'en', 'AU': 'en',
};

// Build hreflang links for an ad based on its country
function adHreflang(path, countryCode) {
  const lang = COUNTRY_LANG_MAP[countryCode] || 'ar';
  const loc = `${BASE}${path}`;
  return [
    `    <xhtml:link rel="alternate" hreflang="${lang}-${countryCode}" href="${esc(loc)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="${lang}" href="${esc(loc)}"/>`,
    `    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(loc)}"/>`,
  ].join('\n');
}

// entry variant that adds geo hreflang based on ad country
function entryWithGeoHreflang({ path, freq, pri, lastmod = null, image = null, countryCode = 'EG' }) {
  const loc = esc(`${BASE}${path}`);
  const date = lastmod || new Date().toISOString().slice(0, 10);
  const imgBlock = image
    ? `\n    <image:image>\n      <image:loc>${esc(image.url)}</image:loc>\n      <image:title>${esc(image.title)}</image:title>\n    </image:image>`
    : '';
  const altBlock = '\n' + adHreflang(path, countryCode);
  return [
    '  <url>',
    `    <loc>${loc}</loc>`,
    `    <lastmod>${date}</lastmod>`,
    `    <changefreq>${freq}</changefreq>`,
    `    <priority>${pri}</priority>`,
    imgBlock,
    altBlock,
    '  </url>',
  ].filter(Boolean).join('\n');
}


export async function GET() {
  const today = new Date().toISOString().slice(0, 10);

  const statics = [
    entry({ path: '/',            freq: 'weekly',  pri: '1.0', withHreflang: true }),
    entry({ path: '/ads',         freq: 'daily',   pri: '0.9', withHreflang: true }),
    entry({ path: '/leaderboard', freq: 'weekly',  pri: '0.8', withHreflang: true }),
    entry({ path: '/honor-roll',  freq: 'weekly',  pri: '0.8', withHreflang: true }),
    entry({ path: '/login',       freq: 'monthly', pri: '0.5', withHreflang: true }),
    entry({ path: '/register',    freq: 'monthly', pri: '0.5', withHreflang: true }),
  ];

  let dynamics = [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 5000);
    const r = await fetch(`${API}/api/ads?limit=500&status=active`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    });
    clearTimeout(timer);
    if (r.ok) {
      const data = await r.json();
      const ads = Array.isArray(data) ? data : (data.ads ?? data.data ?? []);
      dynamics = ads
        .filter(a => a?._id)
        .slice(0, 493)
        .map(a => {
          const imgUrl = Array.isArray(a.images) && typeof a.images[0] === 'string' && a.images[0].startsWith('http')
            ? a.images[0] : null;
          return entryWithGeoHreflang({
            path: `/ads/${a._id}`,
            freq: 'weekly',
            pri: '0.8',
            lastmod: a.updatedAt ? new Date(a.updatedAt).toISOString().slice(0, 10) : today,
            image: imgUrl ? { url: imgUrl, title: a.title || '' } : null,
            countryCode: a.country || 'EG',
          });
        });
    }
  } catch { /* fallback to static only */ }

  const xml = [
    '<?xml version="1.0" encoding="UTF-8"?>',
    '<urlset',
    '  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"',
    '  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"',
    '  xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    [...statics, ...dynamics].join('\n'),
    '</urlset>',
  ].join('\n');

  return new Response(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
    },
  });
}
