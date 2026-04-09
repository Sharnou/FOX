"use client";
import { useState, useMemo } from "react";

// ─── Helpers ────────────────────────────────────────────────────────────────

const TRANSLATIONS = {
  ar: {
    title: "لوحة طلبات المشترين",
    subtitle: "تصفّح ما يبحث عنه المشترون",
    postRequest: "أنشر طلبك",
    allCategories: "كل الفئات",
    contact: "تواصل",
    contacts: "تواصل",
    budget: "الميزانية",
    location: "الموقع",
    postedBy: "نشره",
    ago: "منذ",
    now: "الآن",
    minutes: "دقيقة",
    hours: "ساعة",
    days: "يوم",
    searchPlaceholder: "ابحث في الطلبات...",
    noResults: "لا توجد طلبات في هذه الفئة",
    postTitle: "عنوان الطلب",
    postCategory: "الفئة",
    postBudget: "الميزانية (اختياري)",
    postLocation: "المدينة",
    postDescription: "وصف ما تريده",
    postBtn: "نشر الطلب",
    cancel: "إلغاء",
    numerals: "٠١٢٣٤٥٦٧٨٩",
    currency: { EGP: "ج.م", SAR: "ر.س", AED: "د.إ", USD: "$" },
    urgent: "عاجل",
    open: "مفتوح",
    closed: "مغلق",
  },
  en: {
    title: "Buyer Request Board",
    subtitle: "Browse what buyers are looking for",
    postRequest: "Post a Request",
    allCategories: "All Categories",
    contact: "Contact",
    contacts: "contacts",
    budget: "Budget",
    location: "Location",
    postedBy: "Posted by",
    ago: "ago",
    now: "just now",
    minutes: "min",
    hours: "hr",
    days: "d",
    searchPlaceholder: "Search requests...",
    noResults: "No requests in this category",
    postTitle: "Request Title",
    postCategory: "Category",
    postBudget: "Budget (optional)",
    postLocation: "City",
    postDescription: "Describe what you need",
    postBtn: "Post Request",
    cancel: "Cancel",
    numerals: null,
    currency: { EGP: "EGP", SAR: "SAR", AED: "AED", USD: "$" },
    urgent: "Urgent",
    open: "Open",
    closed: "Closed",
  },
  de: {
    title: "Käufer-Anfragen",
    subtitle: "Durchsuche Käuferwünsche",
    postRequest: "Anfrage stellen",
    allCategories: "Alle Kategorien",
    contact: "Kontakt",
    contacts: "Kontakte",
    budget: "Budget",
    location: "Ort",
    postedBy: "Von",
    ago: "vor",
    now: "gerade eben",
    minutes: "Min.",
    hours: "Std.",
    days: "T.",
    searchPlaceholder: "Anfragen suchen...",
    noResults: "Keine Anfragen in dieser Kategorie",
    postTitle: "Anfragetitel",
    postCategory: "Kategorie",
    postBudget: "Budget (optional)",
    postLocation: "Stadt",
    postDescription: "Was suchen Sie?",
    postBtn: "Anfrage veröffentlichen",
    cancel: "Abbrechen",
    numerals: null,
    currency: { EGP: "EGP", SAR: "SAR", AED: "AED", USD: "$" },
    urgent: "Dringend",
    open: "Offen",
    closed: "Geschlossen",
  },
};

const CATEGORIES = {
  ar: ["إلكترونيات", "سيارات", "أثاث", "ملابس", "عقارات", "أخرى"],
  en: ["Electronics", "Vehicles", "Furniture", "Fashion", "Real Estate", "Other"],
  de: ["Elektronik", "Fahrzeuge", "Möbel", "Mode", "Immobilien", "Sonstiges"],
};

function toArabicNumerals(num, t) {
  if (!t.numerals) return String(num);
  return String(num)
    .split("")
    .map((c) => (c >= "0" && c <= "9" ? t.numerals[+c] : c))
    .join("");
}

function relativeTime(createdAt, t) {
  const diffMs = Date.now() - new Date(createdAt).getTime();
  const diffMin = Math.floor(diffMs / 60000);
  if (diffMin < 1) return t.now;
  if (diffMin < 60)
    return `${t.ago} ${toArabicNumerals(diffMin, t)} ${t.minutes}`;
  const diffHr = Math.floor(diffMin / 60);
  if (diffHr < 24)
    return `${t.ago} ${toArabicNumerals(diffHr, t)} ${t.hours}`;
  const diffDay = Math.floor(diffHr / 24);
  return `${t.ago} ${toArabicNumerals(diffDay, t)} ${t.days}`;
}

// ─── Mock Data ───────────────────────────────────────────────────────────────

const MOCK_REQUESTS = [
  {
    id: "r1",
    titleAr: "أبحث عن آيفون 13 بحالة ممتازة",
    titleEn: "Looking for iPhone 13 in excellent condition",
    titleDe: "Suche iPhone 13 in sehr gutem Zustand",
    categoryIndex: 0,
    budget: 3000,
    currency: "EGP",
    cityAr: "القاهرة",
    cityEn: "Cairo",
    cityDe: "Kairo",
    descriptionAr: "لون أسود أو أبيض، بالغلاف الأصلي إن أمكن",
    descriptionEn: "Black or white, original box if possible",
    descriptionDe: "Schwarz oder weiß, Originalkarton wenn möglich",
    buyerName: "محمد أحمد",
    avatar: "https://i.pravatar.cc/40?img=11",
    createdAt: new Date(Date.now() - 25 * 60000).toISOString(),
    contactCount: 4,
    status: "open",
    urgent: true,
  },
  {
    id: "r2",
    titleAr: "مطلوب أريكة L شكل - لون رمادي",
    titleEn: "Wanted: L-shaped sofa in grey",
    titleDe: "Gesucht: L-förmiges Sofa in Grau",
    categoryIndex: 2,
    budget: 1500,
    currency: "SAR",
    cityAr: "الرياض",
    cityEn: "Riyadh",
    cityDe: "Riad",
    descriptionAr: "مقاس لا يزيد عن 3 متر، أقبل التوصيل داخل الرياض",
    descriptionEn: "Max 3m size, delivery within Riyadh accepted",
    descriptionDe: "Max. 3m, Lieferung innerhalb Riad akzeptiert",
    buyerName: "سارة خالد",
    avatar: "https://i.pravatar.cc/40?img=5",
    createdAt: new Date(Date.now() - 2 * 3600000).toISOString(),
    contactCount: 2,
    status: "open",
    urgent: false,
  },
  {
    id: "r3",
    titleAr: "أبحث عن سيارة كامري 2019-2021",
    titleEn: "Looking for Camry 2019-2021",
    titleDe: "Suche Camry 2019-2021",
    categoryIndex: 1,
    budget: 120000,
    currency: "EGP",
    cityAr: "الإسكندرية",
    cityEn: "Alexandria",
    cityDe: "Alexandria",
    descriptionAr: "عداد لا يتجاوز 100 ألف كم، بدون حوادث",
    descriptionEn: "Max 100k km, no accidents",
    descriptionDe: "Max. 100.000 km, unfallfrei",
    buyerName: "عمر فاروق",
    avatar: "https://i.pravatar.cc/40?img=17",
    createdAt: new Date(Date.now() - 1 * 86400000).toISOString(),
    contactCount: 7,
    status: "open",
    urgent: false,
  },
  {
    id: "r4",
    titleAr: "مطلوب لاب توب للدراسة - ميزانية محدودة",
    titleEn: "Needed: student laptop, tight budget",
    titleDe: "Gesucht: Laptop für Studium, geringes Budget",
    categoryIndex: 0,
    budget: 800,
    currency: "AED",
    cityAr: "دبي",
    cityEn: "Dubai",
    cityDe: "Dubai",
    descriptionAr: "Core i5 على الأقل، رام 8 جيجا، شاشة 15 بوصة",
    descriptionEn: "At least Core i5, 8GB RAM, 15 inch screen",
    descriptionDe: "Mind. Core i5, 8GB RAM, 15 Zoll",
    buyerName: "ليلى مصطفى",
    avatar: "https://i.pravatar.cc/40?img=9",
    createdAt: new Date(Date.now() - 3 * 86400000).toISOString(),
    contactCount: 11,
    status: "closed",
    urgent: false,
  },
];

// ─── PostForm ────────────────────────────────────────────────────────────────

function PostForm({ lang, currency, t, cats, onSubmit, onCancel }) {
  const [form, setForm] = useState({
    title: "",
    category: 0,
    budget: "",
    city: "",
    description: "",
  });
  const isRTL = lang === "ar";

  function handleChange(field, value) {
    setForm((f) => ({ ...f, [field]: value }));
  }

  function handleSubmit(e) {
    e.preventDefault();
    if (!form.title.trim()) return;
    onSubmit({
      id: "r" + Date.now(),
      titleAr: lang === "ar" ? form.title : "",
      titleEn: lang === "en" ? form.title : "",
      titleDe: lang === "de" ? form.title : "",
      categoryIndex: Number(form.category),
      budget: form.budget ? Number(form.budget) : null,
      currency,
      cityAr: lang === "ar" ? form.city : "",
      cityEn: lang === "en" ? form.city : "",
      cityDe: lang === "de" ? form.city : "",
      descriptionAr: lang === "ar" ? form.description : "",
      descriptionEn: lang === "en" ? form.description : "",
      descriptionDe: lang === "de" ? form.description : "",
      buyerName: "أنت",
      avatar: "https://i.pravatar.cc/40?img=33",
      createdAt: new Date().toISOString(),
      contactCount: 0,
      status: "open",
      urgent: false,
    });
  }

  const input =
    "w-full rounded-xl border border-gray-200 px-4 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white";

  return (
    <form
      onSubmit={handleSubmit}
      dir={isRTL ? "rtl" : "ltr"}
      className="bg-indigo-50 rounded-2xl p-4 mb-6 space-y-3"
    >
      <input
        className={input}
        placeholder={t.postTitle}
        value={form.title}
        onChange={(e) => handleChange("title", e.target.value)}
        required
      />
      <div className="grid grid-cols-2 gap-3">
        <select
          className={input}
          value={form.category}
          onChange={(e) => handleChange("category", e.target.value)}
        >
          {cats.map((c, i) => (
            <option key={i} value={i}>
              {c}
            </option>
          ))}
        </select>
        <input
          className={input}
          placeholder={t.postBudget}
          type="number"
          min={0}
          value={form.budget}
          onChange={(e) => handleChange("budget", e.target.value)}
        />
      </div>
      <input
        className={input}
        placeholder={t.postLocation}
        value={form.city}
        onChange={(e) => handleChange("city", e.target.value)}
      />
      <textarea
        className={input + " h-20 resize-none"}
        placeholder={t.postDescription}
        value={form.description}
        onChange={(e) => handleChange("description", e.target.value)}
      />
      <div className="flex gap-3 justify-end">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 rounded-xl text-sm text-gray-600 hover:bg-gray-200 transition"
        >
          {t.cancel}
        </button>
        <button
          type="submit"
          className="px-5 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          {t.postBtn}
        </button>
      </div>
    </form>
  );
}

// ─── RequestCard ─────────────────────────────────────────────────────────────

function RequestCard({ req, lang, t, cats, onContactBuyer }) {
  const [expanded, setExpanded] = useState(false);
  const isRTL = lang === "ar";
  const title =
    lang === "ar" ? req.titleAr : lang === "de" ? req.titleDe : req.titleEn;
  const city =
    lang === "ar" ? req.cityAr : lang === "de" ? req.cityDe : req.cityEn;
  const desc =
    lang === "ar"
      ? req.descriptionAr
      : lang === "de"
      ? req.descriptionDe
      : req.descriptionEn;
  const catLabel = cats[req.categoryIndex] || cats[cats.length - 1];
  const currLabel = t.currency[req.currency] || req.currency;
  const isClosed = req.status === "closed";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`rounded-2xl border bg-white shadow-sm hover:shadow-md transition-shadow p-4 ${
        isClosed ? "opacity-60" : ""
      }`}
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <img
          src={req.avatar}
          alt={req.buyerName}
          className="w-10 h-10 rounded-full object-cover flex-shrink-0"
        />
        <div className="flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2 mb-1">
            {req.urgent && (
              <span className="text-xs font-bold text-red-600 bg-red-50 px-2 py-0.5 rounded-full">
                {t.urgent}
              </span>
            )}
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${
                isClosed
                  ? "bg-gray-100 text-gray-500"
                  : "bg-green-50 text-green-700"
              }`}
            >
              {isClosed ? t.closed : t.open}
            </span>
            <span className="text-xs bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full">
              {catLabel}
            </span>
          </div>
          <p className="font-semibold text-gray-800 text-sm leading-snug">{title}</p>
          <p className="text-xs text-gray-400 mt-0.5">
            {t.postedBy} {req.buyerName} · {relativeTime(req.createdAt, t)}
          </p>
        </div>
      </div>

      {/* Stats row */}
      <div className="flex flex-wrap gap-4 mt-3 text-xs text-gray-500">
        {req.budget && (
          <span>
            💰 {t.budget}:{" "}
            <strong className="text-gray-700">
              {toArabicNumerals(req.budget.toLocaleString(), t)} {currLabel}
            </strong>
          </span>
        )}
        {city && (
          <span>
            📍 {t.location}: <strong className="text-gray-700">{city}</strong>
          </span>
        )}
        <span>
          💬 {toArabicNumerals(req.contactCount, t)} {t.contacts}
        </span>
      </div>

      {/* Description toggle */}
      {desc && (
        <div className="mt-2">
          <button
            className="text-xs text-indigo-500 hover:text-indigo-700"
            onClick={() => setExpanded((e) => !e)}
          >
            {expanded ? "▲" : "▼"} {isRTL ? "التفاصيل" : "Details"}
          </button>
          {expanded && (
            <p className="text-xs text-gray-600 mt-1 leading-relaxed">{desc}</p>
          )}
        </div>
      )}

      {/* Contact button */}
      {!isClosed && (
        <button
          onClick={() => onContactBuyer && onContactBuyer(req)}
          className="mt-3 w-full py-1.5 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          {t.contact}
        </button>
      )}
    </div>
  );
}

// ─── BuyerRequestBoard ───────────────────────────────────────────────────────

/**
 * BuyerRequestBoard
 *
 * A reverse-marketplace board where buyers post what they're looking for.
 * Sellers can browse requests and contact buyers directly.
 *
 * Props:
 *   requests       {array}    — array of request objects (see MOCK_REQUESTS shape)
 *   lang           {string}   — 'ar' | 'en' | 'de'  (default: 'ar')
 *   currency       {string}   — 'EGP' | 'SAR' | 'AED' | 'USD'
 *   onPostRequest  {function} — called with new request object when buyer posts
 *   onContactBuyer {function} — called with request object when seller clicks contact
 *   className      {string}
 */
export default function BuyerRequestBoard({
  requests: externalRequests,
  lang: initialLang = "ar",
  currency = "EGP",
  onPostRequest,
  onContactBuyer,
  className = "",
}) {
  const [lang, setLang] = useState(initialLang);
  const [activeCat, setActiveCat] = useState(-1); // -1 = all
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [localRequests, setLocalRequests] = useState(
    externalRequests && externalRequests.length > 0
      ? externalRequests
      : MOCK_REQUESTS
  );

  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const cats = CATEGORIES[lang] || CATEGORIES.ar;
  const isRTL = lang === "ar";

  const filtered = useMemo(() => {
    return localRequests.filter((r) => {
      const catMatch = activeCat === -1 || r.categoryIndex === activeCat;
      const title =
        lang === "ar" ? r.titleAr : lang === "de" ? r.titleDe : r.titleEn;
      const searchMatch =
        !search.trim() ||
        title.toLowerCase().includes(search.trim().toLowerCase());
      return catMatch && searchMatch;
    });
  }, [localRequests, activeCat, search, lang]);

  function handlePost(req) {
    setLocalRequests((prev) => [req, ...prev]);
    setShowForm(false);
    onPostRequest && onPostRequest(req);
  }

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`font-[Cairo,Tajawal,sans-serif] bg-gray-50 rounded-3xl p-4 md:p-6 ${className}`}
      style={{ fontFamily: "Cairo, Tajawal, sans-serif" }}
    >
      {/* Lang switcher */}
      <div
        className="flex gap-1 mb-4 justify-end"
        dir="ltr"
      >
        {["ar", "en", "de"].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`text-xs px-3 py-1 rounded-full font-semibold transition ${
              lang === l
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-500 hover:bg-gray-100 border border-gray-200"
            }`}
          >
            {l === "ar" ? "عربي" : l === "en" ? "EN" : "DE"}
          </button>
        ))}
      </div>

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-lg font-bold text-gray-800">{t.title}</h2>
          <p className="text-xs text-gray-500">{t.subtitle}</p>
        </div>
        <button
          onClick={() => setShowForm((s) => !s)}
          className="px-4 py-2 rounded-xl text-sm font-semibold bg-indigo-600 text-white hover:bg-indigo-700 transition"
        >
          + {t.postRequest}
        </button>
      </div>

      {/* Post form */}
      {showForm && (
        <PostForm
          lang={lang}
          currency={currency}
          t={t}
          cats={cats}
          onSubmit={handlePost}
          onCancel={() => setShowForm(false)}
        />
      )}

      {/* Search */}
      <input
        dir={isRTL ? "rtl" : "ltr"}
        className="w-full rounded-xl border border-gray-200 px-4 py-2 text-sm mb-4 focus:outline-none focus:ring-2 focus:ring-indigo-400 bg-white"
        placeholder={t.searchPlaceholder}
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      {/* Category pills */}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-4 scrollbar-hide">
        <button
          onClick={() => setActiveCat(-1)}
          className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition ${
            activeCat === -1
              ? "bg-indigo-600 text-white"
              : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
          }`}
        >
          {t.allCategories}
        </button>
        {cats.map((c, i) => (
          <button
            key={i}
            onClick={() => setActiveCat(i === activeCat ? -1 : i)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-medium transition ${
              activeCat === i
                ? "bg-indigo-600 text-white"
                : "bg-white text-gray-600 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      {/* Request list */}
      {filtered.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">{t.noResults}</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((req) => (
            <RequestCard
              key={req.id}
              req={req}
              lang={lang}
              t={t}
              cats={cats}
              onContactBuyer={onContactBuyer}
            />
          ))}
        </div>
      )}
    </div>
  );
}
