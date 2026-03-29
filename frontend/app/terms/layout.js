export const metadata = {
  title: 'الشروط والأحكام | XTOX',
  description: 'الشروط والأحكام الخاصة باستخدام منصة XTOX للبيع والشراء',
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/terms',
  },
  openGraph: {
    title: 'الشروط والأحكام | XTOX',
    description: 'الشروط والأحكام الخاصة باستخدام منصة XTOX للبيع والشراء',
    url: 'https://fox-kohl-eight.vercel.app/terms',
    siteName: 'XTOX',
    images: [
      {
        url: 'https://fox-kohl-eight.vercel.app/og-image.png',
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
    images: ['https://fox-kohl-eight.vercel.app/og-image.png'],
  },
};

export default function Layout({ children }) {
  return children;
}
