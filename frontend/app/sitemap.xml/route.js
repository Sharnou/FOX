export const dynamic = 'force-dynamic';
export const revalidate = 3600; // 1 hour

const BASE_URL = 'https://fox-kohl-eight.vercel.app';
const BACKEND_URL = 'https://xtox-production.up.railway.app';

function escapeXml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

function urlEntry(loc, lastmod, changefreq, priority) {
  return `  <url>
    <loc>${escapeXml(loc)}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${changefreq}</changefreq>
    <priority>${priority}</priority>
  </url>`;
}

export async function GET() {
  const now = new Date().toISOString().split('T')[0]; // YYYY-MM-DD

  const staticUrls = [
    urlEntry(`${BASE_URL}/`, now, 'weekly', '1.0'),
    urlEntry(`${BASE_URL}/ads`, now, 'daily', '0.9'),
    urlEntry(`${BASE_URL}/leaderboard`, now, 'weekly', '0.8'),
    urlEntry(`${BASE_URL}/honor-roll`, now, 'weekly', '0.8'),
    urlEntry(`${BASE_URL}/profile`, now, 'weekly', '0.7'),
    urlEntry(`${BASE_URL}/chat`, now, 'weekly', '0.7'),
    urlEntry(`${BASE_URL}/login`, now, 'monthly', '0.5'),
    urlEntry(`${BASE_URL}/register`, now, 'monthly', '0.5'),
  ];

  // Fetch dynamic ad pages
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
        .map(ad => {
          const lastmod = ad.updatedAt
            ? new Date(ad.updatedAt).toISOString().split('T')[0]
            : now;
          return urlEntry(`${BASE_URL}/ads/${ad._id}`, lastmod, 'weekly', '0.8');
        });
    }
  } catch {
    // Fallback to static-only if API unreachable
  }

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${[...staticUrls, ...adUrls].join('\n')}
</urlset>`;

  return new Response(xml, {
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
    },
  });
}
