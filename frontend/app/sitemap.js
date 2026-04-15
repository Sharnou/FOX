export const dynamic = 'force-dynamic';  // Don't cache, regenerate on each request
export const revalidate = 3600;          // Regenerate every hour

export default async function sitemap() {
  const baseUrl = 'https://fox-kohl-eight.vercel.app';

  const staticPages = [
    { url: baseUrl, lastModified: new Date(), changeFrequency: 'hourly', priority: 1.0 },
    { url: `${baseUrl}/install`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${baseUrl}/winner-history`, lastModified: new Date(), changeFrequency: 'monthly', priority: 0.6 },
  ];

  let adPages = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    const r = await fetch(
      'https://xtox-production.up.railway.app/api/ads?limit=1000&sort=-createdAt',
      { signal: controller.signal, next: { revalidate: 3600 } }
    );
    clearTimeout(timeout);
    if (r.ok) {
      const data = await r.json();
      const ads = Array.isArray(data) ? data : (data.ads || []);
      adPages = ads.slice(0, 1000).map(ad => ({
        url: `${baseUrl}/ads/${ad._id}`,
        lastModified: new Date(ad.updatedAt || ad.createdAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.7,
      }));
    }
  } catch (e) {
    // Never fail the build — just return static pages if API is down
    console.warn('[sitemap] API unreachable, returning static only:', e.message);
  }

  return [...staticPages, ...adPages];
}
