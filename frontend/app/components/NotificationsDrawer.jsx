'use client';
import { useState, useEffect, useRef } from 'react';

/**
 * NotificationsDrawer
 * Slide-out in-app notifications panel for XTOX marketplace.
 *
 * Props:
 *   lang        - 'ar' | 'en' | 'de'  (default 'ar')
 *   notifications - array of { id, type, title, body, time, read, avatar? }
 *                   type: 'chat' | 'offer' | 'view' | 'expiry' | 'system'
 *   onRead(id)  - callback when a notification is marked read
 *   onReadAll() - callback to mark all as read
 *   onOpen()    - callback when drawer opens (fetch fresh notifications)
 *   trigger     - ReactNode to render the bell icon / trigger button
 */
export default function NotificationsDrawer({
  lang = 'ar',
  notifications = [],
  onRead,
  onReadAll,
  onOpen,
  trigger,
}) {
  const [open, setOpen] = useState(false);
  const drawerRef = useRef(null);
  const isRTL = lang === 'ar';

  const t = {
    ar: {
      title: 'الإشعارات',
      markAll: 'تحديد الكل كمقروء',
      empty: 'لا توجد إشعارات',
      emptyDesc: 'ستظهر إشعاراتك هنا',
      types: { chat: 'رسالة جديدة', offer: 'عرض جديد', view: 'مشاهدة إعلانك', expiry: 'إعلان على وشك الانتهاء', system: 'إشعار النظام' },
      justNow: 'الآن',
      ago: 'منذ',
      min: 'د',
      hr: 'س',
      day: 'يوم',
    },
    en: {
      title: 'Notifications',
      markAll: 'Mark all as read',
      empty: 'No notifications',
      emptyDesc: 'Your notifications will appear here',
      types: { chat: 'New message', offer: 'New offer', view: 'Ad viewed', expiry: 'Ad expiring soon', system: 'System notice' },
      justNow: 'Just now',
      ago: 'ago',
      min: 'min',
      hr: 'hr',
      day: 'day',
    },
    de: {
      title: 'Benachrichtigungen',
      markAll: 'Alle als gelesen markieren',
      empty: 'Keine Benachrichtigungen',
      emptyDesc: 'Ihre Benachrichtigungen erscheinen hier',
      types: { chat: 'Neue Nachricht', offer: 'Neues Angebot', view: 'Anzeige angesehen', expiry: 'Anzeige läuft bald ab', system: 'Systemhinweis' },
      justNow: 'Gerade eben',
      ago: 'vor',
      min: 'Min',
      hr: 'Std',
      day: 'Tag',
    },
  };
  const tx = t[lang] || t.ar;

  // Arabic-Indic numerals for Arabic
  function toLocalNum(n) {
    if (lang !== 'ar') return String(n);
    return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
  }

  function relativeTime(isoTime) {
    const diff = Math.floor((Date.now() - new Date(isoTime).getTime()) / 1000);
    if (diff < 60) return tx.justNow;
    const min = Math.floor(diff / 60);
    if (min < 60) return lang === 'de' ? `${tx.ago} ${toLocalNum(min)} ${tx.min}` : `${tx.ago} ${toLocalNum(min)} ${tx.min}`;
    const hr = Math.floor(min / 60);
    if (hr < 24) return lang === 'de' ? `${tx.ago} ${toLocalNum(hr)} ${tx.hr}` : `${tx.ago} ${toLocalNum(hr)} ${tx.hr}`;
    const day = Math.floor(hr / 24);
    return lang === 'de' ? `${tx.ago} ${toLocalNum(day)} ${tx.day}` : `${tx.ago} ${toLocalNum(day)} ${tx.day}`;
  }

  const typeIcon = { chat: '💬', offer: '🤝', view: '👁️', expiry: '⏰', system: '🔔' };
  const typeColor = { chat: '#FF6B35', offer: '#22c55e', view: '#3b82f6', expiry: '#f59e0b', system: '#8b5cf6' };

  const unreadCount = notifications.filter(n => !n.read).length;

  function handleOpen() {
    setOpen(true);
    if (onOpen) onOpen();
  }

  function handleClose() { setOpen(false); }

  function handleRead(id) { if (onRead) onRead(id); }
  function handleReadAll() { if (onReadAll) onReadAll(); }

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setOpen(false);
      }
    }
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    function handler(e) { if (e.key === 'Escape') setOpen(false); }
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [open]);

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
        .xtox-notif-root { font-family: 'Cairo', 'Tajawal', sans-serif; position: relative; display: inline-block; }
        .xtox-notif-bell-btn { position: relative; background: none; border: none; cursor: pointer; padding: 6px; border-radius: 50%; transition: background 0.2s; }
        .xtox-notif-bell-btn:hover { background: rgba(255,107,53,0.1); }
        .xtox-notif-badge { position: absolute; top: 0; right: 0; background: #FF6B35; color: #fff; border-radius: 50%; font-size: 10px; font-weight: 700; width: 18px; height: 18px; display: flex; align-items: center; justify-content: center; line-height: 1; }
        .xtox-notif-overlay { position: fixed; inset: 0; background: rgba(0,0,0,0.35); z-index: 1000; animation: xtox-fade-in 0.2s ease; }
        .xtox-notif-drawer { position: fixed; top: 0; bottom: 0; width: min(380px, 95vw); background: #fff; z-index: 1001; display: flex; flex-direction: column; box-shadow: -4px 0 24px rgba(0,0,0,0.15); animation: xtox-slide-in-${isRTL ? 'right' : 'left'} 0.25s cubic-bezier(.4,0,.2,1); }
        .xtox-notif-drawer[data-rtl='true'] { right: 0; left: auto; border-radius: 12px 0 0 12px; }
        .xtox-notif-drawer[data-rtl='false'] { left: 0; right: auto; border-radius: 0 12px 12px 0; }
        .xtox-notif-header { display: flex; align-items: center; justify-content: space-between; padding: 18px 20px 14px; border-bottom: 1px solid #f0f0f0; background: #fff; flex-shrink: 0; direction: ${isRTL ? 'rtl' : 'ltr'}; }
        .xtox-notif-header-title { font-size: 18px; font-weight: 700; color: #1a1a1a; }
        .xtox-notif-header-actions { display: flex; align-items: center; gap: 10px; }
        .xtox-notif-mark-all { background: none; border: 1px solid #FF6B35; color: #FF6B35; border-radius: 20px; font-size: 11px; font-family: inherit; cursor: pointer; padding: 4px 10px; font-weight: 600; transition: all 0.2s; white-space: nowrap; }
        .xtox-notif-mark-all:hover { background: #FF6B35; color: #fff; }
        .xtox-notif-close { background: none; border: none; cursor: pointer; font-size: 20px; color: #666; padding: 4px; border-radius: 50%; line-height: 1; transition: background 0.2s; }
        .xtox-notif-close:hover { background: #f5f5f5; color: #333; }
        .xtox-notif-list { flex: 1; overflow-y: auto; padding: 8px 0; }
        .xtox-notif-list::-webkit-scrollbar { width: 4px; }
        .xtox-notif-list::-webkit-scrollbar-thumb { background: #e0e0e0; border-radius: 2px; }
        .xtox-notif-item { display: flex; align-items: flex-start; gap: 12px; padding: 14px 20px; cursor: pointer; border-bottom: 1px solid #fafafa; transition: background 0.15s; direction: ${isRTL ? 'rtl' : 'ltr'}; position: relative; }
        .xtox-notif-item:hover { background: #fff8f5; }
        .xtox-notif-item.unread { background: #fff5f1; }
        .xtox-notif-item.unread::before { content: ''; position: absolute; ${isRTL ? 'right' : 'left'}: 0; top: 0; bottom: 0; width: 3px; background: #FF6B35; border-radius: 0 2px 2px 0; }
        .xtox-notif-icon { width: 40px; height: 40px; border-radius: 50%; display: flex; align-items: center; justify-content: center; font-size: 18px; flex-shrink: 0; }
        .xtox-notif-content { flex: 1; min-width: 0; }
        .xtox-notif-type { font-size: 11px; font-weight: 600; margin-bottom: 2px; }
        .xtox-notif-body { font-size: 13px; color: #333; line-height: 1.5; }
        .xtox-notif-time { font-size: 11px; color: #999; margin-top: 4px; }
        .xtox-notif-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; padding: 40px 20px; text-align: center; direction: ${isRTL ? 'rtl' : 'ltr'}; }
        .xtox-notif-empty-icon { font-size: 48px; margin-bottom: 16px; opacity: 0.4; }
        .xtox-notif-empty-title { font-size: 16px; font-weight: 700; color: #333; margin-bottom: 6px; }
        .xtox-notif-empty-desc { font-size: 13px; color: #999; }
        @keyframes xtox-fade-in { from { opacity: 0 } to { opacity: 1 } }
        @keyframes xtox-slide-in-right { from { transform: translateX(100%) } to { transform: translateX(0) } }
        @keyframes xtox-slide-in-left { from { transform: translateX(-100%) } to { transform: translateX(0) } }
      `}</style>

      <div className="xtox-notif-root">
        {/* Trigger button (bell icon) */}
        <button className="xtox-notif-bell-btn" onClick={handleOpen} aria-label={tx.title} title={tx.title}>
          {trigger || (
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#333" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
              <path d="M13.73 21a2 2 0 0 1-3.46 0" />
            </svg>
          )}
          {unreadCount > 0 && (
            <span className="xtox-notif-badge" aria-label={toLocalNum(unreadCount)}>
              {unreadCount > 9 ? (lang === 'ar' ? '٩+' : '9+') : toLocalNum(unreadCount)}
            </span>
          )}
        </button>
      </div>

      {/* Overlay + Drawer */}
      {open && (
        <>
          <div className="xtox-notif-overlay" onClick={handleClose} />
          <div
            ref={drawerRef}
            className="xtox-notif-drawer"
            data-rtl={String(isRTL)}
            role="dialog"
            aria-modal="true"
            aria-label={tx.title}
          >
            {/* Header */}
            <div className="xtox-notif-header">
              <span className="xtox-notif-header-title">{tx.title}</span>
              <div className="xtox-notif-header-actions">
                {unreadCount > 0 && (
                  <button className="xtox-notif-mark-all" onClick={handleReadAll}>
                    {tx.markAll}
                  </button>
                )}
                <button className="xtox-notif-close" onClick={handleClose} aria-label="close">×</button>
              </div>
            </div>

            {/* List or Empty state */}
            {notifications.length === 0 ? (
              <div className="xtox-notif-empty">
                <div className="xtox-notif-empty-icon">🔔</div>
                <div className="xtox-notif-empty-title">{tx.empty}</div>
                <div className="xtox-notif-empty-desc">{tx.emptyDesc}</div>
              </div>
            ) : (
              <div className="xtox-notif-list">
                {notifications.map(notif => (
                  <div
                    key={notif.id}
                    className={`xtox-notif-item${!notif.read ? ' unread' : ''}`}
                    onClick={() => handleRead(notif.id)}
                    role="button"
                    tabIndex={0}
                    onKeyDown={e => e.key === 'Enter' && handleRead(notif.id)}
                  >
                    <div
                      className="xtox-notif-icon"
                      style={{ background: `${typeColor[notif.type] || '#FF6B35'}22` }}
                    >
                      {typeIcon[notif.type] || '🔔'}
                    </div>
                    <div className="xtox-notif-content">
                      <div className="xtox-notif-type" style={{ color: typeColor[notif.type] || '#FF6B35' }}>
                        {tx.types[notif.type] || notif.type}
                      </div>
                      <div className="xtox-notif-body">{notif.body}</div>
                      {notif.time && (
                        <div className="xtox-notif-time">{relativeTime(notif.time)}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
