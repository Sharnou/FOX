import { Inter } from 'next/font/google';

export const metadata = {
  title: 'وظائف | XTOX - سوق محلي',
  description: 'تصفح أحدث إعلانات الوظائف في منطقتك على XTOX. ابحث عن فرصة عملك المثالية بسهولة.',
  openGraph: {
    title: 'وظائف | XTOX - سوق محلي',
    description: 'تصفح أحدث إعلانات الوظائف في منطقتك على XTOX.',
    type: 'website',
    locale: 'ar_EG',
    siteName: 'XTOX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'وظائف | XTOX',
    description: 'تصفح أحدث إعلانات الوظائف في منطقتك على XTOX.',
  },
  alternates: {
    canonical: 'https://xtox.app/jobs',
  },
};

export default function Layout({ children }) {
  return children;
}
