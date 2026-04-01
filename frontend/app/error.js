'use client';
import { useEffect } from 'react';

export default function Error({ error, reset }) {
  useEffect(() => {
    console.error('XTOX Error:', error);
  }, [error]);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cairo', system-ui", background: '#f5f5f5', padding: 20, textAlign: 'center' }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 40, maxWidth: 400, boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <div style={{ fontSize: 60, marginBottom: 16 }}>⚠️</div>
        <h2 style={{ color: '#002f34', marginBottom: 12 }}>حدث خطأ</h2>
        <p style={{ color: '#666', marginBottom: 24, fontSize: 14 }}>
          {error?.message || 'حدث خطأ غير متوقع. يرجى المحاولة مرة أخرى.'}
        </p>
        <button onClick={reset}
          style={{ background: '#002f34', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontFamily: 'inherit', fontWeight: 'bold' }}>
          حاول مجدداً
        </button>
        <br />
        <a href="/" style={{ color: '#002f34', fontSize: 13, marginTop: 12, display: 'inline-block' }}>← الرئيسية</a>
      </div>
    </div>
  );
}
