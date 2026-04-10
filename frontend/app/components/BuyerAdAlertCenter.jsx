import { useState, useEffect, useCallback } from "react";

// ─── BuyerAdAlertCenter ──────────────────────────────────────────────────────
// Centralized hub for buyers to manage all their alerts (price drops,
// saved searches, watchlist). Bulk enable/disable, delete alerts, set
// notification frequency. Full AR/EN bilingual support. RTL-first.
// ─────────────────────────────────────────────────────────────────────────────

const STORAGE_KEY = "xtox_buyer_alerts";

const INITIAL_ALERTS = [
  {
    id: "a1",
    type: "price_drop",
    title: { ar: "انخفاض سعر آيفون 14 برو", en: "iPhone 14 Pro Price Drop" },
    detail: { ar: "آيفون 14 برو ماكس — أقل من 3,500 ر.س", en: "iPhone 14 Pro Max — below 3,500 SAR" },
    frequency: "instant",
    enabled: true,
    lastTriggered: "2024-06-10T09:30:00Z",
    icon: "📉",
  },
  {
    id: "a2",
    type: "saved_search",
    title: { ar: "بحث محفوظ: سيارات تويوتا", en: "Saved Search: Toyota Cars" },
    detail: { ar: "تويوتا كامري — الرياض — أقل من 80,000 كم", en: "Toyota Camry — Riyadh — under 80,000 km" },
    frequency: "daily",
    enabled: true,
    lastTriggered: "2024-06-09T18:00:00Z",
    icon: "🔍",
  },
  {
    id: "a3",
    type: "watchlist",
    title: { ar: "قائمة المتابعة: شقق جدة", en: "Watchlist: Jeddah Apartments" },
    detail: { ar: "شقة 3 غرف — حي الروضة — جدة", en: "3-bed apartment — Al-Rawdah — Jeddah" },
    frequency: "weekly",
    enabled: false,
    lastTriggered: "2024-06-05T12:00:00Z",
    icon: "👁️",
  },
  {
    id: "a4",
    type: "price_drop",
    title: { ar: "انخفاض سعر لابتوب ديل", en: "Dell Laptop Price Drop" },
    detail: { ar: "ديل XPS 15 — أقل من 5,000 ر.س", en: "Dell XPS 15 — below 5,000 SAR" },
    frequency: "instant",
    enabled: true,
    lastTriggered: null,
    icon: "📉",
  },
  {
    id: "a5",
    type: "saved_search",
    title: { ar: "بحث محفوظ: أثاث مكتبي", en: "Saved Search: Office Furniture" },
    detail: { ar: "مكتب + كرسي — الرياض — سعر مناسب", en: "Desk + Chair — Riyadh — fair price" },
    frequency: "daily",
    enabled: true,
    lastTriggered: "2024-06-08T07:15:00Z",
    icon: "🔍",
  },
];

const FREQ_OPTIONS = [
  { value: "instant", ar: "فوري", en: "Instant" },
  { value: "daily", ar: "يومي", en: "Daily" },
  { value: "weekly", ar: "أسبوعي", en: "Weekly" },
];

const TYPE_LABELS = {
  price_drop: { ar: "انخفاض سعر", en: "Price Drop" },
  saved_search: { ar: "بحث محفوظ", en: "Saved Search" },
  watchlist: { ar: "قائمة المتابعة", en: "Watchlist" },
};

const TYPE_COLORS = {
  price_drop: "bg-red-100 text-red-700",
  saved_search: "bg-blue-100 text-blue-700",
  watchlist: "bg-amber-100 text-amber-700",
};

function formatRelative(isoDate, lang) {
  if (!isoDate) return lang === "ar" ? "لم يُفعَّل بعد" : "Never triggered";
  const diff = Math.floor((Date.now() - new Date(isoDate)) / 60000);
  if (diff < 1) return lang === "ar" ? "الآن" : "Just now";
  if (diff < 60) return lang === "ar" ? `منذ ${diff} دقيقة` : `${diff}m ago`;
  const h = Math.floor(diff / 60);
  if (h < 24) return lang === "ar" ? `منذ ${h} ساعة` : `${h}h ago`;
  const d = Math.floor(h / 24);
  return lang === "ar" ? `منذ ${d} يوم` : `${d}d ago`;
}

// ─── Sub-component: AlertRow ──────────────────────────────────────────────────
function AlertRow({ alert, lang, selected, onSelect, onToggle, onDelete, onFreqChange }) {
  const t = (obj) => (lang === "ar" ? obj.ar : obj.en);
  const isRtl = lang === "ar";

  return (
    <div
      className={`flex flex-col sm:flex-row items-start sm:items-center gap-3 p-4 rounded-xl border transition-all duration-200 
        ${selected ? "border-indigo-400 bg-indigo-50" : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm"}
        ${!alert.enabled ? "opacity-60" : ""}`}
      dir={isRtl ? "rtl" : "ltr"}
    >
      {/* Checkbox */}
      <input
        type="checkbox"
        checked={selected}
        onChange={() => onSelect(alert.id)}
        className="w-4 h-4 accent-indigo-600 cursor-pointer mt-1 flex-shrink-0"
        aria-label={t({ ar: "تحديد", en: "Select" })}
      />

      {/* Icon */}
      <span className="text-2xl flex-shrink-0">{alert.icon}</span>

      {/* Main Info */}
      <div className="flex-1 min-w-0">
        <div className="flex flex-wrap items-center gap-2 mb-1">
          <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${TYPE_COLORS[alert.type]}`}>
            {t(TYPE_LABELS[alert.type])}
          </span>
          <h3 className={`font-semibold text-gray-800 text-sm leading-tight ${isRtl ? "font-[Tajawal]" : "font-[Cairo]"}`}>
            {t(alert.title)}
          </h3>
        </div>
        <p className="text-xs text-gray-500 truncate">{t(alert.detail)}</p>
        <p className="text-xs text-gray-400 mt-1">
          {t({ ar: "آخر تفعيل:", en: "Last triggered:" })} {formatRelative(alert.lastTriggered, lang)}
        </p>
      </div>

      {/* Frequency selector */}
      <select
        value={alert.frequency}
        onChange={(e) => onFreqChange(alert.id, e.target.value)}
        className="text-xs border border-gray-200 rounded-lg px-2 py-1.5 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-indigo-300 cursor-pointer flex-shrink-0"
        aria-label={t({ ar: "تكرار التنبيه", en: "Alert frequency" })}
      >
        {FREQ_OPTIONS.map((f) => (
          <option key={f.value} value={f.value}>{t(f)}</option>
        ))}
      </select>

      {/* Toggle */}
      <button
        onClick={() => onToggle(alert.id)}
        className={`flex-shrink-0 w-12 h-6 rounded-full transition-colors duration-200 relative focus:outline-none focus:ring-2 focus:ring-indigo-400
          ${alert.enabled ? "bg-indigo-600" : "bg-gray-300"}`}
        aria-label={alert.enabled ? t({ ar: "إيقاف", en: "Disable" }) : t({ ar: "تفعيل", en: "Enable" })}
        title={alert.enabled ? t({ ar: "إيقاف", en: "Disable" }) : t({ ar: "تفعيل", en: "Enable" })}
      >
        <span
          className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform duration-200
            ${alert.enabled ? (isRtl ? "right-0.5 translate-x-0" : "translate-x-6") : (isRtl ? "right-6" : "translate-x-0.5")}`}
        />
      </button>

      {/* Delete */}
      <button
        onClick={() => onDelete(alert.id)}
        className="flex-shrink-0 p-1.5 rounded-lg text-red-400 hover:text-red-600 hover:bg-red-50 transition-colors focus:outline-none focus:ring-2 focus:ring-red-300"
        aria-label={t({ ar: "حذف", en: "Delete" })}
        title={t({ ar: "حذف التنبيه", en: "Delete alert" })}
      >
        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
        </svg>
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function BuyerAdAlertCenter() {
  const [lang, setLang] = useState("ar");
  const [alerts, setAlerts] = useState(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : INITIAL_ALERTS;
    } catch {
      return INITIAL_ALERTS;
    }
  });
  const [selected, setSelected] = useState([]);
  const [filterType, setFilterType] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [toast, setToast] = useState(null);

  const isRtl = lang === "ar";
  const t = useCallback((obj) => (lang === "ar" ? obj.ar : obj.en), [lang]);

  useEffect(() => {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts)); } catch {}
  }, [alerts]);

  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 3000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  // Derived
  const filtered = alerts.filter((a) => {
    if (filterType !== "all" && a.type !== filterType) return false;
    if (filterStatus === "enabled" && !a.enabled) return false;
    if (filterStatus === "disabled" && a.enabled) return false;
    return true;
  });

  const allSelected = filtered.length > 0 && filtered.every((a) => selected.includes(a.id));
  const enabledCount = alerts.filter((a) => a.enabled).length;
  const disabledCount = alerts.length - enabledCount;

  // Handlers
  const handleSelect = (id) =>
    setSelected((s) => s.includes(id) ? s.filter((x) => x !== id) : [...s, id]);

  const handleSelectAll = () =>
    setSelected(allSelected ? [] : filtered.map((a) => a.id));

  const handleToggle = (id) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, enabled: !a.enabled } : a));
  };

  const handleDelete = (id) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
    setSelected((s) => s.filter((x) => x !== id));
    setToast({ msg: t({ ar: "تم حذف التنبيه", en: "Alert deleted" }), type: "error" });
  };

  const handleFreqChange = (id, freq) => {
    setAlerts((prev) => prev.map((a) => a.id === id ? { ...a, frequency: freq } : a));
    setToast({ msg: t({ ar: "تم تحديث التكرار", en: "Frequency updated" }), type: "success" });
  };

  const bulkEnable = () => {
    setAlerts((prev) => prev.map((a) => selected.includes(a.id) ? { ...a, enabled: true } : a));
    setToast({ msg: t({ ar: `تم تفعيل ${selected.length} تنبيهات`, en: `Enabled ${selected.length} alerts` }), type: "success" });
    setSelected([]);
  };

  const bulkDisable = () => {
    setAlerts((prev) => prev.map((a) => selected.includes(a.id) ? { ...a, enabled: false } : a));
    setToast({ msg: t({ ar: `تم إيقاف ${selected.length} تنبيهات`, en: `Disabled ${selected.length} alerts` }), type: "warning" });
    setSelected([]);
  };

  const bulkDelete = () => {
    setAlerts((prev) => prev.filter((a) => !selected.includes(a.id)));
    setToast({ msg: t({ ar: `تم حذف ${selected.length} تنبيهات`, en: `Deleted ${selected.length} alerts` }), type: "error" });
    setSelected([]);
  };

  const resetToDemo = () => {
    setAlerts(INITIAL_ALERTS);
    setSelected([]);
    setToast({ msg: t({ ar: "تم إعادة الضبط", en: "Reset to demo data" }), type: "success" });
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div dir={isRtl ? "rtl" : "ltr"} className="min-h-screen bg-gray-50 p-4 sm:p-6 lg:p-8 font-[Cairo,Tajawal,sans-serif]">
      {/* Toast */}
      {toast && (
        <div
          className={`fixed top-4 ${isRtl ? "right-4" : "left-4"} z-50 px-4 py-3 rounded-xl shadow-lg text-sm font-medium text-white animate-bounce
            ${toast.type === "success" ? "bg-green-500" : toast.type === "error" ? "bg-red-500" : "bg-amber-500"}`}
        >
          {toast.msg}
        </div>
      )}

      <div className="max-w-3xl mx-auto">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">
              {t({ ar: "🔔 مركز تنبيهاتي", en: "🔔 My Alert Center" })}
            </h1>
            <p className="text-sm text-gray-500 mt-0.5">
              {t({ ar: "إدارة جميع تنبيهات الأسعار والبحث وقائمة المتابعة", en: "Manage all price, search & watchlist alerts" })}
            </p>
          </div>
          {/* Language toggle */}
          <button
            onClick={() => setLang(lang === "ar" ? "en" : "ar")}
            className="px-3 py-1.5 text-sm font-semibold bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
          >
            {lang === "ar" ? "English" : "العربية"}
          </button>
        </div>

        {/* Stats Strip */}
        <div className="grid grid-cols-3 gap-3 mb-5">
          {[
            { label: { ar: "إجمالي التنبيهات", en: "Total Alerts" }, value: alerts.length, color: "text-indigo-600" },
            { label: { ar: "مفعّلة", en: "Active" }, value: enabledCount, color: "text-green-600" },
            { label: { ar: "موقوفة", en: "Paused" }, value: disabledCount, color: "text-gray-400" },
          ].map((s) => (
            <div key={s.color} className="bg-white rounded-xl border border-gray-200 p-3 text-center shadow-sm">
              <div className={`text-2xl font-bold ${s.color}`}>{s.value}</div>
              <div className="text-xs text-gray-500 mt-0.5">{t(s.label)}</div>
            </div>
          ))}
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4 flex flex-wrap gap-2 items-center shadow-sm">
          <span className="text-xs text-gray-500 font-medium">{t({ ar: "تصفية:", en: "Filter:" })}</span>
          <div className="flex gap-1 flex-wrap">
            {[{ v: "all", ar: "الكل", en: "All" }, { v: "price_drop", ar: "انخفاض سعر", en: "Price Drop" }, { v: "saved_search", ar: "بحث محفوظ", en: "Saved Search" }, { v: "watchlist", ar: "متابعة", en: "Watchlist" }].map((f) => (
              <button
                key={f.v}
                onClick={() => setFilterType(f.v)}
                className={`text-xs px-3 py-1 rounded-full transition-colors border ${filterType === f.v ? "bg-indigo-600 text-white border-indigo-600" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
              >
                {t(f)}
              </button>
            ))}
          </div>
          <div className="h-4 w-px bg-gray-200 mx-1 hidden sm:block" />
          <div className="flex gap-1 flex-wrap">
            {[{ v: "all", ar: "الكل", en: "All" }, { v: "enabled", ar: "مفعّلة", en: "Enabled" }, { v: "disabled", ar: "موقوفة", en: "Paused" }].map((f) => (
              <button
                key={f.v}
                onClick={() => setFilterStatus(f.v)}
                className={`text-xs px-3 py-1 rounded-full transition-colors border ${filterStatus === f.v ? "bg-gray-800 text-white border-gray-800" : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"}`}
              >
                {t(f)}
              </button>
            ))}
          </div>
        </div>

        {/* Bulk Actions Bar */}
        {selected.length > 0 && (
          <div className={`flex flex-wrap items-center gap-2 bg-indigo-50 border border-indigo-200 rounded-xl p-3 mb-4`}>
            <span className="text-sm font-semibold text-indigo-700">
              {t({ ar: `${selected.length} محدد`, en: `${selected.length} selected` })}
            </span>
            <button onClick={bulkEnable} className="text-xs px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 transition-colors font-medium">
              ✅ {t({ ar: "تفعيل", en: "Enable" })}
            </button>
            <button onClick={bulkDisable} className="text-xs px-3 py-1.5 bg-amber-100 text-amber-700 rounded-lg hover:bg-amber-200 transition-colors font-medium">
              ⏸ {t({ ar: "إيقاف", en: "Disable" })}
            </button>
            <button onClick={bulkDelete} className="text-xs px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition-colors font-medium">
              🗑 {t({ ar: "حذف", en: "Delete" })}
            </button>
            <button onClick={() => setSelected([])} className="text-xs px-3 py-1.5 bg-white text-gray-500 rounded-lg hover:bg-gray-50 border border-gray-200 transition-colors">
              {t({ ar: "إلغاء", en: "Cancel" })}
            </button>
          </div>
        )}

        {/* Select All Row */}
        {filtered.length > 0 && (
          <div className="flex items-center gap-2 px-1 mb-2">
            <input
              type="checkbox"
              checked={allSelected}
              onChange={handleSelectAll}
              className="w-4 h-4 accent-indigo-600 cursor-pointer"
              aria-label={t({ ar: "تحديد الكل", en: "Select all" })}
            />
            <span className="text-xs text-gray-500">
              {allSelected ? t({ ar: "إلغاء تحديد الكل", en: "Deselect all" }) : t({ ar: "تحديد الكل", en: "Select all" })}
            </span>
            <span className="text-xs text-gray-400">({filtered.length})</span>
          </div>
        )}

        {/* Alert List */}
        <div className="flex flex-col gap-3">
          {filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">
              <div className="text-5xl mb-3">🔕</div>
              <p className="text-sm">{t({ ar: "لا توجد تنبيهات تطابق الفلتر", en: "No alerts match this filter" })}</p>
              <button onClick={resetToDemo} className="mt-3 text-xs text-indigo-500 hover:underline">
                {t({ ar: "إعادة تحميل البيانات التجريبية", en: "Reset demo data" })}
              </button>
            </div>
          ) : (
            filtered.map((alert) => (
              <AlertRow
                key={alert.id}
                alert={alert}
                lang={lang}
                selected={selected.includes(alert.id)}
                onSelect={handleSelect}
                onToggle={handleToggle}
                onDelete={handleDelete}
                onFreqChange={handleFreqChange}
              />
            ))
          )}
        </div>

        {/* Footer */}
        <div className="mt-6 text-center">
          <button
            onClick={resetToDemo}
            className="text-xs text-gray-400 hover:text-gray-600 hover:underline transition-colors"
          >
            {t({ ar: "إعادة ضبط البيانات التجريبية", en: "Reset demo data" })}
          </button>
          <p className="text-xs text-gray-300 mt-2">XTOX Marketplace · {t({ ar: "مركز التنبيهات", en: "Alert Center" })}</p>
        </div>
      </div>
    </div>
  );
}
