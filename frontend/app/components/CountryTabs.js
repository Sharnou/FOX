'use client';
import { useEffect } from 'react';

// Platform is locked to Egypt (EG) only.
// CountryTabs no longer allows switching between countries.
export default function CountryTabs({ onCountrySelect, activeCountry }) {
  useEffect(() => {
    // Always lock to EG on mount
    if (onCountrySelect) onCountrySelect('EG');
    try { localStorage.setItem('xtox_selected_country', 'EG'); } catch {}
  }, []);

  // Render a simple read-only indicator — no switching UI
  return (
    <div
      dir="rtl"
      style={{
        padding: '8px 16px',
        background: 'white',
        borderBottom: '1px solid rgba(99,102,241,0.1)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: 6,
          padding: '6px 14px',
          borderRadius: 999,
          fontSize: 13,
          fontWeight: 700,
          background: '#6366f1',
          color: 'white',
          border: '1.5px solid #6366f1',
          userSelect: 'none',
        }}
      >
        🇪🇬 مصر
      </span>
      <span style={{ fontSize: 12, color: '#94a3b8' }}>
        المنصة مخصصة لمصر فقط
      </span>
    </div>
  );
}
