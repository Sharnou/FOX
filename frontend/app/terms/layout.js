export const metadata = {
  title: 'الشروط والأحكام | XTOX',
  description: 'الشروط والأحكام الخاصة باستخدام منصة XTOX للبيع والشراء',
  alternates: {
    canonical: 'https://xtox.app/terms',
  },
  openGraph: {
    title: 'الشروط والأحكام | XTOX',
    description: 'الشروط والأحكام الخاصة باستخدام منصة XTOX للبيع والشراء',
    url: 'https://xtox.app/terms',
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
    title: 'الشروط والأحكام | XTOX',
    description: 'الشروط والأحكام الخاصة باستخدام منصة XTOX للبيع والشراء',
    images: ['https://xtox.app/og-image.png'],
  },
};

export default function Layout({ children }) {
  return children;
}
