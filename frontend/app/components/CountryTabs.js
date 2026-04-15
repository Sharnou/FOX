'use client';
import { useState, useEffect } from 'react';
import { COUNTRIES, detectCountry } from '../utils/geoDetect';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export default function CountryTabs({ onCountrySelect, activeCountry }) {
  const [counts, setCounts] = useState({});
  const [total, setTotal] = useState(0);
  const [detectedCountry, setDetectedCountry] = useState('');
  const [expanded, setExpanded] = useState(false);
  const [tabsLoading, setTabsLoading] = useState(true);

  useEffect(() => {
    // Restore selected country from localStorage
    try {
      const saved = localStorage.getItem('xtox_selected_country');
      if (saved && saved !== activeCountry && onCountrySelect) {
        onCountrySelect(saved);
      }
    } catch {}
    // Load country counts from API
    fetch(`${API}/api/ads/countries`)
      .then(r => r.json())
      .then(d => {
        const map = {};
        (d.countries || []).forEach(c => { if (c._id) map[c._id] = c.count; });
        setCounts(map);
        setTotal(d.total || 0);
      }).catch(() => {}).finally(() => setTabsLoading(false));
    // Detect user's country
    detectCountry().then(code => {
      setDetectedCountry(code);
      if (!activeCountry && onCountrySelect) onCountrySelect('');
    });
  }, []);

  // Build tab list: detected country first, then sorted by count, then others
  const countriesWithAds = Object.keys(counts).filter(c => COUNTRIES[c]).sort((a, b) => (counts[b] || 0) - (counts[a] || 0));
  const detectedFirst = detectedCountry && !countriesWithAds.includes(detectedCountry)
    ? [detectedCountry, ...countriesWithAds]
    : countriesWithAds;
  const visibleTabs = expanded ? detectedFirst : detectedFirst.slice(0, 8);

  if (tabsLoading) return (
    <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0', background: 'white', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
      <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
    </div>
  );

  return (
    <div className="w-full" dir="rtl" style={{ padding: '8px 16px 4px', background: 'white', borderBottom: '1px solid rgba(99,102,241,0.1)' }}>
      {/* Detected country banner */}
      {detectedCountry && COUNTRIES[detectedCountry] && (
        <div style={{ fontSize: 12, color: '#64748b', textAlign: 'center', marginBottom: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 4 }}>
          <span>📍</span>
          <span>تم اكتشاف موقعك: {COUNTRIES[detectedCountry].flag} {COUNTRIES[detectedCountry].name}</span>
        </div>
      )}

      {/* Tabs scroll container */}
      <div style={{ display: 'flex', overflowX: 'auto', gap: 8, paddingBottom: 4, scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
        {/* All tab */}
        <button
          onClick={() => { try { localStorage.setItem('xtox_selected_country', ''); } catch {} onCountrySelect && onCountrySelect(''); }}
          style={{
            flexShrink: 0,
            padding: '6px 12px',
            borderRadius: 999,
            fontSize: 12,
            fontWeight: 600,
            border: '1.5px solid',
            cursor: 'pointer',
            fontFamily: 'inherit',
            transition: 'all 0.18s',
            background: !activeCountry ? '#6366f1' : '#f1f5f9',
            color: !activeCountry ? 'white' : '#64748b',
            borderColor: !activeCountry ? '#6366f1' : 'rgba(99,102,241,0.2)',
          }}
        >
          🌍 كل الدول <span style={{ opacity: 0.7, fontSize: 11 }}>({total})</span>
        </button>

        {/* Country tabs */}
        {visibleTabs.map(code => {
          const info = COUNTRIES[code];
          if (!info) return null;
          const count = counts[code] || 0;
          const isDetected = code === detectedCountry;
          const isActive = activeCountry === code;
          return (
            <button
              key={code}
              onClick={() => { try { localStorage.setItem('xtox_selected_country', code); } catch {} onCountrySelect && onCountrySelect(code); }}
              style={{
                flexShrink: 0,
                padding: '6px 12px',
                borderRadius: 999,
                fontSize: 12,
                fontWeight: 600,
                border: `1.5px ${isDetected && !isActive ? 'dashed' : 'solid'}`,
                cursor: 'pointer',
                fontFamily: 'inherit',
                transition: 'all 0.18s',
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                background: isActive ? '#6366f1' : isDetected ? '#eff6ff' : '#f1f5f9',
                color: isActive ? 'white' : isDetected ? '#2563eb' : '#64748b',
                borderColor: isActive ? '#6366f1' : isDetected ? '#93c5fd' : 'rgba(99,102,241,0.2)',
              }}
            >
              <span>{info.flag}</span>
              <span>{info.name}</span>
              {count > 0 && <span style={{ opacity: 0.7, fontSize: 11 }}>({count} إعلان)</span>}
            </button>
          );
        })}

        {/* Expand button */}
        {detectedFirst.length > 8 && (
          <button
            onClick={() => setExpanded(!expanded)}
            style={{
              flexShrink: 0,
              padding: '6px 12px',
              borderRadius: 999,
              fontSize: 12,
              fontWeight: 600,
              background: '#f1f5f9',
              color: '#64748b',
              border: '1.5px solid rgba(99,102,241,0.2)',
              cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            {expanded ? '▲ أقل' : `▼ المزيد (${detectedFirst.length - 8})`}
          </button>
        )}
      </div>
    </div>
  );
}
