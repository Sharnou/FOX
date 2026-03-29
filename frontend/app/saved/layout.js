export const metadata = {
  title: 'إعلاناتي المحفوظة | XTOX',
  description: 'إعلاناتك المحفوظة على منصة XTOX للسوق العربي المحلي',
  robots: { index: false, follow: false },
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/saved',
  },
  openGraph: {
    title: 'إعلاناتي المحفوظة | XTOX',
    description: 'إعلاناتك المحفوظة على منصة XTOX للسوق العربي المحلي',
    url: 'https://fox-kohl-eight.vercel.app/saved',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary',
    title: 'إعلاناتي المحفوظة | XTOX',
    description: 'إعلاناتك المحفوظة على منصة XTOX للسوق العربي المحلي',
  },
};

export default function SavedLayout({ children }) {
  return children;
}
