'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const MONTH_NAMES = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

function getMonthLabel(month, year) {
  if (!month) return '';
  // Handle "YYYY-MM" string format
  if (typeof month === 'string' && month.includes('-')) {
    const [yr, mo] = month.split('-');
    return `${MONTH_NAMES[mo] || mo} ${yr}`.trim();
  }
  // Handle numeric month (1-12) + separate year from WinnerHistory model
  const mo = String(month).padStart(2, '0');
  return `${MONTH_NAMES[mo] || mo} ${year || ''}`.trim();
}

export default function WinnerHistoryPage() {
  const [winners, setWinners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetch(`${API}/api/winner/history`)
      .then(r => {
        if (!r.ok) throw new Error('فشل تحميل قائمة الفائزين');
        return r.json();
      })
      .then(data => {
        setWinners(Array.isArray(data) ? data : (data.history || data.winners || []));
        setLoading(false);
      })
      .catch(err => {
        console.error(err);
        setError('حدث خطأ، يرجى إعادة المحاولة');
        setLoading(false);
      });
  }, []);

  return (
    <div
      dir="rtl"
      style={{
        minHeight: '100vh',
        background: 'linear-gradient(135deg, #0f0a28 0%, #1a0a3d 50%, #0a1628 100%)',
        fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
        padding: '20px 16px 100px',
        color: '#f0f6fc',
      }}
    >
      <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>

      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <Link href="/" style={{ color: '#a78bfa', fontSize: 22, textDecoration: 'none' }}>←</Link>
        <div>
          <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>🏆 قاعة الشرف</h1>
          <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>أفضل البائعين عبر التاريخ</p>
        </div>
      </div>

      {/* Loading */}
      {loading && (
        <div style={{ display: 'flex', justifyContent: 'center', padding: 60 }}>
          <div style={{ width: 40, height: 40, border: '4px solid rgba(167,139,250,0.2)', borderTop: '4px solid #a78bfa', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div style={{ textAlign: 'center', padding: 40, background: 'rgba(239,68,68,0.1)', borderRadius: 16, border: '1px solid rgba(239,68,68,0.3)' }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>⚠️</div>
          <p style={{ color: '#fca5a5' }}>{error}</p>
        </div>
      )}

      {/* Winners list */}
      {!loading && !error && winners.length === 0 && (
        <div style={{ textAlign: 'center', padding: 60, color: '#64748b' }}>
          <div style={{ fontSize: 60, marginBottom: 12 }}>🏆</div>
          <p>لا يوجد فائزون سابقون بعد</p>
          <p style={{ fontSize: 13 }}>سيظهر هنا الفائز بعد نهاية أول شهر</p>
        </div>
      )}

      {!loading && !error && winners.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {winners.map((winner, idx) => {
            const rank = idx + 1;
            const monthLabel = getMonthLabel(winner.month, winner.year);
            return (
              <div
                key={winner._id || winner.month || idx}
                style={{
                  background: rank === 1
                    ? 'linear-gradient(135deg, rgba(251,191,36,0.15) 0%, rgba(245,158,11,0.1) 100%)'
                    : 'rgba(255,255,255,0.04)',
                  border: rank === 1 ? '1.5px solid rgba(251,191,36,0.4)' : '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 20,
                  padding: '18px 16px',
                  position: 'relative',
                  overflow: 'hidden',
                }}
              >
                {/* Rank badge */}
                <div style={{ position: 'absolute', top: 12, left: 12, fontSize: rank <= 3 ? 28 : 16, fontWeight: 'bold', color: rank === 1 ? '#fbbf24' : rank === 2 ? '#94a3b8' : rank === 3 ? '#cd7f32' : '#64748b' }}>
                  {rank === 1 ? '👑' : rank === 2 ? '🥈' : rank === 3 ? '🥉' : `#${rank}`}
                </div>

                {/* Month label */}
                {monthLabel && (
                  <div style={{ textAlign: 'center', marginBottom: 12, fontSize: 13, color: '#a78bfa', fontWeight: 600 }}>
                    📅 {monthLabel}
                  </div>
                )}

                {/* Winner info */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 14, justifyContent: 'center' }}>
                  {winner.avatar ? (
                    <img
                      src={winner.avatar}
                      alt={winner.name}
                      loading="lazy"
                      style={{ width: 60, height: 60, borderRadius: '50%', objectFit: 'cover', border: '2px solid #fbbf24' }}
                    />
                  ) : (
                    <div style={{ width: 60, height: 60, borderRadius: '50%', background: 'rgba(167,139,250,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 24, border: '2px solid rgba(167,139,250,0.4)' }}>
                      👤
                    </div>
                  )}
                  <div>
                    <a
                      href={winner.userId ? `/profile/${winner.userId}` : '#'}
                      style={{ fontWeight: 'bold', fontSize: 17, color: '#f0f6fc', textDecoration: 'none', display: 'block' }}
                    >
                      {winner.name || 'مجهول'}
                    </a>
                    {winner.xtoxId && (
                      <div style={{ fontSize: 12, color: '#64748b' }}>🆔 {winner.xtoxId}</div>
                    )}
                    <div style={{ fontSize: 13, color: '#fbbf24', fontWeight: 600 }}>
                      ⭐ {winner.points || winner.monthlyPoints || 0} نقطة
                    </div>
                    {winner.prize && (
                      <div style={{ fontSize: 12, color: '#86efac', marginTop: 2 }}>🎁 {winner.prize}</div>
                    )}
                  </div>
                </div>

                {/* Winner's top ads */}
                {winner.ads && winner.ads.length > 0 && (
                  <div style={{ marginTop: 14 }}>
                    <div style={{ fontSize: 12, color: '#64748b', marginBottom: 8 }}>أبرز إعلاناته:</div>
                    <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
                      {winner.ads.slice(0, 3).map(ad => (
                        <a
                          key={ad._id}
                          href={`/ads/${ad._id}`}
                          style={{ flex: '0 0 auto', background: 'rgba(255,255,255,0.06)', borderRadius: 10, padding: 8, textDecoration: 'none', color: '#f0f6fc', minWidth: 110 }}
                        >
                          {(ad.images?.[0] || ad.media?.[0]) && (
                            <img
                              src={ad.images?.[0] || ad.media?.[0]}
                              alt={ad.title}
                              loading="lazy"
                              style={{ width: '100%', height: 60, objectFit: 'cover', borderRadius: 7, marginBottom: 5 }}
                            />
                          )}
                          <div style={{ fontSize: 11, fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                            {ad.title}
                          </div>
                        </a>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
