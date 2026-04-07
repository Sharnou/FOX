"use client";
import { useState, useEffect } from "react";

// Seller Vacation Mode Component
// Allows sellers to pause listings and set auto-reply messages when away
// Supports: AR (RTL), EN, DE
// Props: sellerId, lang, apiBase, onStatusChange

const LABELS = {
  ar: {
    title: "وضع الإجازة",
    subtitle: "أوقف إعلاناتك مؤقتًا وفعّل الرد التلقائي",
    toggle: "تفعيل وضع الإجازة",
    active: "وضع الإجازة مفعّل",
    inactive: "وضع الإجازة معطّل",
    returnDate: "تاريخ العودة",
    autoReplyLabel: "رسالة الرد التلقائي",
    autoReplyPlaceholder: "مثال: أنا في إجازة حتى ٢٠ رمضان. سأرد عليك عند عودتي إن شاء الله.",
    charCount: "حرف",
    save: "حفظ الإعدادات",
    saving: "جارٍ الحفظ...",
    saved: "تم الحفظ ✓",
    hideAds: "إخفاء إعلاناتي أثناء الإجازة",
    hideAdsDesc: "لن تظهر إعلاناتك في نتائج البحث خلال فترة الإجازة",
    autoReply: "تفعيل الرد التلقائي على الرسائل",
    autoReplyDesc: "سيتلقى المشترون رسالتك التلقائية عند مراسلتك",
    preview: "معاينة رسالة الرد",
    previewTitle: "رسالة تلقائية",
    previewFrom: "من البائع",
    daysLeft: "يوم متبقٍ",
    expired: "انتهت الإجازة",
    tips: "نصائح للإجازة",
    tip1: "أبلغ المشترين المهتمين قبل السفر",
    tip2: "فعّل إشعارات الواتساب لمتابعة الطوارئ",
    tip3: "إعلاناتك تعود تلقائيًا عند تاريخ العودة",
    status_active: "🌴 أنت في وضع الإجازة",
    status_inactive: "✅ متاح للبيع",
  },
  en: {
    title: "Vacation Mode",
    subtitle: "Pause your listings and enable auto-reply while away",
    toggle: "Enable Vacation Mode",
    active: "Vacation Mode Active",
    inactive: "Vacation Mode Off",
    returnDate: "Return Date",
    autoReplyLabel: "Auto-Reply Message",
    autoReplyPlaceholder: "e.g. I am on vacation until April 20. I will reply when I return, thank you for your patience.",
    charCount: "chars",
    save: "Save Settings",
    saving: "Saving...",
    saved: "Saved ✓",
    hideAds: "Hide my ads during vacation",
    hideAdsDesc: "Your ads won't appear in search results during your vacation",
    autoReply: "Enable auto-reply on messages",
    autoReplyDesc: "Buyers will receive your auto-reply message when they contact you",
    preview: "Preview Reply Message",
    previewTitle: "Auto-Reply",
    previewFrom: "From the seller",
    daysLeft: "days left",
    expired: "Vacation ended",
    tips: "Vacation Tips",
    tip1: "Notify interested buyers before you travel",
    tip2: "Enable WhatsApp notifications for urgent matters",
    tip3: "Your ads automatically return on your return date",
    status_active: "🌴 You are in vacation mode",
    status_inactive: "✅ Available for sale",
  },
  de: {
    title: "Urlaubsmodus",
    subtitle: "Pausiere deine Anzeigen und aktiviere Auto-Antwort",
    toggle: "Urlaubsmodus aktivieren",
    active: "Urlaubsmodus aktiv",
    inactive: "Urlaubsmodus inaktiv",
    returnDate: "Rückkehrdatum",
    autoReplyLabel: "Auto-Antwort-Nachricht",
    autoReplyPlaceholder: "z.B. Ich bin bis zum 20. April im Urlaub. Ich antworte bei meiner Rückkehr.",
    charCount: "Zeichen",
    save: "Einstellungen speichern",
    saving: "Wird gespeichert...",
    saved: "Gespeichert ✓",
    hideAds: "Meine Anzeigen während des Urlaubs ausblenden",
    hideAdsDesc: "Deine Anzeigen erscheinen nicht in Suchergebnissen während des Urlaubs",
    autoReply: "Auto-Antwort auf Nachrichten aktivieren",
    autoReplyDesc: "Käufer erhalten deine Auto-Antwort wenn sie dich kontaktieren",
    preview: "Antwort-Vorschau",
    previewTitle: "Auto-Antwort",
    previewFrom: "Vom Verkäufer",
    daysLeft: "Tage verbleibend",
    expired: "Urlaub beendet",
    tips: "Urlaubs-Tipps",
    tip1: "Benachrichtige interessierte Käufer vor der Abreise",
    tip2: "Aktiviere WhatsApp-Benachrichtigungen für dringende Fälle",
    tip3: "Deine Anzeigen kehren automatisch am Rückkehrdatum zurück",
    status_active: "🌴 Du bist im Urlaubsmodus",
    status_inactive: "✅ Verfügbar für Verkauf",
  },
};

const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

function fetchWithRetry(url, options = {}, retries = 2, timeout = 8000) {
  return new Promise((resolve, reject) => {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeout);
    fetch(url, { ...options, signal: controller.signal })
      .then((res) => { clearTimeout(timer); resolve(res); })
      .catch((err) => {
        clearTimeout(timer);
        if (retries > 0) resolve(fetchWithRetry(url, options, retries - 1, timeout));
        else reject(err);
      });
  });
}

function getDaysLeft(returnDate, lang) {
  if (!returnDate) return null;
  const now = new Date();
  const ret = new Date(returnDate);
  const diff = Math.ceil((ret - now) / (1000 * 60 * 60 * 24));
  const t = LABELS[lang] || LABELS.en;
  if (diff <= 0) return { text: t.expired, expired: true };
  const num = lang === "ar" ? toArabicNumerals(diff) : diff;
  return { text: `${num} ${t.daysLeft}`, expired: false };
}

export default function SellerVacationMode({
  sellerId,
  lang = "ar",
  apiBase = "",
  onStatusChange,
}) {
  const t = LABELS[lang] || LABELS.en;
  const isRTL = lang === "ar";
  const dir = isRTL ? "rtl" : "ltr";
  const fontClass = lang === "ar" ? "font-[Cairo,Tajawal,sans-serif]" : "font-sans";

  const storageKey = `xtox_vacation_${sellerId}`;

  const [vacationOn, setVacationOn] = useState(false);
  const [returnDate, setReturnDate] = useState("");
  const [autoReplyMsg, setAutoReplyMsg] = useState("");
  const [hideAds, setHideAds] = useState(true);
  const [autoReplyOn, setAutoReplyOn] = useState(true);
  const [showPreview, setShowPreview] = useState(false);
  const [saveState, setSaveState] = useState("idle"); // idle | saving | saved
  const [loaded, setLoaded] = useState(false);

  // Load from localStorage (fallback) or API
  useEffect(() => {
    const cached = localStorage.getItem(storageKey);
    if (cached) {
      try {
        const d = JSON.parse(cached);
        setVacationOn(d.vacationOn ?? false);
        setReturnDate(d.returnDate ?? "");
        setAutoReplyMsg(d.autoReplyMsg ?? "");
        setHideAds(d.hideAds ?? true);
        setAutoReplyOn(d.autoReplyOn ?? true);
      } catch {}
    }
    setLoaded(true);

    if (sellerId && apiBase) {
      fetchWithRetry(`${apiBase}/api/sellers/${sellerId}/vacation`)
        .then((r) => r.ok ? r.json() : null)
        .then((data) => {
          if (data) {
            setVacationOn(data.vacationOn ?? false);
            setReturnDate(data.returnDate ?? "");
            setAutoReplyMsg(data.autoReplyMsg ?? "");
            setHideAds(data.hideAds ?? true);
            setAutoReplyOn(data.autoReplyOn ?? true);
          }
        })
        .catch(() => {});
    }
  }, [sellerId, apiBase, storageKey]);

  const persist = (patch = {}) => {
    const state = { vacationOn, returnDate, autoReplyMsg, hideAds, autoReplyOn, ...patch };
    localStorage.setItem(storageKey, JSON.stringify(state));
  };

  const handleToggle = () => {
    const next = !vacationOn;
    setVacationOn(next);
    persist({ vacationOn: next });
    if (onStatusChange) onStatusChange(next);
  };

  const handleSave = async () => {
    setSaveState("saving");
    persist();
    const payload = { vacationOn, returnDate, autoReplyMsg, hideAds, autoReplyOn };
    if (sellerId && apiBase) {
      try {
        await fetchWithRetry(`${apiBase}/api/sellers/${sellerId}/vacation`, {
          method: "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      } catch {}
    }
    setSaveState("saved");
    setTimeout(() => setSaveState("idle"), 2000);
  };

  const daysLeft = getDaysLeft(returnDate, lang);
  const maxChars = 300;

  if (!loaded) return null;

  return (
    <div dir={dir} className={`w-full max-w-lg mx-auto ${fontClass}`}>
      {/* Status Banner */}
      <div
        className={`rounded-2xl p-4 mb-4 flex items-center justify-between transition-all duration-500 ${
          vacationOn
            ? "bg-amber-50 border-2 border-amber-300"
            : "bg-emerald-50 border-2 border-emerald-200"
        }`}
      >
        <div>
          <p className={`font-bold text-lg ${vacationOn ? "text-amber-700" : "text-emerald-700"}`}>
            {vacationOn ? t.status_active : t.status_inactive}
          </p>
          {vacationOn && daysLeft && (
            <p className={`text-sm mt-1 ${daysLeft.expired ? "text-red-500" : "text-amber-600"}`}>
              {daysLeft.text}
            </p>
          )}
        </div>
        {/* Toggle Switch */}
        <button
          onClick={handleToggle}
          aria-label={t.toggle}
          aria-pressed={vacationOn}
          className={`relative w-14 h-8 rounded-full transition-colors duration-300 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            vacationOn
              ? "bg-amber-400 focus:ring-amber-400"
              : "bg-gray-300 focus:ring-gray-400"
          }`}
        >
          <span
            className={`absolute top-1 w-6 h-6 rounded-full bg-white shadow-md transition-transform duration-300 ${
              isRTL
                ? vacationOn ? "translate-x-1" : "-translate-x-6"
                : vacationOn ? "translate-x-7" : "translate-x-1"
            }`}
          />
        </button>
      </div>

      {/* Settings Card */}
      <div className="rounded-2xl border border-gray-200 bg-white shadow-sm p-5 space-y-5">
        <div>
          <h2 className="text-xl font-bold text-gray-800">{t.title}</h2>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>

        {/* Return Date */}
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">
            {t.returnDate}
          </label>
          <input
            type="date"
            value={returnDate}
            onChange={(e) => { setReturnDate(e.target.value); persist({ returnDate: e.target.value }); }}
            min={new Date().toISOString().split("T")[0]}
            dir="ltr"
            className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-amber-400"
          />
        </div>

        {/* Hide Ads Toggle */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={hideAds}
            onChange={(e) => { setHideAds(e.target.checked); persist({ hideAds: e.target.checked }); }}
            className="mt-1 w-4 h-4 rounded accent-amber-500"
          />
          <div>
            <p className="text-sm font-semibold text-gray-700">{t.hideAds}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.hideAdsDesc}</p>
          </div>
        </label>

        {/* Auto Reply Toggle */}
        <label className="flex items-start gap-3 cursor-pointer select-none">
          <input
            type="checkbox"
            checked={autoReplyOn}
            onChange={(e) => { setAutoReplyOn(e.target.checked); persist({ autoReplyOn: e.target.checked }); }}
            className="mt-1 w-4 h-4 rounded accent-amber-500"
          />
          <div>
            <p className="text-sm font-semibold text-gray-700">{t.autoReply}</p>
            <p className="text-xs text-gray-500 mt-0.5">{t.autoReplyDesc}</p>
          </div>
        </label>

        {/* Auto Reply Message */}
        {autoReplyOn && (
          <div>
            <label className="block text-sm font-semibold text-gray-700 mb-1">
              {t.autoReplyLabel}
            </label>
            <textarea
              value={autoReplyMsg}
              onChange={(e) => {
                if (e.target.value.length <= maxChars) {
                  setAutoReplyMsg(e.target.value);
                  persist({ autoReplyMsg: e.target.value });
                }
              }}
              placeholder={t.autoReplyPlaceholder}
              rows={3}
              dir={dir}
              className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-amber-400"
            />
            <div className={`flex justify-between mt-1 text-xs text-gray-400 ${isRTL ? "flex-row-reverse" : ""}`}>
              <button
                type="button"
                onClick={() => setShowPreview(!showPreview)}
                className="text-amber-600 hover:underline"
              >
                {t.preview}
              </button>
              <span>
                {lang === "ar"
                  ? `${toArabicNumerals(autoReplyMsg.length)} / ${toArabicNumerals(maxChars)} ${t.charCount}`
                  : `${autoReplyMsg.length} / ${maxChars} ${t.charCount}`}
              </span>
            </div>

            {/* Preview Bubble */}
            {showPreview && autoReplyMsg && (
              <div
                dir={dir}
                className={`mt-3 rounded-2xl bg-amber-50 border border-amber-200 p-4 ${isRTL ? "rounded-tl-sm" : "rounded-tr-sm"}`}
              >
                <p className="text-xs font-bold text-amber-700 mb-1">{t.previewFrom} · {t.previewTitle}</p>
                <p className="text-sm text-gray-700 leading-relaxed">{autoReplyMsg}</p>
              </div>
            )}
          </div>
        )}

        {/* Tips */}
        <div className="bg-blue-50 rounded-xl p-4">
          <p className="text-sm font-bold text-blue-700 mb-2">💡 {t.tips}</p>
          <ul className={`space-y-1 ${isRTL ? "pr-4" : "pl-4"} list-disc`}>
            <li className="text-xs text-blue-600">{t.tip1}</li>
            <li className="text-xs text-blue-600">{t.tip2}</li>
            <li className="text-xs text-blue-600">{t.tip3}</li>
          </ul>
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          disabled={saveState === "saving"}
          className={`w-full py-3 rounded-xl font-bold text-sm transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 ${
            saveState === "saved"
              ? "bg-emerald-500 text-white focus:ring-emerald-400"
              : "bg-amber-500 hover:bg-amber-600 text-white focus:ring-amber-400"
          } disabled:opacity-60`}
        >
          {saveState === "saving" ? t.saving : saveState === "saved" ? t.saved : t.save}
        </button>
      </div>
    </div>
  );
}
