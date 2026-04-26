'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VerifiedBadge from '../components/VerifiedBadge';
import MicPermissionCard from '../components/MicPermissionCard';
import { COUNTRIES, detectCountry } from '../utils/geoDetect';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

function getTierBadge(pts) {
  if (pts >= 500) return '💎 Platinum';
  if (pts >= 200) return '🥇 Gold';
  if (pts >= 50)  return '🥈 Silver';
  return '🥉 Bronze';
}
function getTierColor(pts) {
  if (pts >= 500) return '#1e40af';
  if (pts >= 200) return '#a16207';
  if (pts >= 50)  return '#475569';
  return '#92400e';
}
function getTierBg(pts) {
  if (pts >= 500) return '#e8f4fd';
  if (pts >= 200) return '#fefce8';
  if (pts >= 50)  return '#f1f5f9';
  return '#fef3c7';
}


export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');
  // Received reviews state
  const [myReviews, setMyReviews] = React.useState([]);
  const [myAvgRating, setMyAvgRating] = React.useState(0);
  const [myReviewCount, setMyReviewCount] = React.useState(0);
  const [myReviewsLoaded, setMyReviewsLoaded] = React.useState(false);

  // ── FIX 4: Chat toggle state ──────────────────────────────────────────
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatToggling, setChatToggling] = useState(false);

  // ── Sound mute state ──────────────────────────────────────────────────
  const [soundMuted, setSoundMuted] = useState(false);

  // ── My Ads state ──────────────────────────────────────────────────────
  const [myAds, setMyAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);

  // ── Winner state ──────────────────────────────────────────────────────
  const [isCurrentWinner, setIsCurrentWinner] = useState(false);

  // ── Points History state ───────────────────────────────────────────────
  const [pointsHistoryOpen, setPointsHistoryOpen] = useState(false);
  const [pointsHistoryLoaded, setPointsHistoryLoaded] = useState(false);
  const [pointsHistoryLoading, setPointsHistoryLoading] = useState(false);
  const [pointsHistory, setPointsHistory] = useState([]);

  // ── Call History state ─────────────────────────────────────────────────────
  const [callHistory, setCallHistory] = useState([]);


  const getToken = () =>
    localStorage.getItem('xtox_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('xtox_admin_token') ||
    localStorage.getItem('authToken') || '';

  async function handleLogout() {
    // Step 1: Notify backend (stateless JWT — backend just acknowledges)
    try {
      const tok = getToken();
      if (tok) {
        await fetch(API + '/api/auth/logout', {
          method: 'POST',
          headers: { 'Authorization': 'Bearer ' + tok, 'Content-Type': 'application/json' },
        }).catch(() => {});
      }
    } catch (_) {}
    // Step 2: Clear all auth state from localStorage (#153)
    try {
      const keysToRemove = [
        'xtox_token', 'token', 'fox_token', 'xtox_admin_token', 'authToken',
        'xtoxId', 'xtoxEmail', 'userName', 'userId', 'userAvatar',
        'user', 'xtox_user', 'xtox_admin_user', 'country',
      ];
      keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    } catch {}
    // Step 3: Clear IndexedDB (SW auth token) (#153)
    try {
      if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('xtox-auth');
    } catch (_) {}
    // Step 4: Unsubscribe push notifications (#153)
    try {
      if ('serviceWorker' in navigator) {
        const reg = await navigator.serviceWorker.ready.catch(() => null);
        if (reg) {
          const sub = await reg.pushManager.getSubscription().catch(() => null);
          if (sub) await sub.unsubscribe().catch(() => {});
        }
      }
    } catch (_) {}
    // Step 5: Redirect to login
    router.push('/login');
  }

  useEffect(() => {
    let token;
    try { token = getToken(); } catch { router.push('/login'); return; }
    if (!token) { router.push('/login'); return; }

    // ── FIX: Read cached user from localStorage first (instant render) ──
    try {
      const cached = JSON.parse(localStorage.getItem('user') || 'null');
      if (cached) {
        setUser(cached);
        setForm({
          username: cached.username || cached.name || '',
          email: cached.email || '',
          phone: cached.phone || '',
          city: cached.city || '',
          bio: cached.bio || '',
          gender: cached.gender || '',
          country: cached.country || '',
        });
        setChatEnabled(cached.chatEnabled !== false);
        setLoading(false); // show cached data immediately — no blank screen
      }
    } catch (_) {}

    // ── Background-refresh from API with timeout (8 s) to prevent stuck loading ──
    const ctrl = new AbortController();
    const timeout = setTimeout(() => { ctrl.abort(); }, 8000);

    fetch(API + '/api/users/me', {
      headers: { Authorization: 'Bearer ' + token },
      signal: ctrl.signal
    })
      .then(async r => {
        clearTimeout(timeout);
        if (r.status === 401 || r.status === 403) {
          try {
            ['token','xtox_token','xtox_admin_token','authToken','user'].forEach(k => localStorage.removeItem(k));
          } catch {}
          router.push('/login');
          return null;
        }
        return r.json();
      })
      .then(data => {
        if (!data) return;
        const u = data.user || data;
        setUser(u);
        setForm({
          username: u.username || u.name || '',
          email: u.email || '',
          phone: u.phone || '',
          city: u.city || '',
          bio: u.bio || '',
          gender: u.gender || '',
        });
        setChatEnabled(u.chatEnabled !== false);
        // ── FIX: preserve token when caching user object ──
        try {
          localStorage.setItem('user', JSON.stringify(Object.assign({}, u, { token: token })));
        } catch {}
      })
      .catch(() => {}) // on network error: keep showing cached data, don't redirect
      .finally(() => { clearTimeout(timeout); setLoading(false); });
  }, []);

  // ── Fetch My Ads when user is loaded ─────────────────────────────────
  // Load received reviews
  React.useEffect(() => {
    if (!user || !user._id) return;
    const _revCtrl = new AbortController();
    const _revTimer = setTimeout(() => _revCtrl.abort(), 8000);
    fetch(`${API}/api/reviews/seller/${user._id}`, { signal: _revCtrl.signal })
      .then(r => { clearTimeout(_revTimer); return r.ok ? r.json() : null; })
      .then(d => {
        if (d) {
          setMyReviews(d.reviews || []);
          setMyAvgRating(d.avgRating || 0);
          setMyReviewCount(d.totalCount || 0);
        }
        setMyReviewsLoaded(true);
      })
      .catch(() => setMyReviewsLoaded(true));
    }, [user?._id]);

  // FIX Bug 2: use stable primitive userId string as dep, not the whole user object
  const userId = (user?._id || user?.id) ?? null;
  useEffect(() => {
    if (!userId || typeof userId !== 'string' || userId.length < 5) return;
    let cancelled = false;
    setAdsLoading(true);
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), 8000);
    // Use /api/ads/my/all which correctly matches both userId and seller fields
    fetch(API + '/api/ads/my/all', {
      headers: { Authorization: 'Bearer ' + getToken() },
      signal: ctrl.signal,
    })
      .then(r => r.ok ? r.json() : { active: [], expired: [] })
      .then(data => {
        if (cancelled) return;
        // /api/ads/my/all returns { active, expired } — combine both for display
        const active = Array.isArray(data.active) ? data.active : [];
        const expired = Array.isArray(data.expired) ? data.expired : [];
        setMyAds([...active, ...expired]);
      })
      .catch(() => {})
      .finally(() => { clearTimeout(timer); if (!cancelled) setAdsLoading(false); });
    return () => { cancelled = true; ctrl.abort(); };
  }, [userId]);

  // ── Fetch call history ────────────────────────────────────────────────
  useEffect(() => {
    const token = typeof window !== 'undefined' ? (localStorage.getItem('xtox_token') || localStorage.getItem('token') || '') : '';
    if (!token || !userId) return;
    fetch(API + '/api/calls/history', { headers: { Authorization: 'Bearer ' + token } })
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) && setCallHistory(data))
      .catch(() => {});
  }, [userId]);

  // ── Initialize soundMuted from localStorage ───────────────────────────
  useEffect(() => {
    setSoundMuted(localStorage.getItem('xtox_mute_sounds') === 'true');
  }, []);

  const deleteMyAd = async (adId) => {
    if (!confirm('هل تريد حذف هذا الإعلان؟')) return;
    try {
      const res = await fetch(API + '/api/ads/' + adId, {
        method: 'DELETE',
        headers: { Authorization: 'Bearer ' + getToken() }
      });
      if (res.ok) setMyAds(prev => prev.filter(a => a._id !== adId));
    } catch {}
  };

  const markAdAsSold = async (adId) => {
    if (!confirm('هل تريد تحديد هذا الإعلان كـ «تم البيع»؟ سيتم إغلاق جميع المحادثات المرتبطة به.')) return;
    try {
      const res = await fetch(API + '/api/ads/' + adId + '/sold', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + getToken() }
      });
      if (res.ok) {
        setMyAds(prev => prev.map(a => a._id === adId ? { ...a, status: 'sold', isExpired: true } : a));
      }
    } catch {}
  };

  const save = async () => {
    setSaving(true); setMsg('');
    try {
      const token = getToken();
      const res = await fetch(API + '/api/users/me', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token, 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.error || 'فشل الحفظ');
      const updated = data.user || { ...user, ...form };
      setUser(u => ({ ...u, ...updated }));
      try { localStorage.setItem('user', JSON.stringify(Object.assign({}, user, updated, { token: getToken() }))); } catch {}
      setEditing(false);
      setMsg('✅ تم الحفظ بنجاح');
    } catch (e) { setMsg('❌ ' + e.message); }
    finally { setSaving(false); }
  };

  const toggleChat = async () => {
    if (chatToggling) return;
    setChatToggling(true);
    try {
      const token = getToken();
      const res = await fetch(API + '/api/users/chat-toggle', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + token }
      });
      const data = await res.json();
      const newVal = res.ok ? data.chatEnabled : !chatEnabled;
      setChatEnabled(newVal);
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        u.chatEnabled = newVal;
        localStorage.setItem('user', JSON.stringify(u));
      } catch {}
    } catch {
      setChatEnabled(prev => !prev);
    } finally {
      setChatToggling(false);
    }
  };

  if (loading) return (
    <div style={{ textAlign: 'center', padding: 60, fontSize: 24, minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      ⏳ جاري التحميل...
    </div>
  );
  if (!user) return null;

  const initials = (user.username || user.name || user.email || '?')[0].toUpperCase();

  // #155: Detect new user (createdAt within 7 days)
  const isNewUser = user.createdAt
    ? (Date.now() - new Date(user.createdAt).getTime()) < 7 * 24 * 60 * 60 * 1000
    : false;

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
      <button onClick={() => router.back()} style={{ marginBottom: 16, background: 'none', border: 'none', color: '#6366f1', fontWeight: 'bold', cursor: 'pointer', fontSize: 16 }}>
        ← رجوع
      </button>

      {/* #155: New user welcome banner (first 7 days) */}
      {isNewUser && (
        <div style={{ background: 'linear-gradient(135deg,#FF6B35,#f59e0b)', borderRadius: 16, padding: '16px 20px', marginBottom: 20, color: '#fff', display: 'flex', alignItems: 'center', gap: 14, boxShadow: '0 4px 18px rgba(255,107,53,0.3)' }}>
          <span style={{ fontSize: 32 }}>🎉</span>
          <div>
            <p style={{ margin: 0, fontWeight: 700, fontSize: 16 }}>مرحباً بك في XTOX!</p>
            <p style={{ margin: '4px 0 0', fontSize: 13, opacity: 0.9 }}>أضف إعلانك الأول الآن وابدأ رحلتك في البيع والشراء</p>
            <a href="/sell" style={{ display: 'inline-block', marginTop: 10, padding: '6px 16px', background: '#fff', color: '#FF6B35', borderRadius: 20, fontSize: 13, fontWeight: 700, textDecoration: 'none' }}>
              + أضف إعلانك الأول
            </a>
          </div>
        </div>
      )}

      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'white', margin: '0 auto 12px', overflow: 'hidden', flexShrink: 0 }}>
            {user?.avatar ? (
              <img
                src={user.avatar}
                alt={user.name || user.username || ''}
                style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '50%' }}
                onError={e => { e.target.style.display = 'none'; }}
              />
            ) : initials}
          </div>
          <h2 style={{ margin: '0 0 4px', fontSize: 22, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, flexWrap: 'wrap' }}>
            {user.username || user.name || user.email}
            <VerifiedBadge emailVerified={user.emailVerified} whatsappVerified={user.whatsappVerified} />
          </h2>
          <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
            {user.role === 'admin' ? '👑 مدير' : user.role === 'sub_admin' ? '🔧 مشرف' : '👤 مستخدم'}
          </p>

          {/* Verification status */}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'center', marginTop: 8, flexWrap: 'wrap' }}>
            {user.whatsappVerified
              ? <span style={{ background: '#dcfce7', color: '#16a34a', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ واتساب موثق</span>
              : <span style={{ background: '#fef9c3', color: '#ca8a04', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>واتساب غير موثق</span>
            }
            {user.emailVerified
              ? <span style={{ background: '#dbeafe', color: '#1d4ed8', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>✓ بريد إلكتروني موثق</span>
              : <span style={{ background: '#f1f5f9', color: '#64748b', fontSize: 12, fontWeight: 600, padding: '3px 10px', borderRadius: 20 }}>بريد غير موثق</span>
            }
          </div>

          {/* XTOX Unique ID */}
          {(user.xtoxId) && (
            <div style={{ marginTop: 10, padding: '6px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 10, display: 'inline-block' }}>
              <span style={{ fontSize: 12, color: '#15803d', fontWeight: 600 }}>
                🆔 معرّفك: <strong style={{ letterSpacing: 1, fontFamily: 'monospace' }}>{user.xtoxId}</strong>
              </span>
            </div>
          )}

          {/* Mic Permission */}
          <MicPermissionCard />

          {/* Winner Crown Badge */}
          {isCurrentWinner && (
            <div style={{ background: 'linear-gradient(135deg, #fcd34d, #f59e0b)', borderRadius: 16, padding: '12px 20px', margin: '8px 0', color: '#78350f', display: 'flex', alignItems: 'center', gap: 10, direction: 'rtl', justifyContent: 'center', boxShadow: '0 4px 16px rgba(245,158,11,0.4)' }}>
              <span style={{ fontSize: 28 }}>👑</span>
              <div style={{ fontWeight: 800, fontSize: 16 }}>الفائز هذا الشهر!</div>
            </div>
          )}

          {/* Reputation Points + Tier */}
          {user.reputationPoints > 0 && (
            <div style={{ background: 'linear-gradient(135deg, #fbbf24, #f59e0b)', borderRadius: 16, padding: '16px 20px', margin: '12px 0', color: '#fff', display: 'flex', alignItems: 'center', gap: 12, direction: 'rtl', justifyContent: 'center' }}>
              <span style={{ fontSize: 32 }}>⭐</span>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: 18 }}>{user.reputationPoints} نقطة سمعة</div>
                <div style={{ fontSize: 13, opacity: 0.9 }}>هذا الشهر: {user.monthlyPoints || 0} نقطة</div>
                <div style={{ marginTop: 6 }}>
                  <span style={{
                    background: getTierBg(user.reputationPoints),
                    color: getTierColor(user.reputationPoints),
                    fontSize: 12, fontWeight: 700,
                    padding: '3px 10px', borderRadius: 10,
                  }}>
                    {getTierBadge(user.reputationPoints)}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Chat Toggle */}
        <div style={{ background: '#f9fafb', borderRadius: 12, padding: '14px 16px', marginBottom: 20, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div style={{ fontWeight: 600, color: '#1a1a2e', fontSize: 14 }}>💬 السماح بالمحادثة</div>
            <div style={{ fontSize: 12, color: '#666', marginTop: 2 }}>السماح للمشترين بمراسلتك مباشرة</div>
          </div>
          <button
            disabled={chatToggling}
            onClick={toggleChat}
            style={{
              width: 52, height: 28, borderRadius: 14, border: 'none', cursor: chatToggling ? 'not-allowed' : 'pointer',
              background: chatEnabled ? 'linear-gradient(135deg, #6366f1, #8b5cf6)' : '#d1d5db',
              transition: 'background 0.3s', position: 'relative', opacity: chatToggling ? 0.7 : 1,
            }}
          >
            <div style={{
              width: 22, height: 22, borderRadius: '50%', background: 'white',
              position: 'absolute', top: 3,
              right: chatEnabled ? 3 : undefined,
              left: chatEnabled ? undefined : 3,
              transition: 'all 0.3s',
            }} />
          </button>
        </div>

        {/* Sound settings */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f1f5f9' }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: 14, color: '#1e293b' }}>
              🔔 {'صوت الإشعارات'}
            </div>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>
              {'تشغيل و إيقاف أصوات الرسائل'}
            </div>
          </div>
          <button onClick={async () => {
            const newVal = !soundMuted;
            setSoundMuted(newVal);
            localStorage.setItem('xtox_mute_sounds', newVal ? 'true' : 'false');
            const token = localStorage.getItem('xtox_token') || localStorage.getItem('token');
            if (token) {
              fetch(`${API}/api/chat/sound-settings`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                body: JSON.stringify({ muteSounds: newVal })
              }).catch(() => {});
            }
          }} style={{
            width: 48, height: 26, borderRadius: 13, border: 'none', cursor: 'pointer',
            background: soundMuted ? '#e2e8f0' : '#7c3aed', transition: 'background 0.2s',
            position: 'relative'
          }}>
            <div style={{
              width: 20, height: 20, borderRadius: '50%', background: '#fff',
              position: 'absolute', top: 3, transition: 'left 0.2s',
              left: soundMuted ? 4 : 24, boxShadow: '0 1px 4px rgba(0,0,0,0.2)'
            }} />
          </button>
        </div>

        {msg && (
          <div style={{ textAlign: 'center', marginBottom: 16, padding: 10, borderRadius: 10, background: msg.includes('✅') ? '#d1fae5' : '#fee2e2', color: msg.includes('✅') ? '#065f46' : '#991b1b' }}>
            {msg}
          </div>
        )}

        {!user.gender && (
          <div style={{
            marginBottom: 18,
            padding: '14px 16px',
            background: 'linear-gradient(135deg,#fef3c7,#fde68a)',
            border: '2px solid #f59e0b',
            borderRadius: 12,
            color: '#78350f',
            fontSize: 14,
            fontWeight: 600,
            lineHeight: 1.7,
            textAlign: 'right',
          }}>
            ⚠️ <strong>إكمال إلزامي:</strong> الرجاء تحديد الجنس لإكمال ملفك الشخصي والحصول على مكافأة <strong>+10 نقاط</strong>.
            <br />
            <span style={{ fontSize: 12, color: '#92400e', fontWeight: 500 }}>
              Profile completion required: please select your gender to receive +10 points bonus.
            </span>
          </div>
        )}

        {!editing ? (
          <>
            {[
              ['📧 البريد', user.email],
              ['📱 الواتساب', user.phone || '—'],
              ['🏙️ المدينة', user.city || '—'],
              ['🌍 البلد', user.country && COUNTRIES[user.country] 
                ? `${COUNTRIES[user.country].flag} ${COUNTRIES[user.country].name}` 
                : user.country || '—'],
              ['📝 نبذة', user.bio || '—'],
              ['👤 الجنس', user.gender === 'male' ? '👨 ذكر' : user.gender === 'female' ? '👩 أنثى' : user.gender === 'prefer_not_to_say' ? '🤐 يفضل عدم القول' : '— (غير محدد)'],
            ].map(([label, value]) => (
              <div key={label} style={{ display: 'flex', padding: '12px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ width: 110, color: '#888', fontSize: 14, flexShrink: 0 }}>{label}</span>
                <span style={{ flex: 1, fontSize: 14, wordBreak: 'break-all' }}>{value}</span>
              </div>
            ))}

            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={() => { setEditing(true); setMsg(''); }}
                style={{ flex: 1, padding: 12, background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: 'white', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 16, fontWeight: 'bold' }}>
                ✏️ تعديل الملف الشخصي
              </button>
              <Link href="/sell" style={{ flex: 1, padding: 12, background: '#f3f4f6', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#374151' }}>
                ➕ إعلان جديد
              </Link>
            </div>
            <button
              onClick={handleLogout}
              style={{ width: '100%', marginTop: 12, padding: 12, background: '#fff0f0', color: '#dc2626', border: '1.5px solid #fecaca', borderRadius: 12, cursor: 'pointer', fontSize: 15, fontWeight: 'bold', fontFamily: 'inherit' }}>
              🚪 تسجيل الخروج
            </button>
          </>
        ) : (
          <>
            {[
              ['username', 'اسم المستخدم', 'text'],
              ['phone', 'رقم الواتساب (يظهر على إعلاناتك)', 'tel'],
              ['city', 'المدينة', 'text'],
              ['bio', 'نبذة عنك', 'text'],
            ].map(([key, label, type]) => (
              <div key={key} style={{ marginBottom: 14 }}>
                <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#555' }}>{label}</label>
                <input
                  type={type}
                  value={form[key] || ''}
                  onChange={e => setForm(f => ({ ...f, [key]: e.target.value }))}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box' }}
                />
              </div>
            ))}
            {/* Gender selector — MANDATORY */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#555', fontWeight: 600 }}>
                👤 الجنس <span style={{ color: '#dc2626' }}>*</span>
                <span style={{ color: '#94a3b8', fontSize: 11, fontWeight: 400, marginRight: 6 }}>
                  (Gender — required)
                </span>
              </label>
              <select
                value={form.gender || ''}
                onChange={e => setForm(f => ({ ...f, gender: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: form.gender ? '1px solid #ddd' : '2px solid #f59e0b', fontSize: 14, boxSizing: 'border-box', direction: 'rtl', background: form.gender ? '#fff' : '#fffbeb' }}
              >
                <option value="">— اختر / Select —</option>
                <option value="male">👨 ذكر / Male</option>
                <option value="female">👩 أنثى / Female</option>
                <option value="prefer_not_to_say">🤐 يفضل عدم القول / Prefer not to say</option>
              </select>
              {!form.gender && (
                <p style={{ fontSize: 11, color: '#b45309', margin: '4px 0 0', textAlign: 'right' }}>
                  ⚠️ هذا الحقل مطلوب لإكمال الملف الشخصي
                </p>
              )}
            </div>
            {/* Country selector */}
            <div style={{ marginBottom: 14 }}>
              <label style={{ display: 'block', marginBottom: 6, fontSize: 13, color: '#555' }}>🌍 البلد</label>
              <select
                value={form.country || 'EG'}
                disabled
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, boxSizing: 'border-box', background: '#f9fafb', direction: 'rtl', cursor: 'not-allowed', color: '#6b7280' }}
              >
                {Object.entries(COUNTRIES).map(([code, info]) => (
                  <option key={code} value={code}>
                    {info.flag} {info.name}
                  </option>
                ))}
              </select>
              <p style={{ fontSize: 11, color: '#94a3b8', margin: '4px 0 0', textAlign: 'right' }}>
                🔒 البلد مقفل — المنصة مخصصة لمصر فقط
              </p>
            </div>
            <div style={{ display: 'flex', gap: 10, marginTop: 20 }}>
              <button onClick={save} disabled={saving}
                style={{ flex: 1, padding: 12, background: '#10b981', color: 'white', border: 'none', borderRadius: 12, cursor: saving ? 'not-allowed' : 'pointer', fontSize: 15, fontWeight: 'bold', opacity: saving ? 0.7 : 1 }}>
                {saving ? '⏳ جاري الحفظ...' : '💾 حفظ'}
              </button>
              <button onClick={() => { setEditing(false); setMsg(''); }}
                style={{ flex: 1, padding: 12, background: '#f3f4f6', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 15 }}>
                إلغاء
              </button>
            </div>
          </>
        )}
      </div>


      {/* ── Points History Section ────────────────────────────────────────────── */}
      <div style={{ marginTop: 24, background: 'white', borderRadius: 16, boxShadow: '0 2px 12px rgba(0,0,0,0.06)', overflow: 'hidden' }}>
        <button
          onClick={async () => {
            setPointsHistoryOpen(o => !o);
            if (!pointsHistoryLoaded && !pointsHistoryOpen) {
              setPointsHistoryLoading(true);
              try {
                const token = getToken();
                const res = await fetch(API + '/api/users/me/points-history', {
                  headers: { Authorization: 'Bearer ' + token }
                });
                const data = await res.json();
                setPointsHistory(data.pointsHistory || []);
                setPointsHistoryLoaded(true);
              } catch (err) {
                console.error(err);
                setPointsHistory([]);
              } finally {
                setPointsHistoryLoading(false);
              }
            }
          }}
          style={{ width: '100%', padding: '16px 20px', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'space-between', fontFamily: 'inherit' }}
        >
          <span style={{ fontWeight: 'bold', fontSize: 16, color: '#1a1a2e' }}>📜 سجل النقاط</span>
          <span style={{ color: '#888' }}>{pointsHistoryOpen ? '▲' : '▼'}</span>
        </button>
        {pointsHistoryOpen && (
          <div style={{ borderTop: '1px solid #f0f0f0', padding: '12px 16px' }}>
            {pointsHistoryLoading ? (
              <div style={{ display: 'flex', justifyContent: 'center', padding: 20 }}>
                <div style={{ width: 28, height: 28, border: '3px solid #e2e8f0', borderTop: '3px solid #6366f1', borderRadius: '50%', animation: 'spin 0.8s linear infinite' }} />
                <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
              </div>
            ) : pointsHistory.length === 0 ? (
              <p style={{ color: '#888', textAlign: 'center', padding: 12 }}>لا يوجد سجل بعد</p>
            ) : (
              <div>
                {pointsHistory.map((entry, i) => (
                  <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '8px 0', borderBottom: i < pointsHistory.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
                    <div>
                      <div style={{ fontSize: 14, color: '#333' }}>{entry.reason}</div>
                      <div style={{ fontSize: 11, color: '#999' }}>{entry.date ? new Date(entry.date).toLocaleDateString('ar-EG') : ''}</div>
                    </div>
                    <div style={{ fontWeight: 'bold', fontSize: 15, color: entry.points >= 0 ? '#16a34a' : '#dc2626' }}>
                      {entry.points >= 0 ? '+' : ''}{entry.points}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* ── My Ads Section ────────────────────────────────────────────── */}
      <div style={{ marginTop: 24 }}>
        <h3 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1a1a2e' }}>
          📢 إعلاناتي ({myAds.length})
        </h3>
        {adsLoading && (
          <p style={{ color: '#888', textAlign: 'center', padding: 20 }}>⏳ جاري التحميل...</p>
        )}
        {!adsLoading && myAds.length === 0 && (
          <div style={{ textAlign: 'center', padding: 32, background: 'white', borderRadius: 16, color: '#888', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>📭</div>
            <p style={{ margin: '0 0 12px' }}>لا توجد إعلانات بعد</p>
            <Link href="/sell" style={{ color: '#6366f1', fontWeight: 'bold', textDecoration: 'none' }}>+ أضف إعلانك الأول</Link>
          </div>
        )}
        {myAds.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(160px, 1fr))', gap: 12 }}>
            {myAds.map(ad => {
              const img = ad?.images?.[0] || ad?.media?.[0] || ad?.image || null;
              return (
                <div key={ad._id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                  <div style={{ height: 100, background: '#f3f4f6', position: 'relative' }}>
                    {img ? (
                      <img
                        src={img}
                        alt={ad.title}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        onError={e => { e.target.style.display = 'none'; }}
                      />
                    ) : (
                      <div style={{ height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28, color: '#ccc' }}>📷</div>
                    )}
                    {ad.isDeleted && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#ef4444', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 6 }}>محذوف</div>
                    )}
                    {ad.status === 'sold' && !ad.isDeleted && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#1d4ed8', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 6 }}>تم البيع ✓</div>
                    )}
                    {ad.isExpired && !ad.isDeleted && ad.status !== 'sold' && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#f59e0b', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 6 }}>منتهي</div>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</p>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6366f1', fontWeight: 'bold' }}>{ad.price} {ad.currency || 'EGP'}</p>
                    <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                      <a
                        href={'/ads/' + ad._id}
                        style={{ flex: 1, textAlign: 'center', padding: '4px', background: '#f3f4f6', borderRadius: 8, fontSize: 11, textDecoration: 'none', color: '#333' }}
                      >
                        عرض
                      </a>
                      {!ad.isDeleted && ad.status !== 'sold' && (
                        <a
                          href={'/edit-ad/' + ad._id}
                          style={{ flex: 1, textAlign: 'center', padding: '4px', background: '#f0fdf4', borderRadius: 8, fontSize: 11, textDecoration: 'none', color: '#16a34a', fontWeight: 'bold' }}
                        >
                          ✏️ تعديل
                        </a>
                      )}
                      {ad.status !== 'sold' && !ad.isDeleted && (
                        <button
                          onClick={() => markAdAsSold(ad._id)}
                          title="تحديد الإعلان كـ تم البيع — سيتم إغلاق كل المحادثات"
                          style={{ flex: 1, padding: '4px', background: '#dbeafe', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', color: '#1d4ed8', fontFamily: 'inherit' }}
                        >
                          تم البيع
                        </button>
                      )}
                      <button
                        onClick={() => deleteMyAd(ad._id)}
                        style={{ flex: 1, padding: '4px', background: '#fee2e2', border: 'none', borderRadius: 8, fontSize: 11, cursor: 'pointer', color: '#dc2626' }}
                      >
                        حذف
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Call History Section ─────────────────────────────────────────── */}
      {callHistory.length > 0 && (
        <div style={{ margin: '24px 0', background: 'white', borderRadius: 16, padding: '20px', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
          <h3 style={{ fontWeight: 700, marginBottom: 12, fontSize: 18, color: '#1a1a2e' }}>📞 سجل المكالمات</h3>
          {callHistory.slice(0, 20).map(call => {
            const myId = user?._id || user?.id;
            const isOutgoing = call.callerId?._id === myId || String(call.callerId?._id) === String(myId);
            const other = isOutgoing ? call.receiverId : call.callerId;
            const mins = Math.floor((call.durationSeconds || 0) / 60);
            const secs = (call.durationSeconds || 0) % 60;
            const answered = !!call.answeredAt;
            return (
              <div key={call._id} style={{
                display: 'flex', alignItems: 'center', gap: 12,
                padding: '10px 0', borderBottom: '1px solid #f0f0f0'
              }}>
                <span style={{ fontSize: 20 }}>{isOutgoing ? '📞' : '📲'}</span>
                {other?.avatar ? (
                  <img src={other.avatar} alt=""
                    style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }} />
                ) : (
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 15, flexShrink: 0 }}>
                    {(other?.name?.[0] || '?').toUpperCase()}
                  </div>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 600, fontSize: 14 }}>{other?.name || 'مستخدم'}</div>
                  <div style={{ fontSize: 12, color: '#64748b' }}>
                    {new Date(call.startedAt).toLocaleDateString('ar-EG')} · {' '}
                    {answered ? `${mins}:${secs.toString().padStart(2, '0')}` : '❌ لم يُرَد'}
                  </div>
                </div>
                {call.pointsDeducted > 0 && (
                  <span style={{ color: '#ef4444', fontSize: 12, fontWeight: 600 }}>-{call.pointsDeducted} نقطة</span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* ── Received Reviews Section ──────────────────────────────────── */}
      {myReviewsLoaded && (
        <div style={{ marginTop: 24 }}>
          <h3 style={{ fontSize: 18, fontWeight: 'bold', marginBottom: 16, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>
            ⭐ تقييماتي المستلمة ({myReviewCount})
            {myAvgRating > 0 && (
              <span style={{ fontSize: 14, color: '#fbbf24', fontWeight: 'normal' }}>
                {'★'.repeat(Math.round(myAvgRating))} {myAvgRating}/5
              </span>
            )}
          </h3>
          {myReviews.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 32, background: 'white', borderRadius: 16, color: '#888', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>⭐</div>
              <p style={{ margin: 0 }}>لا توجد تقييمات بعد</p>
              <p style={{ margin: '6px 0 0', fontSize: 13 }}>ستظهر التقييمات هنا عندما يقيّمك المشترون</p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {myReviews.map(r => (
                <div key={r._id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 2px 10px rgba(0,0,0,0.07)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                    <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#6366f1', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                      {r.reviewer?.avatar
                        ? <img src={r.reviewer.avatar} style={{ width: 38, height: 38, objectFit: 'cover', borderRadius: '50%' }} alt="" />
                        : (r.reviewer?.name?.[0]?.toUpperCase() || '?')}
                    </div>
                    <div style={{ flex: 1 }}>
                      <p style={{ margin: 0, fontWeight: 'bold', fontSize: 14, color: '#1a1a2e' }}>{r.reviewer?.name || 'مستخدم'}</p>
                      <span style={{ color: '#fbbf24', fontSize: 16 }}>{'★'.repeat(r.rating)}{'☆'.repeat(5 - r.rating)}</span>
                    </div>
                    <span style={{ color: '#999', fontSize: 11 }}>{new Date(r.createdAt).toLocaleDateString('ar-EG')}</span>
                  </div>
                  {r.comment && <p style={{ margin: 0, color: '#444', fontSize: 14, lineHeight: 1.6 }} dir="auto">{r.comment}</p>}
                  {r.adSnapshot?.title && (
                    <div style={{ marginTop: 8, padding: '6px 10px', background: '#f8f8f8', borderRadius: 8, fontSize: 12, color: '#666' }}>
                      📦 {r.adSnapshot.title}{r.adSnapshot.price ? ` — ${r.adSnapshot.price.toLocaleString('ar-EG')} ج.م` : ''}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
