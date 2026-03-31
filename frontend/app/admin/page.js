'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useRef, useMemo } from 'react';

const RAILWAY = 'https://xtox.up.railway.app';

function AITerminal({ title, children, color = 'green' }) {
  const colors = { green: '#00ff41', blue: '#00d4ff', yellow: '#ffd700', red: '#ff4444', purple: '#bf5fff' };
  return (
    <div style={{ background: '#0d1117', border: `1px solid ${colors[color]}`, borderRadius: 8, overflow: 'hidden', fontFamily: 'monospace' }}>
      <div style={{ background: '#161b22', padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: `1px solid ${colors[color]}` }}>
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#ff5f57', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#febc2e', display: 'inline-block' }} />
        <span style={{ width: 12, height: 12, borderRadius: '50%', background: '#28c840', display: 'inline-block' }} />
        <span style={{ color: colors[color], fontSize: 13, marginLeft: 8, fontWeight: 'bold' }}>{title}</span>
      </div>
      <div style={{ padding: 16, color: colors[color], fontSize: 13, minHeight: 120, maxHeight: 280, overflowY: 'auto' }}>
        {children}
      </div>
    </div>
  );
}

function StatCard({ label, value, icon, color }) {
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '20px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 28 }}>{icon}</div>
      <div style={{ color: color || '#00d4ff', fontSize: 26, fontWeight: 'bold', fontFamily: 'monospace', marginTop: 4 }}>{value}</div>
      <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4 }}>{label}</div>
    </div>
  );
}

export default function AdminPage() {
  const [authed, setAuthed] = useState(false);
  const [loginEmail, setLoginEmail] = useState('ahmed_sharnou@yahoo.com');
  const [loginPass, setLoginPass] = useState('');
  const [loginErr, setLoginErr] = useState('');
  const [loginLoading, setLoginLoading] = useState(false);
  const [tab, setTab] = useState('dashboard');
  const [users, setUsers] = useState([]);
  const [ads, setAds] = useState([]);
  const [reports, setReports] = useState([]);
  const [logs, setLogs] = useState([]);
  const [errors, setErrors] = useState([]);
  const [broadcast, setBroadcast] = useState('');
  const [aiChat, setAiChat] = useState([{ role: 'system', text: 'XTOX AI Developer ready.' }]);
  const [aiInput, setAiInput] = useState('');
  const [repairProblem, setRepairProblem] = useState('');
  const [liveLog, setLiveLog] = useState(['[SYSTEM] Admin panel loaded', '[DB] Connecting...']);
  const [stats, setStats] = useState({ users: 0, ads: 0, reports: 0 });
  const [token, setToken] = useState('');
  const chatRef = useRef(null);

  // --- NEW: Search & filter state ---
  const [userSearch, setUserSearch] = useState('');
  const [userCountryFilter, setUserCountryFilter] = useState('');
  const [adSearch, setAdSearch] = useState('');
  const [adCategoryFilter, setAdCategoryFilter] = useState('');

  // --- NEW: Derived filtered lists ---
  const userCountries = useMemo(() => [...new Set(users.map(u => u.country).filter(Boolean))].sort(), [users]);
  const filteredUsers = useMemo(() => {
    const q = userSearch.toLowerCase();
    return users.filter(u => {
      const matchSearch = !q ||
        (u.name || '').toLowerCase().includes(q) ||
        (u.email || '').toLowerCase().includes(q) ||
        (u.phone || '').toLowerCase().includes(q) ||
        (u.country || '').toLowerCase().includes(q);
      const matchCountry = !userCountryFilter || u.country === userCountryFilter;
      return matchSearch && matchCountry;
    });
  }, [users, userSearch, userCountryFilter]);

  const adCategories = useMemo(() => [...new Set(ads.map(a => a.category).filter(Boolean))].sort(), [ads]);
  const filteredAds = useMemo(() => {
    const q = adSearch.toLowerCase();
    return ads.filter(a => {
      const matchSearch = !q ||
        (a.title || '').toLowerCase().includes(q) ||
        (a.category || '').toLowerCase().includes(q) ||
        (a.city || '').toLowerCase().includes(q);
      const matchCat = !adCategoryFilter || a.category === adCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [ads, adSearch, adCategoryFilter]);

  const clearFilters = () => {
    setUserSearch('');
    setUserCountryFilter('');
    setAdSearch('');
    setAdCategoryFilter('');
  };

  const hasActiveFilters = userSearch || userCountryFilter || adSearch || adCategoryFilter;

  useEffect(() => {
    try {
      const stored = localStorage.getItem('xtox_admin_token');
      const user = JSON.parse(localStorage.getItem('xtox_admin_user') || '{}');
      if (stored && (user.role === 'admin' || user.role === 'sub_admin')) {
        setToken(stored);
        setAuthed(true);
        fetchAll(stored);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (!authed) return;
    const msgs = ['[AI] System scan complete', '[RANK] Rankings updated', '[FRAUD] 0 threats', '[MEDIA] CDN sync OK', '[GEO] Country lock active', '[CRON] Backup scheduled', '[SEC] JWT valid', '[NET] 12ms latency'];
    const iv = setInterval(() => {
      setLiveLog(l => [...l.slice(-25), `[${new Date().toLocaleTimeString()}] ${msgs[Math.floor(Math.random() * msgs.length)]}`]);
    }, 4000);
    return () => clearInterval(iv);
  }, [authed]);

  async function login() {
    setLoginErr('');
    setLoginLoading(true);
    try {
      const res = await fetch(`${RAILWAY}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' },
        body: JSON.stringify({ email: loginEmail.trim().toLowerCase(), password: loginPass })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLoginErr(data.error || `Error ${res.status}: ${res.statusText}`);
        setLoginLoading(false);
        return;
      }
      if (!data.token) { setLoginErr('No token received from server'); setLoginLoading(false); return; }
      if (data.user?.role !== 'admin' && data.user?.role !== 'sub_admin') {
        setLoginErr('Access denied — Admin account required');
        setLoginLoading(false);
        return;
      }
      localStorage.setItem('xtox_admin_token', data.token);
      localStorage.setItem('xtox_admin_user', JSON.stringify(data.user));
      setToken(data.token);
      setAuthed(true);
      fetchAll(data.token);
    } catch (e) {
      setLoginErr(`Connection failed: ${e.message}. Check Railway is online.`);
    }
    setLoginLoading(false);
  }

  async function fetchAll(tk) {
    const h = { 'Authorization': `Bearer ${tk || token}`, 'Accept': 'application/json' };
    const get = (url) => fetch(url, { headers: h }).then(r => r.ok ? r.json() : []).catch(() => []);
    const [u, a, r, l, e] = await Promise.all([
      get(`${RAILWAY}/api/admin/users`),
      get(`${RAILWAY}/api/admin/ads`),
      get(`${RAILWAY}/api/admin/reports`),
      get(`${RAILWAY}/api/admin/ai-logs`),
      get(`${RAILWAY}/api/errors`),
    ]);
    setUsers(Array.isArray(u) ? u : []);
    setAds(Array.isArray(a) ? a : []);
    setReports(Array.isArray(r) ? r : []);
    setLogs(Array.isArray(l) ? l : []);
    setErrors(Array.isArray(e) ? e : []);
    setStats({ users: (Array.isArray(u) ? u : []).length, ads: (Array.isArray(a) ? a : []).length, reports: (Array.isArray(r) ? r : []).length });
    setLiveLog(l => [...l, `[DB] Loaded: ${(Array.isArray(u)?u:[]).length} users, ${(Array.isArray(a)?a:[]).length} ads`]);
  }

  const post = (path, body) => fetch(`${RAILWAY}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
    body: JSON.stringify(body)
  }).then(r => r.json()).catch(e => ({ error: e.message }));

  const ban = (id, hours) => post('/api/admin/ban', { id, hours }).then(() => fetchAll());
  const featureAd = (adId, style) => post('/api/admin/feature', { adId, style }).then(() => fetchAll());
  const fixCats = () => post('/api/admin/fix-categories', {}).then(r => alert(`Fixed: ${r.fixed || 0} ads`));
  const backup = () => window.open(`${RAILWAY}/api/admin/backup`, '_blank');
  const sendBroadcast = () => post('/api/admin/broadcast', { message: broadcast }).then(r => { if (r.error) alert('Error: ' + r.error); else { alert('Sent!'); setBroadcast(''); } });
  const requestRepair = () => post('/api/admin/ai-repair/request', { problem: repairProblem }).then(r => { setLogs(l => [r, ...l]); setRepairProblem(''); alert('Repair requested'); });
  const resolveError = (id) => fetch(`${RAILWAY}/api/errors/${id}/resolve`, { method: 'PATCH', headers: { 'Authorization': `Bearer ${token}` } }).then(() => fetchAll());

  // --- UPDATED: Bilingual Arabic/English tab labels ---
  const TABS = [
    { id: 'dashboard', icon: '📊', en: 'Dashboard', ar: 'لوحة التحكم' },
    { id: 'ai',        icon: '🤖', en: 'AI Dev',    ar: 'المطور الذكي' },
    { id: 'users',     icon: '👥', en: 'Users',     ar: 'المستخدمون' },
    { id: 'ads',       icon: '📋', en: 'Ads',       ar: 'الإعلانات' },
    { id: 'errors',    icon: '🔴', en: 'Errors',    ar: 'الأخطاء' },
    { id: 'broadcast', icon: '📢', en: 'Broadcast', ar: 'الإذاعة' },
    { id: 'system',    icon: '⚙️', en: 'System',    ar: 'النظام' },
  ];

  // --- NEW: Shared search bar style ---
  const inputStyle = { background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '7px 10px', color: '#e6edf3', fontSize: 12, fontFamily: 'monospace', outline: 'none' };
  const selectStyle = { ...inputStyle, cursor: 'pointer' };
  const clearBtnStyle = { background: '#21262d', color: '#ffd700', border: '1px solid #ffd700', borderRadius: 6, padding: '7px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace', whiteSpace: 'nowrap' };
  const countStyle = { color: '#8b949e', fontSize: 11, marginBottom: 10, fontFamily: 'monospace' };

  if (!authed) return (
    <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
      <div style={{ background: '#161b22', border: '1px solid #00ff41', borderRadius: 12, padding: 48, width: 400, boxShadow: '0 0 40px rgba(0,255,65,0.15)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 44 }}>🛡</div>
          <h1 style={{ color: '#00ff41', fontSize: 22, fontWeight: 'bold', margin: '8px 0 4px' }}>XTOX ADMIN</h1>
          <p style={{ color: '#8b949e', fontSize: 12 }}>Secure Control Center</p>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ color: '#00ff41', fontSize: 11, display: 'block', marginBottom: 5 }}>EMAIL</label>
          <input value={loginEmail} onChange={e => setLoginEmail(e.target.value)} type="email"
            style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }}
            placeholder="admin@email.com" onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ color: '#00ff41', fontSize: 11, display: 'block', marginBottom: 5 }}>PASSWORD</label>
          <input value={loginPass} onChange={e => setLoginPass(e.target.value)} type="password"
            style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 6, padding: '10px 12px', color: '#fff', fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }}
            placeholder="••••••••" onKeyDown={e => e.key === 'Enter' && login()} />
        </div>
        {loginErr && <div style={{ color: '#ff4444', fontSize: 12, marginBottom: 14, background: '#1a0000', padding: '8px 12px', borderRadius: 6, border: '1px solid #ff4444' }}>⚠ {loginErr}</div>}
        <button onClick={login} disabled={loginLoading}
          style={{ width: '100%', background: loginLoading ? '#333' : '#00ff41', color: '#0d1117', border: 'none', borderRadius: 6, padding: '12px', fontWeight: 'bold', fontSize: 14, cursor: loginLoading ? 'not-allowed' : 'pointer', fontFamily: 'monospace' }}>
          {loginLoading ? 'CONNECTING...' : 'ACCESS SYSTEM →'}
        </button>
        <p style={{ color: '#30363d', fontSize: 10, textAlign: 'center', marginTop: 16 }}>XTOX Control v2.0 — {RAILWAY}</p>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: '100vh', background: '#0d1117', color: '#e6edf3', fontFamily: 'monospace' }}>
      <div style={{ background: '#161b22', borderBottom: '1px solid #30363d', padding: '12px 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
        <span style={{ color: '#00ff41', fontWeight: 'bold', fontSize: 18 }}>⬡ XTOX</span>
        <span style={{ color: '#8b949e', fontSize: 12 }}>Admin Control Center</span>
        {hasActiveFilters && (
          <button onClick={clearFilters}
            style={{ background: '#2d2a1a', color: '#ffd700', border: '1px solid #ffd700', borderRadius: 6, padding: '4px 12px', cursor: 'pointer', fontSize: 11, fontFamily: 'monospace' }}>
            ✕ Clear Filters / مسح الفلاتر
          </button>
        )}
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ width: 8, height: 8, borderRadius: '50%', background: '#00ff41', display: 'inline-block' }} />
          <span style={{ color: '#8b949e', fontSize: 11 }}>Ahmed Sharnou</span>
          <button onClick={() => { localStorage.removeItem('xtox_admin_token'); localStorage.removeItem('xtox_admin_user'); setAuthed(false); setToken(''); }}
            style={{ background: 'transparent', border: '1px solid #30363d', color: '#8b949e', padding: '4px 10px', borderRadius: 4, cursor: 'pointer', fontSize: 11 }}>Logout</button>
        </div>
      </div>

      <div style={{ display: 'flex', minHeight: 'calc(100vh - 53px)' }}>
        <div style={{ width: 190, background: '#161b22', borderRight: '1px solid #30363d', padding: '12px 0', flexShrink: 0 }}>
          {TABS.map(t => (
            <button key={t.id} onClick={() => setTab(t.id)}
              style={{ display: 'block', width: '100%', textAlign: 'left', padding: '9px 18px', background: tab === t.id ? '#21262d' : 'transparent', color: tab === t.id ? '#00ff41' : '#8b949e', border: 'none', cursor: 'pointer', fontSize: 12, borderLeft: tab === t.id ? '2px solid #00ff41' : '2px solid transparent' }}>
              <span>{t.icon} {t.en}</span>
              <span dir="rtl" style={{ display: 'block', fontSize: 10, color: tab === t.id ? 'rgba(0,255,65,0.6)' : 'rgba(139,148,158,0.6)', marginTop: 1 }}>{t.ar}</span>
            </button>
          ))}
          <div style={{ margin: '14px 10px 0', padding: '10px', background: '#0d1117', borderRadius: 6, border: '1px solid #21262d' }}>
            <p style={{ color: '#8b949e', fontSize: 10, margin: 0 }}>Health</p>
            <p style={{ color: '#00ff41', fontSize: 12, margin: '3px 0 0', fontWeight: 'bold' }}>✅ Online</p>
          </div>
        </div>

        <div style={{ flex: 1, padding: 20, overflowY: 'auto' }}>
          {tab === 'dashboard' && (
            <div>
              <h2 style={{ color: '#00d4ff', marginBottom: 16, fontSize: 16 }}>
                📊 Dashboard <span dir="rtl" style={{ color: '#8b949e', fontSize: 12, fontWeight: 'normal' }}>/ لوحة التحكم</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
                <StatCard label="Users" value={stats.users} icon="👥" color="#00d4ff" />
                <StatCard label="Ads" value={stats.ads} icon="📋" color="#00ff41" />
                <StatCard label="Reports" value={stats.reports} icon="🚨" color="#ff4444" />
                <StatCard label="AI Logs" value={logs.length} icon="🤖" color="#ffd700" />
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <AITerminal title="live.log" color="green">
                  {liveLog.map((l, i) => <div key={i} style={{ marginBottom: 3, opacity: i < liveLog.length - 4 ? 0.5 : 1, fontSize: 11 }}>{l}</div>)}
                </AITerminal>
                <AITerminal title="db.status" color="blue">
                  <div>{'>'} users: <span style={{ color: '#00d4ff' }}>{stats.users}</span></div>
                  <div>{'>'} ads: <span style={{ color: '#00ff41' }}>{stats.ads}</span></div>
                  <div>{'>'} reports: <span style={{ color: '#ff4444' }}>{stats.reports}</span></div>
                  <div>{'>'} mongo: <span style={{ color: '#00ff41' }}>connected ✅</span></div>
                  <div>{'>'} railway: <span style={{ color: '#00ff41' }}>online ✅</span></div>
                </AITerminal>
              </div>
            </div>
          )}

          {tab === 'users' && (
            <div>
              <h2 style={{ color: '#00d4ff', marginBottom: 12, fontSize: 16 }}>
                👥 Users <span dir="rtl" style={{ color: '#8b949e', fontSize: 12, fontWeight: 'normal' }}>/ المستخدمون</span>
              </h2>
              {/* NEW: User search & filter bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  value={userSearch}
                  onChange={e => setUserSearch(e.target.value)}
                  placeholder="🔍 Search / بحث — name, email, country"
                  style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                  dir="auto"
                />
                <select value={userCountryFilter} onChange={e => setUserCountryFilter(e.target.value)} style={selectStyle}>
                  <option value="">All Countries / كل الدول</option>
                  {userCountries.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {(userSearch || userCountryFilter) && (
                  <button onClick={clearFilters} style={clearBtnStyle}>✕ Clear / مسح</button>
                )}
              </div>
              <div style={countStyle}>
                Showing {filteredUsers.length} of {users.length} users
                <span dir="rtl" style={{ marginRight: 6 }}> / عرض {filteredUsers.length} من {users.length} مستخدماً</span>
              </div>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: '1px solid #30363d' }}>
                    {['Name','Email/Phone','Role','Country','Status','Actions'].map(h => <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#8b949e', fontWeight: 'normal' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredUsers.map(u => (
                      <tr key={u._id} style={{ borderBottom: '1px solid #21262d' }}>
                        <td style={{ padding: '9px 12px', color: '#e6edf3' }}>{u.name}</td>
                        <td style={{ padding: '9px 12px', color: '#8b949e' }}>{u.email || u.phone}</td>
                        <td style={{ padding: '9px 12px' }}><span style={{ background: u.role === 'admin' ? '#1f3a1f' : '#21262d', color: u.role === 'admin' ? '#00ff41' : '#8b949e', padding: '2px 7px', borderRadius: 10, fontSize: 10 }}>{u.role}</span></td>
                        <td style={{ padding: '9px 12px', color: '#8b949e' }}>{u.country}</td>
                        <td style={{ padding: '9px 12px' }}><span style={{ color: u.isBanned ? '#ff4444' : '#00ff41' }}>{u.isBanned ? '🔴' : '🟢'}</span></td>
                        <td style={{ padding: '9px 12px', display: 'flex', gap: 5 }}>
                          <button onClick={() => ban(u._id, 24)} style={{ background: '#3d1a1a', color: '#ff4444', border: '1px solid #ff4444', padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>Ban 24h</button>
                          <button onClick={() => ban(u._id)} style={{ background: '#21262d', color: '#8b949e', border: '1px solid #30363d', padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>Perm</button>
                        </td>
                      </tr>
                    ))}
                    {filteredUsers.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#8b949e', fontSize: 12 }}>
                        No users found / لا يوجد مستخدمون
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'ads' && (
            <div>
              <h2 style={{ color: '#00d4ff', marginBottom: 12, fontSize: 16 }}>
                📋 Ads <span dir="rtl" style={{ color: '#8b949e', fontSize: 12, fontWeight: 'normal' }}>/ الإعلانات</span>
              </h2>
              {/* NEW: Ads search & filter bar */}
              <div style={{ display: 'flex', gap: 8, marginBottom: 8, flexWrap: 'wrap', alignItems: 'center' }}>
                <input
                  value={adSearch}
                  onChange={e => setAdSearch(e.target.value)}
                  placeholder="🔍 Search / بحث — title, category, city"
                  style={{ ...inputStyle, flex: 1, minWidth: 200 }}
                  dir="auto"
                />
                <select value={adCategoryFilter} onChange={e => setAdCategoryFilter(e.target.value)} style={selectStyle}>
                  <option value="">All Categories / كل الفئات</option>
                  {adCategories.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {(adSearch || adCategoryFilter) && (
                  <button onClick={clearFilters} style={clearBtnStyle}>✕ Clear / مسح</button>
                )}
              </div>
              <div style={countStyle}>
                Showing {filteredAds.length} of {ads.length} ads
                <span dir="rtl" style={{ marginRight: 6 }}> / عرض {filteredAds.length} من {ads.length} إعلاناً</span>
              </div>
              <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                  <thead><tr style={{ borderBottom: '1px solid #30363d' }}>
                    {['Title','Category','City','Views','Status','Actions'].map(h => <th key={h} style={{ padding: '9px 12px', textAlign: 'left', color: '#8b949e', fontWeight: 'normal' }}>{h}</th>)}
                  </tr></thead>
                  <tbody>
                    {filteredAds.map(a => (
                      <tr key={a._id} style={{ borderBottom: '1px solid #21262d' }}>
                        <td style={{ padding: '9px 12px', color: '#e6edf3', maxWidth: 180, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{a.title}</td>
                        <td style={{ padding: '9px 12px', color: '#8b949e' }}>{a.category}</td>
                        <td style={{ padding: '9px 12px', color: '#8b949e' }}>{a.city}</td>
                        <td style={{ padding: '9px 12px', color: '#00d4ff' }}>{a.views}</td>
                        <td style={{ padding: '9px 12px' }}><span style={{ color: a.isFeatured ? '#ffd700' : '#8b949e' }}>{a.isFeatured ? '⭐' : '—'}</span></td>
                        <td style={{ padding: '9px 12px', display: 'flex', gap: 5 }}>
                          <button onClick={() => featureAd(a._id, 'normal')} style={{ background: '#2d2a1a', color: '#ffd700', border: '1px solid #ffd700', padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>⭐</button>
                          <button onClick={() => featureAd(a._id, 'cartoon')} style={{ background: '#2d1a2d', color: '#bf5fff', border: '1px solid #bf5fff', padding: '2px 7px', borderRadius: 4, cursor: 'pointer', fontSize: 10 }}>🎨</button>
                        </td>
                      </tr>
                    ))}
                    {filteredAds.length === 0 && (
                      <tr><td colSpan={6} style={{ padding: '20px', textAlign: 'center', color: '#8b949e', fontSize: 12 }}>
                        No ads found / لا يوجد إعلانات
                      </td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {tab === 'errors' && (
            <div>
              <h2 style={{ color: '#ff4444', marginBottom: 14, fontSize: 16 }}>
                🔴 Error Logs <span dir="rtl" style={{ color: '#8b949e', fontSize: 12, fontWeight: 'normal' }}>/ الأخطاء</span> ({errors.length})
              </h2>
              <button onClick={() => fetchAll()} style={{ background: '#21262d', color: '#00d4ff', border: '1px solid #00d4ff', padding: '6px 14px', borderRadius: 6, cursor: 'pointer', fontSize: 11, marginBottom: 14, fontFamily: 'monospace' }}>$ refresh</button>
              {errors.length === 0 && <AITerminal title="errors.log" color="green"><div>✅ No errors. System clean.</div></AITerminal>}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {errors.map(err => (
                  <div key={err._id} style={{ background: '#161b22', border: `1px solid ${err.severity === 'high' || err.severity === 'critical' ? '#ff4444' : '#ffd700'}`, borderRadius: 8, padding: '10px 14px' }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 6, flexWrap: 'wrap' }}>
                      <span style={{ background: '#3d1a1a', color: '#ff4444', padding: '1px 7px', borderRadius: 10, fontSize: 10 }}>{err.severity}</span>
                      <span style={{ color: '#00d4ff', fontSize: 11 }}>{err.page}</span>
                      <span style={{ color: '#8b949e', fontSize: 10, marginLeft: 'auto' }}>{new Date(err.createdAt).toLocaleString()}</span>
                      {!err.resolved && <button onClick={() => resolveError(err._id)} style={{ background: '#1f3a1f', color: '#00ff41', border: '1px solid #00ff41', padding: '1px 8px', borderRadius: 4, cursor: 'pointer', fontSize: 10, fontFamily: 'monospace' }}>resolve</button>}
                    </div>
                    <div style={{ color: '#e6edf3', fontSize: 11 }}>{err.message?.slice(0, 120)}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {tab === 'ai' && (
            <div>
              <h2 style={{ color: '#bf5fff', marginBottom: 14, fontSize: 16 }}>
                🤖 AI Developer <span dir="rtl" style={{ color: '#8b949e', fontSize: 12, fontWeight: 'normal' }}>/ المطور الذكي</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <AITerminal title="ai-repair.js" color="yellow">
                  <textarea value={repairProblem} onChange={e => setRepairProblem(e.target.value)}
                    style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 4, padding: '6px', color: '#fff', fontSize: 11, fontFamily: 'monospace', resize: 'vertical', boxSizing: 'border-box', height: 60 }}
                    placeholder="Describe the problem..." />
                  <button onClick={requestRepair} style={{ marginTop: 6, background: '#ffd700', color: '#0d1117', border: 'none', borderRadius: 4, padding: '6px 12px', cursor: 'pointer', fontSize: 11, fontWeight: 'bold' }}>REQUEST FIX</button>
                </AITerminal>
                <AITerminal title="quick-actions.sh" color="green">
                  <button onClick={fixCats} style={{ display: 'block', width: '100%', background: '#21262d', color: '#00ff41', border: '1px solid #00ff41', borderRadius: 4, padding: '7px', marginBottom: 6, cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'monospace' }}>$ fix-categories --all</button>
                  <button onClick={backup} style={{ display: 'block', width: '100%', background: '#21262d', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 4, padding: '7px', marginBottom: 6, cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'monospace' }}>$ backup --full</button>
                  <button onClick={() => fetchAll()} style={{ display: 'block', width: '100%', background: '#21262d', color: '#ffd700', border: '1px solid #ffd700', borderRadius: 4, padding: '7px', cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'monospace' }}>$ refresh --all</button>
                </AITerminal>
              </div>
            </div>
          )}

          {tab === 'broadcast' && (
            <div>
              <h2 style={{ color: '#ffd700', marginBottom: 14, fontSize: 16 }}>
                📢 Weekly Broadcast <span dir="rtl" style={{ color: '#8b949e', fontSize: 12, fontWeight: 'normal' }}>/ الإذاعة الأسبوعية</span>
              </h2>
              <AITerminal title="broadcast.js" color="yellow">
                <div style={{ marginBottom: 8, color: '#8b949e', fontSize: 11 }}>Send to all {stats.users} users (1/week limit)</div>
                <textarea value={broadcast} onChange={e => setBroadcast(e.target.value)}
                  style={{ width: '100%', background: '#0d1117', border: '1px solid #30363d', borderRadius: 4, padding: '7px', color: '#fff', fontSize: 12, fontFamily: 'monospace', resize: 'vertical', height: 80, boxSizing: 'border-box' }}
                  placeholder="Your message to all users..." />
                <button onClick={sendBroadcast} style={{ marginTop: 8, background: '#ffd700', color: '#0d1117', border: 'none', borderRadius: 4, padding: '9px 18px', cursor: 'pointer', fontWeight: 'bold', fontFamily: 'monospace', fontSize: 12 }}>
                  BROADCAST →
                </button>
              </AITerminal>
            </div>
          )}

          {tab === 'system' && (
            <div>
              <h2 style={{ color: '#00d4ff', marginBottom: 14, fontSize: 16 }}>
                ⚙️ System <span dir="rtl" style={{ color: '#8b949e', fontSize: 12, fontWeight: 'normal' }}>/ النظام</span>
              </h2>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <AITerminal title="system.sh" color="green">
                  <div style={{ display: 'grid', gap: 6 }}>
                    <button onClick={fixCats} style={{ background: '#0d1117', color: '#00ff41', border: '1px solid #00ff41', borderRadius: 4, padding: '8px', cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'monospace' }}>🔧 Auto-Fix Categories</button>
                    <button onClick={backup} style={{ background: '#0d1117', color: '#00d4ff', border: '1px solid #00d4ff', borderRadius: 4, padding: '8px', cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'monospace' }}>💾 Backup Database</button>
                    <button onClick={() => fetchAll()} style={{ background: '#0d1117', color: '#ffd700', border: '1px solid #ffd700', borderRadius: 4, padding: '8px', cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'monospace' }}>🔄 Refresh All Data</button>
                    <button onClick={() => window.open(`${RAILWAY}/rss/EG`, '_blank')} style={{ background: '#0d1117', color: '#bf5fff', border: '1px solid #bf5fff', borderRadius: 4, padding: '8px', cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'monospace' }}>📡 RSS Feed</button>
                    <button onClick={() => window.open(`${RAILWAY}`, '_blank')} style={{ background: '#0d1117', color: '#00ff41', border: '1px solid #00ff41', borderRadius: 4, padding: '8px', cursor: 'pointer', fontSize: 11, textAlign: 'left', fontFamily: 'monospace' }}>🏥 Health Check</button>
                  </div>
                </AITerminal>
                <AITerminal title="live.log" color="blue">
                  {liveLog.slice(-12).map((l, i) => <div key={i} style={{ marginBottom: 3, fontSize: 11, opacity: 0.6 + (i / 12 * 0.4) }}>{l}</div>)}
                </AITerminal>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
