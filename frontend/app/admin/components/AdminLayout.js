'use client';
import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const NAV = [
  { href: '/admin',            label: 'لوحة التحكم', icon: '📊' },
  { href: '/admin#users',      label: 'المستخدمون',  icon: '👥' },
  { href: '/admin#ads',        label: 'الإعلانات',   icon: '📋' },
  { href: '/admin#reports',    label: 'البلاغات',    icon: '🚩' },
  { href: '/admin/categories', label: 'التصنيفات',   icon: '🗂️' },
  { href: '/admin/analytics',  label: 'الإحصائيات',  icon: '📈' },
  { href: '/admin/language',   label: 'اللغات',      icon: '🌐' },
  { href: '/admin/promotions', label: 'طلبات التمييز', icon: '💳' },
];

export default function AdminLayout({ children, title }) {
  const router   = useRouter();
  const pathname = usePathname();
  const [adminName, setAdminName] = useState('');
  const [checking, setChecking]   = useState(true);

  useEffect(() => {
    async function checkAuth() {
      try {
        const tok =
          localStorage.getItem('xtox_admin_token') ||
          localStorage.getItem('xtox_token') ||
          localStorage.getItem('token') ||
          localStorage.getItem('authToken') || '';

        if (!tok) { router.replace('/admin'); return; }

        const res  = await fetch(API + '/api/auth/me', {
          headers: { Authorization: 'Bearer ' + tok },
        });
        const data = await res.json();
        const user = data.user || data;

        if (!['admin', 'sub_admin', 'superadmin'].includes(user?.role)) {
          router.replace('/admin');
          return;
        }
        setAdminName(user.name || user.email || 'Admin');
      } catch {
        router.replace('/admin');
      } finally {
        setChecking(false);
      }
    }
    checkAuth();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function logout() {
    ['xtox_admin_token', 'token', 'authToken', 'xtox_admin_user', 'user', 'currentUser']
      .forEach(k => localStorage.removeItem(k));
    router.replace('/admin');
  }

  if (checking) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#00ff41', fontFamily: 'monospace', fontSize: 16 }}>⏳ جارٍ التحقق من الصلاحيات...</span>
      </div>
    );
  }

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Cairo, monospace', display: 'flex', flexDirection: 'column' }}>

      {/* ── Header ── */}
      <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#00ff41', fontWeight: 'bold', fontSize: 20 }}>⬡ XTOX</span>
        <span style={{ color: '#8b949e', fontSize: 13 }}>لوحة الإدارة</span>
        {title && <span style={{ color: '#00d4ff', fontSize: 13, fontWeight: 600 }}>/ {title}</span>}
        <div style={{ marginRight: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          {adminName && <span style={{ color: '#8b949e', fontSize: 12 }}>👤 {adminName}</span>}
          <button onClick={logout}
            style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
            خروج
          </button>
        </div>
      </div>

      {/* ── Nav Bar ── */}
      <div style={{ background: '#161b22', borderBottom: '1px solid #21262d', display: 'flex', gap: 0, overflowX: 'auto', padding: '0 8px' }}>
        {NAV.map(item => {
          // Match pathname (ignore hash)
          const isActive = item.href.split('#')[0] === pathname;
          return (
            <a key={item.href} href={item.href}
              style={{
                padding: '10px 18px',
                background: 'transparent',
                borderBottom: isActive ? '2px solid #00ff41' : '2px solid transparent',
                color: isActive ? '#00ff41' : '#8b949e',
                cursor: 'pointer',
                fontSize: 13,
                whiteSpace: 'nowrap',
                fontFamily: 'Cairo, monospace',
                fontWeight: isActive ? 700 : 400,
                textDecoration: 'none',
                display: 'inline-block',
              }}>
              {item.icon} {item.label}
            </a>
          );
        })}
      </div>

      {/* ── Content ── */}
      <div style={{ flex: 1, padding: '24px 20px 80px', maxWidth: 1400, margin: '0 auto', width: '100%', boxSizing: 'border-box' }}>
        {children}
      </div>
    </div>
  );
}
