'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import VerifiedBadge from '../components/VerifiedBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

export default function ProfilePage() {
  const router = useRouter();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState('');

  // ── FIX 4: Chat toggle state ──────────────────────────────────────────
  const [chatEnabled, setChatEnabled] = useState(true);
  const [chatToggling, setChatToggling] = useState(false);

  // ── Sound mute state ──────────────────────────────────────────────────
  const [soundMuted, setSoundMuted] = useState(false);

  // ── My Ads state ──────────────────────────────────────────────────────
  const [myAds, setMyAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);


  const getToken = () =>
    localStorage.getItem('token') ||
    localStorage.getItem('xtox_token') ||
    localStorage.getItem('xtox_admin_token') ||
    localStorage.getItem('authToken') || '';

  function handleLogout() {
    try {
      const keysToRemove = [
        'token', 'xtox_token', 'xtox_admin_token', 'authToken',
        'xtoxId', 'xtoxEmail', 'userName', 'userId', 'userAvatar',
        'user', 'xtox_user', 'xtox_admin_user',
      ];
      keysToRemove.forEach(k => { try { localStorage.removeItem(k); } catch {} });
    } catch {}
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
          bio: cached.bio || ''
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
          bio: u.bio || ''
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
  // FIX Bug 2: use stable primitive userId string as dep, not the whole user object
  const userId = (user?._id || user?.id) ?? null;
  useEffect(() => {
    if (!userId || typeof userId !== 'string' || userId.length < 5) return;
    let cancelled = false;
    setAdsLoading(true);
    fetch(API + '/api/ads?userId=' + userId, {
      headers: { Authorization: 'Bearer ' + getToken() }
    })
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        const ads = Array.isArray(data) ? data : (data.ads || data.regularAds || []);
        setMyAds(ads);
      })
      .catch(() => {})
      .finally(() => { if (!cancelled) setAdsLoading(false); });
    return () => { cancelled = true; };
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

  return (
    <div style={{ maxWidth: 600, margin: '40px auto', padding: '0 16px' }}>
      <button onClick={() => router.back()} style={{ marginBottom: 16, background: 'none', border: 'none', color: '#6366f1', fontWeight: 'bold', cursor: 'pointer', fontSize: 16 }}>
        ← رجوع
      </button>

      <div style={{ background: 'white', borderRadius: 20, padding: 32, boxShadow: '0 4px 24px rgba(0,0,0,0.08)' }}>

        {/* Avatar */}
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ width: 80, height: 80, borderRadius: '50%', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, color: 'white', margin: '0 auto 12px' }}>
            {initials}
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
            const token = localStorage.getItem('token');
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

        {!editing ? (
          <>
            {[
              ['📧 البريد', user.email],
              ['📱 الهاتف', user.phone || '—'],
              ['🏙️ المدينة', user.city || '—'],
              ['🌍 البلد', user.country || '—'],
              ['📝 نبذة', user.bio || '—'],
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
              ['phone', 'رقم الهاتف', 'tel'],
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
                    {ad.isExpired && !ad.isDeleted && (
                      <div style={{ position: 'absolute', top: 4, right: 4, background: '#f59e0b', color: 'white', fontSize: 10, padding: '2px 6px', borderRadius: 6 }}>منتهي</div>
                    )}
                  </div>
                  <div style={{ padding: '8px 10px' }}>
                    <p style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 'bold', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{ad.title}</p>
                    <p style={{ margin: '0 0 8px', fontSize: 12, color: '#6366f1', fontWeight: 'bold' }}>{ad.price} {ad.currency || 'EGP'}</p>
                    <div style={{ display: 'flex', gap: 6 }}>
                      <a
                        href={'/ads/' + ad._id}
                        style={{ flex: 1, textAlign: 'center', padding: '4px', background: '#f3f4f6', borderRadius: 8, fontSize: 11, textDecoration: 'none', color: '#333' }}
                      >
                        عرض
                      </a>
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
    </div>
  );
}
