export const metadata = {
  title: 'الإشعارات | XTOX',
  description: 'تابع آخر إشعاراتك على XTOX — ردود، رسائل، وتحديثات إعلاناتك.',
  openGraph: {
    title: 'الإشعارات | XTOX',
    description: 'تابع آخر إشعاراتك على XTOX — ردود، رسائل، وتحديثات إعلاناتك.',
    url: 'https://xtox.app/notifications',
    siteName: 'XTOX',
    locale: 'ar_EG',
    type: 'website',
  },
  twitter: {
    card: 'summary_large_image',
    title: 'الإشعارات | XTOX',
    description: 'تابع آخر إشعاراتك على XTOX.',
  },
  alternates: {
    canonical: 'https://xtox.app/notifications',
  },
};

export default function NotificationsLayout({ children }) {
  return children;
}
