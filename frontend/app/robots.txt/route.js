const BACKEND_URL = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const res = await fetch(`${BACKEND_URL}/api/robots`, { cache: 'no-store' });
    if (!res.ok) {
      // Fallback default robots.txt
      return new Response(
        'User-agent: *\nAllow: /\nSitemap: https://fox-kohl-eight.vercel.app/sitemap.xml\n',
        {
          status: 200,
          headers: { 'Content-Type': 'text/plain; charset=utf-8' },
        }
      );
    }
    const txt = await res.text();
    return new Response(txt, {
      status: 200,
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'public, max-age=3600',
      },
    });
  } catch (e) {
    return new Response('User-agent: *\nAllow: /\n', { status: 200, headers: { 'Content-Type': 'text/plain' } });
  }
}
