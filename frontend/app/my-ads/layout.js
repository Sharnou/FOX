export const metadata = {
  title: 'إعلاناتي | XTOX',
  description: 'إدارة إعلاناتك على XTOX. تابع حالة إعلاناتك، المشاهدات، والمحادثات.',
  openGraph: {
    title: 'إعلاناتي | XTOX',
    description: 'إدارة إعلاناتك على XTOX. تابع حالة إعلاناتك، المشاهدات، والمحادثات.',
    url: 'https://fox-kohl-eight.vercel.app/my-ads',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'إعلاناتي | XTOX',
    description: 'إدارة إعلاناتك على XTOX.',
  },
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/my-ads',
  },
};

export default function MyAdsLayout({ children }) {
  return children;
}
