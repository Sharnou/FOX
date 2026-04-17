'use client';
import { useState } from 'react';

const toArabicNumerals = (str) =>
  String(str).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const LABELS = {
  ar: {
    title: 'المواصفات',
    showMore: 'عرض المزيد',
    showLess: 'عرض أقل',
    noSpecs: 'لا توجد مواصفات متاحة',
  },
  en: {
    title: 'Specifications',
    showMore: 'Show More',
    showLess: 'Show Less',
    noSpecs: 'No specifications available',
  },
  de: {
    title: 'Spezifikationen',
    showMore: 'Mehr anzeigen',
    showLess: 'Weniger anzeigen',
    noSpecs: 'Keine Spezifikationen verfügbar',
  },
};

const COLLAPSE_LIMIT = 6;

export default function ProductQuickSpecs({ specs = [], lang = 'ar', className = '' }) {
  const [expanded, setExpanded] = useState(false);
  const [activeLang, setActiveLang] = useState(lang);
  const t = LABELS[activeLang] || LABELS.ar;
  const isRTL = activeLang === 'ar';

  const displaySpecs = expanded ? specs : specs.slice(0, COLLAPSE_LIMIT);

  const formatValue = (val) => {
    if (activeLang === 'ar') return toArabicNumerals(val);
    return String(val);
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-md border border-violet-100 overflow-hidden ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Google Fonts */}
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');`}</style>

      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 bg-gradient-to-r from-violet-600 to-purple-700">
        <h3 className="text-white font-bold text-base tracking-wide flex items-center gap-2">
          <span className="text-lg">📋</span> {t.title}
        </h3>
        {/* Language switcher */}
        <div className="flex gap-1">
          {['ar', 'en', 'de'].map((l) => (
            <button
              key={l}
              onClick={() => setActiveLang(l)}
              className={`text-xs px-2 py-0.5 rounded-full font-semibold transition-all ${
                activeLang === l
                  ? 'bg-white text-violet-700'
                  : 'text-white/70 hover:text-white'
              }`}
            >
              {l.toUpperCase()}
            </button>
          ))}
        </div>
      </div>

      {/* Specs Table */}
      {specs.length === 0 ? (
        <div className="px-5 py-8 text-center text-gray-400 text-sm">{t.noSpecs}</div>
      ) : (
        <div className="divide-y divide-violet-50">
          {displaySpecs.map((spec, idx) => (
            <div
              key={idx}
              className={`flex ${isRTL ? 'flex-row-reverse' : 'flex-row'} items-center px-5 py-3 group hover:bg-violet-50 transition-colors duration-150`}
            >
              <span
                className={`text-sm font-semibold text-violet-700 ${isRTL ? 'text-right mr-0 ml-auto' : 'text-left ml-0 mr-auto'} min-w-[40%]`}
              >
                {spec.key}
              </span>
              <span
                className={`text-sm text-gray-700 ${isRTL ? 'text-left' : 'text-right'} flex-1 font-medium`}
              >
                {formatValue(spec.value)}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Show More / Less */}
      {specs.length > COLLAPSE_LIMIT && (
        <div className="px-5 py-3 border-t border-violet-100 text-center">
          <button
            onClick={() => setExpanded((p) => !p)}
            className="text-sm text-violet-600 hover:text-violet-800 font-semibold transition-colors"
          >
            {expanded
              ? `▲ ${t.showLess}`
              : `▼ ${t.showMore} (${activeLang === 'ar' ? toArabicNumerals(specs.length - COLLAPSE_LIMIT) : specs.length - COLLAPSE_LIMIT}+)`}
          </button>
        </div>
      )}
    </div>
  );
}
