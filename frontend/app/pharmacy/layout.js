import { Inter } from 'next/font/google';

export const metadata = {
  title: 'صيدليات | XTOX - سوق محلي',
  description: 'تصفح منتجات الصيدليات والأدوية المتاحة في منطقتك على XTOX. صحتك أولاً.',
  openGraph: {
    title: 'صيدليات | XTOX - سوق محلي',
    description: 'تصفح منتجات الصيدليات والأدوية المتاحة في منطقتك على XTOX.',
    type: 'website',
    locale: 'ar_EG',
    siteName: 'XTOX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'صيدليات | XTOX',
    description: 'تصفح منتجات الصيدليات والأدوية المتاحة في منطقتك على XTOX.',
  },
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/pharmacy',
  },
};

export default function Layout({ children }) {
  return children;
}
