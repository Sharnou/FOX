'use client';
import { useState } from 'react';

export default function MakeOfferModal({ ad, user, onClose }) {
  const [amount, setAmount]   = useState('');
  const [message, setMessage] = useState('');
  const [sent, setSent]       = useState(false);
  const [error, setError]     = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async () => {
    if (!amount || isNaN(amount) || Number(amount) <= 0) {
      setError('يرجى إدخال سعر صحيح');
      return;
    }
    setLoading(true);
    setError('');
    try {
      const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
      const res = await fetch(
        `${process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app'}/api/offers`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(token ? { Authorization: `Bearer ${token}` } : {})
          },
          body: JSON.stringify({ adId: ad._id, amount: Number(amount), message })
        }
      );
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'فشل إرسال العرض');
      }
      setSent(true);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50, padding: 16 }}
      dir="rtl"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div style={{ background: 'white', borderRadius: 16, padding: 24, width: '100%', maxWidth: 360, boxShadow: '0 8px 32px rgba(0,0,0,0.18)' }}>
        {sent ? (
          <div style={{ textAlign: 'center', paddingTop: 16, paddingBottom: 16 }}>
            <div style={{ fontSize: 48, marginBottom: 12 }}>✅</div>
            <p style={{ color: '#16a34a', fontWeight: 'bold', fontSize: 18, margin: 0 }}>تم إرسال عرضك للبائع!</p>
            <p style={{ color: '#888', fontSize: 13, marginTop: 6 }}>سيتم إخطارك عند الرد</p>
            <button
              onClick={onClose}
              style={{ marginTop: 16, width: '100%', background: '#1877F2', color: 'white', border: 'none', borderRadius: 12, padding: '10px 0', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
            >
              حسناً
            </button>
          </div>
        ) : (
          <>
            <h2 style={{ fontSize: 20, fontWeight: 'bold', margin: '0 0 4px', color: '#222' }}>قدّم عرضك 💬</h2>
            <p style={{ color: '#888', fontSize: 13, marginTop: 0, marginBottom: 16 }}>
              السعر المطلوب:{' '}
              <span style={{ fontWeight: 'bold', color: '#333' }}>
                {ad.price} {ad.currency || 'EGP'}
              </span>
            </p>

            <label style={{ display: 'block', fontSize: 13, fontWeight: '500', color: '#444', marginBottom: 4 }}>
              سعرك المقترح <span style={{ color: '#e44' }}>*</span>
            </label>
            <input
              type="number"
              min="1"
              placeholder="مثال: 1500"
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 12, padding: '12px', marginBottom: 12, textAlign: 'right', fontSize: 15, boxSizing: 'border-box', outline: 'none', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
            />

            <label style={{ display: 'block', fontSize: 13, fontWeight: '500', color: '#444', marginBottom: 4 }}>
              رسالة للبائع (اختياري)
            </label>
            <textarea
              placeholder="اكتب ملاحظة للبائع..."
              style={{ width: '100%', border: '1px solid #ddd', borderRadius: 12, padding: '12px', marginBottom: 16, textAlign: 'right', fontSize: 13, boxSizing: 'border-box', resize: 'none', outline: 'none', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
              rows={3}
              maxLength={200}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
            />

            {error && (
              <p style={{ color: '#e44', fontSize: 13, marginBottom: 12, textAlign: 'center' }}>{error}</p>
            )}

            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={submit}
                disabled={loading}
                style={{ flex: 1, background: loading ? '#93c5fd' : '#1877F2', color: 'white', border: 'none', borderRadius: 12, padding: '12px 0', fontWeight: 'bold', fontSize: 15, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
              >
                {loading ? '...' : 'إرسال العرض'}
              </button>
              <button
                onClick={onClose}
                style={{ flex: 1, border: '1px solid #ddd', borderRadius: 12, padding: '12px 0', color: '#555', background: 'white', cursor: 'pointer', fontSize: 15, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
              >
                إلغاء
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
