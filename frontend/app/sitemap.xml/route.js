export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

const BASE_URL = 'https://fox-kohl-eight.vercel.app';
const BACKEND_URL = 'https://xtox-production.up.railway.app';

const LANGS = ['ar', 'en', 'fr', 'ru', 'de', 'es', 'tr', 'zh'];

// Static pages that support hreflang (public/indexable — skip auth-gated /profile and /chat)
const STATIC_PAGES = [
  { path: '/',            changefreq: 'weekly',  priority: '1.0' },
  { path: '/ads',         changefreq: 'daily',   priority: '0.9' },
  { path: '/leaderboard', changefreq: 'weekly',  priority: '0.8' },
  { path: '/honor-roll',  changefreq: 'weekly',  priority: '0.8' },
  { path: '/login',       changefreq: 'monthly', priority: '0.5' },
  { path: '/register',    changefreq: 'monthly', priority: '0.5' },
];

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function hreflangLinks(pagePath) {
  const hrefBase = pagePath === '/' ? BASE_URL + '/' : BASE_URL + pagePath;
  const lines = LANGS.map(
    lang => `    <xhtml:link rel="alternate" hreflang="${lang}" href="${escapeXml(hrefBase + '?lang=' + lang)}"/>`
  );
  lines.push(`    <xhtml:link rel="alternate" hreflang="x-default" href="${escapeXml(hrefBase)}"/>`);
  return lines.join('\n');
}

function staticUrlEntry(page, lastmod) {
  const loc = page.path === '/' ? BASE_URL + '/' : BASE_URL + page.path;
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${page.changefreq}</changefreq>
    <priority>${page.priority}</priority>
${hreflangLinks(page.path)}
  </url>`;
}

function adUrlEntry(ad, lastmod, now) {
  const loc = `${BASE_URL}/ads/${ad._id}`;
  const adLastmod = ad.updatedAt
    ? new Date(ad.updatedAt).toISOString().split('T')[0]
    : now;

  // Include image:image entry if ad has a valid http/https image (not base64)
  let imageBlock = '';
  const images = ad.images || ad.media || [];
  const firstImage = images.find(img => typeof img === 'string' && img.startsWith('http'));
  if (firstImage) {
    imageBlock = `
    <image:image>
      <image:loc>${escapeXml(firstImage)}</image:loc>
      <image:title>${escapeXml(ad.title || '')}</image:title>
    </image:image>`;
  }

  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${adLastmod}</lastmod>
    <changefreq>weekly</changefreq>
    <priority>0.8</priority>${imageBlock}
  </url>`;
}

export async function GET() {
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const staticUrls = STATIC_PAGES.map(page => staticUrlEntry(page, now));

  // Fetch dynamic ad pages (max 500)
  let adUrls = [];
  try {
    const res = await fetch(`${BACKEND_URL}/api/ads?limit=500&status=active`, {
      next: { revalidate: 3600 },
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const ads = Array.isArray(data) ? data : (data.ads || data.data || []);
      adUrls = ads
        .filter(ad => ad._id)
        .slice(0, 494) // keep total under 500 (6 static + up to 494 dynamic)
        .map(ad => adUrlEntry(ad, now));
    }
  } catch {
    // Fallback to static-only if API unreachable
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset
  xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
  xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
  xmlns:xhtml="http://www.w3.org/1999/xhtml"
>
${[...staticUrls, ...adUrls].join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
