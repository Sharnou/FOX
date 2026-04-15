export default async function sitemap() {
  const baseUrl = 'https://fox-kohl-eight.vercel.app';
  // Static pages
  const staticPages = ['', '/install', '/profile'].map(path => ({
    url: `${baseUrl}${path}`,
    lastModified: new Date(),
    changeFrequency: 'daily',
    priority: path === '' ? 1 : 0.8,
    alternates: { languages: { ar: `${baseUrl}${path}` } }
  }));
  // Dynamic ads (fetch latest 1000)
  let adPages = [];
  try {
    const r = await fetch(`https://xtox-production.up.railway.app/api/ads?limit=1000&sort=createdAt`);
    const d = await r.json();
    adPages = (d.ads || d || []).slice(0, 1000).map(ad => ({
      url: `${baseUrl}/ads/${ad._id}`,
      lastModified: new Date(ad.updatedAt || ad.createdAt || Date.now()),
      changeFrequency: 'weekly',
      priority: 0.7,
    }));
  } catch {}
  return [...staticPages, ...adPages];
}
