'use client';
import { useState } from 'react';

// NegotiationAssistantWidget
// Helps buyers craft smart opening offers and provides Arabic negotiation tips.
// Props: askingPrice (number), currency (string, default 'EGP'), lang ('ar'|'en'|'de'), className

const TRANSLATIONS = {
  ar: {
    title: 'مساعد التفاوض',
    subtitle: 'احصل على أفضل صفقة',
    askingPrice: 'السعر المطلوب',
    fairRange: 'النطاق العادل',
    suggestedOffer: 'العرض المقترح',
    yourOffer: 'عرضك',
    tipsTitle: 'نصائح التفاوض',
    tips: [
      'ابدأ بعرض أقل بـ 15-20٪ من السعر المطلوب',
      'أبدِ اهتمامك ولكن لا تُظهر التسرع',
      'اذكر أي عيوب أو مشاكل تجدها في المنتج',
      'كن مستعدًا للمقابلة في منتصف الطريق',
      'اطلب المصاريف الإضافية مثل التوصيل',
    ],
    phrases: 'عبارات التفاوض',
    phraseList: [
      { ar: 'هل السعر قابل للتفاوض؟', en: 'Is the price negotiable?' },
      { ar: 'أفضل سعر ممكن؟', en: 'Best price possible?' },
      { ar: 'هل يمكنك تخفيض السعر قليلاً؟', en: 'Can you lower the price a bit?' },
      { ar: 'سآخذه إذا كان بـ ...', en: 'I\'ll take it for ...' },
      { ar: 'شوفت نفس الحاجة بسعر أرخص', en: 'I saw the same item cheaper elsewhere' },
    ],
    copied: 'تم النسخ!',
    copy: 'نسخ',
    calculate: 'احسب العرض',
    low: 'منخفض',
    fair: 'عادل',
    high: 'مرتفع',
    offerStrength: 'قوة عرضك',
  },
  en: {
    title: 'Negotiation Assistant',
    subtitle: 'Get the best deal',
    askingPrice: 'Asking Price',
    fairRange: 'Fair Range',
    suggestedOffer: 'Suggested Offer',
    yourOffer: 'Your Offer',
    tipsTitle: 'Negotiation Tips',
    tips: [
      'Start with an offer 15-20% below the asking price',
      'Show interest but don\'t appear desperate',
      'Mention any flaws or issues you notice in the product',
      'Be ready to meet in the middle',
      'Ask if extras like delivery are included',
    ],
    phrases: 'Negotiation Phrases',
    phraseList: [
      { ar: 'هل السعر قابل للتفاوض؟', en: 'Is the price negotiable?' },
      { ar: 'أفضل سعر ممكن؟', en: 'Best price possible?' },
      { ar: 'هل يمكنك تخفيض السعر قليلاً؟', en: 'Can you lower the price a bit?' },
      { ar: 'سآخذه إذا كان بـ ...', en: 'I\'ll take it for ...' },
      { ar: 'شوفت نفس الحاجة بسعر أرخص', en: 'I saw the same item cheaper elsewhere' },
    ],
    copied: 'Copied!',
    copy: 'Copy',
    calculate: 'Calculate Offer',
    low: 'Low',
    fair: 'Fair',
    high: 'High',
    offerStrength: 'Offer Strength',
  },
  de: {
    title: 'Verhandlungsassistent',
    subtitle: 'Das beste Angebot sichern',
    askingPrice: 'Verhandlungspreis',
    fairRange: 'Faire Preisspanne',
    suggestedOffer: 'Empfohlenes Angebot',
    yourOffer: 'Ihr Angebot',
    tipsTitle: 'Verhandlungstipps',
    tips: [
      'Beginnen Sie mit einem Angebot, das 15-20% unter dem Preis liegt',
      'Zeigen Sie Interesse, aber wirken Sie nicht verzweifelt',
      'Erwähnen Sie etwaige Mängel des Produkts',
      'Seien Sie bereit, auf halbem Weg entgegenzukommen',
      'Fragen Sie ob Extras wie Lieferung inklusive sind',
    ],
    phrases: 'Verhandlungsphrasen',
    phraseList: [
      { ar: 'هل السعر قابل للتفاوض؟', en: 'Is the price negotiable?' },
      { ar: 'أفضل سعر ممكن؟', en: 'Best price possible?' },
      { ar: 'هل يمكنك تخفيض السعر قليلاً؟', en: 'Can you lower the price a bit?' },
      { ar: 'سآخذه إذا كان بـ ...', en: 'I\'ll take it for ...' },
      { ar: 'شوفت نفس الحاجة بسعر أرخص', en: 'I saw the same item cheaper elsewhere' },
    ],
    copied: 'Kopiert!',
    copy: 'Kopieren',
    calculate: 'Angebot berechnen',
    low: 'Niedrig',
    fair: 'Fair',
    high: 'Hoch',
    offerStrength: 'Angebotsstärke',
  },
};

function toArabicIndic(num) {
  return String(num).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function formatNum(num, lang) {
  const rounded = Math.round(num);
  return lang === 'ar' ? toArabicIndic(rounded) : rounded.toLocaleString();
}

export default function NegotiationAssistantWidget({
  askingPrice = 5000,
  currency = 'EGP',
  lang = 'ar',
  className = '',
}) {
  const [currentLang, setCurrentLang] = useState(lang);
  const [customPrice, setCustomPrice] = useState(askingPrice);
  const [yourOffer, setYourOffer] = useState(Math.round(askingPrice * 0.82));
  const [copiedIdx, setCopiedIdx] = useState(null);
  const t = TRANSLATIONS[currentLang] || TRANSLATIONS.ar;
  const isRTL = currentLang === 'ar';

  const fairLow = Math.round(customPrice * 0.75);
  const fairHigh = Math.round(customPrice * 0.92);
  const suggested = Math.round(customPrice * 0.82);

  const offerPct = customPrice > 0 ? yourOffer / customPrice : 0;
  let strengthLabel = t.low;
  let strengthColor = 'text-rose-500';
  let barWidth = '20%';
  let barColor = 'bg-rose-400';
  if (offerPct >= 0.75 && offerPct <= 0.92) {
    strengthLabel = t.fair;
    strengthColor = 'text-emerald-600';
    barWidth = `${Math.round(((offerPct - 0.75) / 0.17) * 60 + 20)}%`;
    barColor = 'bg-emerald-400';
  } else if (offerPct > 0.92) {
    strengthLabel = t.high;
    strengthColor = 'text-amber-500';
    barWidth = '90%';
    barColor = 'bg-amber-400';
  }

  function copyPhrase(text, idx) {
    navigator.clipboard.writeText(text).catch(() => {});
    setCopiedIdx(idx);
    setTimeout(() => setCopiedIdx(null), 1500);
  }

  return (
    <div
      className={`rounded-2xl overflow-hidden shadow-lg border border-violet-100 bg-white font-sans ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-4 flex items-center justify-between">
        <div>
          <h2 className="text-white font-bold text-lg leading-tight">{t.title}</h2>
          <p className="text-violet-200 text-xs mt-0.5">{t.subtitle}</p>
        </div>
        <div className="flex gap-1">
          {['ar', 'en', 'de'].map(l => (
            <button
              key={l}
              onClick={() => setCurrentLang(l)}
              className={`text-xs px-2 py-0.5 rounded-full font-bold transition-all ${currentLang === l ? 'bg-white text-violet-700' : 'text-violet-200 hover:text-white'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Asking Price Input */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">{t.askingPrice} ({currency})</label>
          <input
            type="number"
            value={customPrice}
            onChange={e => {
              const v = Number(e.target.value) || 0;
              setCustomPrice(v);
              setYourOffer(Math.round(v * 0.82));
            }}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-gray-800 text-base focus:outline-none focus:ring-2 focus:ring-violet-400"
            min={0}
          />
        </div>

        {/* Fair Range */}
        <div className="bg-violet-50 rounded-xl p-3">
          <p className="text-xs font-semibold text-violet-700 mb-2">{t.fairRange}</p>
          <div className="flex items-center justify-between">
            <span className="text-sm font-bold text-violet-800">{formatNum(fairLow, currentLang)} {currency}</span>
            <div className="flex-1 mx-3 h-2 bg-violet-200 rounded-full relative">
              <div className="absolute inset-y-0 left-1/4 right-1/12 bg-violet-500 rounded-full" />
            </div>
            <span className="text-sm font-bold text-violet-800">{formatNum(fairHigh, currentLang)} {currency}</span>
          </div>
          <p className="text-center text-xs text-violet-500 mt-1">
            {t.suggestedOffer}: <span className="font-bold text-violet-700">{formatNum(suggested, currentLang)} {currency}</span>
          </p>
        </div>

        {/* Your Offer Slider */}
        <div>
          <label className="block text-xs font-semibold text-gray-500 mb-1">
            {t.yourOffer}: <span className="text-violet-700 font-bold">{formatNum(yourOffer, currentLang)} {currency}</span>
          </label>
          <input
            type="range"
            min={Math.round(customPrice * 0.5)}
            max={customPrice}
            value={yourOffer}
            onChange={e => setYourOffer(Number(e.target.value))}
            className="w-full accent-violet-600"
          />
          <div className="flex justify-between text-xs text-gray-400 mt-0.5">
            <span>{formatNum(Math.round(customPrice * 0.5), currentLang)}</span>
            <span>{formatNum(customPrice, currentLang)}</span>
          </div>
          {/* Offer Strength */}
          <div className="mt-2">
            <p className="text-xs text-gray-500 mb-1">{t.offerStrength}: <span className={`font-bold ${strengthColor}`}>{strengthLabel}</span></p>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div className={`h-full rounded-full transition-all duration-300 ${barColor}`} style={{ width: barWidth }} />
            </div>
          </div>
        </div>

        {/* Tips */}
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">💡 {t.tipsTitle}</p>
          <ul className="space-y-1.5">
            {t.tips.map((tip, i) => (
              <li key={i} className="flex items-start gap-2 text-xs text-gray-600">
                <span className="mt-0.5 text-violet-400 shrink-0">•</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Phrases */}
        <div>
          <p className="text-xs font-bold text-gray-700 mb-2">💬 {t.phrases}</p>
          <div className="space-y-1.5">
            {t.phraseList.map((phrase, i) => (
              <div key={i} className="flex items-center justify-between bg-gray-50 rounded-xl px-3 py-2">
                <div>
                  <p className="text-xs font-semibold text-gray-800" dir="rtl">{phrase.ar}</p>
                  {currentLang !== 'ar' && <p className="text-xs text-gray-400">{phrase.en}</p>}
                </div>
                <button
                  onClick={() => copyPhrase(isRTL ? phrase.ar : phrase.en, i)}
                  className="text-xs text-violet-600 hover:text-violet-800 font-semibold ml-2 shrink-0"
                >
                  {copiedIdx === i ? t.copied : t.copy}
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
