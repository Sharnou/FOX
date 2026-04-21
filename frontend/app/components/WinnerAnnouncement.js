'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API;

const RANK_STYLES = {
  1: { emoji: '🥇', bg: 'linear-gradient(135deg, #f59e0b, #d97706)', label: 'بائع الشهر' },
  2: { emoji: '🥈', bg: 'linear-gradient(135deg, #94a3b8, #64748b)', label: 'المركز الثاني' },
  3: { emoji: '🥉', bg: 'linear-gradient(135deg, #cd7c54, #b45309)', label: 'المركز الثالث' },
};

export default function WinnerAnnouncement() {
  const [announcement, setAnnouncement] = useState(null);
  const [visible, setVisible] = useState(false);
  const socketRef = useRef(null);
  const mountedRef = useRef(true);

  // Check if announcement was already seen
  function isAlreadySeen(month) {
    try { return !!localStorage.getItem(`xtox_winner_seen_${month}`); } catch { return false; }
  }
  function markSeen(month) {
    try { localStorage.setItem(`xtox_winner_seen_${month}`, '1'); } catch {}
  }

  function show(data) {
    if (!mountedRef.current) return;
    if (!data?.month) return;
    if (isAlreadySeen(data.month)) return;
    setAnnouncement(data);
    setVisible(true);
  }

  // Socket listener for real-time winner:announced event
  useEffect(() => {
    mountedRef.current = true;
    let cancelled = false;

    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      const token = localStorage.getItem('xtox_token') || localStorage.getItem('token') || '';
      const socket = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
        reconnection: true,
      });
      socketRef.current = socket;
      socket.on('winner:announced', (data) => { if (!cancelled) show(data); });
    }).catch(() => {});

    return () => {
      cancelled = true;
      mountedRef.current = false;
      if (socketRef.current) { socketRef.current.disconnect(); socketRef.current = null; }
    };
  }, []);

  // Also poll /api/winner/latest on mount — show if announced in last 7 days
  useEffect(() => {
    async function checkLatest() {
      try {
        const token = localStorage.getItem('xtox_token') || localStorage.getItem('token') || '';
        const r = await fetch(`${API}/api/winner/latest`, {
          headers: token ? { Authorization: `Bearer ${token}` } : {},
        });
        if (!r.ok) return;
        const data = await r.json();
        if (!data?.month) return;
        if (isAlreadySeen(data.month)) return;
        const daysSince = (Date.now() - new Date(data.announcedAt)) / (1000 * 60 * 60 * 24);
        if (daysSince <= 7) show(data);
      } catch {}
    }
    // Small delay so page renders first
    const t = setTimeout(checkLatest, 2000);
    return () => clearTimeout(t);
  }, []);

  const dismiss = () => {
    if (announcement?.month) markSeen(announcement.month);
    setVisible(false);
  };

  if (!visible || !announcement) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(8px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      padding: '16px', animation: 'winnerFadeIn 0.3s ease',
    }}>
      <style>{`
        @keyframes winnerFadeIn { from { opacity:0; transform:scale(0.95) } to { opacity:1; transform:scale(1) } }
        @keyframes winnerConfetti { 0%{transform:translateY(-10px) rotate(0deg);opacity:1} 100%{transform:translateY(100vh) rotate(720deg);opacity:0} }
        .winner-card { transition: transform 0.2s, box-shadow 0.2s; }
        .winner-card:hover { transform: translateY(-2px); box-shadow: 0 8px 24px rgba(99,102,241,0.25) !important; }
      `}</style>

      {/* Confetti */}
      {[...Array(16)].map((_, i) => (
        <div key={i} style={{
          position: 'fixed', top: '-10px',
          left: `${(i * 6.25) % 100}%`,
          width: '8px', height: '8px', borderRadius: '50%',
          background: ['#f59e0b','#6366f1','#ec4899','#10b981','#f97316'][i % 5],
          animation: `winnerConfetti ${2.5 + (i % 3)}s linear ${(i % 4) * 0.4}s infinite`,
          pointerEvents: 'none',
        }} />
      ))}

      <div style={{
        background: 'white', borderRadius: '20px', padding: '28px 20px',
        maxWidth: '480px', width: '100%', textAlign: 'center', position: 'relative',
        dir: 'rtl', maxHeight: '90vh', overflowY: 'auto',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
      }}>
        {/* Close */}
        <button onClick={dismiss} style={{
          position: 'absolute', top: '12px', left: '12px',
          background: '#f1f5f9', border: 'none', borderRadius: '50%',
          width: '32px', height: '32px', cursor: 'pointer', fontSize: '18px',
          display: 'flex', alignItems: 'center', justifyContent: 'center', lineHeight: 1,
        }}>×</button>

        <div style={{ fontSize: '48px', marginBottom: '6px' }}>🏆</div>
        <h2 style={{ margin: '0 0 4px', fontSize: '20px', fontWeight: 800, color: '#1e293b' }}>
          فائزو الشهر
        </h2>
        <p style={{ color: '#64748b', margin: '0 0 20px', fontSize: '14px' }}>
          {announcement.monthName || announcement.month}
        </p>

        {/* Winners */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {(announcement.winners || []).map((winner) => {
            const rs = RANK_STYLES[winner.rank] || RANK_STYLES[3];
            const initials = (winner.name || winner.username || 'U')[0].toUpperCase();
            return (
              <div key={winner.rank} className="winner-card" style={{
                display: 'flex', alignItems: 'center', gap: '10px',
                background: '#f8fafc', borderRadius: '14px', padding: '12px',
                border: '1px solid #e2e8f0', cursor: 'default',
              }}>
                {/* Rank badge */}
                <div style={{
                  width: '34px', height: '34px', borderRadius: '50%',
                  background: rs.bg, display: 'flex', alignItems: 'center',
                  justifyContent: 'center', fontSize: '17px', flexShrink: 0,
                }}>{rs.emoji}</div>

                {/* Avatar */}
                <div style={{
                  width: '46px', height: '46px', borderRadius: '50%',
                  background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                  overflow: 'hidden', flexShrink: 0,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: 'white', fontWeight: 700, fontSize: '17px',
                }}>
                  {winner.avatar ? (
                    <img src={winner.avatar} alt={winner.name || ''}
                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                      onError={(e) => { e.target.style.display = 'none'; }} />
                  ) : initials}
                </div>

                {/* Info */}
                <div style={{ flex: 1, textAlign: 'right' }}>
                  <div style={{ fontWeight: 700, fontSize: '14px', color: '#1e293b' }}>
                    {winner.name || winner.username || 'مستخدم'}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6366f1', fontWeight: 600 }}>
                    {rs.label} · {(winner.reputationPoints || 0).toLocaleString()} نقطة
                  </div>
                  {winner.rewardDescription && (
                    <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>
                      {winner.rewardDescription}
                    </div>
                  )}
                </div>

                {/* Chat button */}
                {winner.userId && (
                  <a href={`/chat?userId=${winner.userId}`}
                    title="أرسل تهنئة"
                    onClick={dismiss}
                    style={{
                      width: '34px', height: '34px', borderRadius: '50%',
                      background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      color: 'white', textDecoration: 'none', flexShrink: 0, fontSize: '15px',
                    }}>💬</a>
                )}
              </div>
            );
          })}
        </div>

        <div style={{ marginTop: '18px', display: 'flex', gap: '10px', justifyContent: 'center' }}>
          <a href="/winner-history" onClick={dismiss} style={{
            padding: '10px 18px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
            color: 'white', borderRadius: '10px', textDecoration: 'none',
            fontWeight: 700, fontSize: '13px',
          }}>📜 لوحة الشرف</a>
          <button onClick={dismiss} style={{
            padding: '10px 18px', background: '#f1f5f9', border: 'none',
            borderRadius: '10px', cursor: 'pointer', fontWeight: 600,
            fontSize: '13px', color: '#64748b', fontFamily: 'inherit',
          }}>حسناً</button>
        </div>
      </div>
    </div>
  );
}
