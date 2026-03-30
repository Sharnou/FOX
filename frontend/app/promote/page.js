'use client';
import { useState, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const PLANS = [
  { id: '1day',   label: '⚡ يوم واحد',    price: '$1',  days: 1,  color: '#6C63FF', popular: false },
  { id: '3days',  label: '🔥 3 أيام',       price: '$2',  days: 3,  color: '#FF6584', popular: false },
  { id: '7days',  label: '🚀 7 أيام',       price: '$5',  days: 7,  color: '#002f34', popular: true },
  { id: '30days', label: '👑 30 يوم',       price: '$15', days: 30, color: '#F4A261', popular: false },
  { id: 'store',  label: '🏪 متجر شهري',   price: '$20', days: 30, color: '#2EC4B6', popular: false },
];

export default function PromotePage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const adId = searchParams.get('adId');
  const adTitle = searchParams.get('title') || 'إعلانك';
  const [selected, setSelected] = useState('7days');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const API = process.env.NEXT_PUBLIC_API_URL || 'https://fox-production.up.railway.app';

  async function handlePromote() {
    if (!adId) return alert('لم يتم تحديد الإعلان');
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${API}/api/payment/create-checkout`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ adId, plan: selected }),
      });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      } else if (data.success) {
        setSuccess(true);
        setTimeout(() => router.push('/my-ads'), 2000);
      } else {
        alert(data.error || 'حدث خطأ');
      }
    } catch (err) {
      alert('حدث خطأ في الاتصال');
    }
    setLoading(false);
  }

  if (success) return (
    <div style={{ minHeight:'100vh', background:'#002f34', display:'flex', flexDirection:'column', alignItems:'center', justifyContent:'center', fontFamily:'Cairo,sans-serif', direction:'rtl', color:'#fff' }}>
      <div style={{ fontSize:80 }}>🎉</div>
      <h2 style={{ fontSize:28, marginTop:16 }}>تم تفعيل الإعلان المميز!</h2>
      <p style={{ color:'#ffffffaa' }}>جاري التحويل...</p>
    </div>
  );

  return (
    <div style={{ minHeight:'100vh', background:'#f5f5f5', fontFamily:'Cairo,sans-serif', direction:'rtl', padding:'24px 16px' }}>
      <div style={{ maxWidth:480, margin:'0 auto' }}>
        {/* Header */}
        <div style={{ background:'linear-gradient(135deg,#002f34,#1a5c63)', borderRadius:20, padding:24, color:'#fff', textAlign:'center', marginBottom:24 }}>
          <div style={{ fontSize:48 }}>🚀</div>
          <h1 style={{ fontSize:22, margin:'8px 0 4px' }}>روّج إعلانك</h1>
          <p style={{ color:'#ffffffcc', fontSize:14 }}>"{adTitle}"</p>
          <div style={{ background:'rgba(255,255,255,0.1)', borderRadius:12, padding:'8px 16px', marginTop:12, fontSize:13 }}>
            ✅ وصول أكثر · 🏅 شارة مميزة · 📈 في أعلى النتائج
          </div>
        </div>

        {/* Plans */}
        <h3 style={{ color:'#002f34', marginBottom:12, fontSize:16 }}>اختر الخطة</h3>
        {PLANS.map(plan => (
          <div key={plan.id} onClick={() => setSelected(plan.id)}
            style={{
              background: selected === plan.id ? plan.color : '#fff',
              color: selected === plan.id ? '#fff' : '#333',
              borderRadius:16, padding:'16px 20px', marginBottom:10, cursor:'pointer',
              border: `2px solid ${selected === plan.id ? plan.color : '#e0e0e0'}`,
              display:'flex', alignItems:'center', justifyContent:'space-between',
              boxShadow: selected === plan.id ? '0 4px 16px rgba(0,0,0,0.15)' : '0 1px 4px rgba(0,0,0,0.06)',
              transition:'all 0.2s ease', position:'relative',
            }}>
            {plan.popular && <span style={{ position:'absolute', top:-8, right:16, background:'#FFD700', color:'#000', fontSize:11, fontWeight:700, padding:'2px 10px', borderRadius:10 }}>⭐ الأكثر شيوعاً</span>}
            <div>
              <div style={{ fontWeight:700, fontSize:16 }}>{plan.label}</div>
              <div style={{ fontSize:13, opacity:0.8, marginTop:2 }}>{plan.days} يوم تمييز</div>
            </div>
            <div style={{ fontWeight:800, fontSize:22 }}>{plan.price}</div>
          </div>
        ))}

        {/* Promote button */}
        <button onClick={handlePromote} disabled={loading}
          style={{ width:'100%', background: loading ? '#aaa' : '#002f34', color:'#fff', border:'none', borderRadius:16, padding:'16px', fontSize:18, fontWeight:700, cursor: loading ? 'not-allowed' : 'pointer', marginTop:8, boxShadow:'0 4px 16px rgba(0,47,52,0.3)' }}>
          {loading ? '⏳ جار المعالجة...' : '💳 ادفع وروّج الآن'}
        </button>

        {/* Payment methods */}
        <div style={{ textAlign:'center', marginTop:16, color:'#666', fontSize:13 }}>
          <div style={{ marginBottom:6 }}>طرق الدفع المتاحة:</div>
          <div style={{ display:'flex', justifyContent:'center', gap:12, flexWrap:'wrap' }}>
            {['💳 Visa/MasterCard', '📱 Vodafone Cash', '🏧 Fawry', '💸 Instapay'].map(m => (
              <span key={m} style={{ background:'#f0f0f0', padding:'4px 12px', borderRadius:20, fontSize:12 }}>{m}</span>
            ))}
          </div>
        </div>

        <button onClick={() => router.back()} style={{ width:'100%', background:'transparent', color:'#999', border:'none', marginTop:16, fontSize:14, cursor:'pointer' }}>
          رجوع
        </button>
      </div>
    </div>
  );
}
