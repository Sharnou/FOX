'use client';
import { useState } from 'react';

/**
 * QuickReplyTemplates — XTOX Run 121
 * Shows common buyer message templates in Arabic (RTL).
 * Clicking a template fires onSelect(text) to pre-fill the chat input.
 */
const TEMPLATES = [
  { id: 1, ar: 'هل المنتج لا يزال متاحاً؟', en: 'Is this still available?' },
  { id: 2, ar: 'هل السعر قابل للتفاوض؟', en: 'Is the price negotiable?' },
  { id: 3, ar: 'ما هو الموقع بالضبط؟', en: 'What is the exact location?' },
  { id: 4, ar: 'هل يمكن الشحن؟', en: 'Can you ship?' },
  { id: 5, ar: 'ما هو الحد الأدنى للسعر؟', en: 'What is your best price?' },
  { id: 6, ar: 'هل المنتج في حالة جيدة؟', en: 'Is it in good condition?' },
];

export default function QuickReplyTemplates({ onSelect, lang = 'ar' }) {
  const [visible, setVisible] = useState(false);

  const handleSelect = (template) => {
    onSelect(lang === 'ar' ? template.ar : template.en);
    setVisible(false);
  };

  return (
    <div className="relative" dir={lang === 'ar' ? 'rtl' : 'ltr'}>
      <button
        onClick={() => setVisible((v) => !v)}
        title={lang === 'ar' ? 'رسائل جاهزة' : 'Quick replies'}
        className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-gray-500 dark:text-gray-400"
        aria-label={lang === 'ar' ? 'رسائل جاهزة' : 'Quick replies'}
      >
        {/* Chat lightning bolt icon */}
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M11.3 1.046A1 1 0 0112 2v5h4a1 1 0 01.82 1.573l-7 10A1 1 0 018 18v-5H4a1 1 0 01-.82-1.573l7-10a1 1 0 011.12-.38z" clipRule="evenodd" />
        </svg>
      </button>

      {visible && (
        <div
          className={'absolute bottom-12 ' + (lang === 'ar' ? 'right-0' : 'left-0') + ' z-50 w-64 bg-white dark:bg-gray-800 rounded-2xl shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden'}
        >
          <p className="text-xs font-semibold text-gray-500 dark:text-gray-400 px-3 py-2 border-b border-gray-100 dark:border-gray-700">
            {lang === 'ar' ? 'رسائل جاهزة' : 'Quick replies'}
          </p>
          <ul>
            {TEMPLATES.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => handleSelect(t)}
                  className="w-full text-right px-3 py-2 text-sm text-gray-700 dark:text-gray-200 hover:bg-blue-50 dark:hover:bg-blue-900/30 transition-colors"
                >
                  {lang === 'ar' ? t.ar : t.en}
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
