'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import AdminLayout from '../components/AdminLayout';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

function getToken() {
  if (typeof window === 'undefined') return null;
  return (
    localStorage.getItem('xtox_admin_token') ||
    localStorage.getItem('xtox_token') ||
    localStorage.getItem('token') ||
    ''
  );
}

const STATUS_COLORS = {
  pending:   { bg: '#fef3c7', color: '#92400e', label: 'قيد المراجعة' },
  active:    { bg: '#d1fae5', color: '#065f46', label: 'نشط' },
  confirmed: { bg: '#dbeafe', color: '#1e40af', label: 'مؤكد' },
  rejected:  { bg: '#fee2e2', color: '#991b1b', label: 'مرفوض' },
  expired:   { bg: '#f3f4f6', color: '#6b7280', label: 'منتهي' },
  cancelled: { bg: '#fce7f3', color: '#9d174d', label: 'ملغي' },
  refunded:  { bg: '#ede9fe', color: '#5b21b6', label: 'مُسترجع' },
};

const METHOD_LABELS = {
  stripe:      '💳 Stripe',
  manual:      '🧾 يدوي',
  admin_grant: '🎁 منحة إدارية',
};

const PLAN_LABELS = {
  featured: '★ مميز',
  premium:  '✦ بريميوم',
};

const LIMIT = 15;

export default function AdminPromotionsPage() {
  const router = useRouter();
  const [promos, setPromos]           = useState([]);
  const [stats, setStats]             = useState({});
  const [loading, setLoading]         = useState(true);
  const [total, setTotal]             = useState(0);
  const [page, setPage]               = useState(1);
  const [filter, setFilter]           = useState({ status: 'all', plan: 'all', method: 'all', search: '' });
  const [selected, setSelected]       = useState(null);
  const [showGrant, setShowGrant]     = useState(false);
  const [grantForm, setGrantForm]     = useState({ adId: '', plan: 'featured', durationDays: 14, adminNote: '' });
  const [actionLoading, setActionLoading] = useState('');
  const [note, setNote]               = useState('');
  const [toast, setToast]             = useState(null);
  const [receiptFile, setReceiptFile] = useState(null);

  const showToast = (msg, type = 'success') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3500);
  };

  const fetchStats = useCallback(async () => {
    try {
      const r = await fetch(`${API}/api/admin/promotions/stats`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (r.ok) setStats(await r.json());
    } catch {}
  }, []);

  const fetchPromos = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({ page, limit: LIMIT, ...filter });
      const r = await fetch(`${API}/api/admin/promotions?${params}`, {
        headers: { Authorization: `Bearer ${getToken()}` }
      });
      if (r.ok) {
        const d = await r.json();
        setPromos(d.promotions || []);
        setTotal(d.total || 0);
      }
    } catch {}
    setLoading(false);
  }, [page, filter]);

  useEffect(() => { fetchStats(); }, [fetchStats]);
  useEffect(() => { fetchPromos(); }, [fetchPromos]);

  const doAction = async (action, id, body = {}) => {
    setActionLoading(action + id);
    try {
      const method = action === 'note' ? 'PATCH' : 'POST';
      const r = await fetch(`${API}/api/admin/promotions/${id}/${action}`, {
        method,
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify(body)
      });
      const d = await r.json();
      if (r.ok) {
        showToast('تم تنفيذ الإجراء بنجاح ✅');
        fetchPromos();
        fetchStats();
        if (selected?._id === id) setSelected(null);
      } else {
        showToast(d.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
    setActionLoading('');
  };

  const uploadReceipt = async (id) => {
    if (!receiptFile) return;
    setActionLoading('receipt' + id);
    const fd = new FormData();
    fd.append('receipt', receiptFile);
    try {
      const r = await fetch(`${API}/api/admin/promotions/${id}/receipt`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${getToken()}` },
        body: fd
      });
      const d = await r.json();
      if (r.ok) {
        showToast('تم رفع الإيصال ✅');
        fetchPromos();
        setReceiptFile(null);
      } else {
        showToast(d.error || 'فشل رفع الإيصال', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
    setActionLoading('');
  };

  const doGrant = async () => {
    if (!grantForm.adId) return showToast('أدخل معرّف الإعلان', 'error');
    setActionLoading('grant');
    try {
      const r = await fetch(`${API}/api/admin/promotions/grant`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${getToken()}` },
        body: JSON.stringify({ ...grantForm, durationDays: Number(grantForm.durationDays) })
      });
      const d = await r.json();
      if (r.ok) {
        showToast('تم منح التمييز بنجاح ✅');
        setShowGrant(false);
        setGrantForm({ adId: '', plan: 'featured', durationDays: 14, adminNote: '' });
        fetchPromos();
        fetchStats();
      } else {
        showToast(d.error || 'حدث خطأ', 'error');
      }
    } catch {
      showToast('خطأ في الاتصال', 'error');
    }
    setActionLoading('');
  };

  const daysLeft = (endDate) => {
    if (!endDate) return null;
    return Math.ceil((new Date(endDate) - Date.now()) / 86400000);
  };

  const fmtDate = (d) =>
    d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric' }) : '—';

  const fmtAmount = (cents, cur = 'USD') => {
    if (!cents || cents === 0) return 'مجاني';
    return `${(cents / 100).toFixed(2)} ${cur === 'USD' ? '$' : cur}`;
  };

  const totalPages = Math.ceil(total / LIMIT);

  // ─── RENDER ──────────────────────────────────────────────────────────────
  return (
    <AdminLayout>
      <div style={{ padding: '20px 24px', direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif', maxWidth: 1400, margin: '0 auto' }}>

        {/* Toast */}
        {toast && (
          <div style={{
            position: 'fixed', top: 24, left: '50%', transform: 'translateX(-50%)',
            zIndex: 9999, background: toast.type === 'error' ? '#dc2626' : '#16a34a',
            color: '#fff', padding: '12px 28px', borderRadius: 12, fontWeight: 700,
            boxShadow: '0 4px 24px rgba(0,0,0,0.25)', fontSize: 14
          }}>
            {toast.msg}
          </div>
        )}

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 800, color: '#002f34', margin: 0 }}>إدارة طلبات التمييز</h1>
            <p style={{ color: '#6b7280', margin: '4px 0 0', fontSize: 13 }}>
              مراجعة وتأكيد طلبات Featured & Premium
            </p>
          </div>
          <button
            onClick={() => setShowGrant(true)}
            style={{
              background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
              border: 'none', borderRadius: 10, padding: '10px 20px',
              fontWeight: 700, cursor: 'pointer', fontSize: 14, fontFamily: 'inherit'
            }}>
            🎁 منح تمييز يدوي
          </button>
        </div>

        {/* Stats Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'إجمالي الإيرادات', value: stats.revenueFormatted || '$0.00', icon: '💰', color: '#002f34' },
            { label: 'قيد المراجعة',     value: stats.pending || 0,               icon: '⏳', color: '#f59e0b' },
            { label: 'نشط الآن',         value: stats.active  || 0,               icon: '✅', color: '#10b981' },
            { label: 'إجمالي الطلبات',   value: stats.total   || 0,               icon: '📋', color: '#6366f1' },
            { label: 'مرفوض',            value: stats.rejected || 0,              icon: '❌', color: '#ef4444' },
          ].map(s => (
            <div key={s.label} style={{
              background: '#fff', borderRadius: 14, padding: '16px 20px',
              boxShadow: '0 1px 8px rgba(0,0,0,0.07)', border: '1px solid #f3f4f6'
            }}>
              <div style={{ fontSize: 22 }}>{s.icon}</div>
              <div style={{ fontSize: 22, fontWeight: 800, color: s.color, marginTop: 4 }}>{s.value}</div>
              <div style={{ fontSize: 11, color: '#9ca3af', marginTop: 2 }}>{s.label}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div style={{
          background: '#fff', borderRadius: 14, padding: '14px 20px', marginBottom: 20,
          boxShadow: '0 1px 8px rgba(0,0,0,0.07)', display: 'flex', flexWrap: 'wrap', gap: 10, alignItems: 'center'
        }}>
          {/* Status tabs */}
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {['all','pending','active','confirmed','rejected','cancelled','expired'].map(s => (
              <button
                key={s}
                onClick={() => { setFilter(f => ({ ...f, status: s })); setPage(1); }}
                style={{
                  padding: '6px 13px', borderRadius: 20, border: 'none',
                  cursor: 'pointer', fontFamily: 'inherit', fontSize: 12, fontWeight: 600,
                  background: filter.status === s ? '#002f34' : '#f3f4f6',
                  color:      filter.status === s ? '#fff'    : '#374151',
                }}>
                {s === 'all' ? 'الكل' : (STATUS_COLORS[s]?.label || s)}
              </button>
            ))}
          </div>

          <select
            value={filter.plan}
            onChange={e => { setFilter(f => ({ ...f, plan: e.target.value })); setPage(1); }}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12 }}>
            <option value="all">كل الخطط</option>
            <option value="featured">★ مميز</option>
            <option value="premium">✦ بريميوم</option>
          </select>

          <select
            value={filter.method}
            onChange={e => { setFilter(f => ({ ...f, method: e.target.value })); setPage(1); }}
            style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '6px 12px', fontFamily: 'inherit', fontSize: 12 }}>
            <option value="all">كل طرق الدفع</option>
            <option value="stripe">Stripe</option>
            <option value="manual">يدوي</option>
            <option value="admin_grant">منحة</option>
          </select>

          <input
            value={filter.search}
            onChange={e => { setFilter(f => ({ ...f, search: e.target.value })); setPage(1); }}
            placeholder="بحث بالاسم أو الإيميل أو ID الإعلان..."
            style={{
              border: '1px solid #e5e7eb', borderRadius: 8,
              padding: '6px 14px', fontFamily: 'inherit', fontSize: 12, minWidth: 220, flex: 1
            }}
          />
        </div>

        {/* Table */}
        <div style={{ background: '#fff', borderRadius: 14, boxShadow: '0 1px 8px rgba(0,0,0,0.07)', overflow: 'hidden' }}>
          {loading ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 18 }}>⏳ جاري التحميل...</div>
          ) : promos.length === 0 ? (
            <div style={{ padding: 60, textAlign: 'center', color: '#9ca3af', fontSize: 16 }}>لا توجد طلبات</div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '1px solid #f3f4f6' }}>
                    {['الإعلان','البائع','الخطة','المبلغ','طريقة الدفع','الحالة','التواريخ','إيصال','إجراءات'].map(h => (
                      <th key={h} style={{
                        padding: '12px 14px', textAlign: 'right',
                        fontSize: 12, color: '#6b7280', fontWeight: 700, whiteSpace: 'nowrap'
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {promos.map(p => {
                    const days = daysLeft(p.endDate);
                    const st = STATUS_COLORS[p.status] || STATUS_COLORS.pending;
                    return (
                      <tr
                        key={p._id}
                        onClick={() => { setSelected(p); setNote(p.adminNote || ''); }}
                        style={{ borderBottom: '1px solid #f9fafb', cursor: 'pointer' }}
                        onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                        onMouseLeave={e => e.currentTarget.style.background = ''}>

                        {/* Ad */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                            <img
                              src={p.adSnapshot?.image
                                ? `https://res.cloudinary.com/dni9wcvx3/image/upload/f_auto,q_auto,w_56,h_56,c_fill/${p.adSnapshot.image}`
                                : '/category-images/other.jpg'}
                              alt=""
                              style={{ width: 46, height: 46, borderRadius: 8, objectFit: 'cover', flexShrink: 0 }}
                            />
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: '#111827', maxWidth: 170, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {p.adSnapshot?.title || p.adId?.title || 'إعلان محذوف'}
                              </div>
                              <div style={{ fontSize: 11, color: '#9ca3af' }}>
                                {p.adSnapshot?.category} · {p.adSnapshot?.city}
                              </div>
                              {p.adId?._id && (
                                <a
                                  href={`/ads/${p.adId._id}`}
                                  target="_blank"
                                  rel="noreferrer"
                                  onClick={e => e.stopPropagation()}
                                  style={{ fontSize: 10, color: '#6366f1', textDecoration: 'none' }}>
                                  عرض ↗
                                </a>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Seller */}
                        <td style={{ padding: '10px 14px' }}>
                          <div style={{ fontSize: 13, fontWeight: 600 }}>
                            {p.sellerSnapshot?.name || p.userId?.name || '—'}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {p.sellerSnapshot?.email || p.userId?.email}
                          </div>
                          <div style={{ fontSize: 11, color: '#6b7280' }}>
                            {p.sellerSnapshot?.phone}
                          </div>
                        </td>

                        {/* Plan */}
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                            background: p.plan === 'premium' ? '#fef3c7' : '#ede9fe',
                            color:      p.plan === 'premium' ? '#92400e' : '#5b21b6',
                          }}>
                            {PLAN_LABELS[p.plan] || p.plan}
                          </span>
                        </td>

                        {/* Amount */}
                        <td style={{ padding: '10px 14px', fontWeight: 700, color: '#002f34', fontSize: 14 }}>
                          {fmtAmount(p.amount, p.currency)}
                        </td>

                        {/* Method */}
                        <td style={{ padding: '10px 14px', fontSize: 12, color: '#6b7280' }}>
                          {METHOD_LABELS[p.paymentMethod] || p.paymentMethod}
                        </td>

                        {/* Status */}
                        <td style={{ padding: '10px 14px' }}>
                          <span style={{
                            padding: '4px 10px', borderRadius: 20, fontSize: 12, fontWeight: 700,
                            background: st.bg, color: st.color,
                          }}>
                            {st.label}
                          </span>
                          {days !== null && p.status === 'active' && (
                            <div style={{ fontSize: 10, color: days < 3 ? '#ef4444' : '#6b7280', marginTop: 3 }}>
                              {days > 0 ? `${days} يوم متبقي` : 'منتهي'}
                            </div>
                          )}
                        </td>

                        {/* Dates */}
                        <td style={{ padding: '10px 14px', fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap' }}>
                          <div>📅 {fmtDate(p.startDate || p.createdAt)}</div>
                          <div>🏁 {fmtDate(p.endDate)}</div>
                        </td>

                        {/* Receipt */}
                        <td style={{ padding: '10px 14px', textAlign: 'center' }}>
                          {p.receiptUrl ? (
                            <a
                              href={p.receiptUrl}
                              target="_blank"
                              rel="noreferrer"
                              onClick={e => e.stopPropagation()}
                              title="عرض الإيصال"
                              style={{ fontSize: 20, textDecoration: 'none' }}>
                              🧾
                            </a>
                          ) : (
                            <span style={{ color: '#d1d5db' }}>—</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td style={{ padding: '10px 14px' }} onClick={e => e.stopPropagation()}>
                          <div style={{ display: 'flex', gap: 5, flexWrap: 'nowrap' }}>
                            {p.status === 'pending' && (<>
                              <button
                                onClick={() => doAction('confirm', p._id)}
                                disabled={!!actionLoading}
                                style={{ background: '#10b981', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                ✅ تأكيد
                              </button>
                              <button
                                onClick={() => {
                                  const r = prompt('سبب الرفض:');
                                  if (r !== null) doAction('reject', p._id, { reason: r });
                                }}
                                disabled={!!actionLoading}
                                style={{ background: '#ef4444', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                ❌ رفض
                              </button>
                            </>)}
                            {p.status === 'active' && (<>
                              <button
                                onClick={() => {
                                  const d = parseInt(prompt('عدد الأيام للتمديد:', '7'));
                                  if (d > 0) doAction('extend', p._id, { days: d });
                                }}
                                disabled={!!actionLoading}
                                style={{ background: '#6366f1', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                ⏰ تمديد
                              </button>
                              <button
                                onClick={() => { if (confirm('إلغاء هذا التمييز؟')) doAction('cancel', p._id); }}
                                disabled={!!actionLoading}
                                style={{ background: '#9ca3af', color: '#fff', border: 'none', borderRadius: 7, padding: '5px 10px', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>
                                🚫
                              </button>
                            </>)}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
            <button
              onClick={() => setPage(p => Math.max(1, p - 1))}
              disabled={page <= 1}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#f3f4f6', cursor: 'pointer', fontWeight: 700 }}>
              ‹
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1).map(n => (
              <button
                key={n}
                onClick={() => setPage(n)}
                style={{
                  width: 36, height: 36, borderRadius: 8, border: 'none', cursor: 'pointer',
                  fontWeight: 700, fontSize: 13,
                  background: page === n ? '#002f34' : '#f3f4f6',
                  color:      page === n ? '#fff'    : '#374151',
                }}>
                {n}
              </button>
            ))}
            <button
              onClick={() => setPage(p => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
              style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#f3f4f6', cursor: 'pointer', fontWeight: 700 }}>
              ›
            </button>
          </div>
        )}

        {/* ─── DETAIL MODAL ─────────────────────────────────────────────────── */}
        {selected && (
          <div
            onClick={() => setSelected(null)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
            }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{
                background: '#fff', borderRadius: 20, width: '100%', maxWidth: 740,
                maxHeight: '92vh', overflowY: 'auto', direction: 'rtl'
              }}>
              {/* Modal Header */}
              <div style={{
                padding: '18px 24px', borderBottom: '1px solid #f3f4f6',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                position: 'sticky', top: 0, background: '#fff', zIndex: 1
              }}>
                <h2 style={{ margin: 0, fontWeight: 800, fontSize: 18, color: '#002f34' }}>
                  تفاصيل طلب التمييز
                </h2>
                <button
                  onClick={() => setSelected(null)}
                  style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 22, color: '#6b7280' }}>
                  ✕
                </button>
              </div>

              <div style={{ padding: 24 }}>
                {/* Badges */}
                <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
                  <span style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    background: STATUS_COLORS[selected.status]?.bg || '#f3f4f6',
                    color:      STATUS_COLORS[selected.status]?.color || '#374151',
                  }}>
                    {STATUS_COLORS[selected.status]?.label || selected.status}
                  </span>
                  <span style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    background: selected.plan === 'premium' ? '#fef3c7' : '#ede9fe',
                    color:      selected.plan === 'premium' ? '#92400e' : '#5b21b6',
                  }}>
                    {PLAN_LABELS[selected.plan] || selected.plan}
                  </span>
                  <span style={{
                    padding: '6px 16px', borderRadius: 20, fontSize: 13, fontWeight: 700,
                    background: '#f3f4f6', color: '#374151',
                  }}>
                    {METHOD_LABELS[selected.paymentMethod] || selected.paymentMethod}
                  </span>
                </div>

                {/* Ad + Seller Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginBottom: 20 }}>
                  {/* Ad */}
                  <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#6b7280', fontWeight: 700 }}>📢 الإعلان</h3>
                    <img
                      src={selected.adSnapshot?.image
                        ? `https://res.cloudinary.com/dni9wcvx3/image/upload/f_auto,q_auto,w_200/${selected.adSnapshot.image}`
                        : '/category-images/other.jpg'}
                      style={{ width: '100%', height: 120, objectFit: 'cover', borderRadius: 8, marginBottom: 10 }}
                      alt=""
                    />
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {selected.adSnapshot?.title || 'إعلان محذوف'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280' }}>
                      {selected.adSnapshot?.category} · {selected.adSnapshot?.city}
                    </div>
                    {selected.adSnapshot?.price && (
                      <div style={{ fontSize: 13, fontWeight: 700, color: '#002f34', marginTop: 6 }}>
                        {Number(selected.adSnapshot.price).toLocaleString('ar-EG')} ج.م
                      </div>
                    )}
                    {(selected.adId?._id || selected.adId) && (
                      <a
                        href={`/ads/${selected.adId?._id || selected.adId}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: '#6366f1', display: 'block', marginTop: 6 }}>
                        عرض الإعلان ↗
                      </a>
                    )}
                  </div>

                  {/* Seller */}
                  <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16 }}>
                    <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#6b7280', fontWeight: 700 }}>👤 البائع</h3>
                    <div style={{ fontWeight: 700, fontSize: 15, marginBottom: 4 }}>
                      {selected.sellerSnapshot?.name || selected.userId?.name || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 2 }}>
                      📧 {selected.sellerSnapshot?.email || selected.userId?.email || '—'}
                    </div>
                    <div style={{ fontSize: 12, color: '#6b7280', marginBottom: 8 }}>
                      📞 {selected.sellerSnapshot?.phone || '—'}
                    </div>
                    {selected.userId?._id && (
                      <a
                        href={`/profile/${selected.userId._id}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{ fontSize: 12, color: '#6366f1' }}>
                        عرض الملف الشخصي ↗
                      </a>
                    )}
                  </div>
                </div>

                {/* Payment Details */}
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#6b7280', fontWeight: 700 }}>💰 تفاصيل الدفع</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
                    {[
                      { label: 'المبلغ',        value: fmtAmount(selected.amount, selected.currency) },
                      { label: 'المدة',          value: `${selected.durationDays} يوم` },
                      { label: 'تاريخ الطلب',   value: fmtDate(selected.createdAt) },
                      { label: 'تاريخ البداية', value: fmtDate(selected.startDate) },
                      { label: 'تاريخ الانتهاء',value: fmtDate(selected.endDate) },
                      { label: 'Stripe Session', value: selected.stripeSessionId ? selected.stripeSessionId.slice(0,22)+'…' : '—' },
                    ].map(f => (
                      <div key={f.label}>
                        <div style={{ fontSize: 11, color: '#9ca3af', marginBottom: 2 }}>{f.label}</div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: '#111827', wordBreak: 'break-all' }}>{f.value}</div>
                      </div>
                    ))}
                  </div>
                  {selected.rejectionReason && (
                    <div style={{ marginTop: 12, padding: '8px 12px', background: '#fee2e2', borderRadius: 8, fontSize: 12, color: '#991b1b' }}>
                      سبب الرفض: {selected.rejectionReason}
                    </div>
                  )}
                </div>

                {/* Receipt */}
                <div style={{ background: '#f9fafb', borderRadius: 12, padding: 16, marginBottom: 20 }}>
                  <h3 style={{ margin: '0 0 12px', fontSize: 14, color: '#6b7280', fontWeight: 700 }}>🧾 الإيصال</h3>
                  {selected.receiptUrl ? (
                    <div>
                      {/\.(jpg|jpeg|png|webp)$/i.test(selected.receiptUrl) || selected.receiptUrl.startsWith('data:image') ? (
                        <img
                          src={selected.receiptUrl}
                          alt="إيصال"
                          style={{ maxWidth: '100%', maxHeight: 300, borderRadius: 8, objectFit: 'contain' }}
                        />
                      ) : (
                        <a
                          href={selected.receiptUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{
                            display: 'inline-block', padding: '8px 16px', background: '#6366f1',
                            color: '#fff', borderRadius: 8, fontSize: 13, textDecoration: 'none', fontWeight: 600
                          }}>
                          📎 فتح الإيصال
                        </a>
                      )}
                      {selected.receiptNotes && (
                        <p style={{ fontSize: 12, color: '#6b7280', marginTop: 8 }}>{selected.receiptNotes}</p>
                      )}
                      <a
                        href={selected.receiptUrl}
                        download
                        style={{ display: 'block', marginTop: 8, fontSize: 12, color: '#6366f1' }}>
                        ⬇ تحميل الإيصال
                      </a>
                    </div>
                  ) : (
                    <p style={{ color: '#9ca3af', fontSize: 13, margin: 0 }}>لا يوجد إيصال مرفق</p>
                  )}

                  {/* Upload Receipt */}
                  <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center' }}>
                    <input
                      type="file"
                      accept="image/*,.pdf"
                      onChange={e => setReceiptFile(e.target.files[0])}
                      style={{ fontSize: 12, flex: 1 }}
                    />
                    <button
                      onClick={() => uploadReceipt(selected._id)}
                      disabled={!receiptFile || actionLoading.startsWith('receipt')}
                      style={{
                        background: '#002f34', color: '#fff', border: 'none', borderRadius: 8,
                        padding: '6px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, whiteSpace: 'nowrap'
                      }}>
                      {actionLoading.startsWith('receipt') ? '⏳' : '⬆ رفع'}
                    </button>
                  </div>
                </div>

                {/* Admin Note */}
                <div style={{ marginBottom: 20 }}>
                  <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 6 }}>
                    ملاحظة إدارية
                  </label>
                  <div style={{ display: 'flex', gap: 8 }}>
                    <textarea
                      value={note}
                      onChange={e => setNote(e.target.value)}
                      rows={2}
                      placeholder="أضف ملاحظة خاصة بالإدارة..."
                      style={{
                        flex: 1, border: '1px solid #e5e7eb', borderRadius: 8,
                        padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', resize: 'vertical'
                      }}
                    />
                    <button
                      onClick={() => doAction('note', selected._id, { note })}
                      disabled={!!actionLoading}
                      style={{
                        background: '#6b7280', color: '#fff', border: 'none', borderRadius: 8,
                        padding: '8px 14px', cursor: 'pointer', fontSize: 12, fontWeight: 700, alignSelf: 'flex-start'
                      }}>
                      حفظ
                    </button>
                  </div>
                  {selected.adminNote && (
                    <div style={{ marginTop: 8, background: '#fef9c3', borderRadius: 8, padding: 10, fontSize: 13, color: '#713f12' }}>
                      📌 {selected.adminNote}
                    </div>
                  )}
                </div>

                {/* Action Buttons */}
                <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
                  {selected.status === 'pending' && (<>
                    <button
                      onClick={() => doAction('confirm', selected._id)}
                      disabled={!!actionLoading}
                      style={{
                        flex: 1, minWidth: 130, padding: '12px 20px', background: '#10b981',
                        color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
                        fontWeight: 800, fontSize: 14, fontFamily: 'inherit'
                      }}>
                      {actionLoading === ('confirm' + selected._id) ? '⏳' : '✅ تأكيد الدفع'}
                    </button>
                    <button
                      onClick={() => {
                        const r = prompt('سبب الرفض:');
                        if (r !== null) doAction('reject', selected._id, { reason: r });
                      }}
                      disabled={!!actionLoading}
                      style={{
                        flex: 1, minWidth: 130, padding: '12px 20px', background: '#ef4444',
                        color: '#fff', border: 'none', borderRadius: 10, cursor: 'pointer',
                        fontWeight: 800, fontSize: 14, fontFamily: 'inherit'
                      }}>
                      {actionLoading === ('reject' + selected._id) ? '⏳' : '❌ رفض الطلب'}
                    </button>
                  </>)}
                  {selected.status === 'active' && (<>
                    <button
                      onClick={() => {
                        const d = parseInt(prompt('عدد الأيام للتمديد:', '7'));
                        if (d > 0) doAction('extend', selected._id, { days: d });
                      }}
                      disabled={!!actionLoading}
                      style={{
                        padding: '12px 20px', background: '#6366f1', color: '#fff',
                        border: 'none', borderRadius: 10, cursor: 'pointer',
                        fontWeight: 800, fontSize: 14, fontFamily: 'inherit'
                      }}>
                      {actionLoading === ('extend' + selected._id) ? '⏳' : '⏰ تمديد'}
                    </button>
                    <button
                      onClick={() => { if (confirm('إلغاء هذا التمييز؟')) doAction('cancel', selected._id); }}
                      disabled={!!actionLoading}
                      style={{
                        padding: '12px 20px', background: '#9ca3af', color: '#fff',
                        border: 'none', borderRadius: 10, cursor: 'pointer',
                        fontWeight: 800, fontSize: 14, fontFamily: 'inherit'
                      }}>
                      {actionLoading === ('cancel' + selected._id) ? '⏳' : '🚫 إلغاء التمييز'}
                    </button>
                  </>)}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ─── GRANT MODAL ──────────────────────────────────────────────────── */}
        {showGrant && (
          <div
            onClick={() => setShowGrant(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.55)',
              zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16
            }}>
            <div
              onClick={e => e.stopPropagation()}
              style={{ background: '#fff', borderRadius: 20, width: '100%', maxWidth: 440, padding: 28, direction: 'rtl' }}>
              <h2 style={{ margin: '0 0 20px', fontSize: 18, fontWeight: 800, color: '#002f34' }}>
                🎁 منح تمييز يدوي
              </h2>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  معرّف الإعلان (ID)
                </label>
                <input
                  type="text"
                  value={grantForm.adId}
                  onChange={e => setGrantForm(g => ({ ...g, adId: e.target.value }))}
                  placeholder="الصق ID الإعلان هنا"
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  الخطة
                </label>
                <select
                  value={grantForm.plan}
                  onChange={e => setGrantForm(g => ({ ...g, plan: e.target.value }))}
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit' }}>
                  <option value="featured">★ مميز (Featured) — 14 يوم</option>
                  <option value="premium">✦ بريميوم (Premium) — 30 يوم</option>
                </select>
              </div>

              <div style={{ marginBottom: 14 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  المدة (أيام)
                </label>
                <input
                  type="number"
                  value={grantForm.durationDays}
                  onChange={e => setGrantForm(g => ({ ...g, durationDays: e.target.value }))}
                  min={1}
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 13, fontWeight: 700, color: '#374151', display: 'block', marginBottom: 4 }}>
                  ملاحظة إدارية
                </label>
                <input
                  type="text"
                  value={grantForm.adminNote}
                  onChange={e => setGrantForm(g => ({ ...g, adminNote: e.target.value }))}
                  placeholder="سبب المنح (اختياري)..."
                  style={{ width: '100%', border: '1px solid #e5e7eb', borderRadius: 8, padding: '8px 12px', fontSize: 13, fontFamily: 'inherit', boxSizing: 'border-box' }}
                />
              </div>

              <div style={{ display: 'flex', gap: 10 }}>
                <button
                  onClick={doGrant}
                  disabled={!grantForm.adId || actionLoading === 'grant'}
                  style={{
                    flex: 1, padding: '12px 20px',
                    background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    fontWeight: 800, fontSize: 14, fontFamily: 'inherit'
                  }}>
                  {actionLoading === 'grant' ? '⏳ جاري...' : '✅ منح التمييز'}
                </button>
                <button
                  onClick={() => setShowGrant(false)}
                  style={{
                    padding: '12px 20px', background: '#f3f4f6', color: '#374151',
                    border: 'none', borderRadius: 10, cursor: 'pointer',
                    fontWeight: 700, fontSize: 14, fontFamily: 'inherit'
                  }}>
                  إلغاء
                </button>
              </div>
            </div>
          </div>
        )}

      </div>
    </AdminLayout>
  );
}
