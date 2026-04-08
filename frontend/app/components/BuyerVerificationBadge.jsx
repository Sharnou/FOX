"use client";
import { useState } from "react";

// ─── helpers ────────────────────────────────────────────────────────────────
const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

const fmt = (value, lang) =>
  lang === "ar" ? toArabicNumerals(value) : String(value);

// ─── i18n strings ───────────────────────────────────────────────────────────
const T = {
  ar: {
    title: "بطاقة التحقق من المشتري",
    verified: "موثَّق",
    trusted: "موثوق",
    newBuyer: "مشترٍ جديد",
    safeToDeal: "آمن للتعامل",
    proceedCaution: "تعامل بحذر",
    trustScore: "نقاط الثقة",
    trustIndicators: "مؤشرات الثقة",
    phoneVerified: "الهاتف موثَّق",
    emailVerified: "البريد موثَّق",
    purchaseHistory: "سجل الشراء",
    responseRate: "معدل الاستجابة",
    memberSince: "عضو منذ",
    months: "أشهر",
    recentDeals: "آخر الصفقات",
    warningFlags: "تحذيرات",
    noWarnings: "لا توجد تحذيرات",
    contactBuyer: "تواصل مع المشتري",
    deals: "صفقة",
    completed: "مكتملة",
    cancelled: "ملغية",
    pending: "قيد الانتظار",
    yes: "نعم",
    no: "لا",
    overallScore: "النتيجة الإجمالية",
    buyerProfile: "ملف المشتري",
    purchasesCount: "عمليات شراء",
  },
  en: {
    title: "Buyer Verification Badge",
    verified: "Verified",
    trusted: "Trusted",
    newBuyer: "New Buyer",
    safeToDeal: "Safe to Deal",
    proceedCaution: "Proceed with Caution",
    trustScore: "Trust Score",
    trustIndicators: "Trust Indicators",
    phoneVerified: "Phone Verified",
    emailVerified: "Email Verified",
    purchaseHistory: "Purchase History",
    responseRate: "Response Rate",
    memberSince: "Member Since",
    months: "months",
    recentDeals: "Recent Deals",
    warningFlags: "Warning Flags",
    noWarnings: "No warnings",
    contactBuyer: "Contact Buyer",
    deals: "deals",
    completed: "Completed",
    cancelled: "Cancelled",
    pending: "Pending",
    yes: "Yes",
    no: "No",
    overallScore: "Overall Score",
    buyerProfile: "Buyer Profile",
    purchasesCount: "purchases",
  },
  de: {
    title: "Käufer-Verifizierungsausweis",
    verified: "Verifiziert",
    trusted: "Vertrauenswürdig",
    newBuyer: "Neuer Käufer",
    safeToDeal: "Sicher zu handeln",
    proceedCaution: "Mit Vorsicht vorgehen",
    trustScore: "Vertrauenspunkte",
    trustIndicators: "Vertrauensindikatoren",
    phoneVerified: "Telefon verifiziert",
    emailVerified: "E-Mail verifiziert",
    purchaseHistory: "Kaufhistorie",
    responseRate: "Antwortrate",
    memberSince: "Mitglied seit",
    months: "Monaten",
    recentDeals: "Letzte Geschäfte",
    warningFlags: "Warnhinweise",
    noWarnings: "Keine Warnhinweise",
    contactBuyer: "Käufer kontaktieren",
    deals: "Geschäfte",
    completed: "Abgeschlossen",
    cancelled: "Storniert",
    pending: "Ausstehend",
    yes: "Ja",
    no: "Nein",
    overallScore: "Gesamtpunktzahl",
    buyerProfile: "Käuferprofil",
    purchasesCount: "Käufe",
  },
};

// ─── SVG icons (inline, no deps) ────────────────────────────────────────────
const Icons = {
  Phone: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498A1 1 0 0121 15.72V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
    </svg>
  ),
  Email: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
    </svg>
  ),
  ShoppingBag: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
    </svg>
  ),
  Chart: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  Calendar: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  Check: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  ),
  X: () => (
    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
  ),
  Warning: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
    </svg>
  ),
  Shield: () => (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
    </svg>
  ),
  User: () => (
    <svg className="w-8 h-8" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
    </svg>
  ),
  Chat: () => (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
  ),
};

// ─── Trust level calculator ──────────────────────────────────────────────────
const getTrustLevel = (score, t) => {
  if (score >= 75) return { label: t.verified, color: "text-emerald-700", bg: "bg-emerald-100", ring: "#10b981" };
  if (score >= 45) return { label: t.trusted, color: "text-blue-700", bg: "bg-blue-100", ring: "#3b82f6" };
  return { label: t.newBuyer, color: "text-gray-600", bg: "bg-gray-100", ring: "#6b7280" };
};

// ─── Circular progress ring ──────────────────────────────────────────────────
const TrustRing = ({ score, color, lang }) => {
  const r = 38;
  const circ = 2 * Math.PI * r;
  const progress = circ - (score / 100) * circ;
  return (
    <div className="relative flex items-center justify-center w-24 h-24">
      <svg className="w-24 h-24 -rotate-90" viewBox="0 0 96 96">
        <circle cx="48" cy="48" r={r} fill="none" stroke="#e5e7eb" strokeWidth="8" />
        <circle
          cx="48" cy="48" r={r}
          fill="none"
          stroke={color}
          strokeWidth="8"
          strokeDasharray={circ}
          strokeDashoffset={progress}
          strokeLinecap="round"
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-2xl font-bold text-gray-800">{fmt(score, lang)}</span>
        <span className="text-[10px] text-gray-500">/100</span>
      </div>
    </div>
  );
};

// ─── Deal status badge ───────────────────────────────────────────────────────
const DealStatusBadge = ({ status, t }) => {
  const map = {
    completed: "bg-emerald-100 text-emerald-700",
    cancelled: "bg-red-100 text-red-700",
    pending: "bg-amber-100 text-amber-700",
  };
  const label = {
    completed: t.completed,
    cancelled: t.cancelled,
    pending: t.pending,
  };
  return (
    <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${map[status] || "bg-gray-100 text-gray-600"}`}>
      {label[status] || status}
    </span>
  );
};

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BuyerVerificationBadge({
  buyerName = "أحمد محمد",
  phoneVerified = true,
  emailVerified = true,
  purchaseCount = 12,
  responseRate = 87,
  memberSinceMonths = 18,
  recentDeals = [
    { item: "iPhone 14 Pro", status: "completed", date: "2024-11-10" },
    { item: "كنبة جلد", status: "completed", date: "2024-10-22" },
    { item: "لابتوب Dell", status: "cancelled", date: "2024-09-15" },
  ],
  warningFlags = [],
  trustScore = 82,
  lang: initialLang = "ar",
  className = "",
}) {
  const [lang, setLang] = useState(initialLang);
  const t = T[lang];
  const isRTL = lang === "ar";
  const fontClass = lang === "ar" ? "font-[Cairo,Tajawal,sans-serif]" : "font-[Inter,sans-serif]";
  const trustLevel = getTrustLevel(trustScore, t);
  const isSafe = trustScore >= 50;

  const indicators = [
    { icon: Icons.Phone, label: t.phoneVerified, value: phoneVerified, isBoolean: true },
    { icon: Icons.Email, label: t.emailVerified, value: emailVerified, isBoolean: true },
    {
      icon: Icons.ShoppingBag,
      label: t.purchaseHistory,
      value: fmt(purchaseCount, lang),
      suffix: ` ${t.purchasesCount}`,
      isBoolean: false,
    },
    {
      icon: Icons.Chart,
      label: t.responseRate,
      value: fmt(responseRate, lang),
      suffix: "%",
      isBoolean: false,
    },
    {
      icon: Icons.Calendar,
      label: t.memberSince,
      value: fmt(memberSinceMonths, lang),
      suffix: ` ${t.months}`,
      isBoolean: false,
    },
  ];

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`${fontClass} ${className} w-full max-w-sm rounded-2xl overflow-hidden shadow-xl border border-gray-100 bg-white`}
    >
      {/* Language Switcher */}
      <div className="flex justify-center gap-1 pt-3 px-4 bg-white">
        {["ar", "en", "de"].map((l) => (
          <button
            key={l}
            onClick={() => setLang(l)}
            className={`px-3 py-1 text-xs rounded-full font-medium transition-all duration-200 ${
              lang === l
                ? "bg-teal-600 text-white shadow"
                : "bg-gray-100 text-gray-500 hover:bg-gray-200"
            }`}
          >
            {l === "ar" ? "عربي" : l === "en" ? "EN" : "DE"}
          </button>
        ))}
      </div>

      {/* Header gradient */}
      <div className="bg-gradient-to-br from-teal-500 via-emerald-500 to-teal-700 px-5 pt-5 pb-8 text-white">
        <div className={`flex items-center gap-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          <div className="bg-white/20 rounded-full p-2">
            <Icons.User />
          </div>
          <div className={isRTL ? "text-right" : "text-left"}>
            <h2 className="text-lg font-bold leading-tight">{buyerName}</h2>
            <span
              className={`inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-0.5 rounded-full mt-1 ${trustLevel.bg} ${trustLevel.color}`}
            >
              <Icons.Shield />
              {trustLevel.label}
            </span>
          </div>
          <div className={`${isRTL ? "mr-auto" : "ml-auto"}`}>
            <TrustRing score={trustScore} color={trustLevel.ring} lang={lang} />
          </div>
        </div>

        {/* Safety recommendation */}
        <div
          className={`mt-4 flex items-center gap-2 text-sm font-semibold ${
            isSafe ? "text-emerald-100" : "text-amber-200"
          } ${isRTL ? "flex-row-reverse justify-end" : ""}`}
        >
          {isSafe ? (
            <span className="bg-emerald-400/40 rounded-full p-0.5"><Icons.Check /></span>
          ) : (
            <span className="bg-amber-400/40 rounded-full p-0.5"><Icons.Warning /></span>
          )}
          {isSafe ? t.safeToDeal : t.proceedCaution}
        </div>
      </div>

      {/* Trust indicators */}
      <div className="px-5 -mt-4">
        <div className="bg-white rounded-xl shadow-md border border-gray-100 p-4">
          <h3 className={`text-xs font-bold text-gray-500 uppercase tracking-wider mb-3 ${isRTL ? "text-right" : "text-left"}`}>
            {t.trustIndicators}
          </h3>
          <div className="space-y-2.5">
            {indicators.map((ind, i) => (
              <div
                key={i}
                className={`flex items-center justify-between ${isRTL ? "flex-row-reverse" : ""}`}
              >
                <div className={`flex items-center gap-2 text-gray-600 ${isRTL ? "flex-row-reverse" : ""}`}>
                  <span className="text-teal-500">
                    <ind.icon />
                  </span>
                  <span className="text-sm">{ind.label}</span>
                </div>
                {ind.isBoolean ? (
                  <span
                    className={`flex items-center gap-1 text-xs font-medium px-2 py-0.5 rounded-full ${
                      ind.value
                        ? "bg-emerald-100 text-emerald-700"
                        : "bg-red-100 text-red-600"
                    }`}
                  >
                    {ind.value ? <Icons.Check /> : <Icons.X />}
                    {ind.value ? t.yes : t.no}
                  </span>
                ) : (
                  <span className="text-sm font-bold text-gray-800">
                    {ind.value}
                    <span className="font-normal text-gray-500 text-xs">{ind.suffix}</span>
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Response rate bar */}
      <div className="px-5 mt-3">
        <div className={`flex items-center justify-between mb-1 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="text-xs text-gray-500">{t.responseRate}</span>
          <span className="text-xs font-bold text-teal-700">{fmt(responseRate, lang)}%</span>
        </div>
        <div className="h-2 w-full rounded-full bg-gray-100 overflow-hidden">
          <div
            className="h-2 rounded-full bg-gradient-to-r from-teal-400 to-emerald-500 transition-all duration-700"
            style={{ width: `${responseRate}%` }}
          />
        </div>
      </div>

      {/* Recent Deals */}
      {recentDeals && recentDeals.length > 0 && (
        <div className="px-5 mt-4">
          <h3 className={`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ${isRTL ? "text-right" : "text-left"}`}>
            {t.recentDeals}
          </h3>
          <div className="space-y-2">
            {recentDeals.slice(0, 3).map((deal, i) => (
              <div
                key={i}
                className={`flex items-center justify-between bg-gray-50 rounded-lg px-3 py-2 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}
              >
                <div className={`flex-1 ${isRTL ? "text-right" : "text-left"}`}>
                  <p className="text-sm text-gray-700 font-medium leading-tight truncate max-w-[140px]">
                    {deal.item}
                  </p>
                  <p className="text-[10px] text-gray-400 mt-0.5">{deal.date}</p>
                </div>
                <DealStatusBadge status={deal.status} t={t} />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Warning flags */}
      <div className="px-5 mt-4">
        <h3 className={`text-xs font-bold text-gray-500 uppercase tracking-wider mb-2 ${isRTL ? "text-right" : "text-left"}`}>
          {t.warningFlags}
        </h3>
        {warningFlags && warningFlags.length > 0 ? (
          <div className="space-y-1.5">
            {warningFlags.map((flag, i) => (
              <div
                key={i}
                className={`flex items-start gap-2 text-sm text-red-700 bg-red-50 border border-red-100 rounded-lg px-3 py-2 ${
                  isRTL ? "flex-row-reverse" : ""
                }`}
              >
                <span className="mt-0.5 shrink-0 text-red-500"><Icons.Warning /></span>
                <span>{flag}</span>
              </div>
            ))}
          </div>
        ) : (
          <div
            className={`flex items-center gap-2 text-sm text-emerald-700 bg-emerald-50 rounded-lg px-3 py-2 ${
              isRTL ? "flex-row-reverse" : ""
            }`}
          >
            <Icons.Check />
            {t.noWarnings}
          </div>
        )}
      </div>

      {/* CTA */}
      <div className="px-5 mt-5 mb-5">
        <button
          className={`w-full flex items-center justify-center gap-2 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white font-bold py-3 px-4 rounded-xl shadow-md hover:shadow-lg transition-all duration-200 text-sm ${
            isRTL ? "flex-row-reverse" : ""
          }`}
          onClick={() => alert(t.contactBuyer)}
        >
          <Icons.Chat />
          {t.contactBuyer}
        </button>
      </div>
    </div>
  );
}
