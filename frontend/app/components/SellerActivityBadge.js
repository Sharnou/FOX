"use client";
import { useState, useEffect } from "react";

/**
 * SellerActivityBadge
 * Shows when a seller was last active with Arabic-first RTL support.
 * Usage: <SellerActivityBadge lastActive={seller.lastActive} lang={lang} />
 */
export default function SellerActivityBadge({ lastActive, lang = "ar" }) {
  const [label, setLabel] = useState("");

  const isRTL = lang === "ar";

  useEffect(() => {
    if (!lastActive) {
      setLabel(isRTL ? "غير معروف" : "Unknown");
      return;
    }

    const diff = Date.now() - new Date(lastActive).getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    let text = "";
    if (minutes < 5) {
      text = isRTL ? "متصل الآن" : "Online now";
    } else if (minutes < 60) {
      text = isRTL ? 'نشط منذ ' + minutes + ' دقيقة' : 'Active ' + minutes + 'm ago';
    } else if (hours < 24) {
      text = isRTL ? 'نشط منذ ' + hours + ' ساعة' : 'Active ' + hours + 'h ago';
    } else if (days === 1) {
      text = isRTL ? "نشط أمس" : "Active yesterday";
    } else if (days < 30) {
      text = isRTL ? 'نشط منذ ' + days + ' يوم' : 'Active ' + days + 'd ago';
    } else {
      text = isRTL ? "غير نشط" : "Inactive";
    }

    setLabel(text);
  }, [lastActive, isRTL]);

  const isOnline = !lastActive
    ? false
    : Date.now() - new Date(lastActive).getTime() < 300000;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "6px",
        fontSize: "13px",
        color: isOnline ? "#22c55e" : "#6b7280",
        fontFamily: isRTL ? "'Cairo', sans-serif" : "inherit",
      }}
    >
      <span
        style={{
          width: "8px",
          height: "8px",
          borderRadius: "50%",
          backgroundColor: isOnline ? "#22c55e" : "#9ca3af",
          display: "inline-block",
          flexShrink: 0,
        }}
      />
      <span>{label}</span>
    </div>
  );
}