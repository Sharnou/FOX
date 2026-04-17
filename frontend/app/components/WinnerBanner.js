'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const MONTH_NAMES = {
  '01': 'يناير', '02': 'فبراير', '03': 'مارس', '04': 'أبريل',
  '05': 'مايو', '06': 'يونيو', '07': 'يوليو', '08': 'أغسطس',
  '09': 'سبتمبر', '10': 'أكتوبر', '11': 'نوفمبر', '12': 'ديسمبر',
};

export default function WinnerBanner() {
  const { t: tr, language, isRTL } = useLanguage();
  const [winner, setWinner] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const router = useRouter();

  useEffect(() => {
    fetch(`${API}/api/winner/current`)
      .then(r => r.json())
      .then(d => { if (d.winner) setWinner(d.winner); })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/api/winner/rules`)
      .then(r => r.json())
      .then(d => { if (d.rules) setRules(d.rules); })
      .catch(() => {});
  }, []);

  const handleCongratulate = async () => {
    let token;
    try { token = localStorage.getItem('token'); } catch {}
    if (!token) { router.push('/login'); return; }
    setSending(true);
    try {
      const res = await fetch(`${API}/api/winner/congratulate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ winnerId: winner._id }),
      });
      const data = await res.json();
      if (data.ok) {
        setSent(true);
        setTimeout(() => router.push(`/chat?id=${data.chatId}`), 1200);
      }
    } catch {}
    setSending(false);
  };

  if (!winner || dismissed) return null;

  const [yr, mo] = (winner.month || '').split('-');
  const monthLabel = `${MONTH_NAMES[mo] || ''} ${yr || ''}`.trim();

  return (
    <div
      dir="rtl"
      style={{
        background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)',
        border: '2px solid #f59e0b',
        borderRadius: 20,
        padding: '20px 16px',
        margin: '16px 0',
        position: 'relative',
        boxShadow: '0 4px 24px rgba(245,158,11,0.2)',
        fontFamily: 'Cairo, sans-serif',
      }}
    >
      {/* Close */}
      <button
        onClick={() => setDismissed(true)}
        style={{
          position: 'absolute', top: 10, left: 12,
          background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%',
          width: 28, height: 28, cursor: 'pointer', fontSize: 16,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}
        aria-label={tr('btn_close')}
      >×</button>

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: 12 }}>
        <div style={{ fontSize: 36 }}>🏆</div>
        <div style={{ fontWeight: 'bold', fontSize: 18, color: '#92400e' }}>
          بائع الشهر{monthLabel ? ` — ${monthLabel}` : ''}
        </div>
        {winner.points > 0 && (
          <div style={{ fontSize: 13, color: '#a16207' }}>{winner.points} نقطة سمعة</div>
        )}
      </div>

      {/* Winner Profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, justifyContent: 'center' }}>
        {winner.avatar ? (
          <img
            src={winner.avatar}
            alt={winner.name}
            style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '3px solid #f59e0b' }}
          />
        ) : (
          <div style={{
            width: 64, height: 64, borderRadius: '50%', background: '#fde68a',
            border: '3px solid #f59e0b', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 28,
          }}>👤</div>
        )}
        <div>
          <div style={{ fontWeight: 'bold', fontSize: 16, color: '#1c1917' }}>{winner.name}</div>
          {winner.xtoxId && (
            <div style={{ fontSize: 13, color: '#78716c' }}>🆔 {winner.xtoxId}</div>
          )}
          {winner.reputationPoints > 0 && (
            <div style={{ fontSize: 13, color: '#78716c' }}>⭐ {winner.reputationPoints} نقطة إجمالية</div>
          )}
        </div>
      </div>

      {/* Winner's Top Ads */}
      {winner.ads && winner.ads.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 'bold', fontSize: 14, color: '#92400e', marginBottom: 8 }}>
            أبرز إعلاناته:
          </div>
          <div style={{ display: 'flex', gap: 8, overflowX: 'auto', paddingBottom: 4 }}>
            {winner.ads.map(ad => {
              const img = ad.images?.[0] || ad.media?.[0];
              return (
                <a
                  key={ad._id}
                  href={`/ads/${ad._id}`}
                  style={{
                    flex: '0 0 auto', background: '#fff', borderRadius: 12, padding: 10,
                    textDecoration: 'none', color: '#1c1917',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.08)', minWidth: 130, maxWidth: 150,
                  }}
                >
                  {img && (
                    <img
                      src={img}
                      alt={ad.title}
                      style={{ width: '100%', height: 70, objectFit: 'cover', borderRadius: 8, marginBottom: 6 }}
                    />
                  )}
                  <div style={{ fontSize: 12, fontWeight: 600 }}>{ad.title}</div>
                  {ad.price && (
                    <div style={{ fontSize: 11, color: '#f59e0b', fontWeight: 'bold' }}>
                      {ad.price.toLocaleString()} {ad.currency || 'ج.م'}
                    </div>
                  )}
                </a>
              );
            })}
          </div>
        </div>
      )}

      {/* Rules Toggle Button */}
      <button
        onClick={() => setRulesOpen(o => !o)}
        style={{ width: '100%', background: 'rgba(255,255,255,0.5)', border: '1px solid #fbbf24', borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontWeight: 'bold', fontSize: 14, color: '#92400e', marginBottom: 8, textAlign: 'center' }}
      >
        {rulesOpen ? tr('winner_rules_hide') : tr('winner_rules_show')}
      </button>

      {/* Rules List */}
      {rulesOpen && rules.length > 0 && (
        <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
          {rules.map((r, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '6px 0', borderBottom: i < rules.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none' }}>
              <span style={{ fontSize: 14, color: '#1c1917' }}>{r.icon} {r.ar}</span>
              <span style={{ fontWeight: 'bold', fontSize: 13, color: '#b45309', whiteSpace: 'nowrap', marginRight: 8 }}>{r.points}</span>
            </div>
          ))}
        </div>
      )}

      {/* Winner History Link */}
      <a
        href="/winner-history"
        style={{
          display: 'block',
          textAlign: 'center',
          marginBottom: 8,
          color: '#92400e',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
        }}
      >
        📜 قائمة الفائزين السابقين
      </a>

      {/* Congratulate Button */}
      <button
        onClick={handleCongratulate}
        disabled={sending || sent}
        style={{
          width: '100%',
          background: sent ? '#16a34a' : '#f59e0b',
          color: '#fff',
          border: 'none',
          borderRadius: 12,
          padding: '12px 0',
          fontWeight: 'bold',
          fontSize: 16,
          cursor: sent || sending ? 'default' : 'pointer',
          transition: 'background 0.2s',
          fontFamily: 'Cairo, sans-serif',
        }}
      >
        {sent ? tr('winner_congrats_sent') : sending ? '...' : tr('winner_congrats')}
      </button>
    </div>
  );
}
