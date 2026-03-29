export const metadata = {
  title: 'إعلانات قريبة منك | XTOX',
  description: 'اكتشف الإعلانات والعروض القريبة من موقعك الجغرافي على XTOX — سوق محلي ذكي.',
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/nearby',
  },
  openGraph: {
    title: 'إعلانات قريبة منك | XTOX',
    description: 'اكتشف الإعلانات والعروض القريبة من موقعك على XTOX.',
    url: 'https://fox-kohl-eight.vercel.app/nearby',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: 'https://fox-kohl-eight.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XTOX - إعلانات قريبة',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'إعلانات قريبة منك | XTOX',
    description: 'اكتشف الإعلانات والعروض القريبة من موقعك على XTOX.',
    images: ['https://fox-kohl-eight.vercel.app/og-image.png'],
  },
};

export default function NearbyLayout({ children }) {
  return children;
}
