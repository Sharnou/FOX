export const metadata = {
  title: 'ملف البائع | XTOX',
  description: 'اطلع على ملف البائع وإعلاناته وتقييماته في XTOX.',
  alternates: {
    canonical: 'https://xtox.app/profile',
  },
  openGraph: {
    title: 'ملف البائع | XTOX',
    description: 'اطلع على ملف البائع وإعلاناته وتقييماته في XTOX.',
    url: 'https://xtox.app/profile',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'profile',
    images: [
      {
        url: 'https://xtox.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XTOX - ملف البائع',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'ملف البائع | XTOX',
    description: 'اطلع على ملف البائع وإعلاناته وتقييماته في XTOX.',
    images: ['https://xtox.app/og-image.png'],
  },
};

export default function ProfileLayout({ children }) {
  return children;
}
