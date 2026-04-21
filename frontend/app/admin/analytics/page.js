'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useCallback } from 'react';
import AdminLayout from '../components/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

function getToken() {
  return (
    localStorage.getItem('xtox_admin_token') ||
    localStorage.getItem('xtox_token') ||
    localStorage.getItem('token') ||
    localStorage.getItem('authToken') || ''
  );
}

async function apiFetch(path, tok) {
  const res = await fetch(API + path, {
    headers: { Authorization: 'Bearer ' + tok, Accept: 'application/json' },
  });
  const data = await res.json().catch(() => ({}));
  return { ok: res.ok, data };
}

// ── Simple bar chart ─────────────────────────────────────
function BarChart({ data, color = '#00d4ff', maxH = 80, labelKey = '_id', valueKey = 'count' }) {
  if (!data || data.length === 0) return <div style={{ color: '#8b949e', textAlign: 'center', padding: 20 }}>لا توجد بيانات</div>;
  const max = Math.max(...data.map(d => d[valueKey] || 0), 1);
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 4, overflowX: 'auto', paddingBottom: 24, position: 'relative' }}>
      {data.map((item, i) => {
        const h = Math.max(4, ((item[valueKey] || 0) / max) * maxH);
        return (
          <div key={i} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', minWidth: 24 }}>
            <div style={{ fontSize: 10, color, marginBottom: 4 }}>{item[valueKey] || 0}</div>
            <div title={`${item[labelKey]}: ${item[valueKey]}`}
              style={{ width: 20, height: h, background: color, borderRadius: '3px 3px 0 0', opacity: 0.85 }} />
            <div style={{ fontSize: 8, color: '#8b949e', marginTop: 4, writingMode: 'vertical-rl', transform: 'rotate(180deg)', height: 40, overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {String(item[labelKey]).slice(-5)}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function StatBox({ label, value, color = '#00d4ff', icon }) {
  return (
    <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: '18px 16px', textAlign: 'center' }}>
      <div style={{ fontSize: 26 }}>{icon}</div>
      <div style={{ color, fontSize: 26, fontWeight: 'bold', fontFamily: 'monospace', margin: '4px 0' }}>{value ?? '–'}</div>
      <div style={{ color: '#8b949e', fontSize: 12, direction: 'rtl' }}>{label}</div>
    </div>
  );
}

export default function AnalyticsPage() {
  const [data, setData]     = useState(null);
  const [days, setDays]     = useState(30);
  const [loading, setLoading] = useState(false);
  const [error, setError]   = useState('');

  const load = useCallback(async (d) => {
    setLoading(true);
    setError('');
    try {
      const tok = getToken();
      const { ok, data: res } = await apiFetch(`/api/admin/analytics?days=${d}`, tok);
      if (ok) setData(res);
      else setError(res.error || 'فشل تحميل البيانات');
    } catch (e) {
      setError('خطأ في الاتصال: ' + e.message);
    }
    setLoading(false);
  }, []);

  useEffect(() => { load(days); }, [load, days]);

  const totalAds   = data?.adsByDay?.reduce((s, d) => s + (d.count || 0), 0) ?? 0;
  const totalUsers = data?.usersByDay?.reduce((s, d) => s + (d.count || 0), 0) ?? 0;

  return (
    <AdminLayout title="الإحصائيات">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24, flexWrap: 'wrap', gap: 12 }}>
        <h2 style={{ color: '#00d4ff', margin: 0, fontSize: 20 }}>📈 الإحصائيات والتحليلات</h2>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[7, 14, 30, 60, 90].map(d => (
            <button key={d} onClick={() => setDays(d)}
              style={{
                padding: '5px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                background: days === d ? '#00d4ff' : '#21262d',
                color: days === d ? '#0d1117' : '#8b949e',
                fontSize: 12, fontFamily: 'monospace',
              }}>
              {d}ي
            </button>
          ))}
          <button onClick={() => load(days)}
            style={{ padding: '5px 12px', borderRadius: 6, background: '#21262d', color: '#ffd700', border: '1px solid #ffd700', fontSize: 12, cursor: 'pointer', fontFamily: 'monospace' }}>
            🔄
          </button>
        </div>
      </div>

      {error && (
        <div style={{ background: '#1a0000', border: '1px solid #ff4444', borderRadius: 8, padding: '12px 16px', color: '#ff4444', marginBottom: 20, fontSize: 13 }}>
          ⚠ {error}
        </div>
      )}

      {loading && (
        <div style={{ color: '#ffd700', textAlign: 'center', padding: 48, fontSize: 16 }}>⏳ جارٍ تحميل الإحصائيات...</div>
      )}

      {!loading && data && (
        <>
          {/* Summary Cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 28 }}>
            <StatBox label={`إعلانات (${days} يوم)`} value={totalAds} icon="📋" color="#00ff41" />
            <StatBox label={`مستخدمون جدد (${days} يوم)`} value={totalUsers} icon="👥" color="#00d4ff" />
            <StatBox label="أعلى تصنيف" value={data.topCategories?.[0]?._id || '—'} icon="🗂️" color="#ffd700" />
            <StatBox label="أعلى مدينة" value={data.topCities?.[0]?._id || '—'} icon="📍" color="#bf5fff" />
          </div>

          {/* Ads by Day */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: '#00ff41', margin: '0 0 16px', fontSize: 15 }}>📋 الإعلانات اليومية (آخر {days} يوم)</h3>
            <BarChart data={data.adsByDay} color="#00ff41" />
          </div>

          {/* Users by Day */}
          <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 20, marginBottom: 20 }}>
            <h3 style={{ color: '#00d4ff', margin: '0 0 16px', fontSize: 15 }}>👥 المستخدمون الجدد اليومياً (آخر {days} يوم)</h3>
            <BarChart data={data.usersByDay} color="#00d4ff" />
          </div>

          {/* Two-column: categories + cities */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
            {/* Top Categories */}
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: '#ffd700', margin: '0 0 16px', fontSize: 15 }}>🗂️ أعلى التصنيفات</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data.topCategories || []).map((cat, i) => {
                  const maxVal = data.topCategories?.[0]?.count || 1;
                  const pct = ((cat.count / maxVal) * 100).toFixed(0);
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ color: '#e6edf3', fontSize: 13 }}>{cat._id || 'غير مصنف'}</span>
                        <span style={{ color: '#ffd700', fontSize: 12, fontFamily: 'monospace' }}>{cat.count}</span>
                      </div>
                      <div style={{ background: '#21262d', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{ background: '#ffd700', width: pct + '%', height: '100%', borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
                {!data.topCategories?.length && <div style={{ color: '#8b949e', fontSize: 13 }}>لا توجد بيانات</div>}
              </div>
            </div>

            {/* Top Cities */}
            <div style={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 12, padding: 20 }}>
              <h3 style={{ color: '#bf5fff', margin: '0 0 16px', fontSize: 15 }}>📍 أعلى المدن</h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {(data.topCities || []).map((city, i) => {
                  const maxVal = data.topCities?.[0]?.count || 1;
                  const pct = ((city.count / maxVal) * 100).toFixed(0);
                  return (
                    <div key={i}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
                        <span style={{ color: '#e6edf3', fontSize: 13 }}>{city._id || '—'}</span>
                        <span style={{ color: '#bf5fff', fontSize: 12, fontFamily: 'monospace' }}>{city.count}</span>
                      </div>
                      <div style={{ background: '#21262d', borderRadius: 4, height: 6, overflow: 'hidden' }}>
                        <div style={{ background: '#bf5fff', width: pct + '%', height: '100%', borderRadius: 4 }} />
                      </div>
                    </div>
                  );
                })}
                {!data.topCities?.length && <div style={{ color: '#8b949e', fontSize: 13 }}>لا توجد بيانات</div>}
              </div>
            </div>
          </div>
        </>
      )}
    </AdminLayout>
  );
}
