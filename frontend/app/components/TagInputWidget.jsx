"use client";
import { useState, useRef, useEffect } from "react";

// Category-specific tag suggestions (Arabic + transliteration friendly)
const CATEGORY_TAGS = {
  electronics: ["آيفون", "سامسونج", "لاب توب", "شاشة", "بلايستيشن", "آيباد", "سماعات", "كاميرا", "راوتر", "تلفزيون"],
  vehicles: ["تويوتا", "هيونداي", "رخصة", "أوتوماتيك", "خليجي", "بدون حوادث", "كامل الأوراق", "بنزين", "ديزل"],
  furniture: ["عرسان", "خشب طبيعي", "مستورد", "كنب", "غرفة نوم", "مطبخ", "أنتيك", "حديث"],
  fashion: ["ماركة", "جديد بالكرتون", "للبيع", "أصلي", "نسائي", "أطفال", "رجالي", "لبسة واحدة"],
  realestate: ["مفروش", "فيلا", "شقة", "قريب من المسجد", "شارع رئيسي", "أرضي", "روف", "دوبلكس"],
  general: ["للبيع", "مستعمل", "جديد", "نظيف", "أصلي", "بسعر مناسب"],
};

// Normalize Arabic letters to prevent near-duplicate tags
function normalizeArabic(str) {
  return str
    .toLowerCase()
    .replace(/[أإآ]/g, "ا")
    .replace(/ة/g, "ه")
    .replace(/ى/g, "ي")
    .trim();
}

/**
 * TagInputWidget
 * RTL-aware tag/keyword input for XTOX marketplace listing forms.
 *
 * Props:
 *   category   {string}   - Ad category key (electronics|vehicles|furniture|fashion|realestate|general)
 *   lang       {string}   - Language code: 'ar' | 'en' | 'de'
 *   value      {string[]} - Controlled array of current tags
 *   onChange   {fn}       - Callback(newTagsArray) when tags change
 *   maxTags    {number}   - Max tags allowed (default 10)
 *   className  {string}   - Additional wrapper class
 */
export default function TagInputWidget({
  category = "general",
  lang = "ar",
  value = [],
  onChange,
  maxTags = 10,
  className = "",
}) {
  const [inputVal, setInputVal] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [shake, setShake] = useState(false);
  const [focused, setFocused] = useState(false);
  const inputRef = useRef(null);
  const catTags = CATEGORY_TAGS[category] || CATEGORY_TAGS.general;

  const isRTL = lang === "ar";

  const T = {
    ar: {
      label: "الوسوم (تساعد في الظهور في البحث)",
      placeholder: "أضف وسماً… (مثال: آيفون ١٥)",
      suggestions: "اقتراحات:",
      count: (n, max) => `${n}/${max} وسوم`,
      maxReached: `الحد الأقصى ${maxTags} وسوم`,
      add: "+ ",
    },
    en: {
      label: "Tags (help buyers find your listing)",
      placeholder: "Add a tag… (e.g. iPhone 15)",
      suggestions: "Suggestions:",
      count: (n, max) => `${n}/${max} tags`,
      maxReached: `Max ${maxTags} tags reached`,
      add: "+ ",
    },
    de: {
      label: "Tags (helfen Käufern, Ihr Inserat zu finden)",
      placeholder: "Tag hinzufügen… (z.B. iPhone 15)",
      suggestions: "Vorschläge:",
      count: (n, max) => `${n}/${max} Tags`,
      maxReached: `Maximal ${maxTags} Tags`,
      add: "+ ",
    },
  };

  const t = T[lang] || T.ar;

  // Update suggestions whenever input or tags change
  useEffect(() => {
    const query = inputVal.trim();
    const filtered = catTags.filter((tag) => {
      const alreadyAdded = value.some(
        (v) => normalizeArabic(v) === normalizeArabic(tag)
      );
      if (alreadyAdded) return false;
      if (query) return tag.includes(query) || normalizeArabic(tag).includes(normalizeArabic(query));
      return true;
    });
    setSuggestions(filtered.slice(0, 6));
  }, [inputVal, value, catTags]);

  const addTag = (raw) => {
    const tag = raw.replace(/,+$/, "").trim();
    if (!tag) return;
    if (value.length >= maxTags) {
      setShake(true);
      setTimeout(() => setShake(false), 600);
      return;
    }
    const normNew = normalizeArabic(tag);
    if (value.some((v) => normalizeArabic(v) === normNew)) return; // duplicate
    onChange([...value, tag]);
    setInputVal("");
  };

  const removeTag = (idx) => onChange(value.filter((_, i) => i !== idx));

  const handleKeyDown = (e) => {
    if (e.key === "Enter" || e.key === "," || e.key === " ") {
      e.preventDefault();
      addTag(inputVal);
    } else if (e.key === "Backspace" && !inputVal && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className={`w-full font-[Cairo,Tajawal,sans-serif] ${className}`}>
      {/* Label */}
      <label className="block text-sm font-bold text-gray-700 mb-1">
        {t.label}
      </label>

      {/* Tag chips + input */}
      <div
        className={`
          flex flex-wrap gap-2 p-2 border rounded-xl bg-white cursor-text
          transition-all duration-200
          ${focused ? "border-blue-500 shadow-sm shadow-blue-100" : "border-gray-300"}
          ${shake ? "border-red-400" : ""}
        `}
        style={shake ? { animation: "xtox-shake 0.5s ease-in-out" } : {}}
        onClick={() => inputRef.current?.focus()}
      >
        {value.map((tag, i) => (
          <span
            key={i}
            className="flex items-center gap-1 bg-blue-100 text-blue-800 text-sm px-3 py-1 rounded-full font-medium select-none"
          >
            {tag}
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); removeTag(i); }}
              className="text-blue-400 hover:text-red-500 font-bold text-xs leading-none ml-1 transition-colors"
              aria-label={`Remove ${tag}`}
            >
              ✕
            </button>
          </span>
        ))}

        {value.length < maxTags ? (
          <input
            ref={inputRef}
            type="text"
            value={inputVal}
            onChange={(e) => setInputVal(e.target.value)}
            onKeyDown={handleKeyDown}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
            placeholder={value.length === 0 ? t.placeholder : ""}
            className="flex-1 min-w-[140px] outline-none text-sm bg-transparent placeholder:text-gray-400"
            dir={isRTL ? "rtl" : "ltr"}
          />
        ) : (
          <span className="text-xs text-red-400 italic self-center px-1">{t.maxReached}</span>
        )}
      </div>

      {/* Tag count */}
      <p className={`text-xs text-gray-400 mt-1 ${isRTL ? "text-right" : "text-left"}`}>
        {t.count(value.length, maxTags)}
      </p>

      {/* Suggestion pills */}
      {focused && suggestions.length > 0 && (
        <div className={`flex flex-wrap items-center gap-2 mt-2 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span className="text-xs text-gray-500">{t.suggestions}</span>
          {suggestions.map((s, i) => (
            <button
              key={i}
              type="button"
              onMouseDown={(e) => { e.preventDefault(); addTag(s); }}
              className="text-xs bg-gray-100 hover:bg-blue-50 text-gray-700 hover:text-blue-700 border border-gray-200 hover:border-blue-300 px-2 py-1 rounded-full transition-colors"
            >
              {t.add}{s}
            </button>
          ))}
        </div>
      )}

      {/* Shake keyframe (inline, no tailwind plugin needed) */}
      <style>{`
        @keyframes xtox-shake {
          0%, 100% { transform: translateX(0); }
          20% { transform: translateX(-6px); }
          40% { transform: translateX(6px); }
          60% { transform: translateX(-4px); }
          80% { transform: translateX(4px); }
        }
      `}</style>
    </div>
  );
}
