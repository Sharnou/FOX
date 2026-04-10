// SellerReviewResponseWidget.jsx
// Allows sellers to publicly respond to buyer reviews in the XTOX Arab marketplace
// AR/EN bilingual, RTL-first, Cairo/Tajawal fonts, Tailwind CSS only, localStorage-based

"use client";

import { useState, useEffect } from "react";

const t = {
  ar: {
    title: "ردود البائع على التقييمات",
    subtitle: "أجب على تقييمات المشترين علنياً لبناء الثقة",
    noReviews: "لا توجد تقييمات حتى الآن",
    yourResponse: "ردك العلني",
    writeResponse: "اكتب ردك هنا...",
    submitResponse: "نشر الرد",
    editResponse: "تعديل الرد",
    deleteResponse: "حذف الرد",
    responsePublished: "تم نشر ردك بنجاح ✓",
    responseDeleted: "تم حذف الرد",
    cancel: "إلغاء",
    save: "حفظ",
    verified: "مشترٍ موثق",
    ratingLabel: "التقييم",
    reviewDate: "تاريخ التقييم",
    sellerSays: "رد البائع",
    charCount: "حرفاً",
    maxChars: "الحد الأقصى 500 حرف",
    filterAll: "الكل",
    filterPending: "بدون رد",
    filterAnswered: "تم الرد",
    stars: ["★", "★★", "★★★", "★★★★", "★★★★★"],
    starLabels: ["ضعيف", "مقبول", "جيد", "جيد جداً", "ممتاز"],
  },
  en: {
    title: "Seller Review Responses",
    subtitle: "Respond publicly to buyer reviews to build trust",
    noReviews: "No reviews yet",
    yourResponse: "Your Public Response",
    writeResponse: "Write your response here...",
    submitResponse: "Publish Response",
    editResponse: "Edit Response",
    deleteResponse: "Delete Response",
    responsePublished: "Response published successfully ✓",
    responseDeleted: "Response deleted",
    cancel: "Cancel",
    save: "Save",
    verified: "Verified Buyer",
    ratingLabel: "Rating",
    reviewDate: "Review Date",
    sellerSays: "Seller's Reply",
    charCount: "chars",
    maxChars: "Max 500 characters",
    filterAll: "All",
    filterPending: "Unanswered",
    filterAnswered: "Answered",
    stars: ["★", "★★", "★★★", "★★★★", "★★★★★"],
    starLabels: ["Poor", "Fair", "Good", "Very Good", "Excellent"],
  },
};

const DEMO_REVIEWS = [
  {
    id: "r1",
    buyerName: "أحمد العمري",
    buyerAvatar: "أ",
    rating: 5,
    date: "2025-03-28",
    text: "البائع محترم جداً، التوصيل كان سريع والمنتج مطابق للوصف تماماً. سأتعامل معه مرة أخرى بكل تأكيد.",
    verified: true,
    adTitle: "آيفون 14 برو ماكس - 256GB",
  },
  {
    id: "r2",
    buyerName: "Sara K.",
    buyerAvatar: "S",
    rating: 3,
    date: "2025-03-20",
    text: "The product is okay but delivery took longer than expected. Communication could be better.",
    verified: true,
    adTitle: "Samsung Galaxy S23",
  },
  {
    id: "r3",
    buyerName: "محمد الخالدي",
    buyerAvatar: "م",
    rating: 4,
    date: "2025-03-15",
    text: "جيد جداً، المنتج سليم ومطابق. فقط الغلاف الخارجي كان فيه خدش صغير لم يذكره. لكن بشكل عام تجربة إيجابية.",
    verified: false,
    adTitle: "لابتوب ديل XPS 13",
  },
  {
    id: "r4",
    buyerName: "Fatima Al-Rashid",
    buyerAvatar: "F",
    rating: 2,
    date: "2025-03-10",
    text: "Not satisfied with the condition described. The item had more wear than mentioned.",
    verified: true,
    adTitle: "iPad Pro 11-inch",
  },
  {
    id: "r5",
    buyerName: "خالد المطيري",
    buyerAvatar: "خ",
    rating: 5,
    date: "2025-03-05",
    text: "بائع أمين وصادق، الجهاز بحالة ممتازة. شكراً جزيلاً على التعاون والسرعة في الرد.",
    verified: true,
    adTitle: "ماك بوك برو 2023",
  },
];

const STORAGE_KEY = "xtox_seller_responses";

function StarDisplay({ rating, lang }) {
  return (
    <span
      className="flex items-center gap-0.5"
      title={t[lang].starLabels[rating - 1]}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={s <= rating ? "text-amber-400" : "text-gray-300"}
          style={{ fontSize: "14px" }}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function ReviewCard({ review, lang, isRTL, onSubmitResponse, onDeleteResponse, responses }) {
  const [isEditing, setIsEditing] = useState(false);
  const [responseText, setResponseText] = useState(responses[review.id] || "");
  const [toast, setToast] = useState(null);
  const maxChars = 500;
  const existing = responses[review.id];

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(null), 2800);
  };

  const handleSubmit = () => {
    if (!responseText.trim()) return;
    onSubmitResponse(review.id, responseText.trim());
    setIsEditing(false);
    showToast(t[lang].responsePublished);
  };

  const handleDelete = () => {
    onDeleteResponse(review.id);
    setResponseText("");
    setIsEditing(false);
    showToast(t[lang].responseDeleted);
  };

  const ratingColor =
    review.rating >= 4
      ? "text-emerald-600 bg-emerald-50"
      : review.rating === 3
      ? "text-amber-600 bg-amber-50"
      : "text-red-500 bg-red-50";

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden transition-all duration-200 hover:shadow-md"
    >
      {/* Review header */}
      <div className="p-4 pb-3">
        <div className={`flex items-start gap-3 ${isRTL ? "flex-row" : "flex-row"}`}>
          {/* Avatar */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0 shadow-sm">
            {review.buyerAvatar}
          </div>

          <div className="flex-1 min-w-0">
            <div className={`flex items-center gap-2 flex-wrap ${isRTL ? "flex-row" : "flex-row"}`}>
              <span className="font-semibold text-gray-800 text-sm font-cairo">
                {review.buyerName}
              </span>
              {review.verified && (
                <span className="inline-flex items-center gap-0.5 text-xs text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full font-medium">
                  <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {t[lang].verified}
                </span>
              )}
            </div>

            <div className={`flex items-center gap-2 mt-0.5 flex-wrap`}>
              <StarDisplay rating={review.rating} lang={lang} />
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${ratingColor}`}>
                {t[lang].starLabels[review.rating - 1]}
              </span>
              <span className="text-xs text-gray-400">{review.date}</span>
            </div>

            <p className="text-xs text-indigo-500 mt-1 font-medium truncate">
              📦 {review.adTitle}
            </p>
          </div>
        </div>

        {/* Review text */}
        <p className="mt-3 text-sm text-gray-700 leading-relaxed font-tajawal">
          {review.text}
        </p>
      </div>

      {/* Existing Response or Editor */}
      <div className="border-t border-gray-50 bg-gray-50/60 px-4 py-3">
        {existing && !isEditing ? (
          <div>
            <div className={`flex items-center gap-1.5 mb-2 ${isRTL ? "flex-row" : "flex-row"}`}>
              <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
              <span className="text-xs font-semibold text-indigo-600 font-cairo">
                {t[lang].sellerSays}
              </span>
            </div>
            <p className="text-sm text-gray-600 leading-relaxed font-tajawal mb-3">
              {existing}
            </p>
            <div className={`flex gap-2 ${isRTL ? "flex-row" : "flex-row"}`}>
              <button
                onClick={() => { setResponseText(existing); setIsEditing(true); }}
                className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-indigo-200 text-indigo-600 font-medium hover:bg-indigo-50 transition-colors font-cairo"
              >
                ✏️ {t[lang].editResponse}
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 text-xs py-1.5 px-3 rounded-lg border border-red-200 text-red-500 font-medium hover:bg-red-50 transition-colors font-cairo"
              >
                🗑️ {t[lang].deleteResponse}
              </button>
            </div>
          </div>
        ) : (
          <div>
            {!isEditing && !existing ? (
              <button
                onClick={() => setIsEditing(true)}
                className="w-full text-xs py-2 px-3 rounded-lg border-2 border-dashed border-indigo-200 text-indigo-500 font-medium hover:bg-indigo-50 hover:border-indigo-300 transition-all font-cairo flex items-center justify-center gap-1.5"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                {t[lang].submitResponse}
              </button>
            ) : (
              <div>
                <div className={`flex items-center gap-1.5 mb-2 ${isRTL ? "flex-row" : "flex-row"}`}>
                  <svg className="w-4 h-4 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
                  </svg>
                  <span className="text-xs font-semibold text-indigo-600 font-cairo">
                    {t[lang].yourResponse}
                  </span>
                </div>
                <textarea
                  value={responseText}
                  onChange={(e) => setResponseText(e.target.value.slice(0, maxChars))}
                  placeholder={t[lang].writeResponse}
                  rows={3}
                  dir={isRTL ? "rtl" : "ltr"}
                  className="w-full text-sm border border-indigo-200 rounded-xl p-3 focus:outline-none focus:ring-2 focus:ring-indigo-300 resize-none text-gray-700 font-tajawal placeholder-gray-400 bg-white"
                />
                <div className={`flex items-center justify-between mt-1 mb-2 ${isRTL ? "flex-row" : "flex-row"}`}>
                  <span className="text-xs text-gray-400">
                    {responseText.length}/{maxChars} {t[lang].charCount}
                  </span>
                  <span className="text-xs text-gray-400">{t[lang].maxChars}</span>
                </div>
                <div className={`flex gap-2 ${isRTL ? "flex-row" : "flex-row"}`}>
                  <button
                    onClick={handleSubmit}
                    disabled={!responseText.trim()}
                    className="flex-1 text-xs py-2 px-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors font-cairo"
                  >
                    {t[lang].submitResponse}
                  </button>
                  <button
                    onClick={() => { setIsEditing(false); setResponseText(existing || ""); }}
                    className="text-xs py-2 px-3 rounded-lg border border-gray-200 text-gray-500 font-medium hover:bg-gray-100 transition-colors font-cairo"
                  >
                    {t[lang].cancel}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Toast notification */}
      {toast && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-gray-800 text-white text-xs px-4 py-2 rounded-full shadow-lg z-50 whitespace-nowrap font-cairo animate-pulse">
          {toast}
        </div>
      )}
    </div>
  );
}

export default function SellerReviewResponseWidget({ lang: propLang = "ar" }) {
  const [lang, setLang] = useState(propLang);
  const isRTL = lang === "ar";
  const [filter, setFilter] = useState("all");
  const [responses, setResponses] = useState({});
  const [globalToast, setGlobalToast] = useState(null);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) setResponses(JSON.parse(saved));
    } catch {}
  }, []);

  const persistResponses = (updated) => {
    setResponses(updated);
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
    } catch {}
  };

  const handleSubmitResponse = (reviewId, text) => {
    const updated = { ...responses, [reviewId]: text };
    persistResponses(updated);
    showGlobalToast(t[lang].responsePublished);
  };

  const handleDeleteResponse = (reviewId) => {
    const updated = { ...responses };
    delete updated[reviewId];
    persistResponses(updated);
    showGlobalToast(t[lang].responseDeleted);
  };

  const showGlobalToast = (msg) => {
    setGlobalToast(msg);
    setTimeout(() => setGlobalToast(null), 2500);
  };

  const filteredReviews = DEMO_REVIEWS.filter((r) => {
    if (filter === "pending") return !responses[r.id];
    if (filter === "answered") return !!responses[r.id];
    return true;
  });

  const answeredCount = DEMO_REVIEWS.filter((r) => responses[r.id]).length;
  const pendingCount = DEMO_REVIEWS.length - answeredCount;

  const avgRating =
    DEMO_REVIEWS.reduce((s, r) => s + r.rating, 0) / DEMO_REVIEWS.length;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className="relative max-w-2xl mx-auto p-4 font-cairo"
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Global Toast */}
      {globalToast && (
        <div
          className="fixed top-4 left-1/2 -translate-x-1/2 bg-indigo-700 text-white text-sm px-6 py-2.5 rounded-full shadow-xl z-[9999] font-cairo"
          style={{ animation: "fadeInDown 0.3s ease" }}
        >
          {globalToast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3">
        <div>
          <h2 className="text-xl font-bold text-gray-900 font-cairo leading-tight">
            {t[lang].title}
          </h2>
          <p className="text-sm text-gray-500 mt-0.5 font-tajawal">
            {t[lang].subtitle}
          </p>
        </div>
        {/* Lang toggle */}
        <button
          onClick={() => setLang(lang === "ar" ? "en" : "ar")}
          className="flex-shrink-0 text-xs px-3 py-1.5 rounded-full border border-indigo-200 text-indigo-600 font-semibold hover:bg-indigo-50 transition-colors"
        >
          {lang === "ar" ? "English" : "عربي"}
        </button>
      </div>

      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-3 mb-4">
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-indigo-600">{DEMO_REVIEWS.length}</div>
          <div className="text-xs text-gray-500 mt-0.5 font-tajawal">
            {t[lang].filterAll}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-emerald-500">{answeredCount}</div>
          <div className="text-xs text-gray-500 mt-0.5 font-tajawal">
            {t[lang].filterAnswered}
          </div>
        </div>
        <div className="bg-white rounded-xl p-3 text-center border border-gray-100 shadow-sm">
          <div className="text-2xl font-bold text-amber-500">{pendingCount}</div>
          <div className="text-xs text-gray-500 mt-0.5 font-tajawal">
            {t[lang].filterPending}
          </div>
        </div>
      </div>

      {/* Average Rating */}
      <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-2xl p-4 mb-4 flex items-center gap-3 border border-indigo-100">
        <div className="text-4xl font-extrabold text-indigo-700">
          {avgRating.toFixed(1)}
        </div>
        <div>
          <StarDisplay rating={Math.round(avgRating)} lang={lang} />
          <div className="text-xs text-gray-500 mt-0.5 font-tajawal">
            {t[lang].ratingLabel} — {DEMO_REVIEWS.length} {isRTL ? "تقييم" : "reviews"}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className={`flex gap-2 mb-4 ${isRTL ? "flex-row" : "flex-row"}`}>
        {["all", "pending", "answered"].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`flex-1 py-2 text-xs font-semibold rounded-xl transition-all font-cairo ${
              filter === f
                ? "bg-indigo-600 text-white shadow-sm"
                : "bg-white text-gray-500 border border-gray-200 hover:bg-gray-50"
            }`}
          >
            {t[lang][`filter${f.charAt(0).toUpperCase() + f.slice(1)}`]}
            {f === "pending" && pendingCount > 0 && (
              <span className={`ml-1 inline-block w-4 h-4 text-xs rounded-full leading-4 text-center ${filter === f ? "bg-white text-indigo-600" : "bg-amber-400 text-white"}`}>
                {pendingCount}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Reviews List */}
      {filteredReviews.length === 0 ? (
        <div className="text-center py-12 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-30" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
          </svg>
          <p className="text-sm font-tajawal">{t[lang].noReviews}</p>
        </div>
      ) : (
        <div className="space-y-3 relative">
          {filteredReviews.map((review) => (
            <ReviewCard
              key={review.id}
              review={review}
              lang={lang}
              isRTL={isRTL}
              responses={responses}
              onSubmitResponse={handleSubmitResponse}
              onDeleteResponse={handleDeleteResponse}
            />
          ))}
        </div>
      )}

      <style>{`
        @keyframes fadeInDown {
          from { opacity: 0; transform: translateX(-50%) translateY(-10px); }
          to { opacity: 1; transform: translateX(-50%) translateY(0); }
        }
        .font-cairo { font-family: 'Cairo', sans-serif; }
        .font-tajawal { font-family: 'Tajawal', sans-serif; }
      `}</style>
    </div>
  );
}
