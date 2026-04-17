'use client';
import { useEffect, useState, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

function RedirectContent() {
  const params = useSearchParams();
  const router = useRouter();
  const adId = params.get('adId');
  const [ad, setAd] = useState(null);
  const [status, setStatus] = useState('loading');
  // 'loading' | 'show_install' | 'show_register' | 'redirecting'

  useEffect(() => {
    if (!adId) { router.push('/'); return; }

    // Fetch ad preview
    fetch(`${API}/api/ads/${adId}`)
      .then(r => r.json())
      .then(d => setAd(d.ad || d))
      .catch(() => {});

    // Check auth state
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    const isStandalone = typeof window !== 'undefined' && (
      window.matchMedia('(display-mode: standalone)').matches ||
      window.navigator.standalone === true
    );

    if (token) {
      setStatus('redirecting');
      setTimeout(() => router.push(`/ads/${adId}`), 800);
    } else if (isStandalone) {
      setStatus('show_register');
    } else {
      setStatus('show_install');
    }
  }, [adId, router]);

  if (status === 'loading' || status === 'redirecting') return (
    <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#e2e8f0' }}>
      <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
      <div style={{ fontSize: 18, color: '#a5b4fc' }}>جارٍ فتح الإعلان...</div>
    </div>
  );

  const adCard = ad ? (
    <div style={{ background: '#1a1a2e', borderRadius: 16, padding: 16, marginBottom: 24, border: '1px solid rgba(99,102,241,0.3)', maxWidth: 400, width: '100%' }}>
      {ad.images?.[0] && (
        <img
          src={ad.images[0]}
          alt={ad.title}
          style={{ width: '100%', height: 200, objectFit: 'cover', borderRadius: 12, marginBottom: 12 }}
        />
      )}
      <div style={{ fontWeight: 'bold', fontSize: 18, color: '#fff', marginBottom: 4 }}>{ad.title}</div>
      {ad.price && <div style={{ color: '#fbbf24', fontWeight: 'bold', fontSize: 20 }}>{Number(ad.price).toLocaleString()} {ad.currency || 'ج.م'}</div>}
      {ad.city && <div style={{ color: '#9ca3af', fontSize: 14 }}>📍 {ad.city}</div>}
    </div>
  ) : null;

  if (status === 'show_install') return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>📲</div>
      <h1 style={{ color: '#a5b4fc', fontSize: 22, marginBottom: 4 }}>شاهد هذا الإعلان على XTOX</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>حمّل التطبيق مجاناً للتواصل مع البائع وعرض التفاصيل الكاملة</p>
      {adCard}
      <a href="/install" style={{ display: 'block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', padding: '16px 40px', borderRadius: 50, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, width: '100%', maxWidth: 360, boxSizing: 'border-box' }}>
        📲 تحميل XTOX مجاناً
      </a>
      <a href={`/ads/${adId}`} style={{ color: '#6366f1', fontSize: 14, textDecoration: 'underline' }}>تصفح الإعلان بدون تسجيل</a>
    </div>
  );

  if (status === 'show_register') return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#0f0f1a', color: '#e2e8f0', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div style={{ fontSize: 48, marginBottom: 8 }}>👋</div>
      <h1 style={{ color: '#a5b4fc', fontSize: 22, marginBottom: 4 }}>سجّل الدخول للتواصل</h1>
      <p style={{ color: '#6b7280', fontSize: 14, marginBottom: 20, textAlign: 'center' }}>سجّل دخولك على XTOX للتواصل مع البائع مباشرة</p>
      {adCard}
      <a href={`/login?redirect=/ads/${adId}`} style={{ display: 'block', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', color: '#fff', textDecoration: 'none', padding: '16px 40px', borderRadius: 50, fontSize: 18, fontWeight: 'bold', textAlign: 'center', marginBottom: 12, width: '100%', maxWidth: 360, boxSizing: 'border-box' }}>
        🔑 تسجيل الدخول
      </a>
      <a href="/register" style={{ display: 'block', background: '#1a1a2e', color: '#a5b4fc', textDecoration: 'none', padding: '14px 40px', borderRadius: 50, fontSize: 16, fontWeight: 'bold', textAlign: 'center', border: '1px solid rgba(99,102,241,0.4)', width: '100%', maxWidth: 360, boxSizing: 'border-box' }}>
        ✨ إنشاء حساب جديد
      </a>
    </div>
  );

  return null;
}

export default function RedirectPage() {
  const { t: tr, language, isRTL } = useLanguage();
  return (
    <Suspense fallback={
      <div dir="rtl" style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: '#0f0f1a', color: '#e2e8f0' }}>
        <div style={{ fontSize: 48, marginBottom: 16 }}>⚡</div>
        <div style={{ fontSize: 18, color: '#a5b4fc' }}>جارٍ التحميل...</div>
      </div>
    }>
      <RedirectContent />
    </Suspense>
  );
}
