export const metadata = {
  title: 'بحث في XTOX | سوق محلي ذكي',
  description: 'ابحث عن أفضل العروض والإعلانات القريبة منك على XTOX — سوق محلي مدعوم بالذكاء الاصطناعي.',
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/search',
  },
  openGraph: {
    title: 'بحث في XTOX | سوق محلي ذكي',
    description: 'ابحث عن أفضل العروض والإعلانات القريبة منك على XTOX.',
    url: 'https://fox-kohl-eight.vercel.app/search',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: 'https://fox-kohl-eight.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XTOX - بحث في السوق المحلي',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'بحث في XTOX | سوق محلي ذكي',
    description: 'ابحث عن أفضل العروض والإعلانات القريبة منك على XTOX.',
    images: ['https://fox-kohl-eight.vercel.app/og-image.png'],
  },
};

export default function SearchLayout({ children }) {
  return children;
}
