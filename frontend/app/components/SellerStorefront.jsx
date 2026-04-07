"use client";

import { useState, useMemo, useEffect } from "react";

// ─── Arabic-Indic numerals ───────────────────────────────────────────────────
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

// ─── i18n ────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    storefront: "متجر البائع",
    allItems: "جميع المنتجات",
    search: "ابحث في منتجات البائع…",
    noItems: "لا توجد منتجات",
    noMatch: "لا توجد نتائج مطابقة",
    items: "منتج",
    sort: "ترتيب حسب",
    newest: "الأحدث",
    priceLow: "السعر: الأقل",
    priceHigh: "السعر: الأعلى",
    views: "مشاهدة",
    egp: "ج.م",
    loadMore: "تحميل المزيد",
    memberSince: "عضو منذ",
    totalAds: "إجمالي الإعلانات",
    avgPrice: "متوسط السعر",
    viewAd: "عرض الإعلان",
    sold: "مباع",
    available: "متاح",
  },
  en: {
    storefront: "Seller Store",
    allItems: "All Items",
    search: "Search seller items…",
    noItems: "No items found",
    noMatch: "No results match",
    items: "item",
    sort: "Sort by",
    newest: "Newest",
    priceLow: "Price: Low",
    priceHigh: "Price: High",
    views: "views",
    egp: "EGP",
    loadMore: "Load More",
    memberSince: "Member since",
    totalAds: "Total Ads",
    avgPrice: "Avg. Price",
    viewAd: "View Ad",
    sold: "Sold",
    available: "Available",
  },
  de: {
    storefront: "Verkäufer-Shop",
    allItems: "Alle Artikel",
    search: "Artikel durchsuchen…",
    noItems: "Keine Artikel",
    noMatch: "Keine Treffer",
    items: "Artikel",
    sort: "Sortieren nach",
    newest: "Neueste",
    priceLow: "Preis: Aufsteigend",
    priceHigh: "Preis: Absteigend",
    views: "Aufrufe",
    egp: "EGP",
    loadMore: "Mehr laden",
    memberSince: "Mitglied seit",
    totalAds: "Anzeigen",
    avgPrice: "Ø Preis",
    viewAd: "Anzeige anzeigen",
    sold: "Verkauft",
    available: "Verfügbar",
  },
};

// ─── Demo seed data ───────────────────────────────────────────────────────────
const DEMO_ITEMS = [
  { id: 1, title: "آيفون 15 برو ماكس - 256 جيجا", titleEn: "iPhone 15 Pro Max 256GB", category: "electronics", price: 45000, views: 312, date: "2026-03-20", sold: false },
  { id: 2, title: "لابتوب لينوفو ثينك باد X1", titleEn: "Lenovo ThinkPad X1 Carbon", category: "electronics", price: 32000, views: 189, date: "2026-03-15", sold: false },
  { id: 3, title: "سيارة هيونداي إيلانترا 2022", titleEn: "Hyundai Elantra 2022", category: "cars", price: 380000, views: 540, date: "2026-03-10", sold: false },
  { id: 4, title: "شقة للإيجار - المهندسين", titleEn: "Apartment for Rent - Mohandeseen", category: "realestate", price: 15000, views: 275, date: "2026-03-05", sold: false },
  { id: 5, title: "طقم أثاث غرفة نوم كامل", titleEn: "Complete Bedroom Furniture Set", category: "furniture", price: 22000, views: 143, date: "2026-02-28", sold: true },
  { id: 6, title: "جهاز بلايستيشن 5 - جديد", titleEn: "PlayStation 5 - Brand New", category: "electronics", price: 18000, views: 490, date: "2026-02-20", sold: false },
  { id: 7, title: "دراجة رياضية جبلية - 21 سرعة", titleEn: "Mountain Bike 21-Speed", category: "sports", price: 3500, views: 88, date: "2026-02-15", sold: false },
  { id: 8, title: "كتب هندسة ودراسة متنوعة", titleEn: "Engineering & Study Books Bundle", category: "books", price: 800, views: 62, date: "2026-02-10", sold: true },
];

const CATEGORIES = ["electronics", "cars", "realestate", "furniture", "sports", "books", "clothing", "babies", "other"];

const CAT_LABELS = {
  ar: { electronics: "إلكترونيات", cars: "سيارات", realestate: "عقارات", furniture: "أثاث", sports: "رياضة", books: "كتب", clothing: "ملابس", babies: "أطفال", other: "أخرى" },
  en: { electronics: "Electronics", cars: "Cars", realestate: "Real Estate", furniture: "Furniture", sports: "Sports", books: "Books", clothing: "Clothing", babies: "Baby Items", other: "Other" },
  de: { electronics: "Elektronik", cars: "Autos", realestate: "Immobilien", furniture: "Möbel", sports: "Sport", books: "Bücher", clothing: "Kleidung", babies: "Baby", other: "Sonstiges" },
};

const CAT_ICONS = { electronics: "📱", cars: "🚗", realestate: "🏠", furniture: "🛋️", sports: "⚽", books: "📚", clothing: "👕", babies: "🍼", other: "📦" };

const formatPrice = (p, lang) => {
  const num = lang === "ar" ? toArabicIndic(p.toLocaleString("ar-EG")) : p.toLocaleString();
  return num;
};

const formatDate = (dateStr, lang) => {
  const d = new Date(dateStr);
  if (lang === "ar") return d.toLocaleDateString("ar-EG", { year: "numeric", month: "short" });
  if (lang === "de") return d.toLocaleDateString("de-DE", { year: "numeric", month: "short" });
  return d.toLocaleDateString("en-US", { year: "numeric", month: "short" });
};

// ─── ItemCard ────────────────────────────────────────────────────────────────
function ItemCard({ item, lang, currency, t, isRTL }) {
  const title = lang === "en" ? item.titleEn : item.title;
  const catLabel = CAT_LABELS[lang]?.[item.category] ?? item.category;
  return (
    <div
      className={`relative bg-white rounded-2xl border border-gray-100 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group ${isRTL ? "text-right" : "text-left"}`}
    >
      <div className="h-36 bg-gradient-to-br from-indigo-50 to-purple-100 flex items-center justify-center text-4xl select-none">
        {CAT_ICONS[item.category] ?? "📦"}
      </div>
      {item.sold && (
        <div className="absolute top-2 left-2 bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {t.sold}
        </div>
      )}
      {!item.sold && (
        <div className="absolute top-2 left-2 bg-green-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
          {t.available}
        </div>
      )}
      <div className="p-3">
        <p className="text-xs text-indigo-600 font-medium mb-1">{catLabel}</p>
        <h3 className="text-sm font-bold text-gray-800 line-clamp-2 mb-2 leading-snug">{title}</h3>
        <div className="flex items-center justify-between mt-auto">
          <span className="text-base font-black text-indigo-700">
            {formatPrice(item.price, lang)} <span className="text-xs font-normal">{currency}</span>
          </span>
          <span className="text-xs text-gray-400">
            {lang === "ar" ? toArabicIndic(item.views) : item.views} {t.views}
          </span>
        </div>
        <p className="text-xs text-gray-400 mt-1">{formatDate(item.date, lang)}</p>
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function SellerStorefront({
  sellerId = "demo",
  sellerName = "أحمد محمد",
  memberSince = "2024-01",
  lang = "ar",
  currency = "EGP",
  className = "",
}) {
  const isRTL = lang === "ar";
  const t = T[lang] ?? T.ar;

  const [activeCategory, setActiveCategory] = useState("all");
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState("newest");
  const [page, setPage] = useState(1);
  const [items, setItems] = useState([]);
  const [open, setOpen] = useState(true);

  const PAGE_SIZE = 6;

  useEffect(() => {
    const key = `xtox_seller_items_${sellerId}`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try { setItems(JSON.parse(stored)); } catch { setItems(DEMO_ITEMS); }
    } else {
      setItems(DEMO_ITEMS);
    }
  }, [sellerId]);

  const presentCats = useMemo(() => {
    const cats = [...new Set(items.map((i) => i.category))];
    return cats.filter((c) => CATEGORIES.includes(c));
  }, [items]);

  const filtered = useMemo(() => {
    let list = [...items];
    if (activeCategory !== "all") list = list.filter((i) => i.category === activeCategory);
    if (search.trim()) {
      const q = search.toLowerCase();
      list = list.filter((i) => i.title.includes(search) || i.titleEn.toLowerCase().includes(q));
    }
    if (sort === "newest") list.sort((a, b) => new Date(b.date) - new Date(a.date));
    else if (sort === "priceLow") list.sort((a, b) => a.price - b.price);
    else if (sort === "priceHigh") list.sort((a, b) => b.price - a.price);
    return list;
  }, [items, activeCategory, search, sort]);

  const paginated = filtered.slice(0, page * PAGE_SIZE);
  const hasMore = paginated.length < filtered.length;

  const totalAds = items.length;
  const avgPrice = totalAds ? Math.round(items.reduce((s, i) => s + i.price, 0) / totalAds) : 0;
  const memberDate = new Date(memberSince).toLocaleDateString(
    lang === "ar" ? "ar-EG" : lang === "de" ? "de-DE" : "en-US",
    { year: "numeric", month: "long" }
  );

  return (
    <div
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl border border-gray-200 shadow overflow-hidden ${className}`}
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: "Cairo, Tajawal, sans-serif" }}
    >
      <button
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between px-4 py-3 bg-gradient-to-l from-indigo-600 to-purple-600 text-white"
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">🏪</span>
          <span className="font-bold text-sm">{t.storefront}</span>
          <span className="font-semibold text-sm opacity-90">— {sellerName}</span>
        </div>
        <span className={`transition-transform duration-200 ${open ? "rotate-180" : ""}`}>▾</span>
      </button>

      {open && (
        <>
          <div className={`grid grid-cols-3 divide-x divide-gray-100 border-b border-gray-100 text-center ${isRTL ? "divide-x-reverse" : ""}`}>
            {[
              { label: t.memberSince, value: memberDate },
              { label: t.totalAds, value: lang === "ar" ? toArabicIndic(totalAds) : totalAds },
              { label: t.avgPrice, value: `${formatPrice(avgPrice, lang)} ${currency}` },
            ].map((stat, i) => (
              <div key={i} className="py-2 px-1">
                <p className="text-xs text-gray-400">{stat.label}</p>
                <p className="text-xs font-bold text-indigo-700 truncate">{stat.value}</p>
              </div>
            ))}
          </div>

          <div className={`flex gap-2 p-3 border-b border-gray-100 ${isRTL ? "flex-row-reverse" : ""}`}>
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder={t.search}
              className={`flex-1 rounded-xl border border-gray-200 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-300 ${isRTL ? "text-right" : "text-left"}`}
            />
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="rounded-xl border border-gray-200 px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-white"
            >
              <option value="newest">{t.newest}</option>
              <option value="priceLow">{t.priceLow}</option>
              <option value="priceHigh">{t.priceHigh}</option>
            </select>
          </div>

          <div className={`flex gap-2 px-3 py-2 overflow-x-auto scrollbar-hide border-b border-gray-100 ${isRTL ? "flex-row-reverse" : ""}`}>
            <button
              onClick={() => { setActiveCategory("all"); setPage(1); }}
              className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors ${activeCategory === "all" ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-indigo-50"}`}
            >
              {t.allItems}
            </button>
            {presentCats.map((cat) => (
              <button
                key={cat}
                onClick={() => { setActiveCategory(cat); setPage(1); }}
                className={`whitespace-nowrap rounded-full px-3 py-1 text-xs font-medium transition-colors flex items-center gap-1 ${activeCategory === cat ? "bg-indigo-600 text-white" : "bg-gray-100 text-gray-600 hover:bg-indigo-50"}`}
              >
                <span>{CAT_ICONS[cat]}</span>
                <span>{CAT_LABELS[lang]?.[cat] ?? cat}</span>
              </button>
            ))}
          </div>

          <div className="p-3">
            {paginated.length === 0 ? (
              <div className="text-center text-gray-400 py-8 text-sm">
                {search ? t.noMatch : t.noItems}
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {paginated.map((item, i) => (
                  <div
                    key={item.id}
                    style={{ animationDelay: `${i * 50}ms` }}
                  >
                    <ItemCard item={item} lang={lang} currency={currency} t={t} isRTL={isRTL} />
                  </div>
                ))}
              </div>
            )}
            {hasMore && (
              <div className="text-center mt-4">
                <button
                  onClick={() => setPage((p) => p + 1)}
                  className="rounded-xl bg-indigo-50 text-indigo-700 text-sm font-medium px-5 py-2 hover:bg-indigo-100 transition-colors"
                >
                  {t.loadMore} ({lang === "ar" ? toArabicIndic(filtered.length - paginated.length) : filtered.length - paginated.length} {t.items})
                </button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
