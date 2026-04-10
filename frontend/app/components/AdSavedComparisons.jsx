/**
 * AdSavedComparisons.jsx
 * XTOX Marketplace — Persistent Ad Comparison Dock
 *
 * Features:
 *  - Save up to 4 ads for side-by-side comparison
 *  - Persists across browser sessions via localStorage (key: xtox_comparison_ads)
 *  - Floating trigger button (bottom-left, hidden on print)
 *  - Slide-up panel with comparison table: image, title, price, condition, location, seller rating
 *  - Clear All + individual remove buttons
 *  - Export/share comparison as copyable URL query string (?compare=id1,id2,id3)
 *  - AR/EN toggle with full RTL support
 *  - Arabic-first labels (Cairo font), English fallback
 *  - Tailwind CSS only — zero API calls, fully offline-capable
 *
 * Exports:
 *  - useAdComparison()   → { savedAds, addAd, removeAd, clearAll, isInComparison }
 *  - <AdSavedComparisons /> (default) — the dock UI
 */

import React, {
  createContext,
  useContext,
  useEffect,
  useState,
  useCallback,
  useRef,
} from "react";

// ─────────────────────────────────────────────────────────────────────────────
// Constants
// ─────────────────────────────────────────────────────────────────────────────
const LS_KEY = "xtox_comparison_ads";
const MAX_ADS = 4;

// ─────────────────────────────────────────────────────────────────────────────
// i18n labels — Arabic-first, English fallback
// ─────────────────────────────────────────────────────────────────────────────
const LABELS = {
  ar: {
    dockTitle: "المقارنة المحفوظة",
    openDock: "فتح لوح المقارنة",
    closeDock: "إغلاق",
    clearAll: "مسح الكل",
    removeAd: "إزالة",
    copyLink: "نسخ رابط المقارنة",
    linkCopied: "✓ تم النسخ!",
    emptyState: "لم تقم بإضافة أي إعلان للمقارنة بعد.",
    addHint: "أضف حتى ٤ إعلانات لمقارنتها جنبًا إلى جنب.",
    image: "الصورة",
    title: "العنوان",
    price: "السعر",
    condition: "الحالة",
    location: "الموقع",
    sellerRating: "تقييم البائع",
    maxReached: "الحد الأقصى ٤ إعلانات في المقارنة",
    alreadyAdded: "هذا الإعلان موجود بالفعل",
    switchToEn: "English",
    switchToAr: "العربية",
    stars: "نجوم",
    noData: "—",
    shareTitle: "مشاركة المقارنة",
  },
  en: {
    dockTitle: "Saved Comparisons",
    openDock: "Open Comparison Dock",
    closeDock: "Close",
    clearAll: "Clear All",
    removeAd: "Remove",
    copyLink: "Copy Comparison Link",
    linkCopied: "✓ Copied!",
    emptyState: "No ads added to comparison yet.",
    addHint: "Add up to 4 ads to compare side by side.",
    image: "Image",
    title: "Title",
    price: "Price",
    condition: "Condition",
    location: "Location",
    sellerRating: "Seller Rating",
    maxReached: "Max 4 ads in comparison",
    alreadyAdded: "Already in comparison",
    switchToEn: "English",
    switchToAr: "العربية",
    stars: "stars",
    noData: "—",
    shareTitle: "Share Comparison",
  },
};

// ─────────────────────────────────────────────────────────────────────────────
// Context
// ─────────────────────────────────────────────────────────────────────────────
const AdComparisonContext = createContext(null);

function loadFromStorage() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.slice(0, MAX_ADS) : [];
  } catch {
    return [];
  }
}

function saveToStorage(ads) {
  try {
    localStorage.setItem(LS_KEY, JSON.stringify(ads));
  } catch {
    // quota exceeded or SSR — silently ignore
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// Provider
// ─────────────────────────────────────────────────────────────────────────────
export function AdComparisonProvider({ children }) {
  const [savedAds, setSavedAds] = useState([]);
  const [toast, setToast] = useState(null);

  // Hydrate from localStorage on mount (client-only)
  useEffect(() => {
    setSavedAds(loadFromStorage());
  }, []);

  const showToast = useCallback((msg, duration = 2200) => {
    setToast(msg);
    const t = setTimeout(() => setToast(null), duration);
    return () => clearTimeout(t);
  }, []);

  const addAd = useCallback(
    (ad, lang = "ar") => {
      const t = LABELS[lang] ?? LABELS.ar;
      if (!ad?.id) return;
      setSavedAds((prev) => {
        if (prev.find((a) => a.id === ad.id)) {
          showToast(t.alreadyAdded);
          return prev;
        }
        if (prev.length >= MAX_ADS) {
          showToast(t.maxReached);
          return prev;
        }
        const next = [...prev, ad];
        saveToStorage(next);
        return next;
      });
    },
    [showToast]
  );

  const removeAd = useCallback((id) => {
    setSavedAds((prev) => {
      const next = prev.filter((a) => a.id !== id);
      saveToStorage(next);
      return next;
    });
  }, []);

  const clearAll = useCallback(() => {
    setSavedAds([]);
    saveToStorage([]);
  }, []);

  const isInComparison = useCallback(
    (id) => savedAds.some((a) => a.id === id),
    [savedAds]
  );

  return (
    <AdComparisonContext.Provider
      value={{ savedAds, addAd, removeAd, clearAll, isInComparison, toast }}
    >
      {children}
    </AdComparisonContext.Provider>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Hook — for use in AdCard or any consumer
// ─────────────────────────────────────────────────────────────────────────────
export function useAdComparison() {
  const ctx = useContext(AdComparisonContext);
  if (!ctx) {
    // Graceful fallback when used outside provider (e.g. in Storybook)
    const [savedAds, setSavedAds] = useState([]);
    const addAd = (ad) =>
      setSavedAds((p) =>
        p.find((a) => a.id === ad.id) || p.length >= MAX_ADS
          ? p
          : [...p, ad]
      );
    const removeAd = (id) => setSavedAds((p) => p.filter((a) => a.id !== id));
    const clearAll = () => setSavedAds([]);
    const isInComparison = (id) => savedAds.some((a) => a.id === id);
    return { savedAds, addAd, removeAd, clearAll, isInComparison };
  }
  return ctx;
}

// ─────────────────────────────────────────────────────────────────────────────
// Star Rating Display
// ─────────────────────────────────────────────────────────────────────────────
function StarRating({ rating, lang }) {
  const t = LABELS[lang] ?? LABELS.ar;
  const filled = Math.round(Math.max(0, Math.min(5, rating ?? 0)));
  return (
    <span
      aria-label={`${filled} ${t.stars}`}
      className="flex gap-0.5 justify-center"
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <svg
          key={s}
          className={`w-4 h-4 ${s <= filled ? "text-amber-400" : "text-gray-300"}`}
          fill="currentColor"
          viewBox="0 0 20 20"
        >
          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
        </svg>
      ))}
    </span>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Comparison Table
// ─────────────────────────────────────────────────────────────────────────────
function ComparisonTable({ ads, onRemove, lang }) {
  const t = LABELS[lang] ?? LABELS.ar;
  const noData = t.noData;

  const rows = [
    {
      key: "image",
      label: t.image,
      render: (ad) =>
        ad.image ? (
          <img
            src={ad.image}
            alt={ad.title ?? ""}
            className="w-20 h-20 object-cover rounded-lg mx-auto border border-gray-200"
            loading="lazy"
          />
        ) : (
          <div className="w-20 h-20 rounded-lg bg-gray-100 flex items-center justify-center text-gray-400 mx-auto text-xs">
            {noData}
          </div>
        ),
    },
    {
      key: "title",
      label: t.title,
      render: (ad) => (
        <span className="font-semibold text-gray-800 text-sm leading-snug">
          {ad.title ?? noData}
        </span>
      ),
    },
    {
      key: "price",
      label: t.price,
      render: (ad) => (
        <span className="text-emerald-600 font-bold text-sm">
          {ad.price != null ? ad.price : noData}
        </span>
      ),
    },
    {
      key: "condition",
      label: t.condition,
      render: (ad) => (
        <span className="text-gray-600 text-sm">{ad.condition ?? noData}</span>
      ),
    },
    {
      key: "location",
      label: t.location,
      render: (ad) => (
        <span className="text-gray-600 text-sm">{ad.location ?? noData}</span>
      ),
    },
    {
      key: "sellerRating",
      label: t.sellerRating,
      render: (ad) =>
        ad.sellerRating != null ? (
          <StarRating rating={ad.sellerRating} lang={lang} />
        ) : (
          <span className="text-gray-400 text-sm">{noData}</span>
        ),
    },
  ];

  if (!ads.length) return null;

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-center border-collapse">
        <thead>
          <tr className="border-b border-gray-200">
            <th className="py-2 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-start w-24">
              {/* row label column header — intentionally blank */}
            </th>
            {ads.map((ad) => (
              <th key={ad.id} className="py-2 px-3 min-w-[140px]">
                <button
                  onClick={() => onRemove(ad.id)}
                  className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors font-medium"
                  title={t.removeAd}
                >
                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  {t.removeAd}
                </button>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.key} className="border-b border-gray-100 hover:bg-gray-50 transition-colors">
              <td className="py-3 px-3 text-xs font-semibold text-gray-500 uppercase tracking-wide text-start whitespace-nowrap">
                {row.label}
              </td>
              {ads.map((ad) => (
                <td key={ad.id} className="py-3 px-3 align-middle">
                  {row.render(ad)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Share / Copy URL
// ─────────────────────────────────────────────────────────────────────────────
function buildShareUrl(ads) {
  if (typeof window === "undefined") return "";
  const ids = ads.map((a) => a.id).join(",");
  const url = new URL(window.location.href);
  url.searchParams.set("compare", ids);
  return url.toString();
}

function ShareButton({ ads, lang }) {
  const t = LABELS[lang] ?? LABELS.ar;
  const [copied, setCopied] = useState(false);
  const timerRef = useRef(null);

  const handleCopy = useCallback(async () => {
    const shareUrl = buildShareUrl(ads);
    try {
      await navigator.clipboard.writeText(shareUrl);
    } catch {
      // Fallback for older browsers
      const el = document.createElement("textarea");
      el.value = shareUrl;
      document.body.appendChild(el);
      el.select();
      document.execCommand("copy");
      document.body.removeChild(el);
    }
    setCopied(true);
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setCopied(false), 2000);
  }, [ads]);

  useEffect(() => () => clearTimeout(timerRef.current), []);

  return (
    <button
      onClick={handleCopy}
      disabled={!ads.length}
      className="inline-flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium
                 bg-blue-50 text-blue-700 hover:bg-blue-100 disabled:opacity-40 disabled:cursor-not-allowed
                 transition-all border border-blue-200"
      title={t.shareTitle}
    >
      {copied ? (
        t.linkCopied
      ) : (
        <>
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
          </svg>
          {t.copyLink}
        </>
      )}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Main Dock Component
// ─────────────────────────────────────────────────────────────────────────────
export default function AdSavedComparisons() {
  const { savedAds, removeAd, clearAll, toast } = useAdComparison();
  const [isOpen, setIsOpen] = useState(false);
  const [lang, setLang] = useState("ar");
  const panelRef = useRef(null);

  const t = LABELS[lang];
  const isRTL = lang === "ar";
  const count = savedAds.length;

  // Close on Escape
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && isOpen) setIsOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen]);

  // Auto-open when first ad is added
  useEffect(() => {
    if (count === 1) setIsOpen(true);
  }, [count]);

  const toggleLang = () => setLang((l) => (l === "ar" ? "en" : "ar"));

  return (
    <>
      {/* Google Fonts — Cairo for Arabic */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');
        .xtox-dock { font-family: ${isRTL ? "'Cairo', " : ""}system-ui, sans-serif; }
        @media print { .xtox-dock-no-print { display: none !important; } }
      `}</style>

      {/* Toast Notification */}
      {toast && (
        <div
          className="fixed bottom-24 left-1/2 -translate-x-1/2 z-[9999] px-5 py-2.5
                     bg-gray-900 text-white text-sm rounded-full shadow-xl
                     animate-bounce pointer-events-none"
          role="alert"
          aria-live="polite"
        >
          {toast}
        </div>
      )}

      {/* Floating Trigger Button */}
      <div className="xtox-dock xtox-dock-no-print fixed bottom-6 left-6 z-[9998] flex flex-col items-start gap-2">
        <button
          onClick={() => setIsOpen((o) => !o)}
          aria-label={t.openDock}
          aria-expanded={isOpen}
          className="relative flex items-center gap-2 px-4 py-3 rounded-2xl shadow-2xl
                     bg-gradient-to-br from-emerald-500 to-teal-600 text-white
                     hover:from-emerald-600 hover:to-teal-700 active:scale-95
                     transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:ring-offset-2"
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round"
              d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
          </svg>
          <span className="text-sm font-semibold">{t.dockTitle}</span>
          {count > 0 && (
            <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-red-500 text-white
                             text-[10px] font-bold flex items-center justify-center shadow-md">
              {count}
            </span>
          )}
        </button>
      </div>

      {/* Slide-up Panel */}
      <div
        ref={panelRef}
        dir={isRTL ? "rtl" : "ltr"}
        className={`xtox-dock xtox-dock-no-print fixed bottom-0 left-0 right-0 z-[9997]
                    bg-white border-t border-gray-200 shadow-2xl rounded-t-3xl
                    transition-transform duration-300 ease-in-out
                    ${isOpen ? "translate-y-0" : "translate-y-full"}`}
        style={{ maxHeight: "85vh", overflowY: "auto" }}
        role="dialog"
        aria-modal="true"
        aria-label={t.dockTitle}
      >
        {/* Panel Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100 px-5 py-3 rounded-t-3xl">
          <div className="flex items-center justify-between gap-3 flex-wrap">
            {/* Title + Count */}
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-gray-800">{t.dockTitle}</h2>
              <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-xs font-semibold">
                {count}/{MAX_ADS}
              </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2 flex-wrap">
              <ShareButton ads={savedAds} lang={lang} />

              <button
                onClick={toggleLang}
                className="px-3 py-1.5 rounded-lg text-xs font-medium border border-gray-300
                           text-gray-600 hover:bg-gray-50 transition-colors"
              >
                {lang === "ar" ? t.switchToEn : t.switchToAr}
              </button>

              {count > 0 && (
                <button
                  onClick={clearAll}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium border border-red-200
                             bg-red-50 text-red-600 hover:bg-red-100 transition-colors"
                >
                  {t.clearAll}
                </button>
              )}

              <button
                onClick={() => setIsOpen(false)}
                aria-label={t.closeDock}
                className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </button>
            </div>
          </div>
        </div>

        {/* Panel Body */}
        <div className="px-5 py-4">
          {count === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
              <svg className="w-12 h-12 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
                <path strokeLinecap="round" strokeLinejoin="round"
                  d="M9 17V7m0 10a2 2 0 01-2 2H5a2 2 0 01-2-2V7a2 2 0 012-2h2a2 2 0 012 2m0 10a2 2 0 002 2h2a2 2 0 002-2M9 7a2 2 0 012-2h2a2 2 0 012 2m0 10V7m0 10a2 2 0 002 2h2a2 2 0 002-2V7a2 2 0 00-2-2h-2a2 2 0 00-2 2" />
              </svg>
              <p className="text-gray-500 font-medium">{t.emptyState}</p>
              <p className="text-gray-400 text-sm">{t.addHint}</p>
            </div>
          ) : (
            <ComparisonTable ads={savedAds} onRemove={removeAd} lang={lang} />
          )}
        </div>
      </div>

      {/* Backdrop */}
      {isOpen && (
        <div
          className="xtox-dock-no-print fixed inset-0 z-[9996] bg-black/20 backdrop-blur-sm"
          onClick={() => setIsOpen(false)}
          aria-hidden="true"
        />
      )}
    </>
  );
}
