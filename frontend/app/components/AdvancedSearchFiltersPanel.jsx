'use client';
/**
 * AdvancedSearchFiltersPanel
 * Collapsible sidebar filter panel for XTOX marketplace search results.
 * Supports: price range, condition, sort order, has-photo filter, ad type.
 * Full RTL, bilingual AR/EN/DE, Cairo/Tajawal fonts, zero dependencies.
 * Props:
 *   lang: 'ar' | 'en' | 'de'  (default 'ar')
 *   filters: { minPrice, maxPrice, condition, sort, hasPhoto, adType }
 *   onChange(filters): called whenever any filter changes
 *   onReset(): called when user resets all filters
 *   totalResults: number
 */

import { useState } from 'react';

const T = {
  ar: {
    title: 'تصفية النتائج',
    reset: 'إعادة ضبط',
    results: 'نتيجة',
    priceRange: 'نطاق السعر',
    minPrice: 'أقل سعر',
    maxPrice: 'أعلى سعر',
    currency: 'ج.م',
    condition: 'الحالة',
    condAll: 'الكل',
    condNew: 'جديد',
    condUsed: 'مستعمل',
    condRefurb: 'مجدد',
    sort: 'الترتيب',
    sortNewest: 'الأحدث',
    sortOldest: 'الأقدم',
    sortPriceAsc: 'السعر: الأقل أولاً',
    sortPriceDesc: 'السعر: الأعلى أولاً',
    sortViews: 'الأكثر مشاهدة',
    hasPhoto: 'مع صورة فقط',
    adType: 'نوع الإعلان',
    typeAll: 'الكل',
    typeSell: 'بيع',
    typeBuy: 'شراء',
    typeRent: 'إيجار',
    collapse: 'إخفاء',
    expand: 'إظهار',
    apply: 'تطبيق الفلتر',
  },
  en: {
    title: 'Filter Results',
    reset: 'Reset',
    results: 'results',
    priceRange: 'Price Range',
    minPrice: 'Min Price',
    maxPrice: 'Max Price',
    currency: 'EGP',
    condition: 'Condition',
    condAll: 'All',
    condNew: 'New',
    condUsed: 'Used',
    condRefurb: 'Refurbished',
    sort: 'Sort By',
    sortNewest: 'Newest',
    sortOldest: 'Oldest',
    sortPriceAsc: 'Price: Low to High',
    sortPriceDesc: 'Price: High to Low',
    sortViews: 'Most Viewed',
    hasPhoto: 'With photo only',
    adType: 'Ad Type',
    typeAll: 'All',
    typeSell: 'For Sale',
    typeBuy: 'Wanted',
    typeRent: 'For Rent',
    collapse: 'Collapse',
    expand: 'Expand',
    apply: 'Apply Filters',
  },
  de: {
    title: 'Ergebnisse filtern',
    reset: 'Zurücksetzen',
    results: 'Ergebnisse',
    priceRange: 'Preisspanne',
    minPrice: 'Mindestpreis',
    maxPrice: 'Höchstpreis',
    currency: 'EGP',
    condition: 'Zustand',
    condAll: 'Alle',
    condNew: 'Neu',
    condUsed: 'Gebraucht',
    condRefurb: 'Generalüberholt',
    sort: 'Sortieren nach',
    sortNewest: 'Neueste',
    sortOldest: 'Älteste',
    sortPriceAsc: 'Preis: Günstigste zuerst',
    sortPriceDesc: 'Preis: Teuerste zuerst',
    sortViews: 'Meist angesehen',
    hasPhoto: 'Nur mit Foto',
    adType: 'Anzeigentyp',
    typeAll: 'Alle',
    typeSell: 'Zum Verkauf',
    typeBuy: 'Gesucht',
    typeRent: 'Zur Miete',
    collapse: 'Einklappen',
    expand: 'Ausklappen',
    apply: 'Filter anwenden',
  },
};

const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[+d]);

const DEFAULT_FILTERS = {
  minPrice: '',
  maxPrice: '',
  condition: 'all',
  sort: 'newest',
  hasPhoto: false,
  adType: 'all',
};

function Section({ label, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div style={{ borderBottom: '1px solid #F0F0F0', paddingBottom: 12, marginBottom: 12 }}>
      <button
        onClick={() => setOpen((o) => !o)}
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          width: '100%',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          padding: '4px 0 8px',
          fontFamily: 'Cairo, Tajawal, sans-serif',
          fontSize: 14,
          fontWeight: 700,
          color: '#1A1A2E',
        }}
      >
        <span>{label}</span>
        <span style={{ fontSize: 18, color: '#FF6B35', lineHeight: 1 }}>
          {open ? '−' : '+'}
        </span>
      </button>
      {open && children}
    </div>
  );
}

export default function AdvancedSearchFiltersPanel({
  lang = 'ar',
  filters: externalFilters,
  onChange,
  onReset,
  totalResults,
}) {
  const t = T[lang] || T.ar;
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  const [filters, setFilters] = useState(externalFilters || DEFAULT_FILTERS);

  const update = (key, value) => {
    const next = { ...filters, [key]: value };
    setFilters(next);
    onChange && onChange(next);
  };

  const handleReset = () => {
    setFilters(DEFAULT_FILTERS);
    onReset && onReset();
    onChange && onChange(DEFAULT_FILTERS);
  };

  const inputStyle = {
    width: '100%',
    padding: '8px 10px',
    borderRadius: 8,
    border: '1.5px solid #E0E0E0',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: 13,
    color: '#1A1A2E',
    background: '#FAFAFA',
    boxSizing: 'border-box',
    direction: dir,
    outline: 'none',
  };

  const chipStyle = (active) => ({
    display: 'inline-block',
    padding: '5px 12px',
    borderRadius: 20,
    border: '1.5px solid ' + (active ? '#FF6B35' : '#E0E0E0'),
    background: active ? '#FFF3EE' : '#FFF',
    color: active ? '#FF6B35' : '#555',
    fontFamily: 'Cairo, Tajawal, sans-serif',
    fontSize: 12,
    fontWeight: active ? 700 : 400,
    cursor: 'pointer',
    margin: '3px',
    transition: 'all 0.15s',
  });

  const selectStyle = {
    ...inputStyle,
    padding: '8px 10px',
    appearance: 'none',
    backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'8\' viewBox=\'0 0 12 8\'%3E%3Cpath d=\'M1 1l5 5 5-5\' stroke=\'%23FF6B35\' stroke-width=\'2\' fill=\'none\' stroke-linecap=\'round\'/%3E%3C/svg%3E")',
    backgroundRepeat: 'no-repeat',
    backgroundPosition: isRTL ? '10px center' : 'calc(100% - 10px) center',
    paddingRight: isRTL ? 10 : 30,
    paddingLeft: isRTL ? 30 : 10,
  };

  const displayCount =
    totalResults !== undefined
      ? isRTL
        ? (toArabicNumerals(totalResults) + ' ' + t.results)
        : (totalResults + ' ' + t.results)
      : null;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: '@import url(\'https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;700&display=swap\');' +'.xtox-filter-panel input:focus, .xtox-filter-panel select:focus { border-color: #FF6B35 !important; }' +'.xtox-filter-panel input[type="checkbox"] { accent-color: #FF6B35; width: 16px; height: 16px; cursor: pointer; }' }} />

      <div
        className="xtox-filter-panel"
        dir={dir}
        style={{
          background: '#FFFFFF',
          borderRadius: 14,
          padding: '16px',
          fontFamily: 'Cairo, Tajawal, sans-serif',
          boxShadow: '0 2px 12px rgba(0,0,0,0.07)',
          border: '1px solid #F0F0F0',
          minWidth: 220,
          maxWidth: 280,
        }}
      >
        {/* Header */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            marginBottom: 14,
          }}
        >
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, color: '#1A1A2E' }}>
              🔍 {t.title}
            </div>
            {displayCount && (
              <div style={{ fontSize: 11, color: '#999', marginTop: 2 }}>
                {displayCount}
              </div>
            )}
          </div>
          <button
            onClick={handleReset}
            style={{
              background: 'none',
              border: '1.5px solid #FF6B35',
              borderRadius: 8,
              color: '#FF6B35',
              fontFamily: 'Cairo, Tajawal, sans-serif',
              fontSize: 12,
              fontWeight: 700,
              padding: '4px 10px',
              cursor: 'pointer',
            }}
          >
            {t.reset}
          </button>
        </div>

        {/* Sort */}
        <Section label={t.sort}>
          <select
            style={selectStyle}
            value={filters.sort}
            onChange={(e) => update('sort', e.target.value)}
          >
            <option value="newest">{t.sortNewest}</option>
            <option value="oldest">{t.sortOldest}</option>
            <option value="price_asc">{t.sortPriceAsc}</option>
            <option value="price_desc">{t.sortPriceDesc}</option>
            <option value="views">{t.sortViews}</option>
          </select>
        </Section>

        {/* Price Range */}
        <Section label={t.priceRange}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="number"
              min="0"
              placeholder={t.minPrice}
              style={{ ...inputStyle, width: '45%' }}
              value={filters.minPrice}
              onChange={(e) => update('minPrice', e.target.value)}
            />
            <span style={{ color: '#999', fontSize: 12 }}>–</span>
            <input
              type="number"
              min="0"
              placeholder={t.maxPrice}
              style={{ ...inputStyle, width: '45%' }}
              value={filters.maxPrice}
              onChange={(e) => update('maxPrice', e.target.value)}
            />
          </div>
          <div style={{ fontSize: 11, color: '#aaa', marginTop: 4, textAlign: isRTL ? 'right' : 'left' }}>
            {t.currency}
          </div>
        </Section>

        {/* Condition */}
        <Section label={t.condition}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['all', 'new', 'used', 'refurb'].map((c) => (
              <span
                key={c}
                style={chipStyle(filters.condition === c)}
                onClick={() => update('condition', c)}
              >
                {t['cond' + c.charAt(0).toUpperCase() + c.slice(1)]}
              </span>
            ))}
          </div>
        </Section>

        {/* Ad Type */}
        <Section label={t.adType}>
          <div style={{ display: 'flex', flexWrap: 'wrap' }}>
            {['all', 'sell', 'buy', 'rent'].map((tp) => (
              <span
                key={tp}
                style={chipStyle(filters.adType === tp)}
                onClick={() => update('adType', tp)}
              >
                {t['type' + tp.charAt(0).toUpperCase() + tp.slice(1)]}
              </span>
            ))}
          </div>
        </Section>

        {/* Has Photo */}
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '8px 0',
            cursor: 'pointer',
          }}
          onClick={() => update('hasPhoto', !filters.hasPhoto)}
        >
          <input
            type="checkbox"
            checked={!!filters.hasPhoto}
            onChange={() => {}}
            style={{ cursor: 'pointer' }}
          />
          <span style={{ fontSize: 13, color: '#333', fontFamily: 'Cairo, Tajawal, sans-serif' }}>
            📷 {t.hasPhoto}
          </span>
        </div>

        {/* Apply Button */}
        <button
          onClick={() => onChange && onChange(filters)}
          style={{
            width: '100%',
            marginTop: 10,
            padding: '11px',
            background: 'linear-gradient(135deg, #FF6B35, #e85c2a)',
            color: '#fff',
            border: 'none',
            borderRadius: 10,
            fontFamily: 'Cairo, Tajawal, sans-serif',
            fontSize: 14,
            fontWeight: 700,
            cursor: 'pointer',
            boxShadow: '0 3px 10px rgba(255,107,53,0.3)',
            transition: 'opacity 0.15s',
          }}
          onMouseOver={(e) => (e.currentTarget.style.opacity = '0.9')}
          onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
        >
          {t.apply}
        </button>
      </div>
    </>
  );
}
