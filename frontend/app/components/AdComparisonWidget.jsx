"use client";
import { useState, useCallback } from "react";

/**
 * AdComparisonWidget — XTOX Marketplace
 * Allows users to compare up to 3 ads side-by-side in a modal.
 * Full RTL/Arabic support. No external dependencies.
 *
 * Props:
 *  ads   – array of ad objects: { _id, title, price, currency, condition,
 *            location, category, images, seller: { name, verificationLevel } }
 *  lang  – "ar" | "en" | "de" | ...  (default "ar")
 *  onClose – callback to close the widget
 */

const T = {
  ar: {
    compare: "مقارنة الإعلانات",
    close: "إغلاق",
    price: "السعر",
    condition: "الحالة",
    location: "الموقع",
    category: "الفئة",
    seller: "البائع",
    verified: "موثّق",
    unverified: "غير موثّق",
    addAd: "أضف إعلاناً للمقارنة",
    remove: "إزالة",
    noAds: "اختر إعلانين على الأقل للمقارنة",
    best: "الأفضل",
    contact: "تواصل مع البائع",
    new: "جديد",
    used: "مستعمل",
    likeNew: "شبه جديد",
    forParts: "للقطع",
  },
  en: {
    compare: "Compare Ads",
    close: "Close",
    price: "Price",
    condition: "Condition",
    location: "Location",
    category: "Category",
    seller: "Seller",
    verified: "Verified",
    unverified: "Unverified",
    addAd: "Add an ad to compare",
    remove: "Remove",
    noAds: "Select at least 2 ads to compare",
    best: "Best",
    contact: "Contact Seller",
    new: "New",
    used: "Used",
    likeNew: "Like New",
    forParts: "For Parts",
  },
};

const getT = (lang) => T[lang] || T.ar;
const isRTL = (lang) => ["ar", "he", "fa", "ur"].includes(lang);

const conditionLabel = (cond, t) => {
  const map = { new: t.new, used: t.used, likeNew: t.likeNew, forParts: t.forParts };
  return map[cond] || cond || "—";
};

const formatPrice = (price, currency, lang) => {
  if (!price && price !== 0) return "—";
  try {
    return new Intl.NumberFormat(lang === "ar" ? "ar-EG" : "en-US", {
      style: "currency",
      currency: currency || "EGP",
      maximumFractionDigits: 0,
    }).format(price);
  } catch {
    return price + ' ' + (currency || "EGP");
  }
};

const findBestPrice = (ads) => {
  const prices = ads.map((a) => Number(a.price)).filter((p) => !isNaN(p) && p > 0);
  return prices.length ? Math.min(...prices) : null;
};

export default function AdComparisonWidget({ ads = [], lang = "ar", onClose }) {
  const t = getT(lang);
  const rtl = isRTL(lang);
  const dir = rtl ? "rtl" : "ltr";
  const bestPrice = findBestPrice(ads);

  const [dismissed, setDismissed] = useState(false);

  const handleClose = useCallback(() => {
    setDismissed(true);
    onClose?.();
  }, [onClose]);

  if (dismissed || ads.length === 0) return null;

  // ── Styles ──────────────────────────────────────────────────────────────────
  const overlayStyle = {
    position: "fixed", inset: 0, zIndex: 9999,
    background: "rgba(0,0,0,0.6)", backdropFilter: "blur(4px)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
  };
  const sheetStyle = {
    width: "100%", maxWidth: 900,
    background: "#fff", borderRadius: "24px 24px 0 0",
    boxShadow: "0 -8px 40px rgba(0,0,0,0.25)",
    padding: "24px 20px 32px",
    direction: dir,
    fontFamily: "'Cairo','Tajawal',system-ui,sans-serif",
    overflowY: "auto", maxHeight: "90vh",
  };
  const headerStyle = {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    marginBottom: 20,
  };
  const titleStyle = {
    fontSize: 20, fontWeight: 700, color: "#1e293b",
  };
  const closeBtnStyle = {
    background: "#f1f5f9", border: "none", borderRadius: 12,
    padding: "8px 18px", cursor: "pointer",
    fontSize: 14, fontWeight: 600, color: "#64748b",
  };
  const tableStyle = {
    width: "100%", borderCollapse: "separate", borderSpacing: "8px 0",
  };
  const thStyle = (isBest) => ({
    background: isBest ? "linear-gradient(135deg,#f59e0b,#ef4444)" : "#f8fafc",
    color: isBest ? "#fff" : "#1e293b",
    borderRadius: "16px 16px 0 0",
    padding: "12px 16px",
    textAlign: "center",
    fontSize: 13,
    fontWeight: 700,
    position: "relative",
  });
  const tdStyle = (isBest, isLabel) => ({
    background: isLabel ? "#f1f5f9" : isBest ? "#fff7ed" : "#fff",
    border: isBest ? "2px solid #f59e0b" : "1px solid #e2e8f0",
    padding: "10px 14px",
    fontSize: 13,
    color: "#334155",
    textAlign: isLabel ? (rtl ? "right" : "left") : "center",
    fontWeight: isLabel ? 600 : 400,
  });
  const badgeStyle = {
    display: "inline-block",
    background: "linear-gradient(135deg,#f59e0b,#ef4444)",
    color: "#fff",
    borderRadius: 8,
    padding: "2px 8px",
    fontSize: 11,
    fontWeight: 700,
    marginTop: 4,
  };
  const contactBtnStyle = (isBest) => ({
    display: "block", width: "100%",
    background: isBest
      ? "linear-gradient(135deg,#f59e0b,#ef4444)"
      : "linear-gradient(135deg,#3b82f6,#6366f1)",
    color: "#fff",
    border: "none",
    borderRadius: 12,
    padding: "10px 0",
    fontSize: 13,
    fontWeight: 700,
    cursor: "pointer",
    marginTop: 8,
  });
  const imgStyle = {
    width: 80, height: 60,
    objectFit: "cover", borderRadius: 10,
    display: "block", margin: "0 auto 6px",
  };

  const noImgStyle = {
    width: 80, height: 60,
    background: "#e2e8f0", borderRadius: 10,
    display: "flex", alignItems: "center", justifyContent: "center",
    margin: "0 auto 6px", fontSize: 22,
  };

  const comparisonRows = [
    {
      label: t.price,
      render: (ad) => {
        const isBest = Number(ad.price) === bestPrice;
        return (
          <span style={{ fontWeight: 700, color: isBest ? "#ef4444" : "#1e293b" }}>
            {formatPrice(ad.price, ad.currency, lang)}
          </span>
        );
      },
    },
    { label: t.condition, render: (ad) => conditionLabel(ad.condition, t) },
    { label: t.location, render: (ad) => ad.location || "—" },
    { label: t.category, render: (ad) => ad.category || "—" },
    {
      label: t.seller,
      render: (ad) => (
        <span>
          {ad.seller?.name || "—"}
          <br />
          <span style={{ fontSize: 11, color: ad.seller?.verificationLevel >= 1 ? "#10b981" : "#94a3b8" }}>
            {ad.seller?.verificationLevel >= 1 ? '✓ ' + t.verified : t.unverified}
          </span>
        </span>
      ),
    },
  ];

  return (
    <div style={overlayStyle} onClick={(e) => e.target === e.currentTarget && handleClose()}>
      <div style={sheetStyle}>
        {/* Header */}
        <div style={headerStyle}>
          <span style={titleStyle}>⚖️ {t.compare}</span>
          <button style={closeBtnStyle} onClick={handleClose}>{t.close} ✕</button>
        </div>

        {ads.length < 2 ? (
          <p style={{ textAlign: "center", color: "#94a3b8", padding: 32 }}>{t.noAds}</p>
        ) : (
          <div style={{ overflowX: "auto" }}>
            <table style={tableStyle}>
              <thead>
                <tr>
                  {/* Empty label column */}
                  <th style={{ background: "transparent", border: "none", width: 90 }} />
                  {ads.map((ad) => {
                    const isBest = Number(ad.price) === bestPrice;
                    return (
                      <th key={ad._id} style={thStyle(isBest)}>
                        {/* Thumbnail */}
                        {ad.images?.[0] ? (
                          <img src={ad.images && ad.images[0] ? ad.images[0] : '/placeholder.png'} alt={ad.title} style={imgStyle} />
                        ) : (
                          <div style={noImgStyle}>🏷️</div>
                        )}
                        <div style={{ fontSize: 12, fontWeight: 700, marginBottom: 4 }}>
                          {ad.title?.slice(0, 30) || "—"}
                        </div>
                        {isBest && <div style={badgeStyle}>{t.best} 🏆</div>}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {comparisonRows.map((row) => (
                  <tr key={row.label}>
                    <td style={tdStyle(false, true)}>{row.label}</td>
                    {ads.map((ad) => {
                      const isBest = Number(ad.price) === bestPrice;
                      return (
                        <td key={ad._id} style={tdStyle(isBest, false)}>
                          {row.render(ad)}
                        </td>
                      );
                    })}
                  </tr>
                ))}
                {/* Contact row */}
                <tr>
                  <td style={tdStyle(false, true)}>{t.contact}</td>
                  {ads.map((ad) => {
                    const isBest = Number(ad.price) === bestPrice;
                    return (
                      <td key={ad._id} style={tdStyle(isBest, false)}>
                        <button
                          style={contactBtnStyle(isBest)}
                          onClick={() => {
                            if (typeof window !== "undefined") {
                              window.location.href = '/chat?ad=' + ad._id;
                            }
                          }}
                        >
                          {t.contact}
                        </button>
                      </td>
                    );
                  })}
                </tr>
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}