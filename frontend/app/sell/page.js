'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';

// Arabic category names mapped to English backend values
const CATS = [
  { ar: 'مركبات',         en: 'Vehicles',     icon: '🚗' },
  { ar: 'إلكترونيات',     en: 'Electronics',  icon: '📱' },
  { ar: 'عقارات',         en: 'Real Estate',  icon: '🏠' },
  { ar: 'وظائف',          en: 'Jobs',         icon: '💼' },
  { ar: 'خدمات',          en: 'Services',     icon: '🔧' },
  { ar: 'سوبرماركت',      en: 'Supermarket',  icon: '🛒' },
  { ar: 'صيدلية',         en: 'Pharmacy',     icon: '💊' },
  { ar: 'طعام سريع',      en: 'Fast Food',    icon: '🍔' },
  { ar: 'أزياء',          en: 'Fashion',      icon: '👗' },
  { ar: 'عام',            en: 'General',      icon: '📦' },
];

const CURRENCIES = ['EGP', 'SAR', 'AED', 'USD', 'EUR', 'MAD', 'TND', 'LYD', 'IQD', 'JOD'];

const CONDITIONS = [
  { ar: 'جديد',       en: 'new',       icon: '✨' },
  { ar: 'مستعمل',     en: 'used',      icon: '🔄' },
  { ar: 'ممتاز',      en: 'excellent',  icon: '⭐' },
  { ar: 'للإيجار',    en: 'rent',      icon: '🔑' },
];

export default function SellPage() {
  const [step, setStep] = useState('start'); // start | form | review
  const [form, setForm] = useState({
    title: '',
    description: '',
    category: '',
    price: '',
    city: '',
    phone: '',
    currency: 'EGP',
    condition: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [preview, setPreview] = useState(null);
  const [token, setToken] = useState('');
  const [country, setCountry] = useState('EG');
  const [charCount, setCharCount] = useState(0);
  const fileInputRef = useRef(null);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('token');
    if (!t) { window.location.href = '/login'; return; }
    setToken(t);
    setCountry(localStorage.getItem('country') || 'EG');
    // Pre-fill phone from profile if available
    const user = JSON.parse(localStorage.getItem('user') || '{}');
    if (user.phone) setForm(f => ({ ...f, phone: user.phone }));
  }, []);

  async function aiFromImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    setAiLoading(true);
    setErrors({});
    const reader = new FileReader();
    reader.onload = async (ev) => {
      const dataUrl = ev.target.result;
      setPreview(dataUrl);
      const base64 = dataUrl.split(',')[1];
      try {
        const res = await fetch(`${API}/api/ads/ai-generate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ image: base64 }),
        });
        const data = await res.json();
        if (data.title) {
          setForm(f => ({
            ...f,
            title: data.title || f.title,
            description: data.description || f.description,
            category: data.category || f.category,
            price: data.suggestedPrice ? String(data.suggestedPrice) : f.price,
          }));
          setCharCount((data.description || '').length);
        }
      } catch { /* fallback silently */ }
      setStep('form');
      setAiLoading(false);
    };
    reader.readAsDataURL(file);
  }

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'العنوان مطلوب';
    else if (form.title.trim().length < 5) e.title = 'العنوان قصير جداً (5 أحرف على الأقل)';
    if (!form.category) e.category = 'الفئة مطلوبة';
    if (form.price && isNaN(Number(form.price))) e.price = 'السعر يجب أن يكون رقماً';
    if (form.phone && !/^[\d\s+\-()]{7,15}$/.test(form.phone)) e.phone = 'رقم الهاتف غير صحيح';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit() {
    if (!validate()) return;
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/ads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          ...form,
          price: Number(form.price) || 0,
          country,
          media: preview ? [preview] : [],
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل النشر');
      window.location.href = `/?published=1`;
    } catch (e) {
      setErrors({ submit: e.message });
    }
    setLoading(false);
  }

  function clearImage() {
    setPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  }

  const inputStyle = (field) => ({
    width: '100%',
    padding: '11px 14px',
    borderRadius: 10,
    border: `1.5px solid ${errors[field] ? '#e53e3e' : '#e0e0e0'}`,
    fontSize: 15,
    boxSizing: 'border-box',
    fontFamily: "'Cairo', 'Tajawal', system-ui",
    direction: 'rtl',
    background: errors[field] ? '#fff5f5' : '#fff',
    outline: 'none',
    transition: 'border-color 0.2s',
  });

  const labelStyle = {
    display: 'block',
    fontWeight: 'bold',
    marginBottom: 6,
    fontSize: 14,
    color: '#333',
  };

  const stepCount = step === 'start' ? 1 : 2;

  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        maxWidth: 540,
        margin: '0 auto',
        padding: '0 0 32px',
        fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
        minHeight: '100vh',
        background: '#f5f5f5',
      }}
    >
      {/* Header */}
      <div style={{
        background: '#002f34',
        color: 'white',
        padding: '14px 16px',
        display: 'flex',
        alignItems: 'center',
        gap: 12,
        position: 'sticky',
        top: 0,
        zIndex: 10,
      }}>
        <button
          onClick={() => step === 'form' ? setStep('start') : history.back()}
          aria-label="رجوع"
          style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}
        >
          →
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'white', margin: 0, fontSize: 18, fontWeight: 'bold' }}>نشر إعلان جديد</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {[1, 2].map(n => (
              <div key={n} style={{
                height: 4,
                flex: 1,
                borderRadius: 4,
                background: n <= stepCount ? '#c8f5c5' : 'rgba(255,255,255,0.3)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {/* Submit error */}
        {errors.submit && (
          <div role="alert" style={{
            background: '#fff0f0',
            border: '1px solid #fcc',
            borderRadius: 10,
            padding: '12px 14px',
            marginBottom: 16,
            color: '#c00',
            fontSize: 14,
          }}>
            ⚠️ {errors.submit}
          </div>
        )}

        {/* Step 1: Start */}
        {step === 'start' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ textAlign: 'center', color: '#555', fontSize: 15, margin: '0 0 8px' }}>
              كيف تريد إضافة إعلانك؟
            </p>

            {/* AI Photo upload */}
            <label
              style={{
                display: 'block',
                background: '#002f34',
                color: 'white',
                textAlign: 'center',
                padding: '28px 20px',
                borderRadius: 18,
                cursor: 'pointer',
                fontSize: 17,
                fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,47,52,0.2)',
              }}
              aria-label="صوّر المنتج وسيملأ الذكاء الاصطناعي التفاصيل"
            >
              <div style={{ fontSize: 44, marginBottom: 10 }}>📸</div>
              <div>صوّر المنتج</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6, fontWeight: 'normal' }}>
                الذكاء الاصطناعي يملأ التفاصيل تلقائياً ✨
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                style={{ display: 'none' }}
                onChange={aiFromImage}
                aria-hidden="true"
              />
            </label>

            {aiLoading && (
              <div style={{
                textAlign: 'center',
                padding: '20px',
                background: 'white',
                borderRadius: 14,
                color: '#555',
              }}>
                <div style={{ fontSize: 32, marginBottom: 8 }}>🤖</div>
                <p style={{ margin: 0, fontWeight: 'bold' }}>الذكاء الاصطناعي يحلل الصورة...</p>
                <p style={{ margin: '6px 0 0', fontSize: 13, color: '#888' }}>يرجى الانتظار لحظة</p>
              </div>
            )}

            <button
              onClick={() => setStep('form')}
              style={{
                background: 'white',
                color: '#002f34',
                padding: '20px',
                borderRadius: 18,
                cursor: 'pointer',
                fontSize: 16,
                fontWeight: 'bold',
                border: '2px solid #002f34',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
              }}
              aria-label="إضافة إعلان يدوياً"
            >
              <span style={{ fontSize: 24 }}>✍️</span>
              إضافة يدوياً
            </button>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <div style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

            {/* Image preview */}
            {preview && (
              <div style={{ position: 'relative', marginBottom: 16 }}>
                <img
                  src={preview}
                  alt="صورة الإعلان"
                  style={{ maxHeight: 200, borderRadius: 12, width: '100%', objectFit: 'cover' }}
                />
                <button
                  onClick={clearImage}
                  aria-label="حذف الصورة"
                  style={{
                    position: 'absolute',
                    top: 8,
                    left: 8,
                    background: 'rgba(0,0,0,0.6)',
                    color: 'white',
                    border: 'none',
                    borderRadius: '50%',
                    width: 30,
                    height: 30,
                    cursor: 'pointer',
                    fontSize: 16,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                  }}
                >
                  ✕
                </button>
              </div>
            )}

            {!preview && (
              <label style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                padding: '14px',
                border: '2px dashed #ccc',
                borderRadius: 12,
                cursor: 'pointer',
                color: '#888',
                fontSize: 14,
                marginBottom: 16,
              }}>
                <span style={{ fontSize: 22 }}>📷</span>
                إضافة صورة (اختياري)
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  style={{ display: 'none' }}
                  onChange={aiFromImage}
                  aria-label="رفع صورة"
                />
              </label>
            )}

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-title">
                عنوان الإعلان <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <input
                id="sell-title"
                value={form.title}
                onChange={e => {
                  setForm(p => ({ ...p, title: e.target.value }));
                  if (errors.title) setErrors(p => ({ ...p, title: '' }));
                }}
                placeholder="مثال: آيفون 14 برو ماكس بحالة ممتازة"
                style={inputStyle('title')}
                maxLength={100}
                aria-required="true"
                aria-describedby={errors.title ? 'title-error' : undefined}
              />
              {errors.title && (
                <p id="title-error" role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>
                  ⚠️ {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-desc">
                الوصف
              </label>
              <textarea
                id="sell-desc"
                value={form.description}
                onChange={e => {
                  setForm(p => ({ ...p, description: e.target.value }));
                  setCharCount(e.target.value.length);
                }}
                placeholder="اكتب وصفاً تفصيلياً للمنتج: الحالة، المميزات، سبب البيع..."
                style={{
                  ...inputStyle('description'),
                  resize: 'vertical',
                  minHeight: 90,
                }}
                maxLength={1000}
              />
              <p style={{ textAlign: 'left', fontSize: 11, color: '#aaa', margin: '3px 0 0' }}>
                {charCount}/1000
              </p>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                الفئة <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(3, 1fr)',
                gap: 8,
              }}>
                {CATS.map(cat => (
                  <button
                    key={cat.en}
                    type="button"
                    onClick={() => {
                      setForm(p => ({ ...p, category: cat.en }));
                      if (errors.category) setErrors(p => ({ ...p, category: '' }));
                    }}
                    aria-pressed={form.category === cat.en}
                    style={{
                      padding: '10px 6px',
                      borderRadius: 10,
                      border: `2px solid ${form.category === cat.en ? '#002f34' : '#e0e0e0'}`,
                      background: form.category === cat.en ? '#002f34' : '#fafafa',
                      color: form.category === cat.en ? 'white' : '#444',
                      cursor: 'pointer',
                      fontSize: 12,
                      fontWeight: 'bold',
                      fontFamily: 'inherit',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: 3,
                      transition: 'all 0.15s',
                    }}
                  >
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <span>{cat.ar}</span>
                  </button>
                ))}
              </div>
              {errors.category && (
                <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '6px 0 0' }}>
                  ⚠️ {errors.category}
                </p>
              )}
            </div>

            {/* Condition */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>حالة المنتج</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CONDITIONS.map(c => (
                  <button
                    key={c.en}
                    type="button"
                    onClick={() => setForm(p => ({ ...p, condition: c.en }))}
                    aria-pressed={form.condition === c.en}
                    style={{
                      padding: '8px 14px',
                      borderRadius: 20,
                      border: `2px solid ${form.condition === c.en ? '#002f34' : '#e0e0e0'}`,
                      background: form.condition === c.en ? '#002f34' : '#fafafa',
                      color: form.condition === c.en ? 'white' : '#444',
                      cursor: 'pointer',
                      fontSize: 13,
                      fontWeight: 'bold',
                      fontFamily: 'inherit',
                      transition: 'all 0.15s',
                    }}
                  >
                    {c.icon} {c.ar}
                  </button>
                ))}
              </div>
            </div>

            {/* Price + Currency */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-price">السعر</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select
                  value={form.currency}
                  onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                  aria-label="العملة"
                  style={{
                    padding: '11px 10px',
                    borderRadius: 10,
                    border: '1.5px solid #e0e0e0',
                    fontSize: 14,
                    fontFamily: 'inherit',
                    background: '#fff',
                    direction: 'ltr',
                  }}
                >
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input
                  id="sell-price"
                  value={form.price}
                  onChange={e => {
                    setForm(p => ({ ...p, price: e.target.value }));
                    if (errors.price) setErrors(p => ({ ...p, price: '' }));
                  }}
                  type="number"
                  min="0"
                  placeholder="0"
                  style={{ ...inputStyle('price'), flex: 1, direction: 'ltr' }}
                  aria-describedby={errors.price ? 'price-error' : undefined}
                />
              </div>
              {errors.price && (
                <p id="price-error" role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>
                  ⚠️ {errors.price}
                </p>
              )}
            </div>

            {/* City */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-city">المدينة</label>
              <input
                id="sell-city"
                value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="مثال: القاهرة، الرياض، دبي..."
                style={inputStyle('city')}
              />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle} htmlFor="sell-phone">رقم التواصل</label>
              <input
                id="sell-phone"
                value={form.phone}
                onChange={e => {
                  setForm(p => ({ ...p, phone: e.target.value }));
                  if (errors.phone) setErrors(p => ({ ...p, phone: '' }));
                }}
                type="tel"
                placeholder="مثال: +201012345678"
                style={{ ...inputStyle('phone'), direction: 'ltr' }}
                aria-describedby={errors.phone ? 'phone-error' : undefined}
              />
              {errors.phone && (
                <p id="phone-error" role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>
                  ⚠️ {errors.phone}
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              onClick={submit}
              disabled={loading}
              aria-busy={loading}
              style={{
                width: '100%',
                padding: '14px',
                background: loading ? '#aaa' : '#002f34',
                color: 'white',
                border: 'none',
                borderRadius: 14,
                fontWeight: 'bold',
                fontSize: 17,
                cursor: loading ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 10,
                transition: 'background 0.2s',
              }}
            >
              {loading ? (
                <>
                  <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⏳</span>
                  جار النشر...
                </>
              ) : (
                <>🚀 نشر الإعلان</>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 10 }}>
              بالنشر توافق على{' '}
              <a href="/terms" style={{ color: '#002f34' }}>شروط الاستخدام</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
