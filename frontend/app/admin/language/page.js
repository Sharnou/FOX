'use client';
export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
// Module-level to avoid TDZ after minification
const CATS = ['Vehicles', 'Electronics', 'Real Estate', 'Jobs', 'Services', 'Supermarket', 'Pharmacy', 'Fast Food', 'Fashion', 'General'];

// ── auth helper (matches admin/page.js localStorage keys) ──
function getAdminToken() {
  if (typeof window === 'undefined') return '';
  return (
    localStorage.getItem('xtox_admin_token') ||
    localStorage.getItem('xtox_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') || ''
  );
}

function getAdminUser() {
  if (typeof window === 'undefined') return null;
  try {
    const raw =
      localStorage.getItem('xtox_admin_user') ||
      localStorage.getItem('user') ||
      localStorage.getItem('currentUser') || '';
    return raw ? JSON.parse(raw) : null;
  } catch { return null; }
}

export default function LanguagePage() {
  // ── admin auth gate ─────────────────────────────────────
  const [authChecked, setAuthChecked] = useState(false);
  const [isAdmin, setIsAdmin]         = useState(false);

  useEffect(() => {
    const tok  = getAdminToken();
    const user = getAdminUser();
    if (tok && ['admin', 'sub_admin', 'superadmin'].includes(user?.role)) {
      setIsAdmin(true);
    }
    setAuthChecked(true);
  }, []);

  // ── state ───────────────────────────────────────────────
  const [words, setWords]       = useState([]);
  const [stats, setStats]       = useState(null);
  const [pending, setPending]   = useState([]);
  const [tab, setTab]           = useState('dictionary');
  const [search, setSearch]     = useState('');
  const [teaching, setTeaching] = useState({ word: '', meaning: '', category: '', subcategory: '', dialect: 'Egyptian' });
  const [learnText, setLearnText] = useState('');
  const [loading, setLoading]   = useState(false);

  const token   = authChecked ? getAdminToken() : '';
  const headers = { Authorization: 'Bearer ' + token };

  useEffect(() => {
    if (isAdmin) fetchAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, isAdmin]);

  async function fetchAll() {
    setLoading(true);
    try {
      const [w, s, p] = await Promise.allSettled([
        axios.get(API + '/api/language', { params: { search, limit: 100 } }),
        axios.get(API + '/api/language/stats', { headers }),
        axios.get(API + '/api/language/pending', { headers })
      ]);
      if (w.status === 'fulfilled') setWords(w.value.data.words || []);
      if (s.status === 'fulfilled') setStats(s.value.data);
      if (p.status === 'fulfilled') setPending(p.value.data || []);
    } catch (err) { console.error('[Language] fetch error:', err); }
    setLoading(false);
  }

  async function teach() {
    if (!teaching.word || !teaching.category) return alert('الكلمة والفئة مطلوبة');
    try {
      await axios.post(API + '/api/language/teach', { ...teaching, country: 'EG' }, { headers });
      alert('✅ تم تعليم الكلمة!');
      setTeaching({ word: '', meaning: '', category: '', subcategory: '', dialect: 'Egyptian' });
      fetchAll();
    } catch (e) { alert(e.response?.data?.error || 'خطأ'); }
  }

  async function triggerLearn() {
    if (!learnText.trim()) return;
    try {
      await axios.post(API + '/api/language/learn', { word: learnText.trim(), meaning: '', country: 'EG' }, { headers });
      alert('✅ تم إرسال الكلمة للتعلم');
      setLearnText('');
      setTimeout(fetchAll, 2000);
    } catch { alert('خطأ في التعلم'); }
  }

  async function approve(id, approved) {
    await axios.patch(API + '/api/language/' + id + '/approve', { approved }, { headers });
    fetchAll();
  }

  async function deleteWord(id) {
    if (!confirm('حذف هذه الكلمة؟')) return;
    await axios.delete(API + '/api/language/' + id, { headers });
    fetchAll();
  }

  // ── auth gate UI ─────────────────────────────────────────
  if (!authChecked) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>⏳ جارٍ التحقق...</span>
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div style={{ minHeight: '100vh', background: '#0d1117', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'monospace' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>🚫</div>
        <h2 style={{ color: '#ff4444', marginBottom: 12 }}>غير مصرح بالوصول</h2>
        <p style={{ color: '#8b949e', marginBottom: 24 }}>يجب أن تكون مشرفاً للوصول إلى هذه الصفحة</p>
        <a href="/admin" style={{ color: '#00ff41', textDecoration: 'none', border: '1px solid #00ff41', padding: '8px 20px', borderRadius: 8 }}>← العودة للوحة الإدارة</a>
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto', padding: 20, fontFamily: 'monospace', background: '#0d1117', minHeight: '100vh', color: '#e6edf3' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24 }}>
        <a href="/admin" style={{ color: '#00ff41', textDecoration: 'none', fontSize: 14 }}>← Admin</a>
        <h1 style={{ color: '#00d4ff', margin: 0, fontSize: 22 }}>🧠 Local Language AI Engine</h1>
        <span style={{ marginRight: 'auto', background: '#161b22', color: '#00ff41', padding: '4px 12px', borderRadius: 20, fontSize: 13 }}>{stats?.total || 0} كلمة</span>
      </div>

      {stats && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
          {[
            { label: 'إجمالي الكلمات', value: stats.total, color: '#00d4ff' },
            { label: 'انتظار الموافقة', value: stats.pending, color: '#ffd700' },
            { label: 'كلمات AI', value: words.filter(w => w.aiLearned).length, color: '#bf5fff' },
            { label: 'لغات', value: stats.byCountry?.length || 1, color: '#00ff41' },
          ].map((s, i) => (
            <div key={i} style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: 16, textAlign: 'center' }}>
              <div style={{ color: s.color, fontSize: 24, fontWeight: 'bold' }}>{s.value}</div>
              <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4 }}>{s.label}</div>
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', gap: 8, marginBottom: 20 }}>
        {[['dictionary','📚 القاموس'],['teach','✏️ تعليم'],['pending','⏳ انتظار'],['learn','🤖 تعلم']].map(([t, label]) => (
          <button key={t} onClick={() => setTab(t)}
            style={{ padding: '8px 16px', borderRadius: 8, border: 'none', cursor: 'pointer', fontFamily: 'monospace', fontSize: 13, background: tab === t ? '#00d4ff' : '#21262d', color: tab === t ? '#0d1117' : '#8b949e', fontWeight: tab === t ? 'bold' : 'normal' }}>
            {label} {t === 'pending' && pending.length > 0 && <span style={{ background: '#ff4444', color: 'white', borderRadius: '50%', padding: '0 5px', fontSize: 10 }}>{pending.length}</span>}
          </button>
        ))}
      </div>

      {tab === 'dictionary' && (
        <div>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="ابحث في القاموس..."
            style={{ width: '100%', padding: '10px 14px', borderRadius: 10, border: '1px solid #30363d', background: '#161b22', color: '#e6edf3', fontSize: 14, marginBottom: 16, boxSizing: 'border-box', fontFamily: 'monospace' }} />
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead><tr style={{ borderBottom: '1px solid #30363d' }}>
                {['الكلمة', 'المعنى', 'الفئة', 'الثقة', 'الاستخدام', 'AI', ''].map(h => (
                  <th key={h} style={{ padding: '10px 14px', textAlign: 'right', color: '#8b949e', fontWeight: 'normal' }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {loading ? <tr><td colSpan={7} style={{ padding: 30, textAlign: 'center', color: '#8b949e' }}>جار التحميل...</td></tr>
                : words.map(w => (
                  <tr key={w._id} style={{ borderBottom: '1px solid #21262d' }}>
                    <td style={{ padding: '8px 14px', color: '#00d4ff', fontWeight: 'bold', fontSize: 16 }}>{w.word}</td>
                    <td style={{ padding: '8px 14px', color: '#e6edf3' }}>{w.meaning || w.english}</td>
                    <td style={{ padding: '8px 14px' }}><span style={{ background: '#21262d', color: '#00ff41', padding: '2px 8px', borderRadius: 12, fontSize: 11 }}>{w.category}</span></td>
                    <td style={{ padding: '8px 14px' }}>
                      <div style={{ background: '#30363d', borderRadius: 4, overflow: 'hidden', height: 8, width: 60 }}>
                        <div style={{ background: (w.confidence || w.aiConfidence || 0) > 0.8 ? '#00ff41' : '#ffd700', width: (w.confidence || w.aiConfidence || 0.5) * 100 + '%', height: '100%' }} />
                      </div>
                    </td>
                    <td style={{ padding: '8px 14px', color: '#ffd700' }}>{w.frequency || w.count || 1}x</td>
                    <td style={{ padding: '8px 14px', color: w.aiLearned ? '#bf5fff' : '#8b949e', fontSize: 11 }}>{w.aiLearned ? '🤖' : '✍️'}</td>
                    <td style={{ padding: '8px 14px' }}>
                      <button onClick={() => deleteWord(w._id)} style={{ background: '#3d1a1a', color: '#ff4444', border: 'none', padding: '3px 8px', borderRadius: 6, cursor: 'pointer', fontSize: 11 }}>حذف</button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {tab === 'teach' && (
        <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 14, padding: 24 }}>
          <h3 style={{ color: '#00ff41', marginBottom: 20 }}>✏️ علّم الذكاء الاصطناعي كلمة جديدة</h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 16 }}>
            {[['word','الكلمة المحلية *','عربية'],['meaning','المعنى الإنجليزي *','car'],['subcategory','الفئة الفرعية','Cars'],['dialect','اللهجة','Egyptian']].map(([key, label, ph]) => (
              <div key={key}>
                <label style={{ display: 'block', color: '#8b949e', fontSize: 12, marginBottom: 6 }}>{label}</label>
                <input value={teaching[key]} onChange={e => setTeaching(t => ({ ...t, [key]: e.target.value }))} placeholder={ph}
                  style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #30363d', background: '#0d1117', color: '#e6edf3', fontSize: 14, boxSizing: 'border-box', fontFamily: 'monospace' }} />
              </div>
            ))}
            <div>
              <label style={{ display: 'block', color: '#8b949e', fontSize: 12, marginBottom: 6 }}>الفئة *</label>
              <select value={teaching.category} onChange={e => setTeaching(t => ({ ...t, category: e.target.value }))}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #30363d', background: '#0d1117', color: '#e6edf3', fontSize: 14 }}>
                <option value="">اختر</option>
                {CATS.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
          </div>
          <button onClick={teach} style={{ padding: '12px 28px', background: '#00ff41', color: '#0d1117', border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer', fontSize: 15, fontFamily: 'monospace' }}>💾 حفظ وتعليم</button>
        </div>
      )}

      {tab === 'pending' && (
        <div>
          <h3 style={{ color: '#ffd700', marginBottom: 16 }}>⏳ كلمات تنتظر موافقتك</h3>
          {pending.length === 0 ? <div style={{ textAlign: 'center', padding: 40, color: '#8b949e' }}>✅ لا توجد كلمات معلقة</div> : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {pending.map(w => (
                <div key={w._id} style={{ background: '#161b22', border: '1px solid #ffd700', borderRadius: 12, padding: 16, display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <div style={{ fontSize: 20, color: '#ffd700', fontWeight: 'bold', minWidth: 80 }}>{w.word}</div>
                  <div style={{ flex: 1 }}>
                    <span style={{ color: '#e6edf3' }}>{w.meaning || w.english}</span>
                    <span style={{ color: '#8b949e', margin: '0 8px' }}>→</span>
                    <span style={{ color: '#00d4ff' }}>{w.category}</span>
                  </div>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <button onClick={() => approve(w._id, true)} style={{ background: '#1f3a1f', color: '#00ff41', border: '1px solid #00ff41', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>✅ موافقة</button>
                    <button onClick={() => deleteWord(w._id)} style={{ background: '#3d1a1a', color: '#ff4444', border: '1px solid #ff4444', padding: '6px 14px', borderRadius: 8, cursor: 'pointer', fontFamily: 'monospace', fontSize: 12 }}>❌ رفض</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {tab === 'learn' && (
        <div style={{ background: '#161b22', border: '1px solid #bf5fff', borderRadius: 14, padding: 24 }}>
          <h3 style={{ color: '#bf5fff', marginBottom: 8 }}>🤖 أضف كلمة للتعلم</h3>
          <p style={{ color: '#8b949e', fontSize: 13, marginBottom: 16 }}>كل إعلان يُنشر يُعلّم النظام تلقائياً. يمكنك أيضاً إضافة كلمة يدوياً هنا.</p>
          <input value={learnText} onChange={e => setLearnText(e.target.value)} placeholder="أدخل كلمة لتعلمها (مثال: عربية)"
            style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #30363d', background: '#0d1117', color: '#e6edf3', fontSize: 15, marginBottom: 12, boxSizing: 'border-box', fontFamily: "'Cairo', 'Tajawal', system-ui" }} />
          <button onClick={triggerLearn} style={{ padding: '12px 28px', background: '#bf5fff', color: 'white', border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer', fontSize: 15, fontFamily: 'monospace' }}>🧠 تعلم الآن</button>
          <div style={{ marginTop: 20, padding: 16, background: '#0d1117', borderRadius: 10, border: '1px solid #30363d' }}>
            <p style={{ color: '#8b949e', fontSize: 13, margin: 0, lineHeight: 1.8 }}>
              <strong style={{ color: '#00d4ff' }}>كيف يعمل التعلم التلقائي:</strong><br />
              • كل إعلان يُنشر → النظام يستخرج الكلمات العربية<br />
              • الكلمات الجديدة → AI يترجمها ويحفظها تلقائياً<br />
              • الكلمات المتكررة → تزداد ثقتها وأولويتها<br />
              • الكلمات المنخفضة الثقة → تنتظر موافقتك هنا
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
