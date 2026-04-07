'use client';
/**
 * AdLocationMap – Compact location map card for XTOX ad pages.
 * Shows the approximate neighbourhood-level location of an ad using an
 * OpenStreetMap embed (zero npm deps, no API key required).
 *
 * Props:
 *   lat        {number}  – WGS-84 latitude  (e.g. 30.0444)
 *   lng        {number}  – WGS-84 longitude (e.g. 31.2357)
 *   areaName   {string}  – Neighbourhood / district label (already localised)
 *   city       {string}  – City label (already localised)
 *   lang       {string}  – 'ar' | 'en' | 'de'  (default 'ar')
 *   zoom       {number}  – Map zoom level 1-19 (default 13)
 *   className  {string}  – Extra Tailwind classes for the wrapper
 */

import { useState, useId } from 'react';

const LABELS = {
  ar: {
    title: 'موقع الإعلان',
    area: 'الحي',
    city: 'المدينة',
    note: 'الموقع تقريبي لحماية خصوصية البائع',
    expand: 'تكبير الخريطة',
    collapse: 'تصغير الخريطة',
    openOsm: 'فتح في خرائط OpenStreetMap',
    unavailable: 'الموقع غير محدد',
  },
  en: {
    title: 'Ad Location',
    area: 'Area',
    city: 'City',
    note: 'Approximate location to protect seller privacy',
    expand: 'Expand map',
    collapse: 'Collapse map',
    openOsm: 'Open in OpenStreetMap',
    unavailable: 'Location not specified',
  },
  de: {
    title: 'Anzeigenort',
    area: 'Stadtteil',
    city: 'Stadt',
    note: 'Ungefährer Standort zum Schutz der Privatsphäre des Verkäufers',
    expand: 'Karte vergößern',
    collapse: 'Karte verkleinern',
    openOsm: 'In OpenStreetMap öffnen',
    unavailable: 'Standort nicht angegeben',
  },
};

// Arabic-Indic numeral converter
function toArabicIndic(n) {
  return String(n).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

export default function AdLocationMap({
  lat,
  lng,
  areaName = '',
  city = '',
  lang = 'ar',
  zoom = 13,
  className = '',
}) {
  const [expanded, setExpanded] = useState(false);
  const [mapLoaded, setMapLoaded] = useState(false);
  const id = useId();

  const isRtl = lang === 'ar';
  const t = LABELS[lang] || LABELS.ar;
  const hasCoords = lat != null && lng != null;

  // Slightly offset the display marker so it shows neighbourhood, not exact address
  const displayLat = hasCoords ? (lat + 0.002).toFixed(5) : null;
  const displayLng = hasCoords ? (lng + 0.002).toFixed(5) : null;

  const osmEmbedUrl = hasCoords
    ? 'https://www.openstreetmap.org/export/embed.html?bbox=' + ((+displayLng - 0.01).toFixed(5)) + ',' + ((+displayLat - 0.008).toFixed(5)) + ',' + ((+displayLng + 0.01).toFixed(5)) + ',' + ((+displayLat + 0.008).toFixed(5)) + '&layer=mapnik&marker=' + (displayLat) + ',' + (displayLng)
    : null;

  const osmHref = hasCoords
    ? 'https://www.openstreetmap.org/?mlat=' + (displayLat) + '&mlon=' + (displayLng) + '#map=' + (zoom) + '/' + (displayLat) + '/' + (displayLng)
    : null;

  const mapHeight = expanded ? 'h-72' : 'h-44';

  return (
    <div
      dir={isRtl ? 'rtl' : 'ltr'}
      className={'font-[Cairo,Tajawal,sans-serif] rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 shadow-sm overflow-hidden ' + (className)}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className={'flex items-center gap-2 ' + (isRtl ? 'flex-row-reverse' : '')}>
          {/* Pin icon */}
          <svg
            className="w-5 h-5 text-red-500 flex-shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z" />
          </svg>
          <h3 className="text-sm font-bold text-gray-800 dark:text-gray-100">{t.title}</h3>
        </div>

        {hasCoords && (
          <button
            onClick={() => setExpanded(v => !v)}
            aria-expanded={expanded}
            aria-controls={'map-' + (id)}
            className="text-xs text-indigo-600 dark:text-indigo-400 hover:underline focus:outline-none focus:ring-2 focus:ring-indigo-400 rounded"
          >
            {expanded ? t.collapse : t.expand}
          </button>
        )}
      </div>

      {/* Location text labels */}
      {(areaName || city) && (
        <div className={'flex gap-4 px-4 py-2 text-sm text-gray-600 dark:text-gray-400 ' + (isRtl ? 'flex-row-reverse' : '')}>
          {areaName && (
            <span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{t.area}: </span>
              {areaName}
            </span>
          )}
          {city && (
            <span>
              <span className="font-semibold text-gray-700 dark:text-gray-300">{t.city}: </span>
              {city}
            </span>
          )}
        </div>
      )}

      {/* Map or unavailable state */}
      {hasCoords ? (
        <div id={'map-' + (id)} className={'relative w-full ' + (mapHeight) + ' transition-all duration-300'}>
          {/* Loading shimmer */}
          {!mapLoaded && (
            <div className="absolute inset-0 bg-gray-100 dark:bg-gray-800 animate-pulse flex items-center justify-center">
              <svg className="w-8 h-8 text-gray-300 dark:text-gray-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z" />
              </svg>
            </div>
          )}
          <iframe
            title={t.title}
            src={osmEmbedUrl}
            className={'w-full h-full border-0 transition-opacity duration-500 ' + (mapLoaded ? 'opacity-100' : 'opacity-0')}
            loading="lazy"
            referrerPolicy="no-referrer"
            onLoad={() => setMapLoaded(true)}
            sandbox="allow-scripts allow-same-origin"
          />
        </div>
      ) : (
        <div className="flex items-center justify-center py-8 text-gray-400 dark:text-gray-500 text-sm">
          <svg className="w-5 h-5 me-2" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
          {t.unavailable}
        </div>
      )}

      {/* Footer: privacy note + OSM link */}
      {hasCoords && (
        <div className={'flex items-center justify-between gap-2 px-4 py-2 bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 ' + (isRtl ? 'flex-row-reverse' : '')}>
          <p className="text-xs text-gray-400 dark:text-gray-500 leading-snug">{t.note}</p>
          <a
            href={osmHref}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-shrink-0 text-xs text-indigo-600 dark:text-indigo-400 hover:underline whitespace-nowrap"
          >
            {t.openOsm}
          </a>
        </div>
      )}
    </div>
  );
}
