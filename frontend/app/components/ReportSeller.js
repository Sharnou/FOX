"use client";
import { useState, useEffect, useRef, useCallback } from "react";

// Module-level to avoid TDZ after SWC minification
const MAX_CHARS = 500;


const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const REPORT_REASONS = [
  { id: "spam",          ar: "بريد مزعج",      en: "Spam",              icon: "🚫" },
  { id: "scammer",       ar: "نصاب / محتال",    en: "Scammer / Fraud",   icon: "⚠️" },
  { id: "fake_identity", ar: "هوية مزيفة",      en: "Fake Identity",     icon: "🎭" },
  { id: "rude_behavior", ar: "سلوك مسيء",       en: "Rude Behavior",     icon: "😡" },
  { id: "wrong_country", ar: "دولة خاطئة",      en: "Wrong Country",     icon: "🌍" },
  { id: "other",         ar: "أخرى",             en: "Other",             icon: "📝" },
];

const i18n = {
  ar: {
    title: "الإبلاغ عن البائع",
    subtitle: "ساعدنا في الحفاظ على مجتمع آمن",
    selectReason: "اختر سبب الإبلاغ *",
    additionalDetails: "تفاصيل إضافية (اختياري)",
    placeholder: "اكتب تفاصيل إضافية هنا...",
    submit: "إرسال البلاغ",
    cancel: "إلغاء",
    submitting: "جاري الإرسال...",
    successTitle: "تم إرسال البلاغ",
    successMsg: "شكراً! سيراجع فريقنا هذا البلاغ قريباً.",
    errorMsg: "حدث خطأ. يرجى المحاولة مرة أخرى.",
    required: "يرجى اختيار سبب الإبلاغ",
    charCount: "حرف",
    close: "إغلاق",
  },
  en: {
    title: "Report Seller",
    subtitle: "Help us keep the community safe",
    selectReason: "Select a reason *",
    additionalDetails: "Additional details (optional)",
    placeholder: "Write additional details here...",
    submit: "Submit Report",
    cancel: "Cancel",
    submitting: "Submitting...",
    successTitle: "Report Submitted",
    successMsg: "Thank you! Our team will review this report shortly.",
    errorMsg: "An error occurred. Please try again.",
    required: "Please select a reason for reporting",
    charCount: "characters",
    close: "Close",
  },
};

export default function ReportSeller({ sellerId, sellerName, onClose, lang = "ar" }) {
  const [selectedReason, setSelectedReason] = useState("");
  const [details, setDetails] = useState("");
  const [status, setStatus] = useState("idle"); // idle | submitting | success | error
  const [error, setError] = useState("");
  const [touched, setTouched] = useState(false);
  const modalRef = useRef(null);
  const firstFocusRef = useRef(null);
  const isRTL = lang === "ar";
  const t = i18n[lang] || i18n.ar;
  // MAX_CHARS moved to module level to avoid TDZ

  // Focus trap + ESC handler
  useEffect(() => {
    const el = firstFocusRef.current;
    if (el) el.focus();
    const handleKey = (e) => {
      if (e.key === "Escape") onClose?.();
      if (e.key === "Tab" && modalRef.current) {
        const focusable = modalRef.current.querySelectorAll(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
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

  // Prevent body scroll when modal open
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = ""; };
  }, []);

  const handleSubmit = useCallback(async () => {
    setTouched(true);
    if (!selectedReason) { setError(t.required); return; }
    setError("");
    setStatus("submitting");
    try {
      const response = await fetch(API_BASE + '/api/reports', {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sellerId,
          sellerName,
          reason: selectedReason,
          details: details.trim(),
          type: "seller",
          lang,
          timestamp: new Date().toISOString(),
        }),
      });
      if (!response.ok) throw new Error("Server error");
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }, [sellerId, sellerName, selectedReason, details, lang, t]);

  const handleReasonSelect = (id) => {
    setSelectedReason(id);
    if (touched) setError("");
  };

  const overlayClick = (e) => { if (e.target === e.currentTarget) onClose?.(); };

  return (
    <div
      className="fixed inset-0 z-[999] flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.55)", backdropFilter: "blur(2px)" }}
      onClick={overlayClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="report-seller-modal-title"
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
            background: "linear-gradient(135deg, #c62828 0%, #e53935 100%)",
            borderRadius: "1rem 1rem 0 0",
          }}
        >
          <div className="flex items-center gap-2">
            <span style={{ fontSize: 22 }}>🚨</span>
            <div>
              <h2
                id="report-seller-modal-title"
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
              <path stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Seller name chip */}
        {sellerName && status !== "success" && (
          <div className="px-5 pt-4">
            <div
              className="flex items-center gap-2 text-sm rounded-lg px-3 py-2"
              style={{ backgroundColor: "#fce4ec", color: "#b71c1c" }}
            >
              <span>👤</span>
              <span className="truncate font-medium" style={{ maxWidth: "calc(100% - 2rem)" }}>
                {sellerName}
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
                        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl border-2 transition-all text-start focus:outline-none focus:ring-2 focus:ring-red-300"
                        style={{
                          borderColor: isSelected ? "#c62828" : "#e5e7eb",
                          backgroundColor: isSelected ? "#fce4ec" : "#fafafa",
                          color: isSelected ? "#b71c1c" : "#374151",
                        }}
                        aria-pressed={isSelected}
                      >
                        <span style={{ fontSize: 18, minWidth: 24 }}>{reason.icon}</span>
                        <span className="flex-1 text-sm font-medium">
                          {lang === "ar" ? reason.ar : reason.en}
                        </span>
                        {isSelected && (
                          <span style={{ color: "#c62828" }}>
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
                  htmlFor="report-seller-details"
                  className="text-sm font-semibold text-gray-700 block mb-1.5"
                >
                  {t.additionalDetails}
                </label>
                <textarea
                  id="report-seller-details"
                  value={details}
                  onChange={(e) =>
                    e.target.value.length <= MAX_CHARS && setDetails(e.target.value)
                  }
                  placeholder={t.placeholder}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-gray-200 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-red-400 transition-all"
                  style={{ color: "#374151", backgroundColor: "#fafafa" }}
                  dir={isRTL ? "rtl" : "ltr"}
                />
                <div
                  className="text-xs mt-1 text-end"
                  style={{ color: details.length > MAX_CHARS * 0.8 ? "#b71c1c" : "#9ca3af" }}
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
                  className="flex-1 py-2.5 rounded-xl text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-red-400 disabled:opacity-60"
                  style={{
                    background:
                      status === "submitting"
                        ? "#ef9a9a"
                        : "linear-gradient(135deg, #c62828 0%, #e53935 100%)",
                    boxShadow:
                      status !== "submitting"
                        ? "0 4px 12px rgba(198,40,40,0.35)"
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
        style={{ width: 72, height: 72, background: "linear-gradient(135deg, #43a047, #66bb6a)" }}
      >
        <svg width="36" height="36" fill="none" viewBox="0 0 24 24">
          <path stroke="#fff" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
        </svg>
      </div>
      <h3 className="text-lg font-bold text-gray-800 mb-2">{t.successTitle}</h3>
      <p className="text-sm text-gray-500 mb-6">{t.successMsg}</p>
      <button
        onClick={onClose}
        className="px-8 py-2.5 rounded-xl text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-green-400"
        style={{ background: "linear-gradient(135deg, #43a047, #66bb6a)", boxShadow: "0 4px 12px rgba(67,160,71,0.35)" }}
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
          className="px-5 py-2.5 rounded-xl text-sm font-bold text-white transition-all focus:outline-none focus:ring-2 focus:ring-red-400"
          style={{ background: "linear-gradient(135deg, #c62828 0%, #e53935 100%)" }}
        >
          {t.submit}
        </button>
      </div>
    </div>
  );
}

function Spinner() {
  return (
    <svg className="animate-spin" width="16" height="16" viewBox="0 0 24 24" fill="none">
      <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" strokeOpacity="0.25" />
      <path d="M12 2a10 10 0 0110 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}
