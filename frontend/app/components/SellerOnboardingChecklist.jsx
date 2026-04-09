'use client';
import React, { useState } from 'react';

/**
 * SellerOnboardingChecklist.jsx
 * Step-by-step onboarding checklist for new XTOX Arab marketplace sellers.
 * RTL-first | Cairo/Tajawal | Tailwind only | Zero deps | ~260 lines
 * Props: sellerData, lang, onDismiss, className
 * sellerData.completedSteps: string[] of step IDs that are done
 * Step IDs: photo, phone, listing, bio, response, sale, review
 */

const LABELS = {
  ar: {
    title: 'دليل البائع المبتدئ',
    subtitle: 'أكمل هذه الخطوات لتبدأ رحلتك كبائع ناجح',
    completed: 'مكتمل',
    pending: 'غير مكتمل',
    progress: 'تقدمك',
    steps: [
      { id: 'photo', label: 'أضف صورة شخصية', desc: 'البائعون الذين لديهم صور يحصلون على ثقة أكبر', icon: '📸' },
      { id: 'phone', label: 'تحقق من رقم هاتفك', desc: 'يزيد معدل الرد على المشترين بنسبة 60%', icon: '📱' },
      { id: 'listing', label: 'انشر أول إعلان لك', desc: 'ابدأ بإعلان واضح مع صور عالية الجودة', icon: '📝' },
      { id: 'bio', label: 'اكتب نبذة عنك', desc: 'أخبر المشترين من أنت وماذا تبيع', icon: '✍️' },
      { id: 'response', label: 'حافظ على معدل رد 80%', desc: 'ارد على الرسائل في أقل من 24 ساعة', icon: '💬' },
      { id: 'sale', label: 'أتمم أول صفقة', desc: 'الصفقة الأولى هي الأصعب — بعدها يسهل كل شيء', icon: '🤝' },
      { id: 'review', label: 'احصل على أول تقييم', desc: 'اطلب من المشتري تقييمك بعد الصفقة', icon: '⭐' },
    ],
    dismiss: 'إخفاء القائمة',
    congrats: '🎉 أحسنت! أنت بائع محترف الآن',
    tier: ['مبتدئ', 'نشط', 'موثوق', 'محترف', 'نجم XTOX'],
    tierLabel: 'مستواك الحالي',
    nextTip: 'نصيحة التالي',
  },
  en: {
    title: 'Seller Onboarding Checklist',
    subtitle: 'Complete these steps to kick-start your seller journey',
    completed: 'Completed',
    pending: 'Pending',
    progress: 'Your Progress',
    steps: [
      { id: 'photo', label: 'Add a profile photo', desc: 'Sellers with photos earn more trust from buyers', icon: '📸' },
      { id: 'phone', label: 'Verify your phone number', desc: 'Increases buyer reply rate by 60%', icon: '📱' },
      { id: 'listing', label: 'Post your first listing', desc: 'Start with a clear ad and high-quality images', icon: '📝' },
      { id: 'bio', label: 'Write your bio', desc: 'Tell buyers who you are and what you sell', icon: '✍️' },
      { id: 'response', label: 'Maintain 80% response rate', desc: 'Reply to messages within 24 hours', icon: '💬' },
      { id: 'sale', label: 'Complete your first deal', desc: 'The first deal is the hardest — it gets easier!', icon: '🤝' },
      { id: 'review', label: 'Get your first review', desc: 'Ask the buyer to rate you after the deal', icon: '⭐' },
    ],
    dismiss: 'Dismiss',
    congrats: "🎉 Congrats! You're a pro seller now",
    tier: ['Beginner', 'Active', 'Trusted', 'Pro', 'XTOX Star'],
    tierLabel: 'Your current level',
    nextTip: 'Next tip',
  },
  de: {
    title: 'Verkäufer-Checkliste',
    subtitle: 'Schließe diese Schritte ab, um als Verkäufer erfolgreich zu starten',
    completed: 'Erledigt',
    pending: 'Ausstehend',
    progress: 'Dein Fortschritt',
    steps: [
      { id: 'photo', label: 'Profilfoto hinzufügen', desc: 'Verkäufer mit Fotos werden mehr vertraut', icon: '📸' },
      { id: 'phone', label: 'Handynummer bestätigen', desc: 'Erhöht die Antwortrate um 60%', icon: '📱' },
      { id: 'listing', label: 'Erste Anzeige aufgeben', desc: 'Starte mit einer klaren Anzeige und guten Fotos', icon: '📝' },
      { id: 'bio', label: 'Biografie schreiben', desc: 'Erzähle Käufern, wer du bist', icon: '✍️' },
      { id: 'response', label: '80% Antwortrate halten', desc: 'Antworte innerhalb von 24 Stunden', icon: '💬' },
      { id: 'sale', label: 'Ersten Deal abschließen', desc: 'Der erste Deal ist der schwerste!', icon: '🤝' },
      { id: 'review', label: 'Erste Bewertung erhalten', desc: 'Bitte Käufer nach dem Deal um eine Bewertung', icon: '⭐' },
    ],
    dismiss: 'Ausblenden',
    congrats: '🎉 Glückwunsch! Du bist jetzt ein Profi-Verkäufer',
    tier: ['Anfänger', 'Aktiv', 'Vertrauenswürdig', 'Profi', 'XTOX-Star'],
    tierLabel: 'Dein aktuelles Level',
    nextTip: 'Nächster Tipp',
  },
};

const TIER_COLORS = [
  'bg-gray-400',
  'bg-green-500',
  'bg-blue-500',
  'bg-purple-600',
  'bg-yellow-500',
];

const TIER_BORDERS = [
  'border-gray-400',
  'border-green-500',
  'border-blue-500',
  'border-purple-600',
  'border-yellow-500',
];

function toArabicNumerals(num) {
  return String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}

export default function SellerOnboardingChecklist({
  sellerData = {},
  lang = 'ar',
  onDismiss,
  className = '',
}) {
  const [activeLang, setActiveLang] = useState(lang);
  const [arabicNumerals, setArabicNumerals] = useState(lang === 'ar');
  const [dismissed, setDismissed] = useState(false);

  const L = LABELS[activeLang] || LABELS.ar;
  const isRtl = activeLang === 'ar';

  const completedIds = new Set(sellerData.completedSteps || []);
  const completedCount = completedIds.size;
  const total = L.steps.length;
  const pct = Math.round((completedCount / total) * 100);
  const tierIdx = Math.min(Math.floor(completedCount / (total / 5)), 4);
  const allDone = completedCount === total;

  const fmt = (n) => (arabicNumerals ? toArabicNumerals(n) : String(n));

  const handleDismiss = () => {
    setDismissed(true);
    if (onDismiss) onDismiss();
  };

  if (dismissed) return null;

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={`font-['Cairo','Tajawal',sans-serif] bg-white rounded-2xl shadow-lg border border-gray-100 overflow-hidden ${className}`}
    >
      {/* Header */}
      <div className={`${TIER_COLORS[tierIdx]} px-5 py-4 text-white`}>
        <div className="flex items-center justify-between mb-1">
          <div className="flex-1 min-w-0">
            <h2 className="text-lg font-bold truncate">{L.title}</h2>
            <p className="text-xs opacity-80 truncate">{L.subtitle}</p>
          </div>
          {/* Lang switcher */}
          <div className="flex gap-1 text-xs ms-3 flex-shrink-0">
            {['ar', 'en', 'de'].map((l) => (
              <button
                key={l}
                onClick={() => {
                  setActiveLang(l);
                  setArabicNumerals(l === 'ar');
                }}
                className={`px-2 py-0.5 rounded-full transition-all ${
                  activeLang === l
                    ? 'bg-white text-gray-800 font-bold'
                    : 'bg-white/20 hover:bg-white/30'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>

        {/* Tier badge */}
        <div className="flex items-center gap-2 mt-2 flex-wrap">
          <span
            className={`text-xs border-2 ${TIER_BORDERS[tierIdx]} border-white/60 rounded-full px-2 py-0.5 bg-white/20`}
          >
            {L.tierLabel}: <strong>{L.tier[tierIdx]}</strong>
          </span>
          <span className="text-xs opacity-80">
            {fmt(completedCount)}/{fmt(total)} {L.progress}
          </span>
        </div>

        {/* Progress bar */}
        <div className="mt-3 bg-white/30 rounded-full h-2 overflow-hidden">
          <div
            className="h-2 bg-white rounded-full transition-all duration-700"
            style={{ width: `${pct}%` }}
          />
        </div>
        <p className={`text-xs mt-1 opacity-70 ${isRtl ? 'text-start' : 'text-end'}`}>
          {fmt(pct)}%
        </p>
      </div>

      {/* All done banner */}
      {allDone && (
        <div className="bg-green-50 border-b border-green-200 px-5 py-3 text-green-700 font-bold text-center text-sm">
          {L.congrats}
        </div>
      )}

      {/* Steps list */}
      <ul className="divide-y divide-gray-100">
        {L.steps.map((step, idx) => {
          const done = completedIds.has(step.id);
          return (
            <li
              key={step.id}
              className={`flex items-start gap-3 px-5 py-3 transition-colors ${
                done ? 'bg-gray-50' : 'bg-white hover:bg-blue-50/30'
              }`}
            >
              {/* Step number / checkmark */}
              <div
                className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold mt-0.5 ${
                  done ? 'bg-green-100 text-green-600' : 'bg-gray-100 text-gray-500'
                }`}
              >
                {done ? '✓' : fmt(idx + 1)}
              </div>

              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1 flex-wrap">
                  <span className="text-base">{step.icon}</span>
                  <span
                    className={`text-sm font-semibold ${
                      done ? 'text-gray-400 line-through' : 'text-gray-800'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {!done && <p className="text-xs text-gray-500 mt-0.5">{step.desc}</p>}
              </div>

              {/* Status badge */}
              <span
                className={`flex-shrink-0 text-xs px-2 py-0.5 rounded-full font-medium mt-1 ${
                  done
                    ? 'bg-green-100 text-green-600'
                    : 'bg-orange-50 text-orange-500'
                }`}
              >
                {done ? L.completed : L.pending}
              </span>
            </li>
          );
        })}
      </ul>

      {/* Footer */}
      <div className="px-5 py-3 border-t border-gray-100 flex items-center justify-between gap-3">
        <p className="text-xs text-gray-400 flex-1 min-w-0 truncate">
          {!allDone && L.steps.find((s) => !completedIds.has(s.id)) && (
            <>
              <span className="font-medium text-gray-600">{L.nextTip}:</span>{' '}
              {L.steps.find((s) => !completedIds.has(s.id)).desc}
            </>
          )}
        </p>
        <button
          onClick={handleDismiss}
          className="text-xs text-gray-400 hover:text-red-400 transition-colors flex-shrink-0"
        >
          {L.dismiss}
        </button>
      </div>
    </div>
  );
}
