'use client';
export const dynamic = 'force-dynamic';
import React, { useEffect, useState, useMemo, useCallback } from 'react';

// Module-level constants — avoid TDZ after SWC minification
// TABS and S were previously inside AdminPage() which caused "Cannot access before initialization"
const ADMIN_TABS = [
  { id: 'stats',      icon: '📊', ar: 'الإحصائيات' },
  { id: 'users',      icon: '👥', ar: 'المستخدمون' },
  { id: 'ads',        icon: '📋', ar: 'الإعلانات' },
  { id: 'featured',   icon: '⭐', ar: 'المميزة' },
  { id: 'reports',    icon: '🚨', ar: 'التقارير' },
  { id: 'reputation', icon: '🏆', ar: 'نقاط السمعة' },
  { id: 'system',     icon: '⚙️', ar: 'النظام' },
  { id: 'reviews_tab', icon: '🌟', ar: 'التقييمات' },
];
const ADMIN_S = { // style shortcuts
  th: { padding: '10px 12px', textAlign: 'right', color: '#8b949e', fontWeight: 'normal', fontSize: 12, borderBottom: '1px solid #21262d' },
  td: { padding: '9px 12px', fontSize: 12, borderBottom: '1px solid #1a1f27', verticalAlign: 'middle' },
};


const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// ─── helpers ──────────────────────────────────────────────
const getToken = () =>
  localStorage.getItem('xtox_admin_token') ||
  localStorage.getItem('token') ||
  localStorage.getItem('authToken') || '';

const authH = (tok) => ({
  'Authorization': 'Bearer ' + tok,
  'Content-Type': 'application/json',
  'Accept': 'application/json',
});

async function apiFetch(path, options = {}, tok = '') {
  const res = await fetch(API + path, {
    ...options,
    headers: { ...authH(tok), ...(options.headers || {}) },
  });
  let data = {};
  try { data = await res.json(); } catch {}
  return { ok: res.ok, status: res.status, data };
}

// ─── small components ──────────────────────────────────────
function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '20px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 30 }}>{icon}</div>
      <div style={{ color: color || '#00d4ff', fontSize: 28, fontWeight: 'bold', fontFamily: 'monospace', marginTop: 4 }}>{value ?? '–'}</div>
      <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4, direction: 'rtl' }}>{label}</div>
    </div>
  );
}

function Badge({ children, color = '#8b949e', bg = '#21262d' }) {
  return (
    <span style={{ background: bg, color, padding: '2px 8px', borderRadius: 10, fontSize: 11, fontWeight: 700 }}>
      {children}
    </span>
  );
}

function Btn({ children, onClick, color = '#00d4ff', disabled = false, loading = false, small = false }) {
  const bg = color === '#ff4444' ? '#3d1a1a' : color === '#00ff41' ? '#1f3a1f' : color === '#ffd700' ? '#2d2a1a' : color === '#bf5fff' ? '#2d1a2d' : '#21262d';
  return (
    <button
      onClick={onClick}
      disabled={disabled || loading}
      style={{
        background: bg, color, border: '1px solid ' + color,
        borderRadius: 6, padding: small ? '3px 8px' : '6px 12px',
        cursor: disabled || loading ? 'not-allowed' : 'pointer',
        fontSize: small ? 10 : 12, fontFamily: 'monospace',
        opacity: disabled ? 0.5 : 1, whiteSpace: 'nowrap',
      }}
    >
      {loading ? '...' : children}
    </button>
  );
}

function Input({ value, onChange, placeholder, type = 'text', style = {} }) {
  return (
    <input
      type={type}
      value={value}
      onChange={e => onChange(e.target.value)}
      placeholder={placeholder}
      style={{
        background: '#0d1117', border: '1px solid #30363d', borderRadius: 6,
        padding: '7px 10px', color: '#e6edf3', fontSize: 12,
        fontFamily: 'monospace', outline: 'none', ...style,
      }}
    />
  );
}

// ─── days input modal ──────────────────────────────────────
function DaysModal({ title, onConfirm, onClose }) {
  const [days, setDays] = useState('7');
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 28, width: 320, direction: 'rtl' }}>
        <h3 style={{ color: '#ffd700', margin: '0 0 16px', fontSize: 15 }}>{title}</h3>
        <Input value={days} onChange={setDays} type="number" placeholder="عدد الأيام" style={{ width: '100%', marginBottom: 16, direction: 'ltr' }} />
        <div style={{ display: 'flex', gap: 8 }}>
          <Btn onClick={() => onConfirm(parseInt(days) || 7)} color="#ffd700">تأكيد</Btn>
          <Btn onClick={onClose} color="#8b949e">إلغاء</Btn>
        </div>
      </div>
    </div>
  );
}

// ─── main page ─────────────────────────────────────────────
export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [token, setToken] = useState('');
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);

  const [tab, setTab] = useState('stats');
  const [adminReviews, setAdminReviews] = React.useState([]);
  const [reviewsLoading, setReviewsLoading] = React.useState(false);
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [ads, setAds] = useState([]);
  const [reports, setReports] = useState([]);
  const [errors, setErrors] = useState([]);

  const [userSearch, setUserSearch] = useState('');
  const [adFilter, setAdFilter] = useState('all'); // all | active | inactive | featured
  const [adSearch, setAdSearch] = useState('');

  const [loading, setLoading] = useState(false);
  const [modal, setModal] = useState(null); // { type, adId, title }
  const [toast, setToast] = useState('');
  // ── Reputation tab state ────────────────────────────────
  const [repUsers, setRepUsers] = useState([]);
  const [repSearch, setRepSearch] = useState('');
  const [repLoading, setRepLoading] = useState(false);
  const [repEditing, setRepEditing] = useState({}); // { [userId]: { mode: 'add'|'sub', amount: '', reason: '', loading: false } }
  // WordPress sync state
  const [wpSyncing, setWpSyncing] = useState(false);
  const [wpResult, setWpResult] = useState(null);
  const [wpStatus, setWpStatus] = useState(null); // null | { connected, site, user } | { error }

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2800);
  }, []);

  // ── session restore ─────────────────────────────────────
  useEffect(() => {
    try {
      const stored = getToken();
      const userStr = localStorage.getItem('xtox_admin_user') || localStorage.getItem('user') || localStorage.getItem('currentUser');
      if (stored && userStr) {
        const user = JSON.parse(userStr);
        if (['admin', 'sub_admin', 'superadmin'].includes(user?.role)) {
          setToken(stored);
          setAuthed(true);
          loadAll(stored);
        }
      }
    } catch {}
  }, []);

  // ── login ───────────────────────────────────────────────
  async function login(e) {
    e?.preventDefault?.();
    if (!loginEmail.trim() || !loginPass) { setLoginErr('يرجى إدخال البريد وكلمة المرور'); return; }
    setLoginErr(''); setLoginLoading(true);
    try {
      const { ok, data } = await apiFetch('/api/users/login', { method: 'POST', body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPass }) });
      if (!ok) { setLoginErr(data.error || data.message || 'خطأ في تسجيل الدخول'); setLoginLoading(false); return; }
      const tok = data.token;
      const user = data.user;
      if (!tok) { setLoginErr('لم يتم استقبال رمز المصادقة'); setLoginLoading(false); return; }
      if (!['admin', 'sub_admin', 'superadmin'].includes(user?.role)) {
        setLoginErr('ليس لديك صلاحية الوصول للوحة الإدارة');
        setLoginLoading(false); return;
      }
      ['xtox_admin_token', 'token', 'authToken'].forEach(k => localStorage.setItem(k, tok));
      ['xtox_admin_user', 'user', 'currentUser'].forEach(k => localStorage.setItem(k, JSON.stringify(user)));
      setToken(tok); setAuthed(true); loadAll(tok);
    } catch (err) {
      setLoginErr('فشل الاتصال: ' + err.message);
    }
    setLoginLoading(false);
  }

  // ── load all data ───────────────────────────────────────
  async function loadAll(tok) {
    setLoading(true);
    const t = tok || token;
    try {
      const [sRes, uRes, aRes, rRes] = await Promise.all([
        apiFetch('/api/admin/stats', {}, t),
        apiFetch('/api/admin/users', {}, t),
        apiFetch('/api/admin/ads?limit=200', {}, t),
        apiFetch('/api/admin/reports', {}, t),
      ]);
      if (sRes.ok) setStats(sRes.data);
      if (uRes.ok) setUsers(uRes.data.users || uRes.data || []);
      if (aRes.ok) setAds(aRes.data.ads || aRes.data || []);
      if (rRes.ok) setReports(rRes.data.reports || rRes.data || []);
    } catch {}
    setLoading(false);
  }

  // ── filtered lists ──────────────────────────────────────
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    if (!q) return users;
    return users.filter(u =>
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q) ||
      (u.whatsappPhone || '').includes(q) ||
      (u.xtoxId || '').toLowerCase().includes(q) ||
      (u.phone || '').includes(q)
    );
  }, [users, userSearch]);

  const filteredAds = useMemo(() => {
    let list = ads;
    if (adFilter === 'active') list = list.filter(a => a.status === 'active');
    else if (adFilter === 'inactive') list = list.filter(a => a.status !== 'active');
    else if (adFilter === 'featured') list = list.filter(a => a.isFeatured && a.featuredUntil && new Date(a.featuredUntil) > new Date());
    if (adSearch) {
      const q = adSearch.toLowerCase();
      list = list.filter(a => (a.title || '').toLowerCase().includes(q) || (a.seller?.name || '').toLowerCase().includes(q));
    }
    return list;
  }, [ads, adFilter, adSearch]);

  const featuredAds = useMemo(() => ads.filter(a => a.isFeatured && a.featuredUntil && new Date(a.featuredUntil) > new Date()), [ads]);

  // ── action helpers ──────────────────────────────────────
  const patch = useCallback(async (path, body) => {
    const { ok, data } = await apiFetch(path, { method: 'PATCH', body: JSON.stringify(body) }, token);
    return { ok, data };
  }, [token]);

  const del = useCallback(async (path) => {
    const { ok, data } = await apiFetch(path, { method: 'DELETE' }, token);
    return { ok, data };
  }, [token]);

  const handleDeleteUser = useCallback(async (u) => {
    if (!confirm('هل تريد حذف حساب ' + (u.name || u.email) + ' وجميع إعلاناته؟')) return;
    const { ok, data } = await del('/api/admin/users/' + u._id);
    if (ok) { setUsers(prev => prev.filter(x => x._id !== u._id)); showToast('تم حذف المستخدم'); }
    else showToast('خطأ: ' + (data.error || 'فشل الحذف'));
  }, [del, showToast]);

  const handleToggleBan = useCallback(async (u) => {
    const { ok, data } = await patch('/api/admin/users/' + u._id + '/ban', {});
    if (ok) { setUsers(prev => prev.map(x => x._id === u._id ? { ...x, isBanned: data.isBanned } : x)); showToast(data.isBanned ? 'تم حظر المستخدم' : 'تم رفع الحظر'); }
    else showToast('خطأ: ' + (data.error || 'فشل'));
  }, [patch, showToast]);

  const handleToggleAdmin = useCallback(async (u) => {
    const { ok, data } = await patch('/api/admin/users/' + u._id + '/make-admin', {});
    if (ok) { setUsers(prev => prev.map(x => x._id === u._id ? { ...x, role: data.role } : x)); showToast(data.role === 'admin' ? 'تم منح صلاحية المشرف' : 'تم سحب الصلاحية'); }
    else showToast('خطأ: ' + (data.error || 'فشل'));
  }, [patch, showToast]);

  const handleToggleStatus = useCallback(async (ad) => {
    const newStatus = ad.status === 'active' ? 'inactive' : 'active';
    const { ok, data } = await patch('/api/admin/ads/' + ad._id + '/status', { status: newStatus });
    if (ok) { setAds(prev => prev.map(a => a._id === ad._id ? { ...a, status: newStatus } : a)); showToast('تم تغيير الحالة'); }
    else showToast('خطأ: ' + (data.error || 'فشل'));
  }, [patch, showToast]);

  const handleDeleteAd = useCallback(async (ad) => {
    if (!confirm('حذف إعلان "' + (ad.title || 'هذا الإعلان') + '"؟')) return;
    const { ok, data } = await del('/api/admin/ads/' + ad._id);
    if (ok) { setAds(prev => prev.filter(a => a._id !== ad._id)); showToast('تم حذف الإعلان'); }
    else showToast('خطأ: ' + (data.error || 'فشل'));
  }, [del, showToast]);

  const handleFeature = useCallback(async (adId, days) => {
    const { ok, data } = await patch('/api/admin/ads/' + adId + '/feature', { days });
    if (ok) { setAds(prev => prev.map(a => a._id === adId ? { ...a, isFeatured: true, featuredUntil: data.featuredUntil } : a)); showToast('تم تمييز الإعلان لمدة ' + days + ' أيام'); }
    else showToast('خطأ: ' + (data.error || 'فشل'));
    setModal(null);
  }, [patch, showToast]);

  const handleCancelFeature = useCallback(async (adId) => {
    const { ok, data } = await patch('/api/admin/ads/' + adId + '/feature', { cancel: true });
    if (ok) { setAds(prev => prev.map(a => a._id === adId ? { ...a, isFeatured: false, featuredUntil: null } : a)); showToast('تم إلغاء التمييز'); }
    else showToast('خطأ: ' + (data.error || 'فشل'));
  }, [patch, showToast]);

  const handleBubble = useCallback(async (adId, days) => {
    const { ok, data } = await patch('/api/admin/ads/' + adId + '/bubble', { days });
    if (ok) { setAds(prev => prev.map(a => a._id === adId ? { ...a, bubble: true, bubbleUntil: data.ad?.bubbleUntil } : a)); showToast('تم تفعيل الفقاعة لمدة ' + days + ' أيام'); }
    else showToast('خطأ: ' + (data.error || 'فشل'));
    setModal(null);
  }, [patch, showToast]);

  const handleCancelBubble = useCallback(async (adId) => {
    const { ok, data } = await patch('/api/admin/ads/' + adId + '/bubble', { cancel: true });
    if (ok) { setAds(prev => prev.map(a => a._id === adId ? { ...a, bubble: false, bubbleUntil: null } : a)); showToast('تم إلغاء الفقاعة'); }
    else showToast('خطأ: ' + (data.error || 'فشل'));
  }, [patch, showToast]);

  const handleResolveReport = useCallback(async (reportId) => {
    const { ok } = await apiFetch('/api/admin/resolve-report', { method: 'POST', body: JSON.stringify({ reportId }) }, token);
    if (ok) { setReports(prev => prev.filter(r => r._id !== reportId)); showToast('تم حل البلاغ'); }
    else showToast('فشل حل البلاغ');
  }, [token, showToast]);

  function logout() {
    ['xtox_admin_token', 'token', 'authToken', 'xtox_admin_user', 'user', 'currentUser'].forEach(k => localStorage.removeItem(k));
    setAuthed(false); setToken('');
  }

  const daysRemaining = (until) => {
    if (!until) return 0;
    return Math.max(0, Math.ceil((new Date(until) - new Date()) / 86400000));
  };

  // ── TABS and S moved to module level to avoid TDZ ──

  // ══════════════════════════════════════════════════════
  // LOGIN SCREEN
  // ══════════════════════════════════════════════════════
  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ background: '#161b22', border: '1px solid #00ff41', borderRadius: 12, padding: 48, width: 400, boxShadow: '0 0 40px rgba(0,255,65,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44 }}>🛡️</div>
          <h1 style={{ color: '#00ff41', fontSize: 22, fontWeight: 'bold', margin: '8px 0 4px' }}>XTOX ADMIN</h1>
          <p style={{ color: '#8b949e', fontSize: 12 }}>لوحة التحكم الإدارية</p>
        </div>
        <form onSubmit={(e) => { e.preventDefault(); login(); }}>
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: '#00ff41', fontSize: 11, display: 'block', marginBottom: 5 }}>البريد الإلكتروني</label>
          <input
            type="email" value={loginEmail} onChange={e => setLoginEmail(e.target.value)}
            autoComplete="username"
            placeholder="admin@email.com"
            style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: '#00ff41', fontSize: 11, display: 'block', marginBottom: 5 }}>كلمة المرور</label>
          <input
            type="password" value={loginPass} onChange={e => setLoginPass(e.target.value)}
            autoComplete="current-password"
            placeholder="••••••••"
            style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }}
          />
        </div>
        {loginErr && <div style={{ color: '#ff4444', fontSize: 12, marginBottom: 14, background: '#1a0000', padding: '8px 12px', borderRadius: 6, border: '1px solid #ff4444', direction: 'rtl' }}>⚠ {loginErr}</div>}
        <button type="submit" disabled={loginLoading}
          style={{ width: '100%', background: loginLoading ? '#333' : '#00ff41', color: '#0d1117', border: 'none', borderRadius: 6, padding: '12px', fontWeight: 'bold', fontSize: 14, cursor: loginLoading ? 'not-allowed' : 'pointer', fontFamily: 'monospace' }}>
          {loginLoading ? 'جارٍ التحقق...' : 'دخول ←'}
        </button>
        </form>
        <p style={{ color: '#30363d', fontSize: 10, textAlign: 'center', marginTop: 16 }}>XTOX Control v3.0</p>
      </div>
    </div>
  );

  // ══════════════════════════════════════════════════════
  // MAIN ADMIN UI
  // ══════════════════════════════════════════════════════
  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'Cairo, monospace' }}>

      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#00ff41', color: '#0d1117', padding: '10px 24px', borderRadius: 999, fontWeight: 700, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,255,65,0.35)' }}>
          {toast}
        </div>
      )}

      {/* Modal */}
      {modal && modal.type === 'feature' && (
        <DaysModal title={'تمييز: ' + (modal.adTitle || '')} onConfirm={days => handleFeature(modal.adId, days)} onClose={() => setModal(null)} />
      )}
      {modal && modal.type === 'bubble' && (
        <DaysModal title={'فقاعة: ' + (modal.adTitle || '')} onConfirm={days => handleBubble(modal.adId, days)} onClose={() => setModal(null)} />
      )}

      {/* Header */}
      <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 12 }}>
        <span style={{ color: '#00ff41', fontWeight: 'bold', fontSize: 20 }}>⬡ XTOX</span>
        <span style={{ color: '#8b949e', fontSize: 13 }}>لوحة الإدارة</span>
        {loading && <span style={{ color: '#ffd700', fontSize: 11 }}>⏳ جارٍ التحميل...</span>}
        <div style={{ marginRight: 'auto', display: 'flex', gap: 10, alignItems: 'center' }}>
          <button
            onClick={() => loadAll(token)}
            style={{ background: '#21262d', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 6, padding: '5px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}
          >
            🔄 تحديث
          </button>
          <button onClick={logout}
            style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', padding: '5px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>
            خروج
          </button>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ background: '#161b22', borderBottom: '1px solid #21262d', display: 'flex', gap: 0, overflowX: 'auto', padding: '0 8px' }}>
        {ADMIN_TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '10px 18px', background: 'transparent', border: 'none',
              borderBottom: tab === t.id ? '2px solid #00ff41' : '2px solid transparent',
              color: tab === t.id ? '#00ff41' : '#8b949e', cursor: 'pointer',
              fontSize: 13, whiteSpace: 'nowrap', fontFamily: 'Cairo, monospace', fontWeight: tab === t.id ? 700 : 400,
            }}>
            {t.icon} {t.ar}
          </button>
        ))}
      </div>

      {/* Content */}
      <div style={{ padding: '20px 16px 80px', maxWidth: 1400, margin: '0 auto' }}>

        {/* ══ TAB: الإحصائيات ══ */}
        {tab === 'stats' && (
          <div>
            <h2 style={{ color: '#00d4ff', marginBottom: 20, fontSize: 18 }}>📊 إحصائيات المنصة</h2>
            {stats ? (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14 }}>
                <StatCard label="إجمالي المستخدمين" value={stats.totalUsers} icon="👥" color="#00d4ff" />
                <StatCard label="إجمالي الإعلانات" value={stats.totalAds} icon="📋" color="#00ff41" />
                <StatCard label="الإعلانات النشطة" value={stats.activeAds} icon="✅" color="#00ff41" />
                <StatCard label="الإعلانات المميزة" value={stats.featuredAds} icon="⭐" color="#ffd700" />
                <StatCard label="المستخدمون المحظورون" value={stats.bannedUsers} icon="🚫" color="#ff4444" />
              </div>
            ) : (
              <div style={{ color: '#8b949e', textAlign: 'center', padding: 40 }}>جارٍ تحميل الإحصائيات...</div>
            )}
            <div style={{ marginTop: 28, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 18 }}>
                <h3 style={{ color: '#ffd700', fontSize: 14, margin: '0 0 14px' }}>📋 معلومات الإعلانات</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>إجمالي الإعلانات</span><span style={{ color: '#00ff41' }}>{stats?.totalAds || 0}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>النشطة</span><span style={{ color: '#00ff41' }}>{stats?.activeAds || 0}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#ffd700' }}>المميزة حالياً</span><span style={{ color: '#ffd700' }}>{stats?.featuredAds || 0}</span></div>
                </div>
              </div>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 18 }}>
                <h3 style={{ color: '#00d4ff', fontSize: 14, margin: '0 0 14px' }}>👥 معلومات المستخدمين</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>إجمالي المستخدمين</span><span style={{ color: '#00d4ff' }}>{stats?.totalUsers || 0}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#ff4444' }}>محظورون</span><span style={{ color: '#ff4444' }}>{stats?.bannedUsers || 0}</span></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}><span style={{ color: '#8b949e' }}>بلاغات معلقة</span><span style={{ color: '#ff4444' }}>{reports.length}</span></div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ══ TAB: المستخدمون ══ */}
        {tab === 'users' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16, flexWrap: 'wrap' }}>
              <h2 style={{ color: '#00d4ff', fontSize: 18, margin: 0 }}>👥 المستخدمون ({filteredUsers.length}/{users.length})</h2>
              <Input value={userSearch} onChange={setUserSearch} placeholder="🔍 بحث بالاسم / البريد / الهاتف / المعرف" style={{ flex: 1, minWidth: 220 }} />
            </div>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={ADMIN_S.th}>المعرف</th>
                    <th style={ADMIN_S.th}>الاسم</th>
                    <th style={ADMIN_S.th}>البريد / الهاتف</th>
                    <th style={ADMIN_S.th}>الإعلانات (إجمالي / نشط / مميز)</th>
                    <th style={ADMIN_S.th}>الحالة</th>
                    <th style={ADMIN_S.th}>تاريخ الانضمام</th>
                    <th style={ADMIN_S.th}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map(u => (
                    <tr key={u._id} style={{ borderBottom: '1px solid #1a1f27' }}>
                      <td style={ADMIN_S.td}><code style={{ color: '#8b949e', fontSize: 10 }}>{u.xtoxId || u._id?.slice(-6)}</code></td>
                      <td style={{ ...ADMIN_S.td, color: '#e6edf3', fontWeight: 600 }}>
                        {u.name || '—'}
                        {['admin', 'sub_admin'].includes(u.role) && <span style={{ marginRight: 4 }}><Badge color="#ffd700" bg="#2d2a1a">👑 {u.role}</Badge></span>}
                      </td>
                      <td style={{ ...ADMIN_S.td, color: '#8b949e' }}>
                        <div>{u.email || '—'}</div>
                        {u.whatsappPhone && <div style={{ color: '#00ff41', fontSize: 10 }}>📱 {u.whatsappPhone}</div>}
                      </td>
                      <td style={ADMIN_S.td}>
                        <span style={{ color: '#00d4ff' }}>{u.adStats?.total || 0}</span>
                        {' / '}
                        <span style={{ color: '#00ff41' }}>{u.adStats?.active || 0}</span>
                        {' / '}
                        <span style={{ color: '#ffd700' }}>{u.adStats?.featured || 0}</span>
                      </td>
                      <td style={ADMIN_S.td}>
                        {u.isBanned
                          ? <Badge color="#ff4444" bg="#3d1a1a">🚫 محظور</Badge>
                          : <Badge color="#00ff41" bg="#1f3a1f">✅ نشط</Badge>}
                      </td>
                      <td style={{ ...ADMIN_S.td, color: '#8b949e', fontSize: 11 }}>
                        {u.createdAt ? new Date(u.createdAt).toLocaleDateString('ar-EG') : '—'}
                      </td>
                      <td style={ADMIN_S.td}>
                        <div style={{ display: 'flex', gap: 5, flexWrap: 'wrap' }}>
                          <Btn small onClick={() => handleDeleteUser(u)} color="#ff4444">🗑️ حذف</Btn>
                          <Btn small onClick={() => handleToggleBan(u)} color={u.isBanned ? '#00ff41' : '#ff4444'}>
                            {u.isBanned ? '✅ رفع الحظر' : '🚫 حظر'}
                          </Btn>
                          {!['admin', 'sub_admin'].includes(u.role) && (
                            <Btn small onClick={() => handleToggleAdmin(u)} color="#ffd700">👑 مشرف</Btn>
                          )}
                          {u.role === 'admin' && (
                            <Btn small onClick={() => handleToggleAdmin(u)} color="#8b949e">👤 سحب</Btn>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr><td colSpan={7} style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>لا يوجد مستخدمون</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB: الإعلانات ══ */}
        {tab === 'ads' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
              <h2 style={{ color: '#00d4ff', fontSize: 18, margin: 0 }}>📋 الإعلانات ({filteredAds.length}/{ads.length})</h2>
              <div style={{ display: 'flex', gap: 6 }}>
                {['all', 'active', 'inactive', 'featured'].map(f => (
                  <button key={f} onClick={() => setAdFilter(f)}
                    style={{ padding: '4px 10px', borderRadius: 6, background: adFilter === f ? '#00d4ff' : '#21262d', color: adFilter === f ? '#0d1117' : '#8b949e', border: 'none', cursor: 'pointer', fontSize: 11, fontFamily: 'Cairo, monospace' }}>
                    {f === 'all' ? 'الكل' : f === 'active' ? 'النشطة' : f === 'inactive' ? 'غير النشطة' : 'المميزة'}
                  </button>
                ))}
              </div>
              <Input value={adSearch} onChange={setAdSearch} placeholder="🔍 بحث في الإعلانات" style={{ flex: 1, minWidth: 200 }} />
            </div>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr>
                    <th style={ADMIN_S.th}>صورة</th>
                    <th style={ADMIN_S.th}>العنوان</th>
                    <th style={ADMIN_S.th}>البائع</th>
                    <th style={ADMIN_S.th}>التصنيف</th>
                    <th style={ADMIN_S.th}>الحالة</th>
                    <th style={ADMIN_S.th}>مميز</th>
                    <th style={ADMIN_S.th}>فقاعة</th>
                    <th style={ADMIN_S.th}>تاريخ النشر</th>
                    <th style={ADMIN_S.th}>إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredAds.map(ad => {
                    const seller = ad.seller || ad.userId;
                    const img = ad.media?.[0] || ad.images?.[0];
                    const isFeaturedNow = ad.isFeatured && ad.featuredUntil && new Date(ad.featuredUntil) > new Date();
                    const isBubbleNow = ad.bubble && (!ad.bubbleUntil || new Date(ad.bubbleUntil) > new Date());
                    return (
                      <tr key={ad._id} style={{ borderBottom: '1px solid #1a1f27' }}>
                        <td style={ADMIN_S.td}>
                          {img
                            ? <img src={img} alt="" style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 6 }} />
                            : <div style={{ width: 48, height: 48, background: '#21262d', borderRadius: 6, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>📦</div>}
                        </td>
                        <td style={{ ...ADMIN_S.td, maxWidth: 160 }}>
                          <a href={'/ads/' + ad._id} target="_blank" rel="noreferrer" style={{ color: '#e6edf3', textDecoration: 'none', fontWeight: 600 }}>
                            {(ad.title || '—').slice(0, 35)}
                          </a>
                        </td>
                        <td style={{ ...ADMIN_S.td, color: '#8b949e' }}>
                          {seller?.name || '—'}
                          {seller?.xtoxId && <div style={{ fontSize: 10, color: '#30363d' }}>#{seller.xtoxId}</div>}
                        </td>
                        <td style={{ ...ADMIN_S.td, color: '#8b949e' }}>
                          <div>{ad.category || '—'}</div>
                          {ad.subsub && ad.subsub !== 'Other' && <div style={{ fontSize: 10, color: '#30363d' }}>{ad.subsub}</div>}
                        </td>
                        <td style={ADMIN_S.td}>
                          {ad.status === 'active'
                            ? <Badge color="#00ff41" bg="#1f3a1f">نشط</Badge>
                            : <Badge color="#8b949e" bg="#21262d">غير نشط</Badge>}
                        </td>
                        <td style={ADMIN_S.td}>
                          {isFeaturedNow
                            ? <div><Badge color="#ffd700" bg="#2d2a1a">⭐ مميز</Badge><div style={{ color: '#8b949e', fontSize: 10 }}>ينتهي: {daysRemaining(ad.featuredUntil)}ي</div></div>
                            : <Badge color="#30363d" bg="#0d1117">—</Badge>}
                        </td>
                        <td style={ADMIN_S.td}>
                          {isBubbleNow
                            ? <Badge color="#bf5fff" bg="#2d1a2d">🫧 فقاعة</Badge>
                            : <Badge color="#30363d" bg="#0d1117">—</Badge>}
                        </td>
                        <td style={{ ...ADMIN_S.td, color: '#8b949e', fontSize: 11 }}>
                          {ad.createdAt ? new Date(ad.createdAt).toLocaleDateString('ar-EG') : '—'}
                        </td>
                        <td style={ADMIN_S.td}>
                          <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
                            <Btn small onClick={() => handleToggleStatus(ad)} color={ad.status === 'active' ? '#ff4444' : '#00ff41'}>
                              {ad.status === 'active' ? '❌ تعطيل' : '✅ تفعيل'}
                            </Btn>
                            {isFeaturedNow
                              ? <Btn small onClick={() => handleCancelFeature(ad._id)} color="#ff4444">❌ إلغاء التمييز</Btn>
                              : <Btn small onClick={() => setModal({ type: 'feature', adId: ad._id, adTitle: ad.title })} color="#ffd700">⭐ تمييز</Btn>}
                            {isBubbleNow
                              ? <Btn small onClick={() => handleCancelBubble(ad._id)} color="#8b949e">❌ فقاعة</Btn>
                              : <Btn small onClick={() => setModal({ type: 'bubble', adId: ad._id, adTitle: ad.title })} color="#bf5fff">🫧 فقاعة</Btn>}
                            <Btn small onClick={() => handleDeleteAd(ad)} color="#ff4444">🗑️</Btn>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredAds.length === 0 && (
                    <tr><td colSpan={9} style={{ padding: 32, textAlign: 'center', color: '#8b949e' }}>لا توجد إعلانات</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* ══ TAB: المميزة ══ */}
        {tab === 'featured' && (
          <div>
            <h2 style={{ color: '#ffd700', marginBottom: 16, fontSize: 18 }}>⭐ الإعلانات المميزة ({featuredAds.length})</h2>
            {featuredAds.length === 0 && (
              <div style={{ textAlign: 'center', padding: 48, color: '#8b949e' }}>
                <div style={{ fontSize: 48, marginBottom: 12 }}>⭐</div>
                <p>لا توجد إعلانات مميزة حالياً</p>
              </div>
            )}
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: 14 }}>
              {featuredAds.map(ad => {
                const img = ad.media?.[0] || ad.images?.[0];
                const seller = ad.seller || ad.userId;
                const days = daysRemaining(ad.featuredUntil);
                return (
                  <div key={ad._id} style={{ background: '#161b22', border: '2px solid #ffd700', borderRadius: 12, overflow: 'hidden' }}>
                    {img && <img src={img} alt="" style={{ width: '100%', height: 140, objectFit: 'cover' }} />}
                    <div style={{ padding: 14 }}>
                      <a href={'/ads/' + ad._id} target="_blank" rel="noreferrer" style={{ color: '#e6edf3', fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
                        {(ad.title || '—').slice(0, 50)}
                      </a>
                      <div style={{ color: '#8b949e', fontSize: 12, marginTop: 6 }}>
                        <span>{seller?.name || '—'}</span> · <span>{ad.city || '—'}</span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 10 }}>
                        <Badge color="#ffd700" bg="#2d2a1a">
                          {days > 0 ? 'ينتهي في ' + days + ' يوم' : 'منتهي'}
                        </Badge>
                        <div style={{ display: 'flex', gap: 6 }}>
                          <Btn small onClick={() => setModal({ type: 'feature', adId: ad._id, adTitle: ad.title })} color="#ffd700">+ أيام</Btn>
                          <Btn small onClick={() => handleCancelFeature(ad._id)} color="#ff4444">إلغاء</Btn>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ══ TAB: التقارير ══ */}
        {tab === 'reports' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 16 }}>
              <h2 style={{ color: '#ff4444', fontSize: 18, margin: 0 }}>🚨 التقارير ({reports.length})</h2>
              <Btn onClick={() => apiFetch('/api/admin/reports', {}, token).then(r => { if (r.ok) setReports(r.data.reports || r.data || []); })} color="#00d4ff">تحديث</Btn>
            </div>
            {reports.length === 0 && <div style={{ textAlign: 'center', padding: 48, color: '#00ff41' }}>✅ لا توجد بلاغات معلقة</div>}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {reports.map(r => (
                <div key={r._id} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 16 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                    <div>
                      <div style={{ color: '#e6edf3', fontWeight: 600 }}>{r.adTitle || r.adId || '—'}</div>
                      <div style={{ color: '#8b949e', fontSize: 11, marginTop: 4 }}>
                        المبلغ: {r.reporterName || r.userId || '—'} · السبب: {r.reason || '—'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <Btn small onClick={() => handleResolveReport(r._id)} color="#00ff41">✅ حل</Btn>
                      {r.adId && <Btn small onClick={() => handleDeleteAd({ _id: r.adId, title: r.adTitle })} color="#ff4444">🗑️ حذف الإعلان</Btn>}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ══ TAB: نقاط السمعة ══ */}
        {tab === 'reputation' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#a78bfa', margin: 0, fontSize: 18 }}>🏆 إدارة نقاط السمعة</h2>
              <button
                onClick={async () => {
                  showToast('🌍 جار تحديث بيانات الدول...');
                  const { ok, data } = await apiFetch('/api/admin/backfill-countries', { method: 'POST' }, token);
                  if (ok) {
                    showToast(`✅ تم تحديث ${data.updated || 0} إعلان من إجمالي ${data.total || 0}`);
                  } else {
                    showToast('❌ خطأ: ' + (data?.error || 'فشل التحديث'));
                  }
                }}
                style={{ background: '#16a34a', color: '#fff', border: 'none', padding: '8px 14px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, monospace', display: 'flex', alignItems: 'center', gap: 6 }}
              >
                🌍 Backfill Countries
              </button>
            </div>
            <div style={{ display: 'flex', gap: 10, marginBottom: 16, alignItems: 'center' }}>
              <input
                value={repSearch}
                onChange={e => setRepSearch(e.target.value)}
                placeholder="🔍 ابحث باسم أو بريد..."
                style={{ flex: 1, background: '#0d1117', border: '1px solid #30363d', borderRadius: 8, padding: '8px 12px', color: '#f0f6fc', fontSize: 13, fontFamily: 'Cairo, monospace', direction: 'rtl' }}
              />
              <button
                onClick={async () => {
                  setRepLoading(true);
                  const { ok, data } = await apiFetch('/api/admin/users/reputation', {}, token);
                  if (ok) setRepUsers(Array.isArray(data) ? data : []);
                  setRepLoading(false);
                }}
                style={{ background: '#21262d', color: '#a78bfa', border: '1px solid #a78bfa', borderRadius: 8, padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace', whiteSpace: 'nowrap' }}
              >
                {repLoading ? '⏳' : '🔄 تحميل'}
              </button>
            </div>
            {repUsers.length === 0 && !repLoading && (
              <div style={{ color: '#8b949e', textAlign: 'center', padding: 40, fontSize: 14 }}>
                اضغط على "تحميل" لعرض المستخدمين
              </div>
            )}
            {repUsers.length > 0 && (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr style={{ background: '#161b22' }}>
                      {['#', 'الاسم', 'البريد', 'XTOX ID', 'النقاط', 'الشهرية', 'الدور', 'الإجراء'].map(h => (
                        <th key={h} style={ADMIN_S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {repUsers
                      .filter(u => {
                        if (!repSearch) return true;
                        const q = repSearch.toLowerCase();
                        return (u.name||'').toLowerCase().includes(q) || (u.email||'').toLowerCase().includes(q);
                      })
                      .map((u, idx) => {
                        const edit = repEditing[u._id];
                        const tier = u.reputationPoints >= 1000 ? '💎 Platinum' : u.reputationPoints >= 500 ? '🥇 Gold' : u.reputationPoints >= 200 ? '🥈 Silver' : '🥉 Bronze';
                        return (
                          <tr key={u._id} style={{ borderBottom: '1px solid #21262d' }}>
                            <td style={ADMIN_S.td}>{idx + 1}</td>
                            <td style={ADMIN_S.td}><span style={{ color: '#f0f6fc', fontWeight: 600 }}>{u.name || '—'}</span></td>
                            <td style={ADMIN_S.td}><span style={{ color: '#8b949e' }}>{u.email || '—'}</span></td>
                            <td style={ADMIN_S.td}><code style={{ color: '#79c0ff', fontSize: 11 }}>{u.xtoxId || '—'}</code></td>
                            <td style={ADMIN_S.td}>
                              <span style={{ color: '#a78bfa', fontWeight: 700 }}>{u.reputationPoints ?? 0}</span>
                              <span style={{ color: '#475569', marginRight: 4, fontSize: 10 }}>{tier}</span>
                            </td>
                            <td style={ADMIN_S.td}><span style={{ color: '#fcd34d' }}>{u.monthlyPoints ?? 0}</span></td>
                            <td style={ADMIN_S.td}><span style={{ color: u.role === 'admin' ? '#00ff41' : '#8b949e' }}>{u.role || 'user'}</span></td>
                            <td style={ADMIN_S.td}>
                              {!edit ? (
                                <div style={{ display: 'flex', gap: 4 }}>
                                  <button
                                    onClick={() => setRepEditing(p => ({ ...p, [u._id]: { mode: 'add', amount: '', reason: '', loading: false } }))}
                                    style={{ background: 'rgba(22,163,74,0.15)', border: '1px solid #16a34a', color: '#4ade80', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}
                                  >➕</button>
                                  <button
                                    onClick={() => setRepEditing(p => ({ ...p, [u._id]: { mode: 'sub', amount: '', reason: '', loading: false } }))}
                                    style={{ background: 'rgba(220,38,38,0.15)', border: '1px solid #dc2626', color: '#f87171', borderRadius: 6, padding: '3px 8px', cursor: 'pointer', fontSize: 12 }}
                                  >➖</button>
                                </div>
                              ) : (
                                <div style={{ display: 'flex', flexDirection: 'column', gap: 4, minWidth: 180 }}>
                                  <div style={{ color: edit.mode === 'add' ? '#4ade80' : '#f87171', fontSize: 11, fontWeight: 700, marginBottom: 2 }}>
                                    {edit.mode === 'add' ? '➕ أضف نقاط' : '➖ اخصم نقاط'}
                                  </div>
                                  <input
                                    type="number" min="1" placeholder="الكمية"
                                    value={edit.amount}
                                    onChange={e => setRepEditing(p => ({ ...p, [u._id]: { ...p[u._id], amount: e.target.value } }))}
                                    style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '4px 8px', color: '#f0f6fc', fontSize: 12, width: '100%', boxSizing: 'border-box' }}
                                  />
                                  <input
                                    type="text" placeholder="السبب (اختياري)"
                                    value={edit.reason}
                                    onChange={e => setRepEditing(p => ({ ...p, [u._id]: { ...p[u._id], reason: e.target.value } }))}
                                    style={{ background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '4px 8px', color: '#f0f6fc', fontSize: 12, width: '100%', boxSizing: 'border-box', direction: 'rtl' }}
                                  />
                                  <div style={{ display: 'flex', gap: 4 }}>
                                    <button
                                      disabled={edit.loading || !edit.amount}
                                      onClick={async () => {
                                        const amt = parseInt(edit.amount);
                                        if (!amt || isNaN(amt)) return;
                                        const finalAmt = edit.mode === 'sub' ? -Math.abs(amt) : Math.abs(amt);
                                        setRepEditing(p => ({ ...p, [u._id]: { ...p[u._id], loading: true } }));
                                        const { ok, data } = await apiFetch(`/api/admin/users/${u._id}/reputation`, {
                                          method: 'PATCH',
                                          body: JSON.stringify({ amount: finalAmt, reason: edit.reason || undefined })
                                        }, token);
                                        if (ok) {
                                          setRepUsers(prev => prev.map(ru => ru._id === u._id
                                            ? { ...ru, reputationPoints: data.reputationPoints, monthlyPoints: data.monthlyPoints }
                                            : ru
                                          ));
                                          showToast('✅ تم تعديل النقاط');
                                          setRepEditing(p => { const n = { ...p }; delete n[u._id]; return n; });
                                        } else {
                                          showToast('❌ ' + (data.error || 'فشل التعديل'));
                                          setRepEditing(p => ({ ...p, [u._id]: { ...p[u._id], loading: false } }));
                                        }
                                      }}
                                      style={{ flex: 1, background: edit.mode === 'add' ? '#16a34a' : '#dc2626', color: 'white', border: 'none', borderRadius: 6, padding: '4px 8px', cursor: edit.loading ? 'not-allowed' : 'pointer', fontSize: 11, opacity: edit.loading ? 0.6 : 1 }}
                                    >
                                      {edit.loading ? '⏳' : '✅ تأكيد'}
                                    </button>
                                    <button
                                      onClick={() => setRepEditing(p => { const n = { ...p }; delete n[u._id]; return n; })}
                                      style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d', borderRadius: 6, padding: '4px 8px', cursor: 'pointer', fontSize: 11 }}
                                    >❌</button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* ══ TAB: النظام ══ */}
        {tab === 'system' && (
          <div>
            <h2 style={{ color: '#00d4ff', marginBottom: 20, fontSize: 18 }}>⚙️ إدارة النظام</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 14 }}>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 18 }}>
                <h3 style={{ color: '#00ff41', fontSize: 14, margin: '0 0 14px' }}>🔧 إجراءات سريعة</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Btn onClick={() => apiFetch('/api/admin/fix-categories', { method: 'POST', body: '{}' }, token).then(r => showToast('تم إصلاح ' + (r.data.fixed || 0) + ' إعلان'))} color="#00ff41">🔧 إصلاح التصنيفات</Btn>
                  <Btn onClick={() => apiFetch('/api/admin/ai-learn', { method: 'POST', body: '{}' }, token).then(() => showToast('تم بدء التعلم الأسبوعي'))} color="#00d4ff">🤖 تشغيل AI للتصنيف</Btn>
                  <Btn onClick={() => apiFetch('/api/admin/location-vocab/run', { method: 'POST', body: '{}' }, token).then(() => showToast('تم بدء تعلم اللغات'))} color="#bf5fff">🌐 تعلم لغات المواقع</Btn>
                  <Btn onClick={() => loadAll(token)} color="#ffd700">🔄 تحديث كل البيانات</Btn>
                  <Btn onClick={() => window.open(API, '_blank')} color="#00ff41">🏥 فحص الخادم</Btn>
                </div>
              </div>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 18 }}>
                <h3 style={{ color: '#ffd700', fontSize: 14, margin: '0 0 14px' }}>📡 روابط مفيدة</h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                  <Btn onClick={() => window.open(API + '/rss/EG', '_blank')} color="#bf5fff">📡 RSS — مصر</Btn>
                  <Btn onClick={() => window.open('/admin/language', '_self')} color="#00d4ff">🌐 لوحة اللغات</Btn>
                </div>
              </div>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 18 }}>
                <h3 style={{ color: '#00d4ff', fontSize: 14, margin: '0 0 14px' }}>📢 إرسال رسالة جماعية</h3>
                <textarea
                  placeholder="اكتب رسالتك هنا..."
                  id="broadcast-msg"
                  style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '8px', color: '#fff', fontSize: 12, fontFamily: 'Cairo, monospace', resize: 'vertical', height: 80, boxSizing: 'border-box', marginBottom: 10, direction: 'rtl' }}
                />
                <Btn onClick={() => {
                  const msg = document.getElementById('broadcast-msg').value;
                  if (!msg) return;
                  apiFetch('/api/admin/broadcast', { method: 'POST', body: JSON.stringify({ message: msg }) }, token)
                    .then(r => { if (r.ok) showToast('تم الإرسال!'); else showToast('خطأ: ' + (r.data.error || 'فشل')); });
                }} color="#ffd700">📢 إرسال</Btn>
              </div>
            </div>

            {/* ── WordPress Sync Card ── */}
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 18, marginTop: 14 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
                <div>
                  <h3 style={{ color: '#bf5fff', fontSize: 14, margin: 0 }}>🌐 مزامنة WordPress</h3>
                  <p style={{ color: '#8b949e', fontSize: 12, margin: '4px 0 0' }}>xt0x.wordpress.com — نشر الإعلانات تلقائياً</p>
                </div>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                  <button
                    onClick={async () => {
                      setWpStatus(null);
                      try {
                        const r = await apiFetch('/api/wp/status', {}, token);
                        setWpStatus(r.data);
                      } catch (e) {
                        setWpStatus({ error: e.message });
                      }
                    }}
                    style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d', padding: '5px 12px', borderRadius: 6, cursor: 'pointer', fontSize: 12, fontFamily: 'Cairo, monospace' }}
                  >🔌 فحص الاتصال</button>
                  <button
                    onClick={async () => {
                      setWpSyncing(true); setWpResult(null);
                      try {
                        const r = await apiFetch('/api/wp/sync-all', { method: 'POST', body: '{}' }, token);
                        setWpResult(r.data);
                      } catch (e) {
                        setWpResult({ error: e.message });
                      } finally {
                        setWpSyncing(false);
                      }
                    }}
                    disabled={wpSyncing}
                    style={{ background: wpSyncing ? '#21262d' : '#2d1a2d', color: wpSyncing ? '#8b949e' : '#bf5fff', border: '1px solid ' + (wpSyncing ? '#30363d' : '#bf5fff'), padding: '5px 14px', borderRadius: 6, cursor: wpSyncing ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Cairo, monospace', fontWeight: 600 }}
                  >{wpSyncing ? '⏳ جارٍ المزامنة...' : '🔄 مزامنة الكل'}</button>
                </div>
              </div>
              {wpStatus && (
                <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 12px', fontSize: 12, marginBottom: wpResult ? 8 : 0 }}>
                  {wpStatus.error
                    ? <span style={{ color: '#f85149' }}>❌ {wpStatus.error}</span>
                    : wpStatus.connected
                      ? <span style={{ color: '#3fb950' }}>✅ متصل — {wpStatus.site || wpStatus.url || 'xt0x.wordpress.com'}{wpStatus.user ? ' · ' + wpStatus.user : ''}</span>
                      : <span style={{ color: '#f85149' }}>❌ غير متصل — {wpStatus.reason || 'تحقق من WP_APP_PASSWORD'}</span>
                  }
                </div>
              )}
              {wpResult && (
                <div style={{ background: '#0d1117', borderRadius: 6, padding: '8px 12px', fontSize: 12 }}>
                  {wpResult.error
                    ? <span style={{ color: '#f85149' }}>❌ {wpResult.error}</span>
                    : <span style={{ color: '#3fb950' }}>✅ تمت المزامنة: {wpResult.synced ?? 0} إعلان منشور{wpResult.failed ? ' | فشل: ' + wpResult.failed : ''}</span>
                  }
                </div>
              )}
            </div>
          </div>
        )}

        {/* ══ TAB: التقييمات ══ */}
        {tab === 'reviews_tab' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <h2 style={{ color: '#00d4ff', fontSize: 18, margin: 0 }}>🌟 إدارة التقييمات</h2>
              <button
                onClick={async () => {
                  setReviewsLoading(true);
                  const r = await apiFetch('/api/admin/reviews', {}, token);
                  if (r.ok) setAdminReviews(r.data || []);
                  setReviewsLoading(false);
                }}
                style={{ background: '#00d4ff', color: '#000', border: 'none', padding: '8px 16px', borderRadius: 8, fontWeight: 'bold', cursor: 'pointer', fontSize: 13, fontFamily: 'Cairo, monospace' }}
              >
                {reviewsLoading ? '⏳ جار التحميل...' : '🔄 تحميل التقييمات'}
              </button>
            </div>
            {adminReviews.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#8b949e', padding: 40 }}>
                <div style={{ fontSize: 48 }}>⭐</div>
                <p>انقر على "تحميل التقييمات" لعرضها</p>
              </div>
            ) : (
              <div style={{ overflowX: 'auto' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead>
                    <tr>
                      {['المُقيِّم','البائع','عنوان الإعلان','التقييم','التعليق','التاريخ','الحالة','إجراء'].map(h => (
                        <th key={h} style={ADMIN_S.th}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {adminReviews.map(rv => (
                      <tr key={rv._id} style={{ borderBottom: '1px solid #21262d', background: rv.deletedByAdmin ? 'rgba(255,0,0,0.05)' : 'transparent' }}>
                        <td style={ADMIN_S.td}>{rv.reviewer?.name || '—'}</td>
                        <td style={ADMIN_S.td}>{rv.seller?.name || '—'}</td>
                        <td style={ADMIN_S.td}>{rv.ad?.title || rv.adSnapshot?.title || '—'}</td>
                        <td style={ADMIN_S.td}>
                          <span style={{ color: '#ffd700' }}>{'★'.repeat(rv.rating)}{'☆'.repeat(5 - rv.rating)}</span>
                          <span style={{ color: '#8b949e', marginRight: 4 }}>{rv.rating}/5</span>
                        </td>
                        <td style={{ ...ADMIN_S.td, maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={rv.comment}>{rv.comment}</td>
                        <td style={ADMIN_S.td}>{rv.createdAt ? new Date(rv.createdAt).toLocaleDateString('ar') : '—'}</td>
                        <td style={ADMIN_S.td}>
                          <span style={{ color: rv.deletedByAdmin ? '#ff4444' : '#00ff41', fontWeight: 'bold' }}>
                            {rv.deletedByAdmin ? '🗑️ محذوف' : '✅ نشط'}
                          </span>
                        </td>
                        <td style={ADMIN_S.td}>
                          {!rv.deletedByAdmin && (
                            <button
                              onClick={async () => {
                                if (!confirm('حذف هذا التقييم؟ سيتم عكس النقاط.')) return;
                                const r = await apiFetch('/api/reviews/' + rv._id, { method: 'DELETE' }, token);
                                if (r.ok) {
                                  setAdminReviews(prev => prev.map(x => x._id === rv._id ? { ...x, deletedByAdmin: true } : x));
                                  showToast('تم حذف التقييم وعكس النقاط');
                                } else {
                                  showToast('خطأ: ' + (r.data?.error || 'فشل'));
                                }
                              }}
                              style={{ background: '#ff4444', color: '#fff', border: 'none', padding: '4px 10px', borderRadius: 6, cursor: 'pointer', fontSize: 11, fontFamily: 'Cairo, monospace' }}
                            >
                              🗑️ حذف
                            </button>
                          )}
                          {rv.deletedByAdmin && <span style={{ color: '#555' }}>—</span>}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
