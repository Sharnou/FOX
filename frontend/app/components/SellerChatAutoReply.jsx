// SellerChatAutoReply.jsx
// XTOX Marketplace — Seller Chat Auto-Reply Manager
// Sets automatic offline reply messages for sellers (e.g. during prayer times)
// Tri-lingual: Arabic (RTL), English, German | Cairo/Tajawal fonts | Tailwind only

"use client";
import { useState } from "react";

const TRANSLATIONS = {
  ar: {
    title: "الرد التلقائي على المحادثات",
    subtitle: "يُرسَل تلقائياً عند تواصل المشترين أثناء غيابك",
    enable: "تفعيل الرد التلقائي",
    disable: "إيقاف الرد التلقائي",
    messagePlaceholder: "اكتب رسالتك التلقائية هنا...",
    defaultMsg: "شكراً لتواصلك! سأرد عليك في أقرب وقت ممكن إن شاء الله 🙏",
    save: "حفظ الإعدادات",
    saved: "تم الحفظ ✓",
    presets: "رسائل جاهزة",
    charCount: "حرف",
    maxChars: "الحد الأقصى 200 حرف",
    presetsList: [
      "سأرد بعد صلاة العصر إن شاء الله ⏰",
      "المنتج متاح، تواصل معي الآن 📦",
      "شكراً! سأرد خلال ساعة إن شاء الله 🙏",
      "أنا خارج حالياً، سأرد عند عودتي 🏃",
    ],
    status: "الحالة",
    active: "مفعّل",
    inactive: "موقوف",
    preview: "معاينة الرسالة",
    prayerNote: "💡 مفيد أثناء أوقات الصلاة والاجتماعات",
  },
  en: {
    title: "Chat Auto-Reply",
    subtitle: "Sent automatically when buyers message you while you're away",
    enable: "Enable Auto-Reply",
    disable: "Disable Auto-Reply",
    messagePlaceholder: "Type your auto-reply message here...",
    defaultMsg: "Thanks for reaching out! I'll reply as soon as possible 🙏",
    save: "Save Settings",
    saved: "Saved ✓",
    presets: "Quick Presets",
    charCount: "chars",
    maxChars: "Max 200 characters",
    presetsList: [
      "I'll reply after Asr prayer ⏰",
      "Item available, contact me now 📦",
      "Thanks! I'll reply within an hour 🙏",
      "I'm out, will reply when back 🏃",
    ],
    status: "Status",
    active: "Active",
    inactive: "Inactive",
    preview: "Message Preview",
    prayerNote: "💡 Useful during prayer times and meetings",
  },
  de: {
    title: "Chat-Automatische Antwort",
    subtitle: "Wird automatisch gesendet, wenn Käufer Sie kontaktieren",
    enable: "Auto-Antwort aktivieren",
    disable: "Auto-Antwort deaktivieren",
    messagePlaceholder: "Ihre automatische Antwort...",
    defaultMsg: "Danke für Ihre Nachricht! Ich antworte so schnell wie möglich 🙏",
    save: "Einstellungen speichern",
    saved: "Gespeichert ✓",
    presets: "Schnellvorlagen",
    charCount: "Zeichen",
    maxChars: "Max. 200 Zeichen",
    presetsList: [
      "Ich antworte nach dem Gebet ⏰",
      "Artikel verfügbar, kontaktieren Sie mich 📦",
      "Ich antworte innerhalb einer Stunde 🙏",
      "Ich bin unterwegs, antworte bald 🏃",
    ],
    status: "Status",
    active: "Aktiv",
    inactive: "Inaktiv",
    preview: "Nachrichtenvorschau",
    prayerNote: "💡 Nützlich während der Gebetszeiten",
  },
};

// Arabic-Indic numeral converter
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

const MAX_MSG_LENGTH = 200;

export default function SellerChatAutoReply({
  lang = "ar",
  initialEnabled = false,
  initialMessage = "",
  onSave,
}) {
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === "ar";
  const [enabled, setEnabled] = useState(initialEnabled);
  const [message, setMessage] = useState(
    initialMessage || t.defaultMsg
  );
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave && onSave({ enabled, message });
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  const applyPreset = (preset) => {
    setMessage(preset);
    setSaved(false);
  };

  const charLeft = MAX_MSG_LENGTH - message.length;

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={'font-' + (isRTL ? "['Cairo','Tajawal',sans-serif']" : "sans") + ' bg-white rounded-2xl shadow-lg p-5 max-w-md w-full mx-auto border border-gray-100'}
      style={{ fontFamily: isRTL ? "'Cairo','Tajawal',sans-serif" : "inherit" }}
    >
      {/* Header */}
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-full bg-emerald-100 flex items-center justify-center text-xl">
          💬
        </div>
        <div>
          <h2 className="text-base font-bold text-gray-800">{t.title}</h2>
          <p className="text-xs text-gray-400">{t.subtitle}</p>
        </div>
      </div>

      {/* Toggle */}
      <div className="flex items-center justify-between bg-gray-50 rounded-xl px-4 py-3 mb-4">
        <div className="flex items-center gap-2">
          <span
            className={'inline-block w-2.5 h-2.5 rounded-full ' + (enabled ? "bg-emerald-500" : "bg-gray-300")}
          />
          <span className="text-sm font-medium text-gray-700">
            {t.status}:{" "}
            <span
              className={enabled ? "text-emerald-600" : "text-gray-400"}
            >
              {enabled ? t.active : t.inactive}
            </span>
          </span>
        </div>
        <button
          onClick={() => setEnabled((v) => !v)}
          className={'relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none ' + (enabled ? "bg-emerald-500" : "bg-gray-200")}
          aria-label="toggle auto-reply"
        >
          <span
            className={'inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform duration-200 ' + (enabled
                ? isRTL
                  ? "-translate-x-6"
                  : "translate-x-6"
                : isRTL
                ? "-translate-x-1"
                : "translate-x-1")}
          />
        </button>
      </div>

      {/* Presets */}
      <div className="mb-3">
        <p className="text-xs font-semibold text-gray-500 mb-2">{t.presets}</p>
        <div className="flex flex-wrap gap-2">
          {t.presetsList.map((preset, i) => (
            <button
              key={i}
              onClick={() => applyPreset(preset)}
              className="text-xs bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-full px-3 py-1 hover:bg-emerald-100 transition-colors"
            >
              {preset}
            </button>
          ))}
        </div>
      </div>

      {/* Message Textarea */}
      <div className="mb-1">
        <label className="text-xs font-semibold text-gray-500 mb-1 block">
          {t.preview}
        </label>
        <textarea
          value={message}
          onChange={(e) => {
            if (e.target.value.length <= MAX_MSG_LENGTH) setMessage(e.target.value);
          }}
          placeholder={t.messagePlaceholder}
          rows={3}
          className="w-full border border-gray-200 rounded-xl p-3 text-sm text-gray-800 resize-none focus:outline-none focus:ring-2 focus:ring-emerald-300 bg-gray-50"
          dir={isRTL ? "rtl" : "ltr"}
        />
      </div>

      {/* Char counter */}
      <div
        className={'flex justify-' + (isRTL ? "start" : "end") + ' mb-3'}
      >
        <span
          className={'text-xs ' + (charLeft < 20 ? "text-red-400" : "text-gray-400")}
        >
          {isRTL
            ? (toArabicIndic(message.length)) + ' / ' + (toArabicIndic(MAX_MSG_LENGTH)) + ' ' + (t.charCount)
            : (message.length) + ' / ' + (MAX_MSG_LENGTH) + ' ' + (t.charCount)}
        </span>
      </div>

      {/* Prayer note */}
      <p className="text-xs text-amber-600 bg-amber-50 rounded-lg px-3 py-2 mb-4">
        {t.prayerNote}
      </p>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={!enabled && !saved}
        className={'w-full py-2.5 rounded-xl text-sm font-bold transition-all duration-200 ' + (saved
            ? "bg-emerald-500 text-white"
            : enabled
            ? "bg-emerald-600 hover:bg-emerald-700 text-white"
            : "bg-gray-200 text-gray-400 cursor-not-allowed")}
      >
        {saved ? t.saved : enabled ? t.save : t.disable}
      </button>
    </div>
  );
}
