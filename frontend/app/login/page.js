'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [googleReady, setGoogleReady] = useState(false);

  useEffect(() => {
    // Check if already logged in
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const user = localStorage.getItem('user');
      if (token && user) {
        try {
          const u = JSON.parse(user);
          window.location.href = (u.role === 'admin' || u.role === 'sub_admin') ? '/admin' : '/';
          return;
        } catch {}
      }
    }

    // Load Google Identity Services
    if (!GOOGLE_CLIENT_ID) return;
    const existing = document.getElementById('google-gsi-script');
    if (existing) { initGoogle(); return; }
    const script = document.createElement('script');
    script.id = 'google-gsi-script';
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = initGoogle;
    script.onerror = () => console.warn('Google GSI failed to load');
    document.head.appendChild(script);
  }, []);

  function initGoogle() {
    if (!window.google || !GOOGLE_CLIENT_ID) return;
    try {
      window.google.accounts.id.initialize({
        client_id: GOOGLE_CLIENT_ID,
        callback: handleGoogleResponse,
        auto_select: false,
        cancel_on_tap_outside: true
      });
      const btnEl = document.getElementById('google-signin-btn');
      if (btnEl) {
        window.google.accounts.id.renderButton(btnEl, {
          type: 'standard', theme: 'outline', size: 'large',
          text: 'continue_with', shape: 'rectangular',
          width: btnEl.offsetWidth || 300, locale: 'ar'
        });
      }
      setGoogleReady(true);
    } catch (e) { console.error('Google init error:', e); }
  }

  async function handleGoogleResponse(response) {
    setLoading(true); setError('');
    try {
      const country = typeof window !== 'undefined' ? (localStorage.getItem('detectedCountry') || 'EG') : 'EG';
      const res = await axios.post(`${API}/api/users/auth/google`, { idToken: response.credential, country });
      saveAndRedirect(res.data);
    } catch (e) {
      setError(e.response?.data?.error || 'فشل تسجيل الدخول بـ Google');
    }
    setLoading(false);
  }

  function saveAndRedirect(data) {
    if (!data.token || !data.user) { setError('استجابة غير صحيحة من الخادم'); return; }
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('country', data.user.country || 'EG');
    setSuccess('تم تسجيل الدخول بنجاح! جار التحويل...');
    setTimeout(() => {
      window.location.href = (data.user.role === 'admin' || data.user.role === 'sub_admin') ? '/admin' : '/';
    }, 800);
  }

  async function handleEmailAuth() {
    setError(''); setLoading(true);
    if (!email.trim()) { setError('أدخل البريد الإلكتروني'); setLoading(false); return; }
    if (!password) { setError('أدخل كلمة المرور'); setLoading(false); return; }
    if (tab === 'register' && !name.trim()) { setError('أدخل اسمك'); setLoading(false); return; }
    try {
      const country = typeof window !== 'undefined' ? (localStorage.getItem('detectedCountry') || 'EG') : 'EG';
      const endpoint = tab === 'login' ? '/api/users/login' : '/api/users/register';
      const body = tab === 'login'
        ? { email: email.trim(), password }
        : { email: email.trim(), password, name: name.trim(), country };
      const res = await axios.post(`${API}${endpoint}`, body, {
        headers: { 'Content-Type': 'application/json' },
        timeout: 15000
      });
      saveAndRedirect(res.data);
    } catch (e) {
      if (e.code === 'ECONNABORTED' || e.message?.includes('timeout')) {
        setError('انتهت مهلة الاتصال — تأكد من اتصالك بالإنترنت');
      } else if (e.response?.status === 401 || e.response?.status === 400) {
        setError(e.response.data?.error || 'بيانات خاطئة');
      } else if (e.response?.status === 403) {
        setError('هذا الحساب محظور');
      } else if (!e.response) {
        setError('لا يمكن الوصول للخادم — تأكد من اتصالك');
      } else {
        setError(e.response?.data?.error || 'حدث خطأ. حاول مجدداً');
      }
    }
    setLoading(false);
  }

  async function sendWhatsAppOTP() {
    if (!phone.trim()) { setError('أدخل رقم الواتساب مع كود الدولة مثل +201234567890'); return; }
    setOtpLoading(true); setError('');
    try {
      await axios.post(`${API}/api/users/send-otp`, { phone: phone.trim(), via: 'whatsapp' });
      setOtpSent(true);
      setSuccess('تم إرسال رمز التحقق على واتساب');
    } catch (e) { setError(e.response?.data?.error || 'فشل إرسال رمز واتساب'); }
    setOtpLoading(false);
  }

  async function verifyWhatsAppOTP() {
    if (!otp.trim()) { setError('أدخل الرمز المرسل'); return; }
    setLoading(true); setError('');
    try {
      const country = typeof window !== 'undefined' ? (localStorage.getItem('detectedCountry') || 'EG') : 'EG';
      const res = await axios.post(`${API}/api/users/verify-otp`, { phone: phone.trim(), otp: otp.trim(), country });
      saveAndRedirect(res.data);
    } catch (e) { setError(e.response?.data?.error || 'رمز خاطئ أو منتهي الصلاحية'); }
    setLoading(false);
  }

  function handleMicrosoft() {
    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '';
    if (!clientId) { setError('تسجيل الدخول بـ Microsoft غير مفعّل بعد'); return; }
    const redirect = encodeURIComponent(window.location.origin + '/auth/microsoft');
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirect}&scope=User.Read`;
  }

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #002f34 0%, #004d40 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui, sans-serif', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 24, padding: 36, width: '100%', maxWidth: 420, boxShadow: '0 20px 60px rgba(0,0,0,0.3)' }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <a href="/" style={{ textDecoration: 'none' }}>
            <div style={{ fontSize: 52, marginBottom: 8 }}>🛒</div>
            <h1 style={{ color: '#002f34', fontSize: 28, fontWeight: 'bold', margin: 0 }}>XTOX</h1>
            <p style={{ color: '#666', margin: '4px 0 0', fontSize: 14 }}>السوق المحلي الذكي</p>
          </a>
        </div>

        {/* Tab Selector */}
        {tab !== 'whatsapp' && (
          <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 12, padding: 4, marginBottom: 24 }}>
            {[['login','دخول'],['register','حساب جديد']].map(([t, label]) => (
              <button key={t} onClick={() => { setTab(t); setError(''); setSuccess(''); }}
                style={{ flex: 1, padding: '10px', borderRadius: 10, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 15, background: tab === t ? '#002f34' : 'transparent', color: tab === t ? 'white' : '#666', fontFamily: 'inherit' }}>
                {label}
              </button>
            ))}
          </div>
        )}

        {/* Success */}
        {success && (
          <div style={{ background: '#e8f8e8', border: '1px solid #00aa44', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#00aa44', fontSize: 14, textAlign: 'center' }}>
            ✅ {success}
          </div>
        )}

        {/* Error */}
        {error && (
          <div style={{ background: '#fff0f0', border: '1px solid #ffcccc', borderRadius: 10, padding: '10px 14px', marginBottom: 16, color: '#cc0000', fontSize: 14 }}>
            ⚠️ {error}
          </div>
        )}

        {/* WhatsApp Tab */}
        {tab === 'whatsapp' && (
          <div>
            <button onClick={() => { setTab('login'); setOtpSent(false); setError(''); setSuccess(''); }}
              style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16, fontFamily: 'inherit' }}>
              ← رجوع
            </button>
            <h2 style={{ color: '#002f34', marginBottom: 4 }}>دخول بـ واتساب</h2>
            <p style={{ color: '#666', fontSize: 13, marginBottom: 20 }}>سيصلك رمز تحقق على واتساب</p>
            {!otpSent ? (
              <div>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+201234567890"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '2px solid #ddd', fontSize: 16, marginBottom: 12, boxSizing: 'border-box', textAlign: 'left', direction: 'ltr' }} />
                <button onClick={sendWhatsAppOTP} disabled={otpLoading}
                  style={{ width: '100%', padding: '14px', background: '#25d366', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: otpLoading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {otpLoading ? 'جار الإرسال...' : '📨 إرسال رمز واتساب'}
                </button>
              </div>
            ) : (
              <div>
                <p style={{ color: '#25d366', fontWeight: 'bold', marginBottom: 12 }}>✅ تم الإرسال إلى {phone}</p>
                <input value={otp} onChange={e => setOtp(e.target.value)} type="number" placeholder="000000"
                  style={{ width: '100%', padding: '14px', borderRadius: 12, border: '2px solid #25d366', fontSize: 24, textAlign: 'center', marginBottom: 12, boxSizing: 'border-box', letterSpacing: 8, direction: 'ltr' }} />
                <button onClick={verifyWhatsAppOTP} disabled={loading}
                  style={{ width: '100%', padding: '14px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'جار التحقق...' : '✅ تأكيد الرمز'}
                </button>
                <button onClick={() => { setOtpSent(false); setOtp(''); setError(''); }}
                  style={{ width: '100%', marginTop: 10, padding: '12px', background: 'transparent', border: '1px solid #ddd', borderRadius: 12, cursor: 'pointer', color: '#666', fontSize: 14, fontFamily: 'inherit' }}>
                  إعادة الإرسال
                </button>
              </div>
            )}
          </div>
        )}

        {/* Main Form */}
        {tab !== 'whatsapp' && (
          <>
            {/* OAuth Buttons */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
              {/* Google */}
              {GOOGLE_CLIENT_ID ? (
                <div id="google-signin-btn" style={{ width: '100%', minHeight: 44, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {!googleReady && <span style={{ color: '#999', fontSize: 13 }}>جار تحميل Google...</span>}
                </div>
              ) : (
                <div style={{ padding: '12px', borderRadius: 10, border: '1px dashed #e0e0e0', background: '#fafafa', fontSize: 12, color: '#aaa', textAlign: 'center' }}>
                  Google Login — أضف NEXT_PUBLIC_GOOGLE_CLIENT_ID في Vercel Settings
                </div>
              )}

              {/* WhatsApp */}
              <button onClick={() => { setTab('whatsapp'); setError(''); setSuccess(''); }}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #25d366', background: '#25d366', color: 'white', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', fontWeight: 'bold' }}>
                <span style={{ fontSize: 22 }}>💬</span> المتابعة بـ واتساب
              </button>

              {/* Microsoft */}
              <button onClick={handleMicrosoft}
                style={{ width: '100%', padding: '12px', borderRadius: 12, border: '1px solid #0078d4', background: 'white', color: '#0078d4', cursor: 'pointer', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit', fontWeight: 'bold' }}>
                <span style={{ fontSize: 22 }}>🪟</span> المتابعة بـ Microsoft
              </button>
            </div>

            {/* Divider */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
              <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
              <span style={{ color: '#999', fontSize: 13 }}>أو بالبريد الإلكتروني</span>
              <div style={{ flex: 1, height: 1, background: '#e0e0e0' }} />
            </div>

            {/* Email Form */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              {tab === 'register' && (
                <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddd', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }} />
              )}
              <input value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني" type="email" autoComplete="email"
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddd', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box', direction: 'ltr', textAlign: 'left' }} />
              <input value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" type="password"
                autoComplete={tab === 'login' ? 'current-password' : 'new-password'}
                onKeyDown={e => e.key === 'Enter' && !loading && handleEmailAuth()}
                style={{ width: '100%', padding: '12px 14px', borderRadius: 12, border: '1px solid #ddd', fontSize: 15, fontFamily: 'inherit', boxSizing: 'border-box' }} />
            </div>

            <button onClick={handleEmailAuth} disabled={loading}
              style={{ width: '100%', marginTop: 16, padding: '14px', background: loading ? '#ccc' : '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
              {loading ? 'جار التحميل...' : tab === 'login' ? '🔐 دخول' : '✅ إنشاء حساب'}
            </button>

            <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20, lineHeight: 1.6 }}>
              بالمتابعة توافق على{' '}
              <a href="/terms" style={{ color: '#002f34' }}>شروط الاستخدام</a>
              {' '}و{' '}
              <a href="/privacy" style={{ color: '#002f34' }}>سياسة الخصوصية</a>
            </p>
          </>
        )}
      </div>
    </div>
  );
}
