'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

function getToken() {
  return (
    localStorage.getItem('xtox_admin_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') || ''
  );
}

async function apiFetch(path, opts = {}) {
  const tok = getToken();
  const res = await fetch(API + path, {
    ...opts,
    headers: {
      Authorization: 'Bearer ' + tok,
      'Content-Type': 'application/json',
      Accept: 'application/json',
      ...(opts.headers || {}),
    },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, status: res.status, data };
}

export default function CategoriesPage() {
  const [stats, setStats]       = useState([]);
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState('');
  const [toast, setToast]       = useState('');
  const [running, setRunning]   = useState({ categorize: false, translate: false });

  const showToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 3000);
  }, []);

  async function loadStats() {
    setLoading(true);
    setError('');
    try {
      const { ok, data } = await apiFetch('/api/admin/categories/stats');
      if (ok) setStats(data.stats || []);
      else setError(data.error || 'فشل تحميل الإحصائيات');
    } catch (e) {
      setError('خطأ في الاتصال: ' + e.message);
    }
    setLoading(false);
  }

  useEffect(() => { loadStats(); }, []);

  async function runAutoCategorize() {
    if (!confirm('سيتم إعادة تصنيف جميع الإعلانات تلقائياً باستخدام الذكاء الاصطناعي. هذا قد يستغرق عدة دقائق. هل تريد المتابعة؟')) return;
    setRunning(r => ({ ...r, categorize: true }));
    try {
      const { ok, data } = await apiFetch('/api/ads/admin/auto-categorize-all', { method: 'POST', body: JSON.stringify({}) });
      if (ok) {
        showToast(`✅ تم التصنيف التلقائي: ${data.updated || 0} إعلان`);
        await loadStats();
      } else {
        showToast('❌ ' + (data.error || 'فشل التصنيف التلقائي'));
      }
    } catch (e) {
      showToast('❌ خطأ: ' + e.message);
    }
    setRunning(r => ({ ...r, categorize: false }));
  }

  async function runRegenerateTranslations() {
    if (!confirm('سيتم إعادة ترجمة جميع التصنيفات. هل تريد المتابعة؟')) return;
    setRunning(r => ({ ...r, translate: true }));
    try {
      const { ok, data } = await apiFetch('/api/ads/admin/regenerate-translations', { method: 'POST', body: JSON.stringify({}) });
      if (ok) {
        showToast('✅ ' + (data.message || 'تم إعادة توليد الترجمات'));
      } else {
        showToast('❌ ' + (data.error || 'فشل'));
      }
    } catch (e) {
      showToast('❌ خطأ: ' + e.message);
    }
    setRunning(r => ({ ...r, translate: false }));
  }

  async function runFixCategories() {
    setRunning(r => ({ ...r, fix: true }));
    try {
      const { ok, data } = await apiFetch('/api/admin/fix-categories', { method: 'POST', body: JSON.stringify({}) });
      if (ok) {
        showToast(`✅ تم إصلاح ${data.fixed || 0} إعلان`);
        await loadStats();
      } else {
        showToast('❌ ' + (data.error || 'فشل'));
      }
    } catch (e) {
      showToast('❌ ' + e.message);
    }
    setRunning(r => ({ ...r, fix: false }));
  }

  const totalAds = stats.reduce((s, c) => s + (c.total || 0), 0);
  const maxCount = Math.max(...stats.map(c => c.total || 0), 1);

  const categoryIcons = {
    Vehicles: '🚗', Electronics: '📱', 'Real Estate': '🏠', Jobs: '💼',
    Services: '🔧', Supermarket: '🛒', Pharmacy: '💊', 'Fast Food': '🍔',
    Fashion: '👗', General: '📦',
  };

  return (
    <AdminLayout title="التصنيفات">
      {/* Toast */}
      {toast && (
        <div style={{ position: 'fixed', bottom: 24, left: '50%', transform: 'translateX(-50%)', background: '#00ff41', color: '#0d1117', padding: '10px 24px', borderRadius: 999, fontWeight: 700, fontSize: 13, zIndex: 9999, whiteSpace: 'nowrap', boxShadow: '0 4px 16px rgba(0,255,65,0.35)' }}>
          {toast}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ color: '#00d4ff', margin: 0, fontSize: 20 }}>🗂️ إدارة التصنيفات</h2>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={runAutoCategorize} disabled={running.categorize}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #00ff41', background: running.categorize ? '#21262d' : '#1f3a1f', color: running.categorize ? '#8b949e' : '#00ff41', cursor: running.categorize ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Cairo, monospace', fontWeight: 600 }}>
            {running.categorize ? '⏳ جارٍ التصنيف...' : '🤖 تصنيف تلقائي لجميع الإعلانات'}
          </button>
          <button onClick={runRegenerateTranslations} disabled={running.translate}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #00d4ff', background: running.translate ? '#21262d' : '#1a2a33', color: running.translate ? '#8b949e' : '#00d4ff', cursor: running.translate ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Cairo, monospace', fontWeight: 600 }}>
            {running.translate ? '⏳ جارٍ الترجمة...' : '🌐 إعادة توليد الترجمات'}
          </button>
          <button onClick={runFixCategories} disabled={running.fix}
            style={{ padding: '8px 16px', borderRadius: 8, border: '1px solid #ffd700', background: running.fix ? '#21262d' : '#2d2a1a', color: running.fix ? '#8b949e' : '#ffd700', cursor: running.fix ? 'not-allowed' : 'pointer', fontSize: 12, fontFamily: 'Cairo, monospace', fontWeight: 600 }}>
            {running.fix ? '⏳...' : '🔧 إصلاح التصنيفات'}
          </button>
          <button onClick={loadStats}
            style={{ padding: '8px 14px', borderRadius: 8, border: '1px solid #30363d', background: '#21262d', color: '#8b949e', cursor: 'pointer', fontSize: 12, fontFamily: 'monospace' }}>
            🔄
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#1a0000', border: '1px solid #ff4444', borderRadius: 8, padding: '12px 16px', color: '#ff4444', marginBottom: 20, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {loading ? (
        <div style={{ color: '#ffd700', textAlign: 'center', padding: 48 }}>⏳ جارٍ تحميل الإحصائيات...</div>
      ) : (
        <>
          {/* Summary */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 24 }}>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#00d4ff', fontSize: 26, fontWeight: 'bold', fontFamily: 'monospace' }}>{totalAds}</div>
              <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4 }}>إجمالي الإعلانات</div>
            </div>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#00ff41', fontSize: 26, fontWeight: 'bold', fontFamily: 'monospace' }}>{stats.length}</div>
              <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4 }}>عدد التصنيفات</div>
            </div>
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 10, padding: '16px', textAlign: 'center' }}>
              <div style={{ color: '#ffd700', fontSize: 26, fontWeight: 'bold', fontFamily: 'monospace' }}>{stats[0]?._id || '—'}</div>
              <div style={{ color: '#8b949e', fontSize: 12, marginTop: 4 }}>أكثر تصنيف</div>
            </div>
          </div>

          {/* Categories List */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, overflow: 'hidden' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #30363d' }}>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#8b949e', fontWeight: 'normal' }}>التصنيف</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#8b949e', fontWeight: 'normal' }}>إجمالي الإعلانات</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#8b949e', fontWeight: 'normal' }}>النشطة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#8b949e', fontWeight: 'normal' }}>النسبة</th>
                  <th style={{ padding: '12px 16px', textAlign: 'right', color: '#8b949e', fontWeight: 'normal' }}>شريط التوزيع</th>
                </tr>
              </thead>
              <tbody>
                {stats.map((cat, i) => {
                  const icon = categoryIcons[cat._id] || '📦';
                  const pct = ((cat.total / maxCount) * 100).toFixed(0);
                  const pctOfAll = totalAds > 0 ? ((cat.total / totalAds) * 100).toFixed(1) : 0;
                  return (
                    <tr key={i} style={{ borderBottom: '1px solid #1a1f27' }}>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ fontSize: 18, marginLeft: 8 }}>{icon}</span>
                        <span style={{ color: '#e6edf3', fontWeight: 600 }}>{cat._id || 'غير مصنف'}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: '#00d4ff', fontFamily: 'monospace', fontWeight: 700 }}>{cat.total || 0}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: '#00ff41', fontFamily: 'monospace' }}>{cat.active || 0}</span>
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{ color: '#8b949e', fontSize: 12 }}>{pctOfAll}%</span>
                      </td>
                      <td style={{ padding: '12px 16px', minWidth: 120 }}>
                        <div style={{ background: '#21262d', borderRadius: 4, height: 8, overflow: 'hidden' }}>
                          <div style={{ background: '#00d4ff', width: pct + '%', height: '100%', borderRadius: 4 }} />
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {stats.length === 0 && (
                  <tr><td colSpan={5} style={{ padding: 40, textAlign: 'center', color: '#8b949e' }}>لا توجد تصنيفات — اضغط تحديث</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
