'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://fox-production.up.railway.app';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState('main');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [showEmail, setShowEmail] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  useEffect(() => {
    try {
      // Check if already logged in
      const token = localStorage.getItem('token');
      if (token) {
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        window.location.href = (user.role === 'admin' || user.role === 'sub_admin') ? '/admin' : '/';
        return;
      }

      // Handle Google OAuth callback (id_token in URL hash)
      const hash = window.location.hash || '';
      if (hash.includes('id_token=')) {
        setLoading(true);
        setSuccess('جار التحقق من Google...');
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
            if (data.token) {
              saveAndRedirect(data);
            } else {
              setError(data.error || 'فشل تسجيل الدخول بـ Google');
              setLoading(false);
              window.history.replaceState(null, '', '/login');
            }
          })
          .catch(() => { setError('فشل الاتصال بالخادم'); setLoading(false); });
        }
        return;
      }

      // Load Google Identity Services (ChatGPT recommended approach)
      if (GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) {
        const initGoogle = () => {
          if (!window.google) return;
          try {
            window.google.accounts.id.initialize({
              client_id: GOOGLE_CLIENT_ID,
              callback: (response) => {
                setLoading(true);
                setSuccess('جار التحقق من Google...');
                const country = localStorage.getItem('detectedCountry') || 'EG';
                fetch(`${API}/api/users/auth/google`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ idToken: response.credential, country })
                })
                .then(r => r.json())
                .then(data => {
                  if (data.token) saveAndRedirect(data);
                  else { setError(data.error || 'فشل'); setLoading(false); }
                })
                .catch(() => { setError('فشل الاتصال'); setLoading(false); });
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
          script.async = true;
          script.defer = true;
          script.onload = initGoogle;
          document.head.appendChild(script);
        }
      }

      // Detect country
      fetch('https://ipapi.co/json/')
        .then(r => r.json())
        .then(d => { if (d.country_code) localStorage.setItem('detectedCountry', d.country_code); })
        .catch(() => {});
    } catch {}
  }, []);

  function saveAndRedirect(data) {
    try {
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user?.id || '');
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      localStorage.setItem('country', data.user?.country || 'EG');
      setSuccess('تم تسجيل الدخول! جار التحويل...');
      setTimeout(() => {
        window.location.href = (data.user?.role === 'admin' || data.user?.role === 'sub_admin') ? '/admin' : '/';
      }, 1000);
    } catch (e) { setError('خطأ: ' + e.message); }
  }

  function loginWithGoogle() {
    if (!GOOGLE_CLIENT_ID) { setError('Google login not configured'); return; }
    try {
      const redirectUri = window.location.origin + '/login';
      const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
      const params = new URLSearchParams({
        client_id: GOOGLE_CLIENT_ID,
        redirect_uri: redirectUri,
        response_type: 'id_token',
        scope: 'email profile openid',
        nonce,
        prompt: 'select_account'
      });
      window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
    } catch (e) { setError('خطأ: ' + e.message); }
  }

  async function loginWithEmail() {
    setError('');
    if (!email.trim() || !password.trim()) { setError('أدخل البريد وكلمة المرور'); return; }
    setLoading(true);
    try {
      const res = await fetch(`${API}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'بيانات خاطئة');
      saveAndRedirect(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  async function sendOTP() {
    if (!phone.trim()) { setError('أدخل رقم الواتساب مع كود الدولة مثل +201234567890'); return; }
    setOtpLoading(true); setError(''); setSuccess('');
    try {
      const res = await fetch(`${API}/api/users/send-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), via: 'whatsapp' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الإرسال');
      setOtpSent(true);
      setSuccess('تم إرسال الرمز على واتساب ✅');
    } catch (e) { setError(e.message); }
    setOtpLoading(false);
  }

  async function verifyOTP() {
    if (!otp.trim()) { setError('أدخل رمز التحقق'); return; }
    setLoading(true); setError('');
    try {
      const country = localStorage.getItem('detectedCountry') || 'EG';
      const res = await fetch(`${API}/api/users/verify-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim(), country })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'رمز خاطئ');
      saveAndRedirect(data);
    } catch (e) { setError(e.message); }
    setLoading(false);
  }

  const bg = { minHeight: '100vh', background: 'linear-gradient(135deg, #002f34 0%, #004d40 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cairo', system-ui, sans-serif", padding: 16 };
  const card = { background: 'white', borderRadius: 24, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' };

  // Loading screen
  if (loading) {
    return (
      <div style={bg}>
        <div style={{ textAlign: 'center', color: 'white' }}>
          <div style={{ fontSize: 64, marginBottom: 16 }}>🛒</div>
          <h2 style={{ margin: '0 0 10px', fontSize: 28, fontWeight: 900 }}>XTOX</h2>
          <p style={{ opacity: 0.85, fontSize: 16 }}>{success || 'جار التحميل...'}</p>
        </div>
      </div>
    );
  }

  return (
    <div style={bg}>
      <div style={card}>
        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 60 }}>🛒</div>
            <h1 style={{ color: '#002f34', fontSize: 32, fontWeight: 900, margin: '8px 0 4px' }}>XTOX</h1>
            <p style={{ color: '#888', fontSize: 14, margin: 0 }}>السوق المحلي الذكي</p>
          </a>
        </div>

        {/* Error */}
        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#cc0000', fontSize: 14, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span>⚠️ {error}</span>
            <button onClick={() => setError('')} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#999', fontSize: 18, lineHeight: 1 }}>×</button>
          </div>
        )}

        {/* Success */}
        {success && !loading && (
          <div style={{ background: '#e8f8e8', border: '1px solid #00aa44', borderRadius: 12, padding: '12px 16px', marginBottom: 20, color: '#00aa44', fontSize: 14 }}>
            ✅ {success}
          </div>
        )}

        {/* Main Tab — Google + WhatsApp only */}
        {tab === 'main' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ textAlign: 'center', color: '#777', fontSize: 15, margin: '0 0 6px' }}>
              اختر طريقة الدخول
            </p>

            {/* Google - ChatGPT recommended: Google Identity Services */}
            {GOOGLE_CLIENT_ID && GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com') ? (
              <div>
                {googleReady ? (
                  <div
                    id="g_id_signin"
                    onClick={() => {
                      try {
                        if (window.google && googleReady) {
                          window.google.accounts.id.prompt();
                        } else {
                          const nonce = Math.random().toString(36).slice(2) + Date.now().toString(36);
                          const params = new URLSearchParams({
                            client_id: GOOGLE_CLIENT_ID,
                            redirect_uri: window.location.origin + '/login',
                            response_type: 'id_token',
                            scope: 'email profile openid',
                            nonce,
                            prompt: 'select_account'
                          });
                          window.location.href = 'https://accounts.google.com/o/oauth2/v2/auth?' + params.toString();
                        }
                      } catch {}
                    }}
                    style={{ width: '100%', padding: '14px', borderRadius: 14, border: '1px solid #dadce0', background: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'inherit', fontWeight: 600, color: '#3c4043', boxShadow: '0 2px 4px rgba(0,0,0,0.1)', marginBottom: 10 }}>
                    <svg width="20" height="20" viewBox="0 0 48 48"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/><path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>
                    المتابعة بـ Google
                  </div>
                ) : (
                  <div style={{ padding: '12px', textAlign: 'center', color: '#999', fontSize: 13 }}>جار تحميل Google...</div>
                )}
              </div>
            ) : null}

            {/* WhatsApp */}
            <button onClick={() => { setTab('whatsapp'); setError(''); setSuccess(''); }}
              style={{ width: '100%', padding: '15px 20px', borderRadius: 14, border: 'none', background: '#25d366', color: 'white', cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 12, fontFamily: 'inherit', fontWeight: 700, boxShadow: '0 2px 6px rgba(37,211,102,0.3)' }}>
              <span style={{ fontSize: 24 }}>💬</span>
              المتابعة بـ واتساب
            </button>

            {/* Hidden email login for admin - shown by clicking 5 times on logo or footer link */}
            {showEmail ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginTop: 4, padding: 16, background: '#f8f8f8', borderRadius: 14 }}>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#002f34', fontSize: 14 }}>دخول بالبريد الإلكتروني</p>
                <input value={email} onChange={e => setEmail(e.target.value)} type="email" placeholder="البريد الإلكتروني"
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, direction: 'ltr', textAlign: 'left' }} />
                <input value={password} onChange={e => setPassword(e.target.value)} type="password" placeholder="كلمة المرور"
                  onKeyDown={e => e.key === 'Enter' && loginWithEmail()}
                  style={{ padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14 }} />
                <button onClick={loginWithEmail} style={{ padding: '12px', background: '#002f34', color: 'white', border: 'none', borderRadius: 10, fontWeight: 'bold', cursor: 'pointer', fontFamily: 'inherit', fontSize: 15 }}>
                  🔐 دخول
                </button>
                <button onClick={() => setShowEmail(false)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 13 }}>إخفاء</button>
              </div>
            ) : null}

            <p style={{ textAlign: 'center', color: '#bbb', fontSize: 12, marginTop: 10 }}>
              بالمتابعة توافق على{' '}
              <a href="/terms" style={{ color: '#002f34' }}>الشروط</a>
              {' '}و{' '}
              <a href="/privacy" style={{ color: '#002f34' }}>الخصوصية</a>
            </p>
            <p style={{ textAlign: 'center', marginTop: 8 }}>
              <button onClick={() => setShowEmail(s => !s)} style={{ background: 'none', border: 'none', color: '#ccc', fontSize: 11, cursor: 'pointer', fontFamily: 'inherit' }}>
                {showEmail ? 'إخفاء' : 'Admin / Email Login'}
              </button>
            </p>
          </div>
        )}

        {/* WhatsApp OTP Tab */}
        {tab === 'whatsapp' && (
          <div>
            <button onClick={() => { setTab('main'); setOtpSent(false); setOtp(''); setPhone(''); setError(''); setSuccess(''); }}
              style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 18, cursor: 'pointer', marginBottom: 20, fontFamily: 'inherit', padding: 0 }}>
              ← رجوع
            </button>

            <h3 style={{ color: '#002f34', margin: '0 0 6px', fontSize: 20 }}>دخول بـ واتساب</h3>
            <p style={{ color: '#888', fontSize: 13, margin: '0 0 24px' }}>سيصلك رمز تحقق مجاني على واتساب</p>

            {!otpSent ? (
              <>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: 14, marginBottom: 8, color: '#333' }}>رقم الواتساب</label>
                <input
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendOTP()}
                  type="tel"
                  placeholder="+201234567890"
                  style={{ width: '100%', padding: '14px 16px', borderRadius: 12, border: '1px solid #ddd', fontSize: 16, boxSizing: 'border-box', marginBottom: 14, direction: 'ltr', textAlign: 'left', fontFamily: 'inherit' }}
                />
                <button onClick={sendOTP} disabled={otpLoading}
                  style={{ width: '100%', padding: '14px', background: otpLoading ? '#ccc' : '#25d366', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: otpLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {otpLoading ? 'جار الإرسال...' : '📨 إرسال رمز واتساب'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: '#25d366', fontWeight: 'bold', marginBottom: 16, fontSize: 14 }}>✅ تم إرسال الرمز إلى {phone}</p>
                <label style={{ display: 'block', fontWeight: 'bold', fontSize: 14, marginBottom: 8, color: '#333' }}>رمز التحقق</label>
                <input
                  value={otp}
                  onChange={e => setOtp(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && verifyOTP()}
                  type="number"
                  placeholder="000000"
                  style={{ width: '100%', padding: '16px', borderRadius: 12, border: '2px solid #25d366', fontSize: 30, textAlign: 'center', boxSizing: 'border-box', marginBottom: 14, letterSpacing: 12, fontFamily: 'inherit' }}
                />
                <button onClick={verifyOTP} disabled={loading}
                  style={{ width: '100%', padding: '14px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'جار التحقق...' : '✅ تأكيد الرمز'}
                </button>
                <button onClick={() => { setOtpSent(false); setOtp(''); setSuccess(''); }}
                  style={{ width: '100%', marginTop: 10, padding: '12px', background: '#f5f5f5', border: 'none', borderRadius: 12, cursor: 'pointer', color: '#666', fontSize: 14, fontFamily: 'inherit' }}>
                  إعادة الإرسال
                </button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
