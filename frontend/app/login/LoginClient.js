'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox.up.railway.app';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

/* ── RTL-first Arabic Login Page ── */
export default function LoginPage() {
  const [error,      setError]      = useState('');
  const [success,    setSuccess]    = useState('');
  const [loading,    setLoading]    = useState(false);
  const [tab,        setTab]        = useState('main');
  const [phone,      setPhone]      = useState('');
  const [otp,        setOtp]        = useState('');
  const [otpSent,    setOtpSent]    = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showEmail,  setShowEmail]  = useState(false);
  const [email,      setEmail]      = useState('');
  const [password,   setPassword]   = useState('');
  const [googleReady,setGoogleReady]= useState(false);
  const [resendTimer,setResendTimer]= useState(0);

  /* ── countdown timer for OTP resend ── */
  useEffect(() => {
    if (resendTimer <= 0) return;
    const t = setTimeout(() => setResendTimer(s => s - 1), 1000);
    return () => clearTimeout(t);
  }, [resendTimer]);

  /* ── load Google SDK + check auth ── */
  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        window.location.href =
          (user.role === 'admin' || user.role === 'sub_admin') ? '/admin' : '/';
        return;
      }

      /* Google OAuth hash callback */
      const hash = window.location.hash || '';
      if (hash.includes('id_token=')) {
        setLoading(true);
        setSuccess('جارٍ التحقق من حساب Google...');
        const params = new URLSearchParams(hash.replace('#', ''));
        const idToken = params.get('id_token');
        if (idToken) {
          const country = localStorage.getItem('detectedCountry') || 'EG';
          fetch(`${API}/api/users/auth/google`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ idToken, country })
          })
            .then(r => r.json())
            .then(data => {
              if (data.token) { saveAndRedirect(data); }
              else {
                setError(data.error || 'فشل تسجيل الدخول بـ Google');
                setLoading(false);
                window.history.replaceState(null, '', '/login');
              }
            })
            .catch(() => { setError('فشل الاتصال بالخادم'); setLoading(false); });
        }
        return;
      }

      /* Google Identity Services */
      if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
        const initGoogle = () => {
          if (!window.google) return;
          try {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: (response) => {
                setLoading(true);
                setSuccess('جارٍ التحقق من حساب Google...');
                const country = localStorage.getItem('detectedCountry') || 'EG';
                fetch(`${API}/api/users/auth/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idToken: response.credential, country })
                })
                  .then(r => r.json())
                  .then(data => {
                    if (data.token) saveAndRedirect(data);
                    else { setError(data.error || 'فشل التحقق'); setLoading(false); }
                  })
                  .catch(() => { setError('فشل الاتصال بالخادم'); setLoading(false); });
              },
              auto_select: false,
              cancel_on_tap_outside: true
            });
            setGoogleReady(true);
          } catch (e) { console.warn('Google init:', e.message); }
        };

        if (window.google) { initGoogle(); }
        else {
          const script = document.createElement('script');
          script.src = 'https://accounts.google.com/gsi/client';
          script.async = true; script.defer = true;
          script.onload = initGoogle;
          document.head.appendChild(script);
        }
      }

      /* Detect country */
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => { if (d.country_code) localStorage.setItem('detectedCountry', d.country_code); })
        .catch(() => {});
    } catch {}
  }, []);

  /* ── helpers ── */
  function saveAndRedirect(data) {
    try {
      localStorage.setItem('token',   data.token);
      localStorage.setItem('userId',  data.user?.id || '');
      localStorage.setItem('user',    JSON.stringify(data.user || {}));
      localStorage.setItem('country', data.user?.country || 'EG');
      if (data.user?.role === 'admin' || data.user?.role === 'sub_admin') {
        localStorage.setItem('xtox_admin_token', data.token);
        localStorage.setItem('xtox_admin_user', JSON.stringify(data.user || {}));
      }
      setSuccess('تم تسجيل الدخول بنجاح! جارٍ التحويل...');
      setTimeout(() => {
        window.location.href =
          (data.user?.role === 'admin' || data.user?.role === 'sub_admin') ? '/admin' : '/';
      }, 1000);
    } catch (e) { setError('خطأ: ' + e.message); }
  }

  function loginWithGoogle() {
    if (!GOOGLE_CLIENT_ID) { setError('تسجيل الدخول بـ Google غير مفعّل'); return; }
    try {
      if (window.google && googleReady) {
        window.google.accounts.id.prompt();
        return;
      }
      const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const params = new URLSearchParams({
        client_id:     GOOGLE_CLIENT_ID,
        redirect_uri:  window.location.origin + '/login',
        response_type: 'id_token',
        scope:         'email profile openid',
        nonce,
        prompt:        'select_account'
      });
      window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
    } catch (e) { setError('خطأ: ' + e.message); }
  }

  async function loginWithEmail() {
    setError('');
    if (!email.trim())    { setError('يرجى إدخال البريد الإلكتروني'); return; }
    if (!password.trim()) { setError('يرجى إدخال كلمة المرور');       return; }
    setLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/login`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'البريد أو كلمة المرور غير صحيحة');
      saveAndRedirect(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function sendOTP() {
    setError(''); setSuccess('');
    if (!phone.trim()) {
      setError('يرجى إدخال رقم الواتساب مع رمز الدولة، مثال: +966501234567');
      return;
    }
    const cleaned = phone.trim();
    if (!/^\+\d{7,15}$/.test(cleaned)) {
      setError('صيغة الرقم غير صحيحة — يجب أن يبدأ بـ + ثم أرقام فقط');
      return;
    }
    setOtpLoading(true);
    try {
      const res  = await fetch(`${API}/api/users/send-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: cleaned, via: 'whatsapp' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل إرسال الرمز');
      setOtpSent(true);
      setResendTimer(60);
      setSuccess('تم إرسال رمز التحقق على واتساب ✅');
    } catch (e) { setError(e.message); }
    setOtpLoading(false);
  }

  async function verifyOTP() {
    setError('');
    if (!otp.trim())        { setError('يرجى إدخال رمز التحقق'); return; }
    if (otp.length < 4)     { setError('الرمز قصير جداً');        return; }
    setLoading(true);
    try {
      const country = localStorage.getItem('detectedCountry') || 'EG';
      const res     = await fetch(`${API}/api/users/verify-otp`, {
        method:  'POST',
        headers: { 'Content-Type': 'application/json' },
        body:    JSON.stringify({ phone: phone.trim(), otp: otp.trim(), country })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'رمز التحقق غير صحيح');
      saveAndRedirect(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  /* ── styles ── */
  const bg = {
    minHeight:   '100vh',
    background:  'linear-gradient(135deg, #002f34 0%, #00695c 100%)',
    display:     'flex',
    alignItems:  'center',
    justifyContent: 'center',
    fontFamily:  "'Cairo', 'Noto Sans Arabic', 'Segoe UI', system-ui, sans-serif",
    padding:     16,
    direction:   'rtl'
  };
  const card = {
    background:   'white',
    borderRadius: 24,
    padding:      '36px 32px',
    width:        '100%',
    maxWidth:     420,
    boxShadow:    '0 24px 64px rgba(0,0,0,0.35)',
    direction:    'rtl',
    lang:         'ar'
  };
  const inputStyle = {
    width:        '100%',
    padding:      '14px 16px',
    borderRadius: 12,
    border:       '1.5px solid #e0e0e0',
    fontSize:     15,
    boxSizing:    'border-box',
    marginBottom: 14,
    fontFamily:   'inherit',
    transition:   'border-color 0.2s',
    outline:      'none',
    direction:    'rtl',
    textAlign:    'right',
    color:        '#222'
  };

  /* ── loading screen ── */
  if (loading) {
    return (
      <div style={bg} role="status" aria-label="جارٍ التحميل" lang="ar">
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <h2 style={{ margin: '0 0 12px', fontSize: 28, fontWeight: 900 }}>XTOX</h2>
          <p style={{ opacity: 0.85, fontSize: 16 }}>{success || 'جارٍ التحميل...'}</p>
          <div style={{
            width: 40, height: 40,
            border: '4px solid rgba(255,255,255,0.3)',
            borderTop: '4px solid white',
            borderRadius: '50%',
            margin: '20px auto 0',
            animation: 'spin 0.9s linear infinite'
          }} aria-hidden="true" />
          <style>{`@keyframes spin{to{transform:rotate(360deg)}}`}</style>
        </div>
      </div>
    );
  }

  return (
    <div style={bg} lang="ar">
      <div style={card} role="main">

        {/* ── Noto Sans Arabic font ── */}
        <style>{`
          @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Noto+Sans+Arabic:wght@400;600;700&display=swap');
          input:focus { border-color: #002f34 !important; box-shadow: 0 0 0 3px rgba(0,47,52,0.12); }
          button:active { transform: scale(0.98); }
          @keyframes spin { to { transform: rotate(360deg); } }
          @keyframes fadeIn { from { opacity:0; transform:translateY(8px);} to {opacity:1;transform:translateY(0);} }
          .login-card-anim { animation: fadeIn 0.35s ease; }
        `}</style>

        {/* ── Logo ── */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <a href="/" style={{ textDecoration: 'none' }} aria-label="الصفحة الرئيسية XTOX">
            <div style={{ fontSize: 56 }} role="img" aria-label="XTOX">🛒</div>
            <h1 style={{ color: '#002f34', fontSize: 30, fontWeight: 900, margin: '8px 0 4px', letterSpacing: -0.5 }}>
              XTOX
            </h1>
            <p style={{ color: '#888', fontSize: 14, margin: 0 }}>السوق المحلي الذكي</p>
          </a>
        </div>

        {/* ── Error banner ── */}
        {error && (
          <div
            role="alert"
            aria-live="assertive"
            style={{
              background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 12,
              padding: '12px 16px', marginBottom: 18, color: '#c62828', fontSize: 14,
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              animation: 'fadeIn 0.2s ease'
            }}>
            <span>⚠️ {error}</span>
            <button
              onClick={() => setError('')}
              aria-label="إغلاق رسالة الخطأ"
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 20, lineHeight: 1, padding: '0 4px' }}>
              ×
            </button>
          </div>
        )}

        {/* ── Success banner ── */}
        {success && !loading && (
          <div role="status" aria-live="polite"
            style={{
              background: '#e8f5e9', border: '1px solid #66bb6a', borderRadius: 12,
              padding: '12px 16px', marginBottom: 18, color: '#2e7d32', fontSize: 14,
              animation: 'fadeIn 0.2s ease'
            }}>
            ✅ {success}
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: main (Google + WhatsApp)
        ══════════════════════════════════════════ */}
        {tab === 'main' && (
          <div className="login-card-anim" style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ textAlign: 'center', color: '#666', fontSize: 15, margin: '0 0 4px', fontWeight: 600 }}>
              اختر طريقة الدخول
            </p>

            {/* Google */}
            {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com') ? (
              <button
                onClick={loginWithGoogle}
                aria-label="تسجيل الدخول بحساب Google"
                style={{
                  width: '100%', padding: '14px 20px', borderRadius: 14,
                  border: '1.5px solid #dadce0', background: 'white', cursor: 'pointer',
                  fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center',
                  gap: 12, fontFamily: 'inherit', fontWeight: 700, color: '#3c4043',
                  boxShadow: '0 2px 6px rgba(0,0,0,0.08)', transition: 'box-shadow 0.2s'
                }}>
                <svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                المتابعة بـ Google
              </button>
            ) : null}

            {/* WhatsApp */}
            <button
              onClick={() => { setTab('whatsapp'); setError(''); setSuccess(''); }}
              aria-label="تسجيل الدخول عبر واتساب"
              style={{
                width: '100%', padding: '15px 20px', borderRadius: 14, border: 'none',
                background: 'linear-gradient(135deg, #25d366, #128c7e)', color: 'white',
                cursor: 'pointer', fontSize: 16,
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12,
                fontFamily: 'inherit', fontWeight: 700,
                boxShadow: '0 4px 12px rgba(37,211,102,0.35)', transition: 'box-shadow 0.2s'
              }}>
              <span style={{ fontSize: 22 }} aria-hidden="true">💬</span>
              المتابعة بـ واتساب
            </button>

            {/* Hidden email login */}
            {showEmail && (
              <div
                className="login-card-anim"
                style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, padding: 16, background: '#f9fafb', borderRadius: 14, border: '1px solid #eee' }}>
                <p style={{ margin: 0, fontWeight: 700, color: '#002f34', fontSize: 14 }}>
                  🔐 تسجيل الدخول بالبريد الإلكتروني
                </p>
                <input
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  type="email"
                  placeholder="البريد الإلكتروني"
                  aria-label="البريد الإلكتروني"
                  autoComplete="email"
                  style={{ ...inputStyle, direction: 'ltr', textAlign: 'left' }}
                />
                <input
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  type="password"
                  placeholder="كلمة المرور"
                  aria-label="كلمة المرور"
                  autoComplete="current-password"
                  onKeyDown={e => e.key === 'Enter' && loginWithEmail()}
                  style={inputStyle}
                />
                <button
                  onClick={loginWithEmail}
                  aria-label="تسجيل الدخول"
                  style={{ padding: '12px', background: '#002f34', color: 'white', border: 'none', borderRadius: 10, fontWeight: 700, cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>
                  دخول
                </button>
                <button
                  onClick={() => setShowEmail(false)}
                  aria-label="إخفاء نموذج البريد الإلكتروني"
                  style={{ background: 'none', border: 'none', color: '#aaa', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  إخفاء
                </button>
              </div>
            )}

            <p style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 8 }}>
              بالمتابعة توافق على{' '}
              <a href="/terms"   style={{ color: '#002f34', textDecoration: 'none', fontWeight: 600 }}>شروط الاستخدام</a>
              {' '}و{' '}
              <a href="/privacy" style={{ color: '#002f34', textDecoration: 'none', fontWeight: 600 }}>سياسة الخصوصية</a>
            </p>
            <p style={{ textAlign: 'center', margin: '4px 0 0' }}>
              <button
                onClick={() => setShowEmail(s => !s)}
                aria-label={showEmail ? 'إخفاء تسجيل دخول المشرف' : 'تسجيل دخول المشرف'}
                style={{ background: 'none', border: 'none', color: '#d0d0d0', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                {showEmail ? 'إخفاء' : 'Admin / Email Login'}
              </button>
            </p>
          </div>
        )}

        {/* ══════════════════════════════════════════
            TAB: WhatsApp OTP
        ══════════════════════════════════════════ */}
        {tab === 'whatsapp' && (
          <div className="login-card-anim">
            <button
              onClick={() => { setTab('main'); setOtpSent(false); setOtp(''); setPhone(''); setError(''); setSuccess(''); setResendTimer(0); }}
              aria-label="العودة إلى الصفحة الرئيسية"
              style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 700, fontSize: 18, cursor: 'pointer', marginBottom: 20, fontFamily: 'inherit', padding: 0, display: 'flex', alignItems: 'center', gap: 6 }}>
              <span aria-hidden="true">→</span> رجوع
            </button>

            <h2 style={{ color: '#002f34', margin: '0 0 6px', fontSize: 20, fontWeight: 900 }}>
              دخول بـ واتساب
            </h2>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>
              سيصلك رمز تحقق مجاني عبر واتساب
            </p>

            {!otpSent ? (
              <>
                <label htmlFor="whatsapp-phone" style={{ display: 'block', fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#333' }}>
                  رقم الواتساب
                </label>
                <input
                  id="whatsapp-phone"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  type="tel"
                  inputMode="tel"
                  placeholder="+966501234567"
                  aria-label="رقم واتساب مع رمز الدولة"
                  autoComplete="tel"
                  style={{ ...inputStyle, direction: 'ltr', textAlign: 'left', letterSpacing: 1, fontSize: 17 }}
                />
                <p style={{ color: '#aaa', fontSize: 12, marginTop: -10, marginBottom: 14, textAlign: 'right' }}>
                  مثال: +966 للسعودية، +20 لمصر، +971 للإمارات
                </p>
                <button
                  onClick={sendOTP}
                  disabled={otpLoading}
                  aria-label="إرسال رمز التحقق عبر واتساب"
                  aria-busy={otpLoading}
                  style={{
                    width: '100%', padding: '15px', borderRadius: 12, border: 'none',
                    background: otpLoading ? '#b0b0b0' : 'linear-gradient(135deg, #25d366, #128c7e)',
                    color: 'white', cursor: otpLoading ? 'not-allowed' : 'pointer',
                    fontSize: 16, fontFamily: 'inherit', fontWeight: 700,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    boxShadow: otpLoading ? 'none' : '0 4px 12px rgba(37,211,102,0.35)'
                  }}>
                  {otpLoading ? (
                    <>
                      <span style={{ width:18, height:18, border:'3px solid rgba(255,255,255,0.4)', borderTop:'3px solid white', borderRadius:'50%', animation:'spin 0.8s linear infinite', display:'inline-block' }} aria-hidden="true" />
                      جارٍ الإرسال...
                    </>
                  ) : (
                    <><span aria-hidden="true">📨</span> إرسال رمز واتساب</>
                  )}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: '#2e7d32', fontWeight: 700, marginBottom: 6, fontSize: 14 }}>
                  ✅ تم إرسال الرمز إلى {phone}
                </p>
                <p style={{ color: '#888', fontSize: 12, marginBottom: 20 }}>
                  لم تستلم الرمز؟ تحقق من واتساب أو أعد الإرسال
                </p>

                <label htmlFor="otp-input" style={{ display: 'block', fontWeight: 700, fontSize: 14, marginBottom: 8, color: '#333' }}>
                  رمز التحقق
                </label>
                <input
                  id="otp-input"
                  value={otp}
                  onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                  onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  type="text"
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="• • • • • •"
                  aria-label="أدخل رمز التحقق المكون من 6 أرقام"
                  maxLength={6}
                  style={{
                    width: '100%', padding: '16px', borderRadius: 12,
                    border: '2px solid #25d366', fontSize: 32, textAlign: 'center',
                    boxSizing: 'border-box', marginBottom: 14,
                    letterSpacing: 14, fontFamily: 'monospace', direction: 'ltr'
                  }}
                />

                {/* OTP progress dots */}
                <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 16 }}>
                  {[0,1,2,3,4,5].map(i => (
                    <div key={i} style={{
                      width: 10, height: 10, borderRadius: '50%',
                      background: otp.length > i ? '#25d366' : '#e0e0e0',
                      transition: 'background 0.2s'
                    }} aria-hidden="true" />
                  ))}
                </div>

                <button
                  onClick={verifyOTP}
                  disabled={loading || otp.length < 4}
                  aria-label="تأكيد رمز التحقق"
                  aria-busy={loading}
                  style={{
                    width: '100%', padding: '15px', background: (loading || otp.length < 4) ? '#b0b0b0' : '#002f34',
                    color: 'white', border: 'none', borderRadius: 12, fontWeight: 700,
                    fontSize: 16, cursor: (loading || otp.length < 4) ? 'not-allowed' : 'pointer',
                    fontFamily: 'inherit', transition: 'background 0.2s'
                  }}>
                  {loading ? 'جارٍ التحقق...' : '✅ تأكيد الرمز'}
                </button>

                <button
                  onClick={() => { if (resendTimer === 0) { setOtpSent(false); setOtp(''); setSuccess(''); } }}
                  disabled={resendTimer > 0}
                  aria-label={resendTimer > 0 ? `إعادة الإرسال بعد ${resendTimer} ثانية` : 'إعادة إرسال الرمز'}
                  style={{
                    width: '100%', marginTop: 10, padding: '12px',
                    background: '#f5f5f5', border: 'none', borderRadius: 12,
                    cursor: resendTimer > 0 ? 'not-allowed' : 'pointer',
                    color: resendTimer > 0 ? '#bbb' : '#555',
                    fontSize: 14, fontFamily: 'inherit', transition: 'color 0.2s'
                  }}>
                  {resendTimer > 0 ? `إعادة الإرسال بعد ${resendTimer}ث` : '🔄 إعادة إرسال الرمز'}
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
