'use client';
import { useState, useEffect } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://fox-production.up.railway.app';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    try {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (token && user) {
        const u = JSON.parse(user);
        window.location.href = (u.role === 'admin' || u.role === 'sub_admin') ? '/admin' : '/';
        return;
      }
    } catch {}

    if (!GOOGLE_CLIENT_ID) return;
    try {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = () => {
        try {
          if (!window.google || !window.google.accounts) return;
          if (!GOOGLE_CLIENT_ID.includes('.apps.googleusercontent.com')) return;
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true
          });
          // Use prompt() instead of renderButton() to avoid React DOM conflicts
          setGoogleReady(true);
        } catch (e) {
          console.warn('Google init error:', e.message);
        }
      };
      document.head.appendChild(script);
    } catch {}
  }, []);

  function saveAndRedirect(data) {
    try {
      if (!data?.token) { setError('خطأ في الاستجابة'); return; }
      localStorage.setItem('token', data.token);
      localStorage.setItem('userId', data.user?.id || '');
      localStorage.setItem('user', JSON.stringify(data.user || {}));
      localStorage.setItem('country', data.user?.country || 'EG');
      setSuccess('تم تسجيل الدخول! جار التحويل...');
      setTimeout(() => {
        window.location.href = (data.user?.role === 'admin' || data.user?.role === 'sub_admin') ? '/admin' : '/';
      }, 800);
    } catch (e) { setError('خطأ: ' + e.message); }
  }

  // Google redirect flow - no SDK needed
  async function handleGoogleResponse(response) {
    // Not used with redirect flow
  }

  async function handleEmailAuth() {
    setError(''); setLoading(true);
    if (!email.trim()) { setError('أدخل البريد الإلكتروني'); setLoading(false); return; }
    if (!password) { setError('أدخل كلمة المرور'); setLoading(false); return; }
    if (tab === 'register' && !name.trim()) { setError('أدخل اسمك'); setLoading(false); return; }
    try {
      const country = localStorage.getItem('detectedCountry') || 'EG';
      const endpoint = tab === 'login' ? '/api/users/login' : '/api/users/register';
      const body = tab === 'login'
        ? { email: email.trim(), password }
        : { email: email.trim(), password, name: name.trim(), country };
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000);
      const res = await fetch(`${API}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
        signal: controller.signal
      });
      clearTimeout(timeout);
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      saveAndRedirect(data);
    } catch (e) {
      if (e.name === 'AbortError') setError('انتهت مهلة الاتصال — تحقق من الإنترنت');
      else setError(e.message || 'حدث خطأ');
    }
    setLoading(false);
  }

  async function sendOTP() {
    if (!phone.trim()) { setError('أدخل رقم الواتساب'); return; }
    setOtpLoading(true); setError('');
    try {
      const res = await fetch(`${API}/api/users/send-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), via: 'whatsapp' })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      setOtpSent(true); setSuccess('تم إرسال الرمز على واتساب');
    } catch (e) { setError(e.message || 'فشل إرسال الرمز'); }
    setOtpLoading(false);
  }

  async function verifyOTP() {
    if (!otp.trim()) { setError('أدخل رمز التحقق'); return; }
    setLoading(true); setError('');
    try {
      const country = localStorage.getItem('detectedCountry') || 'EG';
      const res = await fetch(`${API}/api/users/verify-otp`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phone.trim(), otp: otp.trim(), country })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'رمز خاطئ');
      saveAndRedirect(data);
    } catch (e) { setError(e.message || 'رمز خاطئ'); }
    setLoading(false);
  }

  useEffect(() => {
    fetch('https://ipapi.co/json/')
      .then(r => r.json())
      .then(d => { if (d.country_code) localStorage.setItem('detectedCountry', d.country_code); })
      .catch(() => {});
  }, []);

  const S = {
    page: { minHeight: '100vh', background: 'linear-gradient(135deg, #002f34, #004d40)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: "'Cairo', system-ui, sans-serif", padding: 16 },
    card: { background: 'white', borderRadius: 24, padding: 36, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' },
    tabs: { display: 'flex', background: '#f0f0f0', borderRadius: 12, padding: 4, marginBottom: 24 },
    tab: (active) => ({ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 15, background: active ? '#002f34' : 'transparent', color: active ? 'white' : '#666', fontFamily: 'inherit' }),
    alert: (type) => ({ padding: '10px 14px', borderRadius: 10, marginBottom: 16, fontSize: 14, background: type === 'error' ? '#fff0f0' : '#e8f8e8', border: `1px solid ${type === 'error' ? '#ffcccc' : '#00aa44'}`, color: type === 'error' ? '#cc0000' : '#00aa44' }),
    input: { width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddd', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', marginBottom: 12 },
    btn: (color) => ({ width: '100%', padding: '14px', background: color || '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: 'pointer', fontFamily: 'inherit', marginTop: 8 }),
    oauthBtn: (border, bg, color) => ({ width: '100%', padding: '12px', borderRadius: 12, border: `1px solid ${border}`, background: bg || 'white', color: color || '#333', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', fontWeight: 'bold', marginBottom: 10 }),
    divider: { display: 'flex', alignItems: 'center', gap: 10, margin: '16px 0' },
    link: { color: '#002f34', fontSize: 12 }
  };

  return (
    <div style={S.page}>
      <div style={S.card}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 52 }}>🛒</div>
            <h1 style={{ color: '#002f34', fontSize: 28, fontWeight: 900, margin: '4px 0 2px' }}>XTOX</h1>
            <p style={{ color: '#666', fontSize: 14, margin: 0 }}>السوق المحلي الذكي</p>
          </a>
        </div>

        {tab === 'whatsapp' ? (
          <div>
            <button onClick={() => { setTab('login'); setOtpSent(false); setError(''); setSuccess(''); }}
              style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16, fontFamily: 'inherit' }}>
              ← رجوع
            </button>
            <h3 style={{ color: '#002f34', marginBottom: 16 }}>دخول بـ واتساب</h3>
            {error && <div style={S.alert('error')}>⚠️ {error}</div>}
            {success && <div style={S.alert('success')}>✅ {success}</div>}
            {!otpSent ? (
              <>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel"
                  placeholder="+201234567890" style={{ ...S.input, direction: 'ltr', textAlign: 'left' }} />
                <button onClick={sendOTP} disabled={otpLoading} style={S.btn('#25d366')}>
                  {otpLoading ? 'جار الإرسال...' : '📨 إرسال رمز واتساب'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: '#25d366', marginBottom: 12 }}>✅ تم الإرسال إلى {phone}</p>
                <input value={otp} onChange={e => setOtp(e.target.value)} type="number"
                  placeholder="123456" style={{ ...S.input, fontSize: 24, textAlign: 'center', letterSpacing: 8 }} />
                <button onClick={verifyOTP} disabled={loading} style={S.btn()}>
                  {loading ? 'جار التحقق...' : '✅ تأكيد'}
                </button>
                <button onClick={() => { setOtpSent(false); setOtp(''); }}
                  style={{ ...S.btn('#f0f0f0'), color: '#333', marginTop: 8 }}>
                  إعادة الإرسال
                </button>
              </>
            )}
          </div>
        ) : (
          <>
            <div style={S.tabs}>
              {[['login','دخول'],['register','حساب جديد']].map(([t,l]) => (
                <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                  style={S.tab(tab === t)}>{l}</button>
              ))}
            </div>

            {error && <div style={S.alert('error')}>⚠️ {error}</div>}
            {success && <div style={S.alert('success')}>✅ {success}</div>}

            {googleReady ? (
              <button
                onClick={() => {
                  try {
                    const params = new URLSearchParams({
                      client_id: GOOGLE_CLIENT_ID,
                      redirect_uri: window.location.origin + '/login',
                      response_type: 'id_token',
                      scope: 'email profile openid',
                      nonce: Math.random().toString(36).slice(2),
                      prompt: 'select_account'
                    });
                    window.location.href = `https://accounts.google.com/o/oauth2/v2/auth?${params}`;
                  } catch {}
                }}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #dadce0', background: 'white', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', fontWeight: '600', marginBottom: 10, color: '#3c4043' }}>
                <svg width="18" height="18" viewBox="0 0 48 48">
                  <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
                  <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
                  <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
                  <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
                </svg>
                المتابعة بـ Google
              </button>
            ) : null}

            <button onClick={() => { setTab('whatsapp'); setError(''); }}
              style={S.oauthBtn('#25d366', '#25d366', 'white')}>
              <span style={{ fontSize: 20 }}>💬</span> دخول بـ واتساب
            </button>

            <div style={S.divider}>
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
              <span style={{ color: '#999', fontSize: 13 }}>أو بالبريد</span>
              <div style={{ flex: 1, height: 1, background: '#eee' }} />
            </div>

            {tab === 'register' && (
              <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل" style={S.input} />
            )}
            <input value={email} onChange={e => setEmail(e.target.value)} type="email"
              placeholder="البريد الإلكتروني" autoComplete="email"
              style={{ ...S.input, direction: 'ltr', textAlign: 'left' }} />
            <input value={password} onChange={e => setPassword(e.target.value)} type="password"
              placeholder="كلمة المرور" autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
              onKeyDown={e => e.key === 'Enter' && !loading && handleEmailAuth()}
              style={S.input} />

            <button onClick={handleEmailAuth} disabled={loading} style={S.btn()}>
              {loading ? 'جار التحميل...' : tab === 'login' ? '🔐 دخول' : '✅ إنشاء حساب'}
            </button>

            <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 16 }}>
              بالمتابعة توافق على{' '}
              <a href="/terms" style={S.link}>الشروط</a> و<a href="/privacy" style={S.link}>الخصوصية</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
