export const dynamic = 'force-dynamic';

const ROBOTS_CONTENT = `User-agent: *
Allow: /
Allow: /ads
Allow: /ads/
Allow: /leaderboard
Allow: /honor-roll
Allow: /login
Allow: /register

# Block private/auth routes
Disallow: /admin
Disallow: /admin/
Disallow: /profile
Disallow: /chat
Disallow: /api/
Disallow: /_next/
Disallow: /call-test.html
Disallow: /offline.html

# Block query params that create duplicate content
Disallow: /*?autoAnswer=*
Disallow: /*?call=*

# Google bot specific — allow all public content
User-agent: Googlebot
Allow: /
Disallow: /admin
Disallow: /chat
Disallow: /profile
Disallow: /api/

# Bing
User-agent: Bingbot
Allow: /
Disallow: /admin
Disallow: /chat
Disallow: /profile
Disallow: /api/

# Block bad bots
User-agent: AhrefsBot
Crawl-delay: 10

User-agent: SemrushBot
Crawl-delay: 10

User-agent: MJ12bot
Disallow: /

# Sitemap
Sitemap: https://fox-kohl-eight.vercel.app/sitemap.xml`;

export async function GET() {
  return new Response(ROBOTS_CONTENT, {
    headers: {
      'Content-Type': 'text/plain; charset=utf-8',
      'Cache-Control': 'public, max-age=86400',
    },
  });
}
