'use client';
import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const ARABIC_MONTHS = [
  '', 'يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو',
  'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'
];

function TierBadge({ tier }) {
  const styles = {
    Platinum: { bg: '#e8f4fd', color: '#1e40af', emoji: '💎' },
    Gold:     { bg: '#fefce8', color: '#a16207', emoji: '🥇' },
    Silver:   { bg: '#f1f5f9', color: '#475569', emoji: '🥈' },
    Bronze:   { bg: '#fef3c7', color: '#92400e', emoji: '🥉' },
  };
  const s = styles[tier] || styles.Bronze;
  return (
    <span style={{
      background: s.bg,
      color: s.color,
      fontSize: 11,
      fontWeight: 700,
      padding: '2px 6px',
      borderRadius: 8,
      whiteSpace: 'nowrap',
    }}>
      {s.emoji} {tier}
    </span>
  );
}

function RankIcon({ rank }) {
  if (rank === 1) return <span style={{ fontSize: 22 }}>👑</span>;
  if (rank === 2) return <span style={{ fontSize: 20 }}>🥈</span>;
  if (rank === 3) return <span style={{ fontSize: 20 }}>🥉</span>;
  return (
    <span style={{
      width: 28, height: 28, borderRadius: '50%',
      background: 'rgba(255,255,255,0.15)',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      fontSize: 13, fontWeight: 700, color: '#cbd5e1',
    }}>
      {rank}
    </span>
  );
}

export default function Leaderboard() {
  const { t: tr, language, isRTL } = useLanguage();
  const [data, setData] = useState(null);
  const [expanded, setExpanded] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/winner/leaderboard`);
      if (!r.ok) throw new Error('not ok');
      const json = await r.json();
      setData(json);
    } catch {
      // Silently fail — leaderboard is non-critical
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
    // Refresh every 3 hours
    const interval = setInterval(load, 3 * 60 * 60 * 1000);
    return () => clearInterval(interval);
  }, [load]);

  const now = new Date();
  const monthName = ARABIC_MONTHS[now.getMonth() + 1];

  if (loading) return null;
  if (!data || !data.leaderboard || data.leaderboard.length === 0) return null;

  const visible = expanded ? data.leaderboard : data.leaderboard.slice(0, 3);

  return (
    <div style={{
      background: 'linear-gradient(135deg, #0f0a28 0%, #1a0a3d 50%, #0a1628 100%)',
      borderRadius: 20,
      margin: '16px 0',
      overflow: 'hidden',
      border: '1.5px solid rgba(139,92,246,0.25)',
      boxShadow: '0 8px 32px rgba(99,102,241,0.15)',
      direction: 'rtl',
    }}>
      {/* Header */}
      <div style={{
        padding: '16px 20px 12px',
        borderBottom: '1px solid rgba(255,255,255,0.08)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        <div>
          <div style={{ fontSize: 17, fontWeight: 800, color: '#f8fafc', letterSpacing: 0.3 }}>
            🏆 لوحة الشرف
          </div>
          <div style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
            {monthName} {now.getFullYear()}
          </div>
        </div>
        <button
          onClick={() => setExpanded(e => !e)}
          style={{
            background: 'rgba(139,92,246,0.2)',
            border: '1px solid rgba(139,92,246,0.4)',
            color: '#a78bfa',
            borderRadius: 8,
            padding: '5px 12px',
            fontSize: 12,
            fontWeight: 600,
            cursor: 'pointer',
            fontFamily: 'inherit',
          }}
        >
          {expanded ? tr('winner_see_less') : tr('winner_see_all')}
        </button>
      </div>

      {/* Rows */}
      <div style={{ padding: '8px 0' }}>
        {visible.map((user) => {
          const isTop3 = user.rank <= 3;
          return (
            <div
              key={user.userId}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 12,
                padding: '10px 20px',
                background: isTop3
                  ? user.rank === 1
                    ? 'linear-gradient(90deg, rgba(255,215,0,0.08) 0%, transparent 100%)'
                    : user.rank === 2
                    ? 'linear-gradient(90deg, rgba(192,192,192,0.06) 0%, transparent 100%)'
                    : 'linear-gradient(90deg, rgba(205,127,50,0.06) 0%, transparent 100%)'
                  : 'transparent',
                borderBottom: '1px solid rgba(255,255,255,0.04)',
                transition: 'background 0.2s',
              }}
            >
              {/* Rank icon */}
              <div style={{ minWidth: 32, textAlign: 'center' }}>
                <RankIcon rank={user.rank} />
              </div>

              {/* Avatar */}
              <div style={{
                width: 38, height: 38, borderRadius: '50%',
                background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 16, fontWeight: 700, color: 'white',
                flexShrink: 0,
                overflow: 'hidden',
                border: isTop3 ? '2px solid rgba(250,204,21,0.5)' : '2px solid rgba(255,255,255,0.1)',
              }}>
                {user.avatar
                  ? <img src={user.avatar} alt={user.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  : (user.name?.[0] || '؟')}
              </div>

              {/* Name + xtoxId */}
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{
                  fontSize: 14, fontWeight: 700,
                  color: isTop3 ? '#f8fafc' : '#cbd5e1',
                  whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
                }}>
                  {user.name || 'مستخدم'}
                </div>
                {user.xtoxId && (
                  <div style={{ fontSize: 11, color: '#64748b', marginTop: 1 }}>
                    {user.xtoxId}
                  </div>
                )}
              </div>

              {/* Tier + Points */}
              <div style={{ textAlign: 'left', flexShrink: 0 }}>
                <div style={{
                  fontSize: 15, fontWeight: 800,
                  color: user.rank === 1 ? '#fcd34d' : '#e2e8f0',
                }}>
                  {user.monthlyPoints} نقطة
                </div>
                <div style={{ marginTop: 2 }}>
                  <TierBadge tier={user.tier} />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Footer */}
      <div style={{
        padding: '10px 20px',
        borderTop: '1px solid rgba(255,255,255,0.06)',
        display: 'flex',
        justifyContent: 'center',
      }}>
        <span style={{ fontSize: 11, color: '#475569' }}>
          يتجدد الترتيب كل 3 ساعات • النقاط تُصفَّر كل أول شهر
        </span>
      </div>
    </div>
  );
}
