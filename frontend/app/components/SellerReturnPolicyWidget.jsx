"use client";
import { useState, useEffect } from "react";

const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

const TRANSLATIONS = {
  ar: {
    title: "سياسة الإرجاع والاستبدال",
    noPolicy: "لم يحدد البائع سياسة إرجاع بعد",
    returnAccepted: "الإرجاع مقبول",
    returnNotAccepted: "لا يقبل الإرجاع",
    exchangeAccepted: "الاستبدال مقبول",
    exchangeNotAccepted: "لا يقبل الاستبدال",
    withinDays: "خلال",
    days: "أيام",
    conditions: "شروط",
    edit: "تعديل السياسة",
    save: "حفظ",
    cancel: "إلغاء",
    returnPeriod: "مدة الإرجاع (أيام)",
    allowReturns: "قبول الإرجاع",
    allowExchange: "قبول الاستبدال",
    conditionsPlaceholder: "أي شروط أو ملاحظات (مثال: يجب أن يكون المنتج غير مستخدم)",
    policyNote: "ملاحظة: التزام البائع بهذه السياسة يبني الثقة مع المشترين",
    verified: "سياسة موثقة",
  },
  en: {
    title: "Return & Exchange Policy",
    noPolicy: "Seller has not set a return policy yet",
    returnAccepted: "Returns accepted",
    returnNotAccepted: "No returns",
    exchangeAccepted: "Exchanges accepted",
    exchangeNotAccepted: "No exchanges",
    withinDays: "Within",
    days: "days",
    conditions: "Conditions",
    edit: "Edit Policy",
    save: "Save",
    cancel: "Cancel",
    returnPeriod: "Return period (days)",
    allowReturns: "Accept Returns",
    allowExchange: "Accept Exchanges",
    conditionsPlaceholder: "Any conditions or notes (e.g. item must be unused)",
    policyNote: "Note: A clear policy builds buyer trust",
    verified: "Verified Policy",
  },
  de: {
    title: "Rückgabe & Umtausch",
    noPolicy: "Kein Rückgaberecht festgelegt",
    returnAccepted: "Rückgabe möglich",
    returnNotAccepted: "Keine Rückgabe",
    exchangeAccepted: "Umtausch möglich",
    exchangeNotAccepted: "Kein Umtausch",
    withinDays: "Innerhalb von",
    days: "Tagen",
    conditions: "Bedingungen",
    edit: "Bearbeiten",
    save: "Speichern",
    cancel: "Abbrechen",
    returnPeriod: "Rückgabefrist (Tage)",
    allowReturns: "Rückgabe erlauben",
    allowExchange: "Umtausch erlauben",
    conditionsPlaceholder: "Bedingungen (z.B. unbenutzt)",
    policyNote: "Hinweis: Klare Richtlinien stärken das Vertrauen",
    verified: "Verifizierte Richtlinie",
  },
};

export default function SellerReturnPolicyWidget({
  adId,
  isOwner = false,
  lang = "ar",
  className = "",
}) {
  const [activeLang, setActiveLang] = useState(lang);
  const tCurrent = TRANSLATIONS[activeLang] || TRANSLATIONS.ar;
  const isRTLCurrent = activeLang === "ar";
  const storageKey = `xtox_return_policy_${adId}`;

  const [policy, setPolicy] = useState(null);
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState({
    allowReturns: true,
    allowExchange: true,
    returnDays: 7,
    conditions: "",
  });

  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) setPolicy(JSON.parse(saved));
    } catch {}
  }, [storageKey]);

  const handleSave = () => {
    const newPolicy = { ...draft, savedAt: Date.now() };
    setPolicy(newPolicy);
    try {
      localStorage.setItem(storageKey, JSON.stringify(newPolicy));
    } catch {}
    setEditing(false);
  };

  const handleEdit = () => {
    if (policy) {
      setDraft({
        allowReturns: policy.allowReturns,
        allowExchange: policy.allowExchange,
        returnDays: policy.returnDays,
        conditions: policy.conditions,
      });
    }
    setEditing(true);
  };

  return (
    <div
      dir={isRTLCurrent ? "rtl" : "ltr"}
      className={`font-[Cairo,Tajawal,sans-serif] rounded-2xl overflow-hidden shadow-lg border border-violet-100 bg-white ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-4 py-3 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-white text-lg">🔄</span>
          <h3 className="text-white font-bold text-base">{tCurrent.title}</h3>
        </div>
        <div className="flex gap-1">
          {["ar", "en", "de"].map((l) => (
            <button
              key={l}
              onClick={() => setActiveLang(l)}
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all ${
                activeLang === l
                  ? "bg-white text-violet-700"
                  : "bg-violet-500/40 text-white hover:bg-violet-500/60"
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="p-4">
        {!policy && !editing ? (
          <div className="text-center py-4">
            <div className="text-4xl mb-2">📋</div>
            <p className="text-gray-500 text-sm mb-3">{tCurrent.noPolicy}</p>
            {isOwner && (
              <button
                onClick={handleEdit}
                className="bg-violet-600 text-white text-sm px-4 py-2 rounded-xl hover:bg-violet-700 transition-colors"
              >
                {tCurrent.edit}
              </button>
            )}
          </div>
        ) : editing ? (
          <div className="space-y-4">
            {/* Allow returns toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                {tCurrent.allowReturns}
              </label>
              <button
                onClick={() =>
                  setDraft((d) => ({ ...d, allowReturns: !d.allowReturns }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  draft.allowReturns ? "bg-violet-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    draft.allowReturns
                      ? isRTLCurrent
                        ? "right-0.5"
                        : "left-6"
                      : isRTLCurrent
                      ? "right-6"
                      : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Allow exchange toggle */}
            <div className="flex items-center justify-between">
              <label className="text-sm font-semibold text-gray-700">
                {tCurrent.allowExchange}
              </label>
              <button
                onClick={() =>
                  setDraft((d) => ({ ...d, allowExchange: !d.allowExchange }))
                }
                className={`w-12 h-6 rounded-full transition-colors relative ${
                  draft.allowExchange ? "bg-violet-600" : "bg-gray-300"
                }`}
              >
                <span
                  className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-all ${
                    draft.allowExchange
                      ? isRTLCurrent
                        ? "right-0.5"
                        : "left-6"
                      : isRTLCurrent
                      ? "right-6"
                      : "left-0.5"
                  }`}
                />
              </button>
            </div>

            {/* Return period slider */}
            {draft.allowReturns && (
              <div>
                <label className="text-sm font-semibold text-gray-700 block mb-1">
                  {tCurrent.returnPeriod}:{" "}
                  <span className="text-violet-600 font-bold">
                    {activeLang === "ar"
                      ? toArabicNumerals(draft.returnDays)
                      : draft.returnDays}
                  </span>
                </label>
                <input
                  type="range"
                  min={1}
                  max={30}
                  value={draft.returnDays}
                  onChange={(e) =>
                    setDraft((d) => ({
                      ...d,
                      returnDays: Number(e.target.value),
                    }))
                  }
                  className="w-full accent-violet-600"
                  dir="ltr"
                />
                <div
                  className="flex justify-between text-xs text-gray-400 mt-0.5"
                  dir="ltr"
                >
                  <span>1</span>
                  <span>30</span>
                </div>
              </div>
            )}

            {/* Conditions textarea */}
            <div>
              <label className="text-sm font-semibold text-gray-700 block mb-1">
                {tCurrent.conditions}
              </label>
              <textarea
                value={draft.conditions}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, conditions: e.target.value }))
                }
                placeholder={tCurrent.conditionsPlaceholder}
                rows={3}
                className="w-full border border-gray-200 rounded-xl p-2 text-sm focus:outline-none focus:ring-2 focus:ring-violet-400 resize-none"
                dir={isRTLCurrent ? "rtl" : "ltr"}
              />
            </div>

            <p className="text-xs text-gray-400 italic">{tCurrent.policyNote}</p>

            <div className="flex gap-2">
              <button
                onClick={handleSave}
                className="flex-1 bg-violet-600 text-white text-sm py-2 rounded-xl hover:bg-violet-700 transition-colors font-bold"
              >
                {tCurrent.save}
              </button>
              <button
                onClick={() => setEditing(false)}
                className="flex-1 bg-gray-100 text-gray-700 text-sm py-2 rounded-xl hover:bg-gray-200 transition-colors"
              >
                {tCurrent.cancel}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-1 text-emerald-600 font-bold text-xs">
              <span>✅</span>
              <span>{tCurrent.verified}</span>
            </div>

            <div className="flex flex-wrap gap-2">
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  policy.allowReturns
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {policy.allowReturns
                  ? `↩ ${tCurrent.returnAccepted}`
                  : `✗ ${tCurrent.returnNotAccepted}`}
              </span>
              <span
                className={`px-3 py-1 rounded-full text-sm font-bold ${
                  policy.allowExchange
                    ? "bg-blue-100 text-blue-700"
                    : "bg-red-100 text-red-600"
                }`}
              >
                {policy.allowExchange
                  ? `🔄 ${tCurrent.exchangeAccepted}`
                  : `✗ ${tCurrent.exchangeNotAccepted}`}
              </span>
            </div>

            {policy.allowReturns && (
              <div className="bg-violet-50 rounded-xl px-3 py-2 text-sm text-violet-800 font-semibold">
                {tCurrent.withinDays}{" "}
                <span className="font-extrabold text-violet-600">
                  {activeLang === "ar"
                    ? toArabicNumerals(policy.returnDays)
                    : policy.returnDays}
                </span>{" "}
                {tCurrent.days}
              </div>
            )}

            {policy.conditions && (
              <div>
                <p className="text-xs text-gray-500 font-semibold mb-0.5">
                  {tCurrent.conditions}:
                </p>
                <p className="text-sm text-gray-700 bg-gray-50 rounded-xl px-3 py-2">
                  {policy.conditions}
                </p>
              </div>
            )}

            {isOwner && (
              <button
                onClick={handleEdit}
                className="w-full text-center text-sm text-violet-600 hover:text-violet-800 font-semibold py-1 border border-violet-200 rounded-xl hover:bg-violet-50 transition-colors"
              >
                ✏️ {tCurrent.edit}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
