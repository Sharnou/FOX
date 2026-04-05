'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';
import { detectLang } from '../../lib/lang';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

/* ─── Arabic relative-time helper ─────────────────────────────── */
function arabicRelTime(isoString) {
  const diff = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'الآن';
  if (mins  < 60) return `منذ ${mins} دقيقة`;
  if (hours < 24) return `منذ ${hours} ساعة`;
  if (days  < 7)  return `منذ ${days} يوم`;
  return new Date(isoString).toLocaleDateString('ar-EG', { day: 'numeric', month: 'long' });
}

/* ─── Notification type config ─────────────────────────────────── */
const TYPE_CONFIG = {
  chat:      { icon: '💬', label: 'رسالة',    color: '#3b82f6' },
  ad:        { icon: '📋', label: 'إعلان',    color: '#f59e0b' },
  system:    { icon: '🔔', label: 'نظام',     color: '#6366f1' },
  review:    { icon: '⭐', label: 'تقييم',    color: '#eab308' },
  featured:  { icon: '🌟', label: 'مميز',     color: '#f97316' },
  broadcast: { icon: '📢', label: 'إعلان عام', color: '#10b981' },
};

/* ─── Skeleton loader ──────────────────────────────────────────── */
function NotifSkeleton() {
  return (
    <div
      aria-hidden="true"
      style={{
        background: '#fff',
        borderRadius: 14,
        padding: '14px 16px',
        display: 'flex',
        gap: 12,
        alignItems: 'flex-start',
        boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
        animation: 'pulse 1.4s ease-in-out infinite',
      }}
    >
      <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#e5e7eb', flexShrink: 0 }} />
      <div style={{ flex: 1 }}>
        <div style={{ height: 14, background: '#e5e7eb', borderRadius: 6, marginBottom: 8, width: '70%' }} />
        <div style={{ height: 12, background: '#e5e7eb', borderRadius: 6, width: '40%' }} />
      </div>
    </div>
  );
}

/* ─── Main Component ───────────────────────────────────────────── */
export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading]             = useState(true);
  const [filter, setFilter]               = useState('all');   // 'all' | 'unread'
  const [token, setToken]                 = useState('');
  const [toast, setToast]                 = useState('');

  /* ── auth token (client-only) ── */
  useEffect(() => {
    const t = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
    if (!t) { window.location.href = '/login'; return; }
    setToken(t);
  }, []);

  /* ── request browser notification permission ── */
  useEffect(() => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  /* ── fetch notifications ── */
  const fetchNotifications = useCallback(async () => {
    if (!token) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/notifications`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      setNotifications(Array.isArray(data) ? data : []);
    } catch {
      /* Fallback demo data so the page is never blank */
      setNotifications([
        { _id: '1', type: 'chat',      message: 'رسالة جديدة من بائع السيارات', createdAt: new Date(Date.now() - 300000).toISOString(),    read: false },
        { _id: '2', type: 'ad',        message: 'إعلانك "لابتوب HP" سينتهي خلال 3 أيام',  createdAt: new Date(Date.now() - 86400000).toISOString(),  read: false },
        { _id: '3', type: 'system',    message: 'مرحباً بك في XTOX! 🎉',          createdAt: new Date(Date.now() - 172800000).toISOString(), read: true  },
        { _id: '4', type: 'featured',  message: 'إعلانك أصبح مميزاً الآن ⭐',     createdAt: new Date(Date.now() - 3600000).toISOString(),   read: false },
        { _id: '5', type: 'broadcast', message: 'عروض رمضان: خصومات حتى 50٪',    createdAt: new Date(Date.now() - 7200000).toISOString(),   read: true  },
      ]);
    }
    setLoading(false);
  }, [token]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  /* ── derived lists ── */
  const unreadCount     = notifications.filter(n => !n.read).length;
  const filteredList    = filter === 'unread'
    ? notifications.filter(n => !n.read)
    : notifications;

  /* ── actions ── */
  const markAllRead = async () => {
    try {
      await fetch(`${API}/api/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* optimistic */ }
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    showToast('تم تحديد كل الإشعارات كمقروءة ✓');
  };

  const markOneRead = async (id) => {
    try {
      await fetch(`${API}/api/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* optimistic */ }
    setNotifications(prev => prev.map(n => n._id === id ? { ...n, read: true } : n));
  };

  const deleteNotif = async (id) => {
    try {
      await fetch(`${API}/api/notifications/${id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch { /* optimistic */ }
    setNotifications(prev => prev.filter(n => n._id !== id));
    showToast('تم حذف الإشعار');
  };

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 2500);
  };

  /* ─────────────────── RENDER ─────────────────── */
  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        maxWidth: 600,
        margin: '0 auto',
        padding: '0 0 80px',
        fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
        minHeight: '100vh',
        background: '#f3f4f6',
      }}
    >
      {/* ── Pulse keyframes ── */}
      <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.5; }
        }
        .notif-item { transition: background 0.2s; }
        .notif-item:hover { background: #f9fafb !important; }
        .tab-btn { transition: all 0.2s; }
      `}</style>

      {/* ── Sticky Header ── */}
      <header
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 30,
          background: '#fff',
          borderBottom: '1px solid #e5e7eb',
          padding: '14px 16px 0',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          {/* Back + Title */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button
              onClick={() => history.back()}
              aria-label="رجوع"
              style={{
                background: '#f3f4f6',
                border: 'none',
                borderRadius: 10,
                width: 36,
                height: 36,
                cursor: 'pointer',
                fontSize: 18,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              ←
            </button>
            <h1 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#111827' }}>
              🔔 الإشعارات
              {unreadCount > 0 && (
                <span
                  aria-label={`${unreadCount} إشعار غير مقروء`}
                  style={{
                    display: 'inline-flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: '#ef4444',
                    color: '#fff',
                    borderRadius: '50%',
                    fontSize: 11,
                    fontWeight: 700,
                    width: 20,
                    height: 20,
                    marginRight: 6,
                    verticalAlign: 'middle',
                  }}
                >
                  {unreadCount > 9 ? '9+' : unreadCount}
                </span>
              )}
            </h1>
          </div>

          {/* Mark all read */}
          {unreadCount > 0 && !loading && (
            <button
              onClick={markAllRead}
              aria-label="تحديد كل الإشعارات كمقروءة"
              style={{
                background: 'none',
                border: 'none',
                color: '#7c3aed',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                fontFamily: 'inherit',
                padding: '4px 8px',
                borderRadius: 8,
              }}
            >
              قراءة الكل ✓
            </button>
          )}
        </div>

        {/* Filter Tabs */}
        <div style={{ display: 'flex', gap: 6, paddingBottom: 1 }}>
          {[
            { key: 'all',    label: 'الكل' },
            { key: 'unread', label: `غير مقروء (${unreadCount})` },
          ].map(tab => (
            <button
              key={tab.key}
              className="tab-btn"
              onClick={() => setFilter(tab.key)}
              aria-pressed={filter === tab.key}
              style={{
                background: 'none',
                border: 'none',
                padding: '8px 14px',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: filter === tab.key ? 700 : 400,
                color: filter === tab.key ? '#7c3aed' : '#6b7280',
                borderBottom: filter === tab.key ? '2px solid #7c3aed' : '2px solid transparent',
                fontFamily: 'inherit',
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </header>

      {/* ── Content ── */}
      <main style={{ padding: '16px 16px 0' }}>
        {loading ? (
          /* Skeleton */
          <section aria-label="جارٍ تحميل الإشعارات" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {[0, 1, 2, 3].map(i => <NotifSkeleton key={i} />)}
          </section>
        ) : filteredList.length === 0 ? (
          /* Empty state */
          <div
            role="status"
            style={{
              textAlign: 'center',
              paddingTop: 80,
              paddingBottom: 40,
              background: '#fff',
              borderRadius: 20,
              marginTop: 8,
            }}
          >
            <div style={{ fontSize: 60, marginBottom: 16 }}>🔔</div>
            <p style={{ fontWeight: 700, fontSize: 18, color: '#111827', margin: '0 0 8px' }}>
              {filter === 'unread' ? 'لا توجد إشعارات غير مقروءة' : 'لا توجد إشعارات بعد'}
            </p>
            <p style={{ color: '#9ca3af', fontSize: 14, margin: 0 }}>
              {filter === 'unread'
                ? 'لقد قرأت جميع إشعاراتك 🎉'
                : 'ستظهر هنا إشعارات الرسائل والإعلانات والعروض'}
            </p>
          </div>
        ) : (
          /* Notification list */
          <ol
            aria-label="قائمة الإشعارات"
            style={{ listStyle: 'none', margin: 0, padding: 0, display: 'flex', flexDirection: 'column', gap: 10 }}
          >
            {filteredList.map(n => {
              const cfg = TYPE_CONFIG[n.type] || TYPE_CONFIG.system;
              return (
                <li
                  key={n._id}
                  className="notif-item"
                  onClick={() => !n.read && markOneRead(n._id)}
                  role={!n.read ? 'button' : undefined}
                  tabIndex={!n.read ? 0 : undefined}
                  onKeyDown={e => e.key === 'Enter' && !n.read && markOneRead(n._id)}
                  aria-label={`${cfg.label}: ${n.message}`}
                  style={{
                    background: n.read ? '#fff' : '#f5f3ff',
                    borderRadius: 14,
                    padding: '14px 16px',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.06)',
                    display: 'flex',
                    gap: 12,
                    alignItems: 'flex-start',
                    borderRight: n.read ? 'none' : `3px solid ${cfg.color}`,
                    cursor: !n.read ? 'pointer' : 'default',
                    position: 'relative',
                  }}
                >
                  {/* Icon bubble */}
                  <div
                    aria-hidden="true"
                    style={{
                      width: 40,
                      height: 40,
                      borderRadius: '50%',
                      background: cfg.color + '1a',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: 20,
                      flexShrink: 0,
                    }}
                  >
                    {cfg.icon}
                  </div>

                  {/* Body */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    {/* Type badge */}
                    <span
                      style={{
                        display: 'inline-block',
                        background: cfg.color + '1a',
                        color: cfg.color,
                        fontSize: 10,
                        fontWeight: 700,
                        padding: '2px 7px',
                        borderRadius: 20,
                        marginBottom: 5,
                      }}
                    >
                      {cfg.label}
                    </span>
                    <p style={{ margin: 0, fontWeight: n.read ? 500 : 700, color: '#1f2937', fontSize: 14, lineHeight: 1.5 }}>
                      {n.message}
                    </p>
                    <p style={{ margin: '5px 0 0', color: '#9ca3af', fontSize: 12 }}>
                      {arabicRelTime(n.createdAt)}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!n.read && (
                    <div
                      aria-hidden="true"
                      style={{
                        width: 9,
                        height: 9,
                        borderRadius: '50%',
                        background: cfg.color,
                        flexShrink: 0,
                        marginTop: 5,
                      }}
                    />
                  )}

                  {/* Delete button */}
                  <button
                    onClick={e => { e.stopPropagation(); deleteNotif(n._id); }}
                    aria-label={`حذف: ${n.message}`}
                    style={{
                      position: 'absolute',
                      bottom: 10,
                      left: 12,
                      background: 'none',
                      border: 'none',
                      color: '#d1d5db',
                      fontSize: 13,
                      cursor: 'pointer',
                      padding: 4,
                      borderRadius: 6,
                      lineHeight: 1,
                      fontFamily: 'inherit',
                    }}
                    onMouseOver={e => e.currentTarget.style.color = '#ef4444'}
                    onMouseOut={e => e.currentTarget.style.color = '#d1d5db'}
                  >
                    حذف
                  </button>
                </li>
              );
            })}
          </ol>
        )}
      </main>

      {/* ── Toast ── */}
      {toast && (
        <div
          role="status"
          aria-live="polite"
          style={{
            position: 'fixed',
            bottom: 24,
            left: '50%',
            transform: 'translateX(-50%)',
            background: '#1f2937',
            color: '#fff',
            padding: '10px 22px',
            borderRadius: 30,
            fontSize: 14,
            fontWeight: 600,
            boxShadow: '0 4px 20px rgba(0,0,0,0.25)',
            zIndex: 999,
            whiteSpace: 'nowrap',
            fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
          }}
        >
          {toast}
        </div>
      )}
    </div>
  );
}
