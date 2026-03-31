export const metadata = {
  title: 'تعديل الملف الشخصي | XTOX',
  description: 'عدّل معلومات ملفك الشخصي على منصة XTOX',
  alternates: {
    canonical: 'https://xtox.app/profile/edit',
  },
  openGraph: {
    title: 'تعديل الملف الشخصي | XTOX',
    description: 'عدّل معلومات ملفك الشخصي على منصة XTOX',
    url: 'https://xtox.app/profile/edit',
    siteName: 'XTOX',
    images: [
      {
        url: 'https://xtox.app/og-image.png',
        width: 1200,
        height: 630,
        alt: 'XTOX Marketplace',
      },
    ],
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'تعديل الملف الشخصي | XTOX',
    description: 'عدّل معلومات ملفك الشخصي على منصة XTOX',
    images: ['https://xtox.app/og-image.png'],
  },
};

export default function Layout({ children }) {
  return children;
}
