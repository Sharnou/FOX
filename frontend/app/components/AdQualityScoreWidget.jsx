"use client";
import { useState, useEffect, useRef } from "react";

// ── AdQualityScoreWidget ─────────────────────────────────────────────────────
// Analyzes an XTOX ad listing and gives sellers a quality score (0-100)
// with actionable improvement tips. RTL-aware, tri-lingual (AR/EN/DE).
// Tailwind only, zero external deps.
// Props: ad {title,description,images,price,category,location}, lang, onImprove
// ────────────────────────────────────────────────────────────────────────────

const T = {
  ar: {
    title: "جودة إعلانك",
    score: "النتيجة",
    excellent: "ممتاز",
    good: "جيد",
    fair: "مقبول",
    poor: "ضعيف",
    improve: "حسّن الآن",
    tips: "نصائح التحسين",
    close: "إغلاق",
    checks: {
      titleLength: "عنوان وصفي (١٠ أحرف على الأقل)",
      descLength: "وصف مفصّل (٥٠ كلمة على الأقل)",
      images: "صور واضحة (٣ على الأقل)",
      price: "سعر محدد",
      category: "تصنيف صحيح",
      location: "موقع محدد",
      arabicText: "نص عربي في الوصف",
    },
    hints: {
      titleLength: "اجعل العنوان وصفيًا ودقيقًا لجذب المشترين.",
      descLength: "أضف تفاصيل عن الحالة والمميزات وسبب البيع.",
      images: "الصور عالية الجودة تزيد المشاهدات ٣ أضعاف.",
      price: "حدد السعر لجذب عروض أكثر.",
      category: "التصنيف الصحيح يوصل إعلانك للمشترين المناسبين.",
      location: "المنطقة الدقيقة تساعد المشترين القريبين.",
      arabicText: "النص العربي يرفع ترتيب إعلانك محليًا.",
    },
  },
  en: {
    title: "Ad Quality Score",
    score: "Score",
    excellent: "Excellent",
    good: "Good",
    fair: "Fair",
    poor: "Poor",
    improve: "Improve Now",
    tips: "Improvement Tips",
    close: "Close",
    checks: {
      titleLength: "Descriptive title (10+ chars)",
      descLength: "Detailed description (50+ words)",
      images: "Clear photos (3+)",
      price: "Price specified",
      category: "Correct category",
      location: "Location set",
      arabicText: "Arabic text in description",
    },
    hints: {
      titleLength: "A clear title attracts more buyers.",
      descLength: "Add condition, features, and reason for selling.",
      images: "Quality photos increase views by 3×.",
      price: "Set a price to get more offers.",
      category: "Right category reaches the right buyers.",
      location: "Exact area helps nearby buyers find you.",
      arabicText: "Arabic text boosts local search ranking.",
    },
  },
  de: {
    title: "Anzeigen-Qualitätsbewertung",
    score: "Bewertung",
    excellent: "Ausgezeichnet",
    good: "Gut",
    fair: "Befriedigend",
    poor: "Schwach",
    improve: "Jetzt verbessern",
    tips: "Verbesserungstipps",
    close: "Schließen",
    checks: {
      titleLength: "Beschreibender Titel (10+ Zeichen)",
      descLength: "Ausführliche Beschreibung (50+ Wörter)",
      images: "Klare Fotos (3+)",
      price: "Preis angegeben",
      category: "Richtige Kategorie",
      location: "Standort gesetzt",
      arabicText: "Arabischer Text in Beschreibung",
    },
    hints: {
      titleLength: "Ein klarer Titel zieht mehr Käufer an.",
      descLength: "Zustand, Merkmale und Verkaufsgrund angeben.",
      images: "Gute Fotos erhöhen die Ansichten um das 3-fache.",
      price: "Preis festlegen, um mehr Angebote zu erhalten.",
      category: "Richtige Kategorie erreicht die richtigen Käufer.",
      location: "Genaue Lage hilft nahegelegenen Käufern.",
      arabicText: "Arabischer Text verbessert die lokale Platzierung.",
    },
  },
};

function toArabicNumerals(n) {
  return String(n).replace(/\d/g, d => "٠١٢٣٤٥٦٧٨٩"[d]);
}

function analyzeAd(ad) {
  const results = {};
  const title = ad?.title || "";
  const desc = ad?.description || "";
  const images = ad?.images || [];
  const price = ad?.price;
  const category = ad?.category || "";
  const location = ad?.location || "";

  results.titleLength = title.length >= 10;
  results.descLength = desc.split(/\s+/).filter(Boolean).length >= 50;
  results.images = images.length >= 3;
  results.price = price !== undefined && price !== null && price !== "";
  results.category = category.length > 0;
  results.location = location.length > 0;
  results.arabicText = /[\u0600-\u06FF]/.test(desc);

  const weights = {
    titleLength: 15,
    descLength: 20,
    images: 25,
    price: 15,
    category: 10,
    location: 10,
    arabicText: 5,
  };

  let score = 0;
  for (const key of Object.keys(results)) {
    if (results[key]) score += weights[key];
  }

  return { results, score };
}

function ScoreRing({ score, size = 80 }) {
  const r = (size - 10) / 2;
  const circ = 2 * Math.PI * r;
  const [displayed, setDisplayed] = useState(0);

  useEffect(() => {
    let start = 0;
    const step = Math.ceil(score / 30);
    const timer = setInterval(() => {
      start = Math.min(start + step, score);
      setDisplayed(start);
      if (start >= score) clearInterval(timer);
    }, 30);
    return () => clearInterval(timer);
  }, [score]);

  const color =
    score >= 80 ? "#10b981" : score >= 60 ? "#f59e0b" : score >= 40 ? "#f97316" : "#ef4444";
  const offset = circ - (displayed / 100) * circ;

  return (
    <svg width={size} height={size} className="rotate-[-90deg]">
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="#e5e7eb" strokeWidth={8} />
      <circle
        cx={size / 2}
        cy={size / 2}
        r={r}
        fill="none"
        stroke={color}
        strokeWidth={8}
        strokeDasharray={circ}
        strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: "stroke-dashoffset 0.05s linear" }}
      />
      <text
        x="50%"
        y="50%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize={size / 4}
        fontWeight="bold"
        fill={color}
        style={{ transform: "rotate(90deg)", transformOrigin: "50% 50%", fontFamily: "Cairo, sans-serif" }}
      >
        {displayed}
      </text>
    </svg>
  );
}

export default function AdQualityScoreWidget({ ad = {}, lang = "ar", onImprove }) {
  const t = T[lang] || T.ar;
  const isRTL = lang === "ar";
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  const { results, score } = analyzeAd(ad);

  const label =
    score >= 80 ? t.excellent : score >= 60 ? t.good : score >= 40 ? t.fair : t.poor;

  const badgeColor =
    score >= 80
      ? "bg-emerald-100 text-emerald-700 border-emerald-300"
      : score >= 60
      ? "bg-amber-100 text-amber-700 border-amber-300"
      : score >= 40
      ? "bg-orange-100 text-orange-700 border-orange-300"
      : "bg-red-100 text-red-700 border-red-300";

  const failedChecks = Object.keys(results).filter(k => !results[k]);

  useEffect(() => {
    if (!open) return;
    const handler = e => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  return (
    <div
      ref={ref}
      dir={isRTL ? "rtl" : "ltr"}
      className="font-[Cairo,Tajawal,sans-serif] relative inline-block"
    >
      <button
        onClick={() => setOpen(v => !v)}
        aria-label={t.title}
        className={'flex items-center gap-2 px-3 py-1.5 rounded-full border text-sm font-semibold shadow-sm cursor-pointer transition hover:shadow-md ' + (badgeColor)}
      >
        <span>⭐</span>
        <span>{t.score}: {isRTL ? toArabicNumerals(score) : score}/100</span>
        <span className="text-xs opacity-75">({label})</span>
      </button>

      {open && (
        <div
          className="absolute z-50 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-gray-100 overflow-hidden"
          style={isRTL ? { right: 0 } : { left: 0 }}
        >
          <div className="bg-gradient-to-br from-indigo-600 to-violet-600 p-4 flex items-center justify-between">
            <span className="text-white font-bold text-base">{t.title}</span>
            <button
              onClick={() => setOpen(false)}
              aria-label={t.close}
              className="text-white/70 hover:text-white text-xl leading-none"
            >
              ×
            </button>
          </div>

          <div className="flex flex-col items-center py-5 bg-gray-50 border-b border-gray-100">
            <ScoreRing score={score} size={88} />
            <span className={'mt-2 text-sm font-semibold px-3 py-0.5 rounded-full border ' + (badgeColor)}>
              {label}
            </span>
          </div>

          <ul className="divide-y divide-gray-50 max-h-52 overflow-y-auto">
            {Object.keys(results).map(key => (
              <li key={key} className="flex items-start gap-2 px-4 py-2.5 text-sm">
                <span className={'mt-0.5 flex-shrink-0 ' + (results[key] ? "text-emerald-500" : "text-red-400")}>
                  {results[key] ? "✓" : "✗"}
                </span>
                <span className={results[key] ? "text-gray-700" : "text-gray-400 line-through"}>
                  {t.checks[key]}
                </span>
              </li>
            ))}
          </ul>

          {failedChecks.length > 0 && (
            <div className="bg-amber-50 border-t border-amber-100 px-4 py-3">
              <p className="text-xs font-bold text-amber-700 mb-2">{t.tips}</p>
              <ul className="space-y-1.5">
                {failedChecks.slice(0, 3).map(key => (
                  <li key={key} className="flex items-start gap-1.5 text-xs text-amber-800">
                    <span className="mt-0.5">💡</span>
                    <span>{t.hints[key]}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {failedChecks.length > 0 && onImprove && (
            <div className="px-4 py-3 border-t border-gray-100">
              <button
                onClick={() => { onImprove(failedChecks); setOpen(false); }}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl py-2 transition"
              >
                {t.improve}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
