'use client';
/**
 * ContactSellerSheet.jsx — XTOX Marketplace
 * Mobile-first bottom sheet with all seller contact options.
 * - Slide-up animated bottom sheet (CSS transition, no lib)
 * - Options: In-app chat, WhatsApp, Phone call, Make offer
 * - Arabic-first UI, full RTL support
 * - Cairo/Tajawal fonts
 * - Arabic-Indic numerals for phone display
 * - Backdrop tap to close
 * - Haptic feedback on mobile (vibrate API)
 * - Zero external dependencies
 */

import { useState, useEffect, useCallback } from 'react';

const LABELS = {
  ar: {
    contactSeller: 'تواصل مع البائع',
    chat: 'محادثة داخل التطبيق',
    chatSub: 'راسل البائع مباشرةً',
    whatsapp: 'واتساب',
    whatsappSub: 'تواصل سريع عبر واتساب',
    call: 'اتصل الآن',
    callSub: 'اضغط لإظهار رقم الهاتف',
    offer: 'قدّم عرضاً',
    offerSub: 'اقترح سعرك على البائع',
    close: 'إغلاق',
    or: 'أو',
  },
  en: {
    contactSeller: 'Contact Seller',
    chat: 'In-App Chat',
    chatSub: 'Message seller directly',
    whatsapp: 'WhatsApp',
    whatsappSub: 'Quick contact via WhatsApp',
    call: 'Call Now',
    callSub: 'Tap to reveal phone number',
    offer: 'Make an Offer',
    offerSub: 'Suggest your price to seller',
    close: 'Close',
    or: 'or',
  },
  de: {
    contactSeller: 'Verkäufer kontaktieren',
    chat: 'In-App-Chat',
    chatSub: 'Verkäufer direkt anschreiben',
    whatsapp: 'WhatsApp',
    whatsappSub: 'Schnell via WhatsApp',
    call: 'Jetzt anrufen',
    callSub: 'Tippen um Nummer anzuzeigen',
    offer: 'Angebot machen',
    offerSub: 'Preis vorschlagen',
    close: 'Schließen',
    or: 'oder',
  },
};

function toArabicIndic(str) {
  return String(str).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

const icons = {
  chat: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
    </svg>
  ),
  whatsapp: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/>
    </svg>
  ),
  phone: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 13 19.79 19.79 0 0 1 1.61 4.4 2 2 0 0 1 3.6 2.21h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L7.91 9.91a16 16 0 0 0 6.18 6.18l.96-.96a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
    </svg>
  ),
  offer: (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="12" y1="1" x2="12" y2="23"/>
      <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/>
    </svg>
  ),
};

export default function ContactSellerSheet({
  adId,
  sellerId,
  sellerPhone,
  sellerWhatsApp,
  adTitle,
  adPrice,
  lang = 'ar',
  isOpen = false,
  onClose,
  onOfferClick,
}) {
  const t = LABELS[lang] || LABELS.ar;
  const isRTL = lang === 'ar';
  const [visible, setVisible] = useState(false);
  const [phoneRevealed, setPhoneRevealed] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => { setMounted(true); }, []);

  useEffect(() => {
    if (isOpen) {
      setVisible(true);
      document.body.style.overflow = 'hidden';
      if (typeof navigator !== 'undefined' && navigator.vibrate) {
        navigator.vibrate(10);
      }
    } else {
      setVisible(false);
      document.body.style.overflow = '';
    }
    return () => { document.body.style.overflow = ''; };
  }, [isOpen]);

  const handleChatClick = useCallback(() => {
    if (typeof window !== 'undefined') {
      window.location.href = '/chat?ad=' + adId + '&seller=' + sellerId;
    }
  }, [adId, sellerId]);

  const handleWhatsAppClick = useCallback(() => {
    const phone = (sellerWhatsApp || sellerPhone || '').replace(/\D/g, '');
    const msg = encodeURIComponent(
      lang === 'ar'
        ? 'مرحباً، رأيت إعلانك "' + adTitle + '" وأريد الاستفسار.'
        : 'Hi, I saw your ad "' + adTitle + '" and I\'m interested.'
    );
    if (phone) {
      window.open('https://wa.me/' + phone + '?text=' + msg, '_blank', 'noopener');
    }
  }, [sellerWhatsApp, sellerPhone, adTitle, lang]);

  const handlePhoneClick = useCallback(() => {
    if (phoneRevealed && sellerPhone) {
      window.location.href = 'tel:' + sellerPhone;
    } else {
      setPhoneRevealed(true);
      if (navigator.vibrate) navigator.vibrate(15);
    }
  }, [phoneRevealed, sellerPhone]);

  const handleOfferClick = useCallback(() => {
    if (onOfferClick) onOfferClick();
    else if (typeof window !== 'undefined') {
      window.location.href = '/offers?ad=' + adId;
    }
  }, [onOfferClick, adId]);

  if (!mounted) return null;

  const phoneDisplay = sellerPhone
    ? (lang === 'ar' ? toArabicIndic(sellerPhone) : sellerPhone)
    : null;

  return (
    <>
      {/* Backdrop */}
      <div
        onClick={onClose}
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.5)',
          zIndex: 9998,
          opacity: visible ? 1 : 0,
          transition: 'opacity 0.3s ease',
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
        aria-hidden="true"
      />

      {/* Sheet */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label={t.contactSeller}
        dir={isRTL ? 'rtl' : 'ltr'}
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          right: 0,
          zIndex: 9999,
          backgroundColor: '#fff',
          borderRadius: '20px 20px 0 0',
          boxShadow: '0 -8px 40px rgba(0,0,0,0.18)',
          transform: visible ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          maxHeight: '85vh',
          overflowY: 'auto',
          fontFamily: lang === 'ar' ? "'Cairo', 'Tajawal', sans-serif" : "'Inter', sans-serif",
        }}
      >
        {/* Handle */}
        <div style={{ display: 'flex', justifyContent: 'center', padding: '12px 0 4px' }}>
          <div style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0' }} />
        </div>

        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 20px 16px',
          borderBottom: '1px solid #f0f0f0',
        }}>
          <h2 style={{ margin: 0, fontSize: 18, fontWeight: 700, color: '#1a1a1a' }}>
            {t.contactSeller}
          </h2>
          <button
            onClick={onClose}
            aria-label={t.close}
            style={{
              background: '#f5f5f5',
              border: 'none',
              borderRadius: '50%',
              width: 36,
              height: 36,
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: 18,
              color: '#666',
            }}
          >
            ✕
          </button>
        </div>

        {/* Options */}
        <div style={{ padding: '12px 16px 24px', display: 'flex', flexDirection: 'column', gap: 10 }}>

          {/* Chat */}
          <button
            onClick={handleChatClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #fff7ed 0%, #fff3e0 100%)',
              border: '1.5px solid #f97316',
              borderRadius: 14,
              cursor: 'pointer',
              textAlign: isRTL ? 'right' : 'left',
              width: '100%',
              transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ color: '#f97316', flexShrink: 0 }}>{icons.chat}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{t.chat}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.chatSub}</div>
            </div>
            <span style={{ color: '#f97316', fontSize: 18, transform: isRTL ? 'scaleX(-1)' : 'none' }}>›</span>
          </button>

          {/* WhatsApp */}
          {(sellerWhatsApp || sellerPhone) && (
            <button
              onClick={handleWhatsAppClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%)',
                border: '1.5px solid #25d366',
                borderRadius: 14,
                cursor: 'pointer',
                textAlign: isRTL ? 'right' : 'left',
                width: '100%',
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ color: '#25d366', flexShrink: 0 }}>{icons.whatsapp}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{t.whatsapp}</div>
                <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.whatsappSub}</div>
              </div>
              <span style={{ color: '#25d366', fontSize: 18, transform: isRTL ? 'scaleX(-1)' : 'none' }}>›</span>
            </button>
          )}

          {/* Phone Call */}
          {sellerPhone && (
            <button
              onClick={handlePhoneClick}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 14,
                padding: '14px 16px',
                background: 'linear-gradient(135deg, #eff6ff 0%, #dbeafe 100%)',
                border: '1.5px solid #3b82f6',
                borderRadius: 14,
                cursor: 'pointer',
                textAlign: isRTL ? 'right' : 'left',
                width: '100%',
                transition: 'transform 0.15s ease',
              }}
              onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
              onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
              onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
            >
              <span style={{ color: '#3b82f6', flexShrink: 0 }}>{icons.phone}</span>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{t.call}</div>
                <div style={{ fontSize: 12, color: phoneRevealed ? '#3b82f6' : '#888', marginTop: 2, fontWeight: phoneRevealed ? 600 : 400 }}>
                  {phoneRevealed ? phoneDisplay || t.callSub : t.callSub}
                </div>
              </div>
              <span style={{ color: '#3b82f6', fontSize: 18, transform: isRTL ? 'scaleX(-1)' : 'none' }}>›</span>
            </button>
          )}

          {/* Make Offer */}
          <button
            onClick={handleOfferClick}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 14,
              padding: '14px 16px',
              background: 'linear-gradient(135deg, #fdf4ff 0%, #fae8ff 100%)',
              border: '1.5px solid #a855f7',
              borderRadius: 14,
              cursor: 'pointer',
              textAlign: isRTL ? 'right' : 'left',
              width: '100%',
              transition: 'transform 0.15s ease',
            }}
            onMouseDown={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
            onTouchStart={e => e.currentTarget.style.transform = 'scale(0.98)'}
            onTouchEnd={e => e.currentTarget.style.transform = 'scale(1)'}
          >
            <span style={{ color: '#a855f7', flexShrink: 0 }}>{icons.offer}</span>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontWeight: 700, fontSize: 15, color: '#1a1a1a' }}>{t.offer}</div>
              <div style={{ fontSize: 12, color: '#888', marginTop: 2 }}>{t.offerSub}</div>
            </div>
            <span style={{ color: '#a855f7', fontSize: 18, transform: isRTL ? 'scaleX(-1)' : 'none' }}>›</span>
          </button>

        </div>

        {/* Safe fonts link */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap" rel="stylesheet" />
      </div>
    </>
  );
}
