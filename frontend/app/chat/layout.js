export const metadata = {
  title: 'المحادثات | XTOX',
  description: 'تواصل مع البائعين والمشترين عبر المحادثات الفورية في XTOX.',
  alternates: {
    canonical: 'https://xtox.app/chat',
  },
  openGraph: {
    title: 'المحادثات | XTOX',
    description: 'تواصل مع البائعين والمشترين عبر المحادثات الفورية في XTOX.',
    url: 'https://xtox.app/chat',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
    images: [
      {
        url: 'https://xtox.app/og-image.png',
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
    images: ['https://xtox.app/og-image.png'],
  },
};

// FIX: Wrapping children in a fragment element instead of returning it directly.
// Returning `children` bare from a Server Component causes the RSC flight serializer
// to encode the component reference as "$Sreact.fragment" which is invalid in the
// RSC payload and triggers a hydration error. Wrapping in <>{children}</> gives the
// RSC runtime a proper host/fragment element to serialize correctly.
export default function ChatLayout({ children }) {
  return <>{children}</>;
}
