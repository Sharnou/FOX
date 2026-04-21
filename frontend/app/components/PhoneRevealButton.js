'use client';
import { useState } from 'react';
import { useLanguage } from '../context/LanguageContext';

/**
 * PhoneRevealButton — زر إظهار رقم الهاتف
 * Arab marketplace pattern: hide phone until user clicks "Show Number"
 * Supports Arabic RTL + English LTR
 * Run 118 — XTOX Auto-Upgrade
 */
export default function PhoneRevealButton({ phone, lang = 'ar' }) {
  const { t: tr } = useLanguage();
  const [revealed, setRevealed] = useState(false);
  const [copied, setCopied] = useState(false);

  const isRTL = lang === 'ar';

  const labels = {
    ar: {
      show: tr('phone_show'),
      copy: tr('phone_copy'),
      copied: tr('phone_copied'),
      call: tr('phone_call'),
    },
    de: {
      show: '📞 Telefonnummer anzeigen',
      copy: 'Kopieren',
      copied: '✓ Kopiert',
      call: 'Anrufen',
    },
    en: {
      show: '📞 Show Phone Number',
      copy: 'Copy',
      copied: '✓ Copied',
      call: 'Call',
    },
  };

  const t = labels[lang] || labels.en;

  const handleCopy = async () => {
    if (!phone) return;
    try {
      await navigator.clipboard.writeText(phone);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // fallback
      const el = document.createElement('textarea');
      el.value = phone;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  if (!phone) return null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{
        fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : 'inherit',
        margin: '8px 0',
      }}
    >
      {!revealed ? (
        <button
          onClick={() => setRevealed(true)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 18px',
            backgroundColor: '#25D366',
            color: '#fff',
            border: 'none',
            borderRadius: '8px',
            cursor: 'pointer',
            fontSize: isRTL ? '15px' : '14px',
            fontWeight: 'bold',
            width: '100%',
            justifyContent: 'center',
            transition: 'background 0.2s',
          }}
          onMouseEnter={e => (e.currentTarget.style.backgroundColor = '#1ebe57')}
          onMouseLeave={e => (e.currentTarget.style.backgroundColor = '#25D366')}
        >
          {t.show}
        </button>
      ) : (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            flexWrap: 'wrap',
          }}
        >
          {/* Phone number display */}
          <a
            href={'tel:' + phone}
            style={{
              fontSize: '17px',
              fontWeight: 'bold',
              color: '#1a73e8',
              textDecoration: 'none',
              letterSpacing: '0.5px',
              direction: 'ltr',
              unicodeBidi: 'isolate',
            }}
          >
            {phone}
          </a>

          {/* Copy button */}
          <button
            onClick={handleCopy}
            style={{
              padding: '6px 12px',
              backgroundColor: copied ? '#4CAF50' : '#f0f0f0',
              color: copied ? '#fff' : '#333',
              border: '1px solid #ccc',
              borderRadius: '6px',
              cursor: 'pointer',
              fontSize: '13px',
              transition: 'all 0.2s',
            }}
          >
            {copied ? t.copied : t.copy}
          </button>

          {/* Call button */}
          <a
            href={'tel:' + phone}
            style={{
              padding: '6px 12px',
              backgroundColor: '#25D366',
              color: '#fff',
              borderRadius: '6px',
              textDecoration: 'none',
              fontSize: '13px',
              fontWeight: 'bold',
            }}
          >
            {t.call}
          </a>
        </div>
      )}
    </div>
  );
}
