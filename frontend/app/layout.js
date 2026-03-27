import './globals.css';
export const metadata = { title: 'XTOX', description: 'XTOX Marketplace', manifest: '/manifest.webmanifest' };
export default function RootLayout({ children }) {
  return (
    <html lang="ar" dir="rtl">
      <head><link rel="icon" href="/favicon.svg" /></head>
      <body>{children}</body>
    </html>
  );
}
