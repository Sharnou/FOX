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
          if (!window.google) return;
          window.google.accounts.id.initialize({
            client_id: GOOGLE_CLIENT_ID,
            callback: handleGoogleResponse,
            auto_select: false
          });
          const btn = document.getElementById('google-btn');
          if (btn) {
            window.google.accounts.id.renderButton(btn, {
              type: 'standard', theme: 'outline', size: 'large',
              text: 'continue_with', width: 320, locale: 'ar'
            });
            setGoogleReady(true);
          }
        } catch {}
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

  async function handleGoogleResponse(response) {
    setLoading(true); setError('');
    try {
      const country = localStorage.getItem('detectedCountry') || 'EG';
      const res = await fetch(`${API}/api/users/auth/google`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ idToken: response.credential, country })
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل');
      saveAndRedirect(data);
    } catch (e) { setError(e.message || 'فشل تسجيل الدخول بـ Google'); }
    setLoading(false);
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

            {GOOGLE_CLIENT_ID ? (
              <div id="google-btn" style={{ width: '100%', minHeight: 44, marginBottom: 10, display: 'flex', justifyContent: 'center' }}>
                {!googleReady && <span style={{ color: '#999', fontSize: 13, padding: '12px 0' }}>جار تحميل Google...</span>}
              </div>
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
