import { Inter } from 'next/font/google';

export const metadata = {
  title: 'وجبات سريعة | XTOX - سوق محلي',
  description: 'اطلب أشهى الوجبات السريعة من المطاعم القريبة منك على XTOX. توصيل سريع وأسعار مناسبة.',
  openGraph: {
    title: 'وجبات سريعة | XTOX - سوق محلي',
    description: 'اطلب أشهى الوجبات السريعة من المطاعم القريبة منك على XTOX.',
    type: 'website',
    locale: 'ar_EG',
    siteName: 'XTOX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'وجبات سريعة | XTOX',
    description: 'اطلب أشهى الوجبات السريعة من المطاعم القريبة منك على XTOX.',
  },
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/fastfood',
  },
};

export default function Layout({ children }) {
  return children;
}
