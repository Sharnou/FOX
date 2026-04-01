"use client";
import { useState, useEffect, useRef, useCallback } from "react";

const REPORT_REASONS = [
  {
    id: "spam",
    ar: "إعلان مكرر أو بريد عشوائي",
    en: "Spam or duplicate listing",
    icon: "🚫",
  },
  {
    id: "fraud",
    ar: "احتيال أو نصب",
    en: "Fraud or scam",
    icon: "⚠️",
  },
  {
    id: "wrong_category",
    ar: "تصنيف خاطئ",
    en: "Wrong category",
    icon: "📂",
  },
  {
    id: "inappropriate",
    ar: "محتوى غير لائق أو مسيء",
    en: "Inappropriate or offensive content",
    icon: "🔞",
  },
  {
    id: "fake_price",
    ar: "سعر مضلل أو مزيف",
    en: "Misleading or fake price",
    icon: "💰",
  },
  {
    id: "already_sold",
    ar: "المنتج تم بيعه بالفعل",
    en: "Item already sold",
    icon: "✅",
  },
  {
    id: "other",
    ar: "سبب آخر",
    en: "Other reason",
    icon: "📝",
  },
];

const i18n = {
  ar: {
    title: "الإبلاغ عن الإعلان",
    subtitle: "ساعدنا في الحفاظ على جودة المنصة",
    selectReason: "اختر سبب الإبلاغ *",
    additionalDetails: "تفاصيل إضافية (اختياري)",
    placeholder: "اكتب تفاصيل إضافية هنا...",
    submit: "إرسال البلاغ",
    cancel: "إلغاء",
    submitting: "جاري الإرسال...",
    successTitle: "تم إرسال البلاغ",
    successMsg: "شكراً! سيراجع فريقنا هذا الإعلان قريباً.",
    errorMsg: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    required: "يرجى اختيار سبب الإبلاغ",
    charCount: "حرف",
    close: "إغلاق",
    reportAd: "الإبلاغ عن إعلان",
  },
  en: {
    title: "Report this Ad",
    subtitle: "Help us keep the platform safe",
    selectReason: "Select a reason *",
    additionalDetails: "Additional details (optional)",
    placeholder: "Write additional details here...",
    submit: "Submit Report",
    cancel: "Cancel",
    submitting: "Submitting...",
    successTitle: "Report Submitted",
    successMsg: "Thank you! Our team will review this ad shortly.",
    errorMsg: "An error occurred. Please try again.",
    required: "Please select a reason for reporting",
    charCount: "characters",
    close: "Close",
    reportAd: "Report Ad",
  },
};

export default function ReportAd({ adId, adTitle, onClose, lang = "ar" }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const modalRef = useRef(null);
  const firstFocusRef = useRef(null);
  const isRTL = lang === "ar";
  const t = i18n[lang] || i18n.ar;
  const MAX_CHARS = 500;

  // Trap focus inside modal
  useEffect(() => {
    const el = firstFocusRef.current;
    if (el) el.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        if (e.shiftKey && document.activeElement === first) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, [onClose]);

  // Prevent body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, []);

  const handleSubmit = useCallback(async () => {
    setTouched(true);
    if (!selectedReason) {
      setError(t.required);
      return;
    }
    setError("");
    setStatus("submitting");
    try {
      const response = await fetch("/api/reports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          adId,
          reason: selectedReason,
          details: details.trim(),
          lang,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Server error");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [adId, selectedReason, details, lang, t]);

  const handleReasonSelect = (id) => {
    setSelectedReason(id);
    if (touched) setError("");
  };

  const overlayClick = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={overlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="report-modal-title"
      dir={isRTL ? "rtl" : "ltr"}
    >
      <div
        ref={modalRef}
        className="relative w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl shadow-2xl"
        style={{ backgroundColor: "#fff" }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="sticky top-0 z-10 flex items-center justify-between px-5 py-4 border-b"
          style={{
            background: "linear-gradient(135deg, #ff5722 0%, #ff7043 100%)",
            borderRadius: "1rem 1rem 0 0",
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 22 }}>🚨</span>
            <div>
              <h2
                id="report-modal-title"
                className="text-white font-bold text-base leading-tight"
              >
                {t.title}
              </h2>
              <p className="text-white/80 text-xs mt-0.5">{t.subtitle}</p>
            </div>
          </div>
          <button
            ref={firstFocusRef}
            onClick={onClose}
            aria-label={t.close}
            className="text-white/80 hover:text-white hover:bg-white/20 rounded-full p-1.5 transition-all focus:outline-none focus:ring-2 focus:ring-white/50"
            style={{ lineHeight: 1 }}
          >
            <svg width="18" height="18" fill="none" viewBox="0 0 24 24">
              <path
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
                d="M18 6L6 18M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Ad title chip */}
        {adTitle && status !== "success" && (
          <div className="px-5 pt-4">
            <div
              className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: "#fff3e0", color: "#e65100" }}
            >
              <span>📋</span>
              <span
                className="truncate font-medium"
                style={{ maxWidth: "calc(100% - 2rem)" }}
              >
                {adTitle}
              </span>
            </div>
          </div>
        )}

        {/* Content */}
        <div className="px-5 pb-5 pt-4">
          {status === "success" ? (
            <SuccessState t={t} onClose={onClose} />
          ) : status === "error" ? (
            <ErrorState t={t} onRetry={() => setStatus("idle")} onClose={onClose} />
          ) : (
            <>
              {/* Reason selection */}
              <fieldset>
                <legend className="text-sm font-semibold text-gray-700 mb-3">
                  {t.selectReason}
                </legend>
                <div className="space-y-2">
                  {REPORT_REASONS.map((reason) => {
                    const isSelected = selectedReason === reason.id;
                    return (
                      <button
                        key={reason.id}
                        type="button"
                        onClick={() => handleReasonSelect(reason.id)}
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-start focus:outline-none focus:ring-2 focus:ring-orange-300"
                        style={{
                          borderColor: isSelected ? "#ff5722" : "#e5e7eb",
                          backgroundColor: isSelected ? "#fff3e0" : "#fafafa",
                          color: isSelected ? "#bf360c" : "#374151",
                        }}
                        aria-pressed={isSelected}
                      >
                        <span style={{ fontSize: 18, minWidth: 24 }}>{reason.icon}</span>
                        <span className="flex-1 text-sm font-medium">
                          {lang === "ar" ? reason.ar : reason.en}
                        </span>
                        {isSelected && (
                          <span style={{ color: "#ff5722" }}>
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                              <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
                            </svg>
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
                {touched && error && (
                  <p className="mt-2 text-xs font-medium" style={{ color: "#d32f2f" }}>
                    ⚠ {error}
                  </p>
                )}
              </fieldset>

              {/* Details textarea */}
              <div className="mt-4">
                <label
                  htmlFor="report-details"
                  className="text-sm font-semibold text-gray-700 block mb-1.5"
                >
                  {t.additionalDetails}
                </label>
                <textarea
                  id="report-details"
                  value={details}
                  onChange={(e) =>
                    e.target.value.length <= MAX_CHARS && setDetails(e.target.value)
                  }
                  placeholder={t.placeholder}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-orange-400 transition-all"
                  style={{ color: "#374151", backgroundColor: "#fafafa" }}
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <div
                  className="text-xs mt-1 text-end"
                  style={{ color: details.length > MAX_CHARS * 0.8 ? "#e65100" : "#9ca3af" }}
                >
                  {details.length}/{MAX_CHARS} {t.charCount}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3 mt-5">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all focus:outline-none focus:ring-2 focus:ring-gray-300"
                >
                  {t.cancel}
                </button>
                <button
                  type="button"
                  onClick={handleSubmit}
                  disabled={status === "submitting"}
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-orange-400 disabled:opacity-60"
                  style={{
                    background:
                      status === "submitting"
                        ? "#ffb74d"
                        : "linear-gradient(135deg, #ff5722 0%, #ff7043 100%)",
                    boxShadow:
                      status !== "submitting"
                        ? "0 4px 12px rgba(255,87,34,0.35)"
                        : "none",
                  }}
                >
                  {status === "submitting" ? (
                    <span className="flex items-center justify-center gap-2">
                      <Spinner />
                      {t.submitting}
                    </span>
                  ) : (
                    t.submit
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function SuccessState({ t, onClose }) {
  return (
    <div className="text-center py-6">
      <div
        className="mx-auto mb-4 flex items-center justify-center rounded-full"
        style={{
          width: 72,
          height: 72,
          background: "linear-gradient(135deg, #43a047, #66bb6a)",
        }}
      >
        <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
          <path
            stroke="#fff"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 13l4 4L19 7"
          />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{t.successTitle}</h3>
      <p className="text-sm text-gray-500 mb-6">{t.successMsg}</p>
      <button
        onClick={onClose}
        className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-green-400"
        style={{
          background: "linear-gradient(135deg, #43a047, #66bb6a)",
          boxShadow: "0 4px 12px rgba(67,160,71,0.35)",
        }}
      >
        {t.close}
      </button>
    </div>
  );
}

function ErrorState({ t, onRetry, onClose }) {
  return (
    <div className="text-center py-6">
      <div
        className="mx-auto mb-4 flex items-center justify-center rounded-full"
        style={{ width: 72, height: 72, backgroundColor: "#ffebee" }}
      >
        <span style={{ fontSize: 36 }}>❌</span>
      </div>
      <p className="text-sm text-gray-600 mb-6">{t.errorMsg}</p>
      <div className="flex gap-3 justify-center">
        <button
          onClick={onClose}
          className="px-5 py-2.5 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-all focus:outline-none"
        >
          {t.cancel}
        </button>
        <button
          onClick={onRetry}
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-orange-400"
          style={{
            background: "linear-gradient(135deg, #ff5722 0%, #ff7043 100%)",
          }}
        >
          {t.submit}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg
      className="animate-spin"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        strokeWidth="3"
        strokeOpacity="0.25"
      />
      <path
        d="M12 2a10 10 0 0110 10"
        stroke="currentColor"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}
