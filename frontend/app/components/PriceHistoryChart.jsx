"use client";

/**
 * PriceHistoryChart
 * ─────────────────
 * SVG price-history timeline for XTOX marketplace ads.
 * Shows how an ad's price changed over time with Arabic / bilingual support.
 *
 * Props:
 *   priceHistory  Array<{ price: number, date: string|Date, label?: string }>
 *                 sorted oldest → newest
 *   currency      string   default "ج.م"  (EGP)
 *   lang          "ar" | "en"   default "ar"
 *   title         string   optional override
 *
 * Zero external dependencies – pure React + inline CSS + SVG.
 * Cairo / Tajawal fonts loaded from Google Fonts.
 */

import React, { useMemo, useState } from "react";

/* ─── i18n strings ──────────────────────────────────────────────── */
const i18n = {
  ar: {
    title: "تاريخ السعر",
    current: "السعر الحالي",
    original: "السعر الأصلي",
    dropped: "انخفض السعر",
    raised: "ارتفع السعر",
    unchanged: "السعر ثابت",
    noData: "لا توجد بيانات تاريخ أسعار",
    today: "اليوم",
    yesterday: "أمس",
    daysAgo: (n) => 'منذ ' + n + ' أيام',
    change: "التغيير",
    save: "توفير",
  },
  en: {
    title: "Price History",
    current: "Current Price",
    original: "Original Price",
    dropped: "Price Dropped",
    raised: "Price Raised",
    unchanged: "Price Unchanged",
    noData: "No price history available",
    today: "Today",
    yesterday: "Yesterday",
    daysAgo: (n) => n + ' days ago',
    change: "Change",
    save: "Save",
  },
};

/* ─── helpers ───────────────────────────────────────────────────── */
function formatPrice(amount, currency) {
  return Number(amount).toLocaleString("ar-EG") + ' ' + currency;
}

function relativeDate(date, t) {
  const d = new Date(date);
  const now = new Date();
  const diffDays = Math.round((now - d) / 86400000);
  if (diffDays === 0) return t.today;
  if (diffDays === 1) return t.yesterday;
  return t.daysAgo(diffDays);
}

function trendColor(pct) {
  if (pct < 0) return "#10b981"; // green  – price fell (good for buyer)
  if (pct > 0) return "#ef4444"; // red    – price rose
  return "#94a3b8";              // neutral
}

/* ─── SVG Chart ─────────────────────────────────────────────────── */
function MiniChart({ history, width = 280, height = 90 }) {
  const [hovered, setHovered] = useState(null);

  const prices = history.map((h) => h.price);
  const minP = Math.min(...prices);
  const maxP = Math.max(...prices);
  const range = maxP - minP || 1;

  const pad = { top: 10, right: 16, bottom: 10, left: 16 };
  const innerW = width - pad.left - pad.right;
  const innerH = height - pad.top - pad.bottom;

  const points = history.map((h, i) => ({
    x: pad.left + (i / Math.max(history.length - 1, 1)) * innerW,
    y: pad.top + ((maxP - h.price) / range) * innerH,
    price: h.price,
    date: h.date,
    label: h.label,
  }));

  const polyline = points.map((p) => p.x + ',' + p.y).join(" ");
  const areaClose = points[points.length - 1].x + ',' + pad.top + innerH + ' ' + pad.left + ',' + pad.top + innerH;
  const areaPath = 'M ' + polyline + ' L ' + areaClose + ' Z';

  const first = prices[0];
  const last = prices[prices.length - 1];
  const stroke = last <= first ? "#10b981" : "#ef4444";
  const fillId = 'grad-' + Math.random().toString(36).slice(2, 7);

  return (
    <svg
      width={width}
      height={height}
      viewBox={'0 0 ' + width + ' ' + height}
      style={{ overflow: "visible", display: "block" }}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={fillId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.25" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0.02" />
        </linearGradient>
      </defs>

      {/* area fill */}
      <path d={areaPath} fill={'url(#' + fillId + ')'} />

      {/* gridlines */}
      {[0.25, 0.5, 0.75].map((f) => (
        <line
          key={f}
          x1={pad.left}
          x2={pad.left + innerW}
          y1={pad.top + f * innerH}
          y2={pad.top + f * innerH}
          stroke="#e2e8f0"
          strokeWidth="1"
          strokeDasharray="4 3"
        />
      ))}

      {/* line */}
      <polyline
        points={polyline}
        fill="none"
        stroke={stroke}
        strokeWidth="2.5"
        strokeLinejoin="round"
        strokeLinecap="round"
      />

      {/* dots + hover targets */}
      {points.map((p, i) => (
        <g key={i}>
          <circle
            cx={p.x}
            cy={p.y}
            r={hovered === i ? 6 : 4}
            fill={i === points.length - 1 ? stroke : "#fff"}
            stroke={stroke}
            strokeWidth="2"
            style={{ cursor: "pointer", transition: "r 0.15s" }}
            onMouseEnter={() => setHovered(i)}
            onMouseLeave={() => setHovered(null)}
          />
          {hovered === i && (
            <foreignObject
              x={Math.min(p.x - 44, width - 100)}
              y={Math.max(p.y - 40, 0)}
              width="100"
              height="36"
            >
              <div
                xmlns="http://www.w3.org/1999/xhtml"
                style={{
                  background: "#1e293b",
                  color: "#fff",
                  borderRadius: "6px",
                  padding: "4px 8px",
                  fontSize: "11px",
                  lineHeight: "1.4",
                  fontFamily: "Cairo, sans-serif",
                  textAlign: "center",
                  whiteSpace: "nowrap",
                }}
              >
                <div style={{ fontWeight: 700 }}>
                  {Number(p.price).toLocaleString("ar-EG")}
                </div>
                <div style={{ opacity: 0.75, fontSize: "10px" }}>
                  {p.label || ""}
                </div>
              </div>
            </foreignObject>
          )}
        </g>
      ))}
    </svg>
  );
}

/* ─── Main Component ────────────────────────────────────────────── */
export default function PriceHistoryChart({
  priceHistory = [],
  currency = "ج.م",
  lang = "ar",
  title,
}) {
  const t = i18n[lang] || i18n.ar;
  const isRTL = lang === "ar";

  /* Derive stats */
  const stats = useMemo(() => {
    if (!priceHistory || priceHistory.length < 1) return null;
    const sorted = [...priceHistory].sort(
      (a, b) => new Date(a.date) - new Date(b.date)
    );
    const first = sorted[0].price;
    const last = sorted[sorted.length - 1].price;
    const change = last - first;
    const pct = ((change / first) * 100).toFixed(1);
    return { sorted, first, last, change, pct };
  }, [priceHistory]);

  /* ─── styles ─── */
  const rootStyle = {
    fontFamily: "'Cairo', 'Tajawal', 'Segoe UI', sans-serif",
    direction: isRTL ? "rtl" : "ltr",
    background: "#ffffff",
    border: "1.5px solid #e2e8f0",
    borderRadius: "14px",
    padding: "16px",
    maxWidth: "340px",
    boxShadow: "0 2px 12px rgba(0,0,0,0.07)",
    boxSizing: "border-box",
    width: "100%",
  };

  const headerStyle = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: "12px",
  };

  const titleStyle = {
    fontSize: "14px",
    fontWeight: 700,
    color: "#0f172a",
    margin: 0,
  };

  /* ─── No data ─── */
  if (!stats || stats.sorted.length < 2) {
    return (
      <>
        <style>{'@import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap\');'}</style>
        <div style={rootStyle}>
          <p
            style={{
              margin: 0,
              color: "#94a3b8",
              fontSize: "13px",
              textAlign: "center",
              padding: "20px 0",
            }}
          >
            {t.noData}
          </p>
        </div>
      </>
    );
  }

  const { sorted, first, last, change, pct } = stats;
  const trend = change < 0 ? "dropped" : change > 0 ? "raised" : "unchanged";
  const color = trendColor(Number(pct));

  const enriched = sorted.map((h) => ({
    ...h,
    label: relativeDate(h.date, t),
  }));

  return (
    <>
      <style>{'\n        @import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap\');\n        .phc-row { display: flex; justify-content: space-between; margin-top: 12px; gap: 8px; }\n        .phc-stat { flex: 1; background: #f8fafc; border-radius: 10px; padding: 8px 10px; text-align: center; }\n        .phc-stat-label { font-size: 10px; color: #94a3b8; margin-bottom: 2px; }\n        .phc-stat-value { font-size: 13px; font-weight: 700; color: #0f172a; }\n        .phc-badge { display: inline-flex; align-items: center; gap: 4px; border-radius: 20px; padding: 3px 10px; font-size: 12px; font-weight: 600; }\n        .phc-timeline { margin-top: 14px; display: flex; flex-direction: column; gap: 0; }\n        .phc-tl-item { display: flex; align-items: flex-start; gap: 10px; padding: 6px 0; position: relative; }\n        .phc-tl-item:not(:last-child)::after {\n          content: \'\';\n          position: absolute;\n          ' + (isRTL ? "right" : "left") + ': 9px;\n          top: 24px;\n          bottom: -6px;\n          width: 2px;\n          background: #e2e8f0;\n        }\n        .phc-dot { width: 18px; height: 18px; border-radius: 50%; border: 2px solid; flex-shrink: 0; margin-top: 2px; }\n        .phc-tl-date { font-size: 11px; color: #94a3b8; }\n        .phc-tl-price { font-size: 14px; font-weight: 700; }\n        .phc-tl-diff { font-size: 11px; margin-top: 2px; }\n      '}</style>

      <div style={rootStyle} role="region" aria-label={title || t.title}>
        {/* Header */}
        <div style={headerStyle}>
          <h3 style={titleStyle}>
            📈 {title || t.title}
          </h3>
          <span
            className="phc-badge"
            style={{
              background: color + '18',
              color,
            }}
          >
            {trend === "dropped" ? "▼" : trend === "raised" ? "▲" : "→"}{" "}
            {Math.abs(pct)}%
          </span>
        </div>

        {/* Current price */}
        <div
          style={{
            background: color + '12',
            borderRadius: "10px",
            padding: "10px 14px",
            marginBottom: "14px",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <div>
            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
              {t.current}
            </div>
            <div style={{ fontSize: "20px", fontWeight: 800, color: "#0f172a" }}>
              {formatPrice(last, currency)}
            </div>
          </div>
          <div style={{ textAlign: isRTL ? "left" : "right" }}>
            <div style={{ fontSize: "11px", color: "#64748b", marginBottom: "2px" }}>
              {t.original}
            </div>
            <div
              style={{
                fontSize: "14px",
                fontWeight: 600,
                color: "#94a3b8",
                textDecoration: "line-through",
              }}
            >
              {formatPrice(first, currency)}
            </div>
          </div>
        </div>

        {/* SVG Chart */}
        <div
          style={{
            width: "100%",
            overflowX: "auto",
            borderRadius: "10px",
            background: "#f8fafc",
            padding: "6px 0",
          }}
        >
          <MiniChart history={enriched} width={296} height={88} />
        </div>

        {/* Stats row */}
        <div className="phc-row">
          <div className="phc-stat">
            <div className="phc-stat-label">{t.change}</div>
            <div className="phc-stat-value" style={{ color }}>
              {change > 0 ? "+" : ""}
              {Number(change).toLocaleString("ar-EG")} {currency}
            </div>
          </div>
          {change < 0 && (
            <div className="phc-stat">
              <div className="phc-stat-label">{t.save}</div>
              <div className="phc-stat-value" style={{ color: "#10b981" }}>
                {formatPrice(Math.abs(change), currency)}
              </div>
            </div>
          )}
          <div className="phc-stat">
            <div className="phc-stat-label">
              {trend === "dropped" ? t.dropped : trend === "raised" ? t.raised : t.unchanged}
            </div>
            <div className="phc-stat-value" style={{ color }}>
              {trend === "dropped" ? "✅" : trend === "raised" ? "⚠️" : "➡️"}
            </div>
          </div>
        </div>

        {/* Timeline */}
        <div className="phc-timeline" style={{ marginTop: "16px" }}>
          {enriched
            .slice()
            .reverse()
            .map((entry, idx, arr) => {
              const prev = arr[idx + 1];
              const diff = prev ? entry.price - prev.price : 0;
              const dotColor = !prev
                ? "#94a3b8"
                : diff < 0
                ? "#10b981"
                : diff > 0
                ? "#ef4444"
                : "#94a3b8";
              const isLatest = idx === 0;

              return (
                <div className="phc-tl-item" key={idx}>
                  <div
                    className="phc-dot"
                    style={{
                      borderColor: dotColor,
                      background: isLatest ? dotColor : "#fff",
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div className="phc-tl-date">{entry.label}</div>
                    <div className="phc-tl-price" style={{ color: isLatest ? dotColor : "#0f172a" }}>
                      {formatPrice(entry.price, currency)}
                      {isLatest && (
                        <span
                          style={{
                            fontSize: "10px",
                            background: dotColor,
                            color: "#fff",
                            borderRadius: "4px",
                            padding: "1px 5px",
                            marginRight: isRTL ? "6px" : 0,
                            marginLeft: isRTL ? 0 : "6px",
                            verticalAlign: "middle",
                          }}
                        >
                          {t.current}
                        </span>
                      )}
                    </div>
                    {diff !== 0 && (
                      <div
                        className="phc-tl-diff"
                        style={{ color: diff < 0 ? "#10b981" : "#ef4444" }}
                      >
                        {diff < 0 ? "▼" : "▲"}{" "}
                        {Math.abs(diff).toLocaleString("ar-EG")} {currency}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
        </div>
      </div>
    </>
  );
}

/* ─── Usage Example (dev only) ──────────────────────────────────── */
// <PriceHistoryChart
//   lang="ar"
//   currency="ج.م"
//   priceHistory={[
//     { price: 5000, date: "2025-01-15" },
//     { price: 4500, date: "2025-02-10" },
//     { price: 4200, date: "2025-03-01" },
//     { price: 3800, date: "2025-04-05" },
//   ]}
// />
