'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

function PromoteSuccessInner() {
  const params = useSearchParams();
  const router = useRouter();
  const adId = params.get('adId');
  const plan = params.get('plan');
  const [countdown, setCountdown] = useState(5);

  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown(prev => {
        if (prev <= 1) {
          clearInterval(timer);
          router.push(adId ? `/ads/${adId}` : '/my-ads');
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [adId, router]);

  const planLabel =
    plan === 'premium' ? '✦ بريميوم (30 يوم)' :
    plan === 'featured' ? '★ مميز (14 يوم)' :
    plan || 'ترقية';

  return (
    <div style={{
      minHeight: '80vh',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Cairo, sans-serif',
      textAlign: 'center',
      padding: 24,
      background: 'linear-gradient(135deg, #f0fff4 0%, #e8f5e9 100%)',
    }}>
      <div style={{ fontSize: 72, marginBottom: 20, animation: 'bounce 0.6s ease' }}>🎉</div>
      <h1 style={{
        fontSize: 28,
        fontWeight: 'bold',
        color: '#002f34',
        marginBottom: 12,
        direction: 'rtl',
      }}>
        تم الدفع بنجاح!
      </h1>
      <p style={{ color: '#374151', fontSize: 18, marginBottom: 8, direction: 'rtl' }}>
        إعلانك الآن <strong style={{ color: '#d97706' }}>{planLabel}</strong>
      </p>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 24, direction: 'rtl' }}>
        سيتم تفعيل الترقية تلقائياً خلال لحظات
      </p>
      <div style={{
        background: 'white',
        borderRadius: 16,
        padding: '16px 32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        marginBottom: 24,
      }}>
        <p style={{ color: '#9ca3af', fontSize: 14, margin: 0, direction: 'rtl' }}>
          جارٍ التوجيه إلى إعلانك خلال <strong style={{ color: '#002f34' }}>{countdown}</strong> ثانية...
        </p>
      </div>
      <button
        onClick={() => router.push(adId ? `/ads/${adId}` : '/my-ads')}
        style={{
          background: '#002f34',
          color: 'white',
          border: 'none',
          borderRadius: 10,
          padding: '12px 28px',
          fontSize: 16,
          cursor: 'pointer',
          fontFamily: 'Cairo, sans-serif',
          fontWeight: 600,
        }}
      >
        عرض الإعلان الآن →
      </button>
      <style>{`
        @keyframes bounce {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-15px); }
        }
      `}</style>
    </div>
  );
}

export default function PromoteSuccess() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
        <p style={{ color: '#6b7280' }}>جارٍ التحميل...</p>
      </div>
    }>
      <PromoteSuccessInner />
    </Suspense>
  );
}
