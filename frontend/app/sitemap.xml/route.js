import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

const BASE_URL = 'https://fox-kohl-eight.vercel.app';
const API_URL = 'https://xtox-production.up.railway.app';

const STATIC_ROUTES = [
  { url: '/', priority: '1.0', changefreq: 'daily' },
  { url: '/ads', priority: '0.9', changefreq: 'hourly' },
  { url: '/login', priority: '0.5', changefreq: 'monthly' },
  { url: '/register', priority: '0.5', changefreq: 'monthly' },
  { url: '/sell', priority: '0.8', changefreq: 'weekly' },
  { url: '/profile', priority: '0.6', changefreq: 'weekly' },
  { url: '/chat', priority: '0.6', changefreq: 'daily' },
  { url: '/winner-history', priority: '0.5', changefreq: 'monthly' },
];

export async function GET() {
  let adUrls = [];
  try {
    const res = await fetch(`${API_URL}/api/ads?limit=500&status=active`, {
      signal: AbortSignal.timeout(5000),
    });
    if (res.ok) {
      const data = await res.json();
      const ads = data.ads || data.data || data || [];
      adUrls = ads.map(ad => ({
        url: `/ads/${ad._id}`,
        priority: '0.8',
        changefreq: 'weekly',
        image: ad.images?.[0] || null,
        title: ad.title || '',
      }));
    }
  } catch (e) {
    // fallback to static only
  }

  const allUrls = [...STATIC_ROUTES, ...adUrls];
  const lastmod = new Date().toISOString().split('T')[0];

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:image="http://www.google.com/schemas/sitemap-image/1.1"
        xmlns:xhtml="http://www.w3.org/1999/xhtml">
${allUrls.map(u => `  <url>
    <loc>${BASE_URL}${u.url}</loc>
    <lastmod>${lastmod}</lastmod>
    <changefreq>${u.changefreq || 'weekly'}</changefreq>
    <priority>${u.priority || '0.7'}</priority>${u.image ? `
    <image:image>
      <image:loc>${u.image}</image:loc>
      <image:title>${(u.title || '').replace(/[<>&"]/g, c => ({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;'}[c]))}</image:title>
    </image:image>` : ''}
  </url>`).join('\n')}
</urlset>`;

  return new NextResponse(xml, {
    status: 200,
    headers: {
      'Content-Type': 'application/xml; charset=utf-8',
      'Cache-Control': 'public, max-age=3600, s-maxage=3600',
      'X-Robots-Tag': 'noindex',
    },
  });
}
