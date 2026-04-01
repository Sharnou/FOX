import { Inter } from 'next/font/google';

export const metadata = {
  title: 'سوبرماركت | XTOX - سوق محلي',
  description: 'تسوق من أفضل منتجات السوبرماركت في منطقتك على XTOX. عروض يومية وأسعار مناسبة.',
  openGraph: {
    title: 'سوبرماركت | XTOX - سوق محلي',
    description: 'تسوق من أفضل منتجات السوبرماركت في منطقتك على XTOX.',
    type: 'website',
    locale: 'ar_EG',
    siteName: 'XTOX',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'سوبرماركت | XTOX',
    description: 'تسوق من أفضل منتجات السوبرماركت في منطقتك على XTOX.',
  },
  alternates: {
    canonical: 'https://xtox.app/supermarket',
  },
};

export default function Layout({ children }) {
  return children;
}
