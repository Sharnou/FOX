'use client';
/**
 * ConditionalLayout
 * Hides bottom-nav, floating chat, WA button and floating search bar
 * on the /call page (and any future fullscreen pages).
 *
 * This must be a Client Component because usePathname() is a client-only hook.
 */
import { usePathname } from 'next/navigation';
import BottomNav         from './BottomNav';
import ChatFloat         from './ChatFloat';
import WhatsAppFloat     from './WhatsAppFloat';
import FloatingSearchBar from './FloatingSearchBar';

// Pages where the navigation overlay must be hidden
const FULLSCREEN_PAGES = ['/call'];

export default function ConditionalLayout() {
  const pathname  = usePathname();
  const isHidden  = FULLSCREEN_PAGES.some(p => pathname === p || pathname?.startsWith(p + '?'));

  if (isHidden) return null;

  return (
    <>
      <FloatingSearchBar />
      <BottomNav />
      <ChatFloat />
      <WhatsAppFloat />
    </>
  );
}
