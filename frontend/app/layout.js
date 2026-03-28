import './globals.css';

export const metadata = {
  title: {
    default: 'XTOX Marketplace',
    template: '%s — XTOX',
  },
  description: 'XTOX Marketplace — السوق المحلي الذكي',
  manifest: '/manifest.webmanifest',
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

export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head>
        <link rel="icon" href="/favicon.svg" />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@300;400;600;700;900&family=Tajawal:wght@300;400;500;700&display=swap" rel="stylesheet" />
      </head>
      <body style={{ margin: 0, padding: 0, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", background: '#f5f5f5' }}>
        {children}
      </body>
    </html>
  );
}
