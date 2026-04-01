'use client';
import { usePathname, useRouter } from 'next/navigation';

const navItems = [
  { icon: '🏠', label: 'الرئيسية', href: '/' },
  { icon: '🔍', label: 'بحث', href: '/search' },
  { icon: '➕', label: 'بيع', href: '/sell', highlight: true },
  { icon: '💬', label: 'محادثات', href: '/chat' },
  { icon: '👤', label: 'حسابي', href: '/login' },
];

export default function BottomNav() {
  const pathname = usePathname();
  const router = useRouter();

  // Don't show on admin page
  if (pathname?.startsWith('/admin')) return null;

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
        padding: '6px 0 8px',
        boxShadow: '0 -2px 12px rgba(0,0,0,0.08)',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
      }}>
        {navItems.map(item => {
          const isActive = pathname === item.href || 
            (item.href !== '/' && pathname?.startsWith(item.href));
          
          if (item.highlight) return (
            <button key={item.href} onClick={() => router.push(item.href)}
              style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
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
            <button key={item.href} onClick={() => router.push(item.href)}
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
