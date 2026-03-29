// Admin layout — server component
// noindex: keep admin panel out of search results
export const metadata = {
  title: 'Admin — XTOX',
  description: 'XTOX Admin Panel',
  robots: {
    index: false,
    follow: false,
    noindex: true,
    nofollow: true,
  },
};

export default function AdminLayout({ children }) {
  return children;
}
