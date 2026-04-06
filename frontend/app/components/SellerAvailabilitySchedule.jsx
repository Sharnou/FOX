"use client";
/**
 * SellerAvailabilitySchedule.jsx
 * Weekly availability schedule for sellers — XTOX Marketplace
 *
 * Shows which days/slots a seller is available to be contacted.
 * Supports prayer-time awareness (Friday Jumu'ah midday block).
 * Arabic-first, RTL-aware. Tri-lingual AR/EN/DE. Cairo/Tajawal fonts.
 * Zero dependencies. Tailwind only.
 *
 * Props:
 *   schedule      {object}  — { sat: ['morning','afternoon'], sun: ['evening'], ... }
 *                             Keys: sat sun mon tue wed thu fri
 *                             Values: array of 'morning' | 'afternoon' | 'evening'
 *   lang          {string}  — 'ar' | 'en' | 'de'  (default 'ar')
 *   compact       {boolean} — Show only today's status badge (default false)
 *   editable      {boolean} — Show toggle buttons to edit slots (default false)
 *   onUpdate      {func}    — Called with updated schedule when slots toggled
 *   blockJumuah   {boolean} — Shade Friday midday as Jumu'ah (default true)
 */

import { useState } from "react";

/* ─── i18n ──────────────────────────────────────────────────────────────── */
const T = {
  ar: {
    title: "أوقات التواصل",
    subtitle: "متى يمكنك التواصل مع البائع",
    available: "متاح",
    unavailable: "غير متاح",
    jumuah: "صلاة الجمعة",
    morning: "الصباح",
    afternoon: "بعد الظهر",
    evening: "المساء",
    today: "اليوم",
    days: {
      sat: "السبت",
      sun: "الأحد",
      mon: "الاثنين",
      tue: "الثلاثاء",
      wed: "الأربعاء",
      thu: "الخميس",
      fri: "الجمعة",
    },
    noSchedule: "لم يُحدَّد جدول متاح",
    editHint: "اضغط على الأوقات لتعديل توافرك",
    todayAvailable: "متاح اليوم",
    todayBusy: "غير متاح اليوم",
  },
  en: {
    title: "Contact Availability",
    subtitle: "When you can reach this seller",
    available: "Available",
    unavailable: "Unavailable",
    jumuah: "Jumu'ah Prayer",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    today: "Today",
    days: {
      sat: "Sat",
      sun: "Sun",
      mon: "Mon",
      tue: "Tue",
      wed: "Wed",
      thu: "Thu",
      fri: "Fri",
    },
    noSchedule: "No availability set",
    editHint: "Tap slots to toggle your availability",
    todayAvailable: "Available today",
    todayBusy: "Busy today",
  },
  de: {
    title: "Erreichbarkeit",
    subtitle: "Wann Sie diesen Verkäufer kontaktieren können",
    available: "Verfügbar",
    unavailable: "Nicht verfügbar",
    jumuah: "Freitagsgebet",
    morning: "Morgens",
    afternoon: "Nachmittags",
    evening: "Abends",
    today: "Heute",
    days: {
      sat: "Sa",
      sun: "So",
      mon: "Mo",
      tue: "Di",
      wed: "Mi",
      thu: "Do",
      fri: "Fr",
    },
    noSchedule: "Keine Verfügbarkeit angegeben",
    editHint: "Tippen Sie auf Slots, um Ihre Verfügbarkeit zu ändern",
    todayAvailable: "Heute verfügbar",
    todayBusy: "Heute beschäftigt",
  },
};

const DAY_KEYS = ["sat", "sun", "mon", "tue", "wed", "thu", "fri"];
const SLOT_KEYS = ["morning", "afternoon", "evening"];

/* Map JS getDay() (0=Sun) to Arab-week day keys */
const JS_DAY_TO_KEY = ["sun", "mon", "tue", "wed", "thu", "fri", "sat"];

/* Arabic-Indic numerals */
const toArabicIndic = (n, lang) => {
  if (lang !== "ar") return String(n);
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
};

/* Slot icon */
const slotIcon = { morning: "🌅", afternoon: "☀️", evening: "🌙" };

/* ─── Compact badge ──────────────────────────────────────────────────────── */
function TodayBadge({ schedule, lang, blockJumuah }) {
  const t = T[lang] || T.ar;
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];
  const slots = schedule?.[todayKey] || [];
  const isAvailable = slots.length > 0;
  const isFriday = todayKey === "fri";

  return (
    <div
      dir={lang === "ar" ? "rtl" : "ltr"}
      className={'inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium border ' + (isAvailable ? "bg-emerald-50 border-emerald-200 text-emerald-700" : "bg-gray-50 border-gray-200 text-gray-500")}
      style={{ fontFamily: lang === "ar" ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
    >
      <span>{isAvailable ? "🟢" : "⚫"}</span>
      <span>{isAvailable ? t.todayAvailable : t.todayBusy}</span>
      {isFriday && blockJumuah && (
        <span className="text-amber-600 text-xs opacity-80">({t.jumuah})</span>
      )}
    </div>
  );
}

/* ─── Full schedule grid ─────────────────────────────────────────────────── */
function ScheduleGrid({ schedule, lang, editable, blockJumuah, onUpdate }) {
  const t = T[lang] || T.ar;
  const isRTL = lang === "ar";
  const todayKey = JS_DAY_TO_KEY[new Date().getDay()];

  const [localSchedule, setLocalSchedule] = useState(() => schedule || {});

  const toggleSlot = (dayKey, slotKey) => {
    if (!editable) return;
    setLocalSchedule((prev) => {
      const slots = prev[dayKey] || [];
      const updated = slots.includes(slotKey)
        ? slots.filter((s) => s !== slotKey)
        : [...slots, slotKey];
      const next = { ...prev, [dayKey]: updated };
      onUpdate?.(next);
      return next;
    });
  };

  const hasAny = Object.values(localSchedule).some((s) => s && s.length > 0);

  if (!hasAny && !editable) {
    return (
      <p
        dir={isRTL ? "rtl" : "ltr"}
        className="text-gray-400 text-sm text-center py-4"
        style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
      >
        {t.noSchedule}
      </p>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="w-full overflow-x-auto">
      {/* Day columns */}
      <div className="grid grid-cols-7 gap-1 min-w-[340px]">
        {/* Header row */}
        {DAY_KEYS.map((dayKey) => {
          const isToday = dayKey === todayKey;
          return (
            <div
              key={dayKey}
              className={'text-center text-xs font-bold pb-1 rounded-t ' + (isToday ? "text-blue-600" : "text-gray-500")}
              style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
            >
              {t.days[dayKey]}
              {isToday && (
                <div className="w-1.5 h-1.5 rounded-full bg-blue-500 mx-auto mt-0.5" />
              )}
            </div>
          );
        })}

        {/* Slot rows */}
        {SLOT_KEYS.map((slotKey) =>
          DAY_KEYS.map((dayKey) => {
            const slots = localSchedule[dayKey] || [];
            const isOn = slots.includes(slotKey);
            const isJumuah = dayKey === "fri" && slotKey === "afternoon" && blockJumuah;

            return (
              <button
                key={dayKey + '-' + slotKey}
                onClick={() => toggleSlot(dayKey, slotKey)}
                disabled={!editable || isJumuah}
                title={isJumuah ? t.jumuah : (t.days[dayKey] + ' ' + t[slotKey])}
                className={'h-9 w-full rounded flex items-center justify-center text-base transition-all ' + (isJumuah ? "bg-amber-100 border border-amber-300 cursor-not-allowed" : isOn ? "bg-emerald-100 border border-emerald-400 shadow-sm" : "bg-gray-50 border border-gray-200") + ' ' + (editable && !isJumuah ? "hover:scale-105 cursor-pointer" : "cursor-default")}
              >
                {isJumuah ? (
                  <span className="text-amber-500 text-xs">🕌</span>
                ) : isOn ? (
                  <span>{slotIcon[slotKey]}</span>
                ) : (
                  <span className="text-gray-300 text-xs">—</span>
                )}
              </button>
            );
          })
        )}
      </div>

      {/* Legend */}
      <div
        className="flex flex-wrap gap-3 mt-3 text-xs text-gray-500 justify-center"
        style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
      >
        {SLOT_KEYS.map((slotKey) => (
          <span key={slotKey} className="flex items-center gap-1">
            <span>{slotIcon[slotKey]}</span>
            <span>{t[slotKey]}</span>
          </span>
        ))}
        {blockJumuah && (
          <span className="flex items-center gap-1 text-amber-600">
            <span>🕌</span>
            <span>{t.jumuah}</span>
          </span>
        )}
      </div>

      {editable && (
        <p
          className="text-center text-xs text-blue-400 mt-2"
          style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
        >
          {t.editHint}
        </p>
      )}
    </div>
  );
}

/* ─── Main Export ────────────────────────────────────────────────────────── */
export default function SellerAvailabilitySchedule({
  schedule = {},
  lang = "ar",
  compact = false,
  editable = false,
  onUpdate,
  blockJumuah = true,
}) {
  const t = T[lang] || T.ar;
  const isRTL = lang === "ar";

  if (compact) {
    return (
      <TodayBadge schedule={schedule} lang={lang} blockJumuah={blockJumuah} />
    );
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm p-4 space-y-3"
      style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
    >
      {/* Header */}
      <div className={'flex items-center gap-2 ' + (isRTL ? "flex-row-reverse" : "")}>
        <span className="text-lg">📅</span>
        <div>
          <h3 className="text-sm font-bold text-gray-800">{t.title}</h3>
          <p className="text-xs text-gray-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Grid */}
      <ScheduleGrid
        schedule={schedule}
        lang={lang}
        editable={editable}
        blockJumuah={blockJumuah}
        onUpdate={onUpdate}
      />
    </div>
  );
}
