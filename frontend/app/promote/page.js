'use client';
import { useState } from 'react';
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
  const adTitle = searchParams.get('title') || 'إعلانك';
  const [selected, setSelected] = useState('7days');

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

        {/* Coming Soon button */}
        <div style={{
          width:'100%', background:'#e8e8e8', color:'#999', border:'none',
          borderRadius:16, padding:'16px', fontSize:16, fontWeight:700,
          marginTop:8, textAlign:'center', cursor:'not-allowed',
          boxShadow:'none',
        }}>
          ⏳ الدفع قريباً
        </div>

        <p style={{ textAlign:'center', color:'#aaa', fontSize:13, marginTop:12 }}>
          سيتم تفعيل الدفع قريباً — ترقب التحديثات
        </p>

        <button onClick={() => router.back()} style={{ width:'100%', background:'transparent', color:'#999', border:'none', marginTop:16, fontSize:14, cursor:'pointer' }}>
          رجوع
        </button>
      </div>
    </div>
  );
}
