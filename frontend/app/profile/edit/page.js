'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const ARAB_COUNTRY_CODES = [
  { code: '+20',  flag: '🇪🇬', name: 'مصر' },
  { code: '+966', flag: '🇸🇦', name: 'السعودية' },
  { code: '+971', flag: '🇦🇪', name: 'الإمارات' },
  { code: '+962', flag: '🇯🇴', name: 'الأردن' },
  { code: '+965', flag: '🇰🇼', name: 'الكويت' },
  { code: '+973', flag: '🇧🇭', name: 'البحرين' },
  { code: '+968', flag: '🇴🇲', name: 'عُمان' },
  { code: '+974', flag: '🇶🇦', name: 'قطر' },
  { code: '+213', flag: '🇩🇿', name: 'الجزائر' },
  { code: '+212', flag: '🇲🇦', name: 'المغرب' },
  { code: '+216', flag: '🇹🇳', name: 'تونس' },
  { code: '+218', flag: '🇱🇾', name: 'ليبيا' },
  { code: '+963', flag: '🇸🇾', name: 'سوريا' },
  { code: '+964', flag: '🇮🇶', name: 'العراق' },
  { code: '+961', flag: '🇱🇧', name: 'لبنان' },
  { code: '+967', flag: '🇾🇪', name: 'اليمن' },
  { code: '+249', flag: '🇸🇩', name: 'السودان' },
];

const MAX_BIO = 200;

function SkeletonLine({ w = '100%', h = 14, mb = 8 }) {
  return (
    <div style={{
      width: w, height: h, borderRadius: 8, marginBottom: mb,
      background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.4s infinite',
    }} />
  );
}

function LoadingSkeleton() {
  return (
    <div style={{ maxWidth: 520, margin: '0 auto', padding: 20 }}>
      <style>{`
        @keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }
        @keyframes fadeIn  { from{opacity:0;transform:translateY(-10px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(20px)} to{opacity:1;transform:translateY(0)} }
      `}</style>
      <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 24, direction: 'rtl' }}>
        <SkeletonLine w={30} h={30} mb={0} />
        <SkeletonLine w={180} h={26} mb={0} />
      </div>
      <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 24 }}>
          <div style={{ width: 100, height: 100, borderRadius: '50%', background: 'linear-gradient(90deg, #e8e8e8 25%, #f5f5f5 50%, #e8e8e8 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.4s infinite' }} />
        </div>
        {[1,2,3,4].map(i => (
          <div key={i} style={{ marginBottom: 18 }}>
            <SkeletonLine w={80} h={12} mb={6} />
            <SkeletonLine w="100%" h={42} mb={0} />
          </div>
        ))}
        <SkeletonLine w="100%" h={48} mb={0} />
      </div>
    </div>
  );
}

export default function EditProfilePage() {
  const router = useRouter();

  const [form, setForm] = useState({
    name: '', city: '', avatar: '', bio: '',
    phone: '', whatsapp: '',
    phoneCode: '+20', whatsappCode: '+20',
    showPhone: false, showWhatsapp: false,
  });
  const [errors, setErrors]     = useState({});
  const [loading, setLoading]   = useState(false);
  const [fetching, setFetching] = useState(true);
  const [toast, setToast]       = useState(null); // { msg, type }
  const [token, setToken]       = useState('');
  const fileInputRef            = useRef(null);

  /* ── boot: load token + profile ── */
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('token');
    if (!t) { router.replace('/login'); return; }
    setToken(t);

    // Optimistic fill from localStorage
    const cached = JSON.parse(localStorage.getItem('user') || '{}');
    if (cached) hydrateForm(cached);

    // Then fetch fresh data from server
    fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${t}` } })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data) { hydrateForm(data); localStorage.setItem('user', JSON.stringify(data)); } })
      .catch(() => {})
      .finally(() => setFetching(false));
  }, []);

  function hydrateForm(u) {
    // Split stored phone into code+number if it starts with +
    function splitPhone(raw = '') {
      const match = ARAB_COUNTRY_CODES.find(c => raw.startsWith(c.code));
      return match
        ? { code: match.code, number: raw.slice(match.code.length).trim() }
        : { code: '+20', number: raw.replace(/^\+?20/, '').trim() || raw };
    }
    const ph  = splitPhone(u.phone    || '');
    const wa  = splitPhone(u.whatsapp || '');
    setForm(f => ({
      ...f,
      name:         u.name        || '',
      city:         u.city        || '',
      avatar:       u.avatar      || '',
      bio:          u.bio         || '',
      phone:        ph.number,
      whatsapp:     wa.number,
      phoneCode:    ph.code,
      whatsappCode: wa.code,
      showPhone:    !!u.showPhone,
      showWhatsapp: !!u.showWhatsapp,
    }));
  }

  /* ── avatar upload ── */
  function uploadAvatar(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      showToast('حجم الصورة يجب أن يكون أقل من 5 ميجابايت', 'error');
      return;
    }
    const reader = new FileReader();
    reader.onload = ev => setForm(f => ({ ...f, avatar: ev.target.result }));
    reader.readAsDataURL(file);
  }

  /* ── validation ── */
  function validate() {
    const errs = {};
    if (!form.name.trim()) errs.name = 'الاسم مطلوب';
    else if (form.name.trim().length < 2) errs.name = 'الاسم يجب أن يكون حرفين على الأقل';

    const phoneDigits = form.phone.replace(/\D/g, '');
    if (form.phone && (phoneDigits.length < 7 || phoneDigits.length > 15))
      errs.phone = 'رقم الهاتف غير صحيح';

    const waDigits = form.whatsapp.replace(/\D/g, '');
    if (form.whatsapp && (waDigits.length < 7 || waDigits.length > 15))
      errs.whatsapp = 'رقم واتساب غير صحيح';

    if (form.bio.length > MAX_BIO)
      errs.bio = `النبذة يجب ألا تتجاوز ${MAX_BIO} حرف`;

    setErrors(errs);
    return Object.keys(errs).length === 0;
  }

  /* ── save ── */
  async function save() {
    if (!validate()) return;
    setLoading(true);
    try {
      const payload = {
        name:         form.name.trim(),
        city:         form.city.trim(),
        avatar:       form.avatar,
        bio:          form.bio.trim(),
        phone:        form.phone    ? `${form.phoneCode}${form.phone.replace(/^0/, '')}`    : '',
        whatsapp:     form.whatsapp ? `${form.whatsappCode}${form.whatsapp.replace(/^0/, '')}` : '',
        showPhone:    form.showPhone,
        showWhatsapp: form.showWhatsapp,
      };
      const res = await fetch(`${API}/api/users/me`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.error || `خطأ ${res.status}`);
      }
      const updated = await res.json();
      localStorage.setItem('user', JSON.stringify(updated));
      showToast('تم حفظ التغييرات بنجاح ✓', 'success');
    } catch (e) {
      showToast(e.message || 'حدث خطأ أثناء الحفظ', 'error');
    } finally {
      setLoading(false);
    }
  }

  function showToast(msg, type = 'success') {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 4000);
  }

  function field(key) {
    return { value: form[key], onChange: e => { setForm(f => ({ ...f, [key]: e.target.value })); setErrors(er => ({ ...er, [key]: '' })); } };
  }

  /* ── styles ── */
  const inputStyle = (hasErr) => ({
    width: '100%', padding: '11px 14px', borderRadius: 10, fontSize: 14,
    border: `1.5px solid ${hasErr ? '#e53e3e' : '#ddd'}`,
    boxSizing: 'border-box', fontFamily: 'inherit', direction: 'rtl',
    outline: 'none', transition: 'border-color .2s',
  });
  const labelStyle = { display: 'block', fontWeight: '700', marginBottom: 6, fontSize: 14, color: '#222' };
  const errStyle   = { color: '#e53e3e', fontSize: 12, marginTop: 4 };

  /* ── loading skeleton ── */
  if (fetching) return <LoadingSkeleton />;

  /* ── render ── */
  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
        @keyframes fadeIn  { from{opacity:0;transform:translateY(-14px)} to{opacity:1;transform:translateY(0)} }
        @keyframes slideUp { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
        @keyframes spin    { to { transform: rotate(360deg); } }
        .edit-input:focus { border-color: #002f34 !important; box-shadow: 0 0 0 3px rgba(0,47,52,.12); }
        .edit-btn:hover:not(:disabled) { background: #004d54 !important; transform: translateY(-1px); }
        .edit-btn:active:not(:disabled){ transform: translateY(0); }
        .save-btn-inner { display:flex; align-items:center; justify-content:center; gap:8px; }
        .spinner { width:18px;height:18px;border:3px solid rgba(255,255,255,.4);border-top-color:#fff;border-radius:50%;animation:spin .7s linear infinite; }
        .toggle-row { display:flex; align-items:center; gap:10px; cursor:pointer; user-select:none; }
        .toggle-checkbox { width:18px; height:18px; accent-color:#002f34; cursor:pointer; flex-shrink:0; }
      `}</style>

      {/* Toast */}
      {toast && (
        <div role="alert" aria-live="assertive" style={{
          position: 'fixed', top: 20, left: '50%', transform: 'translateX(-50%)',
          background: toast.type === 'success' ? '#00aa55' : '#e53e3e',
          color: 'white', padding: '12px 24px', borderRadius: 50,
          fontWeight: '700', fontSize: 14, zIndex: 9999, boxShadow: '0 4px 20px rgba(0,0,0,.2)',
          animation: 'fadeIn .3s ease', whiteSpace: 'nowrap',
          fontFamily: "'Noto Sans Arabic', 'Cairo', system-ui, sans-serif",
        }}>
          {toast.msg}
        </div>
      )}

      <div dir="rtl" style={{
        maxWidth: 520, margin: '0 auto', padding: '20px 16px',
        fontFamily: "'Noto Sans Arabic', 'Cairo', 'Tajawal', system-ui, sans-serif",
        minHeight: '100vh', background: '#f0f2f5',
        animation: 'slideUp .35s ease',
      }}>

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 20 }}>
          <button
            onClick={() => router.back()}
            aria-label="الرجوع للملف الشخصي"
            style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 22, cursor: 'pointer', padding: 4, lineHeight: 1 }}>
            →
          </button>
          <h1 style={{ color: '#002f34', margin: 0, fontSize: 22, fontWeight: '700' }}>تعديل الملف الشخصي</h1>
        </div>

        {/* Card */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', marginBottom: 16 }}>

          {/* ── Avatar ── */}
          <div style={{ textAlign: 'center', marginBottom: 28 }}>
            <label htmlFor="avatar-upload" style={{ cursor: 'pointer', display: 'inline-block', position: 'relative' }}
              aria-label="تغيير صورة الملف الشخصي">
              {form.avatar ? (
                <img src={form.avatar}
                  style={{ width: 104, height: 104, borderRadius: '50%', objectFit: 'cover', border: '3px solid #002f34', display: 'block' }}
                  alt="صورة الملف الشخصي" />
              ) : (
                <div style={{ width: 104, height: 104, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 42, color: 'white' }}>
                  {form.name?.[0]?.toUpperCase() || '؟'}
                </div>
              )}
              {/* Camera overlay */}
              <div style={{
                position: 'absolute', bottom: 2, left: '50%', transform: 'translateX(-50%)',
                background: '#002f34', color: 'white', borderRadius: 20,
                padding: '3px 10px', fontSize: 11, fontWeight: '600', whiteSpace: 'nowrap',
                boxShadow: '0 2px 6px rgba(0,0,0,.25)',
              }}>
                📷 تغيير
              </div>
              <input ref={fileInputRef} id="avatar-upload" type="file" accept="image/*"
                style={{ display: 'none' }} onChange={uploadAvatar} />
            </label>
          </div>

          {/* ── Name ── */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="field-name" style={labelStyle}>الاسم الكامل <span style={{ color: '#e53e3e' }}>*</span></label>
            <input id="field-name" className="edit-input" {...field('name')} type="text"
              placeholder="اسمك الكامل" autoComplete="name"
              aria-label="الاسم الكامل" aria-required="true"
              aria-invalid={!!errors.name} style={inputStyle(errors.name)} />
            {errors.name && <p role="alert" style={errStyle}>⚠ {errors.name}</p>}
          </div>

          {/* ── City ── */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="field-city" style={labelStyle}>المدينة</label>
            <input id="field-city" className="edit-input" {...field('city')} type="text"
              placeholder="مثال: القاهرة، الرياض، دبي"
              aria-label="المدينة" style={inputStyle(false)} />
          </div>

          {/* ── Bio ── */}
          <div style={{ marginBottom: 18 }}>
            <label htmlFor="field-bio" style={labelStyle}>نبذة عنك</label>
            <textarea id="field-bio" className="edit-input" {...field('bio')}
              placeholder="أخبر المشترين عن نفسك وعن نشاطك التجاري..."
              rows={3} maxLength={MAX_BIO}
              aria-label="نبذة شخصية" aria-describedby="bio-counter"
              style={{ ...inputStyle(errors.bio), resize: 'vertical', lineHeight: 1.6 }} />
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
              {errors.bio
                ? <p role="alert" style={errStyle}>⚠ {errors.bio}</p>
                : <span />}
              <span id="bio-counter" style={{
                fontSize: 12, color: form.bio.length > MAX_BIO * 0.85 ? '#e53e3e' : '#999',
                fontVariantNumeric: 'tabular-nums',
              }}>
                {form.bio.length} / {MAX_BIO} حرف
              </span>
            </div>
          </div>
        </div>

        {/* ── Contact Info Card ── */}
        <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 12px rgba(0,0,0,0.09)', marginBottom: 16 }}>
          <h2 style={{ margin: '0 0 4px', color: '#002f34', fontSize: 17, fontWeight: '700' }}>📞 معلومات التواصل</h2>
          <p style={{ color: '#777', fontSize: 13, margin: '0 0 20px' }}>اختر ما تريد إظهاره للمشترين</p>

          {/* Phone */}
          <div style={{ marginBottom: 20 }}>
            <label htmlFor="field-phone" style={labelStyle}>رقم الهاتف</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={form.phoneCode}
                onChange={e => setForm(f => ({ ...f, phoneCode: e.target.value }))}
                aria-label="رمز دولة الهاتف"
                style={{ padding: '11px 8px', borderRadius: 10, border: '1.5px solid #ddd', fontSize: 13, background: 'white', cursor: 'pointer', flexShrink: 0, direction: 'rtl', fontFamily: 'inherit' }}>
                {ARAB_COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>
                ))}
              </select>
              <input id="field-phone" className="edit-input"
                value={form.phone}
                onChange={e => { setForm(f => ({ ...f, phone: e.target.value })); setErrors(er => ({ ...er, phone: '' })); }}
                type="tel" placeholder="1234567890"
                aria-label="رقم الهاتف" aria-invalid={!!errors.phone}
                style={{ ...inputStyle(errors.phone), flex: 1 }} />
            </div>
            {errors.phone && <p role="alert" style={errStyle}>⚠ {errors.phone}</p>}
            <label className="toggle-row" style={{ marginTop: 10 }}>
              <input className="toggle-checkbox" type="checkbox"
                checked={form.showPhone}
                onChange={e => setForm(f => ({ ...f, showPhone: e.target.checked }))}
                aria-label="إظهار رقم هاتفي للمشترين" />
              <span style={{ fontSize: 13, color: '#444' }}>إظهار رقم هاتفي للمشترين</span>
            </label>
          </div>

          {/* WhatsApp */}
          <div>
            <label htmlFor="field-whatsapp" style={labelStyle}>رقم واتساب</label>
            <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
              <select
                value={form.whatsappCode}
                onChange={e => setForm(f => ({ ...f, whatsappCode: e.target.value }))}
                aria-label="رمز دولة واتساب"
                style={{ padding: '11px 8px', borderRadius: 10, border: '1.5px solid #ddd', fontSize: 13, background: 'white', cursor: 'pointer', flexShrink: 0, direction: 'rtl', fontFamily: 'inherit' }}>
                {ARAB_COUNTRY_CODES.map(c => (
                  <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.code})</option>
                ))}
              </select>
              <input id="field-whatsapp" className="edit-input"
                value={form.whatsapp}
                onChange={e => { setForm(f => ({ ...f, whatsapp: e.target.value })); setErrors(er => ({ ...er, whatsapp: '' })); }}
                type="tel" placeholder="1234567890"
                aria-label="رقم واتساب" aria-invalid={!!errors.whatsapp}
                style={{ ...inputStyle(errors.whatsapp), flex: 1 }} />
            </div>
            {errors.whatsapp && <p role="alert" style={errStyle}>⚠ {errors.whatsapp}</p>}
            <label className="toggle-row" style={{ marginTop: 10 }}>
              <input className="toggle-checkbox" type="checkbox"
                checked={form.showWhatsapp}
                onChange={e => setForm(f => ({ ...f, showWhatsapp: e.target.checked }))}
                aria-label="إظهار واتساب للمشترين" />
              <span style={{ fontSize: 13, color: '#444' }}>إظهار واتساب للمشترين</span>
            </label>
          </div>
        </div>

        {/* ── Save Button ── */}
        <button
          className="edit-btn"
          onClick={save}
          disabled={loading}
          aria-label="حفظ التغييرات"
          aria-busy={loading}
          style={{
            width: '100%', padding: '15px', background: '#002f34',
            color: 'white', border: 'none', borderRadius: 16,
            fontWeight: '700', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer',
            fontFamily: 'inherit', opacity: loading ? 0.8 : 1,
            transition: 'background .2s, transform .15s, opacity .2s',
            boxShadow: '0 4px 16px rgba(0,47,52,.3)',
          }}>
          <span className="save-btn-inner">
            {loading ? <span className="spinner" /> : null}
            {loading ? 'جار الحفظ...' : '💾 حفظ التغييرات'}
          </span>
        </button>

        <p style={{ textAlign: 'center', color: '#aaa', fontSize: 12, marginTop: 12 }}>
          بياناتك محمية ولن تُشارك مع أي طرف ثالث
        </p>
      </div>
    </>
  );
}
