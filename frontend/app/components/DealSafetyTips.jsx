'use client';

import { useState } from 'react';

/**
 * DealSafetyTips — نصائح الأمان عند التواصل مع البائع
 * Modal/drawer component shown when a buyer is about to contact a seller.
 * Displays 6 Arabic safety tips with emoji icons.
 * Supports 4 locales: ar, en, de, fr — full RTL for Arabic.
 * Pure frontend — zero backend calls.
 * Mobile-first responsive using Tailwind CSS.
 * Added: Run 133
 */

const TRANSLATIONS = {
  ar: {
    trigger: 'نصائح الأمان',
    title: 'نصائح للتعامل الآمن',
    subtitle: 'اتبع هذه النصائح لحماية نفسك عند الشراء',
    close: 'إغلاق',
    understood: 'فهمت، شكراً',
    tips: [
      { emoji: '🤝', text: 'قابل البائع في مكان عام ومضاء' },
      { emoji: '💰', text: 'لا تدفع أي مبلغ مقدماً قبل استلام المنتج' },
      { emoji: '🔍', text: 'افحص المنتج جيداً قبل إتمام عملية الشراء' },
      { emoji: '📱', text: 'تحقق من هوية البائع وتقييماته داخل التطبيق' },
      { emoji: '🚫', text: 'احذر من العروض المغرية جداً — إذا بدت مثالية فهي مريبة' },
      { emoji: '📞', text: 'تواصل فقط داخل التطبيق ولا تشارك معلوماتك الشخصية' },
    ],
  },
  en: {
    trigger: 'Safety Tips',
    title: 'Safe Deal Tips',
    subtitle: 'Follow these tips to protect yourself when buying',
    close: 'Close',
    understood: 'Got it, thanks!',
    tips: [
      { emoji: '🤝', text: 'Meet the seller in a public, well-lit place' },
      { emoji: '💰', text: 'Never pay in advance before receiving the item' },
      { emoji: '🔍', text: 'Inspect the product carefully before completing the purchase' },
      { emoji: '📱', text: 'Verify the seller\'s identity and ratings within the app' },
      { emoji: '🚫', text: 'Beware of too-good-to-be-true offers — if it seems perfect, be suspicious' },
      { emoji: '📞', text: 'Communicate only within the app and never share personal info' },
    ],
  },
  de: {
    trigger: 'Sicherheitstipps',
    title: 'Tipps für sichere Deals',
    subtitle: 'Befolge diese Tipps, um dich beim Kauf zu schützen',
    close: 'Schließen',
    understood: 'Verstanden, danke!',
    tips: [
      { emoji: '🤝', text: 'Triff den Verkäufer an einem öffentlichen, gut beleuchteten Ort' },
      { emoji: '💰', text: 'Zahle niemals im Voraus, bevor du den Artikel erhalten hast' },
      { emoji: '🔍', text: 'Prüfe das Produkt sorgfältig vor dem Kauf' },
      { emoji: '📱', text: 'Überprüfe die Identität und Bewertungen des Verkäufers in der App' },
      { emoji: '🚫', text: 'Vorsicht vor zu verlockenden Angeboten — wenn es perfekt klingt, sei misstrauisch' },
      { emoji: '📞', text: 'Kommuniziere nur über die App und teile keine persönlichen Daten' },
    ],
  },
  fr: {
    trigger: 'Conseils de sécurité',
    title: 'Conseils pour des achats sûrs',
    subtitle: 'Suivez ces conseils pour vous protéger lors de vos achats',
    close: 'Fermer',
    understood: 'Compris, merci !',
    tips: [
      { emoji: '🤝', text: 'Rencontrez le vendeur dans un lieu public et bien éclairé' },
      { emoji: '💰', text: 'Ne payez jamais à l\'avance avant de recevoir l\'article' },
      { emoji: '🔍', text: 'Inspectez soigneusement le produit avant de finaliser l\'achat' },
      { emoji: '📱', text: 'Vérifiez l\'identité et les avis du vendeur dans l\'application' },
      { emoji: '🚫', text: 'Méfiez-vous des offres trop belles — si c\'est parfait, soyez suspicieux' },
      { emoji: '📞', text: 'Communiquez uniquement via l\'application et ne partagez pas vos données personnelles' },
    ],
  },
};

export default function DealSafetyTips({ locale = 'ar', className = '' }) {
  const [open, setOpen] = useState(false);
  const isRTL = locale === 'ar';
  const t = TRANSLATIONS[locale] || TRANSLATIONS['ar'];

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);

  // Close on backdrop click
  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) handleClose();
  };

  return (
    <>
      {/* Trigger link */}
      <button
        type="button"
        onClick={handleOpen}
        dir={isRTL ? 'rtl' : 'ltr'}
        className={'inline-flex items-center gap-1 text-sm text-amber-600 hover:text-amber-700 underline underline-offset-2 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 rounded ' + className}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span aria-hidden="true">🛡️</span>
        <span>{t.trigger}</span>
      </button>

      {/* Modal overlay */}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="dst-title"
          className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
          onClick={handleBackdropClick}
        >
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            aria-hidden="true"
          />

          {/* Modal panel */}
          <div
            dir={isRTL ? 'rtl' : 'ltr'}
            className="relative z-10 w-full sm:max-w-md bg-white rounded-t-2xl sm:rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 sm:fade-in-0 duration-300"
          >
            {/* Header */}
            <div className="flex items-center justify-between px-5 pt-5 pb-3 border-b border-gray-100">
              <div>
                <h2
                  id="dst-title"
                  className="text-lg font-bold text-gray-900"
                >
                  {t.title}
                </h2>
                <p className="text-xs text-gray-500 mt-0.5">{t.subtitle}</p>
              </div>
              <button
                type="button"
                onClick={handleClose}
                aria-label={t.close}
                className="flex-shrink-0 p-2 rounded-full text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400"
              >
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-5 h-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={2}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  aria-hidden="true"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Tips list */}
            <ul className="px-5 py-4 space-y-3">
              {t.tips.map((tip, idx) => (
                <li
                  key={idx}
                  className="flex items-start gap-3 p-3 rounded-xl bg-amber-50 border border-amber-100"
                >
                  <span
                    className="flex-shrink-0 w-9 h-9 flex items-center justify-center rounded-full bg-white shadow-sm text-xl"
                    aria-hidden="true"
                  >
                    {tip.emoji}
                  </span>
                  <p className="text-sm text-gray-700 leading-relaxed pt-1.5 font-medium">
                    {tip.text}
                  </p>
                </li>
              ))}
            </ul>

            {/* Footer */}
            <div className="px-5 pb-6 pt-2">
              <button
                type="button"
                onClick={handleClose}
                className="w-full py-3 rounded-xl bg-amber-500 hover:bg-amber-600 active:bg-amber-700 text-white text-sm font-bold transition-colors duration-150 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-400 focus-visible:ring-offset-2 shadow-md"
              >
                {t.understood}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// Usage:
// <DealSafetyTips locale="ar" />  — Arabic RTL (default)
// <DealSafetyTips locale="en" />  — English
// <DealSafetyTips locale="de" />  — German
// <DealSafetyTips locale="fr" />  — French
