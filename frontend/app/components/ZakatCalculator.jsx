"use client";
import { useState, useMemo } from "react";

const TRANSLATIONS = {
  ar: {
    title: "حاسبة الزكاة",
    subtitle: "احسب زكاة مالك وبضائعك",
    nisabLabel: "النصاب (معيار الذهب)",
    nisabGold: "ذهب (85 جم)",
    nisabSilver: "فضة (595 جم)",
    cashLabel: "النقد والمدخرات",
    goodsLabel: "قيمة البضائع والمخزون",
    goldLabel: "قيمة الذهب المملوك",
    silverLabel: "قيمة الفضة المملوكة",
    debtsLabel: "الديون المستحقة لك",
    liabilitiesLabel: "الديون عليك",
    goldPriceLabel: "سعر الذهب (جرام)",
    silverPriceLabel: "سعر الفضة (جرام)",
    calculate: "احسب الزكاة",
    result: "نتيجة الزكاة",
    totalAssets: "إجمالي الأصول",
    netZakatable: "الصافي الخاضع للزكاة",
    nisabThreshold: "حد النصاب",
    zakatDue: "الزكاة المستحقة (2.5%)",
    eligible: "أنت مؤهل لدفع الزكاة",
    notEligible: "لا تجب عليك الزكاة (أقل من النصاب)",
    reset: "إعادة تعيين",
    note: "ملاحظة: هذه الحاسبة للإرشاد فقط. استشر عالمًا دينيًا للتأكد.",
    haul: "تأكد من مرور حول كامل (سنة قمرية) على هذا المال",
    goldNisabInfo: "النصاب بالذهب: 85 جرام × سعر الجرام",
    silverNisabInfo: "النصاب بالفضة: 595 جرام × سعر الجرام",
  },
  en: {
    title: "Zakat Calculator",
    subtitle: "Calculate Zakat on your wealth and goods",
    nisabLabel: "Nisab Standard",
    nisabGold: "Gold (85g)",
    nisabSilver: "Silver (595g)",
    cashLabel: "Cash & Savings",
    goodsLabel: "Trade Goods & Inventory Value",
    goldLabel: "Gold Owned Value",
    silverLabel: "Silver Owned Value",
    debtsLabel: "Debts Owed to You",
    liabilitiesLabel: "Debts You Owe",
    goldPriceLabel: "Gold Price (per gram)",
    silverPriceLabel: "Silver Price (per gram)",
    calculate: "Calculate Zakat",
    result: "Zakat Result",
    totalAssets: "Total Assets",
    netZakatable: "Net Zakatable Amount",
    nisabThreshold: "Nisab Threshold",
    zakatDue: "Zakat Due (2.5%)",
    eligible: "You are eligible to pay Zakat",
    notEligible: "Zakat not due (below Nisab threshold)",
    reset: "Reset",
    note: "Note: This calculator is for guidance only. Consult a scholar for certainty.",
    haul: "Ensure a full lunar year (Haul) has passed on this wealth",
    goldNisabInfo: "Gold Nisab: 85g × price per gram",
    silverNisabInfo: "Silver Nisab: 595g × price per gram",
  },
  de: {
    title: "Zakat-Rechner",
    subtitle: "Berechnen Sie Zakat auf Ihr Vermögen und Waren",
    nisabLabel: "Nisab-Standard",
    nisabGold: "Gold (85g)",
    nisabSilver: "Silber (595g)",
    cashLabel: "Bargeld & Ersparnisse",
    goodsLabel: "Handelswaren & Lagerbestand",
    goldLabel: "Goldwert (eigener Besitz)",
    silverLabel: "Silberwert (eigener Besitz)",
    debtsLabel: "Forderungen an Sie",
    liabilitiesLabel: "Ihre Schulden",
    goldPriceLabel: "Goldpreis (pro Gramm)",
    silverPriceLabel: "Silberpreis (pro Gramm)",
    calculate: "Zakat berechnen",
    result: "Zakat-Ergebnis",
    totalAssets: "Gesamtvermögen",
    netZakatable: "Netto Zakatable Betrag",
    nisabThreshold: "Nisab-Schwelle",
    zakatDue: "Zakat fällig (2,5%)",
    eligible: "Sie sind verpflichtet, Zakat zu zahlen",
    notEligible: "Keine Zakat fällig (unter Nisab-Schwelle)",
    reset: "Zurücksetzen",
    note: "Hinweis: Dieser Rechner dient nur zur Orientierung. Konsultieren Sie einen Gelehrten.",
    haul: "Stellen Sie sicher, dass ein vollständiges Mondjahr vergangen ist",
    goldNisabInfo: "Gold-Nisab: 85g × Preis pro Gramm",
    silverNisabInfo: "Silber-Nisab: 595g × Preis pro Gramm",
  },
};

const CURRENCY_DEFAULTS = {
  EGP: { gold: 4800, silver: 60, symbol: "ج.م" },
  SAR: { gold: 340, silver: 4.2, symbol: "ر.س" },
  AED: { gold: 335, silver: 4.1, symbol: "د.إ" },
  KWD: { gold: 280, silver: 3.5, symbol: "د.ك" },
  USD: { gold: 98, silver: 1.2, symbol: "$" },
};

function toArabicNumerals(num, lang) {
  if (lang !== "ar") return num;
  return String(num).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function formatAmount(val, currency, lang) {
  const sym = CURRENCY_DEFAULTS[currency]?.symbol || currency;
  const formatted = Number(val).toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
  const num = toArabicNumerals(formatted, lang);
  return lang === "ar" ? `${num} ${sym}` : `${sym} ${num}`;
}

export default function ZakatCalculator({ lang = "ar", currency = "EGP", className = "" }) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === "ar";
  const defaults = CURRENCY_DEFAULTS[currency] || CURRENCY_DEFAULTS.EGP;

  const [activeLang, setActiveLang] = useState(lang);
  const [activeCurrency, setActiveCurrency] = useState(currency);
  const [nisabType, setNisabType] = useState("gold");
  const [goldPrice, setGoldPrice] = useState(defaults.gold);
  const [silverPrice, setSilverPrice] = useState(defaults.silver);
  const [cash, setCash] = useState("");
  const [goods, setGoods] = useState("");
  const [gold, setGold] = useState("");
  const [silver, setSilver] = useState("");
  const [debts, setDebts] = useState("");
  const [liabilities, setLiabilities] = useState("");
  const [showResult, setShowResult] = useState(false);

  const tl = TRANSLATIONS[activeLang] || TRANSLATIONS.ar;
  const isRTLActive = activeLang === "ar";
  const curr = CURRENCY_DEFAULTS[activeCurrency] || CURRENCY_DEFAULTS.EGP;

  const nisabValue = useMemo(() => {
    if (nisabType === "gold") return 85 * goldPrice;
    return 595 * silverPrice;
  }, [nisabType, goldPrice, silverPrice]);

  const totalAssets = useMemo(() => {
    return (
      (parseFloat(cash) || 0) +
      (parseFloat(goods) || 0) +
      (parseFloat(gold) || 0) +
      (parseFloat(silver) || 0) +
      (parseFloat(debts) || 0)
    );
  }, [cash, goods, gold, silver, debts]);

  const netZakatable = useMemo(() => {
    const net = totalAssets - (parseFloat(liabilities) || 0);
    return Math.max(0, net);
  }, [totalAssets, liabilities]);

  const isEligible = netZakatable >= nisabValue;
  const zakatDue = isEligible ? netZakatable * 0.025 : 0;

  const handleCalculate = () => setShowResult(true);
  const handleReset = () => {
    setCash(""); setGoods(""); setGold(""); setSilver("");
    setDebts(""); setLiabilities("");
    setShowResult(false);
  };

  const inputCls =
    "w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-400 bg-white";

  return (
    <div
      dir={isRTLActive ? "rtl" : "ltr"}
      className={`rounded-2xl overflow-hidden shadow-lg font-[Cairo,Tajawal,sans-serif] max-w-lg mx-auto ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-700 via-green-600 to-yellow-500 p-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-2">
            <span className="text-2xl">🌙</span>
            <h2 className="text-lg font-bold">{tl.title}</h2>
          </div>
          {/* Lang switcher */}
          <div className="flex gap-1 text-xs">
            {["ar", "en", "de"].map((l) => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`px-2 py-1 rounded-full font-bold transition-all ${
                  activeLang === l
                    ? "bg-white text-emerald-700"
                    : "bg-white/20 hover:bg-white/30"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        <p className="text-xs text-white/80">{tl.subtitle}</p>
      </div>

      <div className="bg-gray-50 p-4 space-y-4">
        {/* Currency & Nisab selector */}
        <div className="flex gap-2 flex-wrap">
          <div className="flex-1 min-w-[120px]">
            <label className="block text-xs text-gray-500 mb-1">{tl.nisabLabel}</label>
            <div className="flex gap-1">
              <button
                onClick={() => setNisabType("gold")}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg border font-semibold transition-all ${
                  nisabType === "gold"
                    ? "bg-yellow-500 text-white border-yellow-500"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                🥇 {tl.nisabGold}
              </button>
              <button
                onClick={() => setNisabType("silver")}
                className={`flex-1 text-xs py-1.5 px-2 rounded-lg border font-semibold transition-all ${
                  nisabType === "silver"
                    ? "bg-gray-400 text-white border-gray-400"
                    : "bg-white text-gray-600 border-gray-200"
                }`}
              >
                🥈 {tl.nisabSilver}
              </button>
            </div>
          </div>
          <div className="min-w-[100px]">
            <label className="block text-xs text-gray-500 mb-1">العملة</label>
            <select
              value={activeCurrency}
              onChange={(e) => {
                setActiveCurrency(e.target.value);
                const d = CURRENCY_DEFAULTS[e.target.value];
                if (d) { setGoldPrice(d.gold); setSilverPrice(d.silver); }
              }}
              className="w-full border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white"
            >
              {Object.keys(CURRENCY_DEFAULTS).map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Nisab info */}
        <div className="bg-emerald-50 rounded-xl p-3 text-xs text-emerald-700 border border-emerald-100 flex items-center gap-2">
          <span className="text-lg">📊</span>
          <div>
            <p className="font-semibold">
              {tl.nisabLabel}: {formatAmount(nisabValue.toFixed(2), activeCurrency, activeLang)}
            </p>
            <p className="text-emerald-600 mt-0.5">
              {nisabType === "gold" ? tl.goldNisabInfo : tl.silverNisabInfo}
            </p>
          </div>
        </div>

        {/* Price inputs */}
        <div className="grid grid-cols-2 gap-2">
          <div>
            <label className="block text-xs text-gray-500 mb-1">{tl.goldPriceLabel}</label>
            <input
              type="number"
              value={goldPrice}
              onChange={(e) => setGoldPrice(parseFloat(e.target.value) || 0)}
              className={inputCls}
              min="0"
            />
          </div>
          <div>
            <label className="block text-xs text-gray-500 mb-1">{tl.silverPriceLabel}</label>
            <input
              type="number"
              value={silverPrice}
              onChange={(e) => setSilverPrice(parseFloat(e.target.value) || 0)}
              className={inputCls}
              min="0"
            />
          </div>
        </div>

        {/* Asset inputs */}
        <div className="space-y-2">
          {[
            { label: tl.cashLabel, value: cash, setter: setCash, icon: "💵" },
            { label: tl.goodsLabel, value: goods, setter: setGoods, icon: "📦" },
            { label: tl.goldLabel, value: gold, setter: setGold, icon: "🥇" },
            { label: tl.silverLabel, value: silver, setter: setSilver, icon: "🥈" },
            { label: tl.debtsLabel, value: debts, setter: setDebts, icon: "📋" },
          ].map(({ label, value, setter, icon }) => (
            <div key={label} className="flex items-center gap-2">
              <span className="text-base w-6 text-center">{icon}</span>
              <div className="flex-1">
                <label className="block text-xs text-gray-500 mb-0.5">{label}</label>
                <input
                  type="number"
                  value={value}
                  onChange={(e) => { setter(e.target.value); setShowResult(false); }}
                  placeholder="0"
                  className={inputCls}
                  min="0"
                />
              </div>
            </div>
          ))}
          <div className="flex items-center gap-2">
            <span className="text-base w-6 text-center">➖</span>
            <div className="flex-1">
              <label className="block text-xs text-red-500 mb-0.5">{tl.liabilitiesLabel}</label>
              <input
                type="number"
                value={liabilities}
                onChange={(e) => { setLiabilities(e.target.value); setShowResult(false); }}
                placeholder="0"
                className="w-full border border-red-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-300 bg-white"
                min="0"
              />
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex gap-2">
          <button
            onClick={handleCalculate}
            className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-sm transition-all shadow-md shadow-emerald-100 active:scale-95"
          >
            {tl.calculate}
          </button>
          <button
            onClick={handleReset}
            className="px-4 bg-gray-200 hover:bg-gray-300 text-gray-700 font-semibold py-2.5 rounded-xl text-sm transition-all"
          >
            {tl.reset}
          </button>
        </div>

        {/* Result */}
        {showResult && (
          <div className={`rounded-xl overflow-hidden border-2 ${isEligible ? "border-emerald-400" : "border-gray-300"}`}>
            <div className={`p-3 text-white text-center font-bold text-sm ${isEligible ? "bg-emerald-600" : "bg-gray-400"}`}>
              {isEligible ? "✅ " : "ℹ️ "}{tl.result}
            </div>
            <div className="bg-white p-4 space-y-2">
              {[
                { label: tl.totalAssets, value: formatAmount(totalAssets.toFixed(2), activeCurrency, activeLang), color: "text-gray-700" },
                { label: tl.netZakatable, value: formatAmount(netZakatable.toFixed(2), activeCurrency, activeLang), color: "text-gray-700" },
                { label: tl.nisabThreshold, value: formatAmount(nisabValue.toFixed(2), activeCurrency, activeLang), color: "text-yellow-600" },
                { label: tl.zakatDue, value: formatAmount(zakatDue.toFixed(2), activeCurrency, activeLang), color: isEligible ? "text-emerald-600 font-bold text-base" : "text-gray-400" },
              ].map(({ label, value, color }) => (
                <div key={label} className="flex justify-between items-center border-b border-gray-100 pb-1.5 last:border-0">
                  <span className="text-xs text-gray-500">{label}</span>
                  <span className={`text-sm font-semibold ${color}`}>{value}</span>
                </div>
              ))}
              <div className={`mt-2 text-center text-sm font-bold py-2 rounded-lg ${isEligible ? "bg-emerald-50 text-emerald-700" : "bg-gray-50 text-gray-500"}`}>
                {isEligible ? "🌙 " + tl.eligible : "ℹ️ " + tl.notEligible}
              </div>
            </div>
          </div>
        )}

        {/* Haul reminder & note */}
        <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs text-amber-700 flex gap-2">
          <span>⏳</span>
          <p>{tl.haul}</p>
        </div>
        <p className="text-xs text-gray-400 text-center">{tl.note}</p>
      </div>
    </div>
  );
}
