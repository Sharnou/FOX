"use client";

/**
 * AdViewCounter — XTOX Arab Marketplace
 *
 * Shows how many people viewed an ad today with:
 *  - Animated counting-up number (RAF-based, no deps)
 *  - Eye icon (inline SVG, zero import cost)
 *  - "Hot" badge when views exceed a threshold
 *  - Full Arabic / RTL support
 *  - Compact & detailed display modes
 *
 * Props:
 *  viewCount   {number}  total view count for this ad
 *  todayCount  {number}  views today specifically (optional)
 *  lang        {string}  "ar" | "en"  (default "ar")
 *  compact     {boolean} small pill mode (default false)
 *  hotThreshold {number} views-today threshold to show "🔥 رائج" (default 50)
 */

import { useEffect, useRef, useState } from "react";

/* ─── tiny animation hook ─────────────────────────────────── */
function useCountUp(target, duration = 1200) {
  const [value, setValue] = useState(0);
  const raf = useRef(null);

  useEffect(() => {
    if (!target || target <= 0) {
      setValue(0);
      return;
    }
    const start = performance.now();
    const step = (now) => {
      const elapsed = now - start;
      const progress = Math.min(elapsed / duration, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      setValue(Math.round(eased * target));
      if (progress < 1) raf.current = requestAnimationFrame(step);
    };
    raf.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf.current);
  }, [target, duration]);

  return value;
}

/* ─── number formatter ────────────────────────────────────── */
function formatNum(n, lang) {
  if (n >= 1000) {
    const k = (n / 1000).toFixed(1).replace(/\.0$/, "");
    return lang === "ar" ? `${k}ك` : `${k}k`;
  }
  return String(n);
}

/* ─── i18n strings ────────────────────────────────────────── */
const i18n = {
  ar: {
    viewedToday: (n) => `${n} شخص شاهد هذا الإعلان اليوم`,
    totalViews:  (n) => `${n} مشاهدة إجمالية`,
    hot:         "🔥 رائج",
    views:       "مشاهدة",
  },
  en: {
    viewedToday: (n) => `${n} people viewed this today`,
    totalViews:  (n) => `${n} total views`,
    hot:         "🔥 Hot",
    views:       "views",
  },
};

/* ─── Eye SVG icon ────────────────────────────────────────── */
function EyeIcon({ size = 16, color = "currentColor" }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ─── Main component ──────────────────────────────────────── */
export default function AdViewCounter({
  viewCount = 0,
  todayCount,
  lang = "ar",
  compact = false,
  hotThreshold = 50,
}) {
  const t = i18n[lang] ?? i18n.ar;
  const isRTL = lang === "ar";

  // use todayCount if provided, else fall back to viewCount for animation
  const displayTarget = todayCount !== undefined ? todayCount : viewCount;
  const animatedVal = useCountUp(displayTarget);
  const totalAnimated = useCountUp(viewCount);

  const isHot = (todayCount ?? viewCount) >= hotThreshold;

  /* ── compact pill ── */
  if (compact) {
    return (
      <span
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "3px 8px",
          borderRadius: "999px",
          background: isHot ? "#fff3e0" : "#f5f5f5",
          color: isHot ? "#e65100" : "#555",
          fontSize: "12px",
          fontWeight: 500,
          fontFamily: isRTL
            ? "'Noto Sans Arabic', Tahoma, sans-serif"
            : "inherit",
          border: isHot ? "1px solid #ffb74d" : "1px solid #ddd",
          whiteSpace: "nowrap",
          userSelect: "none",
        }}
        title={
          todayCount !== undefined
            ? t.viewedToday(todayCount)
            : t.totalViews(viewCount)
        }
      >
        <EyeIcon size={13} color={isHot ? "#e65100" : "#888"} />
        <span>{formatNum(animatedVal, lang)}</span>
        {isHot && (
          <span style={{ fontSize: "11px" }}>{t.hot}</span>
        )}
      </span>
    );
  }

  /* ── full card ── */
  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        display: "inline-flex",
        flexDirection: "column",
        gap: "4px",
        padding: "10px 14px",
        borderRadius: "12px",
        background: isHot
          ? "linear-gradient(135deg,#fff8f0 0%,#fff3e0 100%)"
          : "#fafafa",
        border: isHot ? "1px solid #ffcc80" : "1px solid #e0e0e0",
        boxShadow: "0 1px 4px rgba(0,0,0,0.06)",
        fontFamily: isRTL
          ? "'Noto Sans Arabic', Tahoma, sans-serif"
          : "inherit",
        userSelect: "none",
        minWidth: "120px",
      }}
    >
      {/* Today row */}
      {todayCount !== undefined && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: isHot ? "#e65100" : "#333",
            fontWeight: 700,
            fontSize: "15px",
          }}
        >
          <EyeIcon size={17} color={isHot ? "#e65100" : "#555"} />
          <span>{formatNum(animatedVal, lang)}</span>
          {isHot && (
            <span
              style={{
                fontSize: "12px",
                background: "#ff6f00",
                color: "#fff",
                padding: "1px 6px",
                borderRadius: "8px",
                fontWeight: 600,
              }}
            >
              {t.hot}
            </span>
          )}
        </div>
      )}

      {/* Today label */}
      {todayCount !== undefined && (
        <div
          style={{
            fontSize: "11px",
            color: "#888",
            lineHeight: 1.3,
          }}
        >
          {t.viewedToday(formatNum(todayCount, lang))}
        </div>
      )}

      {/* Total views */}
      {todayCount === undefined ? (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "6px",
            color: "#333",
            fontWeight: 700,
            fontSize: "15px",
          }}
        >
          <EyeIcon size={17} color="#555" />
          <span>{formatNum(totalAnimated, lang)}</span>
          <span style={{ fontSize: "12px", color: "#888", fontWeight: 400 }}>
            {t.views}
          </span>
        </div>
      ) : (
        <div
          style={{
            fontSize: "11px",
            color: "#aaa",
          }}
        >
          {t.totalViews(formatNum(viewCount, lang))}
        </div>
      )}
    </div>
  );
}
