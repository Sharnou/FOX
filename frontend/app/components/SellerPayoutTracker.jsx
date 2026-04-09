"use client";
import { useState } from "react";

const TRANSLATIONS = {
  ar: {
    title: "متابعة المدفوعات",
    subtitle: "إدارة أرباحك وصفقاتك المكتملة",
    tabPending: "صفقات معلقة",
    tabHistory: "سجل المدفوعات",
    tabCalculator: "حاسبة الأرباح",
    pendingEmpty: "لا توجد صفقات معلقة حالياً",
    historyEmpty: "لا توجد مدفوعات مسجلة بعد",
    status: { pending: "في الانتظار", confirmed: "مؤكدة", released: "محولة" },
    buyer: "المشتري",
    item: "المنتج",
    amount: "المبلغ",
    fee: "عمولة المنصة (2%)",
    net: "صافي الربح",
    total: "إجمالي المدفوعات",
    totalFees: "إجمالي العمولات",
    totalNet: "صافي الأرباح",
    hijriDate: "التاريخ الهجري",
    gregorianDate: "التاريخ الميلادي",
    currency: "العملة",
    calcSalePrice: "سعر البيع",
    calcResult: "نتيجة الحساب",
    calcPlatformFee: "عمولة المنصة (2%)",
    calcNetEarning: "صافي ربحك",
    useArabicNumerals: "أرقام عربية",
    useLatinNumerals: "أرقام لاتينية",
    city: "المدينة",
  },
  en: {
    title: "Payout Tracker",
    subtitle: "Manage your earnings and completed deals",
    tabPending: "Pending Deals",
    tabHistory: "Payout History",
    tabCalculator: "Earnings Calculator",
    pendingEmpty: "No pending deals right now",
    historyEmpty: "No payouts recorded yet",
    status: { pending: "Pending", confirmed: "Confirmed", released: "Released" },
    buyer: "Buyer",
    item: "Item",
    amount: "Amount",
    fee: "Platform Fee (2%)",
    net: "Net Earning",
    total: "Total Payouts",
    totalFees: "Total Fees",
    totalNet: "Net Earnings",
    hijriDate: "Hijri Date",
    gregorianDate: "Gregorian Date",
    currency: "Currency",
    calcSalePrice: "Sale Price",
    calcResult: "Calculation Result",
    calcPlatformFee: "Platform Fee (2%)",
    calcNetEarning: "Your Net Earning",
    useArabicNumerals: "Arabic Numerals",
    useLatinNumerals: "Latin Numerals",
    city: "City",
  },
  de: {
    title: "Auszahlungs-Tracker",
    subtitle: "Verwalte deine Einnahmen und abgeschlossenen Deals",
    tabPending: "Ausstehende Deals",
    tabHistory: "Auszahlungsverlauf",
    tabCalculator: "Einnahmenrechner",
    pendingEmpty: "Keine ausstehenden Deals",
    historyEmpty: "Noch keine Auszahlungen",
    status: { pending: "Ausstehend", confirmed: "Bestätigt", released: "Überwiesen" },
    buyer: "Käufer",
    item: "Artikel",
    amount: "Betrag",
    fee: "Plattformgebühr (2%)",
    net: "Nettogewinn",
    total: "Gesamtauszahlungen",
    totalFees: "Gesamtgebühren",
    totalNet: "Nettoeinnahmen",
    hijriDate: "Hijri-Datum",
    gregorianDate: "Gregorianisches Datum",
    currency: "Währung",
    calcSalePrice: "Verkaufspreis",
    calcResult: "Ergebnis",
    calcPlatformFee: "Plattformgebühr (2%)",
    calcNetEarning: "Dein Nettogewinn",
    useArabicNumerals: "Arabische Ziffern",
    useLatinNumerals: "Lateinische Ziffern",
    city: "Stadt",
  },
};

const FX = { EGP: 1, SAR: 0.083, AED: 0.09, USD: 0.021 };
const FX_LABELS = { EGP: "ج.م", SAR: "ر.س", AED: "د.إ", USD: "$" };

function toArabicNumerals(n) {
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}

function gregorianToHijri(gYear, gMonth, gDay) {
  const jdn =
    Math.floor((1461 * (gYear + 4800 + Math.floor((gMonth - 14) / 12))) / 4) +
    Math.floor((367 * (gMonth - 2 - 12 * Math.floor((gMonth - 14) / 12))) / 12) -
    Math.floor((3 * Math.floor((gYear + 4900 + Math.floor((gMonth - 14) / 12)) / 100)) / 4) +
    gDay - 32075;
  const l = jdn - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const l2 = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - l2) / 5316) * Math.floor((50 * l2) / 17719) +
    Math.floor(l2 / 5670) * Math.floor((43 * l2) / 15238);
  const l3 = l2 - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const hMonth = Math.floor((24 * l3) / 709);
  const hDay = l3 - Math.floor((709 * hMonth) / 24);
  const hYear = 30 * n + j - 30;
  return { hYear, hMonth, hDay };
}

function formatHijri(dateStr, arabicNumerals) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const { hYear, hMonth, hDay } = gregorianToHijri(y, m, d);
  const months = ["محرم","صفر","ربيع الأول","ربيع الآخر","جمادى الأولى","جمادى الآخرة","رجب","شعبان","رمضان","شوال","ذو القعدة","ذو الحجة"];
  const label = `${hDay} ${months[hMonth - 1]} ${hYear} هـ`;
  return arabicNumerals ? toArabicNumerals(label) : label;
}

function fmt(num, currency, arabicNumerals) {
  const converted = (num * FX[currency]).toFixed(2);
  const sym = FX_LABELS[currency];
  const formatted = parseFloat(converted).toLocaleString("en");
  return arabicNumerals
    ? toArabicNumerals(formatted) + " " + sym
    : formatted + " " + sym;
}

const STATUS_COLORS = {
  pending: "bg-yellow-100 text-yellow-700",
  confirmed: "bg-blue-100 text-blue-700",
  released: "bg-green-100 text-green-700",
};

export default function SellerPayoutTracker({
  pendingDeals = [],
  historyDeals = [],
  lang = "ar",
  currency = "EGP",
  className = "",
}) {
  const [tab, setTab] = useState("pending");
  const [activeLang, setActiveLang] = useState(lang);
  const [activeCurrency, setActiveCurrency] = useState(currency);
  const [arabicNumerals, setArabicNumerals] = useState(activeLang === "ar");
  const [calcPrice, setCalcPrice] = useState("");

  const t = TRANSLATIONS[activeLang] || TRANSLATIONS.ar;
  const isRTL = activeLang === "ar";

  const totalPaid = historyDeals.reduce((s, d) => s + d.amount, 0);
  const totalFees = historyDeals.reduce((s, d) => s + d.amount * 0.02, 0);
  const totalNet = totalPaid - totalFees;

  const calcFee = calcPrice ? parseFloat(calcPrice) * 0.02 : 0;
  const calcNet = calcPrice ? parseFloat(calcPrice) - calcFee : 0;

  const n = (num) => fmt(num, activeCurrency, arabicNumerals);

  return (
    <div
      className={`bg-white rounded-2xl shadow-lg overflow-hidden font-cairo ${className}`}
      dir={isRTL ? "rtl" : "ltr"}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-emerald-600 to-teal-700 px-5 py-4">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-white font-bold text-lg">{t.title}</h2>
            <p className="text-emerald-100 text-xs">{t.subtitle}</p>
          </div>
          <span className="text-3xl">💰</span>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-3 gap-2 mt-3">
          {[
            { label: t.total, value: n(totalPaid) },
            { label: t.totalFees, value: n(totalFees) },
            { label: t.totalNet, value: n(totalNet) },
          ].map((s) => (
            <div key={s.label} className="bg-white/15 rounded-xl px-2 py-2 text-center">
              <p className="text-white font-bold text-sm">{s.value}</p>
              <p className="text-emerald-100 text-xs mt-0.5">{s.label}</p>
            </div>
          ))}
        </div>
      </div>

      {/* Controls */}
      <div className="px-4 pt-3 pb-1 flex flex-wrap gap-2 items-center justify-between border-b border-gray-100">
        {/* Lang switcher */}
        <div className="flex gap-1">
          {["ar", "en", "de"].map((l) => (
            <button
              key={l}
              onClick={() => {
                setActiveLang(l);
                setArabicNumerals(l === "ar");
              }}
              className={`px-2 py-0.5 rounded-md text-xs font-semibold transition ${
                activeLang === l
                  ? "bg-emerald-600 text-white"
                  : "bg-gray-100 text-gray-500 hover:bg-gray-200"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>

        {/* Currency */}
        <select
          value={activeCurrency}
          onChange={(e) => setActiveCurrency(e.target.value)}
          className="text-xs border border-gray-200 rounded-lg px-2 py-1 focus:outline-none"
        >
          {Object.keys(FX_LABELS).map((c) => (
            <option key={c} value={c}>
              {c} ({FX_LABELS[c]})
            </option>
          ))}
        </select>

        {/* Numeral toggle */}
        <button
          onClick={() => setArabicNumerals((p) => !p)}
          className="text-xs text-emerald-600 underline"
        >
          {arabicNumerals ? t.useLatinNumerals : t.useArabicNumerals}
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-gray-100">
        {[
          { id: "pending", label: t.tabPending },
          { id: "history", label: t.tabHistory },
          { id: "calculator", label: t.tabCalculator },
        ].map((tb) => (
          <button
            key={tb.id}
            onClick={() => setTab(tb.id)}
            className={`flex-1 py-2.5 text-xs font-semibold transition ${
              tab === tb.id
                ? "border-b-2 border-emerald-600 text-emerald-700"
                : "text-gray-400 hover:text-gray-600"
            }`}
          >
            {tb.label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="p-4 max-h-96 overflow-y-auto">
        {/* Pending Deals */}
        {tab === "pending" && (
          <div className="space-y-3">
            {pendingDeals.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">{t.pendingEmpty}</p>
            )}
            {pendingDeals.map((deal, i) => (
              <div key={i} className="border border-gray-100 rounded-xl p-3">
                <div className="flex items-start justify-between mb-2">
                  <div>
                    <p className="font-semibold text-gray-800 text-sm">{deal.item}</p>
                    <p className="text-xs text-gray-400">
                      {t.buyer}: {deal.buyer} · {t.city}: {deal.city}
                    </p>
                  </div>
                  <span
                    className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                      STATUS_COLORS[deal.status] || STATUS_COLORS.pending
                    }`}
                  >
                    {t.status[deal.status] || deal.status}
                  </span>
                </div>
                <div className="grid grid-cols-3 gap-1 text-center">
                  <div className="bg-gray-50 rounded-lg p-1.5">
                    <p className="text-xs text-gray-400">{t.amount}</p>
                    <p className="text-sm font-bold text-gray-800">{n(deal.amount)}</p>
                  </div>
                  <div className="bg-red-50 rounded-lg p-1.5">
                    <p className="text-xs text-red-400">{t.fee}</p>
                    <p className="text-sm font-bold text-red-600">{n(deal.amount * 0.02)}</p>
                  </div>
                  <div className="bg-emerald-50 rounded-lg p-1.5">
                    <p className="text-xs text-emerald-500">{t.net}</p>
                    <p className="text-sm font-bold text-emerald-700">{n(deal.amount * 0.98)}</p>
                  </div>
                </div>
                <p className="text-xs text-gray-400 mt-2">
                  {formatHijri(deal.date, arabicNumerals)} · {deal.date}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* History */}
        {tab === "history" && (
          <div className="space-y-2">
            {historyDeals.length === 0 && (
              <p className="text-center text-gray-400 text-sm py-8">{t.historyEmpty}</p>
            )}
            {historyDeals.map((deal, i) => (
              <div key={i} className="flex items-center gap-3 p-2.5 border border-gray-100 rounded-xl">
                <div className="w-8 h-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600 font-bold text-sm flex-shrink-0">
                  ✓
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm truncate">{deal.item}</p>
                  <p className="text-xs text-gray-400">
                    {formatHijri(deal.date, arabicNumerals)} · {deal.date}
                  </p>
                </div>
                <div className="text-right flex-shrink-0">
                  <p className="font-bold text-emerald-600 text-sm">{n(deal.amount * 0.98)}</p>
                  <p className="text-xs text-gray-400">-{n(deal.amount * 0.02)} {t.fee.split(" ")[0]}</p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Calculator */}
        {tab === "calculator" && (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">{t.calcSalePrice}</label>
              <input
                type="number"
                min="0"
                value={calcPrice}
                onChange={(e) => setCalcPrice(e.target.value)}
                placeholder="0"
                className="w-full border border-gray-200 rounded-xl px-4 py-2.5 text-right focus:outline-none focus:ring-2 focus:ring-emerald-400 text-lg font-bold"
              />
            </div>
            {calcPrice && (
              <div className="bg-gray-50 rounded-xl p-4 space-y-3">
                <h3 className="text-sm font-semibold text-gray-600">{t.calcResult}</h3>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-gray-500">{t.calcSalePrice}</span>
                  <span className="font-bold text-gray-800">{n(parseFloat(calcPrice))}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-sm text-red-500">{t.calcPlatformFee}</span>
                  <span className="font-bold text-red-600">- {n(calcFee)}</span>
                </div>
                <div className="border-t border-gray-200 pt-2 flex justify-between items-center">
                  <span className="text-sm font-semibold text-emerald-700">{t.calcNetEarning}</span>
                  <span className="text-xl font-extrabold text-emerald-600">{n(calcNet)}</span>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
