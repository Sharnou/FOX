'use client';
import { useState, useEffect } from 'react';
import { usePathname } from 'next/navigation';

export default function PWAInstallPrompt() {
  const pathname = usePathname();
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [visible, setVisible] = useState(false);

  if (pathname?.startsWith('/admin')) return null;

  useEffect(() => {
    // Don't show if already dismissed
    if (typeof window !== 'undefined' && localStorage.getItem('pwa-prompt-dismissed')) {
      return;
    }

    const handler = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setVisible(true);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      setVisible(false);
      setDeferredPrompt(null);
    }
  };

  const handleDismiss = () => {
    setVisible(false);
    setDeferredPrompt(null);
    localStorage.setItem('pwa-prompt-dismissed', '1');
  };

  if (!visible) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: 'fixed',
        bottom: '0',
        left: '0',
        right: '0',
        zIndex: 9999,
        background: 'linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%)',
        color: '#fff',
        padding: '16px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: '12px',
        boxShadow: '0 -4px 20px rgba(79, 70, 229, 0.4)',
        flexWrap: 'wrap',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
        <span style={{ fontSize: '32px' }}>📲</span>
        <div>
          <p style={{ margin: 0, fontWeight: '700', fontSize: '15px', fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
            تثبيت تطبيق XTOX
          </p>
          <p style={{ margin: 0, fontSize: '13px', opacity: 0.88, fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
            احصل على تجربة أفضل مع التطبيق
          </p>
        </div>
      </div>
      <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
        <button
          onClick={handleInstall}
          style={{
            background: '#fff',
            color: '#4f46e5',
            border: 'none',
            borderRadius: '10px',
            padding: '8px 20px',
            fontWeight: '700',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
            boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
            transition: 'transform 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.05)'}
          onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        >
          تثبيت
        </button>
        <button
          onClick={handleDismiss}
          style={{
            background: 'rgba(255,255,255,0.15)',
            color: '#fff',
            border: '1px solid rgba(255,255,255,0.3)',
            borderRadius: '10px',
            padding: '8px 16px',
            fontWeight: '600',
            fontSize: '14px',
            cursor: 'pointer',
            fontFamily: "'Cairo', 'Tajawal', sans-serif",
          }}
        >
          لاحقاً
        </button>
      </div>
    </div>
  );
}
