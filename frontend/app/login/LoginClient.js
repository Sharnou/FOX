'use client';
import React from 'react';
export const dynamic = 'force-dynamic';
import { useState, useEffect } from 'react';
import Link from 'next/link';

var API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
var GOOGLE_CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || '';

/* -- helpers -- */
function storeSession(data) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('token', data.token);
  localStorage.setItem('xtoxId', (data.user && data.user.xtoxId) ? data.user.xtoxId : '');
  localStorage.setItem('xtoxEmail', (data.user && data.user.xtoxEmail) ? data.user.xtoxEmail : '');
  localStorage.setItem('userName', (data.user && data.user.name) ? data.user.name : '');
  localStorage.setItem('userId', (data.user && data.user.id) ? data.user.id : '');
  localStorage.setItem('userAvatar', (data.user && data.user.avatar) ? data.user.avatar : '');
}

export default function LoginClient() {
  var tabState = useState('whatsapp');
  var tab = tabState[0];
  var setTab = tabState[1];

  var phoneState = useState('');
  var phone = phoneState[0];
  var setPhone = phoneState[1];

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
      // If a token arrives via URL (Google OAuth callback redirect), store it
      var params = new URLSearchParams(window.location.search);
      var urlToken = params.get('token');
      if (urlToken) {
        localStorage.setItem('token', urlToken);
        window.location.href = '/';
        return;
      }
      // If user is already logged in, redirect to home
      var existingToken = localStorage.getItem('token');
      if (existingToken) {
        window.location.href = '/';
        return;
      }
    } catch (e) {
      // localStorage might be unavailable (private mode, etc.)
    }
  }, []);

  /* OTP resend countdown */
  useEffect(function() {
    if (countdown <= 0) return;
    var t = setTimeout(function() { setCountdown(countdown - 1); }, 1000);
    return function() { clearTimeout(t); };
  }, [countdown]);

  /* Load Google Identity SDK */
  useEffect(function() {
    if (!GOOGLE_CLIENT_ID) return;
    var script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.onload = function() {
      if (window.google && window.google.accounts) {
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: handleGoogleCredential,
          auto_select: false,
          use_fedcm_for_prompt: true
        });
      }
    };
    document.head.appendChild(script);
  }, []);

  /* -- WhatsApp OTP -- */
  async function sendOtp() {
    setError('');
    var cleaned = '+' + phone.replace(/\D/g, '');
    if (cleaned.length < 10) {
      setError('Enter your full phone number with country code e.g. +201234567890');
      return;
    }
    setLoading(true);
    try {
      var res = await fetch(API + '/api/auth/whatsapp/send-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned })
      });
      var data = await res.json();
      if (!res.ok) { setError(data.error || 'Failed to send OTP'); return; }
      setOtpSent(true);
      setCountdown(60);
      setSuccess('OTP sent to your WhatsApp!');
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
      var cleaned = '+' + phone.replace(/\D/g, '');
      var res = await fetch(API + '/api/auth/whatsapp/verify-otp', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleaned, otp: otp })
      });
      var data = await res.json();
      if (!res.ok) { setError(data.error || 'Verification failed'); return; }
      storeSession(data);
      var xtoxIdVal = (data.user && data.user.xtoxId) ? data.user.xtoxId : '';
      setSuccess('Welcome! Your XTOX ID: ' + xtoxIdVal);
      setTimeout(function() { window.location.href = '/'; }, 1500);
    } catch (e) {
      setError('Network error.');
    } finally {
      setLoading(false);
    }
  }

  /* -- Google -- */
  function handleGoogleLogin() {
    if (!window.google || !window.google.accounts) {
      setError('Google SDK not loaded. Try refreshing.');
      return;
    }
    // FedCM compatible: no moment-type callbacks (isDisplayMoment/isSkippedMoment/isNotDisplayed
    // are deprecated when use_fedcm_for_prompt: true is set)
    window.google.accounts.id.prompt();
  }

  // Render Google button when Google tab becomes active
  useEffect(function() {
    if (tab !== 'google') return;
    if (typeof window === 'undefined') return;
    if (!window.google || !window.google.accounts) return;
    var btn = document.getElementById('google-signin-btn');
    if (btn) {
      window.google.accounts.id.renderButton(btn, { theme: 'outline', size: 'large', width: '100%' });
    }
  }, [tab]);

  async function handleGoogleCredential(response) {
    setError('');
    setLoading(true);
    try {
      var res = await fetch(API + '/api/auth/google', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential: response.credential })
      });
      var data = await res.json();
      if (!res.ok) { setError(data.error || 'Google login failed'); setLoading(false); return; }
      storeSession(data);
      var xtoxIdVal = (data.user && data.user.xtoxId) ? data.user.xtoxId : '';
      setSuccess('Welcome! Your XTOX ID: ' + xtoxIdVal);
      setTimeout(function() { window.location.href = '/'; }, 1500);
    } catch (e) {
      setError('Google login failed.');
    } finally {
      setLoading(false);
    }
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
    ? ('\u0625\u0639\u0627\u062f\u0629 \u0627\u0644\u0625\u0631\u0633\u0627\u0644 \u0628\u0639\u062f ' + countdown + ' \u062b')
    : '\u0625\u0639\u0627\u062f\u0629 \u0625\u0631\u0633\u0627\u0644 \u0627\u0644\u0631\u0645\u0632';

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
          React.createElement('p', { style: { margin: '4px 0 0', color: '#6b7280', fontSize: 14 } }, '\u0633\u0648\u0642 \u0627\u0644\u0625\u0639\u0644\u0627\u0646\u0627\u062a \u0627\u0644\u0639\u0631\u0628\u064a')
        ),

        /* Tabs */
        React.createElement('div', {
          style: { display: 'flex', gap: 4, background: '#f3f4f6', borderRadius: 12, padding: 4, marginBottom: 24 }
        },
          React.createElement('button', { style: tabStyle(tab === 'whatsapp'), onClick: function() { setTab('whatsapp'); setError(''); } }, '\uD83D\uDCF1 \u0648\u0627\u062a\u0633\u0627\u0628'),
          React.createElement('button', { style: tabStyle(tab === 'google'), onClick: function() { setTab('google'); setError(''); } }, '\uD83D\uDD35 Google'),
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
            '\u0623\u062f\u062e\u0644 \u0631\u0642\u0645 \u0647\u0627\u062a\u0641\u0643 \u0648\u0633\u064a\u0635\u0644\u0643 \u0631\u0645\u0632 \u062a\u062d\u0642\u0642 \u0639\u0644\u0649 \u0648\u0627\u062a\u0633\u0627\u0628'
          ),
          React.createElement('input', {
            id: 'login-phone', name: 'login-phone',
            type: 'tel', placeholder: '+201234567890', value: phone,
            onChange: function(e) { setPhone(e.target.value); },
            style: inputStyle, disabled: otpSent
          }),
          !otpSent
            ? React.createElement('button', { onClick: sendOtp, disabled: loading, style: btnStyle },
                loading ? '...' : '\u0625\u0631\u0633\u0627\u0644 \u0631\u0645\u0632 \u0648\u0627\u062a\u0633\u0627\u0628'
              )
            : React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 10 } },
                React.createElement('input', {
                  type: 'number', placeholder: '\u0631\u0645\u0632 \u0627\u0644\u062a\u062d\u0642\u0642 (6 \u0623\u0631\u0642\u0627\u0645)',
                  value: otp, onChange: function(e) { setOtp(e.target.value.slice(0, 6)); },
                  style: inputStyle, maxLength: 6
                }),
                React.createElement('button', { onClick: verifyOtp, disabled: loading, style: btnStyle },
                  loading ? '...' : '\u062a\u062d\u0642\u0642 \u0648\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644'
                ),
                React.createElement('button', {
                  onClick: function() { if (countdown === 0) { setOtpSent(false); setOtp(''); sendOtp(); } },
                  disabled: countdown > 0,
                  style: { background: 'none', border: 'none', color: countdown > 0 ? '#9ca3af' : '#FF6B35', cursor: countdown > 0 ? 'default' : 'pointer', fontSize: 13, fontFamily: 'inherit' }
                }, resendLabel)
              )
        ) : null,

        /* Google Tab */
        tab === 'google' ? React.createElement('div', { style: { display: 'flex', flexDirection: 'column', gap: 12, alignItems: 'center' } },
          React.createElement('p', { style: { margin: '0 0 8px', fontSize: 14, color: '#374151', textAlign: 'center' } },
            '\u0633\u062c\u0651\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u062d\u0633\u0627\u0628 Google \u0627\u0644\u062d\u0642\u064a\u0642\u064a'
          ),
          React.createElement('div', { id: 'google-signin-btn', style: { width: '100%' } }),
          React.createElement('button', {
            onClick: handleGoogleLogin,
            style: {
              width: '100%', padding: 13, borderRadius: 12,
              border: '1.5px solid #e5e7eb', background: '#fff',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              gap: 10, fontSize: 16, cursor: 'pointer', fontFamily: 'inherit'
            }
          },
            React.createElement('img', { src: 'https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg', width: 22, height: 22, alt: 'Google' }),
            '\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0628\u0640 Google'
          )
        ) : null,

        /* Footer */
        React.createElement('p', { style: { marginTop: 24, textAlign: 'center', fontSize: 12, color: '#9ca3af' } },
          '\u0628\u062a\u0633\u062c\u064a\u0644 \u0627\u0644\u062f\u062e\u0648\u0644 \u0623\u0646\u062a \u062a\u0648\u0627\u0641\u0642 \u0639\u0644\u0649 ',
          React.createElement(Link, { href: '/terms', style: { color: '#FF6B35' } }, '\u0627\u0644\u0634\u0631\u0648\u0637 \u0648\u0627\u0644\u0623\u062d\u0643\u0627\u0645'),
          ' \u0648',
          React.createElement(Link, { href: '/privacy', style: { color: '#FF6B35' } }, '\u0633\u064a\u0627\u0633\u0629 \u0627\u0644\u062e\u0635\u0648\u0635\u064a\u0629')
        )
      )
    )
  );
}
