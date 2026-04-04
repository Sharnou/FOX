/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'res.cloudinary.com' },
      { protocol: 'https', hostname: 'cloudinary.com' },
      { protocol: 'https', hostname: 'api.qrserver.com' },
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: '*.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'http',  hostname: 'localhost' },
      { protocol: 'https', hostname: '*.railway.app' },
      { protocol: 'https', hostname: '*.vercel.app' },
      { protocol: 'https', hostname: '*.up.railway.app' },
    ],
    unoptimized: true, // fallback for any domain not explicitly listed
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'ALLOWALL' },
          { key: 'Content-Security-Policy', value: "frame-ancestors *" },
          // Declare Arabic as the primary content language
          { key: 'Content-Language', value: 'ar' },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
