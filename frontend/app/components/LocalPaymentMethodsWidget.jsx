"use client";
import { useState } from "react";

const METHODS = [
  {
    id: "fawry",
    icon: "💳",
    color: "bg-orange-100 text-orange-700 border-orange-300",
    dotColor: "bg-orange-400",
    label: { ar: "فوري", en: "Fawry", de: "Fawry" },
    desc: { ar: "ادفع في أي محل فوري", en: "Pay at any Fawry outlet", de: "Bei Fawry bezahlen" },
    countries: ["EG"],
    type: "cash_network"
  },
  {
    id: "vodafone_cash",
    icon: "📱",
    color: "bg-red-100 text-red-700 border-red-300",
    dotColor: "bg-red-400",
    label: { ar: "فودافون كاش", en: "Vodafone Cash", de: "Vodafone Cash" },
    desc: { ar: "محفظة فودافون الرقمية", en: "Vodafone digital wallet", de: "Digitale Vodafone-Geldbörse" },
    countries: ["EG"],
    type: "wallet"
  },
  {
    id: "instapay",
    icon: "⚡",
    color: "bg-purple-100 text-purple-700 border-purple-300",
    dotColor: "bg-purple-400",
    label: { ar: "انستاباي", en: "InstaPay", de: "InstaPay" },
    desc: { ar: "تحويل فوري بين البنوك", en: "Instant interbank transfer", de: "Sofortüberweisung zwischen Banken" },
    countries: ["EG"],
    type: "wallet"
  },
  {
    id: "orange_cash",
    icon: "🟠",
    color: "bg-amber-100 text-amber-700 border-amber-300",
    dotColor: "bg-amber-400",
    label: { ar: "أورنج كاش", en: "Orange Cash", de: "Orange Cash" },
    desc: { ar: "محفظة أورنج الرقمية", en: "Orange digital wallet", de: "Orange digitale Geldbörse" },
    countries: ["EG"],
    type: "wallet"
  },
  {
    id: "etisalat_cash",
    icon: "📶",
    color: "bg-teal-100 text-teal-700 border-teal-300",
    dotColor: "bg-teal-400",
    label: { ar: "اتصالات كاش", en: "Etisalat Cash", de: "Etisalat Cash" },
    desc: { ar: "محفظة اتصالات الرقمية", en: "Etisalat digital wallet", de: "Etisalat digitale Geldbörse" },
    countries: ["EG"],
    type: "wallet"
  },
  {
    id: "bank_transfer",
    icon: "🏦",
    color: "bg-blue-100 text-blue-700 border-blue-300",
    dotColor: "bg-blue-400",
    label: { ar: "تحويل بنكي", en: "Bank Transfer", de: "Banküberweisung" },
    desc: { ar: "تحويل مباشر للحساب البنكي", en: "Direct bank account transfer", de: "Direkte Banküberweisung" },
    countries: ["EG", "DE", "SA", "AE"],
    type: "bank"
  },
  {
    id: "cash_delivery",
    icon: "💵",
    color: "bg-emerald-100 text-emerald-700 border-emerald-300",
    dotColor: "bg-emerald-400",
    label: { ar: "كاش عند الاستلام", en: "Cash on Delivery", de: "Nachnahme" },
    desc: { ar: "ادفع نقداً عند استلام المنتج", en: "Pay cash when you receive the item", de: "Barzahlung bei Lieferung" },
    countries: ["EG", "SA", "AE", "JO", "LB"],
    type: "cash"
  },
  {
    id: "stc_pay",
    icon: "💠",
    color: "bg-violet-100 text-violet-700 border-violet-300",
    dotColor: "bg-violet-400",
    label: { ar: "STC Pay", en: "STC Pay", de: "STC Pay" },
    desc: { ar: "محفظة STC الرقمية", en: "STC digital wallet", de: "STC digitale Geldbörse" },
    countries: ["SA"],
    type: "wallet"
  }
];

const T = {
  title: { ar: "طرق الدفع المتاحة", en: "Available Payment Methods", de: "Verfügbare Zahlungsmethoden" },
  noMethods: { ar: "لا توجد طرق دفع محددة", en: "No payment methods specified", de: "Keine Zahlungsmethoden angegeben" },
  selectPrompt: { ar: "اختر طريقة الدفع", en: "Select a payment method", de: "Zahlungsmethode auswählen" },
  safetyTip: { ar: "💡 تحقق دائماً من بيانات المستلم قبل التحويل", en: "💡 Always verify recipient details before transferring", de: "💡 Überprüfen Sie immer die Empfängerdaten vor der Überweisung" },
  selected: { ar: "محدد", en: "Selected", de: "Ausgewählt" },
  types: {
    wallet: { ar: "محفظة رقمية", en: "Digital Wallet", de: "Digitale Geldbörse" },
    cash_network: { ar: "شبكة كاش", en: "Cash Network", de: "Barzahlungsnetz" },
    bank: { ar: "بنك", en: "Bank", de: "Bank" },
    cash: { ar: "كاش", en: "Cash", de: "Bar" }
  }
};

function t(obj, lang) {
  return obj[lang] || obj["ar"] || "";
}

export default function LocalPaymentMethodsWidget({
  methods = [],
  lang = "ar",
  compact = false,
  selectable = false,
  selectedMethod = null,
  onSelect = null,
  country = "EG"
}) {
  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";

  const availableMethods = methods.length > 0
    ? METHODS.filter(function(m) { return methods.includes(m.id); })
    : METHODS.filter(function(m) { return m.countries.includes(country); });

  const [picked, setPicked] = useState(selectedMethod);

  function handleSelect(id) {
    setPicked(id);
    if (onSelect) onSelect(id);
  }

  if (compact) {
    return (
      <div dir={dir} style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }} className="flex flex-wrap gap-1.5 items-center">
        {availableMethods.map(function(m) {
          return (
            <span
              key={m.id}
              title={t(m.label, lang)}
              className={"inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border font-medium " + m.color}
            >
              <span>{m.icon}</span>
              <span className="hidden sm:inline">{t(m.label, lang)}</span>
            </span>
          );
        })}
        {availableMethods.length === 0 && (
          <span className="text-xs text-gray-400">{t(T.noMethods, lang)}</span>
        )}
      </div>
    );
  }

  return (
    <div dir={dir} style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 w-full max-w-lg mx-auto">
      <h3 className="text-base font-bold text-gray-800 mb-3 flex items-center gap-2">
        <span>💳</span>
        <span>{t(T.title, lang)}</span>
      </h3>

      {availableMethods.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-4">{t(T.noMethods, lang)}</p>
      ) : (
        <div className="flex flex-col gap-2">
          {availableMethods.map(function(m) {
            const isSelected = picked === m.id;
            return (
              <div
                key={m.id}
                onClick={selectable ? function() { handleSelect(m.id); } : undefined}
                className={"flex items-center gap-3 p-3 rounded-xl border transition-all " +
                  (selectable ? "cursor-pointer " : "") +
                  (isSelected
                    ? "ring-2 ring-offset-1 ring-blue-400 border-blue-300 bg-blue-50"
                    : "border-gray-100 hover:border-gray-300 hover:bg-gray-50")}
              >
                <span className={"text-2xl flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center border " + m.color}>
                  {m.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-800">{t(m.label, lang)}</span>
                    <span className={"text-xs px-1.5 py-0.5 rounded-full border " + m.color}>
                      {t(T.types[m.type], lang)}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 truncate mt-0.5">{t(m.desc, lang)}</p>
                </div>
                {isSelected && (
                  <span className="flex-shrink-0 text-blue-500">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      <p className="text-xs text-gray-400 mt-3 border-t pt-2">{t(T.safetyTip, lang)}</p>
    </div>
  );
}
