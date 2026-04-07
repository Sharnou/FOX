/**
 * BulkAdManager.jsx
 * XTOX — Bulk Ad Management Panel for Sellers
 *
 * Features:
 *  - Checkbox selection per ad row (select all / deselect all)
 *  - Bulk action buttons: Pause Selected, Activate Selected, Extend (+30d), Delete Selected
 *  - Per-ad status indicator (active / paused / expired / grace)
 *  - Confirmation modal before destructive actions (delete)
 *  - Arabic-Indic numerals for counts
 *  - Tri-lingual AR / EN / DE labels
 *  - Cairo / Tajawal fonts (Google Fonts CDN)
 *  - RTL-aware (direction based on lang)
 *  - Tailwind only, zero external dependencies
 *
 * Props:
 *  - ads[]          : array of { _id, title, status, expiresAt, views }
 *  - lang           : 'ar' | 'en' | 'de'
 *  - onBulkPause    : (ids[]) => void
 *  - onBulkActivate : (ids[]) => void
 *  - onBulkExtend   : (ids[]) => void
 *  - onBulkDelete   : (ids[]) => void
 */

import { useState, useCallback, useMemo } from 'react';

/* ─────────────────────────────────────────────
   1.  i18n / label dictionary
───────────────────────────────────────────── */
const LABELS = {
  ar: {
    title:          'إدارة الإعلانات بالجملة',
    selectAll:      'تحديد الكل',
    deselectAll:    'إلغاء تحديد الكل',
    ad:             'الإعلان',
    status:         'الحالة',
    expires:        'تنتهي في',
    views:          'المشاهدات',
    pauseSelected:  'إيقاف المحدد',
    activateSelected:'تفعيل المحدد',
    extendSelected: 'تمديد +٣٠ يوم',
    deleteSelected: 'حذف المحدد',
    noAds:          'لا توجد إعلانات للعرض',
    selected:       'محدد',
    confirmDelete:  'تأكيد الحذف',
    confirmMsg:     'هل أنت متأكد أنك تريد حذف الإعلانات المحددة؟ لا يمكن التراجع عن هذا الإجراء.',
    cancel:         'إلغاء',
    confirm:        'تأكيد الحذف',
    statusLabels: {
      active:  'نشط',
      paused:  'موقوف',
      expired: 'منتهي',
      grace:   'فترة سماح',
    },
  },
  en: {
    title:          'Bulk Ad Manager',
    selectAll:      'Select All',
    deselectAll:    'Deselect All',
    ad:             'Ad',
    status:         'Status',
    expires:        'Expires',
    views:          'Views',
    pauseSelected:  'Pause Selected',
    activateSelected:'Activate Selected',
    extendSelected: 'Extend +30 Days',
    deleteSelected: 'Delete Selected',
    noAds:          'No ads to display',
    selected:       'selected',
    confirmDelete:  'Confirm Deletion',
    confirmMsg:     'Are you sure you want to delete the selected ads? This action cannot be undone.',
    cancel:         'Cancel',
    confirm:        'Confirm Delete',
    statusLabels: {
      active:  'Active',
      paused:  'Paused',
      expired: 'Expired',
      grace:   'Grace Period',
    },
  },
  de: {
    title:          'Massenanzeigenverwaltung',
    selectAll:      'Alle auswählen',
    deselectAll:    'Alle abwählen',
    ad:             'Anzeige',
    status:         'Status',
    expires:        'Läuft ab',
    views:          'Aufrufe',
    pauseSelected:  'Ausgewählte pausieren',
    activateSelected:'Ausgewählte aktivieren',
    extendSelected: '+30 Tage verlängern',
    deleteSelected: 'Ausgewählte löschen',
    noAds:          'Keine Anzeigen vorhanden',
    selected:       'ausgewählt',
    confirmDelete:  'Löschen bestätigen',
    confirmMsg:     'Sind Sie sicher, dass Sie die ausgewählten Anzeigen löschen möchten? Diese Aktion kann nicht rückgängig gemacht werden.',
    cancel:         'Abbrechen',
    confirm:        'Löschen bestätigen',
    statusLabels: {
      active:  'Aktiv',
      paused:  'Pausiert',
      expired: 'Abgelaufen',
      grace:   'Nachfrist',
    },
  },
};

/* ─────────────────────────────────────────────
   2.  Arabic-Indic numeral converter
───────────────────────────────────────────── */
const toArabicIndic = (num) =>
  String(num).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const formatNumber = (num, lang) =>
  lang === 'ar' ? toArabicIndic(num) : String(num);

/* ─────────────────────────────────────────────
   3.  Status badge config
───────────────────────────────────────────── */
const STATUS_STYLES = {
  active:  'bg-emerald-100 text-emerald-800 border border-emerald-300',
  paused:  'bg-amber-100  text-amber-800  border border-amber-300',
  expired: 'bg-red-100    text-red-800    border border-red-300',
  grace:   'bg-purple-100 text-purple-800 border border-purple-300',
};

const StatusBadge = ({ status, lang }) => {
  const t = LABELS[lang] ?? LABELS.en;
  const style = STATUS_STYLES[status] ?? 'bg-gray-100 text-gray-700 border border-gray-300';
  const label = t.statusLabels[status] ?? status;
  return (
    <span className={'inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ' + (style)}>
      <span
        className={'w-1.5 h-1.5 rounded-full ' + (status === 'active'  ? 'bg-emerald-500' :
          status === 'paused'  ? 'bg-amber-500'   :
          status === 'expired' ? 'bg-red-500'     :
          status === 'grace'   ? 'bg-purple-500'  : 'bg-gray-400')}
      />
      {label}
    </span>
  );
};

/* ─────────────────────────────────────────────
   4.  Confirmation modal
───────────────────────────────────────────── */
const ConfirmModal = ({ lang, onConfirm, onCancel }) => {
  const t = LABELS[lang] ?? LABELS.en;
  const isRtl = lang === 'ar';
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-labelledby="confirm-modal-title"
      dir={isRtl ? 'rtl' : 'ltr'}
    >
      <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md mx-4 p-6 space-y-4">
        {/* Icon */}
        <div className="flex items-center justify-center w-12 h-12 rounded-full bg-red-100 mx-auto">
          <svg className="w-6 h-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
          </svg>
        </div>

        <h2 id="confirm-modal-title" className="text-lg font-bold text-gray-900 text-center">
          {t.confirmDelete}
        </h2>
        <p className="text-sm text-gray-600 text-center leading-relaxed">
          {t.confirmMsg}
        </p>

        <div className={'flex gap-3 pt-2 ' + (isRtl ? 'flex-row-reverse' : '')}>
          <button
            onClick={onCancel}
            className="flex-1 px-4 py-2.5 rounded-xl border border-gray-300 text-gray-700 text-sm font-medium hover:bg-gray-50 transition-colors"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-sm font-semibold hover:bg-red-700 active:bg-red-800 transition-colors shadow-sm"
          >
            {t.confirm}
          </button>
        </div>
      </div>
    </div>
  );
};

/* ─────────────────────────────────────────────
   5.  Action button component
───────────────────────────────────────────── */
const ActionButton = ({ onClick, disabled, variant = 'default', children }) => {
  const base =
    'inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all duration-150 disabled:opacity-40 disabled:cursor-not-allowed';
  const variants = {
    default:  'bg-gray-100   text-gray-700  hover:bg-gray-200  border border-gray-200',
    pause:    'bg-amber-50   text-amber-700 hover:bg-amber-100 border border-amber-200',
    activate: 'bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200',
    extend:   'bg-blue-50    text-blue-700  hover:bg-blue-100  border border-blue-200',
    danger:   'bg-red-50     text-red-700   hover:bg-red-100   border border-red-200',
  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className={(base) + ' ' + (variants[variant] ?? variants.default)}
    >
      {children}
    </button>
  );
};

/* ─────────────────────────────────────────────
   6.  Main component
───────────────────────────────────────────── */
export default function BulkAdManager({
  ads = [],
  lang = 'en',
  onBulkPause,
  onBulkActivate,
  onBulkExtend,
  onBulkDelete,
}) {
  const t = LABELS[lang] ?? LABELS.en;
  const isRtl = lang === 'ar';
  const dir = isRtl ? 'rtl' : 'ltr';
  const fontClass = lang === 'ar' ? 'font-cairo' : 'font-sans';

  /* --- selection state ------------------------------------------ */
  const [selected, setSelected] = useState(new Set());
  const [showConfirm, setShowConfirm] = useState(false);

  const allSelected = ads.length > 0 && selected.size === ads.length;
  const noneSelected = selected.size === 0;

  const toggleAll = useCallback(() => {
    setSelected(allSelected ? new Set() : new Set(ads.map((a) => a._id)));
  }, [allSelected, ads]);

  const toggleOne = useCallback((id) => {
    setSelected((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const selectedIds = useMemo(() => [...selected], [selected]);

  /* --- action handlers ------------------------------------------ */
  const handlePause    = () => { onBulkPause?.(selectedIds);    };
  const handleActivate = () => { onBulkActivate?.(selectedIds); };
  const handleExtend   = () => { onBulkExtend?.(selectedIds);   };
  const handleDelete   = () => setShowConfirm(true);
  const confirmDelete  = () => {
    onBulkDelete?.(selectedIds);
    setSelected(new Set());
    setShowConfirm(false);
  };

  /* --- date formatting ------------------------------------------ */
  const formatDate = (iso) => {
    if (!iso) return '—';
    try {
      const d = new Date(iso);
      const locale = lang === 'ar' ? 'ar-SA' : lang === 'de' ? 'de-DE' : 'en-GB';
      return d.toLocaleDateString(locale, { day: 'numeric', month: 'short', year: 'numeric' });
    } catch {
      return iso;
    }
  };

  /* ── render ──────────────────────────────────────────────────── */
  return (
    <>
      {/* Google Fonts — Cairo + Tajawal for Arabic */}
      <style>{'
        @import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;500;600;700&family=Tajawal:wght@400;500;700&display=swap\');
        .font-cairo { font-family: \'Cairo\', \'Tajawal\', sans-serif; }
      '}</style>

      {/* Confirmation modal */}
      {showConfirm && (
        <ConfirmModal
          lang={lang}
          onConfirm={confirmDelete}
          onCancel={() => setShowConfirm(false)}
        />
      )}

      <section
        dir={dir}
        className={(fontClass) + ' w-full bg-white rounded-2xl shadow-md border border-gray-100 overflow-hidden'}
        aria-label={t.title}
      >
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-5 py-4 bg-gradient-to-r from-indigo-600 to-violet-600">
          <div className="flex items-center gap-2 text-white">
            {/* Icon */}
            <svg className="w-5 h-5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
            </svg>
            <h2 className="text-base font-bold">{t.title}</h2>
          </div>

          {/* Selected count pill */}
          {!noneSelected && (
            <span className="inline-flex items-center gap-1 bg-white/20 text-white text-xs font-semibold px-3 py-1 rounded-full">
              {formatNumber(selected.size, lang)} {t.selected}
            </span>
          )}
        </div>

        {/* ── Toolbar ────────────────────────────────────────────── */}
        <div
          className={'flex flex-wrap items-center gap-2 px-5 py-3 border-b border-gray-100 bg-gray-50 ' + (isRtl ? 'flex-row-reverse' : '')}
        >
          {/* Select all toggle */}
          <button
            onClick={toggleAll}
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-indigo-700 hover:text-indigo-900 transition-colors"
          >
            <span
              className={'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors ' + (allSelected
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'border-gray-400 bg-white')}
            >
              {allSelected && (
                <svg className="w-2.5 h-2.5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
              )}
            </span>
            {allSelected ? t.deselectAll : t.selectAll}
          </button>

          <div className="h-4 w-px bg-gray-300 mx-1" />

          {/* Bulk action buttons */}
          <ActionButton variant="pause"    onClick={handlePause}    disabled={noneSelected}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M10 9v6m4-6v6" />
            </svg>
            {t.pauseSelected}
          </ActionButton>

          <ActionButton variant="activate" onClick={handleActivate} disabled={noneSelected}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5.25 5.653c0-.856.917-1.398 1.667-.986l11.54 6.347a1.125 1.125 0 010 1.972l-11.54 6.347c-.75.412-1.667-.13-1.667-.986V5.653z" />
            </svg>
            {t.activateSelected}
          </ActionButton>

          <ActionButton variant="extend"   onClick={handleExtend}   disabled={noneSelected}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 012.25-2.25h13.5A2.25 2.25 0 0121 7.5v11.25m-18 0A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75m-18 0v-7.5A2.25 2.25 0 015.25 9h13.5A2.25 2.25 0 0121 11.25v7.5" />
            </svg>
            {t.extendSelected}
          </ActionButton>

          <ActionButton variant="danger"   onClick={handleDelete}   disabled={noneSelected}>
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
            {t.deleteSelected}
          </ActionButton>
        </div>

        {/* ── Table / List ───────────────────────────────────────── */}
        {ads.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 text-gray-400">
            <svg className="w-12 h-12 mb-3 opacity-40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 13.5l3 3m0 0l3-3m-3 3v-6m1.06-4.19l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
            <p className="text-sm font-medium">{t.noAds}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm" dir={dir}>
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100">
                  {/* Checkbox col */}
                  <th className="w-10 px-4 py-3 text-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={toggleAll}
                      aria-label={allSelected ? t.deselectAll : t.selectAll}
                      className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                    />
                  </th>

                  <th className={'px-4 py-3 font-semibold text-gray-600 ' + (isRtl ? 'text-right' : 'text-left')}>
                    {t.ad}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center whitespace-nowrap">
                    {t.status}
                  </th>
                  <th className={'px-4 py-3 font-semibold text-gray-600 whitespace-nowrap ' + (isRtl ? 'text-right' : 'text-left')}>
                    {t.expires}
                  </th>
                  <th className="px-4 py-3 font-semibold text-gray-600 text-center whitespace-nowrap">
                    {t.views}
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-gray-50">
                {ads.map((ad) => {
                  const isChecked = selected.has(ad._id);
                  return (
                    <tr
                      key={ad._id}
                      onClick={() => toggleOne(ad._id)}
                      className={'cursor-pointer transition-colors ' + (isChecked
                          ? 'bg-indigo-50 hover:bg-indigo-100'
                          : 'hover:bg-gray-50')}
                      aria-selected={isChecked}
                    >
                      {/* Checkbox */}
                      <td className="w-10 px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleOne(ad._id)}
                          aria-label={ad.title}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                        />
                      </td>

                      {/* Title */}
                      <td className={'px-4 py-3 ' + (isRtl ? 'text-right' : 'text-left')}>
                        <span className="font-medium text-gray-900 line-clamp-1 block max-w-[220px]" title={ad.title}>
                          {ad.title}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">{ad._id}</span>
                      </td>

                      {/* Status */}
                      <td className="px-4 py-3 text-center">
                        <StatusBadge status={ad.status} lang={lang} />
                      </td>

                      {/* Expires */}
                      <td className={'px-4 py-3 text-gray-600 text-xs whitespace-nowrap ' + (isRtl ? 'text-right' : 'text-left')}>
                        {formatDate(ad.expiresAt)}
                      </td>

                      {/* Views */}
                      <td className="px-4 py-3 text-center font-semibold text-gray-700 tabular-nums">
                        {formatNumber(ad.views ?? 0, lang)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Footer ────────────────────────────────────────────── */}
        {ads.length > 0 && (
          <div className={'flex items-center justify-between px-5 py-3 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 ' + (isRtl ? 'flex-row-reverse' : '')}>
            <span>
              {formatNumber(ads.length, lang)}{' '}
              {lang === 'ar' ? 'إعلان' : lang === 'de' ? 'Anzeigen' : 'ads'}
            </span>
            {!noneSelected && (
              <span className="font-semibold text-indigo-600">
                {formatNumber(selected.size, lang)} / {formatNumber(ads.length, lang)} {t.selected}
              </span>
            )}
          </div>
        )}
      </section>
    </>
  );
}
