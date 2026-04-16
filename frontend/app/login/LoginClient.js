'use client';
import React from 'react';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
// GOOGLE_CLIENT_ID: GIS SDK removed — using redirect-based OAuth (see GET /api/auth/google)

/* -- helpers -- */
function storeSession(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', data.token);
  localStorage.setItem('xtoxId', (data.user && data.user.xtoxId) ? data.user.xtoxId : '');
  localStorage.setItem('xtoxEmail', (data.user && data.user.xtoxEmail) ? data.user.xtoxEmail : '');
  localStorage.setItem('userName', (data.user && data.user.name) ? data.user.name : '');
  localStorage.setItem('userId', (data.user && data.user.id) ? data.user.id : '');
  localStorage.setItem('userAvatar', (data.user && data.user.avatar) ? data.user.avatar : '');
  // Cache full user object with token so all components read it instantly on next navigation
  // without hitting the backend API on every page load (fixes memory lag / not-loading issues)
  if (data.user) {
    try {
      localStorage.setItem('user', JSON.stringify(Object.assign({}, data.user, { token: data.token })));
    } catch (_) {}
  }
}

export default function LoginClient() {
  var tabState = useState('whatsapp');
  var tab = tabState[0];
  var setTab = tabState[1];

  var phoneState = useState('');
  var phone = phoneState[0];
  var setPhone = phoneState[1];
  var emailState = useState('');
  var loginEmail = emailState[0];
  var setLoginEmail = emailState[1];

  var otpState = useState('');
  var otp = otpState[0];
  var setOtp = otpState[1];

  var otpSentState = useState(false);
  var otpSent = otpSentState[0];
  var setOtpSent = otpSentState[1];

  var loadingState = useState(false);
  var loading = loadingState[0];
  var setLoading = loadingState[1];

  var errorState = useState('');
  var error = errorState[0];
  var setError = errorState[1];

  var successState = useState('');
  var success = successState[0];
  var setSuccess = successState[1];

  var countdownState = useState(0);
  var countdown = countdownState[0];
  var setCountdown = countdownState[1];

  /* ── Auto-redirect & URL token handling ─────────────────────── */
  useEffect(function() {
    if (typeof window === 'undefined') return;
    try {
      var params = new URLSearchParams(window.location.search);
      var redirectTo = params.get('redirect') || '/';

      // Handle Google OAuth redirect callback — full session data encoded as base64url
      var sessionParam = params.get('session');
      if (sessionParam) {
        try {
          // base64url → base64 decode
          var b64 = sessionParam.replace(/-/g, '+').replace(/_/g, '/');
          var pad = b64.length % 4;
          if (pad) b64 += '===='.slice(0, 4 - pad);
          var sessionData = JSON.parse(atob(b64));
          storeSession(sessionData);
          window.location.href = redirectTo;
          return;
        } catch (_) {}
      }

      // Handle Google OAuth error codes
      var errorParam = params.get('error');
      if (errorParam) {
        var errorMessages = {
          google_cancelled: 'تم إلغاء تسجيل الدخول بـ Google.',
          account_suspended: 'هذا الحساب موقوف بشكل دائم.',
          db_unavailable: 'الخدمة غير متاحة مؤقتاً. حاول مجدداً.',
          google_not_configured: 'تسجيل الدخول بـ Google غير مهيأ بعد.',
          google_failed: 'فشل تسجيل الدخول بـ Google.',
          google_timeout: 'انتهت مهلة الاتصال بـ Google. حاول مجدداً.',
          google_unverified: 'البريد الإلكتروني لـ Google غير مؤكد.',
          db_error: 'خطأ في قاعدة البيانات. حاول مجدداً.'
        };
        setError(errorMessages[errorParam] || 'حدث خطأ. حاول مجدداً.');
        // Clean URL without redirect
        try { window.history.replaceState({}, '', '/login'); } catch (_) {}
        return;
      }

      // Legacy: token passed directly in URL (backward compat)
      var urlToken = params.get('token');
      if (urlToken) {
        localStorage.setItem('token', urlToken);
        window.location.href = redirectTo;
        return;
      }

      // If user is already logged in, redirect to intended page
      var existingToken = localStorage.getItem('token');
      if (existingToken) {
        window.location.href = redirectTo;
        return;
      }
    } catch (e) {
      // localStorage might be unavailable (private mode, etc.)
    }
  }, []);

  /* ── Helper: get post-login redirect URL ──────────────────────── */
  function getRedirectUrl() {
    if (typeof window === 'undefined') return '/';
    var params = new URLSearchParams(window.location.search);
    return params.get('redirect') || '/';
  }

  /* OTP resend countdown */
  useEffect(function() {
    if (countdown <= 0) return;
    var t = setTimeout(function() { setCountdown(countdown - 1); }, 1000);
    return function() { clearTimeout(t); };
  }, [countdown]);

  /* Google Identity SDK removed — using redirect-based OAuth (mobile-safe).
     The GIS popup/FedCM flow is blocked on iOS Safari and older Android Chrome.
     The button below is a plain <a> link to the backend redirect endpoint. */

  /* -- Email OTP (replaces WhatsApp OTP) -- */
  async function sendOtp() {
    setError('');
    // Use email if tab is 'email', otherwise phone
    var isEmailTab = tab === 'email' || tab === 'whatsapp'; // both now use email
    var emailValue = loginEmail.trim().toLowerCase();
    var phoneValue = phone.trim() ? ('+' + phone.replace(/\D/g, '')) : '';
    if (!emailValue && !phoneValue) {
      setError('يرجى إدخال البريد الإلكتروني');
      return;
    }
    if (emailValue && !/^[^@]+@[^@]+\.[^@]+$/.test(emailValue)) {
      setError('البريد الإلكتروني غير صحيح');
      return;
    }
    setLoading(true);
    try {
      var res = await fetch(API + '/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailValue || undefined, phone: phoneValue || undefined })
      });
      var data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send OTP'); return; }
      setOtpSent(true);
      setCountdown(60);
      setSuccess('تم إرسال رمز التحقق إلى بريدك الإلكتروني');
    } catch (e) {
      setError('Network error. Check your connection.');
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    if (!otp || otp.length !== 6) { setError('Enter the 6-digit OTP'); return; }
    setLoading(true);
    try {
      var cleanedEmail = loginEmail.trim().toLowerCase();
      var cleanedPhone = phone.trim() ? ('+' + phone.replace(/\D/g, '')) : '';
      var res = await fetch(API + '/api/auth/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: cleanedEmail || undefined, phone: cleanedPhone || undefined, otp: otp })
      });
      var data = await res.json();
      if (!res.ok) { setError(data.error || 'Verification failed'); return; }
      storeSession(data);
      var xtoxIdVal = (data.user && data.user.xtoxId) ? data.user.xtoxId : '';
      setSuccess('Welcome! Your XTOX ID: ' + xtoxIdVal);
      setTimeout(function() { window.location.href = getRedirectUrl(); }, 1500);
    } catch (e) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  /* -- Google redirect flow -- */
  function getGoogleLoginUrl() {
    var redirectParam = encodeURIComponent(getRedirectUrl());
    return API + '/api/auth/google?redirect=' + redirectParam;
  }

  /* -- Styles -- */
  var inputStyle = {
    width: '100%', padding: '12px 16px', borderRadius: 12,
    border: '1.5px solid #e5e7eb', fontSize: 16, outline: 'none',
    fontFamily: "'Cairo', sans-serif", boxSizing: 'border-box',
    direction: 'ltr'
  };
  var btnStyle = {
    width: '100%', padding: '13px', borderRadius: 12, border: 'none',
    backgroundColor: '#25D366', color: '#fff', fontSize: 16, fontWeight: 700,
    cursor: 'pointer', fontFamily: "'Cairo', sans-serif"
  };
  function tabStyle(active) {
    return {
      flex: 1, padding: '10px 0', border: 'none', borderRadius: 10,
      backgroundColor: active ? '#fff' : 'transparent',
      color: active ? '#111' : '#6b7280', fontWeight: active ? 700 : 400,
      cursor: 'pointer', fontSize: 14, fontFamily: "'Cairo', sans-serif",
      boxShadow: active ? '0 1px 4px rgba(0,0,0,0.1)' : 'none',
      transition: 'all 0.2s'
    };
  }

  var resendLabel = countdown > 0
    ? ('إعادة الإرسال بعد ' + countdown + ' ث')
    : 'إعادة إرسال الرمز';

  return (
    React.createElement('div', {
      dir: 'rtl', lang: 'ar',
      style: {
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: '#f3f4f6', fontFamily: "'Cairo', 'Tajawal', sans-serif", padding: 16
      }
    },
      React.createElement('div', {
        style: {
          background: '#fff', borderRadius: 24, padding: 32,
          width: '100%', maxWidth: 420, boxShadow: '0 8px 40px rgba(0,0,0,0.1)'
        }
      },
        /* Logo */
        React.createElement('div', { style: { textAlign: 'center', marginBottom: 24 } },
          React.createElement(Link, { href: '/' },
            React.createElement('span', { style: { fontSize: 32, fontWeight: 900, color: '#FF6B35', letterSpacing: -1 } }, 'XTOX')
          ),
          React.createElement('p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: 14 } }, 'سوق الإعلانات العربي')
        ),

        /* Tabs */
        React.createElement('div', {
          style: { display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 }
        },
          React.createElement('button', { style: tabStyle(tab === 'whatsapp'), onClick: function() { setTab('whatsapp'); setError(''); } }, '✉️ بريد إلكتروني'),
          React.createElement('button', { style: tabStyle(tab === 'google'), onClick: function() { setTab('google'); setError(''); } }, '🔵 Google'),
        ),

        /* Error */
        error ? React.createElement('div', {
          style: { background: '#fef2f2', color: '#dc2626', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }
        }, error) : null,

        /* Success */
        success ? React.createElement('div', {
          style: { background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }
        }, success) : null,

        /* WhatsApp Tab */
        tab === 'whatsapp' ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          React.createElement('p', { style: { margin: '0 0 8px', fontSize: 14, color: '#374151' } },
            'أدخل رقم هاتفك وسيصلك رمز تحقق على واتساب'
          ),
          !otpSent
            ? React.createElement('form', { onSubmit: function(e) { e.preventDefault(); sendOtp(); }, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                React.createElement('input', {
                  id: 'login-email', name: 'login-email',
                  type: 'email', placeholder: 'example@gmail.com', value: loginEmail,
                  onChange: function(e) { setLoginEmail(e.target.value); },
                  style: inputStyle
                }),
                React.createElement('button', { type: 'submit', disabled: loading, style: btnStyle },
                  loading ? '...' : 'إرسال رمز واتساب'
                )
              )
            : React.createElement('form', { onSubmit: function(e) { e.preventDefault(); verifyOtp(); }, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                React.createElement('input', {
                  id: 'login-email', name: 'login-email',
                  type: 'email', placeholder: 'example@gmail.com', value: loginEmail,
                  onChange: function(e) { setLoginEmail(e.target.value); },
                  style: inputStyle, disabled: true
                }),
                React.createElement('input', {
                  type: 'number', placeholder: 'رمز التحقق (6 أرقام)',
                  value: otp, onChange: function(e) { setOtp(e.target.value.slice(0, 6)); },
                  style: inputStyle, maxLength: 6
                }),
                React.createElement('button', { type: 'submit', disabled: loading, style: btnStyle },
                  loading ? '...' : 'تحقق وتسجيل الدخول'
                ),
                React.createElement('button', {
                  type: 'button',
                  onClick: function() { if (countdown === 0) { setOtpSent(false); setOtp(''); sendOtp(); } },
                  disabled: countdown > 0,
                  style: { background: 'none', border: 'none', color: countdown > 0 ? '#9ca3af' : '#FF6B35', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: 13, fontFamily: 'inherit' }
                }, resendLabel)
              )
        ) : null,

        /* Google Tab — redirect-based (works on iOS Safari + all mobile browsers) */
        tab === 'google' ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' } },
          React.createElement('p', { style: { margin: '0 0 8px', fontSize: 14, color: '#374151', textAlign: 'center' } },
            'سجّل الدخول بحساب Google الحقيقي'
          ),
          React.createElement('a', {
            href: getGoogleLoginUrl(),
            style: {
              width: '100%', padding: 13, borderRadius: 12,
              border: '1.5px solid #e5e7eb', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit',
              textDecoration: 'none', color: '#111', boxSizing: 'border-box'
            }
          },
            React.createElement('img', { src: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg', width: 22, height: 22, alt: 'Google' }),
            'تسجيل الدخول بـ Google'
          ),
          React.createElement('p', { style: { fontSize: 12, color: '#9ca3af', margin: 0, textAlign: 'center' } },
            'ستُحال إلى صفحة Google لتسجيل الدخول'
          )
        ) : null,

        /* Footer */
        React.createElement('p', { style: { marginTop: 24, textAlign: 'center', fontSize: 12, color: '#9ca3af' } },
          'بتسجيل الدخول أنت توافق على ',
          React.createElement(Link, { href: '/terms', style: { color: '#FF6B35' } }, 'الشروط والأحكام'),
          ' و',
          React.createElement(Link, { href: '/privacy', style: { color: '#FF6B35' } }, 'سياسة الخصوصية')
        )
      )
    )
  );
}
