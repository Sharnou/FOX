'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// Month names for all 8 supported languages
const MONTH_NAMES = {
  ar: {
    '01':'يناير','02':'فبراير','03':'مارس','04':'أبريل',
    '05':'مايو','06':'يونيو','07':'يوليو','08':'أغسطس',
    '09':'سبتمبر','10':'أكتوبر','11':'نوفمبر','12':'ديسمبر',
  },
  en: {
    '01':'January','02':'February','03':'March','04':'April',
    '05':'May','06':'June','07':'July','08':'August',
    '09':'September','10':'October','11':'November','12':'December',
  },
  fr: {
    '01':'Janvier','02':'Février','03':'Mars','04':'Avril',
    '05':'Mai','06':'Juin','07':'Juillet','08':'Août',
    '09':'Septembre','10':'Octobre','11':'Novembre','12':'Décembre',
  },
  de: {
    '01':'Januar','02':'Februar','03':'März','04':'April',
    '05':'Mai','06':'Juni','07':'Juli','08':'August',
    '09':'September','10':'Oktober','11':'November','12':'Dezember',
  },
  tr: {
    '01':'Ocak','02':'Şubat','03':'Mart','04':'Nisan',
    '05':'Mayıs','06':'Haziran','07':'Temmuz','08':'Ağustos',
    '09':'Eylül','10':'Ekim','11':'Kasım','12':'Aralık',
  },
  es: {
    '01':'Enero','02':'Febrero','03':'Marzo','04':'Abril',
    '05':'Mayo','06':'Junio','07':'Julio','08':'Agosto',
    '09':'Septiembre','10':'Octubre','11':'Noviembre','12':'Diciembre',
  },
  ru: {
    '01':'Январь','02':'Февраль','03':'Март','04':'Апрель',
    '05':'Май','06':'Июнь','07':'Июль','08':'Август',
    '09':'Сентябрь','10':'Октябрь','11':'Ноябрь','12':'Декабрь',
  },
  zh: {
    '01':'一月','02':'二月','03':'三月','04':'四月',
    '05':'五月','06':'六月','07':'七月','08':'八月',
    '09':'九月','10':'十月','11':'十一月','12':'十二月',
  },
};

// CSS keyframes injected once
const SLIDE_IN_STYLE = `
@keyframes winnerBannerSlideIn {
  from { opacity: 0; transform: translateY(-20px) scale(0.97); }
  to   { opacity: 1; transform: translateY(0)     scale(1);    }
}
`;

export default function WinnerBanner() {
  const { t: tr, language, isRTL } = useLanguage();
  const [winner, setWinner] = useState(null);
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [dismissed, setDismissed] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rules, setRules] = useState([]);
  const [mounted, setMounted] = useState(false);
  const router = useRouter();

  // FIX B — Timing: only show after client mount to avoid SSR mismatch
  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    fetch(`${API}/api/winner/current`)
      .then(r => r.json())
      .then(d => {
        if (d.winner) {
          // Check if winner is from current month
          const now = new Date();
          const currentMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
          const winnerMonth = (d.winner.month || '').slice(0, 7); // YYYY-MM
          if (winnerMonth && winnerMonth !== currentMonthKey) {
            // Old winner — don't show banner
            return;
          }
          setWinner(d.winner);
          // FIX C — Persist dismiss state per winner+month key
          const dismissKey = `xtox_winner_dismissed_${d.winner._id}_${currentMonthKey}`;
          if (localStorage.getItem(dismissKey) === '1') {
            setDismissed(true);
          }
        }
      })
      .catch(() => {});
  }, []);

  useEffect(() => {
    fetch(`${API}/api/winner/rules`)
      .then(r => r.json())
      .then(d => { if (d.rules) setRules(d.rules); })
      .catch(() => {});
  }, []);

  const handleDismiss = () => {
    // FIX C — Persist dismiss state per winner+month (banner stays gone after reload)
    if (winner?._id) {
      try {
        const now = new Date();
        const currentMonthKey = now.getFullYear() + '-' + String(now.getMonth() + 1).padStart(2, '0');
        localStorage.setItem(`xtox_winner_dismissed_${winner._id}_${currentMonthKey}`, '1');
      } catch {}
    }
    setDismissed(true);
  };

  const handleCongratulate = async () => {
    let token;
    try { token = localStorage.getItem('xtox_token') || localStorage.getItem('token'); } catch {}
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

  // FIX B — Timing: don't render until mounted (avoids SSR hydration mismatch)
  if (!mounted || !winner || dismissed) return null;

  const [yr, mo] = (winner.month || '').split('-');
  // FIX D — RTL: use localized month names
  const monthNames = MONTH_NAMES[language] || MONTH_NAMES.en;
  const monthLabel = `${monthNames[mo] || ''} ${yr || ''}`.trim();

  // FIX A — RTL layout: close button position adapts to language direction
  // In RTL (Arabic), close button on physical left (end of reading direction)
  // In LTR, close button on physical right (end of reading direction)
  const closeStyle = isRTL
    ? { position: 'absolute', top: 10, left: 12 }
    : { position: 'absolute', top: 10, right: 12 };

  return (
    <>
      {/* FIX E — Animation: inject keyframes once */}
      <style>{SLIDE_IN_STYLE}</style>
      <div
        // FIX D — RTL layout: dir attribute driven by language context
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          background: 'linear-gradient(135deg, #fef3c7 0%, #fde68a 50%, #fbbf24 100%)',
          border: '2px solid #f59e0b',
          borderRadius: 20,
          padding: '20px 16px',
          margin: '16px 0',
          position: 'relative',
          // FIX F — Z-index: banner above page content but below modals
          zIndex: 100,
          boxShadow: '0 4px 24px rgba(245,158,11,0.2)',
          fontFamily: 'Cairo, sans-serif',
          // FIX E — Animation: slide in on mount
          animation: 'winnerBannerSlideIn 0.4s ease-out both',
        }}
      >
        {/* FIX A — RTL close button: position flips per isRTL */}
        <button
          onClick={handleDismiss}
          style={{
            ...closeStyle,
            background: 'rgba(0,0,0,0.1)', border: 'none', borderRadius: '50%',
            width: 28, height: 28, cursor: 'pointer', fontSize: 16,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
          aria-label={tr('btn_close')}
        >×</button>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 12 }}>
          <div style={{ fontSize: 36 }}>🏆</div>
          {/* FIX D — Translated title */}
          <div style={{ fontWeight: 'bold', fontSize: 18, color: '#92400e' }}>
            {tr('winner_seller_of_month')}{monthLabel ? ` — ${monthLabel}` : ''}
          </div>
          {winner.points > 0 && (
            <div style={{ fontSize: 13, color: '#a16207' }}>
              {winner.points} {tr('winner_reputation_pts')}
            </div>
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
              <div style={{ fontSize: 13, color: '#78716c' }}>
                ⭐ {winner.reputationPoints} {tr('winner_total_pts')}
              </div>
            )}
          </div>
        </div>

        {/* Winner's Top Ads */}
        {winner.ads && winner.ads.length > 0 && (
          <div style={{ marginBottom: 16 }}>
            {/* FIX D — Translated section header */}
            <div style={{ fontWeight: 'bold', fontSize: 14, color: '#92400e', marginBottom: 8 }}>
              {tr('winner_top_ads')}
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
                        {ad.price.toLocaleString()} {ad.currency || 'EGP'}
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
          style={{
            width: '100%', background: 'rgba(255,255,255,0.5)', border: '1px solid #fbbf24',
            borderRadius: 10, padding: '8px 12px', cursor: 'pointer', fontWeight: 'bold',
            fontSize: 14, color: '#92400e', marginBottom: 8, textAlign: 'center',
          }}
        >
          {rulesOpen ? tr('winner_rules_hide') : tr('winner_rules_show')}
        </button>

        {/* Rules List */}
        {rulesOpen && rules.length > 0 && (
          <div style={{ background: 'rgba(255,255,255,0.7)', borderRadius: 12, padding: '12px 14px', marginBottom: 10 }}>
            {rules.map((r, i) => (
              <div
                key={i}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '6px 0',
                  borderBottom: i < rules.length - 1 ? '1px solid rgba(0,0,0,0.06)' : 'none',
                }}
              >
                <span style={{ fontSize: 14, color: '#1c1917' }}>
                  {r.icon} {isRTL ? r.ar : (r.en || r.ar)}
                </span>
                <span style={{ fontWeight: 'bold', fontSize: 13, color: '#b45309', whiteSpace: 'nowrap', marginInlineStart: 8 }}>
                  {r.points}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* FIX D — Translated winner history link */}
        <a
          href="/winner-history"
          style={{
            display: 'block', textAlign: 'center', marginBottom: 8,
            color: '#92400e', fontSize: 13, fontWeight: 600, textDecoration: 'none',
          }}
        >
          {tr('winner_prev_list')}
        </a>

        {/* Congratulate Button — FIX D: uses tr() for all states */}
        <button
          onClick={handleCongratulate}
          disabled={sending || sent}
          style={{
            width: '100%',
            background: sent ? '#16a34a' : '#f59e0b',
            color: '#fff', border: 'none', borderRadius: 12, padding: '12px 0',
            fontWeight: 'bold', fontSize: 16,
            cursor: sent || sending ? 'default' : 'pointer',
            transition: 'background 0.2s',
            fontFamily: 'Cairo, sans-serif',
          }}
        >
          {sent
            ? tr('winner_congrats_sent')
            : sending
              ? tr('winner_congrats_sending')
              : tr('winner_congrats')}
        </button>
      </div>
    </>
  );
}
