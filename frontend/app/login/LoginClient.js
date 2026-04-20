'use client';
import React from 'react';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useLanguage } from '../context/LanguageContext';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

/* -- helpers -- */
// Store JWT in IndexedDB so the Service Worker can read it for background presence pings
function storeTokenForSW(token) {
  try {
    if (typeof indexedDB === 'undefined') return;
    var req = indexedDB.open('xtox-auth', 1);
    req.onupgradeneeded = function(e) {
      e.target.result.createObjectStore('tokens');
    };
    req.onsuccess = function(e) {
      var db = e.target.result;
      var tx = db.transaction('tokens', 'readwrite');
      tx.objectStore('tokens').put(token, 'jwt');
    };
  } catch (e) {}
}

function clearStoredToken() {
  try { if (typeof indexedDB !== 'undefined') indexedDB.deleteDatabase('xtox-auth'); } catch (_) {}
}

// #149: Canonical key = xtox_token; also write 'token' for legacy page compatibility
function storeSession(data) {
  if (typeof window === 'undefined') return;
  // PRIMARY key: xtox_token
  localStorage.setItem('xtox_token', data.token);
  // LEGACY fallback key: token (so pages not yet migrated still work)
  localStorage.setItem('token', data.token);
  storeTokenForSW(data.token);  // #150: Store in IDB for SW background sync
  var u = data.user || {};
  localStorage.setItem('xtoxId',    (u.xtoxId    || ''));
  localStorage.setItem('xtoxEmail', (u.xtoxEmail || ''));
  localStorage.setItem('userName',  (u.name      || ''));
  localStorage.setItem('userId',    (u.id        || ''));
  localStorage.setItem('userAvatar',(u.avatar    || ''));
  if (u.country) localStorage.setItem('country', u.country);
  try {
    localStorage.setItem('user', JSON.stringify(Object.assign({}, u, { token: data.token })));
  } catch (_) {}
}

export default function LoginClient() {
  const { language, isRTL, t } = useLanguage();

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
          var b64 = sessionParam.replace(/-/g, '+').replace(/_/g, '/');
          var pad = b64.length % 4;
          if (pad) b64 += '===='.slice(0, 4 - pad);
          var sessionData = JSON.parse(atob(b64));
          storeSession(sessionData);  // uses xtox_token as primary key
          window.location.href = redirectTo;
          return;
        } catch (_) {}
      }

      // Handle Google OAuth error codes
      var errorParam = params.get('error');
      if (errorParam) {
        var errorKeys = {
          google_cancelled: 'google_cancelled',
          account_suspended: 'account_suspended',
          db_unavailable: 'db_unavailable',
          google_not_configured: 'google_not_configured',
          google_failed: 'google_failed',
          google_timeout: 'google_timeout',
          google_unverified: 'google_unverified',
          db_error: 'db_error',
        };
        setError(errorKeys[errorParam] || 'err_default');
        try { window.history.replaceState({}, '', '/login'); } catch (_) {}
        return;
      }

      // Legacy: ?token=... in URL (#149 fix: also write xtox_token)
      var urlToken = params.get('token');
      if (urlToken) {
        localStorage.setItem('xtox_token', urlToken);
        localStorage.setItem('token', urlToken);
        storeTokenForSW(urlToken);   // #150
        window.location.href = redirectTo;
        return;
      }

      // #152: Check if existing token is present AND not expired before redirecting
      var existingToken = localStorage.getItem('xtox_token') || localStorage.getItem('token');
      if (existingToken) {
        // Basic expiry check — if expired, clear and stay on login page
        try {
          var parts = existingToken.split('.');
          if (parts.length === 3) {
            var pl = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
            if (pl.exp && pl.exp * 1000 < Date.now()) {
              // Token expired — clean up
              clearStoredToken();
              ['xtox_token', 'token', 'fox_token', 'user', 'userId', 'userName', 'userAvatar', 'xtoxId', 'xtoxEmail'].forEach(function(k) {
                try { localStorage.removeItem(k); } catch (_) {}
              });
              return;  // stay on login page
            }
          }
        } catch (_) {}
        window.location.href = redirectTo;
      }
    } catch (e) {}
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
    var timer = setTimeout(function() { setCountdown(countdown - 1); }, 1000);
    return function() { clearTimeout(timer); };
  }, [countdown]);

  /* -- Email OTP -- */
  async function sendOtp() {
    setError('');
    var emailValue = loginEmail.trim().toLowerCase();
    var phoneValue = phone.trim() ? ('+' + phone.replace(/\D/g, '')) : '';
    if (!emailValue && !phoneValue) {
      setError(t('login_otp_invalid'));
      return;
    }
    if (emailValue && !/^[^@]+@[^@]+\.[^@]+$/.test(emailValue)) {
      setError(t('login_email_invalid'));
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
      if (!res.ok) { setError(data.error || t('login_error_try_again')); return; }
      setOtpSent(true);
      setCountdown(60);
      setSuccess(t('login_otp_sent'));
    } catch (e) {
      setError(t('login_network_err'));
    } finally {
      setLoading(false);
    }
  }

  async function verifyOtp() {
    setError('');
    if (!otp || otp.length !== 6) { setError(t('login_otp_digits')); return; }
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
      if (!res.ok) { setError(data.error || t('login_error_try_again')); return; }

      // #151: Complete onboarding pipeline
      // 1+2. localStorage (xtox_token + legacy token + user)
      storeSession(data);
      // 3. IndexedDB already done inside storeSession via storeTokenForSW

      var xtoxIdVal = (data.user && data.user.xtoxId) ? data.user.xtoxId : '';
      setSuccess(t('login_welcome') + xtoxIdVal);
      setTimeout(function() { window.location.href = getRedirectUrl(); }, 1200);
    } catch (e) {
      setError(t('login_network_err2'));
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
  var dir = isRTL ? 'rtl' : 'ltr';
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
    ? (t('login_resend_countdown') + ' ' + countdown + ' ث')
    : t('login_resend');

  // Resolve error key to translated message
  var displayError = error ? (t(error) !== error ? t(error) : error) : '';

  return (
    React.createElement('div', {
      dir: dir, lang: language,
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
          React.createElement('p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: 14 } }, t('login_subtitle'))
        ),

        /* Tabs */
        React.createElement('div', {
          style: { display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 }
        },
          React.createElement('button', { style: tabStyle(tab === 'whatsapp'), onClick: function() { setTab('whatsapp'); setError(''); } },
            '✉️ ' + t('login_tab_whatsapp')
          ),
          React.createElement('button', { style: tabStyle(tab === 'google'), onClick: function() { setTab('google'); setError(''); } },
            '🔵 ' + t('login_tab_google')
          ),
        ),

        /* Error */
        displayError ? React.createElement('div', {
          style: { background: '#fef2f2', color: '#dc2626', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }
        }, displayError) : null,

        /* Success */
        success ? React.createElement('div', {
          style: { background: '#f0fdf4', color: '#16a34a', borderRadius: 10, padding: '10px 14px', marginBottom: 16, fontSize: 14 }
        }, success) : null,

        /* Email Tab */
        tab === 'whatsapp' ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12 } },
          React.createElement('p', { style: { margin: '0 0 8px', fontSize: 14, color: '#374151' } },
            t('login_enter_email_prompt')
          ),
          !otpSent
            ? React.createElement('form', { onSubmit: function(e) { e.preventDefault(); sendOtp(); }, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                React.createElement('input', {
                  id: 'login-email', name: 'login-email',
                  type: 'email', placeholder: t('login_email_placeholder'), value: loginEmail,
                  onChange: function(e) { setLoginEmail(e.target.value); },
                  style: inputStyle
                }),
                React.createElement('button', { type: 'submit', disabled: loading, style: btnStyle },
                  loading ? '...' : t('login_send_otp')
                )
              )
            : React.createElement('form', { onSubmit: function(e) { e.preventDefault(); verifyOtp(); }, style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                React.createElement('input', {
                  id: 'login-email', name: 'login-email',
                  type: 'email', placeholder: t('login_email_placeholder'), value: loginEmail,
                  onChange: function(e) { setLoginEmail(e.target.value); },
                  style: inputStyle, disabled: true
                }),
                React.createElement('input', {
                  type: 'number', placeholder: t('login_otp_placeholder'),
                  value: otp, onChange: function(e) { setOtp(e.target.value.slice(0, 6)); },
                  style: inputStyle, maxLength: 6
                }),
                React.createElement('button', { type: 'submit', disabled: loading, style: btnStyle },
                  loading ? '...' : t('login_verify')
                ),
                React.createElement('button', {
                  type: 'button',
                  onClick: function() { if (countdown === 0) { setOtpSent(false); setOtp(''); sendOtp(); } },
                  disabled: countdown > 0,
                  style: { background: 'none', border: 'none', color: countdown > 0 ? '#9ca3af' : '#FF6B35', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: 13, fontFamily: 'inherit' }
                }, resendLabel)
              )
        ) : null,

        /* Google Tab */
        tab === 'google' ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' } },
          React.createElement('p', { style: { margin: '0 0 8px', fontSize: 14, color: '#374151', textAlign: 'center' } },
            t('login_google_desc')
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
            t('login_continue_google')
          ),
          React.createElement('p', { style: { fontSize: 12, color: '#9ca3af', margin: 0, textAlign: 'center' } },
            t('login_google_redirect')
          )
        ) : null,

        /* Forgot password link */
        React.createElement('p', { style: { textAlign: 'center', marginTop: 16, fontSize: 13, color: '#6b7280' } },
          React.createElement(Link, { href: '/forgot-password', style: { color: '#FF6B35', textDecoration: 'none' } },
            t('login_forgot_password') || 'نسيت كلمة المرور؟'
          )
        ),

        /* Footer */
        React.createElement('p', { style: { marginTop: 16, textAlign: 'center', fontSize: 12, color: '#9ca3af' } },
          t('login_terms_prefix'),
          React.createElement(Link, { href: '/terms', style: { color: '#FF6B35' } }, t('login_terms')),
          t('login_and'),
          React.createElement(Link, { href: '/privacy', style: { color: '#FF6B35' } }, t('login_privacy'))
        )
      )
    )
  );
}
