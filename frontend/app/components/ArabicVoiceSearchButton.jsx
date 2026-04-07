'use client';

/**
 * ArabicVoiceSearchButton
 * ─────────────────────────────────────────────────────────────────
 * Web Speech API–powered voice search for the XTOX Arab marketplace.
 * Supports Arabic (ar-EG, ar-SA), English (en-US), German (de-DE).
 * Passes recognised transcript to "onResult(text)" callback.
 * Zero external dependencies. Full RTL / LTR. Cairo + Tajawal fonts.
 * Arabic-Indic numerals for countdown display.
 * Safe for Next.js (client-only guard via typeof window check).
 * ─────────────────────────────────────────────────────────────────
 */

import { useState, useEffect, useRef, useCallback } from 'react';

/* ── i18n ────────────────────────────────────────────────────────── */
const LABELS = {
  ar: {
    tap:       'ابحث بصوتك',
    listening: 'جارٍ الاستماع…',
    processing:'جارٍ المعالجة…',
    error:     'حاول مرة أخرى',
    noSupport: 'المتصفح لا يدعم البحث الصوتي',
    hint:      'تكلم الآن',
    seconds:   s => toArabicIndic(s) + ' ث',
  },
  en: {
    tap:       'Voice Search',
    listening: 'Listening…',
    processing:'Processing…',
    error:     'Try again',
    noSupport: 'Browser does not support voice search',
    hint:      'Speak now',
    seconds:   s => s + 's',
  },
  de: {
    tap:       'Sprachsuche',
    listening: 'Zuhören…',
    processing:'Verarbeitung…',
    error:     'Erneut versuchen',
    noSupport: 'Browser unterstützt keine Sprachsuche',
    hint:      'Jetzt sprechen',
    seconds:   s => s + ' s',
  },
};

/* Map lang code → Web Speech API BCP-47 */
const SPEECH_LANG = {
  ar: 'ar-EG',
  'ar-sa': 'ar-SA',
  'ar-eg': 'ar-EG',
  en: 'en-US',
  de: 'de-DE',
};

function toArabicIndic(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function getLang(lang = 'ar') {
  const key = (lang || 'ar').toLowerCase().split('-')[0];
  return LABELS[key] || LABELS.ar;
}

/* ── Styles (inline – zero CSS imports) ─────────────────────────── */
const BASE = {
  fontFamily: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif",
};

/* ── Main Component ──────────────────────────────────────────────── */
export default function ArabicVoiceSearchButton({
  onResult,
  lang = 'ar',
  countryCode,        // reserved for JWT country-lock context
  className = '',
  style = {},
  maxSeconds = 8,     // auto-stop after N seconds
  size = 'md',        // 'sm' | 'md' | 'lg'
}) {
  const isRTL = (lang || '').startsWith('ar');
  const t     = getLang(lang);

  const [phase, setPhase]     = useState('idle');   // idle | listening | processing | error | unsupported
  const [transcript, setTranscript] = useState('');
  const [countdown, setCountdown]   = useState(maxSeconds);

  const recognitionRef = useRef(null);
  const timerRef       = useRef(null);
  const countRef       = useRef(maxSeconds);

  /* ── Size presets ─────────────────────────────────────────── */
  const sizes = {
    sm: { btn: 36, icon: 16, fontSize: '0.75rem' },
    md: { btn: 48, icon: 22, fontSize: '0.875rem' },
    lg: { btn: 64, icon: 30, fontSize: '1rem' },
  };
  const sz = sizes[size] || sizes.md;

  /* ── Browser support check ────────────────────────────────── */
  const isSupported = useCallback(() => {
    if (typeof window === 'undefined') return false;
    return !!(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  /* ── Cleanup on unmount ───────────────────────────────────── */
  useEffect(() => {
    return () => {
      clearInterval(timerRef.current);
      if (recognitionRef.current) {
        try { recognitionRef.current.abort(); } catch (_) {}
      }
    };
  }, []);

  /* ── Stop recognition ─────────────────────────────────────── */
  const stopListening = useCallback(() => {
    clearInterval(timerRef.current);
    if (recognitionRef.current) {
      try { recognitionRef.current.stop(); } catch (_) {}
    }
  }, []);

  /* ── Start recognition ────────────────────────────────────── */
  const startListening = useCallback(() => {
    if (!isSupported()) {
      setPhase('unsupported');
      return;
    }

    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    const rec = new SR();
    recognitionRef.current = rec;

    // Map language
    const langKey = (lang || 'ar').toLowerCase();
    rec.lang = SPEECH_LANG[langKey] || SPEECH_LANG[langKey.split('-')[0]] || 'ar-EG';
    rec.interimResults = true;
    rec.maxAlternatives = 1;
    rec.continuous = false;

    rec.onstart = () => {
      setPhase('listening');
      setTranscript('');
      countRef.current = maxSeconds;
      setCountdown(maxSeconds);

      timerRef.current = setInterval(() => {
        countRef.current -= 1;
        setCountdown(countRef.current);
        if (countRef.current <= 0) {
          clearInterval(timerRef.current);
          try { rec.stop(); } catch (_) {}
        }
      }, 1000);
    };

    rec.onresult = (e) => {
      const interim = Array.from(e.results)
        .map(r => r[0].transcript)
        .join('');
      setTranscript(interim);
    };

    rec.onerror = () => {
      clearInterval(timerRef.current);
      setPhase('error');
      setTimeout(() => setPhase('idle'), 2000);
    };

    rec.onend = () => {
      clearInterval(timerRef.current);
      const final = recognitionRef.current?._lastTranscript || transcript;
      if (transcript) {
        setPhase('processing');
        if (typeof onResult === 'function') onResult(transcript.trim());
        setTimeout(() => {
          setPhase('idle');
          setTranscript('');
        }, 800);
      } else {
        setPhase('idle');
      }
    };

    // Track final transcript for onend
    rec.onspeechend = () => {
      if (recognitionRef.current) {
        recognitionRef.current._lastTranscript = transcript;
      }
    };

    try {
      rec.start();
    } catch (err) {
      setPhase('error');
      setTimeout(() => setPhase('idle'), 2000);
    }
  }, [isSupported, lang, maxSeconds, onResult, transcript]);

  /* ── Toggle ───────────────────────────────────────────────── */
  const handleClick = () => {
    if (phase === 'listening') {
      stopListening();
      setPhase('idle');
    } else if (phase === 'idle' || phase === 'error') {
      startListening();
    }
  };

  /* ── Colors by phase ──────────────────────────────────────── */
  const phaseColors = {
    idle:        { bg: '#f97316', ring: '#fed7aa', icon: '#fff' },
    listening:   { bg: '#ef4444', ring: '#fecaca', icon: '#fff' },
    processing:  { bg: '#8b5cf6', ring: '#ddd6fe', icon: '#fff' },
    error:       { bg: '#6b7280', ring: '#e5e7eb', icon: '#fff' },
    unsupported: { bg: '#9ca3af', ring: '#f3f4f6', icon: '#fff' },
  };
  const colors = phaseColors[phase] || phaseColors.idle;

  /* ── Pulse ring animation via keyframes in style tag ─────── */
  const pulseStyle = phase === 'listening' ? {
    boxShadow: '0 0 0 6px ' + colors.ring,
    animation: 'xtox-voice-pulse 1s ease-in-out infinite',
  } : {};

  /* ── Label text ───────────────────────────────────────────── */
  const labelText = () => {
    if (phase === 'unsupported') return t.noSupport;
    if (phase === 'listening')   return transcript || t.hint;
    if (phase === 'processing')  return t.processing;
    if (phase === 'error')       return t.error;
    return t.tap;
  };

  /* ── Mic Icon (SVG) ───────────────────────────────────────── */
  const MicIcon = ({ size: s, color }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill="none"
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" fill={color} />
      <path d="M5 11a7 7 0 0 0 14 0" stroke={color} strokeWidth="2"
        strokeLinecap="round" fill="none" />
      <line x1="12" y1="18" x2="12" y2="22" stroke={color} strokeWidth="2"
        strokeLinecap="round" />
      <line x1="9" y1="22" x2="15" y2="22" stroke={color} strokeWidth="2"
        strokeLinecap="round" />
    </svg>
  );

  /* ── Stop Icon ────────────────────────────────────────────── */
  const StopIcon = ({ size: s, color }) => (
    <svg width={s} height={s} viewBox="0 0 24 24" fill={color}
      xmlns="http://www.w3.org/2000/svg" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );

  if (phase === 'unsupported') {
    return (
      <div style={{ ...BASE, color: '#9ca3af', fontSize: '0.75rem', padding: '4px 8px' }}>
        {t.noSupport}
      </div>
    );
  }

  return (
    <>
      {/* Inject pulse keyframes once */}
      <style>{'\n        @import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600&family=Tajawal:wght@400;500&display=swap\');\n        @keyframes xtox-voice-pulse {\n          0%,100% { box-shadow: 0 0 0 0 ' + colors.ring + '; }\n          50%      { box-shadow: 0 0 0 10px transparent; }\n        }\n        @keyframes xtox-voice-spin {\n          to { transform: rotate(360deg); }\n        }\n      '}</style>

      <div
        className={className}
        style={{
          ...BASE,
          display: 'inline-flex',
          flexDirection: isRTL ? 'row-reverse' : 'row',
          alignItems: 'center',
          gap: 8,
          direction: isRTL ? 'rtl' : 'ltr',
          ...style,
        }}
        dir={isRTL ? 'rtl' : 'ltr'}
      >
        {/* ── Circle Button ──────────────────────────────── */}
        <button
          onClick={handleClick}
          disabled={phase === 'processing'}
          aria-label={labelText()}
          title={labelText()}
          style={{
            width:           sz.btn,
            height:          sz.btn,
            borderRadius:    '50%',
            background:      colors.bg,
            border:          'none',
            cursor:          phase === 'processing' ? 'wait' : 'pointer',
            display:         'flex',
            alignItems:      'center',
            justifyContent:  'center',
            flexShrink:      0,
            transition:      'background 0.25s, box-shadow 0.25s',
            outline:         'none',
            ...pulseStyle,
          }}
        >
          {phase === 'processing' ? (
            <div style={{
              width: sz.icon, height: sz.icon,
              border: '2px solid rgba(255,255,255,0.4)',
              borderTopColor: '#fff',
              borderRadius: '50%',
              animation: 'xtox-voice-spin 0.7s linear infinite',
            }} />
          ) : phase === 'listening' ? (
            <StopIcon size={sz.icon} color={colors.icon} />
          ) : (
            <MicIcon size={sz.icon} color={colors.icon} />
          )}
        </button>

        {/* ── Label + Countdown ──────────────────────────── */}
        <div style={{ display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <span style={{
            fontSize:   sz.fontSize,
            fontWeight: 600,
            color:      phase === 'error' ? '#ef4444' : '#1f2937',
            whiteSpace: 'nowrap',
            overflow:   'hidden',
            textOverflow: 'ellipsis',
            maxWidth:   160,
            direction:  isRTL ? 'rtl' : 'ltr',
          }}>
            {labelText()}
          </span>

          {phase === 'listening' && (
            <span style={{
              fontSize:  '0.7rem',
              color:     '#ef4444',
              fontWeight: 500,
              direction: isRTL ? 'rtl' : 'ltr',
            }}>
              {t.seconds(countdown)}
            </span>
          )}
        </div>
      </div>
    </>
  );
}
