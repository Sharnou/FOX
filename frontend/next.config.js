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
          {
            key: 'Content-Security-Policy',
            // 'unsafe-eval' is required by Next.js (code splitting / hot reload)
            // and by several mapping/charting libraries used in this app.
            // 'unsafe-inline' is needed for Next.js inline scripts and style-in-JS.
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://fonts.googleapis.com https://www.googletagmanager.com https://accounts.google.com",
              "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://unpkg.com https://accounts.google.com",
              "font-src 'self' https://fonts.gstatic.com data:",
              "img-src 'self' data: blob: https://res.cloudinary.com https://lh3.googleusercontent.com https://api.qrserver.com https://unpkg.com https://images.unsplash.com https://www.gstatic.com",
              "connect-src 'self' https://xtox-production.up.railway.app wss://xtox-production.up.railway.app https://ipapi.co https://api.cloudinary.com https://res.cloudinary.com https://api.openai.com https://api.groq.com https://generativelanguage.googleapis.com https://accounts.google.com",
              "media-src 'self' blob: https://res.cloudinary.com",
              "worker-src 'self' blob:",
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
