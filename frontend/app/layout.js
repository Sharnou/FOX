import './globals.css';
import LanguageProvider from './components/LanguageProvider';
import ScrollToTop from './components/ScrollToTop';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import UnifiedNotificationPrompt from './components/UnifiedNotificationPrompt';
import ErrorCapture from './components/ErrorCapture';
import ConditionalLayout from './components/ConditionalLayout';
import TranslationLoader from './components/TranslationLoader';
import PushSubscriber from './components/PushSubscriber';
import FCMInit from './components/FCMInit';
import GeoMetaInjector from './components/GeoMetaInjector';
import HtmlAttributes from './components/HtmlAttributes';

// JSON-LD structured data for rich Google search results
const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  name: 'XTOX Marketplace',
  alternateName: ['اكستوكس', 'XTOX'],
  description: 'السوق المحلي الذكي — بيع واشتري بسهولة في منطقتك',
  url: 'https://xtox.app',
  inLanguage: 'ar',
  potentialAction: {
    '@type': 'SearchAction',
    target: {
      '@type': 'EntryPoint',
      urlTemplate: 'https://xtox.app/search?q={search_term_string}',
    },
    'query-input': 'required name=search_term_string',
  },
};

export const metadata = {
  title: { default: 'XTOX - سوق محلي عربي | بيع واشتري مجاناً', template: '%s | XTOX' },
  description: 'أكبر سوق محلي عربي - نشر إعلانات مجاني، بيع وشراء في مصر والدول العربية، محادثة فورية، مكالمات صوتية، تطبيق PWA',
  keywords: ['سوق محلي', 'إعلانات مبوبة', 'بيع وشراء', 'مصر', 'السعودية', 'الإمارات', 'XTOX', 'marketplace', 'Arabic marketplace', 'OLX مصر', 'Dubizzle عربي', 'إعلانات مجانية'],
  openGraph: {
    type: 'website', locale: 'ar_EG', url: 'https://xtox.app',
    siteName: 'XTOX - سوق محلي عربي',
    title: 'XTOX - سوق محلي عربي | بيع واشتري مجاناً',
    description: 'أكبر سوق محلي عربي - نشر إعلانات مجاني، بيع وشراء في مصر والدول العربية',
    images: [{ url: 'https://xtox.app/icon-512.png', width: 512, height: 512 }],
  },
  twitter: {
    card: 'summary_large_image',
    site: '@XTOXapp',
    creator: '@XTOXapp',
    title: 'XTOX - سوق محلي عربي | بيع واشتري مجاناً',
    description: 'أكبر سوق محلي عربي - نشر إعلانات مجاني، بيع وشراء في مصر والدول العربية',
    images: ['https://xtox.app/icon-512.png'],
  },
  robots: { index: true, follow: true, googleBot: { index: true, follow: true, 'max-video-preview': -1, 'max-image-preview': 'large', 'max-snippet': -1 } },
  alternates: {
    canonical: 'https://xtox.app',
    languages: { 'ar': 'https://xtox.app', 'ar-EG': 'https://xtox.app' }
  },
  verification: { google: 'RxrSDuYw7UKw32DYzMk-7d8HSIZ1c4TxLztuOY7vsCg', yandex: process.env.NEXT_PUBLIC_YANDEX_VERIFY || 'xtox-yandex-verify' },
  manifest: '/manifest.json',
  // OFFICIAL XTOX ICON — DO NOT CHANGE
  icons: {
    icon: [
      { url: '/favicon.svg', type: 'image/svg+xml' },
      { url: '/icon-16.png', sizes: '16x16', type: 'image/png' },
      { url: '/icon-32.png', sizes: '32x32', type: 'image/png' },
      { url: '/icon-48.png', sizes: '48x48', type: 'image/png' },
      { url: '/icon-96.png', sizes: '96x96', type: 'image/png' },
      { url: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    shortcut: '/favicon.svg',
    apple: [
      { url: '/icon-180.png', sizes: '180x180', type: 'image/png' },
      { url: '/icon-152.png', sizes: '152x152', type: 'image/png' },
      { url: '/icon-144.png', sizes: '144x144', type: 'image/png' },
    ],
  },
};

export const viewport = {
  themeColor: '#ffffff',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        {/* Icon links managed via Next.js metadata.icons above */}
        {/* OFFICIAL XTOX ICON — DO NOT CHANGE */}
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" href="/icon-32.png" sizes="32x32" type="image/png" />
        <link rel="icon" href="/icon-16.png" sizes="16x16" type="image/png" />
        <link rel="apple-touch-icon" href="/icon-180.png" sizes="180x180" />
        <link rel="apple-touch-icon" href="/icon-152.png" sizes="152x152" />
        {/* Viewport — maximum-scale=5 prevents iOS auto-zoom while allowing user zoom */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        {/* PWA / mobile web app */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="XtoX" />
        <meta name="theme-color" content="#ffffff" />
        {/* PWA manifest */}
        <link rel="manifest" href="/manifest.json" />
        {/* dns-prefetch as fallback for browsers that don't support preconnect */}
        <link rel="dns-prefetch" href="https://fonts.googleapis.com" />
        <link rel="dns-prefetch" href="https://fonts.gstatic.com" />
        {/* preconnect to reduce font load latency */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet" />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <link rel="preconnect" href="https://res.cloudinary.com" />
        <link rel="dns-prefetch" href="https://res.cloudinary.com" />
        <link rel="preconnect" href="https://xtox-production.up.railway.app" />
        <link rel="dns-prefetch" href="https://xtox-production.up.railway.app" />
        {/* SEO: Additional resource hints for Core Web Vitals */}
        <link rel="dns-prefetch" href="https://ipapi.co" />
        <link rel="dns-prefetch" href="https://public-api.wordpress.com" />
        {/* Theme color for browser UI */}
        <meta name="msapplication-TileColor" content="#ffffff" />
        {/* Mobile optimization — mobile-web-app-capable already set above */}
        {/* Geo */}
        <meta name="geo.placename" content="Arab World" />
        <meta name="coverage" content="Worldwide" />
        <meta name="distribution" content="Global" />
        {/* Revisit */}
        <meta name="revisit-after" content="3 days" />
        <meta name="robots" content="index, follow, max-snippet:-1, max-image-preview:large, max-video-preview:-1" />
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
        background: '#f5f5f5',
        overflowX: 'hidden',
      }}>
        <LanguageProvider>
      <HtmlAttributes />
      <GeoMetaInjector />
        <FCMInit />
        <PushSubscriber />
      <ErrorCapture />
        {children}
        <ConditionalLayout />
        <ScrollToTop />
        <PWAInstallPrompt />
        <ServiceWorkerRegistration />
        <UnifiedNotificationPrompt />
        <TranslationLoader />
      </LanguageProvider>
      </body>
    </html>
  );
}
