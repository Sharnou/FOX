import { useState, useEffect } from "react";

// ─── Static Data ────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  ar: {
    title: "دليل أمان المشتري",
    subtitle: "ابقَ محميًا أثناء التسوق في سوق XTOX العربي",
    langToggle: "English",
    numeralToggle: "0123",
    tipLabel: "نصيحة اليوم",
    quizTitle: "اختبر وعيك الأمني",
    quizSubtitle: "أجب بـ نعم / لا على ٥ أسئلة لتعرف مستوى حمايتك",
    quizBtnStart: "ابدأ الاختبار",
    quizBtnNext: "التالي",
    quizBtnFinish: "عرض النتيجة",
    quizBtnRetry: "أعد الاختبار",
    quizYes: "نعم",
    quizNo: "لا",
    quizResult: "نتيجتك",
    quizSafe: "محمي جيدًا ✅",
    quizModerate: "حماية متوسطة ⚠️",
    quizRisky: "بحاجة إلى تحسين 🔴",
    expandAll: "فتح الكل",
    collapseAll: "طي الكل",
    sections: [
      {
        id: "fake",
        icon: "🔍",
        title: "كيف تكتشف الإعلانات المزيفة",
        color: "border-yellow-500 bg-yellow-50",
        headerColor: "text-yellow-700",
      },
      {
        id: "payment",
        icon: "💳",
        title: "طرق الدفع الآمنة",
        color: "border-green-500 bg-green-50",
        headerColor: "text-green-700",
      },
      {
        id: "meetup",
        icon: "🤝",
        title: "قائمة تحقق لقاء البائع",
        color: "border-blue-500 bg-blue-50",
        headerColor: "text-blue-700",
      },
      {
        id: "scam",
        icon: "🚨",
        title: "علامات النصب والاحتيال",
        color: "border-red-500 bg-red-50",
        headerColor: "text-red-700",
      },
      {
        id: "report",
        icon: "📢",
        title: "كيف تُبلّغ عن إعلان مشبوه",
        color: "border-purple-500 bg-purple-50",
        headerColor: "text-purple-700",
      },
    ],
  },
  en: {
    title: "Buyer Safety Guide",
    subtitle: "Stay protected while shopping on the XTOX Arab Marketplace",
    langToggle: "العربية",
    numeralToggle: "٠١٢٣",
    tipLabel: "Tip of the Day",
    quizTitle: "Test Your Safety Awareness",
    quizSubtitle: "Answer 5 yes/no questions to check your protection level",
    quizBtnStart: "Start Quiz",
    quizBtnNext: "Next",
    quizBtnFinish: "Show Result",
    quizBtnRetry: "Retry Quiz",
    quizYes: "Yes",
    quizNo: "No",
    quizResult: "Your Score",
    quizSafe: "Well Protected ✅",
    quizModerate: "Moderate Protection ⚠️",
    quizRisky: "Needs Improvement 🔴",
    expandAll: "Expand All",
    collapseAll: "Collapse All",
    sections: [
      {
        id: "fake",
        icon: "🔍",
        title: "How to Spot Fake Listings",
        color: "border-yellow-500 bg-yellow-50",
        headerColor: "text-yellow-700",
      },
      {
        id: "payment",
        icon: "💳",
        title: "Safe Payment Methods",
        color: "border-green-500 bg-green-50",
        headerColor: "text-green-700",
      },
      {
        id: "meetup",
        icon: "🤝",
        title: "Safe Meetup Checklist",
        color: "border-blue-500 bg-blue-50",
        headerColor: "text-blue-700",
      },
      {
        id: "scam",
        icon: "🚨",
        title: "Scam Warning Signs",
        color: "border-red-500 bg-red-50",
        headerColor: "text-red-700",
      },
      {
        id: "report",
        icon: "📢",
        title: "How to Report a Suspicious Ad",
        color: "border-purple-500 bg-purple-50",
        headerColor: "text-purple-700",
      },
    ],
  },
};

const SECTION_CONTENT = {
  fake: {
    ar: [
      { icon: "📸", text: "صور مسروقة أو منخفضة الجودة لا تطابق الوصف" },
      { icon: "💰", text: "سعر أقل بكثير من السعر الحقيقي في السوق" },
      { icon: "📞", text: "البائع يرفض التحدث عبر الهاتف أو مقابلتك" },
      { icon: "🌍", text: "البائع يدّعي وجوده خارج البلاد وسيشحن المنتج" },
      { icon: "⏰", text: "ضغط على السرعة: 'العرض ينتهي اليوم فقط!'" },
      { icon: "📝", text: "وصف مبهم أو مترجم آليًا بشكل رديء" },
    ],
    en: [
      { icon: "📸", text: "Stolen or low-quality photos that don't match the description" },
      { icon: "💰", text: "Price far below the real market value" },
      { icon: "📞", text: "Seller refuses phone calls or in-person meetings" },
      { icon: "🌍", text: "Seller claims to be abroad and will ship the item" },
      { icon: "⏰", text: "Urgency pressure: 'Offer ends today only!'" },
      { icon: "📝", text: "Vague or poorly machine-translated description" },
    ],
  },
  payment: {
    ar: [
      { icon: "🏠", text: "فضّل الدفع عند الاستلام (كاش) كلما أمكن ذلك" },
      { icon: "🚫", text: "لا تحوّل أموالًا مسبقًا لشخص لم تلتقِ به" },
      { icon: "🔐", text: "للمنتجات عالية القيمة استخدم خدمة الضمان (Escrow)" },
      { icon: "💳", text: "البطاقة الائتمانية توفر حماية أفضل من التحويل البنكي" },
      { icon: "📱", text: "تجنب تطبيقات الدفع غير الرسمية أو المجهولة" },
    ],
    en: [
      { icon: "🏠", text: "Prefer cash on delivery whenever possible" },
      { icon: "🚫", text: "Never wire money upfront to someone you haven't met" },
      { icon: "🔐", text: "For high-value items, use a trusted Escrow service" },
      { icon: "💳", text: "Credit cards offer better fraud protection than wire transfers" },
      { icon: "📱", text: "Avoid unofficial or unknown payment apps" },
    ],
  },
  meetup: {
    ar: [
      { icon: "☀️", text: "حدد موعد اللقاء خلال ساعات النهار فقط" },
      { icon: "🏪", text: "اختر مكانًا عامًا مزدحمًا (مقهى، مجمع تجاري)" },
      { icon: "👫", text: "خذ معك صديقًا أو أحد أفراد العائلة" },
      { icon: "📍", text: "أرسل موقعك الجغرافي لشخص تثق به قبل الذهاب" },
      { icon: "🔍", text: "افحص المنتج جيدًا قبل الدفع ولا تتسرع" },
      { icon: "📋", text: "احتفظ بسجل للمحادثات مع البائع كدليل" },
      { icon: "🚗", text: "لا تسمح للبائع بمعرفة عنوان منزلك" },
      { icon: "🔋", text: "تأكد من شحن هاتفك قبل الخروج للقاء" },
    ],
    en: [
      { icon: "☀️", text: "Schedule the meeting during daytime hours only" },
      { icon: "🏪", text: "Choose a busy public place (café, shopping mall)" },
      { icon: "👫", text: "Bring a friend or family member along" },
      { icon: "📍", text: "Share your location with a trusted person before going" },
      { icon: "🔍", text: "Inspect the item thoroughly before paying — don't rush" },
      { icon: "📋", text: "Keep a record of all conversations with the seller as evidence" },
      { icon: "🚗", text: "Don't let the seller know your home address" },
      { icon: "🔋", text: "Make sure your phone is charged before heading out" },
    ],
  },
  scam: {
    ar: [
      { icon: "🔴", severity: "HIGH", text: "يطلب دفعة مقدمة لـ'حجز' المنتج قبل أن تراه" },
      { icon: "🔴", severity: "HIGH", text: "يرسل رابطًا خارجيًا لإتمام الصفقة خارج المنصة" },
      { icon: "🔴", severity: "HIGH", text: "يطلب بياناتك البنكية أو كلمة مرور حسابك" },
      { icon: "🟡", severity: "MEDIUM", text: "لا يقبل الالتقاء شخصيًا بأي عذر" },
      { icon: "🟡", severity: "MEDIUM", text: "قصص عاطفية مبالغ فيها لإثارة التعاطف" },
      { icon: "🟡", severity: "MEDIUM", text: "حساب جديد بدون تقييمات أو تاريخ تعاملات" },
    ],
    en: [
      { icon: "🔴", severity: "HIGH", text: "Asks for an upfront payment to 'reserve' the item before you see it" },
      { icon: "🔴", severity: "HIGH", text: "Sends an external link to complete the deal outside the platform" },
      { icon: "🔴", severity: "HIGH", text: "Requests your bank details or account password" },
      { icon: "🟡", severity: "MEDIUM", text: "Refuses to meet in person under any excuse" },
      { icon: "🟡", severity: "MEDIUM", text: "Overly emotional stories to gain sympathy" },
      { icon: "🟡", severity: "MEDIUM", text: "New account with no ratings or transaction history" },
    ],
  },
  report: {
    ar: [
      { icon: "👁️", step: "١", text: "افتح صفحة الإعلان المشبوه وانقر على زر 'تبليغ'" },
      { icon: "📝", step: "٢", text: "اختر سبب التبليغ من القائمة (احتيال / مزيف / مسيء)" },
      { icon: "📸", step: "٣", text: "أرفق لقطات شاشة كدليل على المشكلة" },
      { icon: "✅", step: "٤", text: "سيراجع فريقنا البلاغ خلال ٢٤ ساعة ويتخذ الإجراء اللازم" },
    ],
    en: [
      { icon: "👁️", step: "1", text: "Open the suspicious listing and click the 'Report' button" },
      { icon: "📝", step: "2", text: "Select the report reason from the list (scam / fake / abusive)" },
      { icon: "📸", step: "3", text: "Attach screenshots as evidence of the issue" },
      { icon: "✅", step: "4", text: "Our team will review the report within 24 hours and take action" },
    ],
  },
};

const QUIZ_QUESTIONS = {
  ar: [
    "هل تتحقق دائمًا من تقييمات البائع قبل الشراء؟",
    "هل تفضل الدفع عند الاستلام بدلًا من التحويل المسبق؟",
    "هل تلتقي بالبائع في أماكن عامة فقط؟",
    "هل تتجنب الضغط على روابط خارجية من البائع؟",
    "هل تبلّغ عن الإعلانات المشبوهة فور اكتشافها؟",
  ],
  en: [
    "Do you always check seller ratings before buying?",
    "Do you prefer cash on delivery over upfront transfers?",
    "Do you only meet sellers in public places?",
    "Do you avoid clicking external links sent by sellers?",
    "Do you report suspicious ads as soon as you spot them?",
  ],
};

const DAILY_TIPS = {
  ar: [
    "لا تشارك رقم هويتك مع أي بائع تحت أي ظرف 🔒",
    "تحقق من صور المنتج عبر البحث العكسي بـ Google قبل الشراء 🖼️",
    "البائع الموثوق يرحب بالأسئلة ولا يتسرع في إغلاق الصفقة ✅",
    "وفّر رقم طوارئ شخص تثق به أثناء أي لقاء مع بائع 📞",
    "الصفقات الجيدة جدًا عادةً ما تكون مزيفة — ثق بحدسك! 🎯",
  ],
  en: [
    "Never share your ID number with any seller under any circumstances 🔒",
    "Verify product images via Google reverse image search before buying 🖼️",
    "A trustworthy seller welcomes questions and doesn't rush to close the deal ✅",
    "Keep a trusted person's emergency number handy during any seller meetup 📞",
    "Deals that are too good to be true usually are — trust your instincts! 🎯",
  ],
};

// ─── Utility ────────────────────────────────────────────────────────────────
const toArabicIndic = (str) =>
  String(str).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);

// ─── Sub-components ─────────────────────────────────────────────────────────
function SafetyScoreQuiz({ lang, useArabicNumerals, t }) {
  const questions = QUIZ_QUESTIONS[lang];
  const [phase, setPhase] = useState("idle"); // idle | quiz | result
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);

  const score = answers.filter(Boolean).length;
  const pct = Math.round((score / questions.length) * 100);
  const fmt = (n) => (useArabicNumerals ? toArabicIndic(n) : String(n));

  const scoreLabel =
    pct >= 80 ? t.quizSafe : pct >= 60 ? t.quizModerate : t.quizRisky;
  const scoreBg =
    pct >= 80
      ? "bg-green-100 text-green-800 border-green-300"
      : pct >= 60
      ? "bg-yellow-100 text-yellow-800 border-yellow-300"
      : "bg-red-100 text-red-800 border-red-300";

  const handleAnswer = (val) => {
    const next = [...answers, val];
    setAnswers(next);
    if (current + 1 < questions.length) {
      setCurrent(current + 1);
    } else {
      setPhase("result");
    }
  };

  const reset = () => {
    setPhase("idle");
    setCurrent(0);
    setAnswers([]);
  };

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50 p-4 mb-6 shadow-sm">
      <div className="flex items-center gap-2 mb-1">
        <span className="text-2xl">🛡️</span>
        <h2 className="text-lg font-bold text-indigo-800 font-cairo">{t.quizTitle}</h2>
      </div>
      <p className="text-sm text-indigo-600 mb-3">{t.quizSubtitle}</p>

      {phase === "idle" && (
        <button
          onClick={() => setPhase("quiz")}
          className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
        >
          {t.quizBtnStart}
        </button>
      )}

      {phase === "quiz" && (
        <div className="space-y-3">
          <div className="flex justify-between items-center text-xs text-indigo-500 mb-1">
            <span>{fmt(current + 1)} / {fmt(questions.length)}</span>
            <div className="w-32 h-2 bg-indigo-200 rounded-full overflow-hidden">
              <div
                className="h-2 bg-indigo-500 rounded-full transition-all"
                style={{ width: `${((current + 1) / questions.length) * 100}%` }}
              />
            </div>
          </div>
          <p className="text-sm font-medium text-indigo-900">{questions[current]}</p>
          <div className="flex gap-3">
            <button
              onClick={() => handleAnswer(true)}
              className="flex-1 bg-green-500 hover:bg-green-600 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              ✅ {t.quizYes}
            </button>
            <button
              onClick={() => handleAnswer(false)}
              className="flex-1 bg-red-400 hover:bg-red-500 text-white font-semibold py-2 rounded-lg text-sm transition-colors"
            >
              ❌ {t.quizNo}
            </button>
          </div>
        </div>
      )}

      {phase === "result" && (
        <div className="space-y-3">
          <div className={`rounded-lg border px-4 py-3 text-center ${scoreBg}`}>
            <div className="text-3xl font-extrabold">{fmt(pct)}%</div>
            <div className="text-sm font-semibold mt-1">{scoreLabel}</div>
            <div className="text-xs mt-1 opacity-75">
              {fmt(score)} / {fmt(questions.length)} {lang === "ar" ? "إجابة صحيحة" : "correct answers"}
            </div>
          </div>
          <button
            onClick={reset}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold px-5 py-2 rounded-lg transition-colors"
          >
            🔄 {t.quizBtnRetry}
          </button>
        </div>
      )}
    </div>
  );
}

function RotatingTip({ lang, t }) {
  const tips = DAILY_TIPS[lang];
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => setIdx((i) => (i + 1) % tips.length), 10000);
    return () => clearInterval(timer);
  }, [tips.length]);

  return (
    <div className="rounded-xl border border-amber-300 bg-amber-50 px-4 py-3 mb-6 flex items-start gap-3 shadow-sm">
      <span className="text-xl shrink-0">💡</span>
      <div>
        <span className="text-xs font-bold text-amber-700 uppercase tracking-wide">{t.tipLabel}</span>
        <p className="text-sm text-amber-900 mt-0.5 leading-relaxed transition-all">{tips[idx]}</p>
      </div>
      <div className="ms-auto flex gap-1 self-center shrink-0">
        {tips.map((_, i) => (
          <button
            key={i}
            onClick={() => setIdx(i)}
            className={`w-2 h-2 rounded-full transition-colors ${
              i === idx ? "bg-amber-600" : "bg-amber-300"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function CollapsibleSection({ section, lang, useArabicNumerals, forceOpen }) {
  const [open, setOpen] = useState(false);
  const content = SECTION_CONTENT[section.id]?.[lang] ?? [];
  const isOpen = forceOpen !== undefined ? forceOpen : open;

  const fmt = (n) => (useArabicNumerals ? toArabicIndic(n) : String(n));

  return (
    <div className={`rounded-xl border-s-4 border border-gray-200 ${section.color} mb-3 overflow-hidden shadow-sm`}>
      <button
        className="w-full flex items-center justify-between px-4 py-3 text-start"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span className="text-xl">{section.icon}</span>
          <span className={`font-bold text-sm sm:text-base font-cairo ${section.headerColor}`}>
            {section.title}
          </span>
        </div>
        <span className={`text-lg transition-transform duration-200 ${isOpen ? "rotate-180" : ""} ${section.headerColor}`}>
          ▾
        </span>
      </button>

      {isOpen && (
        <div className="px-4 pb-4 space-y-2">
          {content.map((item, i) => (
            <div key={i} className="flex items-start gap-2 text-sm text-gray-800">
              {section.id === "scam" && (
                <span
                  className={`text-xs font-bold px-1.5 py-0.5 rounded shrink-0 mt-0.5 ${
                    item.severity === "HIGH"
                      ? "bg-red-200 text-red-800"
                      : "bg-yellow-200 text-yellow-800"
                  }`}
                >
                  {item.severity}
                </span>
              )}
              {section.id === "report" && (
                <span className="w-6 h-6 rounded-full bg-purple-600 text-white text-xs font-bold flex items-center justify-center shrink-0 mt-0.5">
                  {item.step}
                </span>
              )}
              <span className="text-base shrink-0">{item.icon}</span>
              <span className="leading-relaxed">{item.text}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Main Component ──────────────────────────────────────────────────────────
export default function BuyerSafetyGuide({ lang: initialLang = "ar", className = "" }) {
  const [lang, setLang] = useState(initialLang);
  const [useArabicNumerals, setUseArabicNumerals] = useState(initialLang === "ar");
  const [allOpen, setAllOpen] = useState(undefined); // undefined = per-section control

  const t = TRANSLATIONS[lang];
  const isRTL = lang === "ar";

  const toggleLang = () => {
    const next = lang === "ar" ? "en" : "ar";
    setLang(next);
    setUseArabicNumerals(next === "ar");
    setAllOpen(undefined);
  };

  const handleExpandAll = () => setAllOpen(true);
  const handleCollapseAll = () => setAllOpen(false);

  return (
    <div
      dir={isRTL ? "rtl" : "ltr"}
      className={`font-cairo max-w-2xl mx-auto p-4 sm:p-6 ${className}`}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h1 className="text-2xl font-extrabold text-gray-900">{t.title}</h1>
          <p className="text-sm text-gray-500 mt-1">{t.subtitle}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => setUseArabicNumerals((v) => !v)}
            className="text-xs border border-gray-300 rounded-lg px-3 py-1.5 text-gray-600 hover:bg-gray-100 font-mono transition-colors"
            title="Toggle numeral style"
          >
            {t.numeralToggle}
          </button>
          <button
            onClick={toggleLang}
            className="text-xs border border-indigo-300 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg px-3 py-1.5 font-semibold transition-colors"
          >
            🌐 {t.langToggle}
          </button>
        </div>
      </div>

      {/* Rotating Tip */}
      <RotatingTip lang={lang} t={t} />

      {/* Safety Score Quiz */}
      <SafetyScoreQuiz lang={lang} useArabicNumerals={useArabicNumerals} t={t} />

      {/* Expand / Collapse Controls */}
      <div className="flex gap-2 mb-3">
        <button
          onClick={handleExpandAll}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          ＋ {t.expandAll}
        </button>
        <button
          onClick={handleCollapseAll}
          className="text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 px-3 py-1.5 rounded-lg transition-colors"
        >
          － {t.collapseAll}
        </button>
      </div>

      {/* Collapsible Sections */}
      <div>
        {t.sections.map((section) => (
          <CollapsibleSection
            key={section.id}
            section={section}
            lang={lang}
            useArabicNumerals={useArabicNumerals}
            forceOpen={allOpen}
          />
        ))}
      </div>

      {/* Footer */}
      <p className="text-center text-xs text-gray-400 mt-6">
        {lang === "ar"
          ? "© XTOX — سوق عربي آمن وموثوق"
          : "© XTOX — A safe and trusted Arab marketplace"}
      </p>
    </div>
  );
}
