'use client';
/**
 * SwapProposalWidget.jsx
 * ─────────────────────
 * Lets buyers propose a barter / exchange deal on an ad detail page.
 * Culturally common in Arab markets (مقايضة).
 *
 * Props:
 *   adId        {string}   – Target ad ID (used as localStorage key)
 *   adTitle     {string}   – Ad title shown in the header
 *   sellerName  {string}   – Seller display name
 *   lang        {string}   – 'ar' | 'en' | 'de'  (default 'ar')
 *   onProposalSent {fn}    – Called with proposal object when submitted
 *   className   {string}
 *
 * Features:
 *   • 3-step wizard: describe → value/condition → preview & send
 *   • Stores proposals in localStorage keyed by adId
 *   • Shows past proposals with status chips (pending/accepted/rejected)
 *   • Arabic-Indic numerals for Arabic locale
 *   • Tri-lingual AR / EN / DE
 *   • Cairo / Tajawal fonts via Google Fonts (CDN)
 *   • Tailwind only – zero npm deps
 *   • RTL-aware (dir inferred from lang)
 *   • Accordion open/close with smooth animation
 */

import { useState, useEffect, useCallback } from 'react';

// ── i18n ────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: 'اقتراح مقايضة',
    subtitle: 'هل تريد المقايضة بدلاً من الشراء؟ اعرض ما لديك!',
    step1: 'صف عرضك',
    step2: 'القيمة والحالة',
    step3: 'مراجعة وإرسال',
    itemName: 'اسم أو نوع الشيء',
    itemDesc: 'وصف تفصيلي (الحالة، المواصفات…)',
    itemValue: 'القيمة التقديرية (بالجنيه)',
    condition: 'الحالة',
    condNew: 'جديد',
    condLikeNew: 'كالجديد',
    condGood: 'جيدة',
    condFair: 'مقبولة',
    condPoor: 'متهالكة',
    next: 'التالي',
    back: 'رجوع',
    send: 'إرسال العرض',
    cancel: 'إلغاء',
    sending: 'جارٍ الإرسال…',
    successTitle: '✅ تم إرسال عرض المقايضة!',
    successMsg: 'سيتواصل معك البائع قريباً.',
    newProposal: '+ عرض جديد',
    pastTitle: 'عروض المقايضة السابقة',
    noPast: 'لا توجد عروض سابقة لهذا الإعلان.',
    statusPending: 'قيد المراجعة',
    statusAccepted: 'مقبول ✓',
    statusRejected: 'مرفوض ✗',
    forAd: 'مقابل: ',
    egp: 'ج.م',
    placeholderName: 'مثال: آيفون ١٤، دراجة هوائية…',
    placeholderDesc: 'اذكر الحالة والمواصفات والعيوب إن وجدت',
    validName: 'يرجى إدخال اسم الشيء المُقدَّم للمقايضة',
    validValue: 'يرجى إدخال قيمة تقديرية صحيحة',
    tip: '💡 نصيحة: كلما كان وصفك أوضح، زادت فرص قبول عرضك.',
    date: 'التاريخ',
  },
  en: {
    title: 'Swap Proposal',
    subtitle: 'Want to swap instead of buying? Make an offer!',
    step1: 'Describe Your Offer',
    step2: 'Value & Condition',
    step3: 'Review & Send',
    itemName: 'Item name / type',
    itemDesc: 'Detailed description (condition, specs…)',
    itemValue: 'Estimated value (EGP)',
    condition: 'Condition',
    condNew: 'New',
    condLikeNew: 'Like New',
    condGood: 'Good',
    condFair: 'Fair',
    condPoor: 'Poor',
    next: 'Next',
    back: 'Back',
    send: 'Send Proposal',
    cancel: 'Cancel',
    sending: 'Sending…',
    successTitle: '✅ Swap Proposal Sent!',
    successMsg: 'The seller will contact you soon.',
    newProposal: '+ New Proposal',
    pastTitle: 'Past Swap Proposals',
    noPast: 'No past proposals for this ad.',
    statusPending: 'Pending',
    statusAccepted: 'Accepted ✓',
    statusRejected: 'Rejected ✗',
    forAd: 'For: ',
    egp: 'EGP',
    placeholderName: 'e.g. iPhone 14, bicycle…',
    placeholderDesc: 'Mention condition, specs, and any flaws',
    validName: 'Please enter the item name',
    validValue: 'Please enter a valid estimated value',
    tip: '💡 Tip: The clearer your description, the higher your acceptance chance.',
    date: 'Date',
  },
  de: {
    title: 'Tauschvorschlag',
    subtitle: 'Möchten Sie tauschen statt kaufen? Machen Sie ein Angebot!',
    step1: 'Ihr Angebot beschreiben',
    step2: 'Wert & Zustand',
    step3: 'Prüfen & Senden',
    itemName: 'Artikelname / Typ',
    itemDesc: 'Detaillierte Beschreibung (Zustand, Spezifikationen…)',
    itemValue: 'Geschätzter Wert (EGP)',
    condition: 'Zustand',
    condNew: 'Neu',
    condLikeNew: 'Wie neu',
    condGood: 'Gut',
    condFair: 'Akzeptabel',
    condPoor: 'Schlecht',
    next: 'Weiter',
    back: 'Zurück',
    send: 'Vorschlag senden',
    cancel: 'Abbrechen',
    sending: 'Senden…',
    successTitle: '✅ Tauschvorschlag gesendet!',
    successMsg: 'Der Verkäufer wird sich bald bei Ihnen melden.',
    newProposal: '+ Neuer Vorschlag',
    pastTitle: 'Frühere Tauschvorschläge',
    noPast: 'Keine früheren Vorschläge für diese Anzeige.',
    statusPending: 'Ausstehend',
    statusAccepted: 'Akzeptiert ✓',
    statusRejected: 'Abgelehnt ✗',
    forAd: 'Für: ',
    egp: 'EGP',
    placeholderName: 'z.B. iPhone 14, Fahrrad…',
    placeholderDesc: 'Zustand, Spezifikationen und eventuelle Mängel angeben',
    validName: 'Bitte Artikelname eingeben',
    validValue: 'Bitte einen gültigen Schätzwert eingeben',
    tip: '💡 Tipp: Je klarer Ihre Beschreibung, desto höher Ihre Annahmechance.',
    date: 'Datum',
  },
};

// Arabic-Indic numeral conversion
const toArabicIndic = (n) =>
  String(n).replace(/[0-9]/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const formatNum = (n, lang) =>
  lang === 'ar' ? toArabicIndic(n) : String(n);

const formatDate = (iso, lang) => {
  try {
    const d = new Date(iso);
    if (lang === 'ar') {
      return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    if (lang === 'de') {
      return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
    }
    return d.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return iso;
  }
};

const CONDITIONS = ['condNew', 'condLikeNew', 'condGood', 'condFair', 'condPoor'];
const STATUS_COLORS = {
  pending:  'bg-amber-100 text-amber-800',
  accepted: 'bg-green-100 text-green-800',
  rejected: 'bg-red-100 text-red-800',
};

const LS_KEY = (adId) => `xtox_swap_proposals_${adId}`;

export default function SwapProposalWidget({
  adId = '',
  adTitle = '',
  sellerName = '',
  lang = 'ar',
  onProposalSent,
  className = '',
}) {
  const t = T[lang] || T.ar;
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  const [open, setOpen] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [step, setStep] = useState(1);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [pastProposals, setPastProposals] = useState([]);
  const [errors, setErrors] = useState({});

  // Form state
  const [form, setForm] = useState({
    itemName: '',
    itemDesc: '',
    itemValue: '',
    condition: 'condGood',
  });

  // Load past proposals from localStorage
  useEffect(() => {
    if (!adId) return;
    try {
      const raw = localStorage.getItem(LS_KEY(adId));
      if (raw) setPastProposals(JSON.parse(raw));
    } catch { /* ignore */ }
  }, [adId, success]);

  const saveProposal = useCallback((proposal) => {
    if (!adId) return;
    try {
      const existing = JSON.parse(localStorage.getItem(LS_KEY(adId)) || '[]');
      const updated = [proposal, ...existing];
      localStorage.setItem(LS_KEY(adId), JSON.stringify(updated));
      setPastProposals(updated);
    } catch { /* ignore */ }
  }, [adId]);

  const validate = () => {
    const e = {};
    if (step === 1) {
      if (!form.itemName.trim()) e.itemName = t.validName;
    }
    if (step === 2) {
      const v = parseFloat(form.itemValue);
      if (isNaN(v) || v <= 0) e.itemValue = t.validValue;
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleNext = () => {
    if (!validate()) return;
    setStep((s) => s + 1);
  };

  const handleBack = () => {
    setErrors({});
    setStep((s) => s - 1);
  };

  const handleSend = async () => {
    if (!validate()) return;
    setSending(true);
    // Simulate network delay (backend offline — stored locally)
    await new Promise((r) => setTimeout(r, 800));
    const proposal = {
      id: Date.now().toString(),
      adId,
      adTitle,
      ...form,
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
    saveProposal(proposal);
    if (onProposalSent) onProposalSent(proposal);
    setSending(false);
    setSuccess(true);
    setShowForm(false);
    setStep(1);
    setForm({ itemName: '', itemDesc: '', itemValue: '', condition: 'condGood' });
  };

  const resetForm = () => {
    setStep(1);
    setForm({ itemName: '', itemDesc: '', itemValue: '', condition: 'condGood' });
    setErrors({});
    setSuccess(false);
    setShowForm(false);
  };

  const stepLabel = (n) => [t.step1, t.step2, t.step3][n - 1];

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* Google Fonts */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;500;700&display=swap');
        .swap-widget { font-family: ${isRTL ? "'Tajawal', 'Cairo'" : "'Cairo'"}, sans-serif; }
        .swap-widget input, .swap-widget textarea, .swap-widget select { direction: ${dir}; }
        @keyframes swapFadeIn { from { opacity:0; transform: translateY(6px); } to { opacity:1; transform: translateY(0); } }
        .swap-fadein { animation: swapFadeIn 0.25s ease forwards; }
        @keyframes swapSlide { from { max-height:0; opacity:0; } to { max-height:800px; opacity:1; } }
        .swap-slide { animation: swapSlide 0.3s ease forwards; overflow:hidden; }
      `}</style>

      <div dir={dir} className={`swap-widget rounded-2xl border border-indigo-200 bg-white shadow-sm ${className}`}>
        {/* Header toggle */}
        <button
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-between gap-3 px-5 py-4 text-start"
          aria-expanded={open}
        >
          <div className="flex items-center gap-2">
            <span className="text-xl">🔄</span>
            <div>
              <p className="font-bold text-indigo-700 text-base">{t.title}</p>
              <p className="text-xs text-gray-500">{t.subtitle}</p>
            </div>
          </div>
          <span className={`text-indigo-500 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}>▾</span>
        </button>

        {/* Collapsible body */}
        {open && (
          <div className="swap-slide px-5 pb-5">
            {/* Success banner */}
            {success && (
              <div className="swap-fadein mb-4 rounded-xl bg-green-50 border border-green-200 p-4 text-center">
                <p className="font-bold text-green-700 text-base">{t.successTitle}</p>
                <p className="text-sm text-green-600 mt-1">{t.successMsg}</p>
                <button
                  onClick={() => { setSuccess(false); setShowForm(true); }}
                  className="mt-3 text-xs text-indigo-600 underline"
                >
                  {t.newProposal}
                </button>
              </div>
            )}

            {/* Proposal Form */}
            {showForm && !success && (
              <div className="swap-fadein mb-5">
                {/* Step indicator */}
                <div className="flex items-center gap-2 mb-4">
                  {[1, 2, 3].map((n) => (
                    <div key={n} className="flex items-center gap-1">
                      <span className={`flex h-7 w-7 items-center justify-center rounded-full text-xs font-bold transition-colors ${
                        step === n ? 'bg-indigo-600 text-white' :
                        step > n  ? 'bg-green-500 text-white' :
                                    'bg-gray-200 text-gray-500'
                      }`}>
                        {step > n ? '✓' : formatNum(n, lang)}
                      </span>
                      {n < 3 && <div className={`h-0.5 w-6 ${step > n ? 'bg-green-400' : 'bg-gray-200'}`} />}
                    </div>
                  ))}
                  <span className="ms-2 text-sm font-semibold text-indigo-700">{stepLabel(step)}</span>
                </div>

                {/* Step 1 – Describe */}
                {step === 1 && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t.itemName} *</label>
                      <input
                        type="text"
                        value={form.itemName}
                        placeholder={t.placeholderName}
                        onChange={(e) => setForm((f) => ({ ...f, itemName: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                      />
                      {errors.itemName && <p className="mt-1 text-xs text-red-500">{errors.itemName}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t.itemDesc}</label>
                      <textarea
                        rows={3}
                        value={form.itemDesc}
                        placeholder={t.placeholderDesc}
                        onChange={(e) => setForm((f) => ({ ...f, itemDesc: e.target.value }))}
                        className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none"
                      />
                    </div>
                    <div className="rounded-lg bg-indigo-50 p-3 text-xs text-indigo-700">{t.tip}</div>
                  </div>
                )}

                {/* Step 2 – Value & Condition */}
                {step === 2 && (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t.itemValue} *</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="1"
                          value={form.itemValue}
                          onChange={(e) => setForm((f) => ({ ...f, itemValue: e.target.value }))}
                          className="w-full rounded-xl border border-gray-300 px-3 py-2 text-sm focus:border-indigo-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                        />
                        <span className={`absolute top-1/2 -translate-y-1/2 text-xs text-gray-400 ${isRTL ? 'left-3' : 'right-3'}`}>{t.egp}</span>
                      </div>
                      {errors.itemValue && <p className="mt-1 text-xs text-red-500">{errors.itemValue}</p>}
                    </div>
                    <div>
                      <label className="block text-sm font-semibold text-gray-700 mb-1">{t.condition}</label>
                      <div className="flex flex-wrap gap-2">
                        {CONDITIONS.map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => setForm((f) => ({ ...f, condition: c }))}
                            className={`rounded-full px-3 py-1 text-xs font-semibold border transition-colors ${
                              form.condition === c
                                ? 'bg-indigo-600 text-white border-indigo-600'
                                : 'bg-white text-gray-600 border-gray-300 hover:border-indigo-400'
                            }`}
                          >
                            {t[c]}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Step 3 – Preview */}
                {step === 3 && (
                  <div className="space-y-3">
                    <div className="rounded-xl border border-dashed border-indigo-300 bg-indigo-50 p-4 space-y-2">
                      <p className="text-sm font-bold text-indigo-800">
                        🔄 {form.itemName}
                        <span className="font-normal text-indigo-600"> ← {t.forAd}</span>
                        <span className="font-semibold text-indigo-700">{adTitle}</span>
                      </p>
                      {form.itemDesc && (
                        <p className="text-xs text-gray-600">{form.itemDesc}</p>
                      )}
                      <div className="flex gap-4 text-xs text-gray-500">
                        <span>💰 {formatNum(form.itemValue, lang)} {t.egp}</span>
                        <span>📦 {t[form.condition]}</span>
                      </div>
                      {sellerName && (
                        <p className="text-xs text-gray-400">→ {sellerName}</p>
                      )}
                    </div>
                    <p className="text-xs text-gray-400 text-center">{t.statusPending}</p>
                  </div>
                )}

                {/* Navigation buttons */}
                <div className="flex gap-2 mt-4">
                  {step > 1 && (
                    <button
                      onClick={handleBack}
                      className="flex-1 rounded-xl border border-gray-300 py-2 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                    >
                      {t.back}
                    </button>
                  )}
                  {step < 3 && (
                    <button
                      onClick={handleNext}
                      className="flex-1 rounded-xl bg-indigo-600 py-2 text-sm font-semibold text-white hover:bg-indigo-700 transition-colors"
                    >
                      {t.next}
                    </button>
                  )}
                  {step === 3 && (
                    <button
                      onClick={handleSend}
                      disabled={sending}
                      className="flex-1 rounded-xl bg-green-600 py-2 text-sm font-semibold text-white hover:bg-green-700 transition-colors disabled:opacity-60"
                    >
                      {sending ? t.sending : t.send}
                    </button>
                  )}
                  <button
                    onClick={resetForm}
                    className="rounded-xl border border-gray-200 px-3 py-2 text-xs text-gray-400 hover:bg-gray-50 transition-colors"
                  >
                    {t.cancel}
                  </button>
                </div>
              </div>
            )}

            {/* Show form button */}
            {!showForm && !success && (
              <button
                onClick={() => setShowForm(true)}
                className="w-full rounded-xl bg-indigo-600 py-2.5 text-sm font-bold text-white hover:bg-indigo-700 transition-colors mb-4"
              >
                🔄 {t.newProposal}
              </button>
            )}

            {/* Past proposals */}
            <div>
              <p className="text-sm font-bold text-gray-700 mb-2">{t.pastTitle}</p>
              {pastProposals.length === 0 ? (
                <p className="text-xs text-gray-400 text-center py-2">{t.noPast}</p>
              ) : (
                <ul className="space-y-2">
                  {pastProposals.map((p) => (
                    <li key={p.id} className="rounded-xl border border-gray-100 bg-gray-50 p-3">
                      <div className="flex items-center justify-between gap-2 flex-wrap">
                        <p className="text-sm font-semibold text-gray-800">🔄 {p.itemName}</p>
                        <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${STATUS_COLORS[p.status] || STATUS_COLORS.pending}`}>
                          {t[`status${p.status.charAt(0).toUpperCase() + p.status.slice(1)}`] || p.status}
                        </span>
                      </div>
                      {p.itemDesc && (
                        <p className="text-xs text-gray-500 mt-1 line-clamp-2">{p.itemDesc}</p>
                      )}
                      <div className="flex gap-3 mt-1 text-xs text-gray-400">
                        <span>💰 {formatNum(p.itemValue, lang)} {t.egp}</span>
                        <span>📦 {t[p.condition]}</span>
                        <span>📅 {formatDate(p.createdAt, lang)}</span>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}
      </div>
    </>
  );
}
