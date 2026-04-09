"use client";
import { useState } from "react";

const translations = {
  ar: {
    wizard_title: "أضف إعلانك في خطوات بسيطة",
    step_category: "الفئة",
    step_details: "التفاصيل",
    step_price: "السعر",
    step_location: "الموقع",
    step_photos: "الصور",
    step_review: "المراجعة",
    next: "التالي",
    back: "السابق",
    publish: "نشر الإعلان",
    select_category: "اختر الفئة",
    ad_title: "عنوان الإعلان",
    ad_description: "وصف الإعلان",
    price: "السعر",
    currency: "ريال",
    negotiable: "قابل للتفاوض",
    condition_new: "جديد",
    condition_used: "مستعمل",
    condition_broken: "للقطع",
    city: "المدينة",
    district: "الحي",
    add_photos: "أضف صوراً",
    review_title: "مراجعة إعلانك",
    step_of: "خطوة {current} من {total}",
    categories: {
      electronics: "إلكترونيات",
      cars: "سيارات",
      real_estate: "عقارات",
      furniture: "أثاث",
      clothing: "ملابس",
      services: "خدمات",
      jobs: "وظائف",
      other: "أخرى",
    },
    cities: ["الرياض", "جدة", "مكة المكرمة", "المدينة المنورة", "الدمام", "القاهرة", "دبي", "بغداد"],
    title_placeholder: "مثال: آيفون 14 برو ماكس للبيع",
    desc_placeholder: "صف إعلانك بالتفصيل...",
    draft_saved: "تم حفظ المسودة تلقائياً ✓",
    required: "هذا الحقل مطلوب",
    published: "تم نشر إعلانك بنجاح!",
    optional_photos: "يمكنك إضافة حتى 6 صور (اختياري)",
    main_photo: "الرئيسية",
  },
  en: {
    wizard_title: "Post Your Ad in Simple Steps",
    step_category: "Category",
    step_details: "Details",
    step_price: "Price",
    step_location: "Location",
    step_photos: "Photos",
    step_review: "Review",
    next: "Next",
    back: "Back",
    publish: "Publish Ad",
    select_category: "Select Category",
    ad_title: "Ad Title",
    ad_description: "Ad Description",
    price: "Price",
    currency: "SAR",
    negotiable: "Negotiable",
    condition_new: "New",
    condition_used: "Used",
    condition_broken: "For Parts",
    city: "City",
    district: "District",
    add_photos: "Add Photos",
    review_title: "Review Your Ad",
    step_of: "Step {current} of {total}",
    categories: {
      electronics: "Electronics",
      cars: "Cars",
      real_estate: "Real Estate",
      furniture: "Furniture",
      clothing: "Clothing",
      services: "Services",
      jobs: "Jobs",
      other: "Other",
    },
    cities: ["Riyadh", "Jeddah", "Mecca", "Medina", "Dammam", "Cairo", "Dubai", "Baghdad"],
    title_placeholder: "e.g. iPhone 14 Pro Max for sale",
    desc_placeholder: "Describe your ad in detail...",
    draft_saved: "Draft saved automatically ✓",
    required: "This field is required",
    published: "Your ad has been published!",
    optional_photos: "You can add up to 6 photos (optional)",
    main_photo: "Main",
  },
  de: {
    wizard_title: "Anzeige in einfachen Schritten aufgeben",
    step_category: "Kategorie",
    step_details: "Details",
    step_price: "Preis",
    step_location: "Standort",
    step_photos: "Fotos",
    step_review: "Überprüfung",
    next: "Weiter",
    back: "Zurück",
    publish: "Anzeige veröffentlichen",
    select_category: "Kategorie wählen",
    ad_title: "Anzeigentitel",
    ad_description: "Anzeigenbeschreibung",
    price: "Preis",
    currency: "SAR",
    negotiable: "Verhandelbar",
    condition_new: "Neu",
    condition_used: "Gebraucht",
    condition_broken: "Für Teile",
    city: "Stadt",
    district: "Bezirk",
    add_photos: "Fotos hinzufügen",
    review_title: "Ihre Anzeige überprüfen",
    step_of: "Schritt {current} von {total}",
    categories: {
      electronics: "Elektronik",
      cars: "Autos",
      real_estate: "Immobilien",
      furniture: "Möbel",
      clothing: "Kleidung",
      services: "Dienstleistungen",
      jobs: "Jobs",
      other: "Sonstiges",
    },
    cities: ["Riad", "Dschidda", "Mekka", "Medina", "Dammam", "Kairo", "Dubai", "Bagdad"],
    title_placeholder: "z.B. iPhone 14 Pro Max zu verkaufen",
    desc_placeholder: "Beschreiben Sie Ihre Anzeige...",
    draft_saved: "Entwurf automatisch gespeichert ✓",
    required: "Dieses Feld ist erforderlich",
    published: "Ihre Anzeige wurde veröffentlicht!",
    optional_photos: "Sie können bis zu 6 Fotos hinzufügen (optional)",
    main_photo: "Haupt",
  },
};

const CATEGORY_ICONS = {
  electronics: "📱",
  cars: "🚗",
  real_estate: "🏠",
  furniture: "🪑",
  clothing: "👕",
  services: "🔧",
  jobs: "💼",
  other: "📦",
};

const TOTAL_STEPS = 6;
const FONT = "Cairo, Tajawal, sans-serif";

export default function MultiStepAdWizard({ lang = "ar", onClose }) {
  const t = translations[lang] || translations.ar;
  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  const [step, setStep] = useState(1);
  const [published, setPublished] = useState(false);
  const [errors, setErrors] = useState({});
  const [draftSaved, setDraftSaved] = useState(false);
  const [form, setForm] = useState({
    category: "",
    title: "",
    description: "",
    price: "",
    negotiable: false,
    condition: "used",
    city: "",
    district: "",
    photos: [],
  });

  const update = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => ({ ...prev, [key]: null }));
    setDraftSaved(false);
    setTimeout(() => {
      setDraftSaved(true);
      setTimeout(() => setDraftSaved(false), 2200);
    }, 600);
  };

  const validate = () => {
    const e = {};
    if (step === 1 && !form.category) e.category = t.required;
    if (step === 2) {
      if (!form.title.trim()) e.title = t.required;
      if (!form.description.trim()) e.description = t.required;
    }
    if (step === 3 && !form.price) e.price = t.required;
    if (step === 4 && !form.city) e.city = t.required;
    setErrors(e);
    return !Object.keys(e).length;
  };

  const next = () => { if (validate()) setStep((s) => Math.min(s + 1, TOTAL_STEPS)); };
  const back = () => setStep((s) => Math.max(s - 1, 1));
  const publish = () => { if (validate()) setPublished(true); };

  const stepLabels = [t.step_category, t.step_details, t.step_price, t.step_location, t.step_photos, t.step_review];

  if (published) {
    return (
      <div dir={dir} className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
        <div className="bg-white rounded-2xl p-10 max-w-xs w-full text-center shadow-2xl animate-bounce-once">
          <div className="text-7xl mb-4">🎉</div>
          <p className="text-xl font-bold text-green-600" style={{ fontFamily: FONT }}>
            {t.published}
          </p>
          <button
            onClick={onClose}
            className="mt-6 px-10 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors shadow"
            style={{ fontFamily: FONT }}
          >
            ✓
          </button>
        </div>
      </div>
    );
  }

  return (
    <div dir={dir} className="fixed inset-0 bg-black/60 flex items-end sm:items-center justify-center z-50 p-0 sm:p-4">
      <link
        href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap"
        rel="stylesheet"
      />
      <div className="bg-white rounded-t-3xl sm:rounded-2xl w-full sm:max-w-lg shadow-2xl overflow-hidden max-h-[96vh] flex flex-col">

        {/* Header */}
        <div className="bg-gradient-to-r from-orange-500 to-orange-600 px-5 py-4 flex items-start justify-between">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight" style={{ fontFamily: FONT }}>
              {t.wizard_title}
            </h2>
            <p className="text-orange-100 text-xs mt-0.5" style={{ fontFamily: FONT }}>
              {t.step_of.replace("{current}", step).replace("{total}", TOTAL_STEPS)}
            </p>
          </div>
          {onClose && (
            <button onClick={onClose} className="text-white/80 hover:text-white text-3xl leading-none mt-0.5">
              ×
            </button>
          )}
        </div>

        {/* Step progress bar */}
        <div className="px-5 pt-3 pb-2 bg-white">
          <div className="flex gap-1">
            {stepLabels.map((label, i) => (
              <div key={i} className="flex-1">
                <div
                  className={`h-1.5 rounded-full transition-all duration-400 ${
                    i + 1 < step ? "bg-green-500" : i + 1 === step ? "bg-orange-500" : "bg-gray-200"
                  }`}
                />
                <p
                  className={`text-center text-[9px] mt-0.5 hidden sm:block truncate ${
                    i + 1 === step ? "text-orange-600 font-bold" : "text-gray-400"
                  }`}
                  style={{ fontFamily: FONT }}
                >
                  {label}
                </p>
              </div>
            ))}
          </div>
          {draftSaved && (
            <p className="text-xs text-green-500 mt-1 text-center" style={{ fontFamily: FONT }}>
              {t.draft_saved}
            </p>
          )}
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-4">

          {/* Step 1 — Category */}
          {step === 1 && (
            <div>
              <p className="font-semibold text-gray-700 mb-3" style={{ fontFamily: FONT }}>
                {t.select_category}
              </p>
              <div className="grid grid-cols-4 gap-2">
                {Object.entries(CATEGORY_ICONS).map(([key, icon]) => (
                  <button
                    key={key}
                    onClick={() => update("category", key)}
                    className={`flex flex-col items-center gap-1 p-3 rounded-xl border-2 transition-all active:scale-95 ${
                      form.category === key
                        ? "border-orange-500 bg-orange-50 shadow-sm"
                        : "border-gray-200 hover:border-orange-300"
                    }`}
                  >
                    <span className="text-2xl">{icon}</span>
                    <span
                      className="text-[10px] text-gray-600 leading-tight text-center"
                      style={{ fontFamily: FONT }}
                    >
                      {t.categories[key]}
                    </span>
                  </button>
                ))}
              </div>
              {errors.category && (
                <p className="text-red-500 text-xs mt-2" style={{ fontFamily: FONT }}>
                  ⚠ {errors.category}
                </p>
              )}
            </div>
          )}

          {/* Step 2 — Details */}
          {step === 2 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1" style={{ fontFamily: FONT }}>
                  {t.ad_title} *
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => update("title", e.target.value)}
                  placeholder={t.title_placeholder}
                  maxLength={100}
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 transition-colors ${
                    errors.title ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                  style={{ fontFamily: FONT, direction: "rtl" }}
                />
                <p className="text-xs text-gray-400 mt-0.5 text-end">{form.title.length}/100</p>
                {errors.title && (
                  <p className="text-red-500 text-xs" style={{ fontFamily: FONT }}>
                    ⚠ {errors.title}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1" style={{ fontFamily: FONT }}>
                  {t.ad_description} *
                </label>
                <textarea
                  value={form.description}
                  onChange={(e) => update("description", e.target.value)}
                  placeholder={t.desc_placeholder}
                  rows={5}
                  maxLength={2000}
                  className={`w-full border-2 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 resize-none transition-colors ${
                    errors.description ? "border-red-400 bg-red-50" : "border-gray-200"
                  }`}
                  style={{ fontFamily: FONT, direction: "rtl" }}
                />
                <p className="text-xs text-gray-400 text-end">{form.description.length}/2000</p>
                {errors.description && (
                  <p className="text-red-500 text-xs" style={{ fontFamily: FONT }}>
                    ⚠ {errors.description}
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Step 3 — Price */}
          {step === 3 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1" style={{ fontFamily: FONT }}>
                  {t.price} *
                </label>
                <div className="flex gap-2 items-stretch">
                  <input
                    type="number"
                    value={form.price}
                    onChange={(e) => update("price", e.target.value)}
                    min={0}
                    className={`flex-1 border-2 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400 transition-colors ${
                      errors.price ? "border-red-400 bg-red-50" : "border-gray-200"
                    }`}
                    style={{ fontFamily: FONT }}
                  />
                  <span
                    className="flex items-center px-4 bg-gray-100 rounded-xl text-sm font-bold text-gray-600 border-2 border-gray-200"
                    style={{ fontFamily: FONT }}
                  >
                    {t.currency}
                  </span>
                </div>
                {errors.price && (
                  <p className="text-red-500 text-xs mt-1" style={{ fontFamily: FONT }}>
                    ⚠ {errors.price}
                  </p>
                )}
              </div>
              <label className="flex items-center gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={form.negotiable}
                  onChange={(e) => update("negotiable", e.target.checked)}
                  className="w-5 h-5 accent-orange-500 rounded cursor-pointer"
                />
                <span className="text-sm font-medium text-gray-700" style={{ fontFamily: FONT }}>
                  {t.negotiable}
                </span>
              </label>
              <div>
                <p className="text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: FONT }}>
                  {lang === "ar" ? "الحالة" : lang === "de" ? "Zustand" : "Condition"}
                </p>
                <div className="flex gap-2">
                  {["new", "used", "broken"].map((c) => (
                    <button
                      key={c}
                      onClick={() => update("condition", c)}
                      className={`flex-1 py-3 rounded-xl text-sm font-semibold border-2 transition-colors ${
                        form.condition === c
                          ? "border-orange-500 bg-orange-50 text-orange-600"
                          : "border-gray-200 text-gray-600 hover:border-orange-300"
                      }`}
                      style={{ fontFamily: FONT }}
                    >
                      {t[`condition_${c}`]}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Step 4 — Location */}
          {step === 4 && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2" style={{ fontFamily: FONT }}>
                  {t.city} *
                </label>
                <div className="grid grid-cols-2 gap-2">
                  {t.cities.map((city) => (
                    <button
                      key={city}
                      onClick={() => update("city", city)}
                      className={`py-2.5 px-3 rounded-xl text-sm border-2 transition-colors text-start ${
                        form.city === city
                          ? "border-orange-500 bg-orange-50 text-orange-700 font-bold"
                          : "border-gray-200 text-gray-600 hover:border-orange-300"
                      }`}
                      style={{ fontFamily: FONT }}
                    >
                      {form.city === city ? "✓ " : ""}{city}
                    </button>
                  ))}
                </div>
                {errors.city && (
                  <p className="text-red-500 text-xs mt-1" style={{ fontFamily: FONT }}>
                    ⚠ {errors.city}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1" style={{ fontFamily: FONT }}>
                  {t.district}
                </label>
                <input
                  type="text"
                  value={form.district}
                  onChange={(e) => update("district", e.target.value)}
                  className="w-full border-2 border-gray-200 rounded-xl px-4 py-3 text-sm focus:outline-none focus:border-orange-400"
                  style={{ fontFamily: FONT, direction: "rtl" }}
                />
              </div>
            </div>
          )}

          {/* Step 5 — Photos */}
          {step === 5 && (
            <div>
              <p className="text-sm font-semibold text-gray-700 mb-3" style={{ fontFamily: FONT }}>
                {t.add_photos}
              </p>
              <div className="grid grid-cols-3 gap-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div
                    key={i}
                    className="aspect-square rounded-xl border-2 border-dashed border-gray-300 hover:border-orange-400 flex flex-col items-center justify-center cursor-pointer transition-colors bg-gray-50 hover:bg-orange-50"
                  >
                    <span className="text-3xl text-gray-300">+</span>
                    {i === 0 && (
                      <span className="text-[10px] text-gray-400 mt-1" style={{ fontFamily: FONT }}>
                        {t.main_photo}
                      </span>
                    )}
                  </div>
                ))}
              </div>
              <p className="text-xs text-gray-400 mt-3 text-center" style={{ fontFamily: FONT }}>
                {t.optional_photos}
              </p>
            </div>
          )}

          {/* Step 6 — Review */}
          {step === 6 && (
            <div>
              <p className="font-bold text-gray-800 mb-3" style={{ fontFamily: FONT }}>
                {t.review_title}
              </p>
              <div className="rounded-xl border border-gray-200 overflow-hidden">
                {[
                  { label: t.step_category, value: t.categories[form.category] || "—" },
                  { label: t.ad_title, value: form.title || "—" },
                  {
                    label: t.price,
                    value: form.price
                      ? `${form.price} ${t.currency}${form.negotiable ? ` (${t.negotiable})` : ""}`
                      : "—",
                  },
                  { label: t.city, value: [form.city, form.district].filter(Boolean).join("، ") || "—" },
                  {
                    label: lang === "ar" ? "الحالة" : lang === "de" ? "Zustand" : "Condition",
                    value: t[`condition_${form.condition}`],
                  },
                ].map(({ label, value }, idx) => (
                  <div
                    key={idx}
                    className={`flex justify-between items-center px-4 py-3 ${
                      idx % 2 === 0 ? "bg-white" : "bg-gray-50"
                    }`}
                  >
                    <span className="text-sm text-gray-500" style={{ fontFamily: FONT }}>
                      {label}
                    </span>
                    <span className="text-sm font-semibold text-gray-800 text-end max-w-[60%]" style={{ fontFamily: FONT }}>
                      {value}
                    </span>
                  </div>
                ))}
              </div>
              <div className="mt-3 p-3 bg-green-50 rounded-xl border border-green-200">
                <p className="text-xs text-green-700 text-center" style={{ fontFamily: FONT }}>
                  {lang === "ar"
                    ? "✓ إعلانك جاهز للنشر! راجع التفاصيل أعلاه ثم اضغط نشر."
                    : lang === "de"
                    ? "✓ Ihre Anzeige ist bereit. Überprüfen Sie die Details und klicken Sie auf Veröffentlichen."
                    : "✓ Your ad is ready! Review the details above then click Publish."}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-5 py-4 bg-gray-50 border-t border-gray-100 flex gap-3">
          {step > 1 && (
            <button
              onClick={back}
              className="flex-1 py-3 rounded-xl border-2 border-gray-300 text-gray-600 font-bold text-sm hover:bg-gray-100 transition-colors"
              style={{ fontFamily: FONT }}
            >
              {isRTL ? "→ " : "← "}{t.back}
            </button>
          )}
          {step < TOTAL_STEPS ? (
            <button
              onClick={next}
              className="flex-1 py-3 rounded-xl bg-orange-500 text-white font-bold text-sm hover:bg-orange-600 transition-colors shadow-md active:scale-95"
              style={{ fontFamily: FONT }}
            >
              {t.next}{isRTL ? " ←" : " →"}
            </button>
          ) : (
            <button
              onClick={publish}
              className="flex-1 py-3 rounded-xl bg-green-500 text-white font-bold text-sm hover:bg-green-600 transition-colors shadow-md active:scale-95"
              style={{ fontFamily: FONT }}
            >
              🚀 {t.publish}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
