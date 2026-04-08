"use client";
import { useState, useMemo } from "react";

// ─── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: "خريطة تفاعل الإعلان",
    subtitle: "أفضل أوقات المشاهدة خلال الأسبوع",
    days: ["الأحد", "الاثنين", "الثلاثاء", "الأربعاء", "الخميس", "الجمعة", "السبت"],
    hours: ["12ص", "3ص", "6ص", "9ص", "12م", "3م", "6م", "9م"],
    views: "مشاهدة",
    peak: "الذروة",
    low: "منخفض",
    high: "مرتفع",
    bestTime: "أفضل وقت للنشر",
    totalViews: "إجمالي المشاهدات",
    tip: "💡 انشر إعلانك في أوقات الذروة لزيادة الظهور",
    legend: "مستوى التفاعل",
    day: "يوم",
    hour: "ساعة",
    noData: "لا توجد بيانات بعد",
    loading: "جارٍ التحميل...",
  },
  en: {
    title: "Ad Engagement Heatmap",
    subtitle: "Best viewing times throughout the week",
    days: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    hours: ["12am", "3am", "6am", "9am", "12pm", "3pm", "6pm", "9pm"],
    views: "views",
    peak: "Peak",
    low: "Low",
    high: "High",
    bestTime: "Best time to post",
    totalViews: "Total views",
    tip: "💡 Post your ad during peak times for maximum visibility",
    legend: "Engagement level",
    day: "Day",
    hour: "Hour",
    noData: "No data yet",
    loading: "Loading...",
  },
  de: {
    title: "Anzeigen-Engagement-Heatmap",
    subtitle: "Beste Ansichtszeiten der Woche",
    days: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    hours: ["0 Uhr", "3 Uhr", "6 Uhr", "9 Uhr", "12 Uhr", "15 Uhr", "18 Uhr", "21 Uhr"],
    views: "Aufrufe",
    peak: "Spitze",
    low: "Niedrig",
    high: "Hoch",
    bestTime: "Beste Postzeit",
    totalViews: "Gesamtaufrufe",
    tip: "💡 Posten Sie Ihre Anzeige zu Spitzenzeiten für maximale Sichtbarkeit",
    legend: "Engagement-Level",
    day: "Tag",
    hour: "Stunde",
    noData: "Noch keine Daten",
    loading: "Wird geladen...",
  },
};

// ─── Heat color mapping ────────────────────────────────────────────────────────
function getHeatColor(value, max) {
  if (max === 0) return "bg-gray-100";
  const ratio = value / max;
  if (ratio === 0) return "bg-gray-100 dark:bg-gray-800";
  if (ratio < 0.2) return "bg-emerald-100";
  if (ratio < 0.4) return "bg-emerald-300";
  if (ratio < 0.6) return "bg-emerald-500";
  if (ratio < 0.8) return "bg-emerald-600";
  return "bg-emerald-700";
}

function getTextColor(value, max) {
  if (max === 0) return "text-transparent";
  const ratio = value / max;
  if (ratio < 0.6) return "text-gray-700";
  return "text-white";
}

// ─── Generate demo heatmap data (7 days × 24 hours) ──────────────────────────
function generateDemoData() {
  const data = [];
  for (let day = 0; day < 7; day++) {
    for (let hour = 0; hour < 24; hour++) {
      // Realistic Arab marketplace usage patterns:
      // Morning peak (9-11am), evening peak (8-10pm), low at night
      // Fri/Sat (Islamic weekend) have different patterns
      let base = 0;
      const isFriSat = day === 5 || day === 6;

      if (isFriSat) {
        // Fri/Sat: afternoon/evening heavy
        if (hour >= 15 && hour <= 23) base = 60 + Math.random() * 40;
        else if (hour >= 10 && hour < 15) base = 30 + Math.random() * 30;
        else base = 5 + Math.random() * 10;
      } else {
        // Weekdays
        if (hour >= 9 && hour <= 11) base = 50 + Math.random() * 35;
        else if (hour >= 20 && hour <= 22) base = 65 + Math.random() * 35;
        else if (hour >= 13 && hour <= 15) base = 35 + Math.random() * 25;
        else if (hour >= 6 && hour < 9) base = 15 + Math.random() * 20;
        else if (hour >= 0 && hour < 4) base = 2 + Math.random() * 8;
        else base = 10 + Math.random() * 20;
      }

      data.push({ day, hour, views: Math.round(base) });
    }
  }
  return data;
}

// ─── Main Component ────────────────────────────────────────────────────────────
export default function AdEngagementHeatmap({
  adId,
  lang: initialLang = "ar",
  data: propData = null,
}) {
  const [lang, setLang] = useState(initialLang);
  const [hoveredCell, setHoveredCell] = useState(null);
  const isRTL = lang === "ar";
  const t = T[lang];

  // Use provided data or generate demo data
  const rawData = useMemo(() => propData || generateDemoData(), [propData]);

  // Build 2D grid [day][hour]
  const grid = useMemo(() => {
    const g = Array.from({ length: 7 }, () => Array(24).fill(0));
    rawData.forEach(({ day, hour, views }) => {
      if (day >= 0 && day < 7 && hour >= 0 && hour < 24) g[day][hour] = views;
    });
    return g;
  }, [rawData]);

  const maxViews = useMemo(
    () => Math.max(...rawData.map((d) => d.views), 1),
    [rawData]
  );

  const totalViews = useMemo(
    () => rawData.reduce((sum, d) => sum + d.views, 0),
    [rawData]
  );

  // Find best posting time
  const bestCell = useMemo(() => {
    let best = { day: 0, hour: 0, views: 0 };
    rawData.forEach((d) => {
      if (d.views > best.views) best = d;
    });
    return best;
  }, [rawData]);

  // Aggregate by day (for summary bar)
  const dayTotals = useMemo(
    () =>
      t.days.map((_, i) =>
        grid[i].reduce((s, v) => s + v, 0)
      ),
    [grid, t.days]
  );

  // Hour labels (every 3 hours)
  const hourLabels = useMemo(() => {
    const labels = [];
    for (let h = 0; h < 24; h += 3) {
      const period = h < 12 ? (lang === "de" ? "" : "ص") : lang === "de" ? "" : "م";
      const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
      if (lang === "en") labels.push(t.hours[h / 3]);
      else if (lang === "de") labels.push(t.hours[h / 3]);
      else labels.push(`${h12}${period}`);
    }
    return labels;
  }, [lang, t.hours]);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`w-full max-w-2xl mx-auto font-sans select-none`}
      style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
    >
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');`}</style>

      {/* Card */}
      <div className="bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden">

        {/* Header */}
        <div className="bg-gradient-to-r from-emerald-600 to-teal-600 px-5 py-4 flex items-start justify-between flex-wrap gap-3">
          <div>
            <h3 className="text-white font-bold text-base leading-tight">
              {t.title}
            </h3>
            <p className="text-emerald-100 text-xs mt-0.5">{t.subtitle}</p>
          </div>

          {/* Language switcher */}
          <div className="flex gap-1 bg-white/20 rounded-xl p-1">
            {["ar", "en", "de"].map((l) => (
              <button
                key={l}
                onClick={() => setLang(l)}
                className={`px-2.5 py-1 text-xs rounded-lg font-semibold transition-all duration-200 ${
                  lang === l
                    ? "bg-white text-emerald-700 shadow"
                    : "text-white hover:bg-white/30"
                }`}
              >
                {l === "ar" ? "ع" : l === "en" ? "EN" : "DE"}
              </button>
            ))}
          </div>
        </div>

        {/* Stats bar */}
        <div className="grid grid-cols-3 divide-x divide-gray-100 bg-gray-50 border-b border-gray-100">
          <div className="py-3 px-4 text-center">
            <p className="text-2xl font-bold text-gray-800">{totalViews.toLocaleString()}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.totalViews}</p>
          </div>
          <div className="py-3 px-4 text-center">
            <p className="text-2xl font-bold text-emerald-600">{maxViews}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.peak}</p>
          </div>
          <div className="py-3 px-4 text-center">
            <p className="text-sm font-bold text-gray-800">
              {t.days[bestCell.day]}
            </p>
            <p className="text-xs font-semibold text-gray-700">
              {hourLabels[Math.floor(bestCell.hour / 3)]}
            </p>
            <p className="text-xs text-gray-500 mt-0.5">{t.bestTime}</p>
          </div>
        </div>

        {/* Heatmap grid */}
        <div className="px-4 pt-4 pb-2 overflow-x-auto">
          {/* Hour labels row */}
          <div
            className={`flex items-center gap-1 mb-2 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <div className="w-12 flex-shrink-0" />
            {hourLabels.map((label, i) => (
              <div
                key={i}
                className="flex-1 min-w-[2rem] text-center text-xs text-gray-400"
              >
                {label}
              </div>
            ))}
          </div>

          {/* Day rows */}
          {t.days.map((dayName, dayIdx) => (
            <div
              key={dayIdx}
              className={`flex items-center gap-1 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}
            >
              {/* Day label */}
              <div
                className={`w-12 flex-shrink-0 text-xs font-semibold text-gray-600 ${
                  isRTL ? "text-right" : "text-left"
                }`}
              >
                {dayName}
              </div>

              {/* Hour cells (grouped by 3hrs) */}
              {Array.from({ length: 8 }, (_, i) => i * 3).map((startHour) => {
                // Sum 3 consecutive hours into one cell
                const cellViews =
                  (grid[dayIdx][startHour] || 0) +
                  (grid[dayIdx][startHour + 1] || 0) +
                  (grid[dayIdx][startHour + 2] || 0);
                const cellMax = maxViews * 3;
                const isHovered =
                  hoveredCell?.day === dayIdx && hoveredCell?.hour === startHour;

                return (
                  <div
                    key={startHour}
                    className={`flex-1 min-w-[2rem] h-8 rounded-md flex items-center justify-center text-xs font-semibold cursor-pointer transition-all duration-150 border-2 ${
                      getHeatColor(cellViews, cellMax)
                    } ${getTextColor(cellViews, cellMax)} ${
                      isHovered ? "border-emerald-400 scale-110 shadow-md z-10 relative" : "border-transparent"
                    }`}
                    onMouseEnter={() =>
                      setHoveredCell({ day: dayIdx, hour: startHour })
                    }
                    onMouseLeave={() => setHoveredCell(null)}
                    title={`${dayName} ${hourLabels[startHour / 3]}: ${cellViews} ${t.views}`}
                  >
                    {cellViews > 0 ? cellViews : ""}
                  </div>
                );
              })}
            </div>
          ))}

          {/* Legend */}
          <div
            className={`flex items-center gap-2 mt-3 mb-1 ${isRTL ? "flex-row-reverse" : ""}`}
          >
            <span className="text-xs text-gray-400">{t.legend}:</span>
            <span className="text-xs text-gray-400">{t.low}</span>
            {["bg-gray-100", "bg-emerald-100", "bg-emerald-300", "bg-emerald-500", "bg-emerald-700"].map(
              (cls, i) => (
                <div key={i} className={`w-6 h-4 rounded ${cls} border border-gray-200`} />
              )
            )}
            <span className="text-xs text-gray-400">{t.high}</span>
          </div>
        </div>

        {/* Tooltip for hovered cell */}
        {hoveredCell && (
          <div className="mx-4 mb-3 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-800 flex items-center gap-2">
            <span className="text-emerald-500">📊</span>
            <span>
              <strong>{t.days[hoveredCell.day]}</strong>{" "}
              {hourLabels[hoveredCell.hour / 3]}:{" "}
              <strong>
                {(grid[hoveredCell.day][hoveredCell.hour] || 0) +
                  (grid[hoveredCell.day][hoveredCell.hour + 1] || 0) +
                  (grid[hoveredCell.day][hoveredCell.hour + 2] || 0)}{" "}
                {t.views}
              </strong>
            </span>
          </div>
        )}

        {/* Day summary bars */}
        <div className="px-4 pb-4">
          <div className="border-t border-gray-100 pt-3">
            <p className="text-xs font-semibold text-gray-500 mb-2">
              {t.day} — {t.totalViews}
            </p>
            <div className={`flex gap-1.5 items-end h-12 ${isRTL ? "flex-row-reverse" : ""}`}>
              {dayTotals.map((total, i) => {
                const maxDay = Math.max(...dayTotals, 1);
                const heightPct = Math.round((total / maxDay) * 100);
                return (
                  <div key={i} className="flex-1 flex flex-col items-center gap-1">
                    <div
                      className="w-full rounded-t-md bg-emerald-500 hover:bg-emerald-600 transition-all duration-300 cursor-default"
                      style={{ height: `${heightPct}%`, minHeight: "4px" }}
                      title={`${t.days[i]}: ${total} ${t.views}`}
                    />
                    <span className="text-xs text-gray-400">{t.days[i].charAt(0)}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Pro tip footer */}
        <div className="bg-amber-50 border-t border-amber-100 px-4 py-2.5">
          <p className="text-xs text-amber-700 font-medium">{t.tip}</p>
        </div>
      </div>
    </div>
  );
}
