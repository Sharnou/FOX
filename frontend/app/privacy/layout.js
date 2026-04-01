export const metadata = {
  title: 'سياسة الخصوصية | XTOX',
  description: 'سياسة الخصوصية وحماية البيانات الشخصية على منصة XTOX',
  alternates: {
    canonical: 'https://xtox.app/privacy',
  },
  openGraph: {
    title: 'سياسة الخصوصية | XTOX',
    description: 'سياسة الخصوصية وحماية البيانات الشخصية على منصة XTOX',
    url: 'https://xtox.app/privacy',
    siteName: 'XTOX',
    images: [
      {
        url: 'https://xtox.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XTOX Marketplace',
      },
    ],
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'سياسة الخصوصية | XTOX',
    description: 'سياسة الخصوصية وحماية البيانات الشخصية على منصة XTOX',
    images: ['https://xtox.app/og-image.png'],
  },
};

export default function Layout({ children }) {
  return children;
}
