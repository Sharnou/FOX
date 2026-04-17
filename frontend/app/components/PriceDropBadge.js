"use client";
// PriceDropBadge.js — شارة انخفاض السعر
// Displays a badge when an ad's price has dropped from the original price.
// Supports RTL + Arabic. [run-120]


import React from "react";

/**
 * PriceDropBadge
 * Props:
 *   originalPrice {number}  - the old/original price
 *   currentPrice  {number}  - the new/current price
 *   currency      {string}  - currency label, e.g. "د.إ" or "ج.م" (default: "ريال")
 *   locale        {string}  - BCP-47 locale for number formatting (default: "ar-SA")
 *   className     {string}  - optional extra CSS class
 */
export default function PriceDropBadge({
  originalPrice,
  currentPrice,
  currency = "ريال",
  locale = "ar-SA",
  className = "",
}) {
  // Only show the badge if the price actually dropped
  if (
    !originalPrice ||
    !currentPrice ||
    typeof originalPrice !== "number" ||
    typeof currentPrice !== "number" ||
    currentPrice >= originalPrice
  ) {
    return null;
  }

  const dropAmount = originalPrice - currentPrice;
  const dropPercent = Math.round((dropAmount / originalPrice) * 100);

  const formatNum = (n) =>
    new Intl.NumberFormat(locale).format(n);

  return (
    <div
      dir="rtl"
      className={'price-drop-badge ' + className}
      style={styles.wrapper}
      title={'انخفض السعر من ' + formatNum(originalPrice) + ' إلى ' + formatNum(currentPrice) + ' ' + currency}
      aria-label={'انخفض السعر بنسبة ' + dropPercent + '٪'}
    >
      {/* Downward arrow icon */}
      <span style={styles.arrow} aria-hidden="true">↘</span>

      {/* Drop percentage */}
      <span style={styles.percent}>
        {dropPercent}٪ خصم
      </span>

      {/* Strikethrough original price */}
      <span style={styles.originalPrice}>
        <s>{formatNum(originalPrice)} {currency}</s>
      </span>
    </div>
  );
}

// ---------- inline styles (no extra CSS file needed) ----------
const styles = {
  wrapper: {
    display: "inline-flex",
    alignItems: "center",
    gap: "6px",
    backgroundColor: "#fff3f3",
    border: "1px solid #ff4d4f",
    borderRadius: "20px",
    padding: "3px 10px",
    fontSize: "12px",
    fontWeight: "600",
    color: "#c0392b",
    fontFamily: "'Noto Kufi Arabic', 'Cairo', 'Tajawal', sans-serif",
    userSelect: "none",
    whiteSpace: "nowrap",
    direction: "rtl",
  },
  arrow: {
    fontSize: "14px",
    lineHeight: 1,
    color: "#e74c3c",
  },
  percent: {
    color: "#c0392b",
    fontWeight: "700",
  },
  originalPrice: {
    color: "#999",
    fontWeight: "400",
    fontSize: "11px",
  },
};

/*
 * ──────────────────────────────────────────────────────────────
 * Usage example (inside your AdCard or AdDetail page):
 *
 *   import PriceDropBadge from "./components/PriceDropBadge";
 *
 *   <PriceDropBadge
 *     originalPrice={ad.originalPrice}
 *     currentPrice={ad.price}
 *     currency="ريال"
 *   />
 *
 * When originalPrice > currentPrice the badge renders, e.g.:
 *   ↘  20٪ خصم  ~~500 ريال~~
 *
 * When prices are equal or originalPrice is missing, nothing renders.
 * ──────────────────────────────────────────────────────────────
 */
