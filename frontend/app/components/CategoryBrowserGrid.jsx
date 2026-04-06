"use client";
import { useState } from "react";

/**
 * CategoryBrowserGrid
 * Visual category browser grid for XTOX Arab marketplace.
 * Props:
 *   lang       - "ar" | "en" | "de" (default "ar")
 *   onCategorySelect(categoryKey) - callback
 *   counts     - optional object { electronics: 1234, cars: 567, ... }
 */

const CATEGORIES = [
  { key: "electronics",  emoji: "📱", ar: "إلكترونيات",  en: "Electronics",  de: "Elektronik"   },
  { key: "cars",         emoji: "🚗", ar: "سيارات",      en: "Cars",          de: "Autos"        },
  { key: "realestate",   emoji: "🏠", ar: "عقارات",      en: "Real Estate",   de: "Immobilien"   },
  { key: "jobs",         emoji: "💼", ar: "وظائف",       en: "Jobs",          de: "Jobs"         },
  { key: "services",     emoji: "🔧", ar: "خدمات",       en: "Services",      de: "Dienstleist." },
  { key: "animals",      emoji: "🐾", ar: "حيوانات",     en: "Animals",       de: "Tiere"        },
  { key: "fashion",      emoji: "👗", ar: "أزياء",       en: "Fashion",       de: "Mode"         },
  { key: "furniture",    emoji: "🛋️", ar: "أثاث",        en: "Furniture",     de: "Möbel"        },
  { key: "sports",       emoji: "⚽", ar: "رياضة",       en: "Sports",        de: "Sport"        },
  { key: "books",        emoji: "📚", ar: "كتب",         en: "Books",         de: "Bücher"       },
  { key: "kids",         emoji: "🧸", ar: "أطفال",       en: "Kids",          de: "Kinder"       },
  { key: "other",        emoji: "📦", ar: "أخرى",        en: "Other",         de: "Sonstiges"    },
];

function toArabicNumerals(num) {
  return String(num).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function formatCount(n, lang) {
  if (!n && n !== 0) return null;
  const formatted = n >= 1000 ? (n / 1000).toFixed(1) + "k" : String(n);
  return lang === "ar" ? toArabicNumerals(formatted.replace("k", "ك")) : formatted;
}

export default function CategoryBrowserGrid({ lang = "ar", onCategorySelect, counts = {} }) {
  const [activeKey, setActiveKey] = useState(null);
  const isRtl = lang === "ar";

  const handleSelect = (key) => {
    setActiveKey(key);
    if (onCategorySelect) onCategorySelect(key);
  };

  const label = {
    ar: "تصفح الفئات",
    en: "Browse Categories",
    de: "Kategorien",
  };

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      style={{
        fontFamily: isRtl
          ? "'Cairo', 'Tajawal', sans-serif"
          : "'Cairo', sans-serif",
        padding: "16px",
        maxWidth: "600px",
        margin: "0 auto",
      }}
    >
      {/* Header */}
      <h2
        style={{
          fontSize: "18px",
          fontWeight: "700",
          color: "#1a1a1a",
          marginBottom: "14px",
          textAlign: isRtl ? "right" : "left",
        }}
      >
        {label[lang] || label.ar}
      </h2>

      {/* Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fill, minmax(110px, 1fr))",
          gap: "10px",
        }}
      >
        {CATEGORIES.map((cat) => {
          const isActive = activeKey === cat.key;
          const count = counts[cat.key];
          return (
            <button
              key={cat.key}
              onClick={() => handleSelect(cat.key)}
              aria-label={cat[lang] || cat.ar}
              style={{
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
                justifyContent: "center",
                gap: "6px",
                padding: "14px 8px",
                borderRadius: "14px",
                border: isActive ? "2px solid #FF6B35" : "2px solid #f0f0f0",
                background: isActive
                  ? "linear-gradient(135deg, #fff5f0 0%, #ffe8de 100%)"
                  : "#fff",
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: isActive
                  ? "0 4px 16px rgba(255,107,53,0.18)"
                  : "0 2px 8px rgba(0,0,0,0.06)",
                transform: isActive ? "scale(1.04)" : "scale(1)",
                position: "relative",
                outline: "none",
              }}
              onMouseEnter={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#FF6B35";
                  e.currentTarget.style.boxShadow = "0 4px 14px rgba(255,107,53,0.15)";
                  e.currentTarget.style.transform = "scale(1.03)";
                }
              }}
              onMouseLeave={(e) => {
                if (!isActive) {
                  e.currentTarget.style.borderColor = "#f0f0f0";
                  e.currentTarget.style.boxShadow = "0 2px 8px rgba(0,0,0,0.06)";
                  e.currentTarget.style.transform = "scale(1)";
                }
              }}
            >
              {/* Emoji */}
              <span style={{ fontSize: "28px", lineHeight: 1 }}>{cat.emoji}</span>

              {/* Category Name */}
              <span
                style={{
                  fontSize: "12px",
                  fontWeight: "600",
                  color: isActive ? "#FF6B35" : "#333",
                  textAlign: "center",
                  lineHeight: "1.3",
                  wordBreak: "break-word",
                }}
              >
                {cat[lang] || cat.ar}
              </span>

              {/* Count badge */}
              {count !== undefined && count !== null && (
                <span
                  style={{
                    fontSize: "10px",
                    fontWeight: "500",
                    color: "#888",
                    background: "#f5f5f5",
                    borderRadius: "20px",
                    padding: "1px 7px",
                  }}
                >
                  {formatCount(count, lang)}
                </span>
              )}

              {/* Active dot indicator */}
              {isActive && (
                <span
                  style={{
                    position: "absolute",
                    top: "7px",
                    [isRtl ? "left" : "right"]: "7px",
                    width: "8px",
                    height: "8px",
                    borderRadius: "50%",
                    background: "#FF6B35",
                  }}
                />
              )}
            </button>
          );
        })}
      </div>

      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
      `}</style>
    </div>
  );
}
