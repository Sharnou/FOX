'use client';

import { useState, useEffect } from 'react';

/**
 * AdRenewalReminderBanner
 * Shows a contextual banner when an ad enters the 7-day grace period after expiry.
 * Directly maps to XTOX business logic: 30 days active → 7-day grace → reshare (+30) OR hard delete.
 *
 * Props:
 *   ad        { _id, title, expiresAt, graceUntil, status }
 *   lang      'ar' | 'en' | 'de'  (default 'ar')
 *   onRenew   (adId) => Promise<void>   — call your API to reshare the ad
 *   onDelete  (adId) => void            — call your API to hard-delete the ad
 */

const LABELS = {
  ar: {
    gracePeriod: 'إعلانك في فترة السماح',
    expires: 'ينتهي نهائياً في',
    renew: 'تجديد الإعلان (+٣٠ يوم)',
    delete: 'حذف الإعلان',
    daysLeft: (n) => (toArabicNumerals(n)) + ' ' + (n === 1 ? 'يوم' : 'أيام') + ' متبقية',
    description: 'جدّد إعلانك الآن وإلا سيُحذف مع جميع الصور والمحادثات نهائياً.',
    renewed: 'تم تجديد إعلانك بنجاح! ✓',
  },
  en: {
    gracePeriod: 'Your ad is in grace period',
    expires: 'Permanently deleted on',
    renew: 'Renew Ad (+30 days)',
    delete: 'Delete Ad',
    daysLeft: (n) => (n) + ' day' + (n !== 1 ? 's' : '') + ' left',
    description: 'Renew your ad now or it will be permanently deleted along with all photos and chats.',
    renewed: 'Ad renewed successfully! ✓',
  },
  de: {
    gracePeriod: 'Ihre Anzeige ist in der Nachfrist',
    expires: 'Endgültig gelöscht am',
    renew: 'Anzeige verlängern (+30 Tage)',
    delete: 'Anzeige löschen',
    daysLeft: (n) => 'Noch ' + (n) + ' Tag' + (n !== 1 ? 'e' : ''),
    description:
      'Verlängern Sie Ihre Anzeige jetzt, sonst wird sie zusammen mit allen Fotos und Chats dauerhaft gelöscht.',
    renewed: 'Anzeige erfolgreich verlängert! ✓',
  },
};

function toArabicNumerals(n) {
  return String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function getDaysLeft(graceUntil) {
  const diff = new Date(graceUntil) - new Date();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}

function formatDate(dateStr, lang) {
  const d = new Date(dateStr);
  if (lang === 'ar') return d.toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
  if (lang === 'de') return d.toLocaleDateString('de-DE', { year: 'numeric', month: 'long', day: 'numeric' });
  return d.toLocaleDateString('en-GB', { year: 'numeric', month: 'long', day: 'numeric' });
}

export default function AdRenewalReminderBanner({ ad, lang = 'ar', onRenew, onDelete }) {
  const t = LABELS[lang] || LABELS.ar;
  const isRtl = lang === 'ar';

  const [daysLeft, setDaysLeft] = useState(getDaysLeft(ad?.graceUntil));
  const [loading, setLoading] = useState(false);
  const [renewed, setRenewed] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setDaysLeft(getDaysLeft(ad?.graceUntil)), 60_000);
    return () => clearInterval(timer);
  }, [ad?.graceUntil]);

  if (dismissed || !ad || ad.status !== 'grace') return null;

  /* ── Urgency palette ── */
  const urgency = daysLeft <= 1 ? 'red' : daysLeft <= 3 ? 'orange' : 'amber';
  const palette = {
    red:    { bg: 'bg-red-50',    border: 'border-red-400',    text: 'text-red-800',    badge: 'bg-red-500',    btn: 'bg-red-600 hover:bg-red-700' },
    orange: { bg: 'bg-orange-50', border: 'border-orange-400', text: 'text-orange-800', badge: 'bg-orange-500', btn: 'bg-orange-600 hover:bg-orange-700' },
    amber:  { bg: 'bg-amber-50',  border: 'border-amber-400',  text: 'text-amber-800',  badge: 'bg-amber-500',  btn: 'bg-amber-600 hover:bg-amber-700' },
  };
  const c = palette[urgency];

  async function handleRenew() {
    setLoading(true);
    try {
      await onRenew?.(ad._id);
      setRenewed(true);
      setTimeout(() => setDismissed(true), 2500);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={'w-full rounded-xl border-2 ' + (c.border) + ' ' + (c.bg) + ' p-4 shadow-sm font-[\'Cairo\',\'Tajawal\',sans-serif] mb-4'}
      role="alert"
      aria-live="assertive"
    >
      {renewed ? (
        <div className="flex items-center justify-center gap-3 py-2">
          <span className="text-green-600 text-xl font-bold">{t.renewed}</span>
        </div>
      ) : (
        <>
          {/* ── Header ── */}
          <div className="flex items-start justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-2xl select-none">⏳</span>
              <div className="min-w-0">
                <p className={'font-bold text-base ' + (c.text)}>{t.gracePeriod}</p>
                <p className="text-gray-500 text-sm mt-0.5 truncate max-w-[220px]">
                  {lang === 'ar' ? '«' : '"'}{ad.title}{lang === 'ar' ? '»' : '"'}
                </p>
              </div>
            </div>

            {/* Days-left badge + dismiss */}
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={(c.badge) + ' text-white text-xs font-bold px-3 py-1 rounded-full'}>
                {t.daysLeft(daysLeft)}
              </span>
              <button
                onClick={() => setDismissed(true)}
                className="text-gray-400 hover:text-gray-600 transition-colors text-xl leading-none"
                aria-label="dismiss"
              >
                ×
              </button>
            </div>
          </div>

          {/* ── Description + expiry date ── */}
          <p className={'mt-2 text-sm ' + (c.text) + ' opacity-80'}>{t.description}</p>
          <p className="text-xs text-gray-400 mt-1">
            {t.expires}:{' '}
            <span className="font-medium">{formatDate(ad.graceUntil, lang)}</span>
          </p>

          {/* ── Countdown progress bar (7 days = full) ── */}
          <div className="mt-3 h-1.5 rounded-full bg-gray-200 overflow-hidden">
            <div
              className={'h-full rounded-full transition-all duration-700 ' + (urgency === 'red' ? 'bg-red-500' : urgency === 'orange' ? 'bg-orange-500' : 'bg-amber-500')}
              style={{ width: (Math.min(100, (daysLeft / 7) * 100)) + '%' }}
            />
          </div>

          {/* ── Actions ── */}
          <div className="mt-4 flex gap-3 flex-wrap">
            <button
              onClick={handleRenew}
              disabled={loading}
              className={'flex-1 min-w-[140px] ' + (c.btn) + ' text-white font-bold py-2.5 px-4 rounded-lg transition-all text-sm disabled:opacity-60 disabled:cursor-not-allowed'}
            >
              {loading ? '...' : t.renew}
            </button>
            <button
              onClick={() => onDelete?.(ad._id)}
              className="px-4 py-2.5 rounded-lg border border-gray-300 text-gray-600 text-sm hover:bg-gray-50 transition-all"
            >
              {t.delete}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
