'use client';
import { useEffect, useState } from 'react';
import QRCode from 'react-qr-code';

export default function InstallPage() {
  const [deferredPrompt, setDeferredPrompt] = useState(null);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    const handlePrompt = (e) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    const handleInstalled = () => setInstalled(true);
    window.addEventListener('beforeinstallprompt', handlePrompt);
    window.addEventListener('appinstalled', handleInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', handlePrompt);
      window.removeEventListener('appinstalled', handleInstalled);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') setInstalled(true);
    setDeferredPrompt(null);
  };

  const features = [
    { icon: '📱', text: 'متاح على جميع الأجهزة' },
    { icon: '⚡', text: 'يعمل بدون إنترنت' },
    { icon: '🔔', text: 'إشعارات فورية' },
    { icon: '🆓', text: 'مجاني تماماً' },
  ];

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100dvh',
        background: 'linear-gradient(160deg, #e8f0fe 0%, #f8f9ff 60%, #fff 100%)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 20px 80px',
        fontFamily: "'Cairo', 'Noto Sans Arabic', system-ui, sans-serif",
        direction: 'rtl',
      }}
    >
      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 32 }}>
        <div style={{ fontSize: 56, marginBottom: 8 }}>🦊</div>
        <h1 style={{
          fontSize: 36,
          fontWeight: 900,
          background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
          backgroundClip: 'text',
          margin: '0 0 8px',
          letterSpacing: 1,
        }}>XTOX</h1>
        <p style={{ color: '#64748b', fontSize: 18, margin: 0, fontWeight: 600 }}>
          سوق محلي عربي
        </p>
      </div>

      {/* QR Code */}
      <div style={{
        background: '#fff',
        padding: 24,
        borderRadius: 24,
        boxShadow: '0 8px 40px rgba(99,102,241,0.15), 0 2px 8px rgba(0,0,0,0.06)',
        marginBottom: 24,
        border: '1.5px solid rgba(99,102,241,0.12)',
      }}>
        <QRCode
          value="https://fox-kohl-eight.vercel.app"
          size={220}
          bgColor="#ffffff"
          fgColor="#1e1047"
          level="M"
        />
      </div>

      {/* Instruction */}
      <p style={{
        textAlign: 'center',
        color: '#475569',
        marginBottom: 24,
        fontSize: 15,
        maxWidth: 320,
        lineHeight: 1.7,
        fontWeight: 500,
      }}>
        افتح الكاميرا وامسح رمز QR لتثبيت التطبيق على جهازك
      </p>

      {/* Install button */}
      {!installed ? (
        <button
          onClick={handleInstall}
          disabled={!deferredPrompt}
          style={{
            background: deferredPrompt
              ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
              : '#94a3b8',
            color: '#fff',
            border: 'none',
            borderRadius: 999,
            padding: '14px 36px',
            fontSize: 17,
            fontWeight: 800,
            cursor: deferredPrompt ? 'pointer' : 'default',
            boxShadow: deferredPrompt ? '0 6px 24px rgba(99,102,241,0.4)' : 'none',
            transition: 'all 0.2s',
            marginBottom: 12,
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            letterSpacing: 0.3,
            fontFamily: "'Cairo', system-ui, sans-serif",
          }}
        >
          <span>📲</span>
          <span>{deferredPrompt ? 'تثبيت التطبيق' : 'افتح من Chrome أو Safari'}</span>
        </button>
      ) : (
        <div style={{
          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
          color: '#fff',
          borderRadius: 999,
          padding: '14px 36px',
          fontSize: 17,
          fontWeight: 800,
          boxShadow: '0 6px 20px rgba(34,197,94,0.4)',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
          fontFamily: "'Cairo', system-ui, sans-serif",
        }}>
          <span>✅</span>
          <span>تم تثبيت التطبيق!</span>
        </div>
      )}

      {/* App link */}
      <a
        href="https://fox-kohl-eight.vercel.app"
        target="_blank"
        rel="noopener noreferrer"
        style={{
          color: '#6366f1',
          fontSize: 13,
          textDecoration: 'none',
          marginBottom: 32,
          opacity: 0.8,
          fontWeight: 500,
        }}
      >
        fox-kohl-eight.vercel.app
      </a>

      {/* Features list */}
      <div style={{ width: '100%', maxWidth: 340, display: 'flex', flexDirection: 'column', gap: 10 }}>
        {features.map((f, i) => (
          <div
            key={i}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              background: '#fff',
              borderRadius: 16,
              padding: '14px 16px',
              boxShadow: '0 2px 8px rgba(99,102,241,0.08)',
              border: '1.5px solid rgba(99,102,241,0.08)',
            }}
          >
            <span style={{ fontSize: 26 }}>{f.icon}</span>
            <span style={{ color: '#1e293b', fontSize: 15, fontWeight: 600 }}>{f.text}</span>
          </div>
        ))}
      </div>

      {/* Back link */}
      <a
        href="/"
        style={{
          marginTop: 32,
          color: '#6366f1',
          textDecoration: 'none',
          fontSize: 14,
          fontWeight: 600,
          display: 'flex',
          alignItems: 'center',
          gap: 6,
        }}
      >
        <span>←</span>
        <span>العودة للرئيسية</span>
      </a>
    </div>
  );
}
