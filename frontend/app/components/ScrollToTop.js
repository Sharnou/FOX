'use client';
import { useState, useEffect } from 'react';

export default function ScrollToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => setVisible(window.scrollY > 400);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  if (!visible) return null;

  return (
    <button
      onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
      aria-label="العودة للأعلى"
      title="العودة للأعلى"
      style={{
        position: 'fixed',
        bottom: '80px',
        insetInlineEnd: '16px',
        zIndex: 50,
        background: 'linear-gradient(135deg, #6C63FF, #48CAE4)',
        color: '#fff',
        border: 'none',
        borderRadius: '50%',
        width: '44px',
        height: '44px',
        fontSize: '20px',
        cursor: 'pointer',
        boxShadow: '0 4px 12px rgba(108, 99, 255, 0.4)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'opacity 0.3s ease, transform 0.2s ease',
      }}
      onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
      onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
    >
      ↑
    </button>
  );
}
