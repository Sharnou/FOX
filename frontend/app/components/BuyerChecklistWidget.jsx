"use client";
import { useState } from "react";

/**
 * BuyerChecklistWidget
 * Pre-purchase safety checklist for buyers before in-person marketplace transactions.
 * Helps Arab marketplace users stay safe when meeting sellers.
 *
 * Props:
 *   lang        - "ar" | "en" | "de" (default "ar")
 *   adTitle     - string, the ad title for display
 *   onComplete  - callback(checkedCount, totalCount) called when all items checked
 *   className   - extra Tailwind classes
 */

const LABELS = {
  ar: {
    title: "قائمة أمان المشتري",
    subtitle: "تأكد من هذه النقاط قبل لقاء البائع",
    progress: (done, total) => `${toArabicNumerals(done)} من ${toArabicNumerals(total)} مكتمل`,
    allDone: "أنت مستعد للقاء البائع بأمان! ✅",
    reset: "إعادة تعيين",
    tip: "نصيحة",
    tipText: "إذا شعرت بأي قلق، أنهِ اللقاء فوراً ولا تدفع مسبقاً.",
    items: [
      { id: "place", icon: "📍", text: "اخترت مكاناً عاماً للقاء (مثل مقهى أو مول)" },
      { id: "friend", icon: "👥", text: "أبلغتَ صديقاً أو أحد أفراد العائلة بالموعد والمكان" },
      { id: "check", icon: "🔍", text: "ستفحص السلعة جيداً قبل الدفع" },
      { id: "price", icon: "💰", text: "اتفقتَ على السعر النهائي مع البائع مسبقاً" },
      { id: "noPrepay", icon: "🚫", text: "لن تدفع أي مبلغ مقدم عبر الإنترنت" },
      { id: "receipt", icon: "🧾", text: "ستطلب إيصالاً أو توثيقاً للصفقة" },
      { id: "phone", icon: "📱", text: "هاتفك مشحون وأرقام الطوارئ محفوظة" },
      { id: "daylight", icon: "☀️", text: "اخترتَ وقتاً نهارياً للقاء" },
    ],
  },
  en: {
    title: "Buyer Safety Checklist",
    subtitle: "Confirm these points before meeting the seller",
    progress: (done, total) => `${done} of ${total} completed`,
    allDone: "You're ready to meet the seller safely! ✅",
    reset: "Reset",
    tip: "Tip",
    tipText: "If anything feels off, end the meeting immediately and never pay in advance.",
    items: [
      { id: "place", icon: "📍", text: "Chosen a public meeting place (café, mall, etc.)" },
      { id: "friend", icon: "👥", text: "Told a friend or family member the time and place" },
      { id: "check", icon: "🔍", text: "Will inspect the item thoroughly before paying" },
      { id: "price", icon: "💰", text: "Agreed on the final price with the seller in advance" },
      { id: "noPrepay", icon: "🚫", text: "Will not make any upfront online payment" },
      { id: "receipt", icon: "🧾", text: "Will request a receipt or proof of transaction" },
      { id: "phone", icon: "📱", text: "Phone is charged and emergency contacts saved" },
      { id: "daylight", icon: "☀️", text: "Arranged to meet during daylight hours" },
    ],
  },
  de: {
    title: "Käufer-Sicherheitscheckliste",
    subtitle: "Bestätigen Sie diese Punkte vor dem Treffen",
    progress: (done, total) => `${done} von ${total} erledigt`,
    allDone: "Sie sind bereit, den Verkäufer sicher zu treffen! ✅",
    reset: "Zurücksetzen",
    tip: "Tipp",
    tipText: "Wenn etwas nicht stimmt, beenden Sie das Treffen sofort und zahlen Sie nie im Voraus.",
    items: [
      { id: "place", icon: "📍", text: "Öffentlichen Treffpunkt gewählt (Café, Einkaufszentrum)" },
      { id: "friend", icon: "👥", text: "Freund oder Familienmitglied über Zeit und Ort informiert" },
      { id: "check", icon: "🔍", text: "Artikel vor der Zahlung gründlich prüfen" },
      { id: "price", icon: "💰", text: "Endpreis im Voraus mit dem Verkäufer vereinbart" },
      { id: "noPrepay", icon: "🚫", text: "Keine Vorauszahlung online leisten" },
      { id: "receipt", icon: "🧾", text: "Quittung oder Transaktionsnachweis anfordern" },
      { id: "phone", icon: "📱", text: "Telefon aufgeladen und Notfallkontakte gespeichert" },
      { id: "daylight", icon: "☀️", text: "Treffen bei Tageslicht vereinbart" },
    ],
  },
};

function toArabicNumerals(n) {
  return String(n).replace(/[0-9]/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

export default function BuyerChecklistWidget({
  lang = "ar",
  adTitle = "",
  onComplete,
  className = "",
}) {
  const t = LABELS[lang] || LABELS.ar;
  const isRTL = lang === "ar";
  const total = t.items.length;
  const [checked, setChecked] = useState({});

  const checkedCount = Object.values(checked).filter(Boolean).length;
  const allDone = checkedCount === total;

  function toggle(id) {
    setChecked(prev => {
      const next = { ...prev, [id]: !prev[id] };
      const count = Object.values(next).filter(Boolean).length;
      if (count === total && onComplete) onComplete(count, total);
      return next;
    });
  }

  function reset() {
    setChecked({});
  }

  const progressPct = Math.round((checkedCount / total) * 100);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-md border border-gray-100 p-4 max-w-sm w-full ${className}`}
    >
      {/* Header */}
      <div className="mb-3">
        <h3 className="text-base font-bold text-gray-800">{t.title}</h3>
        {adTitle && (
          <p className="text-xs text-gray-500 mt-0.5 truncate">{adTitle}</p>
        )}
        <p className="text-xs text-gray-400 mt-0.5">{t.subtitle}</p>
      </div>

      {/* Progress Bar */}
      <div className="mb-3">
        <div className="flex justify-between items-center mb-1">
          <span className="text-xs font-medium text-gray-600">
            {t.progress(checkedCount, total)}
          </span>
          <span className="text-xs text-indigo-600 font-bold">
            {isRTL ? `${toArabicNumerals(progressPct)}٪` : `${progressPct}%`}
          </span>
        </div>
        <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 rounded-full transition-all duration-500"
            style={{
              width: `${progressPct}%`,
              background: allDone
                ? "linear-gradient(90deg, #22c55e, #16a34a)"
                : "linear-gradient(90deg, #6366f1, #8b5cf6)",
            }}
          />
        </div>
      </div>

      {/* All Done Banner */}
      {allDone && (
        <div className="mb-3 bg-green-50 border border-green-200 rounded-xl p-3 text-center animate-pulse">
          <p className="text-sm font-semibold text-green-700">{t.allDone}</p>
        </div>
      )}

      {/* Checklist Items */}
      <ul className="space-y-2 mb-3">
        {t.items.map((item, idx) => {
          const isChecked = !!checked[item.id];
          return (
            <li key={item.id}>
              <button
                onClick={() => toggle(item.id)}
                className={`w-full flex items-start gap-2.5 p-2.5 rounded-xl border text-sm transition-all duration-200 ${
                  isChecked
                    ? "bg-green-50 border-green-300 text-green-800"
                    : "bg-gray-50 border-gray-200 text-gray-700 hover:bg-indigo-50 hover:border-indigo-200"
                }`}
                style={{ animationDelay: `${idx * 40}ms` }}
              >
                {/* Checkbox */}
                <span
                  className={`flex-shrink-0 w-5 h-5 rounded-full border-2 flex items-center justify-center transition-colors duration-200 mt-0.5 ${
                    isChecked
                      ? "border-green-500 bg-green-500"
                      : "border-gray-300 bg-white"
                  }`}
                >
                  {isChecked && (
                    <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 12 12">
                      <path
                        d="M2 6l3 3 5-5"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </span>
                {/* Icon + Text */}
                <span className="flex items-start gap-1.5">
                  <span className="text-base leading-tight">{item.icon}</span>
                  <span className={`leading-snug ${isChecked ? "line-through opacity-70" : ""}`}>
                    {item.text}
                  </span>
                </span>
              </button>
            </li>
          );
        })}
      </ul>

      {/* Safety Tip */}
      <div
        className={`bg-amber-50 border border-amber-200 rounded-xl p-3 mb-3 flex gap-2 ${
          isRTL ? "flex-row" : "flex-row"
        }`}
      >
        <span className="text-amber-500 text-base flex-shrink-0">⚠️</span>
        <p className="text-xs text-amber-800 leading-relaxed">
          <span className="font-bold">{t.tip}: </span>
          {t.tipText}
        </p>
      </div>

      {/* Reset Button */}
      {checkedCount > 0 && (
        <button
          onClick={reset}
          className="w-full text-xs text-gray-400 hover:text-gray-600 transition-colors py-1"
        >
          ↺ {t.reset}
        </button>
      )}
    </div>
  );
}
