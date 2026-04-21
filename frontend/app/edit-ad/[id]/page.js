// Server component wrapper for Capacitor static export
import EditAdContent from './EditAdContent';

export const dynamic = 'force-static';

export async function generateStaticParams() {
  return [{ id: 'placeholder' }];
}

export default function Page() {
  return <EditAdContent />;
}
