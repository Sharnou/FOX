'use client';
import { useState, useEffect } from 'react';

/**
 * WhatsAppFloat — Floating WhatsApp support button for XTOX Arab marketplace.
 * Shows a pulsing green WhatsApp icon in the bottom-left corner.
 * Arabic-first: RTL tooltip, Arabic label.
 * Hides after user dismisses and remembers via sessionStorage.
 */
export default function WhatsAppFloat() {
  const [visible, setVisible] = useState(false);
  const [tooltipOpen, setTooltipOpen] = useState(false);

  // WhatsApp number for XTOX support (format: country code + number, no '+' or spaces)
  const WHATSAPP_NUMBER = '213555000000';
  const MESSAGE = encodeURIComponent('مرحبا، أحتاج مساعدة في XTOX 👋');
  const WA_URL = `https://wa.me/${WHATSAPP_NUMBER}?text=${MESSAGE}`;

  useEffect(() => {
    // Don't show if user dismissed this session
    if (sessionStorage.getItem('wa-float-dismissed')) return;
    // Delay appearance for 3 seconds so it doesn't compete with other UI
    const t = setTimeout(() => setVisible(true), 3000);
    return () => clearTimeout(t);
  }, []);

  function handleDismiss(e) {
    e.stopPropagation();
    setVisible(false);
    sessionStorage.setItem('wa-float-dismissed', '1');
  }

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes wa-pulse {
          0%   { box-shadow: 0 0 0 0 rgba(37,211,102,0.55); }
          70%  { box-shadow: 0 0 0 16px rgba(37,211,102,0); }
          100% { box-shadow: 0 0 0 0 rgba(37,211,102,0); }
        }
        @keyframes wa-bounce-in {
          0%   { transform: scale(0) rotate(-30deg); opacity: 0; }
          60%  { transform: scale(1.15) rotate(5deg); opacity: 1; }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        @keyframes wa-tooltip-in {
          from { opacity: 0; transform: translateX(-8px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .wa-float-btn {
          animation: wa-bounce-in 0.5s cubic-bezier(.21,1.02,.73,1) both,
                     wa-pulse 2.5s ease-out 1s infinite;
        }
        .wa-float-btn:hover {
          transform: scale(1.08) !important;
          animation: none;
          box-shadow: 0 8px 32px rgba(37,211,102,0.5);
        }
      `}</style>

      {/* Tooltip (Arabic label, appears on hover) */}
      {tooltipOpen && (
        <div
          role="tooltip"
          style={{
            position: 'fixed',
            bottom: 94,
            left: 24,
            background: '#fff',
            color: '#002f34',
            borderRadius: 12,
            padding: '10px 16px',
            fontSize: 14,
            fontFamily: "'Cairo', sans-serif",
            fontWeight: 600,
            direction: 'rtl',
            boxShadow: '0 4px 20px rgba(0,0,0,0.15)',
            zIndex: 10001,
            whiteSpace: 'nowrap',
            animation: 'wa-tooltip-in 0.25s ease both',
            border: '1.5px solid rgba(37,211,102,0.3)',
          }}
        >
          💬 تواصل معنا على واتساب
        </div>
      )}

      {/* Main floating button */}
      <div
        style={{
          position: 'fixed',
          bottom: 24,
          left: 24,
          zIndex: 10000,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 8,
        }}
      >
        {/* Dismiss button (small ×) */}
        <button
          onClick={handleDismiss}
          aria-label="إخفاء زر واتساب"
          style={{
            width: 22,
            height: 22,
            borderRadius: '50%',
            background: 'rgba(0,0,0,0.35)',
            border: 'none',
            color: '#fff',
            fontSize: 12,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>

        {/* WhatsApp icon button */}
        <a
          href={WA_URL}
          target="_blank"
          rel="noopener noreferrer"
          aria-label="تواصل معنا عبر واتساب"
          className="wa-float-btn"
          onMouseEnter={() => setTooltipOpen(true)}
          onMouseLeave={() => setTooltipOpen(false)}
          onFocus={() => setTooltipOpen(true)}
          onBlur={() => setTooltipOpen(false)}
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 58,
            height: 58,
            borderRadius: '50%',
            background: '#25d366',
            textDecoration: 'none',
            cursor: 'pointer',
            transition: 'transform 0.18s ease, box-shadow 0.18s ease',
          }}
        >
          {/* WhatsApp SVG icon */}
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 32 32"
            width={30}
            height={30}
            fill="#fff"
          >
            <path d="M16 2C8.268 2 2 8.268 2 16c0 2.51.67 4.862 1.836 6.895L2 30l7.34-1.813A13.918 13.918 0 0 0 16 30c7.732 0 14-6.268 14-14S23.732 2 16 2zm0 2c6.627 0 12 5.373 12 12s-5.373 12-12 12a11.934 11.934 0 0 1-6.02-1.625l-.418-.253-4.355 1.076 1.1-4.218-.277-.44A11.934 11.934 0 0 1 4 16C4 9.373 9.373 4 16 4zm-3.07 5c-.265 0-.696.1-.955.37-.259.27-1 .98-1 2.39 0 1.41.975 2.77 1.113 2.963.137.195 1.914 2.92 4.634 3.977 2.72 1.06 2.72.707 3.21.663.49-.044 1.582-.647 1.806-1.27.224-.624.224-1.16.157-1.27-.067-.112-.247-.178-.516-.313-.27-.134-1.582-.782-1.828-.871-.246-.09-.424-.134-.603.134-.179.268-.694.871-.85 1.05-.157.179-.313.2-.582.067-.27-.134-1.138-.42-2.167-1.337-.8-.714-1.34-1.596-1.497-1.865-.157-.27-.017-.415.118-.549.12-.12.27-.313.404-.47.134-.156.179-.268.268-.447.09-.179.045-.335-.022-.47-.067-.134-.603-1.45-.828-1.985-.218-.52-.44-.45-.603-.457L13.247 9l-.317.001z" />
          </svg>
        </a>
      </div>
    </>
  );
}
