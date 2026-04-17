import React, { useState, useMemo } from 'react';

// Arabic-Indic numeral converter
const toArabicIndic = (n) => {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
};

const TRANSLATIONS = {
  ar: {
    title: 'حالة الإعلان',
    active: 'نشط',
    grace: 'فترة السماح',
    expired: 'منتهي الصلاحية',
    daysSincePosted: 'أيام منذ النشر',
    daysRemaining: 'أيام متبقية',
    gracePeriod: 'فترة السماح',
    graceDaysLeft: 'أيام متبقية في فترة السماح',
    reshare: 'إعادة النشر',
    reshareNow: 'أعد نشر إعلانك الآن',
    expiredMsg: 'انتهت صلاحية إعلانك',
    graceMsg: 'إعلانك في فترة السماح',
    activeMsg: 'إعلانك نشط',
    postedAgo: 'نُشر منذ',
    days: 'يوم',
    outOf: 'من',
    activePeriod: 'مرحلة النشاط',
    gracePeriodLabel: 'فترة السماح',
    expiredLabel: 'منتهٍ',
    timeline: 'الجدول الزمني',
    adActive: 'نشط (٣٠ يومًا)',
    adGrace: 'سماح (٧ أيام)',
    adExpired: 'منتهٍ',
  },
  en: {
    title: 'Ad Status',
    active: 'Active',
    grace: 'Grace Period',
    expired: 'Expired',
    daysSincePosted: 'Days since posted',
    daysRemaining: 'Days remaining',
    gracePeriod: 'Grace Period',
    graceDaysLeft: 'Grace days left',
    reshare: 'Reshare',
    reshareNow: 'Reshare your ad now',
    expiredMsg: 'Your ad has expired',
    graceMsg: 'Your ad is in the grace period',
    activeMsg: 'Your ad is active',
    postedAgo: 'Posted',
    days: 'days',
    outOf: 'of',
    activePeriod: 'Active Period',
    gracePeriodLabel: 'Grace Period',
    expiredLabel: 'Expired',
    timeline: 'Timeline',
    adActive: 'Active (30 days)',
    adGrace: 'Grace (7 days)',
    adExpired: 'Expired',
  },
  de: {
    title: 'Anzeigenstatus',
    active: 'Aktiv',
    grace: 'Kulanzzeit',
    expired: 'Abgelaufen',
    daysSincePosted: 'Tage seit Veröffentlichung',
    daysRemaining: 'Verbleibende Tage',
    gracePeriod: 'Kulanzzeit',
    graceDaysLeft: 'Verbleibende Kulanztage',
    reshare: 'Erneut teilen',
    reshareNow: 'Jetzt erneut teilen',
    expiredMsg: 'Ihre Anzeige ist abgelaufen',
    graceMsg: 'Ihre Anzeige befindet sich in der Kulanzzeit',
    activeMsg: 'Ihre Anzeige ist aktiv',
    postedAgo: 'Veröffentlicht vor',
    days: 'Tagen',
    outOf: 'von',
    activePeriod: 'Aktivphase',
    gracePeriodLabel: 'Kulanzzeit',
    expiredLabel: 'Abgelaufen',
    timeline: 'Zeitverlauf',
    adActive: 'Aktiv (30 Tage)',
    adGrace: 'Kulanz (7 Tage)',
    adExpired: 'Abgelaufen',
  },
};

// SVG ring progress component
const RingProgress = ({ percent, color, size = 80, strokeWidth = 8, children }) => {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percent / 100) * circumference;

  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90" aria-hidden="true">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className="text-gray-200"
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 0.6s ease' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        {children}
      </div>
    </div>
  );
};

const AdLifecycleTracker = ({
  createdAt,
  isOwner = false,
  onReshare,
  lang: initialLang = 'ar',
  className = '',
}) => {
  const [lang, setLang] = useState(initialLang);
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === 'ar';


  const lifecycle = useMemo(() => {
    const now = new Date();
    const created = new Date(createdAt);
    const daysSincePosted = Math.floor((now - created) / (1000 * 60 * 60 * 24));

    if (daysSincePosted < ACTIVE_DAYS) {
      const daysRemaining = ACTIVE_DAYS - daysSincePosted;
      const phase = daysRemaining > 7 ? 'active-safe' : 'active-warn';
      return { phase, daysSincePosted, daysRemaining, graceDaysLeft: 0 };
    } else if (daysSincePosted < ACTIVE_DAYS + GRACE_DAYS) {
      const graceDaysLeft = ACTIVE_DAYS + GRACE_DAYS - daysSincePosted;
      return { phase: 'grace', daysSincePosted, daysRemaining: 0, graceDaysLeft };
    } else {
      return { phase: 'expired', daysSincePosted, daysRemaining: 0, graceDaysLeft: 0 };
    }
  }, [createdAt]);

  const phaseConfig = {
    'active-safe': {
      label: t.active,
      color: '#16a34a',
      bgClass: 'bg-green-50 border-green-200',
      badgeClass: 'bg-green-100 text-green-800',
      ringColor: '#16a34a',
      msgClass: 'text-green-700',
      icon: '✅',
    },
    'active-warn': {
      label: t.active,
      color: '#ca8a04',
      bgClass: 'bg-yellow-50 border-yellow-200',
      badgeClass: 'bg-yellow-100 text-yellow-800',
      ringColor: '#ca8a04',
      msgClass: 'text-yellow-700',
      icon: '⚠️',
    },
    grace: {
      label: t.grace,
      color: '#ea580c',
      bgClass: 'bg-orange-50 border-orange-200',
      badgeClass: 'bg-orange-100 text-orange-800',
      ringColor: '#ea580c',
      msgClass: 'text-orange-700',
      icon: '🕐',
    },
    expired: {
      label: t.expired,
      color: '#dc2626',
      bgClass: 'bg-red-50 border-red-200',
      badgeClass: 'bg-red-100 text-red-800',
      ringColor: '#dc2626',
      msgClass: 'text-red-700',
      icon: '❌',
    },
  };

  const cfg = phaseConfig[lifecycle.phase];

  // Ring percent: active = remaining/30, grace = graceDaysLeft/7, expired = 0
  const ringPercent =
    lifecycle.phase === 'active-safe' || lifecycle.phase === 'active-warn'
      ? Math.round((lifecycle.daysRemaining / ACTIVE_DAYS) * 100)
      : lifecycle.phase === 'grace'
      ? Math.round((lifecycle.graceDaysLeft / GRACE_DAYS) * 100)
      : 0;

  const numFmt = (n) => (lang === 'ar' ? toArabicIndic(n) : String(n));

  // Timeline steps
  const steps = [
    {
      key: 'active',
      label: t.adActive,
      done: lifecycle.daysSincePosted >= 0,
      current: lifecycle.phase === 'active-safe' || lifecycle.phase === 'active-warn',
      color: lifecycle.phase === 'active-safe' ? '#16a34a' : lifecycle.phase === 'active-warn' ? '#ca8a04' : '#16a34a',
    },
    {
      key: 'grace',
      label: t.adGrace,
      done: lifecycle.phase === 'grace' || lifecycle.phase === 'expired',
      current: lifecycle.phase === 'grace',
      color: '#ea580c',
    },
    {
      key: 'expired',
      label: t.adExpired,
      done: lifecycle.phase === 'expired',
      current: lifecycle.phase === 'expired',
      color: '#dc2626',
    },
  ];

  const showReshare = isOwner && (lifecycle.phase === 'grace' || lifecycle.phase === 'expired');

  return (
    <div
      className={`rounded-2xl border-2 p-5 shadow-sm font-sans transition-all ${cfg.bgClass} ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
      style={{ fontFamily: isRTL ? "'Cairo', 'Tajawal', sans-serif" : 'inherit' }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xl" aria-hidden="true">{cfg.icon}</span>
          <h2 className="text-base font-bold text-gray-800">{t.title}</h2>
          <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${cfg.badgeClass}`}>
            {cfg.label}
          </span>
        </div>

        {/* Language switcher */}
        <div className="flex gap-1" role="group" aria-label="Language selector">
          {['ar', 'en', 'de'].map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`text-xs px-2 py-1 rounded-md border font-medium transition-colors ${
                lang === l
                  ? 'bg-gray-800 text-white border-gray-800'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-gray-500'
              }`}
              aria-pressed={lang === l}
            >
              {l === 'ar' ? 'ع' : l === 'en' ? 'EN' : 'DE'}
            </button>
          ))}
        </div>
      </div>

      {/* Main content */}
      <div className="flex flex-wrap items-center gap-5 mb-5">
        {/* Ring */}
        <RingProgress percent={ringPercent} color={cfg.ringColor} size={88} strokeWidth={8}>
          <div className="text-center leading-tight">
            <div className="text-lg font-extrabold text-gray-800" aria-live="polite">
              {lifecycle.phase === 'active-safe' || lifecycle.phase === 'active-warn'
                ? numFmt(lifecycle.daysRemaining)
                : lifecycle.phase === 'grace'
                ? numFmt(lifecycle.graceDaysLeft)
                : numFmt(0)}
            </div>
            <div className="text-[9px] text-gray-500 leading-none mt-0.5">{t.days}</div>
          </div>
        </RingProgress>

        {/* Stats */}
        <div className="flex-1 min-w-[140px] space-y-3">
          {/* Days since posted */}
          <div>
            <div className="text-xs text-gray-500 mb-0.5">{t.daysSincePosted}</div>
            <div className="flex items-center gap-2">
              <div className="h-2 rounded-full bg-gray-200 flex-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700"
                  style={{
                    width: `${Math.min((lifecycle.daysSincePosted / (ACTIVE_DAYS + GRACE_DAYS)) * 100, 100)}%`,
                    backgroundColor: cfg.ringColor,
                  }}
                />
              </div>
              <span className="text-xs font-bold text-gray-700 tabular-nums">
                {numFmt(lifecycle.daysSincePosted)}
              </span>
            </div>
          </div>

          {/* Active period */}
          <div>
            <div className="text-xs text-gray-500 mb-0.5">{t.activePeriod}</div>
            <div className="flex items-center gap-2">
              <div className="h-2 rounded-full bg-gray-200 flex-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-green-500"
                  style={{
                    width: `${Math.min((Math.min(lifecycle.daysSincePosted, ACTIVE_DAYS) / ACTIVE_DAYS) * 100, 100)}%`,
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">
                {numFmt(Math.min(lifecycle.daysSincePosted, ACTIVE_DAYS))}/{numFmt(ACTIVE_DAYS)}
              </span>
            </div>
          </div>

          {/* Grace period */}
          <div>
            <div className="text-xs text-gray-500 mb-0.5">{t.gracePeriodLabel}</div>
            <div className="flex items-center gap-2">
              <div className="h-2 rounded-full bg-gray-200 flex-1 overflow-hidden">
                <div
                  className="h-full rounded-full transition-all duration-700 bg-orange-400"
                  style={{
                    width:
                      lifecycle.phase === 'grace'
                        ? `${((GRACE_DAYS - lifecycle.graceDaysLeft) / GRACE_DAYS) * 100}%`
                        : lifecycle.phase === 'expired'
                        ? '100%'
                        : '0%',
                  }}
                />
              </div>
              <span className="text-xs text-gray-500 tabular-nums">
                {lifecycle.phase === 'grace'
                  ? `${numFmt(GRACE_DAYS - lifecycle.graceDaysLeft)}/${numFmt(GRACE_DAYS)}`
                  : lifecycle.phase === 'expired'
                  ? `${numFmt(GRACE_DAYS)}/${numFmt(GRACE_DAYS)}`
                  : `${numFmt(0)}/${numFmt(GRACE_DAYS)}`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="mb-4">
        <div className="text-xs text-gray-500 mb-2 font-medium">{t.timeline}</div>
        <div className="relative flex items-center">
          {steps.map((step, i) => (
            <React.Fragment key={step.key}>
              {/* Node */}
              <div className="flex flex-col items-center z-10">
                <div
                  className="w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all"
                  style={{
                    backgroundColor: step.done ? step.color : '#e5e7eb',
                    borderColor: step.done ? step.color : '#d1d5db',
                  }}
                >
                  {step.done && (
                    <svg className="w-2.5 h-2.5 text-white" viewBox="0 0 12 12" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span
                  className="text-[9px] mt-1 text-center leading-tight max-w-[56px]"
                  style={{ color: step.done ? step.color : '#9ca3af', fontWeight: step.current ? 700 : 400 }}
                >
                  {step.label}
                </span>
              </div>
              {/* Connector */}
              {i < steps.length - 1 && (
                <div className="flex-1 h-0.5 mx-1 rounded-full transition-all" style={{ backgroundColor: steps[i + 1].done ? steps[i + 1].color : '#e5e7eb' }} />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Status message */}
      <p className={`text-sm font-medium mb-3 ${cfg.msgClass}`}>
        {lifecycle.phase === 'active-safe' || lifecycle.phase === 'active-warn'
          ? `${t.activeMsg} — ${numFmt(lifecycle.daysRemaining)} ${t.days}`
          : lifecycle.phase === 'grace'
          ? `${t.graceMsg} — ${numFmt(lifecycle.graceDaysLeft)} ${t.days}`
          : t.expiredMsg}
      </p>

      {/* Reshare CTA */}
      {showReshare && (
        <button
          onClick={onReshare}
          className="w-full py-2.5 px-4 rounded-xl font-bold text-sm text-white transition-all active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2"
          style={{
            backgroundColor: lifecycle.phase === 'grace' ? '#ea580c' : '#dc2626',
            boxShadow: `0 4px 14px 0 ${lifecycle.phase === 'grace' ? '#ea580c55' : '#dc262655'}`,
          }}
          aria-label={t.reshareNow}
        >
          🔄 {t.reshareNow}
        </button>
      )}
    </div>
  );
};

export default AdLifecycleTracker;
