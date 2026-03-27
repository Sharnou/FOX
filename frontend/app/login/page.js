'use client';
import { useState, useEffect } from 'react';
import axios from 'axios';

const API = process.env.NEXT_PUBLIC_API_URL || '';
const GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

export default function LoginPage() {
  const [tab, setTab] = useState('login');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otpLoading, setOtpLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (GOOGLE_CLIENT_ID) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.onload = () => {
        window.google?.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleResponse });
        window.google?.accounts.id.renderButton(
          document.getElementById('google-btn'),
          { theme: 'outline', size: 'large', width: '100%', text: 'continue_with' }
        );
      };
      document.head.appendChild(script);
    }
  }, []);

  async function handleGoogleResponse(response) {
    setLoading(true);
    try {
      const country = localStorage.getItem('detectedCountry') || 'EG';
      const res = await axios.post(`${API}/api/users/auth/google`, { idToken: response.credential, country });
      saveAndRedirect(res.data);
    } catch { setError('Google login failed'); }
    setLoading(false);
  }

  function saveAndRedirect(data) {
    localStorage.setItem('token', data.token);
    localStorage.setItem('userId', data.user.id);
    localStorage.setItem('user', JSON.stringify(data.user));
    localStorage.setItem('country', data.user.country);
    window.location.href = (data.user.role === 'admin' || data.user.role === 'sub_admin') ? '/admin' : '/';
  }

  async function handleEmailAuth() {
    setError(''); setLoading(true);
    try {
      const endpoint = tab === 'login' ? '/api/users/login' : '/api/users/register';
      const body = tab === 'login' ? { email, password } : { email, password, name, country: localStorage.getItem('detectedCountry') || 'EG' };
      const res = await axios.post(`${API}${endpoint}`, body);
      saveAndRedirect(res.data);
    } catch (e) { setError(e.response?.data?.error || 'فشل تسجيل الدخول'); }
    setLoading(false);
  }

  function handleMicrosoft() {
    const clientId = process.env.NEXT_PUBLIC_MICROSOFT_CLIENT_ID || '';
    if (!clientId) { alert('Microsoft login not configured'); return; }
    const redirect = encodeURIComponent(window.location.origin + '/auth/microsoft');
    window.location.href = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=token&redirect_uri=${redirect}&scope=User.Read`;
  }


  async function sendWhatsAppOTP() {
    if (!phone) { setError('أدخل رقم الواتساب'); return; }
    setOtpLoading(true); setError('');
    try {
      await axios.post(`${API}/api/users/send-otp`, { phone, via: 'whatsapp' });
      setOtpSent(true);
    } catch (e) { setError(e.response?.data?.error || 'فشل إرسال الرمز'); }
    setOtpLoading(false);
  }

  async function verifyWhatsAppOTP() {
    if (!otp) { setError('أدخل رمز التحقق'); return; }
    setLoading(true); setError('');
    try {
      const country = typeof window !== 'undefined' ? (localStorage.getItem('detectedCountry') || 'EG') : 'EG';
      const res = await axios.post(`${API}/api/users/verify-otp`, { phone, otp, country });
      saveAndRedirect(res.data);
    } catch (e) { setError(e.response?.data?.error || 'رمز خاطئ'); }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f5f5f5', display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: 'system-ui', padding: 16 }}>
      <div style={{ background: 'white', borderRadius: 20, padding: 36, width: '100%', maxWidth: 400, boxShadow: '0 4px 24px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{ fontSize: 48 }}>🛒</div>
          <h1 style={{ color: '#002f34', fontSize: 26, fontWeight: 'bold', margin: '8px 0 4px' }}>XTOX</h1>
          <p style={{ color: '#666', fontSize: 14 }}>السوق المحلي الذكي</p>
        </div>

        <div style={{ display: 'flex', background: '#f0f0f0', borderRadius: 10, padding: 4, marginBottom: 24 }}>
          {['login', 'register'].map(t => (
            <button key={t} onClick={() => setTab(t)}
              style={{ flex: 1, padding: '8px', borderRadius: 8, border: 'none', cursor: 'pointer', fontWeight: 'bold', fontSize: 14, background: tab === t ? '#002f34' : 'transparent', color: tab === t ? 'white' : '#666', fontFamily: 'inherit' }}>
              {t === 'login' ? 'تسجيل الدخول' : 'حساب جديد'}
            </button>
          ))}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 10, marginBottom: 20 }}>
          {GOOGLE_CLIENT_ID ? (
            <div id="google-btn" style={{ width: '100%' }} />
          ) : (
            <button onClick={() => alert('Add NEXT_PUBLIC_GOOGLE_CLIENT_ID to Vercel env vars')}
              style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }}>
              🔵 المتابعة بـ Google
            </button>
          )}
          <button onClick={handleMicrosoft}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #ddd', background: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }}>
            🪟 المتابعة بـ Microsoft
          </button>
          <button onClick={() => setTab('whatsapp')}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #25d366', background: '#25d366', color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }}>
            💬 التسجيل بـ واتساب
          </button>
          <button onClick={() => alert('Apple Sign In requires iOS/macOS app.')}
            style={{ width: '100%', padding: '12px', borderRadius: 10, border: '1px solid #000', background: '#000', color: 'white', cursor: 'pointer', fontSize: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, fontFamily: 'inherit' }}>
            🍎 المتابعة بـ Apple
          </button>
        </div>


        {/* WhatsApp Login Tab */}
        {tab === 'whatsapp' && (
          <div style={{ marginBottom: 20 }}>
            <div style={{ background: '#e8fef0', border: '1px solid #25d366', borderRadius: 12, padding: '12px 16px', marginBottom: 16, fontSize: 13, color: '#1a7a3e' }}>
              💬 سيصلك رمز تحقق على واتساب
            </div>
            {!otpSent ? (
              <>
                <input value={phone} onChange={e => setPhone(e.target.value)} type="tel" placeholder="+201234567890"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, marginBottom: 12, boxSizing: 'border-box' }} />
                <button onClick={sendWhatsAppOTP} disabled={otpLoading}
                  style={{ width: '100%', padding: '12px', background: '#25d366', color: 'white', border: 'none', borderRadius: 10, fontWeight: 'bold', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {otpLoading ? 'جار الإرسال...' : '📨 إرسال رمز واتساب'}
                </button>
              </>
            ) : (
              <>
                <p style={{ color: '#666', fontSize: 13, marginBottom: 12 }}>تم إرسال رمز التحقق إلى {phone} عبر واتساب</p>
                <input value={otp} onChange={e => setOtp(e.target.value)} type="number" placeholder="123456"
                  style={{ width: '100%', padding: '12px 14px', borderRadius: 10, border: '1px solid #25d366', fontSize: 20, textAlign: 'center', marginBottom: 12, boxSizing: 'border-box', letterSpacing: 8 }} />
                <button onClick={verifyWhatsAppOTP} disabled={loading}
                  style={{ width: '100%', padding: '12px', background: '#002f34', color: 'white', border: 'none', borderRadius: 10, fontWeight: 'bold', fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
                  {loading ? 'جار التحقق...' : '✅ تأكيد'}
                </button>
                <button onClick={() => { setOtpSent(false); setOtp(''); }}
                  style={{ width: '100%', marginTop: 8, padding: '10px', background: 'transparent', color: '#666', border: '1px solid #ddd', borderRadius: 10, cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
                  إعادة الإرسال
                </button>
              </>
            )}
            <button onClick={() => { setTab('login'); setOtpSent(false); }}
              style={{ width: '100%', marginTop: 8, padding: '10px', background: 'transparent', color: '#002f34', border: 'none', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
              ← رجوع للدخول بالبريد
            </button>
          </div>
        )}

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 20 }}>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
          <span style={{ color: '#999', fontSize: 13 }}>أو بالبريد الإلكتروني</span>
          <div style={{ flex: 1, height: 1, background: '#eee' }} />
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {tab === 'register' && (
            <input value={name} onChange={e => setName(e.target.value)} placeholder="الاسم الكامل"
              style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, fontFamily: 'inherit' }} />
          )}
          <input value={email} onChange={e => setEmail(e.target.value)} placeholder="البريد الإلكتروني" type="email"
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, fontFamily: 'inherit' }} />
          <input value={password} onChange={e => setPassword(e.target.value)} placeholder="كلمة المرور" type="password"
            onKeyDown={e => e.key === 'Enter' && handleEmailAuth()}
            style={{ padding: '12px 14px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, fontFamily: 'inherit' }} />
        </div>

        {error && <p style={{ color: '#e44', fontSize: 13, marginTop: 10, textAlign: 'center' }}>{error}</p>}

        <button onClick={handleEmailAuth} disabled={loading}
          style={{ width: '100%', marginTop: 16, padding: '14px', background: '#002f34', color: 'white', border: 'none', borderRadius: 12, fontWeight: 'bold', fontSize: 16, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit' }}>
          {loading ? 'جار التحميل...' : tab === 'login' ? 'دخول' : 'إنشاء حساب'}
        </button>

        <p style={{ textAlign: 'center', color: '#999', fontSize: 12, marginTop: 20 }}>
          بالمتابعة توافق على شروط الاستخدام وسياسة الخصوصية
        </p>
      </div>
    </div>
  );
}
