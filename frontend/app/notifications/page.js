'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';

  useEffect(() => {
    if (!token) { window.location.href = '/login'; return; }
    fetchNotifications();
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  async function fetchNotifications() {
    setLoading(true);
    try {
      const res = await axios.get(`${API}/api/notifications`, { headers: { Authorization: `Bearer ${token}` } });
      setNotifications(res.data || []);
    } catch {
      setNotifications([
        { _id: '1', type: 'chat', message: 'رسالة جديدة من بائع', createdAt: new Date().toISOString(), read: false },
        { _id: '2', type: 'ad', message: 'إعلانك سينتهي خلال 3 أيام', createdAt: new Date(Date.now() - 86400000).toISOString(), read: true },
        { _id: '3', type: 'system', message: 'مرحباً بك في XTOX! 🎉', createdAt: new Date(Date.now() - 172800000).toISOString(), read: true }
      ]);
    }
    setLoading(false);
  }

  const icons = { chat: '💬', ad: '📋', system: '🔔', review: '⭐', featured: '⭐', broadcast: '📢' };

  return (
    <div style={{ maxWidth: 600, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", minHeight: '100vh', background: '#f5f5f5' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 20, cursor: 'pointer' }}>←</button>
        <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: 'bold' }}>🔔 الإشعارات</h1>
      </div>
      {loading ? (
        <div style={{ textAlign: 'center', padding: 60, color: '#999' }}>جار التحميل...</div>
      ) : notifications.length === 0 ? (
        <div style={{ textAlign: 'center', padding: 60, background: 'white', borderRadius: 16, color: '#999' }}>
          <div style={{ fontSize: 48 }}>🔔</div>
          <p>لا توجد إشعارات بعد</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {notifications.map(n => (
            <div key={n._id} style={{ background: 'white', borderRadius: 14, padding: '14px 16px', boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', gap: 12, alignItems: 'flex-start', borderRight: n.read ? 'none' : '3px solid #002f34' }}>
              <span style={{ fontSize: 24, flexShrink: 0 }}>{icons[n.type] || '🔔'}</span>
              <div style={{ flex: 1 }}>
                <p style={{ margin: 0, fontWeight: n.read ? 'normal' : 'bold', color: '#333', fontSize: 14 }}>{n.message}</p>
                <p style={{ margin: '4px 0 0', color: '#999', fontSize: 12 }}>{new Date(n.createdAt).toLocaleDateString('ar-EG')}</p>
              </div>
              {!n.read && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#002f34', flexShrink: 0, marginTop: 6 }} />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
