export const dynamic = 'force-dynamic';

const BASE = 'https://fox-kohl-eight.vercel.app';
const API  = 'https://xtox-production.up.railway.app';
const LANGS = ['ar','en','fr','ru','de','es','tr','zh'];

function esc(s) {
  return String(s ?? '')
    .replace(/&/g,'&amp;').replace(/</g,'&lt;')
    .replace(/>/g,'&gt;').replace(/"/g,'&quot;');
}

function staticEntry(path, freq, pri, hreflang = false) {
  const loc = `${BASE}${path}`;
  const today = new Date().toISOString().slice(0,10);
  const alts = hreflang
    ? LANGS.map(l => `    <xhtml:link rel="alternate" hreflang="${l}" href="${esc(loc)}?lang=${l}"/>`).join('\n') +
      `\n    <xhtml:link rel="alternate" hreflang="x-default" href="${esc(loc)}"/>`
    : '';
  return `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${freq}</changefreq>
    <priority>${pri}</priority>${alts ? '\n' + alts : ''}
  </url>`;
}

function adEntry(ad) {
  const loc = `${BASE}/ads/${ad._id}`;
  const lastmod = ad.updatedAt
    ? new Date(ad.updatedAt).toISOString().slice(0,10)
    : new Date().toISOString().slice(0,10);
  const img = Array.isArray(ad.images) && ad.images[0]
    && typeof ad.images[0] === 'string'
    && ad.images[0].startsWith('http')
    ? `\n    <image:image>\n      <image:loc>${esc(ad.images[0])}</image:loc>\n      <image:title>${esc(ad.title)}</image:title>\n    </image:image>`
    : '';
  return `  <url>
    <loc>${esc(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${img}
  </url>`;
}

export async function GET() {
  const statics = [
    staticEntry('/',            'weekly',  '1.0', true),
    staticEntry('/ads',         'daily',   '0.9', true),
    staticEntry('/leaderboard', 'weekly',  '0.8', true),
    staticEntry('/honor-roll',  'weekly',  '0.8', true),
    staticEntry('/login',       'monthly', '0.5', true),
    staticEntry('/register',    'monthly', '0.5', true),
  ];

  let dynamics = [];
  try {
    const r = await fetch(`${API}/api/ads?limit=500&status=active`, {
      signal: AbortSignal.timeout(5000),
      headers: { 'Accept': 'application/json' },
    });
    if (r.ok) {
      const data = await r.json();
      const ads = Array.isArray(data) ? data : (data.ads ?? data.data ?? []);
      dynamics = ads.filter(a => a?._id).slice(0, 494).map(adEntry);
    }
  } catch { /* fallback to static only */ }

  const body = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xhtml="http://www.w3.org/1999/xhtml">
${[...statics, ...dynamics].join('\n')}
</urlset>`;

  return new Response(body, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
      'X-Robots-Tag': 'noindex',
    },
  });
}
