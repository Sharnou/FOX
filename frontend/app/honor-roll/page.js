'use client';
export const dynamic = 'force-dynamic';
import React, { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const MEDAL = ['🥇', '🥈', '🥉'];
const MEDAL_COLORS = ['#FFD700', '#C0C0C0', '#CD7F32'];
const MEDAL_BG = ['#fffbea', '#f8f8f8', '#fff5ee'];

const PKG_ICONS = ['💎', '⭐', '🌟', '✨', '🚀', '👑'];

// ─── Client-side package computation (primary path) ─────────────────────────
const FALLBACK_RATES = {
  USD: 1, EUR: 0.92, GBP: 0.79, EGP: 52.5, SAR: 3.75, AED: 3.67,
  KWD: 0.31, QAR: 3.64, BHD: 0.38, OMR: 0.38, JOD: 0.71,
  TRY: 32.5, JPY: 155, KRW: 1380, CNY: 7.24, INR: 83.5,
  BRL: 5.1, MXN: 17.2, RUB: 90, UAH: 39.5, PLN: 3.95,
  SEK: 10.6, NOK: 10.8, DKK: 6.88, CHF: 0.9, CAD: 1.37,
  AUD: 1.55, NZD: 1.66, SGD: 1.35, HKD: 7.82, THB: 35.5,
  IDR: 16200, MYR: 4.72, VND: 25000, PHP: 58, BDT: 110,
  PKR: 278, NGN: 1600, KES: 130, ZAR: 18.6, MAD: 9.97,
  TND: 3.15, DZD: 135, IQD: 1310, ILS: 3.7, IRR: 42000,
};

const COUNTRY_CURRENCY_MAP = {
  EG:'EGP', SA:'SAR', AE:'AED', KW:'KWD', QA:'QAR', BH:'BHD', OM:'OMR',
  JO:'JOD', IQ:'IQD', MA:'MAD', TN:'TND', DZ:'DZD', LY:'USD', SD:'USD',
  US:'USD', CA:'CAD', GB:'GBP', AU:'AUD', NZ:'NZD',
  DE:'EUR', FR:'EUR', IT:'EUR', ES:'EUR', PT:'EUR', NL:'EUR', BE:'EUR',
  AT:'EUR', FI:'EUR', GR:'EUR', IE:'EUR', PL:'PLN',
  SE:'SEK', NO:'NOK', DK:'DKK', CH:'CHF',
  TR:'TRY', RU:'RUB', UA:'UAH', IL:'ILS', IR:'IRR', PK:'PKR',
  IN:'INR', BD:'BDT', JP:'JPY', CN:'CNY', KR:'KRW', TH:'THB',
  ID:'IDR', MY:'MYR', SG:'SGD', PH:'PHP', HK:'HKD', VN:'VND',
  BR:'BRL', MX:'MXN', NG:'NGN', KE:'KES', ZA:'ZAR',
};

const CURRENCY_SYMBOLS_MAP = {
  USD:'$', EUR:'€', GBP:'£', EGP:'ج.م', SAR:'ر.س', AED:'د.إ',
  KWD:'د.ك', QAR:'ر.ق', BHD:'د.ب', OMR:'ر.ع', JOD:'د.ا',
  TRY:'₺', JPY:'¥', KRW:'₩', CNY:'¥', INR:'₹', BRL:'R$',
  RUB:'₽', UAH:'₴', PLN:'zł', SEK:'kr', NOK:'kr', DKK:'kr',
  CHF:'Fr', CAD:'C$', AUD:'A$', NZD:'NZ$', SGD:'S$', HKD:'HK$',
  THB:'฿', IDR:'Rp', MYR:'RM', VND:'₫', PHP:'₱', PKR:'₨',
  BDT:'৳', ILS:'₪', NGN:'₦', KES:'KSh', ZAR:'R', MAD:'د.م',
  DZD:'دج', TND:'د.ت', IQD:'د.ع', IRR:'﷼',
};

const PACKAGE_DEFS = [
  { id:'pts_100',   points:100,   usdCents:20,   popular:false },
  { id:'pts_500',   points:500,   usdCents:100,  popular:false },
  { id:'pts_1000',  points:1000,  usdCents:200,  popular:true  },
  { id:'pts_2500',  points:2500,  usdCents:500,  popular:false },
  { id:'pts_5000',  points:5000,  usdCents:1000, popular:false },
  { id:'pts_10000', points:10000, usdCents:2000, popular:false },
];

function computePackages(country, rate, symbol) {
  return PACKAGE_DEFS.map(pkg => {
    const usdPrice = pkg.usdCents / 100;
    const localPrice = usdPrice * rate;
    const localPriceRounded = localPrice < 10
      ? Math.round(localPrice * 100) / 100
      : Math.round(localPrice);
    return {
      ...pkg,
      currency: COUNTRY_CURRENCY_MAP[country] || 'USD',
      usdPrice: usdPrice.toFixed(2),
      localPrice: localPriceRounded,
      localPriceFormatted: `${symbol} ${localPriceRounded.toLocaleString()}`,
    };
  });
}
// ────────────────────────────────────────────────────────────────────────────

function MedalRank({ rank }) {
  if (rank <= 3) return <span style={{ fontSize: 28 }}>{MEDAL[rank - 1]}</span>;
  return (
    <span style={{
      width: 32, height: 32, borderRadius: '50%', background: '#6366f1',
      display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
      color: 'white', fontWeight: 'bold', fontSize: 14,
    }}>{rank}</span>
  );
}

function PackageCard({ pkg, onBuy, checkoutLoading }) {
  const isBuying = checkoutLoading === pkg.id;
  const isPopular = pkg.popular;
  const i = PACKAGE_DEFS.findIndex(p => p.id === pkg.id);
  return (
    <div style={{
      border: isPopular ? '2px solid #6366f1' : '1.5px solid #e5e7eb',
      borderRadius: 16,
      padding: '20px 16px',
      textAlign: 'center',
      position: 'relative',
      background: isPopular ? 'linear-gradient(135deg,#faf5ff,#ede9fe)' : 'white',
      boxShadow: isPopular ? '0 4px 20px rgba(99,102,241,0.2)' : '0 2px 8px rgba(0,0,0,0.04)',
      transition: 'transform 0.15s, box-shadow 0.15s',
    }}>
      {isPopular && (
        <div style={{
          position: 'absolute', top: -12, right: '50%', transform: 'translateX(50%)',
          background: '#6366f1', color: 'white', fontSize: 11, fontWeight: 800,
          padding: '3px 12px', borderRadius: 99, whiteSpace: 'nowrap',
        }}>
          ⭐ الأكثر شعبية
        </div>
      )}
      <div style={{ fontSize: 32, marginBottom: 10, marginTop: isPopular ? 8 : 0 }}>
        {PKG_ICONS[i >= 0 ? i : 0] || '💎'}
      </div>
      <div style={{ fontSize: 22, fontWeight: 900, color: '#6366f1', marginBottom: 4 }}>
        {pkg.points.toLocaleString('ar-EG')}
      </div>
      <div style={{ fontSize: 12, color: '#9ca3af', marginBottom: 2, fontWeight: 600 }}>نقطة سمعة</div>
      <div style={{ fontSize: 11, color: '#d1d5db', marginBottom: 14 }}>
        = {pkg.usdCents} سنت أمريكي
      </div>
      <div style={{
        fontSize: 18, fontWeight: 800, color: '#1a1a2e', marginBottom: 16,
        padding: '8px 0', borderTop: '1px solid #f3f4f6', borderBottom: '1px solid #f3f4f6',
      }}>
        {pkg.localPriceFormatted}
      </div>
      <button
        onClick={() => onBuy(pkg)}
        disabled={isBuying}
        style={{
          width: '100%', padding: '10px 0',
          background: isBuying ? '#c4b5fd' : (isPopular ? '#6366f1' : '#8b5cf6'),
          color: 'white', border: 'none', borderRadius: 10,
          fontSize: 14, fontWeight: 800,
          cursor: isBuying ? 'wait' : 'pointer',
          fontFamily: 'inherit', transition: 'background 0.2s',
        }}
      >
        {isBuying ? '⏳ جاري...' : 'اشترِ الآن'}
      </button>
    </div>
  );
}

export default function HonorRollPage() {
  const [leaders, setLeaders] = useState([]);
  const [loading, setLoading] = useState(true);

  // Purchase section state
  const [packages, setPackages] = useState([]);
  const [loadingPackages, setLoadingPackages] = useState(true);
  const [country, setCountry] = useState('US');
  const [currency, setCurrency] = useState('USD');
  const [symbol, setSymbol] = useState('$');
  const [checkoutLoading, setCheckoutLoading] = useState(null);
  const [purchaseError, setPurchaseError] = useState('');
  const [purchasedPts, setPurchasedPts] = useState(null);

  useEffect(() => {
    // Parse URL param for purchase success banner
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const pts = params.get('purchased');
      if (pts) setPurchasedPts(parseInt(pts, 10));
    }

    // Fetch leaderboard
    fetch(API + '/api/users/leaderboard')
      .then(r => r.ok ? r.json() : [])
      .then(data => Array.isArray(data) && setLeaders(data))
      .catch(() => {})
      .finally(() => setLoading(false));

    // Load packages with client-side fallback
    async function loadPackages() {
      setLoadingPackages(true);

      // Step 1: Get country from geo (or fallback)
      let detectedCountry = 'US';
      try {
        const geoRes = await fetch('/api/geo');
        const geoData = await geoRes.json();
        detectedCountry = geoData.country || 'US';
      } catch {}
      setCountry(detectedCountry);

      const detectedCurrency = COUNTRY_CURRENCY_MAP[detectedCountry] || 'USD';
      const detectedSymbol = CURRENCY_SYMBOLS_MAP[detectedCurrency] || detectedCurrency;
      setCurrency(detectedCurrency);
      setSymbol(detectedSymbol);

      // Step 2: Try to get live data from backend (will fail if Railway is on old code)
      try {
        const pkgRes = await fetch(
          `${API}/api/reputation/packages?country=${detectedCountry}`,
          { signal: AbortSignal.timeout(3000) }
        );
        if (pkgRes.ok) {
          const data = await pkgRes.json();
          if (data.packages && data.packages.length > 0) {
            setPackages(data.packages);
            setLoadingPackages(false);
            return; // Got live data, done
          }
        }
      } catch {}

      // Step 3: Fallback — compute client-side with hardcoded rates
      const rate = FALLBACK_RATES[detectedCurrency] || 1;
      const pkgs = computePackages(detectedCountry, rate, detectedSymbol);
      setPackages(pkgs);
      setLoadingPackages(false);
    }

    loadPackages();
  }, []);

  async function handleBuy(pkg) {
    setPurchaseError('');
    const token = typeof window !== 'undefined' ? localStorage.getItem('xtox_token') : null;
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setCheckoutLoading(pkg.id);
    try {
      const res = await fetch(`${API}/api/reputation/checkout`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ packageId: pkg.id, country }),
        signal: AbortSignal.timeout(8000),
      });

      if (res.ok) {
        const data = await res.json();
        if (data.url) {
          window.location.href = data.url;
          return;
        }
        setPurchaseError(data.error || 'حدث خطأ، يرجى المحاولة لاحقاً');
      } else {
        // Backend doesn't have the endpoint yet (Railway on old code)
        setPurchaseError('خدمة الشراء ستكون متاحة قريباً. يرجى المحاولة لاحقاً.');
      }
    } catch {
      setPurchaseError('تعذّر الاتصال بخادم الدفع. يرجى المحاولة لاحقاً.');
    } finally {
      setCheckoutLoading(null);
    }
  }

  return (
    <div dir="rtl" style={{
      fontFamily: "'Cairo', 'Tajawal', sans-serif",
      background: 'linear-gradient(135deg, #f0f0ff 0%, #faf5ff 100%)',
      minHeight: '100vh',
      padding: '24px 16px 48px',
    }}>
      <div style={{ maxWidth: 780, margin: '0 auto' }}>

        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: 36, padding: '32px 24px', background: 'linear-gradient(135deg,#6366f1,#8b5cf6)', borderRadius: 24, color: 'white', boxShadow: '0 8px 32px rgba(99,102,241,0.3)' }}>
          <div style={{ fontSize: 48, marginBottom: 8 }}>🏆</div>
          <h1 style={{ fontSize: 28, fontWeight: 900, margin: '0 0 8px' }}>لوحة الشرف</h1>
          <p style={{ margin: 0, opacity: 0.85, fontSize: 15 }}>أفضل البائعين والمشترين بناءً على نقاط السمعة</p>
        </div>

        {/* ✅ Purchase Success Banner */}
        {purchasedPts && (
          <div style={{
            background: 'linear-gradient(135deg,#d1fae5,#a7f3d0)',
            border: '2px solid #34d399',
            borderRadius: 16,
            padding: '20px 24px',
            marginBottom: 28,
            display: 'flex',
            alignItems: 'center',
            gap: 14,
          }}>
            <span style={{ fontSize: 36 }}>✅</span>
            <div>
              <div style={{ fontWeight: 800, fontSize: 18, color: '#065f46' }}>
                تم الشراء بنجاح!
              </div>
              <div style={{ color: '#047857', fontSize: 14, marginTop: 4 }}>
                تمت إضافة <strong>{purchasedPts.toLocaleString('ar-EG')} نقطة سمعة</strong> إلى حسابك بنجاح 🎉
              </div>
            </div>
          </div>
        )}

        {/* 🛒 BUY REPUTATION POINTS */}
        <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 36 }}>
          <div style={{
            padding: '20px 24px 16px',
            borderBottom: '1px solid #f3f4f6',
            background: 'linear-gradient(135deg,#ede9fe,#ddd6fe)',
          }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#4c1d95', display: 'flex', alignItems: 'center', gap: 10 }}>
              🛒 اشترِ نقاط السمعة
            </h2>
            <p style={{ margin: '8px 0 0', color: '#6d28d9', fontSize: 13, fontWeight: 600 }}>
              5 نقاط = 1 سنت أمريكي · الأسعار تُعرض بعملتك المحلية
            </p>
          </div>

          <div style={{ padding: '24px' }}>
            {purchaseError && (
              <div style={{
                background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 10,
                padding: '12px 16px', marginBottom: 20, color: '#dc2626', fontWeight: 600, fontSize: 14,
              }}>
                ⚠️ {purchaseError}
              </div>
            )}

            {loadingPackages ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#6366f1', fontSize: 16 }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
                <p style={{ margin: 0, fontWeight: 600 }}>جاري تحميل الأسعار...</p>
              </div>
            ) : packages.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '40px', color: '#94a3b8' }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>😔</div>
                <p style={{ margin: 0 }}>تعذّر تحميل الأسعار. يرجى المحاولة لاحقاً.</p>
              </div>
            ) : (
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))',
                gap: 16,
              }}>
                {packages.map(pkg => (
                  <PackageCard
                    key={pkg.id}
                    pkg={pkg}
                    onBuy={handleBuy}
                    checkoutLoading={checkoutLoading}
                  />
                ))}
              </div>
            )}

            {/* Pricing note */}
            {!loadingPackages && packages.length > 0 && (
              <div style={{
                marginTop: 20,
                padding: '12px 16px',
                background: '#f8fafc',
                borderRadius: 10,
                fontSize: 12,
                color: '#6b7280',
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
              }}>
                <span>💡</span>
                <span>
                  السعر يُحسب تلقائياً بعملتك المحلية · 5 نقاط = $0.01 · الدفع عبر Stripe (آمن 100%)
                  {packages[0] ? ` · العملة: ${packages[0].currency || currency}` : ''}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Leaderboard */}
        <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden', marginBottom: 36 }}>
          <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #f3f4f6' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>
              🏆 لوحة المتصدرين
            </h2>
          </div>

          {loading ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: 32, marginBottom: 8 }}>⏳</div>
              <p style={{ margin: 0 }}>جاري التحميل...</p>
            </div>
          ) : leaders.length === 0 ? (
            <div style={{ padding: 48, textAlign: 'center', color: '#888' }}>
              <div style={{ fontSize: 40, marginBottom: 8 }}>🏆</div>
              <p style={{ margin: 0 }}>لا يوجد مستخدمون بعد</p>
            </div>
          ) : (
            <div>
              {leaders.map((user, idx) => {
                const rank = idx + 1;
                const isTop3 = rank <= 3;
                return (
                  <div key={user._id} style={{
                    display: 'flex', alignItems: 'center', gap: 14,
                    padding: '14px 24px',
                    background: isTop3 ? MEDAL_BG[rank - 1] : 'white',
                    borderBottom: '1px solid #f3f4f6',
                    transition: 'background 0.2s',
                  }}>
                    <div style={{ width: 40, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
                      <MedalRank rank={rank} />
                    </div>

                    {user.avatar ? (
                      <img src={user.avatar} alt={user.name} style={{
                        width: 44, height: 44, borderRadius: '50%', objectFit: 'cover', flexShrink: 0,
                        border: isTop3 ? `3px solid ${MEDAL_COLORS[rank - 1]}` : '2px solid #e5e7eb',
                      }} />
                    ) : (
                      <div style={{
                        width: 44, height: 44, borderRadius: '50%', flexShrink: 0,
                        background: `linear-gradient(135deg,${isTop3 ? MEDAL_COLORS[rank - 1] : '#6366f1'},${isTop3 ? MEDAL_COLORS[rank - 1] + 'aa' : '#8b5cf6'})`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: 'white', fontWeight: 'bold', fontSize: 18,
                        border: isTop3 ? `3px solid ${MEDAL_COLORS[rank - 1]}` : 'none',
                      }}>
                        {(user.name?.[0] || '?').toUpperCase()}
                      </div>
                    )}

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{
                        fontWeight: 700, fontSize: 15,
                        color: isTop3 ? '#1a1a2e' : '#374151',
                        display: 'flex', alignItems: 'center', gap: 6,
                      }}>
                        {user.name || 'مستخدم'}
                        {rank === 1 && <span style={{ fontSize: 11, background: '#fef3c7', color: '#d97706', padding: '2px 8px', borderRadius: 99, fontWeight: 700 }}>بائع الشهر</span>}
                      </div>
                      <div style={{ fontSize: 12, color: '#9ca3af', marginTop: 2 }}>
                        انضم {new Date(user.createdAt).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long' })}
                      </div>
                    </div>

                    <div style={{
                      textAlign: 'center', flexShrink: 0,
                      background: isTop3 ? MEDAL_COLORS[rank - 1] + '22' : '#f0f0ff',
                      padding: '6px 14px', borderRadius: 99,
                    }}>
                      <div style={{
                        fontWeight: 800, fontSize: 18,
                        color: isTop3 ? MEDAL_COLORS[rank - 1].replace('#FFD', '#b89') : '#6366f1',
                      }}>
                        {(user.reputationPoints || 0).toLocaleString('ar-EG')}
                      </div>
                      <div style={{ fontSize: 10, color: '#9ca3af', fontWeight: 600 }}>نقطة</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Full Rules Reference */}
        <div style={{ background: 'white', borderRadius: 20, boxShadow: '0 4px 24px rgba(0,0,0,0.08)', overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 12px', borderBottom: '1px solid #f3f4f6', background: 'linear-gradient(135deg,#f0fdf4,#dcfce7)' }}>
            <h2 style={{ margin: 0, fontSize: 20, fontWeight: 800, color: '#1a1a2e', display: 'flex', alignItems: 'center', gap: 8 }}>
              📋 قواعد نقاط السمعة
            </h2>
            <p style={{ margin: '6px 0 0', color: '#6b7280', fontSize: 13 }}>دليل كامل لكيفية كسب وخسارة النقاط</p>
          </div>

          <div style={{ padding: '24px' }}>

            {/* GAINS */}
            <div style={{ marginBottom: 28 }}>
              <h3 style={{
                fontSize: 17, fontWeight: 800, color: '#16a34a',
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #dcfce7',
              }}>
                ✅ كيف تكسب النقاط
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#f0fdf4' }}>
                    <th style={{ textAlign: 'right', padding: '10px 14px', color: '#374151', fontWeight: 700, borderRadius: '8px 0 0 8px' }}>الإجراء</th>
                    <th style={{ textAlign: 'center', padding: '10px 14px', color: '#374151', fontWeight: 700, borderRadius: '0 8px 8px 0', whiteSpace: 'nowrap' }}>النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['إكمال ملفك الشخصي', '+10'],
                    ['نشر أول إعلان', '+5'],
                    ['مشاهدة إعلان (زائر فريد / 24 ساعة)', '+1'],
                    ['تحديد الإعلان كمباع', '+15'],
                    ['كتابة تقييم على بائع', '+10'],
                    ['استقبال تقييم 2 نجوم', '+1'],
                    ['استقبال تقييم 3 نجوم', '+3'],
                    ['استقبال تقييم 4 نجوم', '+7'],
                    ['استقبال تقييم 5 نجوم', '+10'],
                    ['مكافأة تقييم 5 نجوم', '+15'],
                    ['شراء نقاط بالدفع الإلكتروني', '+حسب الباقة'],
                  ].map(([action, pts], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{action}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#16a34a', fontSize: 15 }}>{pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* LOSSES */}
            <div>
              <h3 style={{
                fontSize: 17, fontWeight: 800, color: '#dc2626',
                display: 'flex', alignItems: 'center', gap: 8,
                marginBottom: 14, paddingBottom: 10, borderBottom: '2px solid #fee2e2',
              }}>
                ❌ كيف تخسر النقاط
              </h3>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 14 }}>
                <thead>
                  <tr style={{ background: '#fef2f2' }}>
                    <th style={{ textAlign: 'right', padding: '10px 14px', color: '#374151', fontWeight: 700, borderRadius: '8px 0 0 8px' }}>الإجراء</th>
                    <th style={{ textAlign: 'center', padding: '10px 14px', color: '#374151', fontWeight: 700, borderRadius: '0 8px 8px 0', whiteSpace: 'nowrap' }}>النقاط</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    ['تعديل إعلان', '-10'],
                    ['نشر إعلان إضافي (تجاوز الحد اليومي)', '-100'],
                    ['استقبال تقييم 1 نجمة', '-5'],
                    ['تلقي بلاغ', '-10'],
                    ['بدء مكالمة صوتية مع مستخدم جديد (أول مرة فقط)', '-10'],
                    ['كل دقيقة من مدة المكالمة (بعد الرد)', '-10/دقيقة'],
                    ['كشف واتساب البائع (أول مرة لكل بائع)', '-10'],
                    ['كشف رقم هاتف البائع (أول مرة لكل بائع)', '-10'],
                    ['تعديل يدوي من الإدارة', 'متغير'],
                  ].map(([action, pts], i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6', background: i % 2 === 0 ? 'white' : '#f9fafb' }}>
                      <td style={{ padding: '10px 14px', color: '#374151' }}>{action}</td>
                      <td style={{ padding: '10px 14px', textAlign: 'center', fontWeight: 700, color: '#dc2626', fontSize: 15 }}>{pts}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Footer note */}
            <div style={{
              marginTop: 20, padding: '14px 18px',
              background: '#f0f0ff', borderRadius: 12,
              fontSize: 13, color: '#6366f1', fontWeight: 600,
              display: 'flex', alignItems: 'flex-start', gap: 8,
            }}>
              <span>💡</span>
              <span>النقاط السلبية تُطبَّق مرة واحدة فقط في الحالات المشار إليها (مثل: أول مكالمة مع شخص جديد، أول كشف لمعلومات بائع). النقاط الشهرية لا تنخفض تحت الصفر.</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
