'use client';
import { useState } from 'react';

/**
 * SafeMeetingSpotSuggester
 * Suggests safe public meeting locations for buyer/seller in-person transactions.
 *
 * Props:
 *   lang        {'ar'|'en'|'de'}  – display language (default 'ar')
 *   city        {string}            – user's city name (optional, for display)
 *   onSelect    {function}          – callback({name, type, address}) when spot chosen
 *   compact     {boolean}           – icon-only trigger button (default false)
 */

const LABELS = {
  ar: {
    title:      'اختر مكان تبادل آمن',
    subtitle:   'التقِ في أماكن عامة وآمنة لحماية نفسك',
    trigger:    'مكان آمن للتبادل',
    copy:       'نسخ العنوان',
    copied:     'تم النسخ!',
    whatsapp:   'إرسال عبر واتساب',
    select:     'اختيار',
    types: {
      police:   'مركز شرطة',
      mall:     'مركز تسوق',
      bank:     'بنك / ماكينة ATM',
      cafe:     'مقهى عام',
      post:     'مكتب بريد',
      hospital: 'مستشفى / صيدلية',
    },
    tip:        '💡 نصيحة: لا تلتقِ في أماكن مجهولة أو معزولة. أخبر أحد معارفك بمكان اللقاء.',
    close:      'إغلاق',
  },
  en: {
    title:      'Choose a Safe Meeting Spot',
    subtitle:   'Always meet in public places to stay safe',
    trigger:    'Safe Meeting Spot',
    copy:       'Copy Address',
    copied:     'Copied!',
    whatsapp:   'Send via WhatsApp',
    select:     'Select',
    types: {
      police:   'Police Station',
      mall:     'Shopping Mall',
      bank:     'Bank / ATM',
      cafe:     'Public Café',
      post:     'Post Office',
      hospital: 'Hospital / Pharmacy',
    },
    tip:        "💡 Tip: Never meet in unknown or isolated locations. Tell someone you trust where you're going.",
    close:      'Close',
  },
  de: {
    title:      'Sicheren Treffpunkt wählen',
    subtitle:   'Treffe dich immer an öffentlichen Orten',
    trigger:    'Sicherer Treffpunkt',
    copy:       'Adresse kopieren',
    copied:     'Kopiert!',
    whatsapp:   'Über WhatsApp senden',
    select:     'Auswählen',
    types: {
      police:   'Polizeiwache',
      mall:     'Einkaufszentrum',
      bank:     'Bank / Geldautomat',
      cafe:     'Öffentliches Café',
      post:     'Postamt',
      hospital: 'Krankenhaus / Apotheke',
    },
    tip:        '💡 Tipp: Treffe dich nie an unbekannten oder abgelegenen Orten. Informiere jemanden über deinen Aufenthaltsort.',
    close:      'Schließen',
  },
};

const TYPE_ICONS = {
  police:   '🚔',
  mall:     '🏬',
  bank:     '🏦',
  cafe:     '☕',
  post:     '📮',
  hospital: '🏥',
};

const TYPE_COLORS = {
  police:   'bg-blue-50 border-blue-200 text-blue-800',
  mall:     'bg-purple-50 border-purple-200 text-purple-800',
  bank:     'bg-green-50 border-green-200 text-green-800',
  cafe:     'bg-amber-50 border-amber-200 text-amber-800',
  post:     'bg-orange-50 border-orange-200 text-orange-800',
  hospital: 'bg-red-50 border-red-200 text-red-800',
};

// Generic safe spots (city-agnostic, ordered by safety level)
const DEFAULT_SPOTS = [
  { id: 1, type: 'police',   nameAr: 'أقرب مركز شرطة',         nameEn: 'Nearest Police Station',     nameDe: 'Nächste Polizeiwache',         address: '' },
  { id: 2, type: 'mall',     nameAr: 'مركز التسوق الرئيسي',    nameEn: 'Main Shopping Mall',         nameDe: 'Haupteinkaufszentrum',         address: '' },
  { id: 3, type: 'bank',     nameAr: 'فرع البنك الرئيسي',      nameEn: 'Main Bank Branch',           nameDe: 'Hauptbankfiliale',             address: '' },
  { id: 4, type: 'cafe',     nameAr: 'مقهى في مكان عام مزدحم', nameEn: 'Café in a Busy Public Area', nameDe: 'Café in belebter Gegend',      address: '' },
  { id: 5, type: 'post',     nameAr: 'مكتب بريد حكومي',        nameEn: 'Government Post Office',     nameDe: 'Staatliches Postamt',          address: '' },
  { id: 6, type: 'hospital', nameAr: 'صيدلية أو مستشفى عام',   nameEn: 'Public Pharmacy / Hospital', nameDe: 'Öffentliche Apotheke / Klinik', address: '' },
];

export default function SafeMeetingSpotSuggester({
  lang = 'ar',
  city = '',
  onSelect = null,
  compact = false,
}) {
  const [open, setOpen]       = useState(false);
  const [copied, setCopied]   = useState(null);
  const [selected, setSelected] = useState(null);

  const t    = LABELS[lang] || LABELS.ar;
  const isRTL = lang === 'ar';

  function getSpotName(spot) {
    if (lang === 'ar') return spot.nameAr;
    if (lang === 'de') return spot.nameDe;
    return spot.nameEn;
  }

  function handleCopy(spot) {
    const text = `${getSpotName(spot)}${city ? ' - ' + city : ''}`;
    navigator.clipboard.writeText(text).then(() => {
      setCopied(spot.id);
      setTimeout(() => setCopied(null), 2000);
    });
  }

  function handleWhatsApp(spot) {
    const text = encodeURIComponent(
      `${t.title}: ${getSpotName(spot)}${city ? ' - ' + city : ''}`
    );
    window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function handleSelect(spot) {
    setSelected(spot.id);
    if (onSelect) onSelect({ name: getSpotName(spot), type: spot.type, address: spot.address });
    setTimeout(() => setOpen(false), 600);
  }

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: isRTL ? 'Cairo, Tajawal, sans-serif' : 'inherit' }}>
      {/* Trigger Button */}
      <button
        onClick={() => setOpen(true)}
        className={`inline-flex items-center gap-2 px-4 py-2 rounded-xl font-semibold text-sm
          bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow transition-all duration-150
          ${compact ? 'px-2 py-2' : ''}`}
        title={t.trigger}
      >
        <span className="text-base">🛡️</span>
        {!compact && <span>{t.trigger}</span>}
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
          onClick={(e) => e.target === e.currentTarget && setOpen(false)}
        >
          {/* Modal */}
          <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden animate-in slide-in-from-bottom-4 duration-300">
            {/* Header */}
            <div className="bg-emerald-600 px-5 py-4 text-white">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-2xl">🛡️</span>
                  <div>
                    <h2 className="font-bold text-lg leading-tight">{t.title}</h2>
                    {city && <p className="text-emerald-100 text-xs">{city}</p>}
                  </div>
                </div>
                <button
                  onClick={() => setOpen(false)}
                  className="text-emerald-100 hover:text-white text-xl leading-none"
                  aria-label={t.close}
                >✕</button>
              </div>
              <p className="text-emerald-100 text-xs mt-1">{t.subtitle}</p>
            </div>

            {/* Spots List */}
            <div className="divide-y divide-gray-100 max-h-72 overflow-y-auto">
              {DEFAULT_SPOTS.map((spot) => (
                <div
                  key={spot.id}
                  className={`flex items-center gap-3 px-4 py-3 hover:bg-gray-50 transition-colors
                    ${selected === spot.id ? 'bg-emerald-50' : ''}`}
                >
                  {/* Icon + Type Badge */}
                  <span className={`flex-shrink-0 w-10 h-10 rounded-xl flex items-center justify-center text-xl border ${TYPE_COLORS[spot.type]}`}>
                    {TYPE_ICONS[spot.type]}
                  </span>

                  {/* Name */}
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold text-gray-800 text-sm truncate">{getSpotName(spot)}</p>
                    <p className="text-xs text-gray-400">{t.types[spot.type]}</p>
                  </div>

                  {/* Actions */}
                  <div className={`flex items-center gap-1 flex-shrink-0 ${isRTL ? 'flex-row-reverse' : ''}`}>
                    {/* Copy */}
                    <button
                      onClick={() => handleCopy(spot)}
                      className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 hover:text-gray-700 transition"
                      title={copied === spot.id ? t.copied : t.copy}
                    >
                      {copied === spot.id ? '✅' : '📋'}
                    </button>

                    {/* WhatsApp */}
                    <button
                      onClick={() => handleWhatsApp(spot)}
                      className="p-1.5 rounded-lg hover:bg-green-50 text-green-600 hover:text-green-700 transition"
                      title={t.whatsapp}
                    >
                      📲
                    </button>

                    {/* Select */}
                    <button
                      onClick={() => handleSelect(spot)}
                      className={`px-3 py-1 rounded-lg text-xs font-semibold transition
                        ${selected === spot.id
                          ? 'bg-emerald-600 text-white'
                          : 'bg-gray-100 hover:bg-emerald-600 hover:text-white text-gray-700'
                        }`}
                    >
                      {selected === spot.id ? '✓' : t.select}
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Safety Tip */}
            <div className="px-4 py-3 bg-amber-50 border-t border-amber-100">
              <p className="text-xs text-amber-800 leading-relaxed">{t.tip}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
