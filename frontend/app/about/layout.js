export const metadata = {
  title: 'من نحن | XTOX',
  description: 'تعرّف على XTOX، السوق المحلي الذكي المدعوم بالذكاء الاصطناعي.',
  alternates: {
    canonical: 'https://xtox.app/about',
  },
  openGraph: {
    title: 'من نحن | XTOX',
    description: 'تعرّف على XTOX، السوق المحلي الذكي المدعوم بالذكاء الاصطناعي.',
    url: 'https://xtox.app/about',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: 'https://xtox.app/og-image.png',
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
    images: ['https://xtox.app/og-image.png'],
  },
};

export default function AboutLayout({ children }) {
  return children;
}
