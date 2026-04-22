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
  { key: "electronics",  image: "electronics",    ar: "إلكترونيات",  en: "Electronics",  de: "Elektronik"   },
  { key: "cars",         image: "cars",           ar: "سيارات",      en: "Cars",          de: "Autos"        },
  { key: "realestate",   image: "real-estate",    ar: "عقارات",      en: "Real Estate",   de: "Immobilien"   },
  { key: "jobs",         image: "jobs",           ar: "وظائف",       en: "Jobs",          de: "Jobs"         },
  { key: "services",     image: "services",       ar: "خدمات",       en: "Services",      de: "Dienstleist." },
  { key: "animals",      image: "animals",        ar: "حيوانات",     en: "Animals",       de: "Tiere"        },
  { key: "fashion",      image: "clothes",        ar: "أزياء",       en: "Fashion",       de: "Mode"         },
  { key: "furniture",    image: "furniture",      ar: "أثاث",        en: "Furniture",     de: "Möbel"        },
  { key: "sports",       image: "sports",         ar: "رياضة",       en: "Sports",        de: "Sport"        },
  { key: "books",        image: "books",          ar: "كتب",         en: "Books",         de: "Bücher"       },
  { key: "kids",         image: "toys",           ar: "أطفال",       en: "Kids",          de: "Kinder"       },
  { key: "other",        image: "other",          ar: "أخرى",        en: "Other",         de: "Sonstiges"    },
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
                justifyContent: "flex-start",
                gap: "0",
                padding: "0",
                borderRadius: "14px",
                border: isActive ? "2px solid #FF6B35" : "2px solid #f0f0f0",
                background: "#fff",
                cursor: "pointer",
                transition: "all 0.18s ease",
                boxShadow: isActive
                  ? "0 4px 16px rgba(255,107,53,0.18)"
                  : "0 2px 8px rgba(0,0,0,0.06)",
                transform: isActive ? "scale(1.04)" : "scale(1)",
                position: "relative",
                outline: "none",
                overflow: "hidden",
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
              {/* Category Image */}
              <img
                src={`/category-images/${cat.image}.jpg`}
                alt={cat[lang] || cat.ar}
                style={{
                  width: "100%",
                  height: "70px",
                  objectFit: "cover",
                  display: "block",
                  borderRadius: "12px 12px 0 0",
                }}
                onError={(e) => {
                  e.target.src = "/category-images/other.jpg";
                }}
              />

              {/* Category Name */}
              <div style={{ padding: "8px 6px 6px", width: "100%" }}>
                <span
                  style={{
                    fontSize: "12px",
                    fontWeight: "600",
                    color: isActive ? "#FF6B35" : "#333",
                    textAlign: "center",
                    lineHeight: "1.3",
                    wordBreak: "break-word",
                    display: "block",
                  }}
                >
                  {cat[lang] || cat.ar}
                </span>

                {/* Count badge */}
                {count !== undefined && count !== null && (
                  <span
                    style={{
                      display: "block",
                      fontSize: "10px",
                      fontWeight: "500",
                      color: "#888",
                      background: "#f5f5f5",
                      borderRadius: "20px",
                      padding: "1px 7px",
                      marginTop: "4px",
                      textAlign: "center",
                    }}
                  >
                    {formatCount(count, lang)}
                  </span>
                )}
              </div>

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
      <style>{'\n        @import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap\');\n      '}</style>
    </div>
  );
}
