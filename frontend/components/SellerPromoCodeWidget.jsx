"use client";
import { useState, useCallback } from "react";

/* ─── Translations ─────────────────────────────────────── */
const T = {
  ar: {
    title: "كود الخصم",
    subtitle: "أنشئ كوداً ترويجياً لإعلانك",
    tabCreate: "إنشاء كود",
    tabManage: "أكوادي",
    labelCode: "الكود",
    labelType: "نوع الخصم",
    labelValue: "قيمة الخصم",
    labelExpiry: "تاريخ الانتهاء",
    labelLimit: "حد الاستخدام",
    percent: "نسبة مئوية %",
    fixed: "مبلغ ثابت",
    generate: "توليد تلقائي",
    create: "إنشاء الكود",
    copy: "نسخ",
    copied: "تم النسخ!",
    noCode: "لا توجد أكواد بعد",
    active: "نشط",
    expired: "منتهي",
    uses: "استخدام",
    of: "من",
    discount: "خصم",
    currency: "ج.م",
    codePlaceholder: "أدخل الكود أو اتركه فارغاً",
    successMsg: "✅ تم إنشاء الكود بنجاح",
    errorEmpty: "أدخل قيمة الخصم",
    errorCode: "الكود قصير جداً (3 أحرف على الأقل)",
  },
  en: {
    title: "Promo Code",
    subtitle: "Create a discount code for your listing",
    tabCreate: "Create Code",
    tabManage: "My Codes",
    labelCode: "Code",
    labelType: "Discount Type",
    labelValue: "Discount Value",
    labelExpiry: "Expiry Date",
    labelLimit: "Usage Limit",
    percent: "Percentage %",
    fixed: "Fixed Amount",
    generate: "Auto Generate",
    create: "Create Code",
    copy: "Copy",
    copied: "Copied!",
    noCode: "No codes yet",
    active: "Active",
    expired: "Expired",
    uses: "uses",
    of: "of",
    discount: "off",
    currency: "EGP",
    codePlaceholder: "Enter code or leave blank",
    successMsg: "✅ Code created successfully",
    errorEmpty: "Enter a discount value",
    errorCode: "Code too short (3+ chars)",
  },
  de: {
    title: "Promo-Code",
    subtitle: "Erstelle einen Rabattcode für dein Inserat",
    tabCreate: "Code erstellen",
    tabManage: "Meine Codes",
    labelCode: "Code",
    labelType: "Rabatt-Typ",
    labelValue: "Rabatt-Wert",
    labelExpiry: "Ablaufdatum",
    labelLimit: "Nutzungslimit",
    percent: "Prozent %",
    fixed: "Fester Betrag",
    generate: "Automatisch",
    create: "Code erstellen",
    copy: "Kopieren",
    copied: "Kopiert!",
    noCode: "Noch keine Codes",
    active: "Aktiv",
    expired: "Abgelaufen",
    uses: "Nutzungen",
    of: "von",
    discount: "Rabatt",
    currency: "EGP",
    codePlaceholder: "Code eingeben oder leer lassen",
    successMsg: "✅ Code erfolgreich erstellt",
    errorEmpty: "Rabatt-Wert eingeben",
    errorCode: "Code zu kurz (mind. 3 Zeichen)",
  },
};

/* ─── Arabic-Indic numerals ────────────────────────────── */
const toArNum = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);

/* ─── Random code generator ────────────────────────────── */
const randomCode = () =>
  Math.random().toString(36).substring(2, 8).toUpperCase();

/* ─── Storage key ──────────────────────────────────────── */
const STORAGE_KEY = "xtox_promo_codes";

const loadCodes = () => {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
  } catch {
    return [];
  }
};
const saveCodes = (codes) =>
  localStorage.setItem(STORAGE_KEY, JSON.stringify(codes));

/* ─── Main Component ────────────────────────────────────── */
export default function SellerPromoCodeWidget({
  adId = "demo",
  adTitle = "",
  lang = "ar",
  className = "",
}) {
  const isRtl = lang === "ar";
  const t = T[lang] || T.ar;

  const [tab, setTab] = useState("create");
  const [code, setCode] = useState("");
  const [discountType, setDiscountType] = useState("percent");
  const [discountValue, setDiscountValue] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [usageLimit, setUsageLimit] = useState(10);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [codes, setCodes] = useState(loadCodes);
  const [copiedId, setCopiedId] = useState(null);

  /* Create */
  const handleCreate = useCallback(() => {
    setError("");
    setSuccess("");
    const trimmed = code.trim() || randomCode();
    if (trimmed.length < 3) return setError(t.errorCode);
    if (!discountValue || isNaN(+discountValue) || +discountValue <= 0)
      return setError(t.errorEmpty);

    const newCode = {
      id: Date.now(),
      code: trimmed.toUpperCase(),
      adId,
      adTitle,
      discountType,
      discountValue: +discountValue,
      expiryDate,
      usageLimit: +usageLimit,
      usedCount: 0,
      createdAt: new Date().toISOString(),
    };
    const updated = [newCode, ...loadCodes()];
    saveCodes(updated);
    setCodes(updated);
    setCode("");
    setDiscountValue("");
    setSuccess(t.successMsg);
    setTimeout(() => setSuccess(""), 3000);
    setTab("manage");
  }, [code, discountType, discountValue, expiryDate, usageLimit, adId, adTitle, t]);

  /* Copy */
  const handleCopy = useCallback((item) => {
    navigator.clipboard.writeText(item.code).catch(() => {});
    setCopiedId(item.id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  /* Is expired */
  const isExpired = (item) =>
    item.expiryDate && new Date(item.expiryDate) < new Date();

  const adCodes = codes.filter((c) => c.adId === adId);

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-md overflow-hidden border border-violet-100 ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-violet-800 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg">{t.title}</h2>
            <p className="text-violet-200 text-xs mt-0.5">{t.subtitle}</p>
          </div>
          {/* Lang switcher */}
          <div className="flex gap-1">
            {["ar", "en", "de"].map((l) => (
              <button
                key={l}
                onClick={() => {}}
                className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-colors ${
                  lang === l
                    ? "bg-white text-violet-700"
                    : "bg-violet-700 text-violet-200 hover:bg-violet-600"
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {/* Tabs */}
        <div className="flex gap-2 mt-3">
          {["create", "manage"].map((tb) => (
            <button
              key={tb}
              onClick={() => setTab(tb)}
              className={`flex-1 py-1.5 rounded-xl text-sm font-semibold transition-colors ${
                tab === tb
                  ? "bg-white text-violet-700"
                  : "bg-violet-700 text-violet-200 hover:bg-violet-600"
              }`}
            >
              {tb === "create" ? t.tabCreate : t.tabManage}
              {tb === "manage" && adCodes.length > 0 && (
                <span className="ms-1 bg-rose-500 text-white rounded-full text-xs px-1.5">
                  {isRtl ? toArNum(adCodes.length) : adCodes.length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Body */}
      <div className="p-5">
        {/* ── Create Tab ── */}
        {tab === "create" && (
          <div className="space-y-4">
            {/* Code input */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t.labelCode}
              </label>
              <div className="flex gap-2">
                <input
                  value={code}
                  onChange={(e) => setCode(e.target.value.toUpperCase())}
                  placeholder={t.codePlaceholder}
                  maxLength={16}
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 font-mono tracking-widest"
                />
                <button
                  onClick={() => setCode(randomCode())}
                  className="px-3 py-2 bg-violet-100 text-violet-700 rounded-xl text-xs font-semibold hover:bg-violet-200 transition-colors whitespace-nowrap"
                >
                  {t.generate}
                </button>
              </div>
            </div>

            {/* Discount type */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t.labelType}
              </label>
              <div className="grid grid-cols-2 gap-2">
                {["percent", "fixed"].map((dt) => (
                  <button
                    key={dt}
                    onClick={() => setDiscountType(dt)}
                    className={`py-2 rounded-xl text-sm font-semibold border-2 transition-colors ${
                      discountType === dt
                        ? "border-violet-500 bg-violet-50 text-violet-700"
                        : "border-gray-200 text-gray-500 hover:border-violet-300"
                    }`}
                  >
                    {dt === "percent" ? t.percent : t.fixed}
                  </button>
                ))}
              </div>
            </div>

            {/* Discount value */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t.labelValue}{" "}
                {discountType === "percent" ? "(%)" : `(${t.currency})`}
              </label>
              <input
                type="number"
                min="1"
                max={discountType === "percent" ? 99 : undefined}
                value={discountValue}
                onChange={(e) => setDiscountValue(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            {/* Expiry */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t.labelExpiry}
              </label>
              <input
                type="date"
                value={expiryDate}
                onChange={(e) => setExpiryDate(e.target.value)}
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400"
              />
            </div>

            {/* Usage limit */}
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">
                {t.labelLimit}: {isRtl ? toArNum(usageLimit) : usageLimit}
              </label>
              <input
                type="range"
                min="1"
                max="100"
                value={usageLimit}
                onChange={(e) => setUsageLimit(+e.target.value)}
                className="w-full accent-violet-500"
              />
              <div className="flex justify-between text-xs text-gray-400 mt-0.5">
                <span>{isRtl ? toArNum(1) : 1}</span>
                <span>{isRtl ? toArNum(100) : 100}</span>
              </div>
            </div>

            {/* Errors / Success */}
            {error && (
              <p className="text-rose-600 text-sm font-semibold">{error}</p>
            )}
            {success && (
              <p className="text-emerald-600 text-sm font-semibold">{success}</p>
            )}

            <button
              onClick={handleCreate}
              className="w-full bg-violet-600 hover:bg-violet-700 text-white font-bold py-3 rounded-xl transition-colors text-sm"
            >
              {t.create}
            </button>
          </div>
        )}

        {/* ── Manage Tab ── */}
        {tab === "manage" && (
          <div className="space-y-3">
            {adCodes.length === 0 ? (
              <p className="text-center text-gray-400 py-6 text-sm">
                {t.noCode}
              </p>
            ) : (
              adCodes.map((item) => {
                const expired = isExpired(item);
                const usedDisplay = isRtl
                  ? `${toArNum(item.usedCount)} ${t.of} ${toArNum(item.usageLimit)}`
                  : `${item.usedCount} ${t.of} ${item.usageLimit}`;
                const discountLabel =
                  item.discountType === "percent"
                    ? `${isRtl ? toArNum(item.discountValue) : item.discountValue}%`
                    : `${isRtl ? toArNum(item.discountValue) : item.discountValue} ${t.currency}`;
                return (
                  <div
                    key={item.id}
                    className="border border-gray-100 rounded-xl p-3 hover:bg-violet-50 transition-colors"
                  >
                    <div className="flex items-center justify-between gap-2">
                      {/* Code badge */}
                      <span className="font-mono font-bold text-violet-700 bg-violet-100 px-3 py-1 rounded-lg text-sm tracking-widest">
                        {item.code}
                      </span>
                      {/* Status */}
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          expired
                            ? "bg-gray-100 text-gray-400"
                            : "bg-emerald-100 text-emerald-700"
                        }`}
                      >
                        {expired ? t.expired : t.active}
                      </span>
                    </div>
                    <div className="flex items-center gap-3 mt-2 text-xs text-gray-500">
                      <span>
                        🏷 {discountLabel} {t.discount}
                      </span>
                      <span>
                        👥 {usedDisplay} {t.uses}
                      </span>
                      {item.expiryDate && (
                        <span>
                          📅{" "}
                          {new Date(item.expiryDate).toLocaleDateString(
                            lang === "ar" ? "ar-EG" : lang === "de" ? "de-DE" : "en-US"
                          )}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleCopy(item)}
                      className="mt-2 w-full border border-violet-300 text-violet-700 rounded-lg py-1.5 text-xs font-semibold hover:bg-violet-100 transition-colors"
                    >
                      {copiedId === item.id ? t.copied : t.copy}
                    </button>
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
}
