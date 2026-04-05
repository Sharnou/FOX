"use client";
import { useState, useEffect } from "react";

/**
 * SellerResponseRate
 * Shows seller response rate and average response time in Arabic.
 * Helps buyers gauge how responsive a seller is before contacting.
 *
 * Props:
 *   responseRate   {number}  0-100 (percentage of messages replied to)
 *   avgHours       {number}  average response time in hours
 *   lang           {string}  'ar' (default) or any locale
 *   compact        {boolean} compact badge mode (default false)
 */
export default function SellerResponseRate({
  responseRate = 0,
  avgHours = 0,
  lang = "ar",
  compact = false,
}) {
  const isRTL = lang === "ar" || lang === "ar-EG";

  // Determine tier based on response rate
  const getTier = (rate) => {
    if (rate >= 90) return { label: "ممتاز", color: "#16a34a", bg: "#dcfce7", icon: "⚡" };
    if (rate >= 70) return { label: "جيد", color: "#2563eb", bg: "#dbeafe", icon: "✓" };
    if (rate >= 50) return { label: "متوسط", color: "#d97706", bg: "#fef3c7", icon: "~" };
    return { label: "منخفض", color: "#dc2626", bg: "#fee2e2", icon: "!" };
  };

  // Format response time label in Arabic
  const getResponseTimeLabel = (hours) => {
    if (hours === 0) return "يرد فوراً";
    if (hours < 1) return "يرد خلال أقل من ساعة";
    if (hours === 1) return "يرد خلال ساعة";
    if (hours < 24) return `يرد خلال ${Math.round(hours)} ساعات`;
    const days = Math.round(hours / 24);
    if (days === 1) return "يرد خلال يوم";
    return `يرد خلال ${days} أيام`;
  };

  const tier = getTier(responseRate);
  const timeLabel = getResponseTimeLabel(avgHours);

  // Animate the progress bar on mount
  const [animatedRate, setAnimatedRate] = useState(0);
  useEffect(() => {
    const timer = setTimeout(() => {
      let start = 0;
      const step = responseRate / 30;
      const interval = setInterval(() => {
        start += step;
        if (start >= responseRate) {
          setAnimatedRate(responseRate);
          clearInterval(interval);
        } else {
          setAnimatedRate(Math.round(start));
        }
      }, 16);
      return () => clearInterval(interval);
    }, 100);
    return () => clearTimeout(timer);
  }, [responseRate]);

  if (compact) {
    return (
      <span
        dir={isRTL ? "rtl" : "ltr"}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: "4px",
          padding: "2px 8px",
          borderRadius: "12px",
          backgroundColor: tier.bg,
          color: tier.color,
          fontSize: "12px",
          fontWeight: 600,
          fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit",
        }}
      >
        <span>{tier.icon}</span>
        <span>معدل الرد {responseRate}%</span>
      </span>
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit",
        backgroundColor: "#f9fafb",
        border: "1px solid #e5e7eb",
        borderRadius: "12px",
        padding: "14px 16px",
        maxWidth: "320px",
        width: "100%",
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: "10px",
        }}
      >
        <span style={{ fontSize: "14px", fontWeight: 700, color: "#111827" }}>
          معدل الاستجابة
        </span>
        <span
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "4px",
            padding: "2px 10px",
            borderRadius: "20px",
            backgroundColor: tier.bg,
            color: tier.color,
            fontSize: "12px",
            fontWeight: 700,
          }}
        >
          <span>{tier.icon}</span>
          <span>{tier.label}</span>
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          height: "8px",
          backgroundColor: "#e5e7eb",
          borderRadius: "4px",
          overflow: "hidden",
          marginBottom: "8px",
          direction: "ltr", // progress bar always LTR for fill direction
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${animatedRate}%`,
            backgroundColor: tier.color,
            borderRadius: "4px",
            transition: "width 0.05s linear",
          }}
        />
      </div>

      {/* Stats row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span style={{ fontSize: "13px", color: "#6b7280" }}>
          {timeLabel}
        </span>
        <span
          style={{
            fontSize: "15px",
            fontWeight: 800,
            color: tier.color,
          }}
        >
          {responseRate}%
        </span>
      </div>
    </div>
  );
}
