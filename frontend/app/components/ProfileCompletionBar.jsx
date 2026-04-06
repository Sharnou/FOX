'use client';
import { useMemo } from 'react';

// Arabic-Indic numeral converter
const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const LABELS = {
  ar: {
    title: 'اكتمال الملف الشخصي',
    subtitle: 'أكمل ملفك لزيادة مصداقيتك وجذب المشترين',
    complete: 'ملفك الشخصي مكتمل! 🎉',
    completeHint: 'أنت الآن في أعلى نتائج البحث',
    missing: 'ما يجب إكماله:',
    boost: 'ملفك المكتمل يزيد ظهور إعلاناتك بنسبة ٣ أضعاف',
    fields: {
      photo: 'صورة الملف الشخصي',
      phone: 'رقم الهاتف المُحقَّق',
      description: 'وصف البائع',
      location: 'الموقع الجغرافي',
      whatsapp: 'رقم واتساب',
      email: 'البريد الإلكتروني المُحقَّق',
    },
  },
  en: {
    title: 'Profile Completion',
    subtitle: 'Complete your profile to build trust with buyers',
    complete: 'Profile complete! 🎉',
    completeHint: "You're now ranked higher in search results",
    missing: 'Complete these to improve:',
    boost: 'A complete profile gets 3× more visibility',
    fields: {
      photo: 'Profile photo',
      phone: 'Verified phone',
      description: 'Seller description',
      location: 'Location',
      whatsapp: 'WhatsApp number',
      email: 'Verified email',
    },
  },
  de: {
    title: 'Profilabschluss',
    subtitle: 'Vervollständige dein Profil für mehr Vertrauen',
    complete: 'Profil vollständig! 🎉',
    completeHint: 'Du erscheinst jetzt höher in Suchergebnissen',
    missing: 'Noch zu erledigen:',
    boost: 'Vollständige Profile erhalten 3× mehr Sichtbarkeit',
    fields: {
      photo: 'Profilbild',
      phone: 'Verifizierte Telefonnummer',
      description: 'Verkäuferbeschreibung',
      location: 'Standort',
      whatsapp: 'WhatsApp-Nummer',
      email: 'Verifizierte E-Mail',
    },
  },
};

const FIELD_ICONS = {
  photo: '🖼️',
  phone: '📱',
  description: '📝',
  location: '📍',
  whatsapp: '💬',
  email: '✉️',
};

export default function ProfileCompletionBar({
  completionPercent = 0,
  missingFields = [],
  lang = 'ar',
  onFieldClick,
}) {
  const t = LABELS[lang] || LABELS.ar;
  const isRTL = lang === 'ar';
  const isComplete = completionPercent >= 100;

  const barColor = useMemo(() => {
    if (completionPercent < 40) return 'bg-red-500';
    if (completionPercent < 70) return 'bg-amber-500';
    return 'bg-emerald-500';
  }, [completionPercent]);

  const displayPct = isRTL
    ? `${toArabicNumerals(completionPercent)}٪`
    : `${completionPercent}%`;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className="w-full rounded-2xl border border-gray-200 bg-white p-4 shadow-sm font-cairo"
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-1">
        <span className="text-sm font-bold text-gray-800">{t.title}</span>
        <span
          className={`text-sm font-extrabold ${
            isComplete ? 'text-emerald-600' : 'text-gray-700'
          }`}
        >
          {displayPct}
        </span>
      </div>

      {!isComplete && (
        <p className="text-xs text-gray-500 mb-3">{t.subtitle}</p>
      )}

      {/* Progress Bar */}
      <div className="relative w-full h-3 bg-gray-100 rounded-full overflow-hidden mb-3">
        <div
          className={`h-full rounded-full transition-all duration-700 ${barColor} relative`}
          style={{ width: `${Math.min(completionPercent, 100)}%` }}
        >
          {/* Shimmer */}
          <span
            className="absolute inset-0 block"
            style={{
              background:
                'linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.35) 50%,transparent 100%)',
              animation: 'shimmer 1.8s infinite',
            }}
          />
        </div>
      </div>

      {isComplete ? (
        <div className="text-center">
          <p className="text-emerald-600 font-bold text-sm">{t.complete}</p>
          <p className="text-xs text-gray-500 mt-1">{t.completeHint}</p>
        </div>
      ) : (
        <>
          {/* Boost hint */}
          <div className="flex items-center gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-3">
            <span className="text-amber-500 text-sm">⚡</span>
            <p className="text-xs text-amber-700 font-medium">{t.boost}</p>
          </div>

          {/* Missing fields */}
          {missingFields.length > 0 && (
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">{t.missing}</p>
              <ul className="space-y-1.5">
                {missingFields.map((field) => (
                  <li
                    key={field}
                    className="flex items-center gap-2 cursor-pointer group"
                    onClick={() => onFieldClick && onFieldClick(field)}
                  >
                    <span className="text-base">{FIELD_ICONS[field] || '➕'}</span>
                    <span className="text-xs text-gray-700 group-hover:text-blue-600 transition-colors underline-offset-2 group-hover:underline">
                      {t.fields[field] || field}
                    </span>
                    <span className={`${
                      isRTL ? 'mr-auto' : 'ml-auto'
                    } text-gray-300 group-hover:text-blue-400 text-xs`}>
                      {isRTL ? '←' : '→'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </>
      )}

      <style jsx>{`
        @keyframes shimmer {
          0% { transform: translateX(-100%); }
          100% { transform: translateX(200%); }
        }
      `}</style>
    </div>
  );
}
