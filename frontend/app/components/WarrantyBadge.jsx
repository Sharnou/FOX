/**
 * WarrantyBadge — ضمان
 * Displays warranty info on marketplace ads.
 * Returns null if no warranty data.
 * Supports ar/en/de/fr locales, RTL for Arabic.
 *
 * Props:
 *   warranty  {string|number} – warranty period, e.g. "1 year", 12 (months), "6 months"
 *   locale    {string}        – e.g. "ar", "en", "de", "fr"
 */

"use client";

const LABELS = {
  ar: { prefix: "ضمان", shield: "shield" },
  en: { prefix: "Warranty", shield: "shield" },
  de: { prefix: "Garantie", shield: "shield" },
  fr: { prefix: "Garantie", shield: "shield" },
};

const WARRANTY_TRANSLATIONS = {
  ar: {
    year: "سنة",
    years: "سنوات",
    month: "شهر",
    months: "شهور",
    lifetime: "ضمان مدى الحياة",
  },
  en: {
    year: "year",
    years: "years",
    month: "month",
    months: "months",
    lifetime: "Lifetime Warranty",
  },
  de: {
    year: "Jahr",
    years: "Jahre",
    month: "Monat",
    months: "Monate",
    lifetime: "Lebenslange Garantie",
  },
  fr: {
    year: "an",
    years: "ans",
    month: "mois",
    months: "mois",
    lifetime: "Garantie à vie",
  },
};

function formatWarranty(warranty, locale) {
  const t = WARRANTY_TRANSLATIONS[locale] || WARRANTY_TRANSLATIONS.en;
  const val = String(warranty).toLowerCase().trim();

  if (val === "lifetime" || val === "مدى الحياة") return t.lifetime;

  // numeric months
  const numericMatch = val.match(/^(\d+)\s*(month|months|شهر|شهور|mo)?$/);
  if (numericMatch) {
    const n = parseInt(numericMatch[1], 10);
    if (n >= 12 && n % 12 === 0) {
      const years = n / 12;
      return years + ' ' + (years === 1 ? t.year : t.years);
    }
    return n + ' ' + (n === 1 ? t.month : t.months);
  }

  // numeric years
  const yearMatch = val.match(/^(\d+)\s*(year|years|سنة|سنوات|yr)?$/);
  if (yearMatch) {
    const n = parseInt(yearMatch[1], 10);
    return n + ' ' + (n === 1 ? t.year : t.years);
  }

  // fallback: return as-is
  return warranty;
}

export default function WarrantyBadge({ warranty, locale = "ar" }) {
  if (!warranty) return null;

  const isAr = locale === "ar";
  const labels = LABELS[locale] || LABELS.en;
  const formattedWarranty = formatWarranty(warranty, locale);

  return (
    <span
      dir={isAr ? "rtl" : "ltr"}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: "4px",
        backgroundColor: "#dcfce7",
        color: "#15803d",
        borderRadius: "9999px",
        padding: "2px 10px",
        fontSize: "0.75rem",
        fontWeight: 600,
        whiteSpace: "nowrap",
        border: "1px solid #bbf7d0",
        flexDirection: isAr ? "row-reverse" : "row",
      }}
      aria-label={labels.prefix + ': ' + formattedWarranty}
    >
      {/* Shield SVG icon */}
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="12"
        height="12"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
      >
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
      </svg>
      <span>{labels.prefix}</span>
      <span style={{ fontWeight: 400 }}>{formattedWarranty}</span>
    </span>
  );
}
