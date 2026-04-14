'use client';
import { useState, useEffect } from 'react';

export default function MicPermissionCard() {
  const [status, setStatus] = useState('unknown'); // unknown | granted | denied | prompt
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Check current permission status without prompting
    if (typeof window === 'undefined') return;
    if (navigator.permissions) {
      navigator.permissions.query({ name: 'microphone' })
        .then(result => {
          setStatus(result.state); // 'granted' | 'denied' | 'prompt'
          result.onchange = () => setStatus(result.state);
        })
        .catch(() => setStatus('prompt')); // fallback if API not supported
    } else {
      setStatus('prompt'); // Safari doesn't support permissions.query for mic
    }
  }, []);

  const requestMic = async () => {
    setLoading(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      // Stop tracks immediately — we only needed the permission grant
      stream.getTracks().forEach(t => t.stop());
      setStatus('granted');
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        setStatus('denied');
      } else {
        setStatus('denied');
      }
    }
    setLoading(false);
  };

  // Don't show if already granted
  if (status === 'granted') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 12, padding: '10px 14px', margin: '10px 0', direction: 'rtl' }}>
      <span style={{ fontSize: 20 }}>🎙️</span>
      <span style={{ fontSize: 14, color: '#15803d', fontWeight: 600 }}>المايكروفون مفعّل — يمكنك إجراء مكالمات صوتية</span>
    </div>
  );

  if (status === 'denied') return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '10px 14px', margin: '10px 0', direction: 'rtl' }}>
      <span style={{ fontSize: 20 }}>🚫</span>
      <div>
        <div style={{ fontSize: 14, color: '#dc2626', fontWeight: 600 }}>تم رفض إذن المايكروفون</div>
        <div style={{ fontSize: 12, color: '#ef4444' }}>يرجى السماح من إعدادات المتصفح/الجهاز ثم أعد تحميل الصفحة</div>
      </div>
    </div>
  );

  // status === 'prompt' or 'unknown'
  return (
    <button
      onClick={requestMic}
      disabled={loading}
      style={{
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
        width: '100%', background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
        color: '#fff', border: 'none', borderRadius: 14, padding: '13px 0',
        fontWeight: 'bold', fontSize: 15, cursor: loading ? 'default' : 'pointer',
        margin: '10px 0', direction: 'rtl', boxShadow: '0 4px 12px rgba(99,102,241,0.3)',
        transition: 'opacity 0.2s',
      }}
    >
      <span style={{ fontSize: 22 }}>{loading ? '⏳' : '🎙️'}</span>
      {loading ? 'جارٍ التفعيل...' : 'اسمح بالمايكروفون لإجراء مكالمات'}
    </button>
  );
}
