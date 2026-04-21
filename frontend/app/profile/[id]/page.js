// Server component wrapper for Capacitor static export
// generateStaticParams returns a placeholder so Next.js builds a static shell
// Actual profile data is fetched at runtime by ProfileContent via useParams()
import ProfileContent from './ProfileContent';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  // Return a placeholder — the Capacitor SPA uses this shell for all profile routes
  // Actual dynamic routing is handled by ProfileContent via useParams()
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <ProfileContent />;
}
