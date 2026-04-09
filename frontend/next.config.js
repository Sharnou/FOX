/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
    remotePatterns: [
      { protocol: 'https', hostname: '**' },
      { protocol: 'http', hostname: '**' },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
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
            // 'unsafe-eval' is required by Next.js (code splitting / hot reload)
            // and by several mapping/charting libraries used in this app.
            // 'unsafe-inline' is needed for Next.js inline scripts and style-in-JS.
            value: [
              "default-src 'self'",
              // Fix 1: Added https://cdn.jsdelivr.net for Tesseract.js
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://www.googletagmanager.com https://accounts.google.com https://cdn.jsdelivr.net",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://api.qrserver.com https://unpkg.com https://images.unsplash.com https://www.gstatic.com https://*.basemaps.cartocdn.com",
              // Fix 3: Added https://nominatim.openstreetmap.org for GPS reverse-geocoding fallback
              "connect-src 'self' https://xtox-production.up.railway.app wss://xtox-production.up.railway.app https://ipapi.co https://api.cloudinary.com https://res.cloudinary.com https://api.openai.com https://api.groq.com https://generativelanguage.googleapis.com https://accounts.google.com https://*.basemaps.cartocdn.com https://tfhub.dev https://storage.googleapis.com https://www.kaggle.com https://nominatim.openstreetmap.org",
              "media-src 'self' blob: https://res.cloudinary.com",
              // Fix 1: Added https://cdn.jsdelivr.net for Tesseract.js Web Worker
              "worker-src 'self' blob: https://cdn.jsdelivr.net",
              "frame-ancestors 'self'",
              "frame-src 'self' https://accounts.google.com",
            ].join('; '),
          },
          { key: 'Content-Language', value: 'ar' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
