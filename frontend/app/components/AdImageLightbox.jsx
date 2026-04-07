"use client";
import { useEffect, useRef, useCallback, useState } from "react";

// ─── i18n ───────────────────────────────────────────────────────────────────
const T = {
  ar: {
    close: "إغلاق",
    prev: "السابق",
    next: "التالي",
    imageOf: (i, n) => `${toArabicIndic(i)} من ${toArabicIndic(n)}`,
    download: "تحميل",
    zoom_in: "تكبير",
    zoom_out: "تصغير",
    reset: "إعادة الحجم",
  },
  en: {
    close: "Close",
    prev: "Previous",
    next: "Next",
    imageOf: (i, n) => `${i} of ${n}`,
    download: "Download",
    zoom_in: "Zoom in",
    zoom_out: "Zoom out",
    reset: "Reset zoom",
  },
  de: {
    close: "Schließen",
    prev: "Zurück",
    next: "Weiter",
    imageOf: (i, n) => `${i} von ${n}`,
    download: "Herunterladen",
    zoom_in: "Vergrößern",
    zoom_out: "Verkleinern",
    reset: "Zoom zurücksetzen",
  },
};

const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

// ─── Component ───────────────────────────────────────────────────────────────
/**
 * AdImageLightbox
 *
 * Fullscreen image lightbox / gallery viewer for ad detail pages.
 *
 * Props:
 *   images      : string[]          – array of image URLs (min 1)
 *   initialIndex: number            – which image to open first (default 0)
 *   lang        : "ar"|"en"|"de"    – UI language (default "ar")
 *   onClose     : () => void        – called when lightbox closes
 *   className   : string?           – extra classes on root
 *
 * Features:
 *   • Touch-swipe left/right navigation
 *   • Pinch-to-zoom (CSS scale transform, no external deps)
 *   • Double-tap to zoom 2× / reset
 *   • Keyboard: ← → Escape
 *   • Arabic-Indic image counter for Arabic locale
 *   • RTL-aware navigation arrows
 *   • Tailwind-only styling, zero npm deps
 *   • Cairo / Tajawal font (loaded via parent layout)
 */
export default function AdImageLightbox({
  images = [],
  initialIndex = 0,
  lang = "ar",
  onClose,
  className = "",
}) {
  const t = T[lang] || T.ar;
  const isRTL = lang === "ar";

  const [index, setIndex] = useState(
    Math.min(Math.max(initialIndex, 0), images.length - 1)
  );
  const [scale, setScale] = useState(1);
  const [translateX, setTranslateX] = useState(0);
  const [translateY, setTranslateY] = useState(0);
  const [animDir, setAnimDir] = useState(null); // "left"|"right"|null

  const touchStartX = useRef(null);
  const touchStartY = useRef(null);
  const lastTouchDist = useRef(null);
  const lastTap = useRef(0);
  const imgRef = useRef(null);
  const isDragging = useRef(false);

  const total = images.length;

  // ── Reset zoom when image changes ──────────────────────────────────────────
  useEffect(() => {
    setScale(1);
    setTranslateX(0);
    setTranslateY(0);
  }, [index]);

  // ── Keyboard navigation ───────────────────────────────────────────────────
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "ArrowRight") isRTL ? prev() : next();
      if (e.key === "ArrowLeft") isRTL ? next() : prev();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, isRTL]);

  // ── Prevent background scroll ─────────────────────────────────────────────
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const navigate = useCallback(
    (dir) => {
      // dir: 1 = forward, -1 = backward
      setAnimDir(dir === 1 ? "left" : "right");
      setTimeout(() => {
        setIndex((prev) => (prev + dir + total) % total);
        setAnimDir(null);
      }, 180);
    },
    [total]
  );

  const next = useCallback(() => navigate(1), [navigate]);
  const prev = useCallback(() => navigate(-1), [navigate]);

  // ── Touch handlers ────────────────────────────────────────────────────────
  const onTouchStart = (e) => {
    if (e.touches.length === 1) {
      touchStartX.current = e.touches[0].clientX;
      touchStartY.current = e.touches[0].clientY;
      isDragging.current = false;
    }
    if (e.touches.length === 2) {
      lastTouchDist.current = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
    }
  };

  const onTouchMove = (e) => {
    if (e.touches.length === 2 && lastTouchDist.current) {
      e.preventDefault();
      const dist = Math.hypot(
        e.touches[1].clientX - e.touches[0].clientX,
        e.touches[1].clientY - e.touches[0].clientY
      );
      const delta = dist / lastTouchDist.current;
      setScale((s) => Math.min(Math.max(s * delta, 1), 5));
      lastTouchDist.current = dist;
    }
    if (e.touches.length === 1 && touchStartX.current !== null) {
      const dx = Math.abs(e.touches[0].clientX - touchStartX.current);
      if (dx > 8) isDragging.current = true;
    }
  };

  const onTouchEnd = (e) => {
    lastTouchDist.current = null;
    if (touchStartX.current === null) return;

    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;

    // Double-tap to zoom
    const now = Date.now();
    if (!isDragging.current && Math.abs(dx) < 10 && Math.abs(dy) < 10) {
      if (now - lastTap.current < 300) {
        setScale((s) => (s > 1 ? 1 : 2));
        setTranslateX(0);
        setTranslateY(0);
      }
      lastTap.current = now;
    }

    // Swipe navigation (only when not zoomed in)
    if (scale === 1 && Math.abs(dx) > 50 && Math.abs(dy) < 60) {
      if (dx < 0) isRTL ? prev() : next();
      else isRTL ? next() : prev();
    }

    touchStartX.current = null;
    touchStartY.current = null;
    isDragging.current = false;
  };

  // ── Backdrop click close ──────────────────────────────────────────────────
  const onBackdropClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  // ── Zoom controls ─────────────────────────────────────────────────────────
  const zoomIn = () => setScale((s) => Math.min(s + 0.5, 5));
  const zoomOut = () => {
    setScale((s) => {
      const next = Math.max(s - 0.5, 1);
      if (next === 1) { setTranslateX(0); setTranslateY(0); }
      return next;
    });
  };
  const resetZoom = () => { setScale(1); setTranslateX(0); setTranslateY(0); };

  if (!images.length) return null;

  const transformStyle = {
    transform: `scale(${scale}) translate(${translateX}px, ${translateY}px)`,
    transition: "transform 0.15s ease",
  };

  const slideClass =
    animDir === "left"
      ? "opacity-0 -translate-x-8"
      : animDir === "right"
      ? "opacity-0 translate-x-8"
      : "opacity-100 translate-x-0";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`fixed inset-0 z-[999] flex flex-col bg-black/95 ${className}`}
      onClick={onBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-label={t.imageOf(index + 1, total)}
    >
      {/* ── Top bar ── */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
        {/* Counter */}
        <span
          className="text-white/80 text-sm font-medium"
          style={{ fontFamily: "Cairo, Tajawal, sans-serif" }}
        >
          {t.imageOf(index + 1, total)}
        </span>

        {/* Zoom controls */}
        <div className="flex items-center gap-2">
          <button
            onClick={zoomOut}
            disabled={scale <= 1}
            aria-label={t.zoom_out}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19A8 8 0 103 11a8 8 0 008 8zM8 11h6" />
            </svg>
          </button>
          <button
            onClick={zoomIn}
            disabled={scale >= 5}
            aria-label={t.zoom_in}
            className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 disabled:opacity-30 transition"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M21 21l-4.35-4.35M11 19A8 8 0 103 11a8 8 0 008 8zM11 8v6M8 11h6" />
            </svg>
          </button>
          {scale > 1 && (
            <button
              onClick={resetZoom}
              aria-label={t.reset}
              className="px-2 py-1 rounded text-white/70 hover:text-white hover:bg-white/10 text-xs transition"
              style={{ fontFamily: "Cairo, Tajawal, sans-serif" }}
            >
              {t.reset}
            </button>
          )}
        </div>

        {/* Close */}
        <button
          onClick={onClose}
          aria-label={t.close}
          className="p-1.5 rounded-full text-white/70 hover:text-white hover:bg-white/10 transition"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* ── Image area ── */}
      <div
        className="flex-1 relative flex items-center justify-center overflow-hidden select-none"
        onTouchStart={onTouchStart}
        onTouchMove={onTouchMove}
        onTouchEnd={onTouchEnd}
      >
        {/* Prev button */}
        {total > 1 && (
          <button
            onClick={isRTL ? next : prev}
            aria-label={t.prev}
            className={`absolute ${isRTL ? "right-2" : "left-2"} z-10 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isRTL ? "M9 5l7 7-7 7" : "M15 19l-7-7 7-7"} />
            </svg>
          </button>
        )}

        {/* Image */}
        <img
          ref={imgRef}
          src={images[index]}
          alt={`image-${index + 1}`}
          draggable={false}
          style={transformStyle}
          className={`max-h-[80vh] max-w-full object-contain transition-all duration-180 ${slideClass}`}
        />

        {/* Next button */}
        {total > 1 && (
          <button
            onClick={isRTL ? prev : next}
            aria-label={t.next}
            className={`absolute ${isRTL ? "left-2" : "right-2"} z-10 p-2 rounded-full bg-black/40 hover:bg-black/70 text-white transition`}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d={isRTL ? "M15 19l-7-7 7-7" : "M9 5l7 7-7 7"} />
            </svg>
          </button>
        )}
      </div>

      {/* ── Thumbnail strip ── */}
      {total > 1 && (
        <div className="flex gap-2 px-4 py-3 bg-black/60 overflow-x-auto justify-center">
          {images.map((src, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className={`flex-shrink-0 w-14 h-14 rounded overflow-hidden border-2 transition ${
                i === index ? "border-indigo-400 opacity-100" : "border-transparent opacity-50 hover:opacity-75"
              }`}
            >
              <img src={src} alt={`thumb-${i + 1}`} className="w-full h-full object-cover" draggable={false} />
            </button>
          ))}
        </div>
      )}

      {/* ── Bottom: download link ── */}
      <div className="flex justify-center py-2 bg-black/60">
        <a
          href={images[index]}
          download
          className="flex items-center gap-1.5 text-white/60 hover:text-white/90 text-xs transition"
          style={{ fontFamily: "Cairo, Tajawal, sans-serif" }}
          onClick={(e) => e.stopPropagation()}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          {t.download}
        </a>
      </div>
    </div>
  );
}
