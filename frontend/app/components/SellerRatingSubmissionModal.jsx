"use client";

import { useState, useCallback, useRef, useEffect } from "react";

/* ─────────────────────────────────────────────
   Arabic-Indic numerals helper
   ───────────────────────────────────────────── */
const toArabicNumerals = (num) =>
  String(num).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

/* ─────────────────────────────────────────────
   i18n strings (AR / EN / DE)
   ───────────────────────────────────────────── */
const LABELS = {
  ar: {
    title: "قيّم البائع",
    subtitle: (name) => 'كيف كانت تجربتك مع ' + (name) + '؟',
    adLabel: "الإعلان",
    overallLabel: "التقييم العام",
    stars: ["", "سيء", "مقبول", "جيد", "جيد جداً", "ممتاز"],
    categories: {
      communication: "التواصل",
      accuracy: "دقة الوصف",
      punctuality: "الالتزام بالمواعيد",
      priceFairness: "عدالة السعر",
    },
    reviewLabel: "اكتب تقييمك (اختياري)",
    reviewPlaceholder: "شارك تجربتك مع هذا البائع…",
    charsLeft: (n) => (toArabicNumerals(n)) + ' حرف متبقٍ',
    anonymous: "نشر التقييم بشكل مجهول",
    photos: "أضف صور إثبات الصفقة (اختياري)",
    photoPlaceholder: "رابط Cloudinary للصورة",
    addPhoto: "إضافة صورة",
    removePhoto: "حذف",
    maxPhotos: "الحد الأقصى ٣ صور",
    submit: "إرسال التقييم",
    submitting: "جارٍ الإرسال…",
    retry: "إعادة المحاولة",
    successTitle: "شكراً على تقييمك!",
    successBody: "ساعدت الآخرين في اتخاذ قرار أفضل.",
    errorTitle: "فشل الإرسال",
    errorBody: "تعذّر إرسال تقييمك، يُرجى المحاولة مجدداً.",
    close: "إغلاق",
    done: "تم",
  },
  en: {
    title: "Rate the Seller",
    subtitle: (name) => 'How was your experience with ' + (name) + '?',
    adLabel: "Listing",
    overallLabel: "Overall Rating",
    stars: ["", "Poor", "Fair", "Good", "Very Good", "Excellent"],
    categories: {
      communication: "Communication",
      accuracy: "Item Accuracy",
      punctuality: "Punctuality",
      priceFairness: "Price Fairness",
    },
    reviewLabel: "Write your review (optional)",
    reviewPlaceholder: "Share your experience with this seller…",
    charsLeft: (n) => (n) + ' chars left',
    anonymous: "Post review anonymously",
    photos: "Add deal proof photos (optional)",
    photoPlaceholder: "Cloudinary image URL",
    addPhoto: "Add photo",
    removePhoto: "Remove",
    maxPhotos: "Max 3 photos",
    submit: "Submit Rating",
    submitting: "Submitting…",
    retry: "Retry",
    successTitle: "Thank you for your review!",
    successBody: "You helped others make a better decision.",
    errorTitle: "Submission Failed",
    errorBody: "Could not submit your rating. Please try again.",
    close: "Close",
    done: "Done",
  },
  de: {
    title: "Verkäufer bewerten",
    subtitle: (name) => 'Wie war Ihre Erfahrung mit ' + (name) + '?',
    adLabel: "Anzeige",
    overallLabel: "Gesamtbewertung",
    stars: ["", "Schlecht", "Akzeptabel", "Gut", "Sehr gut", "Ausgezeichnet"],
    categories: {
      communication: "Kommunikation",
      accuracy: "Artikelgenauigkeit",
      punctuality: "Pünktlichkeit",
      priceFairness: "Preisgerechtigkeit",
    },
    reviewLabel: "Bewertung schreiben (optional)",
    reviewPlaceholder: "Teilen Sie Ihre Erfahrung mit diesem Verkäufer…",
    charsLeft: (n) => (n) + ' Zeichen übrig',
    anonymous: "Anonym bewerten",
    photos: "Deal-Beweisfotos hinzufügen (optional)",
    photoPlaceholder: "Cloudinary-Bild-URL",
    addPhoto: "Foto hinzufügen",
    removePhoto: "Entfernen",
    maxPhotos: "Max. 3 Fotos",
    submit: "Bewertung absenden",
    submitting: "Wird gesendet…",
    retry: "Erneut versuchen",
    successTitle: "Danke für Ihre Bewertung!",
    successBody: "Sie haben anderen geholfen, eine bessere Entscheidung zu treffen.",
    errorTitle: "Übermittlung fehlgeschlagen",
    errorBody: "Ihre Bewertung konnte nicht übermittelt werden. Bitte versuchen Sie es erneut.",
    close: "Schließen",
    done: "Fertig",
  },
};

const CATEGORY_KEYS = ["communication", "accuracy", "punctuality", "priceFairness"];
const MAX_REVIEW_CHARS = 500;
const MAX_PHOTOS = 3;
const SUBMIT_TIMEOUT_MS = 8000;

/* ─────────────────────────────────────────────
   Confetti particle component
   ───────────────────────────────────────────── */
function ConfettiParticle({ style }) {
  return (
    <span
      className="pointer-events-none absolute rounded-sm"
      style={style}
    />
  );
}

function Confetti({ active }) {
  const particles = useRef([]);

  if (active && particles.current.length === 0) {
    const colors = ["#FFD700", "#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4", "#FFEAA7", "#DDA0DD"];
    particles.current = Array.from({ length: 48 }, (_, i) => ({
      id: i,
      left: (Math.random() * 100) + '%',
      top: (Math.random() * 40 - 10) + '%',
      width: (Math.random() * 8 + 4) + 'px',
      height: (Math.random() * 6 + 3) + 'px',
      background: colors[i % colors.length],
      transform: 'rotate(' + (Math.random() * 360) + 'deg)',
      opacity: 0,
      animation: 'confetti-fall ' + (0.8 + Math.random() * 1.2) + 's ease-out ' + (Math.random() * 0.5) + 's forwards',
    }));
  }

  if (!active) {
    particles.current = [];
    return null;
  }

  return (
    <>
      <style>{`
        @keyframes confetti-fall {
          0%   { opacity: 1; transform: translateY(0) rotate(0deg); }
          100% { opacity: 0; transform: translateY(120px) rotate(720deg); }
        }
      '}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
        {particles.current.map((p) => (
          <ConfettiParticle key=`}</style>
      <div className="pointer-events-none absolute inset-0 overflow-hidden rounded-2xl" aria-hidden="true">
        {particles.current.map((p) => (
          <ConfettiParticle key={p.id} style={p} />
        ))}
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Star rating sub-component
   ───────────────────────────────────────────── */
function StarRow({ value, onChange, labels, size = "lg", disabled = false }) {
  const [hovered, setHovered] = useState(0);
  const sizes = { lg: "w-10 h-10 text-3xl", sm: "w-7 h-7 text-xl" };
  const cls = sizes[size] ?? sizes.lg;

  return (
    <div
      className="flex flex-row-reverse gap-1 items-center"
      role="radiogroup"
      onMouseLeave={() => !disabled && setHovered(0)}
    >
      {[5, 4, 3, 2, 1].map((star) => {
        const filled = star <= (hovered || value);
        return (
          <button
            key={star}
            type="button"
            disabled={disabled}
            aria-label={labels[star]}
            role="radio"
            aria-checked={value === star}
            onMouseEnter={() => !disabled && setHovered(star)}
            onClick={() => !disabled && onChange(star)}
            className={`
              ${cls} transition-transform duration-150 focus:outline-none
              focus-visible:ring-2 focus-visible:ring-amber-400 rounded
              ${disabled ? "cursor-default" : "cursor-pointer hover:scale-125 active:scale-110"}
              ${filled ? "text-amber-400 drop-shadow-[0_0_6px_rgba(251,191,36,0.7)]" : "text-slate-300 dark:text-slate-600"}
            '}
          >
            ★
          </button>
        );
      })}
      {(hovered || value) > 0 && (
        <span className="text-sm text-amber-500 font-medium ms-2">
          {labels[hovered || value]}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toast sub-component
   ───────────────────────────────────────────── */
function Toa`}
          >
            ★
          </button>
        );
      })}
      {(hovered || value) > 0 && (
        <span className="text-sm text-amber-500 font-medium ms-2">
          {labels[hovered || value]}
        </span>
      )}
    </div>
  );
}

/* ─────────────────────────────────────────────
   Toast sub-component
   ───────────────────────────────────────────── */
function Toast({ type, title, body, onDismiss }) {
  useEffect(() => {
    const t = setTimeout(onDismiss, 5000);
    return () => clearTimeout(t);
  }, [onDismiss]);

  const base = "fixed bottom-6 inset-x-0 mx-auto w-max max-w-sm z-[9999] px-5 py-4 rounded-xl shadow-2xl flex items-start gap-3 text-white animate-[slide-up_0.3s_ease-out]";
  const colour = type === "success" ? "bg-emerald-600" : "bg-red-600";
  const icon = type === "success" ? "✅" : "❌";

  return (
    <>
      <style>{`
        @keyframes slide-up {
          from { transform: translateY(40px); opacity: 0; }
          to   { transform: translateY(0); opacity: 1; }
        }
      '}</style>
      <div className={(base) + ' ${colour}} role="alert">
        <span className="text-xl mt-0.5">{icon}</span>
        <div>
          <p cla`}</style>
      <div className={(base) + ' ' + (colour)} role="alert">
        <span className="text-xl mt-0.5">{icon}</span>
        <div>
          <p className="font-bold">{title}</p>
          <p className="text-sm opacity-90">{body}</p>
        </div>
        <button
          onClick={onDismiss}
          className="ms-auto text-white/70 hover:text-white text-lg leading-none"
          aria-label="close toast"
        >
          ✕
        </button>
      </div>
    </>
  );
}

/* ─────────────────────────────────────────────
   Fetch with timeout + single retry
   ───────────────────────────────────────────── */
async function fetchWithRetry(url, options, timeoutMs = SUBMIT_TIMEOUT_MS) {
  const attempt = async () => {
    const ctrl = new AbortController();
    const timer = setTimeout(() => ctrl.abort(), timeoutMs);
    try {
      const res = await fetch(url, { ...options, signal: ctrl.signal });
      clearTimeout(timer);
      return res;
    } catch (err) {
      clearTimeout(timer);
      throw err;
    }
  };

  try {
    return await attempt();
  } catch {
    // Single retry
    await new Promise((r) => setTimeout(r, 800));
    return await attempt();
  }
}

/* ─────────────────────────────────────────────
   Main component
   ───────────────────────────────────────────── */
export default function SellerRatingSubmissionModal({
  sellerId,
  adId,
  dealId,
  lang = "ar",
  onClose,
  onSuccess,
  sellerName = "البائع",
  adTitle = "",
}) {
  const L = LABELS[lang] || LABELS.ar;
  const isRtl = lang === "ar";

  // Overall rating
  const [overall, setOverall] = useState(0);

  // Category sub-ratings
  const [categories, setCategories] = useState({
    communication: 0,
    accuracy: 0,
    punctuality: 0,
    priceFairness: 0,
  });

  // Review text
  const [review, setReview] = useState("");

  // Anonymous toggle
  const [anonymous, setAnonymous] = useState(false);

  // Photos (Cloudinary URLs)
  const [photos, setPhotos] = useState([]);
  const [photoInput, setPhotoInput] = useState("");

  // Submission state
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error

  // Toast
  const [toast, setToast] = useState(null);

  // Confetti
  const [showConfetti, setShowConfetti] = useState(false);

  const overlayRef = useRef(null);

  // Lock body scroll
  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  // ESC to close
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape" && status !== "submitting") onClose?.();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose, status]);

  const handleCategoryChange = useCallback((key, val) => {
    setCategories((prev) => ({ ...prev, [key]: val }));
  }, []);

  const addPhoto = () => {
    const url = photoInput.trim();
    if (!url || photos.length >= MAX_PHOTOS) return;
    if (!url.startsWith("http")) return;
    setPhotos((prev) => [...prev, url]);
    setPhotoInput("");
  };

  const removePhoto = (idx) => {
    setPhotos((prev) => prev.filter((_, i) => i !== idx));
  };

  const canSubmit = overall > 0 && status !== "submitting";

  const handleSubmit = async () => {
    if (!canSubmit) return;
    setStatus("submitting");

    const payload = {
      sellerId,
      adId,
      dealId,
      overall,
      categories,
      review: review.trim(),
      anonymous,
      photos,
    };

    try {
      const res = await fetchWithRetry("/api/ratings", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) throw new Error('HTTP ' + (res.status));

      setStatus("success");
      if (overall === 5) {
        setShowConfetti(true);
        setTimeout(() => setShowConfetti(false), 2500);
      }
      setToast({ type: "success", title: L.successTitle, body: L.successBody });
      onSuccess?.({ ...payload });
    } catch {
      setStatus("error");
      setToast({ type: "error", title: L.errorTitle, body: L.errorBody });
    }
  };

  const handleRetry = () => {
    setStatus("idle");
    setToast(null);
  };

  // Overall gradient background behind stars
  const ratingGradients = [
    "",
    "from-red-50 to-red-100",
    "from-orange-50 to-orange-100",
    "from-yellow-50 to-yellow-100",
    "from-lime-50 to-lime-100",
    "from-emerald-50 to-emerald-100",
  ];

  return (
    <>
      {/* Font import */}
      <style>{`
        @import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap\');
        .rating-modal { font-family: ${lang === "ar" ? "'Cairo', 'Tajawal'" : "'Cairo'"}, sans-serif; }
      '}</style>

      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        onClick={(e) => {
          if (e.target === o`}</style>

      {/* Backdrop */}
      <div
        ref={overlayRef}
        className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/60 backdrop-blur-sm p-0 sm:p-4"
        onClick={(e) => {
          if (e.target === overlayRef.current && status !== "submitting") onClose?.();
        }}
        aria-modal="true"
        role="dialog"
        aria-labelledby="rating-modal-title"
      >
        {/* Panel */}
        <div
          className={`
            rating-modal relative w-full sm:max-w-lg bg-white dark:bg-slate-900
            rounded-t-3xl sm:rounded-2xl shadow-2xl overflow-hidden
            flex flex-col max-h-[95dvh]
            ${isRtl ? "text-right" : "text-left"}
          '}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <Confetti active={showConfetti} />

          {/* ── Header ── */}
          <div
            className={'
              relative px-6 pt-6 pb-4 flex items-start justify-between gap-4
`}
          dir={isRtl ? "rtl" : "ltr"}
        >
          <Confetti active={showConfetti} />

          {/* ── Header ── */}
          <div
            className={`
              relative px-6 pt-6 pb-4 flex items-start justify-between gap-4
              border-b border-slate-100 dark:border-slate-800
              ${overall > 0 ? 'bg-gradient-to-br ${ratingGradients[overall]} dark:from-slate-800 dark:to-slate-900' : ""}
              transition-colors duration-500
            '}
          >
            <div className="flex-1 min-w-0">
              <h2
                id="rating-modal-title"
                className="text-xl font-bold text-slate-800 dark:text-white leading-tight"
              >
                {L.title}
              </h2>
              <p className="text-sm text-slate-50`}
          >
            <div className="flex-1 min-w-0">
              <h2
                id="rating-modal-title"
                className="text-xl font-bold text-slate-800 dark:text-white leading-tight"
              >
                {L.title}
              </h2>
              <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 truncate">
                {L.subtitle(sellerName)}
              </p>
              {adTitle && (
                <p className="text-xs text-slate-400 dark:text-slate-500 mt-1 truncate">
                  {L.adLabel}: {adTitle}
                </p>
              )}
            </div>
            <button
              onClick={() => status !== "submitting" && onClose?.()}
              disabled={status === "submitting"}
              aria-label={L.close}
              className="shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 hover:bg-slate-100 dark:hover:bg-slate-800 transition disabled:opacity-30"
            >
              ✕
            </button>
          </div>

          {/* ── Scrollable body ── */}
          <div className="overflow-y-auto flex-1 px-6 py-5 space-y-6">

            {/* Success state */}
            {status === "success" && (
              <div className="flex flex-col items-center gap-4 py-6 text-center">
                <div className="text-6xl animate-bounce">🎉</div>
                <h3 className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                  {L.successTitle}
                </h3>
                <p className="text-slate-500 dark:text-slate-400">{L.successBody}</p>
                <button
                  onClick={onClose}
                  className="mt-2 px-8 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white rounded-full font-semibold transition"
                >
                  {L.done}
                </button>
              </div>
            )}

            {status !== "success" && (
              <>
                {/* ── Overall stars ── */}
                <section aria-label={L.overallLabel}>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                    {L.overallLabel}
                  </p>
                  <StarRow
                    value={overall}
                    onChange={setOverall}
                    labels={L.stars}
                    size="lg"
                    disabled={status === "submitting"}
                  />
                </section>

                {/* ── Category sub-ratings ── */}
                <section aria-label="category ratings">
                  <div className="space-y-3">
                    {CATEGORY_KEYS.map((key) => (
                      <div key={key} className="flex items-center justify-between gap-4 flex-wrap">
                        <span className="text-sm text-slate-600 dark:text-slate-400 shrink-0 w-36">
                          {L.categories[key]}
                        </span>
                        <StarRow
                          value={categories[key]}
                          onChange={(v) => handleCategoryChange(key, v)}
                          labels={L.stars}
                          size="sm"
                          disabled={status === "submitting"}
                        />
                      </div>
                    ))}
                  </div>
                </section>

                {/* ── Divider ── */}
                <hr className="border-slate-100 dark:border-slate-800" />

                {/* ── Review textarea ── */}
                <section aria-label={L.reviewLabel}>
                  <label className="block text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                    {L.reviewLabel}
                  </label>
                  <textarea
                    value={review}
                    onChange={(e) => {
                      if (e.target.value.length <= MAX_REVIEW_CHARS) setReview(e.target.value);
                    }}
                    placeholder={L.reviewPlaceholder}
                    rows={4}
                    disabled={status === "submitting"}
                    className={`
                      w-full px-4 py-3 rounded-xl border border-slate-200 dark:border-slate-700
                      bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100
                      placeholder:text-slate-400 dark:placeholder:text-slate-500
                      resize-none focus:outline-none focus:ring-2 focus:ring-amber-400
                      text-sm leading-relaxed disabled:opacity-50
                      ${isRtl ? "text-right" : "text-left"}
                    '}
                    dir={isRtl ? "rtl" : "ltr"}
                    aria-label={L.reviewLabel}
                  />
                  <p className={'text-xs mt-1 text-slate-400 ${isRtl ? "text-start" : "text-end"}}>
                    {L.charsLeft(MAX_REVIEW_CHARS - review.length)}
                  </p>
                </section>

                {/* ── Anonymous toggle ── */}
                <section>
                  <label className="flex items-center gap-3 cursor-poi`}
                    dir={isRtl ? "rtl" : "ltr"}
                    aria-label={L.reviewLabel}
                  />
                  <p className={'text-xs mt-1 text-slate-400 ' + (isRtl ? "text-start" : "text-end")}>
                    {L.charsLeft(MAX_REVIEW_CHARS - review.length)}
                  </p>
                </section>

                {/* ── Anonymous toggle ── */}
                <section>
                  <label className="flex items-center gap-3 cursor-pointer select-none group">
                    <div className="relative">
                      <input
                        type="checkbox"
                        checked={anonymous}
                        onChange={(e) => setAnonymous(e.target.checked)}
                        disabled={status === "submitting"}
                        className="sr-only"
                      />
                      <div
                        className={`
                          w-11 h-6 rounded-full transition-colors duration-200
                          ${anonymous ? "bg-amber-400" : "bg-slate-200 dark:bg-slate-700"}
                        '}
                      />
                      <div
                        className={'
                          absolute top-0.5 w-5 h-5 bg-white rounded-full shadow
     `}
                      />
                      <div
                        className={`
                          absolute top-0.5 w-5 h-5 bg-white rounded-full shadow
                          transition-transform duration-200
                          ${isRtl
                            ? anonymous ? "translate-x-[-22px]" : "translate-x-[-2px]"
                            : anonymous ? "translate-x-[22px]" : "translate-x-[2px]"}
                        '}
                      />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition">
                      {L.anonymous}
                    </span>
                  </label>
                </section>

                {/* ── Photo pro`}
                      />
                    </div>
                    <span className="text-sm text-slate-600 dark:text-slate-300 group-hover:text-slate-800 dark:group-hover:text-white transition">
                      {L.anonymous}
                    </span>
                  </label>
                </section>

                {/* ── Photo proof ── */}
                <section aria-label={L.photos}>
                  <p className="text-sm font-semibold text-slate-600 dark:text-slate-300 mb-2">
                    {L.photos}
                  </p>

                  {/* Photo list */}
                  {photos.length > 0 && (
                    <div className="flex flex-wrap gap-2 mb-3">
                      {photos.map((url, idx) => (
                        <div key={idx} className="relative group rounded-lg overflow-hidden w-20 h-20 border border-slate-200 dark:border-slate-700 bg-slate-100 dark:bg-slate-800">
                          <img
                            src={url}
                            alt={'proof-' + (idx)}
                            className="w-full h-full object-cover"
                            onError={(e) => { e.target.src = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80'%3E%3Crect width='80' height='80' fill='%23e2e8f0'/%3E%3Ctext x='50%25' y='50%25' dominant-baseline='middle' text-anchor='middle' fill='%2394a3b8' font-size='28'%3E🖼%3C/text%3E%3C/svg%3E"; }}
                          />
                          <button
                            type="button"
                            onClick={() => removePhoto(idx)}
                            disabled={status === "submitting"}
                            className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition flex items-center justify-center text-white text-xs font-medium"
                          >
                            {L.removePhoto}
                          </button>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Photo input */}
                  {photos.length < MAX_PHOTOS ? (
                    <div className="flex gap-2">
                      <input
                        type="url"
                        value={photoInput}
                        onChange={(e) => setPhotoInput(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && addPhoto()}
                        placeholder={L.photoPlaceholder}
                        disabled={status === "submitting"}
                        className={`
                          flex-1 min-w-0 px-3 py-2 rounded-lg border border-slate-200 dark:border-slate-700
                          bg-slate-50 dark:bg-slate-800 text-slate-800 dark:text-slate-100
                          text-sm placeholder:text-slate-400 dark:placeholder:text-slate-500
                          focus:outline-none focus:ring-2 focus:ring-amber-400 disabled:opacity-50
                        '}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={addPhoto}
                        disabled={!photoInput.trim() || status === "submitting"}
                        className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition disable`}
                        dir="ltr"
                      />
                      <button
                        type="button"
                        onClick={addPhoto}
                        disabled={!photoInput.trim() || status === "submitting"}
                        className="px-3 py-2 bg-amber-400 hover:bg-amber-500 text-white rounded-lg text-sm font-medium transition disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                      >
                        {L.addPhoto}
                      </button>
                    </div>
                  ) : (
                    <p className="text-xs text-slate-400 dark:text-slate-500">{L.maxPhotos}</p>
                  )}
                </section>
              </>
            )}
          </div>

          {/* ── Footer / Submit ── */}
          {status !== "success" && (
            <div className="px-6 py-4 border-t border-slate-100 dark:border-slate-800 bg-white dark:bg-slate-900 flex gap-3">
              {status === "error" && (
                <button
                  onClick={handleRetry}
                  className="flex-1 py-3 rounded-xl border-2 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 font-semibold text-sm hover:bg-slate-50 dark:hover:bg-slate-800 transition"
                >
                  {L.retry}
                </button>
              )}
              <button
                onClick={handleSubmit}
                disabled={!canSubmit}
                className={`
                  flex-1 py-3 rounded-xl font-bold text-sm transition-all duration-200
                  focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400
                  ${canSubmit
                    ? "bg-amber-400 hover:bg-amber-500 active:scale-95 text-white shadow-md shadow-amber-200 dark:shadow-amber-900"
                    : "bg-slate-100 dark:bg-slate-800 text-slate-400 dark:text-slate-600 cursor-not-allowed"}
                '}
              >
                {status === "submitting" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
    `}
              >
                {status === "submitting" ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
                    </svg>
                    {L.submitting}
                  </span>
                ) : L.submit}
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Toast */}
      {toast && (
        <Toast
          type={toast.type}
          title={toast.title}
          body={toast.body}
          onDismiss={() => setToast(null)}
        />
      )}
    </>
  );
}
