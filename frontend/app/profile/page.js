'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

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

  // ── My Ads state ──────────────────────────────────────────────────────
  const [myAds, setMyAds] = useState([]);
  const [adsLoading, setAdsLoading] = useState(false);

  const getToken = () =>
    localStorage.getItem('token') ||
    localStorage.getItem('xtox_token') ||
    localStorage.getItem('xtox_admin_token') ||
    localStorage.getItem('authToken') || '';

  useEffect(() => {
    const token = getToken();
    if (!token) { router.push('/login'); return; }

    fetch(API + '/api/users/me', {
      headers: { Authorization: 'Bearer ' + token }
    })
      .then(async r => {
        if (r.status === 401) { router.push('/login'); return null; }
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
        // Keep localStorage in sync
        try { localStorage.setItem('user', JSON.stringify(u)); } catch {}
      })
      .catch(() => router.push('/login'))
      .finally(() => setLoading(false));
  }, []);

  // ── Fetch My Ads when user is loaded ─────────────────────────────────
  useEffect(() => {
    if (!user) return;
    const uid = user._id || user.id;
    if (!uid) return;
    setAdsLoading(true);
    fetch(API + '/api/ads?userId=' + uid, {
      headers: { Authorization: 'Bearer ' + getToken() }
    })
      .then(r => r.json())
      .then(data => {
        const ads = Array.isArray(data) ? data : (data.ads || data.regularAds || []);
        setMyAds(ads);
      })
      .catch(() => {})
      .finally(() => setAdsLoading(false));
  }, [user]);

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
      try { localStorage.setItem('user', JSON.stringify({ ...user, ...updated })); } catch {}
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
          <h2 style={{ margin: '0 0 4px', fontSize: 22 }}>{user.username || user.name || user.email}</h2>
          <p style={{ margin: 0, color: '#888', fontSize: 14 }}>
            {user.role === 'admin' ? '👑 مدير' : user.role === 'sub_admin' ? '🔧 مشرف' : '👤 مستخدم'}
          </p>
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
              <a href="/sell" style={{ flex: 1, padding: 12, background: '#f3f4f6', border: 'none', borderRadius: 12, cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none', color: '#374151' }}>
                ➕ إعلان جديد
              </a>
            </div>
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
            <a href="/sell" style={{ color: '#6366f1', fontWeight: 'bold', textDecoration: 'none' }}>+ أضف إعلانك الأول</a>
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
