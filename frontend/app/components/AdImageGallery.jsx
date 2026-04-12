'use client';
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * AdImageGallery — Swipeable image gallery for XTOX ad detail pages
 * Features: touch/swipe, keyboard nav, lightbox/fullscreen, RTL support, Arabic labels
 * Usage: <AdImageGallery images={[...urls]} alt="ad title" lang="ar" />
 */
export default function AdImageGallery({ images = [], alt = '', lang = 'ar' }) {
  const isRTL = lang === 'ar' || lang === 'he' || lang === 'fa';
  const [current, setCurrent] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [loaded, setLoaded] = useState({});
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const galleryRef = useRef(null);

  const total = images.length;

  const labels = {
    ar: { prev: 'السابق', next: 'التالي', close: 'إغلاق', image: 'صورة', of: 'من', expand: 'عرض كامل', thumb: 'صورة مصغرة' },
    en: { prev: 'Previous', next: 'Next', close: 'Close', image: 'Image', of: 'of', expand: 'Full view', thumb: 'Thumbnail' },
  };
  const t = labels[lang] || labels['ar'];

  const goTo = useCallback((idx) => {
    setCurrent((idx + total) % total);
  }, [total]);

  const goPrev = useCallback(() => goTo(current + (isRTL ? 1 : -1)), [current, goTo, isRTL]);
  const goNext = useCallback(() => goTo(current + (isRTL ? -1 : 1)), [current, goTo, isRTL]);

  // Keyboard navigation
  useEffect(() => {
    if (!lightbox) return;
    const handleKey = (e) => {
      if (e.key === 'ArrowLeft') isRTL ? goNext() : goPrev();
      if (e.key === 'ArrowRight') isRTL ? goPrev() : goNext();
      if (e.key === 'Escape') setLightbox(false);
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [lightbox, goPrev, goNext, isRTL]);

  // Touch/swipe handlers
  const onTouchStart = (e) => {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  };
  const onTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      if (dx < 0) goNext();
      else goPrev();
    }
    touchStartX.current = null;
    touchStartY.current = null;
  };

  const handleImageLoad = (idx) => setLoaded(prev => ({ ...prev, [idx]: true }));

  if (!images || total === 0) {
    return (
      <div style={{ width: '100%', height: 240, background: '#f0f0f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#aaa', fontSize: 14 }}>
        {lang === 'ar' ? 'لا توجد صور' : 'No images'}
      </div>
    );
  }

  const counterText = isRTL
    ? total + ' ' + t.of + ' ' + current + 1 + ' ' + t.image
    : t.image + ' ' + current + 1 + ' ' + t.of + ' ' + total;

  return (
    <div ref={galleryRef} dir={isRTL ? 'rtl' : 'ltr'} style={{ width: '100%', userSelect: 'none' }}>
      {/* Main image area */}
      <div
        style={{ position: 'relative', width: '100%', height: 320, borderRadius: 16, overflow: 'hidden', background: '#111', cursor: 'zoom-in' }}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
        onClick={() => setLightbox(true)}
      >
        {/* Loading shimmer */}
        {!loaded[current] && (
          <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(90deg,#e0e0e0 25%,#f5f5f5 50%,#e0e0e0 75%)', backgroundSize: '200% 100%', animation: 'shimmer 1.5s infinite' }} />
        )}
        <img
          key={current}
          src={images[current]}
          alt={alt + ' - ' + counterText}
          onLoad={() => handleImageLoad(current)}
          style={{ width: '100%', height: '100%', objectFit: 'cover', display: loaded[current] ? 'block' : 'none', transition: 'opacity 0.2s' }}
        />

        {/* Nav buttons */}
        {total > 1 && (
          <>
            <button
              onClick={(e) => { e.stopPropagation(); goPrev(); }}
              aria-label={t.prev}
              style={navBtnStyle(isRTL ? 'right' : 'left')}
            >
              {isRTL ? '›' : '‹'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); goNext(); }}
              aria-label={t.next}
              style={navBtnStyle(isRTL ? 'left' : 'right')}
            >
              {isRTL ? '‹' : '›'}
            </button>
          </>
        )}

        {/* Counter badge */}
        <div style={{ position: 'absolute', bottom: 10, [isRTL ? 'left' : 'right']: 12, background: 'rgba(0,0,0,0.55)', color: '#fff', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontFamily: isRTL ? 'Cairo, sans-serif' : 'inherit', backdropFilter: 'blur(4px)' }}>
          {counterText}
        </div>

        {/* Expand icon */}
        <div style={{ position: 'absolute', top: 10, [isRTL ? 'right' : 'left']: 12, background: 'rgba(0,0,0,0.45)', color: '#fff', borderRadius: 8, padding: '4px 8px', fontSize: 11, backdropFilter: 'blur(4px)' }}>
          ⛶ {t.expand}
        </div>
      </div>

      {/* Dot indicators */}
      {total > 1 && total <= 10 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 10 }}>
          {images.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={t.image + ' ' + i + 1}
              style={{ width: i === current ? 20 : 8, height: 8, borderRadius: 4, border: 'none', background: i === current ? '#2563eb' : '#cbd5e1', cursor: 'pointer', transition: 'all 0.2s', padding: 0 }}
            />
          ))}
        </div>
      )}

      {/* Thumbnail strip (for 2-8 images) */}
      {total >= 2 && total <= 8 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 12, overflowX: 'auto', padding: '4px 0' }}>
          {images.map((url, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              aria-label={t.thumb + ' ' + i + 1}
              style={{ flexShrink: 0, width: 60, height: 60, borderRadius: 8, overflow: 'hidden', border: i === current ? '2px solid #2563eb' : '2px solid transparent', padding: 0, cursor: 'pointer', background: '#f0f0f0' }}
            >
              <img src={url} alt={t.thumb + ' ' + i + 1} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            </button>
          ))}
        </div>
      )}

      {/* Lightbox/Fullscreen overlay */}
      {lightbox && (
        <div
          style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.92)', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
          dir={isRTL ? 'rtl' : 'ltr'}
        >
          <button onClick={() => setLightbox(false)} aria-label={t.close} style={{ position: 'absolute', top: 16, [isRTL ? 'left' : 'right']: 16, background: 'rgba(255,255,255,0.15)', border: 'none', color: '#fff', fontSize: 22, borderRadius: 8, width: 40, height: 40, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>✕</button>
          <img src={images[current]} alt={alt + ' ' + current + 1} style={{ maxWidth: '90vw', maxHeight: '80vh', objectFit: 'contain', borderRadius: 8 }} />
          {total > 1 && (
            <div style={{ display: 'flex', gap: 20, marginTop: 20 }}>
              <button onClick={goPrev} style={lbNavBtn}>{isRTL ? '›' : '‹'} {t.prev}</button>
              <span style={{ color: '#aaa', fontSize: 13, alignSelf: 'center' }}>{counterText}</span>
              <button onClick={goNext} style={lbNavBtn}>{t.next} {isRTL ? '‹' : '›'}</button>
            </div>
          )}
        </div>
      )}

      <style>{"@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }"}</style>
    </div>
  );
}

function navBtnStyle(side) {
  return {
    position: 'absolute', top: '50%', [side]: 10, transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.45)', border: 'none', color: '#fff',
    fontSize: 24, width: 36, height: 36, borderRadius: '50%',
    cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
    backdropFilter: 'blur(4px)', transition: 'background 0.2s',
    zIndex: 2,
  };
}
const lbNavBtn = {
  background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.2)',
  color: '#fff', padding: '8px 20px', borderRadius: 8, cursor: 'pointer', fontSize: 14,
};
