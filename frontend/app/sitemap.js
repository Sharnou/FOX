export const dynamic = 'force-dynamic';  // Always regenerate — never serve stale sitemap
export const revalidate = 3600;          // Regenerate every hour on the edge

export default async function sitemap() {
  const baseUrl = 'https://fox-kohl-eight.vercel.app';

  // Static routes with correct priority and changeFrequency
  // Excluded: /admin (noindex), /offline.html, /call-test.html
  const staticPages = [
    {
      url: `${baseUrl}/`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/ads`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/login`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/register`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.5,
    },
    {
      url: `${baseUrl}/profile`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/chat`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/leaderboard`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/honor-roll`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // Dynamic ad pages — fetch active ads from API
  let adPages = [];
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000); // 5s timeout
    const r = await fetch(
      'https://xtox-production.up.railway.app/api/ads?limit=500&status=active',
      { signal: controller.signal, next: { revalidate: 3600 } }
    );
    clearTimeout(timeout);
    if (r.ok) {
      const data = await r.json();
      const ads = Array.isArray(data) ? data : (data.ads || []);
      adPages = ads.slice(0, 500).map(ad => ({
        url: `${baseUrl}/ads/${ad._id}`,
        lastModified: new Date(ad.updatedAt || ad.createdAt || Date.now()),
        changeFrequency: 'weekly',
        priority: 0.8,
      }));
    }
  } catch (e) {
    // Never fail the sitemap build — return static pages if API is down
    console.warn('[sitemap] API unreachable, returning static only:', e.message);
  }

  return [...staticPages, ...adPages];
}
