export const metadata = {
  title: 'تسجيل الدخول | XTOX',
  description: 'سجّل دخولك إلى XTOX للوصول إلى إعلاناتك ومحادثاتك.',
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/login',
  },
  openGraph: {
    title: 'تسجيل الدخول | XTOX',
    description: 'سجّل دخولك إلى XTOX للوصول إلى إعلاناتك ومحادثاتك.',
    url: 'https://fox-kohl-eight.vercel.app/login',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: 'https://fox-kohl-eight.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XTOX - تسجيل الدخول',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'تسجيل الدخول | XTOX',
    description: 'سجّل دخولك إلى XTOX للوصول إلى إعلاناتك ومحادثاتك.',
    images: ['https://fox-kohl-eight.vercel.app/og-image.png'],
  },
};

export default function LoginLayout({ children }) {
  return children;
}
