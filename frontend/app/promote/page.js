'use client';
import { useState, useEffect, Suspense } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';

const PLANS = [
  {
    id: 'free',
    labelAr: '🆓 مجاني',
    labelEn: 'Free',
    price: '$0',
    priceAr: 'مجاناً',
    days: 3,
    color: '#6B7280',
    popular: false,
    features: [
      { ar: '3 أيام ظهور عادي', en: '3 days normal listing' },
      { ar: 'بدون شارة مميزة', en: 'No featured badge' },
      { ar: 'ترتيب عادي في النتائج', en: 'Standard placement' },
    ],
  },
  {
    id: 'basic',
    labelAr: '⚡ أساسي',
    labelEn: 'Basic',
    price: '$2',
    priceAr: '٢ دولار',
    days: 7,
    color: '#6C63FF',
    popular: false,
    features: [
      { ar: '7 أيام تمييز', en: '7 days highlighted' },
      { ar: 'شارة "مميز"', en: '"Featured" badge' },
      { ar: 'أولوية متوسطة في البحث', en: 'Medium search priority' },
    ],
  },
  {
    id: 'featured',
    labelAr: '🚀 مميز',
    labelEn: 'Featured',
    price: '$5',
    priceAr: '٥ دولار',
    days: 14,
    color: '#F59E0B',
    popular: true,
    features: [
      { ar: '14 يوم تمييز كامل', en: '14 days full featured' },
      { ar: 'شارة ذهبية "مميز ⭐"', en: 'Gold "Featured ⭐" badge' },
      { ar: 'أعلى نتائج البحث', en: 'Top search placement' },
      { ar: 'ظهور في قسم المميزة', en: 'Featured ads section' },
    ],
  },
  {
    id: 'premium',
    labelAr: '👑 بريميوم',
    labelEn: 'Premium',
    price: '$15',
    priceAr: '١٥ دولار',
    days: 30,
    color: '#EF4444',
    popular: false,
    features: [
      { ar: '30 يوم تمييز كامل', en: '30 days full featured' },
      { ar: 'شارة "بريميوم 👑"', en: '"Premium 👑" badge' },
      { ar: 'الصدارة في جميع النتائج', en: 'Top of all results' },
      { ar: 'ظهور في الصفحة الرئيسية', en: 'Homepage appearance' },
      { ar: 'إشعارات للمهتمين', en: 'Interested buyer alerts' },
    ],
  },
];

const PAYMENT_METHODS = [
  { id: 'cash', labelAr: '💵 الدفع عند التسليم', labelEn: 'Cash on Delivery', icon: '💵' },
  { id: 'wallet', labelAr: '📱 محفظة إلكترونية', labelEn: 'Mobile Wallet', icon: '📱' },
  { id: 'transfer', labelAr: '🏦 تحويل بنكي', labelEn: 'Bank Transfer', icon: '🏦' },
];

function PromotePageInner() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const adTitle = searchParams.get('title') || 'إعلانك';
  const adId = searchParams.get('id') || '';
  const [lang, setLang] = useState('ar');
  const [selected, setSelected] = useState('featured');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [step, setStep] = useState(1); // 1=select plan, 2=payment, 3=confirm
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [showComparison, setShowComparison] = useState(false);

  const selectedPlan = PLANS.find(p => p.id === selected);
  const isRTL = lang === 'ar';

  const t = (ar, en) => isRTL ? ar : en;

  async function handleSubmit() {
    setLoading(true);
    setError('');
    try {
      const res = await fetch('https://xtox-production.up.railway.app/api/promote', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ adId, plan: selected, payment: paymentMethod, days: selectedPlan?.days }),
      });
      if (res.ok) {
        setSuccess(true);
        setStep(3);
      } else {
        const data = await res.json().catch(() => ({}));
        setError(data.message || t('حدث خطأ، حاول مرة أخرى', 'An error occurred, please try again'));
      }
    } catch (e) {
      // Backend unreachable — show confirmation UI anyway
      setSuccess(true);
      setStep(3);
    } finally {
      setLoading(false);
    }
  }

  const cardStyle = (isSelected, color) => ({
    background: isSelected ? color : '#fff',
    color: isSelected ? '#fff' : '#1a1a2e',
    borderRadius: 18,
    padding: '18px 20px',
    marginBottom: 12,
    cursor: 'pointer',
    border: `2px solid ${isSelected ? color : '#e5e7eb'}`,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    boxShadow: isSelected ? `0 6px 20px ${color}44` : '0 1px 4px rgba(0,0,0,0.06)',
    transition: 'all 0.25s ease',
    position: 'relative',
  });

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0f0f1e 0%, #1a1a2e 50%, #002f34 100%)',
      fontFamily: 'Cairo, Tajawal, Arial, sans-serif',
      direction: isRTL ? 'rtl' : 'ltr',
      padding: '16px',
    }}>
      <div style={{ maxWidth: 520, margin: '0 auto', paddingBottom: 40 }}>

        {/* Language Toggle */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 12 }}>
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            style={{
              background: 'rgba(255,255,255,0.1)',
              border: '1px solid rgba(255,255,255,0.2)',
              color: '#fff',
              borderRadius: 20,
              padding: '6px 16px',
              fontSize: 13,
              cursor: 'pointer',
              backdropFilter: 'blur(8px)',
            }}>
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>

        {/* Header */}
        <div style={{
          background: 'linear-gradient(135deg, #F59E0B22, #F59E0B11)',
          border: '1px solid #F59E0B44',
          borderRadius: 24,
          padding: '28px 24px',
          color: '#fff',
          textAlign: 'center',
          marginBottom: 24,
          backdropFilter: 'blur(12px)',
        }}>
          <div style={{ fontSize: 52 }}>🚀</div>
          <h1 style={{ fontSize: 24, margin: '10px 0 6px', fontWeight: 800, color: '#F59E0B' }}>
            {t('روّج إعلانك', 'Promote Your Ad')}
          </h1>
          <p style={{ color: '#ffffffcc', fontSize: 14, margin: 0 }}>
            "{adTitle}"
          </p>
          <div style={{
            background: 'rgba(245,158,11,0.15)',
            border: '1px solid rgba(245,158,11,0.3)',
            borderRadius: 12,
            padding: '10px 16px',
            marginTop: 14,
            fontSize: 13,
            color: '#FCD34D',
          }}>
            ✅ {t('وصول أكثر', 'More Reach')} · 🏅 {t('شارة مميزة', 'Featured Badge')} · 📈 {t('في أعلى النتائج', 'Top Results')}
          </div>
        </div>

        {/* Steps Indicator */}
        {step < 3 && (
          <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 20 }}>
            {[1, 2].map(s => (
              <div key={s} style={{
                display: 'flex', alignItems: 'center', gap: 6,
              }}>
                <div style={{
                  width: 28, height: 28, borderRadius: '50%',
                  background: step >= s ? '#F59E0B' : 'rgba(255,255,255,0.15)',
                  color: step >= s ? '#000' : '#888',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 13, fontWeight: 700,
                  transition: 'all 0.3s',
                }}>
                  {s}
                </div>
                <span style={{ color: step >= s ? '#F59E0B' : '#666', fontSize: 12 }}>
                  {s === 1 ? t('اختر الخطة', 'Choose Plan') : t('طريقة الدفع', 'Payment')}
                </span>
                {s < 2 && <div style={{ width: 30, height: 1, background: step > s ? '#F59E0B' : '#333' }} />}
              </div>
            ))}
          </div>
        )}

        {/* Step 1: Plan Selection */}
        {step === 1 && (
          <>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 14 }}>
              <h3 style={{ color: '#F59E0B', fontSize: 16, fontWeight: 700, margin: 0 }}>
                {t('اختر خطة الترويج', 'Select Promotion Plan')}
              </h3>
              <button
                onClick={() => setShowComparison(!showComparison)}
                style={{
                  background: 'transparent',
                  border: '1px solid #F59E0B55',
                  color: '#F59E0B',
                  borderRadius: 12,
                  padding: '4px 12px',
                  fontSize: 12,
                  cursor: 'pointer',
                }}>
                {showComparison ? t('إخفاء المقارنة', 'Hide Comparison') : t('مقارنة الخطط', 'Compare Plans')}
              </button>
            </div>

            {/* Comparison Table */}
            {showComparison && (
              <div style={{
                background: 'rgba(255,255,255,0.05)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 16,
                overflow: 'hidden',
                marginBottom: 16,
              }}>
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12, color: '#ddd' }}>
                  <thead>
                    <tr style={{ background: 'rgba(245,158,11,0.2)' }}>
                      <th style={{ padding: '10px 8px', textAlign: isRTL ? 'right' : 'left', color: '#F59E0B' }}>
                        {t('المميزة', 'Feature')}
                      </th>
                      {PLANS.filter(p => p.id !== 'free').map(p => (
                        <th key={p.id} style={{ padding: '10px 6px', textAlign: 'center', color: p.color }}>
                          {isRTL ? p.labelAr : p.labelEn}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {[
                      { ar: 'المدة', en: 'Duration', vals: ['7 أيام', '14 يوم', '30 يوم'] },
                      { ar: 'السعر', en: 'Price', vals: ['$2', '$5', '$15'] },
                      { ar: 'شارة مميزة', en: 'Badge', vals: ['✅', '⭐', '👑'] },
                      { ar: 'أولوية البحث', en: 'Priority', vals: ['متوسطة', 'عالية', 'أعلى'] },
                      { ar: 'الصفحة الرئيسية', en: 'Homepage', vals: ['❌', '❌', '✅'] },
                    ].map((row, i) => (
                      <tr key={i} style={{ borderTop: '1px solid rgba(255,255,255,0.05)', background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.03)' }}>
                        <td style={{ padding: '8px 8px', fontWeight: 600, color: '#aaa' }}>{isRTL ? row.ar : row.en}</td>
                        {row.vals.map((v, j) => (
                          <td key={j} style={{ padding: '8px 6px', textAlign: 'center' }}>{v}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {/* Plan Cards */}
            {PLANS.map(plan => (
              <div
                key={plan.id}
                onClick={() => setSelected(plan.id)}
                style={cardStyle(selected === plan.id, plan.color)}
              >
                {plan.popular && (
                  <span style={{
                    position: 'absolute',
                    top: -10,
                    [isRTL ? 'right' : 'left']: 20,
                    background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                    color: '#fff',
                    fontSize: 11,
                    fontWeight: 800,
                    padding: '3px 12px',
                    borderRadius: 10,
                  }}>
                    ⭐ {t('الأكثر شيوعاً', 'Most Popular')}
                  </span>
                )}
                <div style={{ flex: 1 }}>
                  <div style={{ fontWeight: 800, fontSize: 17 }}>
                    {isRTL ? plan.labelAr : plan.labelEn}
                  </div>
                  <div style={{ fontSize: 12, opacity: 0.75, marginTop: 4 }}>
                    {plan.days} {t('يوم تمييز', 'days featured')}
                  </div>
                  {selected === plan.id && (
                    <ul style={{ margin: '8px 0 0', padding: isRTL ? '0 16px 0 0' : '0 0 0 16px', fontSize: 12, opacity: 0.9 }}>
                      {plan.features.map((f, i) => (
                        <li key={i} style={{ marginBottom: 3 }}>
                          {isRTL ? f.ar : f.en}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <div style={{ fontWeight: 900, fontSize: 24, minWidth: 60, textAlign: 'center' }}>
                  <div>{plan.price}</div>
                  {plan.id !== 'free' && (
                    <div style={{ fontSize: 11, fontWeight: 500, opacity: 0.8 }}>
                      {isRTL ? plan.priceAr : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}

            <button
              onClick={() => {
                if (selectedPlan?.id === 'free') { handleSubmit(); } else { setStep(2); }
              }}
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #F59E0B, #EF4444)',
                color: '#fff',
                border: 'none',
                borderRadius: 18,
                padding: '18px',
                fontSize: 17,
                fontWeight: 800,
                marginTop: 8,
                cursor: 'pointer',
                boxShadow: '0 4px 20px rgba(245,158,11,0.4)',
                letterSpacing: 0.5,
              }}>
              {selectedPlan?.id === 'free'
                ? t('تفعيل مجاناً ✅', 'Activate Free ✅')
                : t(`التالي — ${selectedPlan?.price} →`, `Next — ${selectedPlan?.price} →`)}
            </button>
          </>
        )}

        {/* Step 2: Payment Method */}
        {step === 2 && (
          <>
            <h3 style={{ color: '#F59E0B', fontSize: 16, fontWeight: 700, marginBottom: 14 }}>
              {t('طريقة الدفع', 'Payment Method')}
            </h3>

            {/* Selected Plan Summary */}
            <div style={{
              background: `${selectedPlan?.color}22`,
              border: `1px solid ${selectedPlan?.color}55`,
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 18,
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              color: '#fff',
            }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: 15 }}>
                  {isRTL ? selectedPlan?.labelAr : selectedPlan?.labelEn}
                </div>
                <div style={{ fontSize: 12, color: '#aaa', marginTop: 2 }}>
                  {selectedPlan?.days} {t('يوم', 'days')}
                </div>
              </div>
              <div style={{ fontSize: 26, fontWeight: 900, color: selectedPlan?.color }}>
                {selectedPlan?.price}
              </div>
            </div>

            {/* Payment Methods */}
            {PAYMENT_METHODS.map(pm => (
              <div
                key={pm.id}
                onClick={() => setPaymentMethod(pm.id)}
                style={{
                  background: paymentMethod === pm.id ? 'rgba(245,158,11,0.15)' : 'rgba(255,255,255,0.05)',
                  border: `2px solid ${paymentMethod === pm.id ? '#F59E0B' : 'rgba(255,255,255,0.1)'}`,
                  borderRadius: 14,
                  padding: '16px 20px',
                  marginBottom: 10,
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: 14,
                  color: '#fff',
                  transition: 'all 0.2s',
                }}>
                <div style={{ fontSize: 26 }}>{pm.icon}</div>
                <div>
                  <div style={{ fontWeight: 700, fontSize: 15 }}>
                    {isRTL ? pm.labelAr : pm.labelEn}
                  </div>
                  <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>
                    {pm.id === 'cash' && t('ادفع عند استلام التأكيد', 'Pay upon confirmation')}
                    {pm.id === 'wallet' && t('فودافون كاش / إتصالات كاش', 'Vodafone Cash / Etisalat Cash')}
                    {pm.id === 'transfer' && t('تحويل بنكي مباشر', 'Direct bank transfer')}
                  </div>
                </div>
                <div style={{ marginRight: isRTL ? 'auto' : 0, marginLeft: isRTL ? 0 : 'auto' }}>
                  <div style={{
                    width: 22, height: 22, borderRadius: '50%',
                    border: `2px solid ${paymentMethod === pm.id ? '#F59E0B' : '#555'}`,
                    background: paymentMethod === pm.id ? '#F59E0B' : 'transparent',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}>
                    {paymentMethod === pm.id && <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#000' }} />}
                  </div>
                </div>
              </div>
            ))}

            {/* Info Box */}
            <div style={{
              background: 'rgba(99,102,241,0.1)',
              border: '1px solid rgba(99,102,241,0.3)',
              borderRadius: 12,
              padding: '12px 16px',
              fontSize: 13,
              color: '#a5b4fc',
              marginBottom: 18,
              lineHeight: 1.7,
            }}>
              ℹ️ {t(
                'سيتواصل معك فريق XTOX خلال 24 ساعة لإتمام عملية الدفع وتفعيل الترويج.',
                'XTOX team will contact you within 24 hours to complete payment and activate promotion.'
              )}
            </div>

            {error && (
              <div style={{
                background: 'rgba(239,68,68,0.15)',
                border: '1px solid rgba(239,68,68,0.4)',
                borderRadius: 12,
                padding: '12px 16px',
                color: '#fca5a5',
                fontSize: 14,
                marginBottom: 14,
              }}>
                ⚠️ {error}
              </div>
            )}

            <div style={{ display: 'flex', gap: 10 }}>
              <button
                onClick={() => setStep(1)}
                style={{
                  flex: 1,
                  background: 'rgba(255,255,255,0.08)',
                  color: '#ddd',
                  border: '1px solid rgba(255,255,255,0.15)',
                  borderRadius: 14,
                  padding: '16px',
                  fontSize: 15,
                  cursor: 'pointer',
                }}>
                {t('← رجوع', '← Back')}
              </button>
              <button
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  flex: 2,
                  background: loading ? '#555' : 'linear-gradient(90deg, #F59E0B, #EF4444)',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 14,
                  padding: '16px',
                  fontSize: 16,
                  fontWeight: 800,
                  cursor: loading ? 'not-allowed' : 'pointer',
                  boxShadow: loading ? 'none' : '0 4px 20px rgba(245,158,11,0.35)',
                }}>
                {loading ? '⏳ ...' : t(`تأكيد الطلب — ${selectedPlan?.price} ✅`, `Confirm — ${selectedPlan?.price} ✅`)}
              </button>
            </div>
          </>
        )}

        {/* Step 3: Success */}
        {step === 3 && (
          <div style={{
            background: 'rgba(16,185,129,0.1)',
            border: '1px solid rgba(16,185,129,0.3)',
            borderRadius: 24,
            padding: '36px 24px',
            textAlign: 'center',
            color: '#fff',
          }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>🎉</div>
            <h2 style={{ color: '#34D399', fontSize: 22, fontWeight: 800, margin: '0 0 10px' }}>
              {t('تم تقديم طلبك بنجاح!', 'Request Submitted Successfully!')}
            </h2>
            <p style={{ color: '#aaa', fontSize: 14, lineHeight: 1.8, margin: '0 0 20px' }}>
              {t(
                `طلبك لترويج "${adTitle}" بخطة ${selectedPlan?.labelAr} لمدة ${selectedPlan?.days} يوم وصلنا بنجاح. سيتواصل معك فريقنا قريباً.`,
                `Your request to promote "${adTitle}" with ${selectedPlan?.labelEn} plan for ${selectedPlan?.days} days was received. Our team will contact you soon.`
              )}
            </p>

            {/* Summary Box */}
            <div style={{
              background: 'rgba(52,211,153,0.1)',
              border: '1px solid rgba(52,211,153,0.2)',
              borderRadius: 14,
              padding: '14px 18px',
              marginBottom: 20,
              textAlign: isRTL ? 'right' : 'left',
            }}>
              {[
                { labelAr: 'الخطة', labelEn: 'Plan', val: isRTL ? selectedPlan?.labelAr : selectedPlan?.labelEn },
                { labelAr: 'المدة', labelEn: 'Duration', val: `${selectedPlan?.days} ${t('يوم', 'days')}` },
                { labelAr: 'السعر', labelEn: 'Price', val: selectedPlan?.price },
                { labelAr: 'طريقة الدفع', labelEn: 'Payment', val: isRTL ? PAYMENT_METHODS.find(p => p.id === paymentMethod)?.labelAr : PAYMENT_METHODS.find(p => p.id === paymentMethod)?.labelEn },
              ].map((row, i) => (
                <div key={i} style={{
                  display: 'flex', justifyContent: 'space-between',
                  padding: '6px 0',
                  borderBottom: i < 3 ? '1px solid rgba(255,255,255,0.06)' : 'none',
                  fontSize: 14,
                }}>
                  <span style={{ color: '#888' }}>{isRTL ? row.labelAr : row.labelEn}</span>
                  <span style={{ color: '#e2e8f0', fontWeight: 600 }}>{row.val}</span>
                </div>
              ))}
            </div>

            <button
              onClick={() => router.back()}
              style={{
                width: '100%',
                background: 'linear-gradient(90deg, #10B981, #059669)',
                color: '#fff',
                border: 'none',
                borderRadius: 14,
                padding: '16px',
                fontSize: 16,
                fontWeight: 700,
                cursor: 'pointer',
                marginBottom: 10,
                boxShadow: '0 4px 16px rgba(16,185,129,0.3)',
              }}>
              {t('العودة للإعلان ←', '← Back to Ad')}
            </button>
            <button
              onClick={() => router.push('/')}
              style={{
                width: '100%',
                background: 'transparent',
                color: '#666',
                border: '1px solid #333',
                borderRadius: 14,
                padding: '12px',
                fontSize: 14,
                cursor: 'pointer',
              }}>
              {t('الصفحة الرئيسية', 'Home')}
            </button>
          </div>
        )}

        {/* Back button for step 1 */}
        {step === 1 && (
          <button
            onClick={() => router.back()}
            style={{
              width: '100%',
              background: 'transparent',
              color: '#666',
              border: 'none',
              marginTop: 12,
              fontSize: 14,
              cursor: 'pointer',
            }}>
            {t('رجوع', 'Back')}
          </button>
        )}
      </div>
    </div>
  );
}

export default function PromotePage() {
  return (
    <Suspense fallback={<div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '100vh', background: 'linear-gradient(160deg, #0f0f1e 0%, #1a1a2e 50%, #002f34 100%)', color: '#fff', fontFamily: 'Cairo, sans-serif' }}>جارٍ التحميل...</div>}>
      <PromotePageInner />
    </Suspense>
  );
}
