'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const TRANSLATIONS = {
  ar: {
    title: 'XTOX',
    subtitle: 'إنشاء حساب جديد',
    tagline: 'انضم إلى مجتمع المتداولين',
    name: 'الاسم الكامل',
    namePlaceholder: 'أدخل اسمك الكامل',
    email: 'البريد الإلكتروني',
    emailPlaceholder: 'أدخل بريدك الإلكتروني',
    phone: 'رقم الهاتف (اختياري)',
    phonePlaceholder: 'أدخل رقم هاتفك',
    password: 'كلمة المرور',
    passwordPlaceholder: 'أدخل كلمة المرور',
    confirmPassword: 'تأكيد كلمة المرور',
    confirmPasswordPlaceholder: 'أعد إدخال كلمة المرور',
    country: 'الدولة',
    countryPlaceholder: 'اختر دولتك',
    register: 'إنشاء الحساب',
    registering: 'جارٍ التسجيل...',
    haveAccount: 'لديك حساب بالفعل؟',
    signIn: 'تسجيل الدخول',
    passwordStrength: 'قوة كلمة المرور',
    weak: 'ضعيفة',
    medium: 'متوسطة',
    strong: 'قوية',
    errors: {
      nameRequired: 'الاسم مطلوب',
      emailRequired: 'البريد الإلكتروني مطلوب',
      emailInvalid: 'البريد الإلكتروني غير صالح',
      passwordRequired: 'كلمة المرور مطلوبة',
      passwordMin: 'كلمة المرور يجب أن تكون 8 أحرف على الأقل',
      confirmRequired: 'تأكيد كلمة المرور مطلوب',
      passwordMismatch: 'كلمتا المرور غير متطابقتين',
      countryRequired: 'الدولة مطلوبة',
    },
    success: 'تم التسجيل بنجاح! جارٍ التوجيه...',
    errorGeneric: 'حدث خطأ أثناء التسجيل. حاول مرة أخرى.',
  },
  en: {
    title: 'XTOX',
    subtitle: 'Create New Account',
    tagline: 'Join the trading community',
    name: 'Full Name',
    namePlaceholder: 'Enter your full name',
    email: 'Email Address',
    emailPlaceholder: 'Enter your email',
    phone: 'Phone Number (optional)',
    phonePlaceholder: 'Enter your phone number',
    password: 'Password',
    passwordPlaceholder: 'Enter your password',
    confirmPassword: 'Confirm Password',
    confirmPasswordPlaceholder: 'Re-enter your password',
    country: 'Country',
    countryPlaceholder: 'Select your country',
    register: 'Create Account',
    registering: 'Registering...',
    haveAccount: 'Already have an account?',
    signIn: 'Sign In',
    passwordStrength: 'Password Strength',
    weak: 'Weak',
    medium: 'Medium',
    strong: 'Strong',
    errors: {
      nameRequired: 'Name is required',
      emailRequired: 'Email is required',
      emailInvalid: 'Invalid email address',
      passwordRequired: 'Password is required',
      passwordMin: 'Password must be at least 8 characters',
      confirmRequired: 'Please confirm your password',
      passwordMismatch: 'Passwords do not match',
      countryRequired: 'Country is required',
    },
    success: 'Registration successful! Redirecting...',
    errorGeneric: 'An error occurred during registration. Please try again.',
  },
};

const COUNTRIES = [
  { code: 'EG', flag: '🇪🇬', ar: 'مصر', en: 'Egypt' },
  { code: 'SA', flag: '🇸🇦', ar: 'المملكة العربية السعودية', en: 'Saudi Arabia' },
  { code: 'AE', flag: '🇦🇪', ar: 'الإمارات العربية المتحدة', en: 'UAE' },
  { code: 'JO', flag: '🇯🇴', ar: 'الأردن', en: 'Jordan' },
  { code: 'LB', flag: '🇱🇧', ar: 'لبنان', en: 'Lebanon' },
  { code: 'IQ', flag: '🇮🇶', ar: 'العراق', en: 'Iraq' },
  { code: 'MA', flag: '🇲🇦', ar: 'المغرب', en: 'Morocco' },
  { code: 'DZ', flag: '🇩🇿', ar: 'الجزائر', en: 'Algeria' },
  { code: 'TN', flag: '🇹🇳', ar: 'تونس', en: 'Tunisia' },
  { code: 'LY', flag: '🇱🇾', ar: 'ليبيا', en: 'Libya' },
  { code: 'SD', flag: '🇸🇩', ar: 'السودان', en: 'Sudan' },
  { code: 'DE', flag: '🇩🇪', ar: 'ألمانيا', en: 'Germany' },
];

function getPasswordStrength(password) {
  if (!password) return 0;
  let score = 0;
  if (password.length >= 8) score++;
  if (password.length >= 12) score++;
  if (/[A-Z]/.test(password)) score++;
  if (/[0-9]/.test(password)) score++;
  if (/[^A-Za-z0-9]/.test(password)) score++;
  if (score <= 2) return 1;
  if (score <= 3) return 2;
  return 3;
}

export default function RegisterPage() {
  const router = useRouter();
  const [lang, setLang] = useState('ar');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    confirmPassword: '',
    country: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState({ message: '', type: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const t = TRANSLATIONS[lang];
  const isRtl = lang === 'ar';
  const passwordStrength = getPasswordStrength(form.password);

  useEffect(() => {
    const savedLang = localStorage.getItem('xtox_lang');
    if (savedLang === 'en' || savedLang === 'ar') {
      setLang(savedLang);
    }
  }, []);

  const toggleLang = () => {
    const newLang = lang === 'ar' ? 'en' : 'ar';
    setLang(newLang);
    localStorage.setItem('xtox_lang', newLang);
  };

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    setErrors({ ...errors, [e.target.name]: '' });
  };

  const validate = () => {
    const newErrors = {};
    if (!form.name.trim()) newErrors.name = t.errors.nameRequired;
    if (!form.email.trim()) {
      newErrors.email = t.errors.emailRequired;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email)) {
      newErrors.email = t.errors.emailInvalid;
    }
    if (!form.password) {
      newErrors.password = t.errors.passwordRequired;
    } else if (form.password.length < 8) {
      newErrors.password = t.errors.passwordMin;
    }
    if (!form.confirmPassword) {
      newErrors.confirmPassword = t.errors.confirmRequired;
    } else if (form.password !== form.confirmPassword) {
      newErrors.confirmPassword = t.errors.passwordMismatch;
    }
    if (!form.country) newErrors.country = t.errors.countryRequired;
    return newErrors;
  };

  const showToast = (message, type) => {
    setToast({ message, type });
    setTimeout(() => setToast({ message: '', type: '' }), 4000);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationErrors = validate();
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_BASE}/api/users/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          phone: form.phone,
          password: form.password,
          country: form.country,
        }),
      });
      const data = await res.json();
      if (res.ok && data.token) {
        localStorage.setItem('xtox_token', data.token);
        showToast(t.success, 'success');
        setTimeout(() => router.push('/'), 1500);
      } else {
        showToast(data.message || t.errorGeneric, 'error');
      }
    } catch (err) {
      showToast(t.errorGeneric, 'error');
    } finally {
      setLoading(false);
    }
  };

  const strengthLabel = () => {
    if (passwordStrength === 1) return t.weak;
    if (passwordStrength === 2) return t.medium;
    if (passwordStrength === 3) return t.strong;
    return '';
  };

  const strengthColor = () => {
    if (passwordStrength === 1) return '#ef4444';
    if (passwordStrength === 2) return '#f59e0b';
    if (passwordStrength === 3) return '#22c55e';
    return '#374151';
  };

  return (
    <>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;800&display=swap');
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: ${isRtl ? "'Cairo', sans-serif" : "system-ui, sans-serif"}; }
        .register-input {
          width: 100%;
          padding: 12px 16px;
          background: rgba(255,255,255,0.07);
          border: 1px solid rgba(255,255,255,0.15);
          border-radius: 10px;
          color: #fff;
          font-size: 16px;
          font-family: inherit;
          outline: none;
          transition: border-color 0.2s, background 0.2s;
        }
        .register-input:focus {
          border-color: rgba(167,139,250,0.7);
          background: rgba(255,255,255,0.12);
        }
        .register-input::placeholder { color: rgba(255,255,255,0.4); }
        .register-input option { background: #2d1060; color: #fff; }
        .input-error { border-color: #f87171 !important; }
        .error-text { color: #fca5a5; font-size: 12px; margin-top: 4px; }
        .submit-btn {
          width: 100%;
          padding: 14px;
          background: linear-gradient(135deg, #7c3aed, #6b21a8);
          color: #fff;
          border: none;
          border-radius: 12px;
          font-size: 16px;
          font-weight: 700;
          font-family: inherit;
          cursor: pointer;
          transition: transform 0.15s, box-shadow 0.15s;
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
        }
        .submit-btn:hover:not(:disabled) {
          transform: scale(1.02);
          box-shadow: 0 8px 25px rgba(124,58,237,0.5);
        }
        .submit-btn:disabled { opacity: 0.7; cursor: not-allowed; transform: none; }
        .toast {
          position: fixed;
          top: 24px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 9999;
          padding: 14px 28px;
          border-radius: 12px;
          font-weight: 600;
          font-size: 14px;
          max-width: 90vw;
          text-align: center;
          animation: fadeIn 0.3s ease;
        }
        .toast-success { background: #065f46; color: #6ee7b7; border: 1px solid #34d399; }
        .toast-error { background: #7f1d1d; color: #fca5a5; border: 1px solid #f87171; }
        @keyframes fadeIn { from { opacity:0; transform: translateX(-50%) translateY(-10px); } to { opacity:1; transform: translateX(-50%) translateY(0); } }
        .lang-btn {
          padding: 6px 14px;
          background: rgba(255,255,255,0.1);
          border: 1px solid rgba(255,255,255,0.2);
          border-radius: 20px;
          color: #fff;
          font-size: 13px;
          font-weight: 600;
          cursor: pointer;
          font-family: inherit;
          transition: background 0.2s;
        }
        .lang-btn:hover { background: rgba(255,255,255,0.2); }
        .strength-bar-bg {
          width: 100%;
          height: 6px;
          background: rgba(255,255,255,0.1);
          border-radius: 3px;
          margin-top: 8px;
          overflow: hidden;
        }
        .strength-bar-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 0.3s, background 0.3s;
        }
        .eye-btn {
          position: absolute;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: rgba(255,255,255,0.5);
          font-size: 18px;
          padding: 4px 8px;
          transition: color 0.2s;
        }
        .eye-btn:hover { color: rgba(255,255,255,0.9); }
        .input-wrapper { position: relative; }
        .field-group { margin-bottom: 16px; }
        .field-label {
          display: block;
          color: rgba(255,255,255,0.75);
          font-size: 13px;
          font-weight: 600;
          margin-bottom: 6px;
        }
        .spinner {
          width: 18px; height: 18px;
          border: 2px solid rgba(255,255,255,0.3);
          border-top-color: #fff;
          border-radius: 50%;
          animation: spin 0.7s linear infinite;
          display: inline-block;
        }
        @keyframes spin { to { transform: rotate(360deg); } }
        .glass-card {
          background: rgba(255,255,255,0.07);
          backdrop-filter: blur(20px);
          -webkit-backdrop-filter: blur(20px);
          border: 1px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          box-shadow: 0 20px 60px rgba(0,0,0,0.4);
        }
        .scrollable-form {
          max-height: 90vh;
          overflow-y: auto;
          padding: 32px;
          scrollbar-width: thin;
          scrollbar-color: rgba(255,255,255,0.2) transparent;
        }
        .scrollable-form::-webkit-scrollbar { width: 4px; }
        .scrollable-form::-webkit-scrollbar-track { background: transparent; }
        .scrollable-form::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.2); border-radius: 2px; }
      `}</style>

      {toast.message && (
        <div className={`toast ${toast.type === 'success' ? 'toast-success' : 'toast-error'}`}>
          {toast.message}
        </div>
      )}

      <div
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          minHeight: '100vh',
          background: 'linear-gradient(135deg, #6B21A8 0%, #3B0764 50%, #1e0336 100%)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '24px 16px',
          fontFamily: isRtl ? "'Cairo', sans-serif" : 'system-ui, sans-serif',
          position: 'relative',
          overflow: 'hidden',
        }}
      >
        {/* Background blobs */}
        <div style={{
          position: 'absolute', top: '-10%', right: '-5%', width: '400px', height: '400px',
          background: 'radial-gradient(circle, rgba(139,92,246,0.25) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: '-10%', left: '-5%', width: '350px', height: '350px',
          background: 'radial-gradient(circle, rgba(109,40,217,0.2) 0%, transparent 70%)',
          borderRadius: '50%', pointerEvents: 'none',
        }} />

        <div className="glass-card" style={{ width: '100%', maxWidth: '480px' }}>
          <div className="scrollable-form">
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '28px' }}>
              <button className="lang-btn" onClick={toggleLang}>
                {lang === 'ar' ? 'EN' : 'عربي'}
              </button>
              <div style={{ textAlign: 'center', flex: 1 }}>
                <div style={{ fontSize: '42px', lineHeight: 1 }}>🦊</div>
                <div style={{ color: '#fff', fontSize: '22px', fontWeight: '800', letterSpacing: '2px', marginTop: '4px' }}>
                  {t.title}
                </div>
              </div>
              <div style={{ width: '60px' }} />
            </div>

            <div style={{ textAlign: 'center', marginBottom: '28px' }}>
              <h1 style={{ color: '#fff', fontSize: '20px', fontWeight: '700', marginBottom: '4px' }}>
                {t.subtitle}
              </h1>
              <p style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>{t.tagline}</p>
            </div>

            <form onSubmit={handleSubmit} noValidate>
              {/* Name */}
              <div className="field-group">
                <label className="field-label">{t.name}</label>
                <input
                  className={`register-input${errors.name ? ' input-error' : ''}`}
                  type="text"
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder={t.namePlaceholder}
                  autoComplete="name"
                />
                {errors.name && <div className="error-text">{errors.name}</div>}
              </div>

              {/* Email */}
              <div className="field-group">
                <label className="field-label">{t.email}</label>
                <input
                  className={`register-input${errors.email ? ' input-error' : ''}`}
                  type="email"
                  name="email"
                  value={form.email}
                  onChange={handleChange}
                  placeholder={t.emailPlaceholder}
                  autoComplete="email"
                  dir="ltr"
                />
                {errors.email && <div className="error-text">{errors.email}</div>}
              </div>

              {/* Phone */}
              <div className="field-group">
                <label className="field-label">{t.phone}</label>
                <input
                  className="register-input"
                  type="tel"
                  name="phone"
                  value={form.phone}
                  onChange={handleChange}
                  placeholder={t.phonePlaceholder}
                  autoComplete="tel"
                  dir="ltr"
                />
              </div>

              {/* Country */}
              <div className="field-group">
                <label className="field-label">{t.country}</label>
                <select
                  className={`register-input${errors.country ? ' input-error' : ''}`}
                  name="country"
                  value={form.country}
                  onChange={handleChange}
                >
                  <option value="">{t.countryPlaceholder}</option>
                  {COUNTRIES.map((c) => (
                    <option key={c.code} value={c.code}>
                      {c.flag} {isRtl ? c.ar : c.en}
                    </option>
                  ))}
                </select>
                {errors.country && <div className="error-text">{errors.country}</div>}
              </div>

              {/* Password */}
              <div className="field-group">
                <label className="field-label">{t.password}</label>
                <div className="input-wrapper">
                  <input
                    className={`register-input${errors.password ? ' input-error' : ''}`}
                    type={showPassword ? 'text' : 'password'}
                    name="password"
                    value={form.password}
                    onChange={handleChange}
                    placeholder={t.passwordPlaceholder}
                    autoComplete="new-password"
                    style={{ paddingRight: isRtl ? '16px' : '44px', paddingLeft: isRtl ? '44px' : '16px' }}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    style={{ [isRtl ? 'left' : 'right']: '4px' }}
                    onClick={() => setShowPassword(!showPassword)}
                    tabIndex={-1}
                  >
                    {showPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.password && <div className="error-text">{errors.password}</div>}
                {form.password && (
                  <div style={{ marginTop: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>{t.passwordStrength}</span>
                      <span style={{ color: strengthColor(), fontSize: '11px', fontWeight: '700' }}>
                        {strengthLabel()}
                      </span>
                    </div>
                    <div className="strength-bar-bg">
                      <div
                        className="strength-bar-fill"
                        style={{
                          width: `${(passwordStrength / 3) * 100}%`,
                          background: strengthColor(),
                        }}
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="field-group">
                <label className="field-label">{t.confirmPassword}</label>
                <div className="input-wrapper">
                  <input
                    className={`register-input${errors.confirmPassword ? ' input-error' : ''}`}
                    type={showConfirmPassword ? 'text' : 'password'}
                    name="confirmPassword"
                    value={form.confirmPassword}
                    onChange={handleChange}
                    placeholder={t.confirmPasswordPlaceholder}
                    autoComplete="new-password"
                    style={{ paddingRight: isRtl ? '16px' : '44px', paddingLeft: isRtl ? '44px' : '16px' }}
                    dir="ltr"
                  />
                  <button
                    type="button"
                    className="eye-btn"
                    style={{ [isRtl ? 'left' : 'right']: '4px' }}
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    tabIndex={-1}
                  >
                    {showConfirmPassword ? '🙈' : '👁️'}
                  </button>
                </div>
                {errors.confirmPassword && <div className="error-text">{errors.confirmPassword}</div>}
              </div>

              {/* Submit */}
              <div style={{ marginTop: '24px' }}>
                <button type="submit" className="submit-btn" disabled={loading}>
                  {loading ? (
                    <>
                      <span className="spinner" />
                      {t.registering}
                    </>
                  ) : (
                    t.register
                  )}
                </button>
              </div>

              {/* Sign in link */}
              <div style={{ textAlign: 'center', marginTop: '20px' }}>
                <span style={{ color: 'rgba(255,255,255,0.55)', fontSize: '14px' }}>
                  {t.haveAccount}{' '}
                </span>
                <a
                  href="/login"
                  style={{
                    color: '#a78bfa',
                    textDecoration: 'none',
                    fontWeight: '700',
                    fontSize: '14px',
                    transition: 'color 0.2s',
                  }}
                  onMouseEnter={(e) => (e.target.style.color = '#c4b5fd')}
                  onMouseLeave={(e) => (e.target.style.color = '#a78bfa')}
                >
                  {t.signIn}
                </a>
              </div>
            </form>
          </div>
        </div>
      </div>
    </>
  );
}
