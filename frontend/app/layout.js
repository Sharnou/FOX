import './globals.css';
import ScrollToTop from './components/ScrollToTop';
import PWAInstallPrompt from './components/PWAInstallPrompt';
import ServiceWorkerRegistration from './components/ServiceWorkerRegistration';
import UnifiedNotificationPrompt from './components/UnifiedNotificationPrompt';
import BottomNav from './components/BottomNav';
import FloatingSearchBar from './components/FloatingSearchBar';
import ErrorCapture from './components/ErrorCapture';
import MarkPoint from './components/MarkPoint';

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
  title: {
    default: 'XTOX Marketplace',
    template: '%s — XTOX',
  },
  description: 'XTOX Marketplace — السوق المحلي الذكي',
  keywords: ['سوق', 'بيع', 'شراء', 'إعلانات مجانية', 'marketplace', 'XTOX', 'سيارات', 'عقارات', 'إلكترونيات', 'وظائف', 'مصر', 'السعودية'],
  robots: { index: true, follow: true },
  manifest: '/manifest.json',
  icons: {
    icon: '/favicon.ico',
    shortcut: '/favicon.ico',
    apple: '/favicon.svg',
  },
  openGraph: {
    type: 'website',
    siteName: 'XTOX',
    title: 'XTOX Marketplace',
    description: 'XTOX Marketplace — السوق المحلي الذكي',
    locale: 'ar_EG',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'XTOX Marketplace',
    description: 'XTOX Marketplace — السوق المحلي الذكي',
  },
};

export const viewport = {
  themeColor: '#002f34',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 5,
};

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="shortcut icon" href="/favicon.ico" type="image/x-icon" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        {/* Viewport — maximum-scale=5 prevents iOS auto-zoom while allowing user zoom */}
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=5" />
        {/* PWA / mobile web app */}
        <meta name="mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent" />
        <meta name="apple-mobile-web-app-title" content="XTOX" />
        <meta name="theme-color" content="#002f34" />
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
      </head>
      <body style={{
        margin: 0,
        padding: 0,
        fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
        background: '#f5f5f5',
        overflowX: 'hidden',
      }}>
        <ErrorCapture />
        <MarkPoint />
        {children}
        <FloatingSearchBar />
        <ScrollToTop />
        <PWAInstallPrompt />
        <ServiceWorkerRegistration />
        <UnifiedNotificationPrompt />
        <BottomNav />
      </body>
    </html>
  );
}
