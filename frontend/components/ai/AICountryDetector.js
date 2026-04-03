'use client';
import { useEffect, useState } from "react";
import { Globe, X } from "lucide-react";

const BROWSER_LANG_MAP = {
  ar: { country: "Egypt", currency: "EGP", flag: "🇪🇬" },
  "ar-AE": { country: "UAE", currency: "AED", flag: "🇦🇪" },
  "ar-SA": { country: "Saudi Arabia", currency: "SAR", flag: "🇸🇦" },
  en: { country: "USA", currency: "USD", flag: "🇺🇸" },
  "en-GB": { country: "UK", currency: "GBP", flag: "🇬🇧" },
  fr: { country: "France", currency: "EUR", flag: "🇫🇷" },
  de: { country: "Germany", currency: "EUR", flag: "🇩🇪" },
};

export default function AICountryDetector({ onDetected }) {
  const [detected, setDetected] = useState(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    if (typeof navigator === "undefined") return;
    const lang = navigator.language || navigator.languages?.[0] || "en";
    const match = BROWSER_LANG_MAP[lang] || BROWSER_LANG_MAP[lang.split("-")[0]];
    if (match) {
      setDetected(match);
      onDetected?.(match.country);
    }
  }, []);

  if (!detected || dismissed) return null;

  return (
    <div style={{
      background: "rgba(37,99,235,0.05)", border: "1px solid rgba(37,99,235,0.2)",
      borderRadius: 16, padding: "12px 16px", display: "flex", alignItems: "center",
      justifyContent: "space-between", gap: 12, maxWidth: 1280, margin: "12px auto",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <Globe style={{ width: 16, height: 16, color: "#2563eb", flexShrink: 0 }} />
        <p style={{ fontSize: 14, margin: 0 }}>
          <span style={{ marginRight: 4 }}>{detected.flag}</span>
          <strong>الموقع المكتشف: {detected.country}</strong>
          <span style={{ color: "#6b7280", marginRight: 4 }}>— عرض الأسعار بـ {detected.currency}</span>
        </p>
      </div>
      <button onClick={() => setDismissed(true)} style={{ background: "none", border: "none", cursor: "pointer", padding: 4, borderRadius: 6 }}>
        <X style={{ width: 16, height: 16, color: "#6b7280" }} />
      </button>
    </div>
  );
}
