'use client';
export const dynamic = 'force-dynamic';
import { useState } from 'react';
import Link from 'next/link';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

/**
 * /forgot-password — two-step password reset via OTP
 * Step 1: Enter email → receive OTP
 * Step 2: Enter OTP + new password → account updated
 */
export default function ForgotPasswordPage() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  async function handleSendOtp(e) {
    e.preventDefault();
    setError('');
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('يرجى إدخال بريد إلكتروني صحيح');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(API + '/api/auth/forgot-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'فشل إرسال رمز التحقق'); return; }
      setSuccess('تم إرسال رمز التحقق إلى ' + email);
      setStep(2);
    } catch {
      setError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  async function handleResetPassword(e) {
    e.preventDefault();
    setError('');
    if (!otp || otp.length !== 6) { setError('رمز التحقق يجب أن يكون 6 أرقام'); return; }
    if (!newPassword || newPassword.length < 8) { setError('كلمة المرور يجب أن تكون 8 أحرف على الأقل'); return; }
    if (newPassword !== confirmPassword) { setError('كلمتا المرور غير متطابقتين'); return; }
    setLoading(true);
    try {
      const res = await fetch(API + '/api/auth/reset-password/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim().toLowerCase(), otp: otp.trim(), newPassword }),
      });
      const data = await res.json();
      if (!res.ok) { setError(data.error || 'فشل إعادة تعيين كلمة المرور'); return; }
      setSuccess('تم تغيير كلمة المرور بنجاح! يمكنك الآن تسجيل الدخول.');
      setStep(3);
    } catch {
      setError('تعذر الاتصال بالخادم. يرجى المحاولة مرة أخرى.');
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    border: '1.5px solid #e5e7eb', fontSize: 16, outline: 'none',
    fontFamily: "'Cairo', sans-serif", boxSizing: 'border-box',
    direction: 'ltr',
  };
  const btnStyle = {
    width: '100%', padding: 13, borderRadius: 12, border: 'none',
    backgroundColor: '#FF6B35', color: '#fff', fontSize: 16, fontWeight: 700,
    cursor: loading ? 'not-allowed' : 'pointer', opacity: loading ? 0.7 : 1,
    fontFamily: "'Cairo', sans-serif",
  };

  return (
    <div dir="rtl" style={{ minHeight: '100vh', background: '#f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16, fontFamily: "'Cairo', 'Tajawal', sans-serif" }}>
      <div style={{ background: '#fff', borderRadius: 24, padding: 32, width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.1)' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <Link href="/">
            <span style={{ fontSize: 32, fontWeight: 900, color: '#FF6B35', letterSpacing: -1 }}>XTOX</span>
          </Link>
          <h1 style={{ margin: '8px 0 4px', fontSize: 20, fontWeight: 700, color: '#111' }}>
            {step === 1 ? 'نسيت كلمة المرور؟' : step === 2 ? 'إدخال رمز التحقق' : 'تمت العملية بنجاح'}
          </h1>
          <p style={{ margin: 0, color: '#6b7280', fontSize: 14 }}>
            {step === 1 && 'أدخل بريدك الإلكتروني لإرسال رمز التحقق'}
            {step === 2 && 'أدخل الرمز الذي أرسلناه إلى بريدك'}
            {step === 3 && 'تم تغيير كلمة المرور بنجاح'}
          </p>
        </div>

        {/* Progress dots */}
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginBottom: 24 }}>
          {[1, 2, 3].map(s => (
            <div key={s} style={{ width: s <= step ? 24 : 8, height: 8, borderRadius: 4, background: s <= step ? '#FF6B35' : '#e5e7eb', transition: 'all 0.3s' }} />
          ))}
        </div>

        {error && (
          <div style={{ background: '#fef2f2', color: '#dc2626', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
            {error}
          </div>
        )}
        {success && step !== 3 && (
          <div style={{ background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }}>
            {success}
          </div>
        )}

        {step === 1 && (
          <form onSubmit={handleSendOtp} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="email"
              placeholder="البريد الإلكتروني"
              value={email}
              onChange={e => setEmail(e.target.value)}
              style={inputStyle}
              required
            />
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'جاري الإرسال...' : 'إرسال رمز التحقق'}
            </button>
          </form>
        )}

        {step === 2 && (
          <form onSubmit={handleResetPassword} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            <input
              type="text"
              inputMode="numeric"
              placeholder="رمز التحقق (6 أرقام)"
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
              style={inputStyle}
              maxLength={6}
              required
            />
            <input
              type="password"
              placeholder="كلمة المرور الجديدة"
              value={newPassword}
              onChange={e => setNewPassword(e.target.value)}
              style={inputStyle}
              required
            />
            <input
              type="password"
              placeholder="تأكيد كلمة المرور الجديدة"
              value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              style={inputStyle}
              required
            />
            <button type="submit" disabled={loading} style={btnStyle}>
              {loading ? 'جاري التغيير...' : 'تغيير كلمة المرور'}
            </button>
            <button
              type="button"
              onClick={() => { setStep(1); setError(''); setSuccess(''); setOtp(''); setNewPassword(''); setConfirmPassword(''); }}
              style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: 13, fontFamily: 'inherit' }}
            >
              ← إعادة إرسال الرمز
            </button>
          </form>
        )}

        {step === 3 && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>✅</div>
            <p style={{ color: '#16a34a', fontWeight: 600, marginBottom: 24, fontSize: 16 }}>
              تم تغيير كلمة المرور بنجاح!
            </p>
            <Link href="/login" style={{ display: 'block', padding: 13, borderRadius: 12, background: '#FF6B35', color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 16, textAlign: 'center' }}>
              تسجيل الدخول
            </Link>
          </div>
        )}

        <p style={{ marginTop: 20, textAlign: 'center', fontSize: 13, color: '#9ca3af' }}>
          تتذكر كلمة المرور؟{' '}
          <Link href="/login" style={{ color: '#FF6B35', textDecoration: 'none', fontWeight: 600 }}>
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
