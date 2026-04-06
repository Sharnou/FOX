"use client";
import { useState } from "react";

// DeliveryOptionsWidget — Delivery method selector for Arab marketplace listings
// Supports: self-pickup, local delivery (seller delivers), courier/shipping
// RTL-aware, Cairo/Tajawal fonts, tri-lingual AR/EN/DE, Arabic-Indic numerals
// Props:
//   options       — array of available delivery options (see OPTION_TYPES)
//   lang          — 'ar' | 'en' | 'de'  (default: 'ar')
//   selected      — currently selected option key (controlled)
//   onSelect      — callback(optionKey) when user selects an option
//   compact       — boolean: compact badge mode (shows selected only, tap to expand)
//   currency      — string e.g. 'EGP' | 'SAR' | 'AED'  (default: 'EGP')

const ARABIC_INDIC = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

const LABELS = {
  ar: {
    pickup:   "استلام شخصي",
    delivery: "توصيل من البائع",
    courier:  "شحن عبر شركة توصيل",
    free:     "مجاني",
    from:     "من",
    to:       "إلى",
    days:     "أيام",
    day:      "يوم",
    hours:    "ساعات",
    est:      "التقدير:",
    choose:   "اختر طريقة الاستلام",
    selected: "الطريقة المختارة",
  },
  en: {
    pickup:   "Self Pickup",
    delivery: "Seller Delivery",
    courier:  "Courier Shipping",
    free:     "Free",
    from:     "From",
    to:       "to",
    days:     "days",
    day:      "day",
    hours:    "hours",
    est:      "Est:",
    choose:   "Choose delivery method",
    selected: "Selected method",
  },
  de: {
    pickup:   "Selbstabholung",
    delivery: "Lieferung durch Verkäufer",
    courier:  "Kurierversand",
    free:     "Kostenlos",
    from:     "Von",
    to:       "bis",
    days:     "Tage",
    day:      "Tag",
    hours:    "Stunden",
    est:      "Geschätzt:",
    choose:   "Liefermethode wählen",
    selected: "Gewählte Methode",
  },
};

const ICONS = {
  pickup:   "🚶",
  delivery: "🛵",
  courier:  "📦",
};

const COLORS = {
  pickup:   { bg: "bg-emerald-50", border: "border-emerald-400", badge: "bg-emerald-100 text-emerald-800", ring: "ring-emerald-400" },
  delivery: { bg: "bg-blue-50",    border: "border-blue-400",    badge: "bg-blue-100 text-blue-800",       ring: "ring-blue-400"    },
  courier:  { bg: "bg-amber-50",   border: "border-amber-400",   badge: "bg-amber-100 text-amber-800",     ring: "ring-amber-400"   },
};

function formatCost(cost, currency, lang, L) {
  if (cost === 0 || cost == null) return L.free;
  const n = lang === "ar" ? ARABIC_INDIC(cost) : cost;
  return n + ' ' + currency;
}

function formatEta(min, max, unit, lang, L) {
  const fmtNum = (n) => (lang === "ar" ? ARABIC_INDIC(n) : n);
  const u = L[unit] ?? unit;
  if (min === max) return fmtNum(min) + ' ' + u;
  return fmtNum(min) + ' ' + L.to + ' ' + fmtNum(max) + ' ' + u;
}

export default function DeliveryOptionsWidget({
  options = [],
  lang = "ar",
  selected = null,
  onSelect = () => {},
  compact = false,
  currency = "EGP",
}) {
  const L = LABELS[lang] || LABELS.ar;
  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const font = isRTL ? "font-['Cairo','Tajawal',sans-serif]" : "font-sans";

  const [expanded, setExpanded] = useState(!compact);

  // Default sample options if none provided
  const opts =
    options.length > 0
      ? options
      : [
          { key: "pickup",   cost: 0,    etaMin: 1, etaMax: 1,  etaUnit: "day"   },
          { key: "delivery", cost: 20,   etaMin: 1, etaMax: 3,  etaUnit: "days"  },
          { key: "courier",  cost: 45,   etaMin: 3, etaMax: 7,  etaUnit: "days"  },
        ];

  const selectedOpt = opts.find((o) => o.key === selected);

  // ── Compact mode: show badge + tap to expand ───────────────────────────────
  if (compact && !expanded) {
    const c = selectedOpt ? COLORS[selectedOpt.key] : COLORS.pickup;
    return (
      <div dir={dir} className={'inline-block ' + font}>
        <button
          onClick={() => setExpanded(true)}
          className={'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-medium shadow-sm transition ' + c.bg + ' ' + c.border + ' ' + c.badge}
        >
          <span>{selectedOpt ? ICONS[selectedOpt.key] : "🚚"}</span>
          <span>{selectedOpt ? L[selectedOpt.key] : L.choose}</span>
          <span className="opacity-60">▾</span>
        </button>
      </div>
    );
  }

  // ── Full card mode ─────────────────────────────────────────────────────────
  return (
    <div dir={dir} className={'w-full max-w-md ' + font}>
      {/* Header */}
      <div className={'flex items-center justify-between mb-3 ' + (isRTL ? 'flex-row-reverse' : '')}>
        <h3 className="text-sm font-bold text-gray-700">
          🚚 {L.choose}
        </h3>
        {compact && (
          <button
            onClick={() => setExpanded(false)}
            className="text-xs text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        )}
      </div>

      {/* Options list */}
      <div className="flex flex-col gap-2">
        {opts.map((opt) => {
          const isSelected = selected === opt.key;
          const c = COLORS[opt.key] || COLORS.pickup;

          return (
            <button
              key={opt.key}
              onClick={() => {
                onSelect(opt.key);
                if (compact) setExpanded(false);
              }}
              className={'w-full text-start rounded-xl border-2 p-3 transition-all duration-150 ' + (isSelected ? (c.bg + ' ' + c.border + ' ring-2 ' + c.ring + ' shadow-md') : 'bg-white border-gray-200 hover:border-gray-300 hover:bg-gray-50')}
            >
              <div className={'flex items-center gap-3 ' + (isRTL ? 'flex-row-reverse' : '')}>
                {/* Icon circle */}
                <div className={'text-2xl w-10 h-10 rounded-full flex items-center justify-center flex-shrink-0 ' + c.badge}>
                  {ICONS[opt.key]}
                </div>

                {/* Details */}
                <div className="flex-1 min-w-0">
                  <div className={'flex items-center justify-between gap-2 ' + (isRTL ? 'flex-row-reverse' : '')}>
                    <span className="text-sm font-bold text-gray-800">{L[opt.key]}</span>
                    {/* Cost badge */}
                    <span className={'text-xs font-bold px-2 py-0.5 rounded-full ' + c.badge}>
                      {formatCost(opt.cost, currency, lang, L)}
                    </span>
                  </div>

                  {/* ETA */}
                  {(opt.etaMin || opt.etaMax) && (
                    <div className={'flex items-center gap-1 mt-0.5 text-xs text-gray-500 ' + (isRTL ? 'flex-row-reverse' : '')}>
                      <span>⏱</span>
                      <span>{L.est}</span>
                      <span>{formatEta(opt.etaMin, opt.etaMax, opt.etaUnit, lang, L)}</span>
                    </div>
                  )}

                  {/* Custom note */}
                  {opt.note && (
                    <p className="mt-0.5 text-xs text-gray-400 truncate">{opt.note}</p>
                  )}
                </div>

                {/* Selected checkmark */}
                {isSelected && (
                  <div className={'w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 ' + c.badge + ' ' + c.border + ' border'}>
                    ✓
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* Safety tip */}
      <p className="mt-3 text-xs text-gray-400 text-center">
        {lang === "ar"
          ? "💡 تحقق من طريقة الاستلام مع البائع قبل الشراء"
          : lang === "de"
          ? "💡 Bestätigen Sie die Liefermethode vor dem Kauf"
          : "💡 Confirm delivery method with seller before purchase"}
      </p>
    </div>
  );
}
