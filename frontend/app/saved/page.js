'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import dynamic from 'next/dynamic';
import AdCardSkeleton from '../components/AdCardSkeleton';

const AdCard = dynamic(() => import('../components/AdCard'), { ssr: false });

const BACKEND = 'https://fox-production.up.railway.app';

export default function SavedPage() {
  const [ads, setAds] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedIds = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
    if (savedIds.length === 0) {
      setLoading(false);
      return;
    }
    Promise.all(
      savedIds.map(id =>
        fetch(`${BACKEND}/api/ads/${id}`)
          .then(res => res.ok ? res.json() : null)
          .catch(() => null)
      )
    ).then(results => {
      setAds(results.filter(Boolean));
      setLoading(false);
    });
  }, []);

  const removeAd = (id) => {
    const savedIds = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
    const updated = savedIds.filter(savedId => savedId !== id);
    localStorage.setItem('xtox_saved_ads', JSON.stringify(updated));
    setAds(prev => prev.filter(ad => (ad._id || ad.id) !== id));
  };

  const clearAll = () => {
    localStorage.setItem('xtox_saved_ads', JSON.stringify([]));
    setAds([]);
  };

  return (
    <div dir="rtl" style={{ maxWidth: 600, margin: '0 auto', padding: 16, minHeight: '100vh', background: '#f9f9f9' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <Link href="/" style={{ fontSize: 22, color: '#333', textDecoration: 'none' }}>&#8592;</Link>
          <h1 style={{ fontSize: 20, fontWeight: 'bold', margin: 0 }}>&#x625;&#x639;&#x644;&#x627;&#x646;&#x627;&#x62A;&#x64A; &#x627;&#x644;&#x645;&#x62D;&#x641;&#x648;&#x638;&#x629; &#x2764;&#xFE0F;</h1>
        </div>
        {!loading && ads.length > 0 && (
          <button
            onClick={clearAll}
            style={{
              fontSize: 13,
              color: '#e53e3e',
              background: '#fff0f0',
              border: '1px solid #fed7d7',
              borderRadius: 8,
              padding: '4px 10px',
              cursor: 'pointer',
              fontFamily: 'inherit'
            }}
          >
            &#x645;&#x633;&#x62D; &#x627;&#x644;&#x643;&#x644;
          </button>
        )}
      </div>

      {/* Loading skeletons */}
      {loading ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
          {[0, 1, 2, 3].map(i => <AdCardSkeleton key={i} />)}
        </div>
      ) : ads.length === 0 ? (
        /* Empty state */
        <div style={{ textAlign: 'center', paddingTop: 80 }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>&#x1F90D;</div>
          <p style={{ fontSize: 18, fontWeight: 'bold', color: '#333', margin: '0 0 8px' }}>
            &#x644;&#x627; &#x62A;&#x648;&#x62C;&#x62F; &#x625;&#x639;&#x644;&#x627;&#x646;&#x627;&#x62A; &#x645;&#x62D;&#x641;&#x648;&#x638;&#x629; &#x628;&#x639;&#x62F;
          </p>
          <p style={{ fontSize: 14, color: '#888', margin: '0 0 28px' }}>
            &#x627;&#x62D;&#x641;&#x638; &#x627;&#x644;&#x625;&#x639;&#x644;&#x627;&#x646;&#x627;&#x62A; &#x627;&#x644;&#x62A;&#x64A; &#x62A;&#x639;&#x62C;&#x628;&#x643; &#x648;&#x633;&#x62A;&#x638;&#x647;&#x631; &#x647;&#x646;&#x627;
          </p>
          <Link
            href="/"
            style={{
              display: 'inline-block',
              background: '#7c3aed',
              color: '#fff',
              borderRadius: 12,
              padding: '12px 28px',
              textDecoration: 'none',
              fontWeight: 'bold',
              fontSize: 15
            }}
          >
            &#x62A;&#x635;&#x641;&#x62D; &#x627;&#x644;&#x625;&#x639;&#x644;&#x627;&#x646;&#x627;&#x62A;
          </Link>
        </div>
      ) : (
        <>
          <p style={{ fontSize: 13, color: '#888', marginBottom: 12 }}>
            {ads.length} &#x625;&#x639;&#x644;&#x627;&#x646; &#x645;&#x62D;&#x641;&#x648;&#x638;
          </p>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 12 }}>
            {ads.map(ad => (
              <div key={ad._id || ad.id} style={{ position: 'relative' }}>
                <AdCard ad={ad} />
                <button
                  onClick={() => removeAd(ad._id || ad.id)}
                  aria-label="&#x625;&#x632;&#x627;&#x644;&#x629; &#x645;&#x646; &#x627;&#x644;&#x645;&#x62D;&#x641;&#x648;&#x638;&#x627;&#x62A;"
                  style={{
                    position: 'absolute',
                    top: 6,
                    left: 6,
                    zIndex: 20,
                    width: 26,
                    height: 26,
                    borderRadius: '50%',
                    background: '#fff',
                    border: '1px solid #ddd',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.15)',
                    cursor: 'pointer',
                    fontSize: 13,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: 0,
                    color: '#e53e3e',
                    lineHeight: 1
                  }}
                >
                  &#x2715;
                </button>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
