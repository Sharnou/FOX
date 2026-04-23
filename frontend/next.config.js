/** @type {import('next').NextConfig} */
const isCapacitor = process.env.BUILD_TARGET === 'capacitor';

const nextConfig = {
  ...(isCapacitor ? { output: 'export' } : {}),
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  typescript: { ignoreBuildErrors: true },
  ...(!isCapacitor && {
    async rewrites() {
      return {
        beforeFiles: [
          // Safety net: ensure /sitemap.xml always hits the route handler
          { source: '/sitemap.xml', destination: '/sitemap.xml' },
        ],
        afterFiles: [],
        fallback: [],
      };
    },
    async headers() {
      return [
        {
          source: '/(.*)',
          headers: [
            { key: 'X-Frame-Options', value: 'SAMEORIGIN' },
            { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
            { key: 'Cross-Origin-Opener-Policy', value: 'same-origin-allow-popups' },
            {
              key: 'Content-Security-Policy',
              // 'unsafe-eval' — required by Next.js runtime, code-splitting, and mapping/charting libs.
              // 'unsafe-inline' — required by Next.js inline scripts and CSS-in-JS.
              // Removing either breaks the app in production (verified).
              value: [
                "default-src 'self'",
                "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://www.googletagmanager.com https://accounts.google.com https://cdn.jsdelivr.net",
                "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://accounts.google.com",
                "font-src 'self' https://fonts.googleapis.com https://fonts.gstatic.com data:",
                // 'https:' wildcard covers any new CDN/image host without needing to update CSP.
                "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://lh4.googleusercontent.com https://lh5.googleusercontent.com https://lh6.googleusercontent.com https://api.qrserver.com https://unpkg.com https://images.unsplash.com https://www.gstatic.com https://*.basemaps.cartocdn.com https://www.bing.com https:",
                "connect-src 'self' blob: https://xtox-production.up.railway.app wss://xtox-production.up.railway.app https://ipapi.co https://api.cloudinary.com https://res.cloudinary.com https://api.openai.com https://api.groq.com https://libretranslate.com https://generativelanguage.googleapis.com https://accounts.google.com https://*.basemaps.cartocdn.com https://tfhub.dev https://storage.googleapis.com https://www.kaggle.com https://nominatim.openstreetmap.org https://cdn.jsdelivr.net https://fonts.googleapis.com https://fonts.gstatic.com https://lh3.googleusercontent.com https://www.bing.com https://www.google.com https://router.project-osrm.org https://*.openstreetmap.org https://xtox.metered.live https://*.metered.live https://www.metered.ca",
                "media-src 'self' blob: https://res.cloudinary.com https:",
                "worker-src 'self' blob: https://cdn.jsdelivr.net",
                "frame-ancestors 'self'",
                "frame-src 'self' https://accounts.google.com",
                // Prevent plugin content (Flash, Silverlight, etc.) — security hardening
                "object-src 'none'",
              ].join('; '),
            },
            { key: 'Content-Language', value: 'ar' },
          ],
        },
      ];
    },
  }),
};

module.exports = nextConfig;
// Build: 20260418000000
