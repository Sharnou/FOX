export const metadata = {
  title: 'المحادثات | XTOX',
  description: 'تواصل مع البائعين والمشترين عبر المحادثات الفورية في XTOX.',
  alternates: {
    canonical: 'https://fox-kohl-eight.vercel.app/chat',
  },
  openGraph: {
    title: 'المحادثات | XTOX',
    description: 'تواصل مع البائعين والمشترين عبر المحادثات الفورية في XTOX.',
    url: 'https://fox-kohl-eight.vercel.app/chat',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: 'https://fox-kohl-eight.vercel.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XTOX - المحادثات',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'المحادثات | XTOX',
    description: 'تواصل مع البائعين والمشترين عبر المحادثات الفورية في XTOX.',
    images: ['https://fox-kohl-eight.vercel.app/og-image.png'],
  },
};

export default function ChatLayout({ children }) {
  return children;
}
