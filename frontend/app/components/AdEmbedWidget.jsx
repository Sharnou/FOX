// AdEmbedWidget.jsx — XTOX Marketplace embed code generator
'use client';

import { useState, useCallback } from 'react';

const FONTS = `@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700;900&family=Tajawal:wght@400;500;700&display=swap');`;

const SIZE_PRESETS = [
  { key: 'small',  label: { ar: 'صغير',  en: 'Small'  }, width: 300, height: 400 },
  { key: 'medium', label: { ar: 'متوسط', en: 'Medium' }, width: 400, height: 500 },
  { key: 'large',  label: { ar: 'كبير',  en: 'Large'  }, width: 500, height: 600 },
];

const TEXT = {
  ar: {
    title:          'مُضمِّن الإعلان',
    subtitle:       'شارك إعلانك على المواقع الخارجية',
    shareHeader:    'مشاركة هذا الإعلان',
    sizeLabel:      'حجم الإطار',
    themeLabel:     'مظهر الإطار',
    themeLight:     'فاتح',
    themeDark:      'داكن',
    embedCode:      'كود التضمين',
    copy:           'نسخ الكود',
    copied:         'تم النسخ!',
    directLink:     'رابط مباشر',
    copyLink:       'نسخ الرابط',
    copiedLink:     'تم النسخ!',
    preview:        'معاينة',
    currency:       'ج.م',
    warning:        'ملاحظة: تأكد من نسخ الكود بالكامل ولصقه في صفحة موقعك.',
    statsShares:    'مشاركة',
    statsViews:     'مشاهدة',
    statsClicks:    'نقرة',
    previewLabel:   'معاينة الإعلان المُضمَّن',
    adBadge:        'إعلان',
    noImage:        'لا توجد صورة',
    price:          'السعر',
  },
  en: {
    title:          'Ad Embed Widget',
    subtitle:       'Share your ad on external websites',
    shareHeader:    'Share this Ad',
    sizeLabel:      'Frame Size',
    themeLabel:     'Frame Theme',
    themeLight:     'Light',
    themeDark:      'Dark',
    embedCode:      'Embed Code',
    copy:           'Copy Code',
    copied:         'Copied!',
    directLink:     'Direct Link',
    copyLink:       'Copy Link',
    copiedLink:     'Copied!',
    preview:        'Preview',
    currency:       'EGP',
    warning:        'Note: Make sure to copy the full code and paste it into your website page.',
    statsShares:    'Shares',
    statsViews:     'Views',
    statsClicks:    'Clicks',
    previewLabel:   'Embedded Ad Preview',
    adBadge:        'Ad',
    noImage:        'No Image',
    price:          'Price',
  },
};

const BASE_URL = 'https://xtox.app/ad';

function useCopyToClipboard(delay = 2000) {
  const [copied, setCopied] = useState(false);
  const copy = useCallback((text) => {
    if (navigator?.clipboard) {
      navigator.clipboard.writeText(text).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), delay);
      });
    } else {
      const ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed';
      ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.select();
      document.execCommand('copy');
      document.body.removeChild(ta);
      setCopied(true);
      setTimeout(() => setCopied(false), delay);
    }
  }, [delay]);
  return { copied, copy };
}

export default function AdEmbedWidget({
  adId       = 'ad-123',
  adTitle    = { ar: 'سيارة تويوتا 2020', en: 'Toyota 2020 Car' },
  adPrice    = { amount: 50000, currency: 'EGP' },
  adImageUrl = null,
  lang: initialLang = 'ar',
  className  = '',
}) {
  const [lang, setLang]         = useState(initialLang);
  const [sizeKey, setSizeKey]   = useState('medium');
  const [darkFrame, setDarkFrame] = useState(false);

  const t = TEXT[lang];
  const isRtl = lang === 'ar';
  const selectedSize = SIZE_PRESETS.find((s) => s.key === sizeKey) || SIZE_PRESETS[1];
  const adUrl = `${BASE_URL}/${adId}`;

  const iframeCode = `<iframe\n  src="${adUrl}?embed=1&theme=${darkFrame ? 'dark' : 'light'}&lang=${lang}"\n  width="${selectedSize.width}"\n  height="${selectedSize.height}"\n  frameborder="0"\n  scrolling="no"\n  allow="clipboard-write"\n  title="${lang === 'ar' ? adTitle.ar : adTitle.en}"\n  style="border-radius:12px;overflow:hidden;"\n></iframe>`;

  const { copied: codeCopied, copy: copyCode }   = useCopyToClipboard();
  const { copied: linkCopied, copy: copyLink }   = useCopyToClipboard();

  // Mock stats
  const stats = [
    { value: '1.2K', label: t.statsViews  },
    { value:  '84',  label: t.statsShares },
    { value: '231',  label: t.statsClicks },
  ];

  const priceFormatted =
    lang === 'ar'
      ? `${adPrice.amount.toLocaleString('ar-EG')} ${t.currency}`
      : `${adPrice.amount.toLocaleString('en-US')} ${t.currency}`;

  return (
    <>
      <style>{`
        ${FONTS}
        .adew-root *{box-sizing:border-box;}
        .adew-root{font-family:'Cairo','Tajawal',sans-serif;}
        .adew-btn-copy{transition:background 0.2s,transform 0.15s;}
        .adew-btn-copy:active{transform:scale(0.96);}
        .adew-copied{animation:adewPop 0.3s ease;}
        @keyframes adewPop{0%{transform:scale(1)}50%{transform:scale(1.12)}100%{transform:scale(1)}}
        .adew-code-area{font-family:'Courier New',monospace;font-size:12px;line-height:1.6;resize:none;outline:none;}
        .adew-tab-active{border-bottom:2px solid #f97316;}
        .adew-preset-btn{transition:all 0.15s;}
        .adew-preset-btn:hover{background:#f97316;color:#fff;}
        .adew-preset-btn-active{background:#f97316 !important;color:#fff !important;}
        .adew-toggle{display:inline-flex;align-items:center;gap:6px;cursor:pointer;}
        .adew-thumb{width:20px;height:20px;border-radius:50%;background:#fff;box-shadow:0 1px 3px rgba(0,0,0,.3);transition:transform 0.2s;}
        .adew-track{width:40px;height:22px;border-radius:999px;transition:background 0.2s;display:flex;align-items:center;padding:1px 2px;}
      `}</style>

      <div
        className={`adew-root ${className}`}
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          background: '#fff',
          borderRadius: 16,
          boxShadow: '0 4px 24px rgba(0,0,0,0.10)',
          maxWidth: 620,
          width: '100%',
          overflow: 'hidden',
          border: '1px solid #f0f0f0',
        }}
      >
        {/* ── Header ── */}
        <div style={{
          background: 'linear-gradient(135deg,#1e293b 0%,#0f172a 100%)',
          padding: '20px 24px 16px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <h2 style={{ color: '#f97316', margin: 0, fontSize: 20, fontWeight: 900 }}>{t.title}</h2>
            <p style={{ color: '#94a3b8', margin: '2px 0 0', fontSize: 13 }}>{t.subtitle}</p>
          </div>
          {/* Lang toggle */}
          <button
            onClick={() => setLang(lang === 'ar' ? 'en' : 'ar')}
            style={{
              background: '#f97316',
              color: '#fff',
              border: 'none',
              borderRadius: 8,
              padding: '6px 14px',
              fontFamily: 'inherit',
              fontWeight: 700,
              fontSize: 13,
              cursor: 'pointer',
              letterSpacing: 0.5,
            }}
          >
            {lang === 'ar' ? 'EN' : 'ع'}
          </button>
        </div>

        {/* ── Share Header ── */}
        <div style={{
          background: '#fff7ed',
          borderBottom: '1px solid #fed7aa',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 10,
        }}>
          <span style={{ fontSize: 20 }}>📢</span>
          <span style={{ fontWeight: 700, color: '#c2410c', fontSize: 15 }}>{t.shareHeader}</span>
        </div>

        <div style={{ padding: 24, display: 'flex', flexDirection: 'column', gap: 20 }}>

          {/* ── Stats Row ── */}
          <div style={{
            display: 'flex',
            gap: 12,
            justifyContent: 'center',
          }}>
            {stats.map((s) => (
              <div key={s.label} style={{
                flex: 1,
                background: '#f8fafc',
                borderRadius: 10,
                padding: '12px 8px',
                textAlign: 'center',
                border: '1px solid #e2e8f0',
              }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: '#f97316' }}>{s.value}</div>
                <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>{s.label}</div>
              </div>
            ))}
          </div>

          {/* ── Size Presets ── */}
          <div>
            <label style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, display: 'block', marginBottom: 8 }}>
              {t.sizeLabel}
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              {SIZE_PRESETS.map((preset) => (
                <button
                  key={preset.key}
                  onClick={() => setSizeKey(preset.key)}
                  className={`adew-preset-btn${sizeKey === preset.key ? ' adew-preset-btn-active' : ''}`}
                  style={{
                    flex: 1,
                    padding: '8px 6px',
                    borderRadius: 8,
                    border: '2px solid',
                    borderColor: sizeKey === preset.key ? '#f97316' : '#e2e8f0',
                    background: sizeKey === preset.key ? '#f97316' : '#f8fafc',
                    color: sizeKey === preset.key ? '#fff' : '#475569',
                    fontFamily: 'inherit',
                    fontWeight: 600,
                    fontSize: 13,
                    cursor: 'pointer',
                  }}
                >
                  <div>{preset.label[lang]}</div>
                  <div style={{ fontSize: 11, opacity: 0.8, marginTop: 2 }}>
                    {preset.width}×{preset.height}
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* ── Theme Toggle ── */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'space-between' }}>
            <span style={{ fontWeight: 700, color: '#1e293b', fontSize: 13 }}>{t.themeLabel}</span>
            <label className="adew-toggle">
              <span style={{ fontSize: 12, color: '#64748b' }}>{t.themeLight}</span>
              <div
                className="adew-track"
                style={{ background: darkFrame ? '#f97316' : '#cbd5e1' }}
                onClick={() => setDarkFrame((p) => !p)}
              >
                <div
                  className="adew-thumb"
                  style={{ transform: darkFrame ? (isRtl ? 'translateX(-18px)' : 'translateX(18px)') : 'translateX(0)' }}
                />
              </div>
              <span style={{ fontSize: 12, color: '#64748b' }}>{t.themeDark}</span>
            </label>
          </div>

          {/* ── Ad Preview ── */}
          <div>
            <label style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, display: 'block', marginBottom: 10 }}>
              {t.previewLabel}
            </label>
            <div style={{
              display: 'flex',
              justifyContent: 'center',
              padding: 16,
              background: darkFrame ? '#0f172a' : '#f1f5f9',
              borderRadius: 12,
              border: '2px dashed',
              borderColor: darkFrame ? '#334155' : '#cbd5e1',
            }}>
              {/* Mock embedded ad card */}
              <div style={{
                width: Math.min(selectedSize.width, 280),
                background: darkFrame ? '#1e293b' : '#fff',
                borderRadius: 12,
                overflow: 'hidden',
                boxShadow: darkFrame ? '0 4px 20px rgba(0,0,0,.5)' : '0 2px 12px rgba(0,0,0,.12)',
                border: '1px solid',
                borderColor: darkFrame ? '#334155' : '#e2e8f0',
                fontFamily: 'inherit',
                direction: isRtl ? 'rtl' : 'ltr',
              }}>
                {/* Image zone */}
                <div style={{
                  height: 140,
                  background: adImageUrl
                    ? `url(${adImageUrl}) center/cover no-repeat`
                    : 'linear-gradient(135deg,#1e293b,#334155)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}>
                  {!adImageUrl && (
                    <span style={{ fontSize: 40 }}>🚗</span>
                  )}
                  <span style={{
                    position: 'absolute',
                    top: 8,
                    [isRtl ? 'left' : 'right']: 8,
                    background: '#f97316',
                    color: '#fff',
                    fontSize: 10,
                    fontWeight: 700,
                    padding: '2px 8px',
                    borderRadius: 999,
                  }}>{t.adBadge}</span>
                </div>
                {/* Card body */}
                <div style={{ padding: '12px 14px' }}>
                  <div style={{ fontWeight: 700, fontSize: 14, color: darkFrame ? '#f1f5f9' : '#1e293b', marginBottom: 4 }}>
                    {lang === 'ar' ? adTitle.ar : adTitle.en}
                  </div>
                  <div style={{ color: '#f97316', fontWeight: 900, fontSize: 16, marginBottom: 8 }}>
                    {priceFormatted}
                  </div>
                  <div style={{
                    background: '#f97316',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    padding: '7px 0',
                    width: '100%',
                    textAlign: 'center',
                    fontSize: 12,
                    fontWeight: 700,
                    cursor: 'default',
                  }}>
                    {lang === 'ar' ? 'عرض الإعلان' : 'View Ad'}
                  </div>
                </div>
                {/* XTOX branding */}
                <div style={{
                  padding: '6px 14px',
                  background: darkFrame ? '#0f172a' : '#f8fafc',
                  borderTop: '1px solid',
                  borderColor: darkFrame ? '#334155' : '#f0f0f0',
                  textAlign: 'center',
                  fontSize: 10,
                  color: '#94a3b8',
                }}>
                  powered by <strong style={{ color: '#f97316' }}>XTOX</strong>
                </div>
              </div>
            </div>
          </div>

          {/* ── Embed Code ── */}
          <div>
            <label style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, display: 'block', marginBottom: 8 }}>
              {t.embedCode}
            </label>
            <div style={{ position: 'relative' }}>
              <textarea
                className="adew-code-area"
                readOnly
                value={iframeCode}
                rows={6}
                style={{
                  width: '100%',
                  background: '#0f172a',
                  color: '#7dd3fc',
                  border: '1px solid #1e293b',
                  borderRadius: 10,
                  padding: '12px 14px',
                }}
              />
            </div>
            <button
              onClick={() => copyCode(iframeCode)}
              className={`adew-btn-copy${codeCopied ? ' adew-copied' : ''}`}
              style={{
                marginTop: 10,
                width: '100%',
                padding: '11px 0',
                background: codeCopied ? '#16a34a' : '#f97316',
                color: '#fff',
                border: 'none',
                borderRadius: 10,
                fontFamily: 'inherit',
                fontWeight: 700,
                fontSize: 14,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 8,
              }}
            >
              <span>{codeCopied ? '✓' : '⧉'}</span>
              <span>{codeCopied ? t.copied : t.copy}</span>
            </button>
          </div>

          {/* ── Direct Link ── */}
          <div>
            <label style={{ fontWeight: 700, color: '#1e293b', fontSize: 13, display: 'block', marginBottom: 8 }}>
              {t.directLink}
            </label>
            <div style={{
              display: 'flex',
              gap: 8,
              alignItems: 'center',
              background: '#f8fafc',
              border: '1px solid #e2e8f0',
              borderRadius: 10,
              padding: '8px 12px',
            }}>
              <span style={{
                flex: 1,
                fontSize: 12,
                color: '#475569',
                wordBreak: 'break-all',
                direction: 'ltr',
                textAlign: isRtl ? 'right' : 'left',
              }}>{adUrl}</span>
              <button
                onClick={() => copyLink(adUrl)}
                className={`adew-btn-copy${linkCopied ? ' adew-copied' : ''}`}
                style={{
                  background: linkCopied ? '#16a34a' : '#1e293b',
                  color: '#fff',
                  border: 'none',
                  borderRadius: 8,
                  padding: '7px 14px',
                  fontFamily: 'inherit',
                  fontWeight: 600,
                  fontSize: 12,
                  cursor: 'pointer',
                  whiteSpace: 'nowrap',
                  flexShrink: 0,
                }}
              >
                {linkCopied ? t.copiedLink : t.copyLink}
              </button>
            </div>
          </div>

          {/* ── Warning Notice ── */}
          <div style={{
            background: '#fffbeb',
            border: '1px solid #fde68a',
            borderRadius: 10,
            padding: '12px 16px',
            display: 'flex',
            gap: 10,
            alignItems: 'flex-start',
          }}>
            <span style={{ fontSize: 16, flexShrink: 0 }}>⚠️</span>
            <p style={{ margin: 0, fontSize: 12, color: '#92400e', lineHeight: 1.6, fontWeight: 500 }}>
              {t.warning}
            </p>
          </div>

        </div>
      </div>
    </>
  );
}
