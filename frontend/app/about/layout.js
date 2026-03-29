export const metadata = {
  title: 'من نحن | XTOX',
  description: 'تعرّف على XTOX، السوق المحلي الذكي المدعوم بالذكاء الاصطناعي.',
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/about',
  },
  openGraph: {
    title: 'من نحن | XTOX',
    description: 'تعرّف على XTOX، السوق المحلي الذكي المدعوم بالذكاء الاصطناعي.',
    url: 'https://fox-kohl-eight.vercel.app/about',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: 'https://fox-kohl-eight.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XTOX - من نحن',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'من نحن | XTOX',
    description: 'تعرّف على XTOX، السوق المحلي الذكي المدعوم بالذكاء الاصطناعي.',
    images: ['https://fox-kohl-eight.vercel.app/og-image.png'],
  },
};

export default function AboutLayout({ children }) {
  return children;
}
