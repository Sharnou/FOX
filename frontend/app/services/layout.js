import { Inter } from 'next/font/google';

export const metadata = {
  title: 'خدمات | XTOX - سوق محلي',
  description: 'تصفح إعلانات الخدمات المتنوعة في منطقتك على XTOX. من السباكة إلى التصميم — اعثر على ما تحتاجه.',
  openGraph: {
    title: 'خدمات | XTOX - سوق محلي',
    description: 'تصفح إعلانات الخدمات المتنوعة في منطقتك على XTOX.',
    type: 'website',
    locale: 'ar_EG',
    siteName: 'XTOX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'خدمات | XTOX',
    description: 'تصفح إعلانات الخدمات المتنوعة في منطقتك على XTOX.',
  },
  alternates: {
    canonical: 'https://xtox.app/services',
  },
};

export default function Layout({ children }) {
  return children;
}
