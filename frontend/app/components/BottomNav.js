'use client';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  // Detect login state on client only
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      setIsLoggedIn(!!token);
    } catch {}
  }, [pathname]); // re-check on every route change

  // Don't show on admin page
  if (pathname?.startsWith('/admin')) return null;

  const navItems = [
    { icon: '🏠', label: 'الرئيسية', href: '/' },
    { icon: '🔍', label: 'بحث', href: '/search' },
    { icon: '➕', label: 'بيع', href: '/sell', highlight: true },
    { icon: '❤️', label: 'المفضلة', href: '/wishlist' },
    // Navigate to /profile if logged in, otherwise /login
    { icon: '👤', label: 'حسابي', href: isLoggedIn ? '/profile' : '/login' },
  ];

  return (
    <>
      {/* Spacer so content isn't hidden behind nav */}
      <div style={{ height: 70 }} />
      
      <nav style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 9000,
        background: '#fff',
        borderTop: '1px solid #e8e8e8',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-around',
        padding: '6px 0',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        paddingBottom: 'max(8px, env(safe-area-inset-bottom))',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
      }}>
        {navItems.map(item => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && item.href !== '/login' && pathname?.startsWith(item.href));
          
          if (item.highlight) return (
            <button key={item.href} onClick={() => router.push(item.href)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                WebkitTapHighlightColor: 'transparent',
                background: '#002f34',
                border: 'none',
                borderRadius: '50%',
                width: 54,
                height: 54,
                cursor: 'pointer',
                marginTop: -18,
                boxShadow: '0 4px 16px rgba(0,47,52,0.35)',
                color: '#fff',
                fontSize: 22,
                justifyContent: 'center',
              }}>
              {item.icon}
            </button>
          );

          return (
            <button key={item.label} onClick={() => router.push(item.href)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 2,
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: isActive ? '#002f34' : '#999',
                minWidth: 48,
              }}>
              <span style={{ fontSize: 22 }}>{item.icon}</span>
              <span style={{ fontSize: 10, fontWeight: isActive ? 700 : 400 }}>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </>
  );
}
