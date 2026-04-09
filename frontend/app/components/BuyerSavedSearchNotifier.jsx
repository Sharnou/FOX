// BuyerSavedSearchNotifier.jsx
// Arab marketplace buyer "saved search alert" widget
// Supports AR/EN/DE, RTL-first, Arabic-Indic numerals, multi-currency
// Tailwind CSS only — zero external dependencies
import { useState, useCallback } from "react";

/* ─── i18n ─────────────────────────────────────────────────────────────── */
const T = {
  ar: {
    title: "تنبيهات البحث المحفوظ",
    subtitle: "احفظ بحثك واحصل على تنبيهات فورية لأحدث الإعلانات",
    newSearch: "بحث جديد",
    keyword: "كلمة البحث",
    keywordPh: "مثال: آيفون 14",
    category: "التصنيف",
    city: "المدينة",
    condition: "الحالة",
    minPrice: "السعر من",
    maxPrice: "السعر إلى",
    frequency: "تكرار التنبيه",
    instant: "فوري",
    daily: "يومي",
    weekly: "أسبوعي",
    save: "حفظ البحث",
    savedSearches: "بحوثي المحفوظة",
    noSaved: "لا توجد بحوث محفوظة بعد",
    matches: "إعلان مطابق",
    toggle: "تفعيل / إيقاف",
    remove: "حذف",
    active: "مفعّل",
    paused: "موقوف",
    all: "الكل",
    new: "جديد",
    used: "مستعمل",
    refurbished: "مُجدَّد",
    numerals: "أرقام عربية",
    currency: "العملة",
  },
  en: {
    title: "Saved Search Alerts",
    subtitle: "Save searches and get notified when new listings match",
    newSearch: "New Search",
    keyword: "Keyword",
    keywordPh: "e.g. iPhone 14",
    category: "Category",
    city: "City",
    condition: "Condition",
    minPrice: "Min Price",
    maxPrice: "Max Price",
    frequency: "Alert Frequency",
    instant: "Instant",
    daily: "Daily",
    weekly: "Weekly",
    save: "Save Search",
    savedSearches: "My Saved Searches",
    noSaved: "No saved searches yet",
    matches: "matching ad",
    toggle: "Toggle",
    remove: "Remove",
    active: "Active",
    paused: "Paused",
    all: "All",
    new: "New",
    used: "Used",
    refurbished: "Refurbished",
    numerals: "Arabic numerals",
    currency: "Currency",
  },
  de: {
    title: "Gespeicherte Suchen",
    subtitle: "Suche speichern und bei neuen Anzeigen benachrichtigt werden",
    newSearch: "Neue Suche",
    keyword: "Stichwort",
    keywordPh: "z. B. iPhone 14",
    category: "Kategorie",
    city: "Stadt",
    condition: "Zustand",
    minPrice: "Mindestpreis",
    maxPrice: "Höchstpreis",
    frequency: "Benachrichtigungsturnus",
    instant: "Sofort",
    daily: "Täglich",
    weekly: "Wöchentlich",
    save: "Suche speichern",
    savedSearches: "Meine Suchen",
    noSaved: "Noch keine gespeicherten Suchen",
    matches: "passende Anzeige",
    toggle: "Ein/Aus",
    remove: "Entfernen",
    active: "Aktiv",
    paused: "Pausiert",
    all: "Alle",
    new: "Neu",
    used: "Gebraucht",
    refurbished: "Generalüberholt",
    numerals: "Arab. Ziffern",
    currency: "Währung",
  },
};

const CURRENCIES = { EGP: "ج.م", SAR: "ر.س", AED: "د.إ", USD: "$" };
const CATEGORIES = { ar: ["الكل","إلكترونيات","سيارات","عقارات","ملابس","أثاث"], en: ["All","Electronics","Cars","Real Estate","Clothes","Furniture"], de: ["Alle","Elektronik","Autos","Immobilien","Kleidung","Möbel"] };
const CITIES = { ar: ["كل المدن","القاهرة","الرياض","دبي","بيروت","عمّان"], en: ["All Cities","Cairo","Riyadh","Dubai","Beirut","Amman"], de: ["Alle Städte","Kairo","Riad","Dubai","Beirut","Amman"] };
const FREQ_COLORS = { instant: "bg-red-100 text-red-700", daily: "bg-blue-100 text-blue-700", weekly: "bg-green-100 text-green-700" };

/* ─── Arabic-Indic numeral converter ───────────────────────────────────── */
const toArabicIndic = (n) => String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
const fmt = (n, useAI) => (useAI ? toArabicIndic(n) : String(n));

/* ─── Simulate match count ──────────────────────────────────────────────── */
const mockMatches = (id) => ((id.charCodeAt(0) * 7 + id.charCodeAt(2) * 3) % 94) + 6;

/* ─── Unique ID ─────────────────────────────────────────────────────────── */
const uid = () => Math.random().toString(36).slice(2, 9);

/* ═══════════════════════════════════════════════════════════════════════════
   MAIN COMPONENT
══════════════════════════════════════════════════════════════════════════ */
export default function BuyerSavedSearchNotifier({
  initialSearches = [],
  lang: propLang = "ar",
  currency: propCurrency = "EGP",
  onSaveSearch,
  className = "",
}) {
  const [lang, setLang] = useState(propLang);
  const [currency, setCurrency] = useState(propCurrency);
  const [arabicNumerals, setArabicNumerals] = useState(lang === "ar");
  const [searches, setSearches] = useState(
    initialSearches.length
      ? initialSearches
      : [
          { id: uid(), keyword: "آيفون 14", category: 0, city: 0, condition: "new", minPrice: "1000", maxPrice: "5000", frequency: "instant", active: true },
          { id: uid(), keyword: "سيارة كورولا", category: 1, city: 1, condition: "used", minPrice: "", maxPrice: "30000", frequency: "daily", active: true },
          { id: uid(), keyword: "شقة للإيجار", category: 2, city: 2, condition: "all", minPrice: "", maxPrice: "", frequency: "weekly", active: false },
        ]
  );
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ keyword: "", category: 0, city: 0, condition: "all", minPrice: "", maxPrice: "", frequency: "instant" });

  const t = T[lang];
  const isRtl = lang === "ar";
  const dir = isRtl ? "rtl" : "ltr";
  const currSym = CURRENCIES[currency];
  const cats = CATEGORIES[lang];
  const cities = CITIES[lang];

  const handleSave = useCallback(() => {
    if (!form.keyword.trim()) return;
    const entry = { ...form, id: uid(), active: true };
    setSearches(prev => [entry, ...prev]);
    onSaveSearch?.(entry);
    setForm({ keyword: "", category: 0, city: 0, condition: "all", minPrice: "", maxPrice: "", frequency: "instant" });
    setShowForm(false);
  }, [form, onSaveSearch]);

  const toggleActive = (id) => setSearches(prev => prev.map(s => s.id === id ? { ...s, active: !s.active } : s));
  const removeSearch = (id) => setSearches(prev => prev.filter(s => s.id !== id));

  /* ── Reusable input classes ─────────────────────────────────────────── */
  const inp = "w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm focus:border-amber-400 focus:outline-none focus:ring-2 focus:ring-amber-100 transition";
  const btn = "rounded-lg px-3 py-1.5 text-xs font-medium transition";

  return (
    <div
      dir={dir}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-lg border border-gray-100 p-5 max-w-xl w-full ${className}`}
    >
      {/* ── Header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800 flex items-center gap-2">
            <span className="text-2xl">🔔</span> {t.title}
          </h2>
          <p className="text-xs text-gray-500 mt-0.5">{t.subtitle}</p>
        </div>
        {/* ── Controls row ─────────────────────────────────────────── */}
        <div className="flex flex-wrap gap-1.5 items-center shrink-0">
          {/* Lang switcher */}
          {["ar","en","de"].map(l => (
            <button key={l} onClick={() => { setLang(l); setArabicNumerals(l === "ar"); }}
              className={`${btn} ${lang === l ? "bg-amber-400 text-white" : "bg-gray-100 text-gray-600 hover:bg-gray-200"}`}>
              {l.toUpperCase()}
            </button>
          ))}
          {/* Currency */}
          <select value={currency} onChange={e => setCurrency(e.target.value)}
            className="rounded-lg border border-gray-200 bg-gray-50 px-2 py-1 text-xs focus:outline-none focus:border-amber-400">
            {Object.keys(CURRENCIES).map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          {/* Arabic numeral toggle */}
          <button onClick={() => setArabicNumerals(p => !p)}
            title={t.numerals}
            className={`${btn} ${arabicNumerals ? "bg-amber-100 text-amber-700" : "bg-gray-100 text-gray-500 hover:bg-gray-200"}`}>
            {arabicNumerals ? "٣" : "3"}
          </button>
        </div>
      </div>

      {/* ── Add New Search Button ─────────────────────────────────────── */}
      <button onClick={() => setShowForm(p => !p)}
        className="mb-4 w-full rounded-xl bg-amber-400 hover:bg-amber-500 text-white font-semibold py-2.5 text-sm transition flex items-center justify-center gap-2">
        <span className="text-lg">{showForm ? "✕" : "+"}</span> {t.newSearch}
      </button>

      {/* ── New Search Form ───────────────────────────────────────────── */}
      {showForm && (
        <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Keyword */}
            <div className="sm:col-span-2">
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.keyword}</label>
              <input className={inp} placeholder={t.keywordPh} value={form.keyword}
                onChange={e => setForm(p => ({ ...p, keyword: e.target.value }))} />
            </div>
            {/* Category */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.category}</label>
              <select className={inp} value={form.category} onChange={e => setForm(p => ({ ...p, category: Number(e.target.value) }))}>
                {cats.map((c, i) => <option key={i} value={i}>{c}</option>)}
              </select>
            </div>
            {/* City */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.city}</label>
              <select className={inp} value={form.city} onChange={e => setForm(p => ({ ...p, city: Number(e.target.value) }))}>
                {cities.map((c, i) => <option key={i} value={i}>{c}</option>)}
              </select>
            </div>
            {/* Condition */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.condition}</label>
              <select className={inp} value={form.condition} onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}>
                {[["all",t.all],["new",t.new],["used",t.used],["refurbished",t.refurbished]].map(([v,l]) =>
                  <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {/* Frequency */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.frequency}</label>
              <select className={inp} value={form.frequency} onChange={e => setForm(p => ({ ...p, frequency: e.target.value }))}>
                {[["instant",t.instant],["daily",t.daily],["weekly",t.weekly]].map(([v,l]) =>
                  <option key={v} value={v}>{l}</option>)}
              </select>
            </div>
            {/* Min Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.minPrice} ({currSym})</label>
              <input className={inp} type="number" min="0" placeholder="0" value={form.minPrice}
                onChange={e => setForm(p => ({ ...p, minPrice: e.target.value }))} />
            </div>
            {/* Max Price */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">{t.maxPrice} ({currSym})</label>
              <input className={inp} type="number" min="0" placeholder="∞" value={form.maxPrice}
                onChange={e => setForm(p => ({ ...p, maxPrice: e.target.value }))} />
            </div>
          </div>
          <button onClick={handleSave}
            disabled={!form.keyword.trim()}
            className="w-full rounded-xl bg-green-500 hover:bg-green-600 disabled:bg-gray-300 text-white font-bold py-2.5 text-sm transition">
            💾 {t.save}
          </button>
        </div>
      )}

      {/* ── Saved Searches List ───────────────────────────────────────── */}
      <h3 className="text-sm font-bold text-gray-700 mb-3 flex items-center gap-1">
        📋 {t.savedSearches}
        <span className="ms-1 bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-semibold">
          {fmt(searches.length, arabicNumerals)}
        </span>
      </h3>

      {searches.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">
          <div className="text-4xl mb-2">🔍</div>
          {t.noSaved}
        </div>
      ) : (
        <ul className="space-y-3">
          {searches.map(s => {
            const matches = mockMatches(s.id);
            const freqColor = FREQ_COLORS[s.frequency] || "bg-gray-100 text-gray-600";
            return (
              <li key={s.id}
                className={`rounded-xl border p-3 transition-all ${s.active ? "border-amber-200 bg-amber-50/60" : "border-gray-200 bg-gray-50 opacity-60"}`}>
                {/* Top row: keyword + controls */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2 min-w-0">
                    <span className="text-base">🔎</span>
                    <span className="font-bold text-gray-800 truncate text-sm">{s.keyword}</span>
                    <span className={`shrink-0 text-xs px-2 py-0.5 rounded-full font-medium ${freqColor}`}>
                      {t[s.frequency]}
                    </span>
                  </div>
                  <div className="flex gap-1.5 shrink-0">
                    {/* Toggle */}
                    <button onClick={() => toggleActive(s.id)}
                      className={`${btn} ${s.active ? "bg-green-100 text-green-700 hover:bg-green-200" : "bg-gray-200 text-gray-500 hover:bg-gray-300"}`}
                      title={t.toggle}>
                      {s.active ? "✅" : "⏸"}
                    </button>
                    {/* Remove */}
                    <button onClick={() => removeSearch(s.id)}
                      className={`${btn} bg-red-100 text-red-600 hover:bg-red-200`}
                      title={t.remove}>
                      🗑
                    </button>
                  </div>
                </div>
                {/* Chips row */}
                <div className="flex flex-wrap gap-1.5 text-xs text-gray-600">
                  {s.category > 0 && (
                    <span className="bg-blue-100 text-blue-700 rounded-full px-2 py-0.5">{cats[s.category]}</span>
                  )}
                  {s.city > 0 && (
                    <span className="bg-purple-100 text-purple-700 rounded-full px-2 py-0.5">📍{cities[s.city]}</span>
                  )}
                  {s.condition !== "all" && (
                    <span className="bg-gray-200 text-gray-700 rounded-full px-2 py-0.5">{t[s.condition]}</span>
                  )}
                  {(s.minPrice || s.maxPrice) && (
                    <span className="bg-yellow-100 text-yellow-700 rounded-full px-2 py-0.5">
                      {s.minPrice ? `${currSym}${fmt(s.minPrice, arabicNumerals)}` : ""}{s.minPrice && s.maxPrice ? " – " : ""}{s.maxPrice ? `${currSym}${fmt(s.maxPrice, arabicNumerals)}` : ""}
                    </span>
                  )}
                  {/* Match count badge */}
                  <span className="ms-auto bg-amber-400 text-white rounded-full px-2 py-0.5 font-semibold">
                    {fmt(matches, arabicNumerals)} {t.matches}{matches !== 1 && lang !== "ar" ? "s" : ""}
                  </span>
                </div>
                {/* Status indicator */}
                <div className={`mt-1.5 text-xs font-medium ${s.active ? "text-green-600" : "text-gray-400"}`}>
                  ● {s.active ? t.active : t.paused}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
