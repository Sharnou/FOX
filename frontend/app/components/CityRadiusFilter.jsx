'use client';
import { useState } from 'react';

/**
 * CityRadiusFilter — Arabic-first proximity search filter
 * RTL, supports 8 major Arab cities, radius in km
 * Calls onChange({ city, radius }) on selection
 * XTOX Auto-Upgrade Agent — Run 130
 */

const ARAB_CITIES = [
  { label: 'الرياض', value: 'riyadh', lat: 24.7136, lng: 46.6753 },
  { label: 'جدة', value: 'jeddah', lat: 21.4858, lng: 39.1925 },
  { label: 'القاهرة', value: 'cairo', lat: 30.0444, lng: 31.2357 },
  { label: 'دبي', value: 'dubai', lat: 25.2048, lng: 55.2708 },
  { label: 'الكويت', value: 'kuwait', lat: 29.3759, lng: 47.9774 },
  { label: 'عمّان', value: 'amman', lat: 31.9454, lng: 35.9284 },
  { label: 'بيروت', value: 'beirut', lat: 33.8938, lng: 35.5018 },
  { label: 'الدار البيضاء', value: 'casablanca', lat: 33.5731, lng: -7.5898 },
  { label: 'الخرطوم', value: 'khartoum', lat: 15.5007, lng: 32.5599 },
  { label: 'بغداد', value: 'baghdad', lat: 33.3152, lng: 44.3661 },
  { label: 'دمشق', value: 'damascus', lat: 33.5138, lng: 36.2765 },
  { label: 'تونس', value: 'tunis', lat: 36.8065, lng: 10.1815 },
];

const RADIUS_OPTIONS = [
  { label: '5 كم', labelEn: '5 km', labelDe: '5 km', labelFr: '5 km', value: 5 },
  { label: '20 كم', labelEn: '20 km', labelDe: '20 km', labelFr: '20 km', value: 20 },
  { label: '50 كم', labelEn: '50 km', labelDe: '50 km', labelFr: '50 km', value: 50 },
  { label: '100 كم', labelEn: '100 km', labelDe: '100 km', labelFr: '100 km', value: 100 },
  { label: 'أي مكان', labelEn: 'Anywhere', labelDe: 'Überall', labelFr: 'Partout', value: null },
];

const LABELS = {
  ar: { title: 'البحث بالقرب من', placeholder: '-- اختر المدينة --', dir: 'rtl' },
  en: { title: 'Search Near', placeholder: '-- Select City --', dir: 'ltr' },
  de: { title: 'In der Nähe suchen', placeholder: '-- Stadt wählen --', dir: 'ltr' },
  fr: { title: 'Rechercher à proximité', placeholder: '-- Choisir une ville --', dir: 'ltr' },
};

export default function CityRadiusFilter({ onChange, locale = 'ar' }) {
  const [city, setCity] = useState('');
  const [radius, setRadius] = useState(null);

  const lang = LABELS[locale] || LABELS['ar'];
  const isArabic = locale === 'ar';

  const handleCity = (val) => {
    setCity(val);
    const cityObj = ARAB_CITIES.find(c => c.value === val) || null;
    onChange({ city: cityObj, radius });
  };

  const handleRadius = (val) => {
    setRadius(val);
    const cityObj = ARAB_CITIES.find(c => c.value === city) || null;
    onChange({ city: cityObj, radius: val });
  };

  const radiusLabel = (r) => {
    if (locale === 'en') return r.labelEn;
    if (locale === 'de') return r.labelDe;
    if (locale === 'fr') return r.labelFr;
    return r.label;
  };

  return (
    <div
      className="flex flex-col gap-2"
      dir={lang.dir}
      style={{ textAlign: isArabic ? 'right' : 'left' }}
    >
      <label className="text-sm font-semibold text-gray-700">
        {lang.title}
      </label>

      <select
        className="border border-gray-300 rounded-lg px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        value={city}
        onChange={e => handleCity(e.target.value)}
        dir={lang.dir}
      >
        <option value="">{lang.placeholder}</option>
        {ARAB_CITIES.map(c => (
          <option key={c.value} value={c.value}>{c.label}</option>
        ))}
      </select>

      {city && (
        <div className="flex gap-2 flex-wrap">
          {RADIUS_OPTIONS.map(r => (
            <button
              key={String(r.value)}
              type="button"
              onClick={() => handleRadius(r.value)}
              className={'px-3 py-1 rounded-full text-xs border transition-colors duration-150 ' + (radius === r.value
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white text-gray-600 border-gray-300 hover:border-blue-400 hover:text-blue-600')}
            >
              {radiusLabel(r)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
