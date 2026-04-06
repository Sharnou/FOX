'use client';

/**
 * HierarchicalAreaPicker.jsx
 * XTOX — Hierarchical location drill-down picker for Arab marketplace
 * Country → Governorate/State → City → Neighborhood
 * RTL-first, bilingual AR/EN/DE, Cairo/Tajawal fonts, zero dependencies
 */

import { useState, useMemo, useRef, useEffect } from 'react';

// ── Arabic-Indic numerals ────────────────────────────────────────────────────
const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

// ── Locale strings ───────────────────────────────────────────────────────────
const T = {
  ar: {
    selectCountry: 'اختر الدولة',
    selectGov: 'اختر المحافظة / الولاية',
    selectCity: 'اختر المدينة',
    selectNeighborhood: 'اختر الحي / المنطقة',
    searchPlaceholder: 'ابحث...',
    popular: 'الأكثر شيوعاً',
    clear: 'مسح',
    confirm: 'تأكيد الموقع',
    step: 'الخطوة',
    of: 'من',
    noResults: 'لا توجد نتائج',
  },
  en: {
    selectCountry: 'Select Country',
    selectGov: 'Select Governorate / State',
    selectCity: 'Select City',
    selectNeighborhood: 'Select Neighborhood',
    searchPlaceholder: 'Search...',
    popular: 'Most Popular',
    clear: 'Clear',
    confirm: 'Confirm Location',
    step: 'Step',
    of: 'of',
    noResults: 'No results',
  },
  de: {
    selectCountry: 'Land auswählen',
    selectGov: 'Bundesland / Governorat auswählen',
    selectCity: 'Stadt auswählen',
    selectNeighborhood: 'Stadtteil auswählen',
    searchPlaceholder: 'Suchen...',
    popular: 'Beliebt',
    clear: 'Löschen',
    confirm: 'Standort bestätigen',
    step: 'Schritt',
    of: 'von',
    noResults: 'Keine Ergebnisse',
  },
};

// ── Location data (Arab countries + Germany) ─────────────────────────────────
const LOCATIONS = {
  EG: {
    ar: 'مصر', en: 'Egypt', flag: '🇪🇬',
    governorates: {
      cairo: {
        ar: 'القاهرة', en: 'Cairo', popular: true,
        cities: {
          nasr_city: { ar: 'مدينة نصر', en: 'Nasr City', popular: true,
            neighborhoods: ['المنطقة العاشرة','المنطقة الثامنة','الحي السابع','الحي العاشر'] },
          heliopolis: { ar: 'مصر الجديدة', en: 'Heliopolis', popular: true,
            neighborhoods: ['كورنيش مصر الجديدة','العباسية','الميرغني'] },
          maadi: { ar: 'المعادي', en: 'Maadi', popular: true,
            neighborhoods: ['المعادي القديمة','دجلة','المعادي الجديدة'] },
          new_cairo: { ar: 'القاهرة الجديدة', en: 'New Cairo',
            neighborhoods: ['التجمع الأول','التجمع الخامس','الرحاب','مدينتي'] },
          downtown: { ar: 'وسط البلد', en: 'Downtown',
            neighborhoods: ['طلعت حرب','رمسيس','الأزهر'] },
        }
      },
      giza: {
        ar: 'الجيزة', en: 'Giza', popular: true,
        cities: {
          dokki: { ar: 'الدقي', en: 'Dokki', popular: true,
            neighborhoods: ['ميدان لبنان','شارع التحرير','البدرشين'] },
          mohandessin: { ar: 'المهندسين', en: 'Mohandessin', popular: true,
            neighborhoods: ['شارع جامعة الدول','شارع لبنان'] },
          haram: { ar: 'الهرم', en: 'Haram',
            neighborhoods: ['الهرم','فيصل','الطالبية'] },
          october: { ar: 'مدينة أكتوبر', en: '6th of October',
            neighborhoods: ['الحي الأول','الحي الثاني','الواحة'] },
        }
      },
      alex: {
        ar: 'الإسكندرية', en: 'Alexandria', popular: true,
        cities: {
          smouha: { ar: 'سموحة', en: 'Smouha',
            neighborhoods: ['سموحة','المعمورة','الإبراهيمية'] },
          stanly: { ar: 'ستانلي', en: 'Stanley',
            neighborhoods: ['ستانلي','العجمي','المنتزه'] },
          miami: { ar: 'ميامي', en: 'Miami',
            neighborhoods: ['ميامي','العصافرة','المندرة'] },
        }
      },
    }
  },
  SA: {
    ar: 'المملكة العربية السعودية', en: 'Saudi Arabia', flag: '🇸🇦',
    governorates: {
      riyadh: {
        ar: 'الرياض', en: 'Riyadh', popular: true,
        cities: {
          malaz: { ar: 'الملز', en: 'Al Malaz', popular: true,
            neighborhoods: ['الملز','الفلاح','النزهة'] },
          olaya: { ar: 'العليا', en: 'Olaya', popular: true,
            neighborhoods: ['العليا','الورود','الغدير'] },
          naseem: { ar: 'النسيم', en: 'Al Naseem',
            neighborhoods: ['النسيم الشرقي','النسيم الغربي'] },
        }
      },
      jeddah: {
        ar: 'جدة', en: 'Jeddah', popular: true,
        cities: {
          corniche: { ar: 'الكورنيش', en: 'Corniche', popular: true,
            neighborhoods: ['الكورنيش الشمالي','الكورنيش الجنوبي'] },
          balad: { ar: 'البلد', en: 'Al Balad',
            neighborhoods: ['البلد القديم','الرويس'] },
        }
      },
      mecca: {
        ar: 'مكة المكرمة', en: 'Makkah',
        cities: {
          aziziyah: { ar: 'العزيزية', en: 'Al Aziziyah',
            neighborhoods: ['العزيزية','الشوقية'] },
        }
      },
    }
  },
  AE: {
    ar: 'الإمارات العربية المتحدة', en: 'UAE', flag: '🇦🇪',
    governorates: {
      dubai: {
        ar: 'دبي', en: 'Dubai', popular: true,
        cities: {
          deira: { ar: 'ديرة', en: 'Deira', popular: true,
            neighborhoods: ['الغرير','ديرة سيتي سنتر'] },
          marina: { ar: 'مارينا', en: 'Dubai Marina', popular: true,
            neighborhoods: ['جي بي آر','مارينا مول'] },
          downtown: { ar: 'وسط دبي', en: 'Downtown Dubai',
            neighborhoods: ['برج خليفة','دبي مول'] },
        }
      },
      abudhabi: {
        ar: 'أبوظبي', en: 'Abu Dhabi', popular: true,
        cities: {
          khalidiyah: { ar: 'الخالدية', en: 'Al Khalidiyah',
            neighborhoods: ['الخالدية','المرور'] },
          mushrif: { ar: 'المشرف', en: 'Al Mushrif',
            neighborhoods: ['المشرف','الوحدة'] },
        }
      },
    }
  },
  JO: {
    ar: 'الأردن', en: 'Jordan', flag: '🇯🇴',
    governorates: {
      amman: {
        ar: 'عمّان', en: 'Amman', popular: true,
        cities: {
          abdoun: { ar: 'عبدون', en: 'Abdoun', popular: true,
            neighborhoods: ['عبدون الشمالي','عبدون الجنوبي'] },
          sweifieh: { ar: 'الصويفية', en: 'Sweifieh', popular: true,
            neighborhoods: ['الصويفية','دير غبار'] },
          jubeiha: { ar: 'الجبيهة', en: 'Jubeiha',
            neighborhoods: ['الجبيهة','تلاع العلي'] },
        }
      },
      zarqa: {
        ar: 'الزرقاء', en: 'Zarqa',
        cities: {
          zarqa_city: { ar: 'مدينة الزرقاء', en: 'Zarqa City',
            neighborhoods: ['الزرقاء الجديدة','الحواكير'] },
        }
      },
    }
  },
  DE: {
    ar: 'ألمانيا', en: 'Germany', flag: '🇩🇪',
    governorates: {
      berlin: {
        ar: 'برلين', en: 'Berlin', popular: true,
        cities: {
          mitte: { ar: 'ميتي', en: 'Mitte', popular: true,
            neighborhoods: ['Alexanderplatz','Tiergarten','Moabit'] },
          neukoelln: { ar: 'نويكولن', en: 'Neukölln', popular: true,
            neighborhoods: ['Rixdorf','Britz','Buckow'] },
        }
      },
      hamburg: {
        ar: 'هامبورغ', en: 'Hamburg', popular: true,
        cities: {
          altona: { ar: 'ألتونا', en: 'Altona',
            neighborhoods: ['Bahrenfeld','Ottensen','Lurup'] },
        }
      },
    }
  },
};

// ── Breadcrumb chip ──────────────────────────────────────────────────────────
function Chip({ label, onClear, isRtl }) {
  return (
    <span
      style={{
        display: 'inline-flex', alignItems: 'center', gap: 4,
        background: 'rgba(245,158,11,0.12)', color: '#b45309',
        border: '1px solid rgba(245,158,11,0.3)',
        borderRadius: 999, padding: '2px 10px',
        fontSize: 13, fontFamily: "'Cairo','Tajawal',sans-serif",
        direction: isRtl ? 'rtl' : 'ltr',
      }}
    >
      {label}
      <button
        onClick={onClear}
        style={{
          background: 'none', border: 'none', cursor: 'pointer',
          color: '#b45309', fontSize: 15, lineHeight: 1,
          padding: '0 2px',
        }}
        aria-label="clear"
      >×</button>
    </span>
  );
}

// ── Search input ─────────────────────────────────────────────────────────────
function SearchBox({ value, onChange, placeholder, isRtl }) {
  return (
    <div style={{ position: 'relative', marginBottom: 8 }}>
      <span style={{
        position: 'absolute', top: '50%', transform: 'translateY(-50%)',
        [isRtl ? 'right' : 'left']: 10,
        color: '#9ca3af', fontSize: 14, pointerEvents: 'none',
      }}>🔍</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        dir={isRtl ? 'rtl' : 'ltr'}
        style={{
          width: '100%', boxSizing: 'border-box',
          padding: isRtl ? '8px 34px 8px 10px' : '8px 10px 8px 34px',
          border: '1px solid #e5e7eb', borderRadius: 8,
          fontSize: 14, fontFamily: "'Cairo','Tajawal',sans-serif",
          outline: 'none', background: '#f9fafb',
          direction: isRtl ? 'rtl' : 'ltr',
        }}
      />
    </div>
  );
}

// ── Option list ──────────────────────────────────────────────────────────────
function OptionList({ options, onSelect, lang, popular = [], isRtl }) {
  const popularSet = new Set(popular);
  return (
    <div style={{
      maxHeight: 240, overflowY: 'auto',
      borderRadius: 8, border: '1px solid #f3f4f6',
    }}>
      {options.length === 0 ? (
        <div style={{
          padding: '16px', textAlign: 'center', color: '#9ca3af',
          fontFamily: "'Cairo','Tajawal',sans-serif", fontSize: 14,
        }}>{T[lang]?.noResults}</div>
      ) : options.map(({ key, label, pop }) => (
        <button
          key={key}
          onClick={() => onSelect(key)}
          style={{
            width: '100%', display: 'flex', alignItems: 'center',
            justifyContent: isRtl ? 'flex-end' : 'flex-start',
            gap: 8,
            padding: '10px 14px', background: 'none', border: 'none',
            borderBottom: '1px solid #f3f4f6', cursor: 'pointer',
            fontFamily: "'Cairo','Tajawal',sans-serif",
            fontSize: 14, color: '#1f2937',
            direction: isRtl ? 'rtl' : 'ltr',
            textAlign: isRtl ? 'right' : 'left',
            transition: 'background 0.15s',
          }}
          onMouseEnter={e => e.currentTarget.style.background = '#fef3c7'}
          onMouseLeave={e => e.currentTarget.style.background = 'none'}
        >
          {pop && (
            <span style={{ fontSize: 10, color: '#f59e0b', fontWeight: 700 }}>★</span>
          )}
          {label}
        </button>
      ))}
    </div>
  );
}

// ── Step indicator ───────────────────────────────────────────────────────────
function StepDots({ total, current, isRtl }) {
  return (
    <div style={{
      display: 'flex', gap: 6, justifyContent: 'center',
      marginBottom: 12, direction: isRtl ? 'rtl' : 'ltr',
    }}>
      {Array.from({ length: total }, (_, i) => (
        <div key={i} style={{
          width: i === current ? 20 : 8, height: 8,
          borderRadius: 999,
          background: i < current ? '#f59e0b'
            : i === current ? '#f59e0b'
              : '#e5e7eb',
          transition: 'all 0.3s',
          opacity: i < current ? 0.5 : 1,
        }} />
      ))}
    </div>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function HierarchicalAreaPicker({
  lang = 'ar',
  countryCode = null,           // pre-lock country (e.g. 'EG' from JWT)
  onLocationChange = () => {},  // callback({ country, governorate, city, neighborhood, label })
  className = '',
  style = {},
}) {
  const isRtl = lang === 'ar';
  const t = T[lang] || T.ar;

  const [country, setCountry] = useState(countryCode || null);
  const [governorate, setGovernorate] = useState(null);
  const [city, setCity] = useState(null);
  const [neighborhood, setNeighborhood] = useState(null);
  const [search, setSearch] = useState('');

  // Determine current step
  const step = !country ? 0 : !governorate ? 1 : !city ? 2 : !neighborhood ? 3 : 4;
  const totalSteps = countryCode ? 3 : 4;
  const effectiveStep = countryCode ? step - 1 : step;

  // Emit changes upward
  useEffect(() => {
    if (!country) return;
    const countryData = LOCATIONS[country];
    const govData = governorate ? countryData?.governorates?.[governorate] : null;
    const cityData = city ? govData?.cities?.[city] : null;
    const parts = [
      countryData?.[lang === 'de' ? 'en' : lang] || countryData?.en,
      govData?.[lang === 'de' ? 'en' : lang] || govData?.en,
      cityData?.[lang === 'de' ? 'en' : lang] || cityData?.en,
      neighborhood,
    ].filter(Boolean);
    onLocationChange({
      country, governorate, city, neighborhood,
      label: parts.join(' › '),
    });
  }, [country, governorate, city, neighborhood]);

  // Build option lists
  const nameKey = lang === 'ar' ? 'ar' : 'en';

  const countryOptions = useMemo(() => {
    const all = Object.entries(LOCATIONS).map(([k, v]) => ({
      key: k, label: `${v.flag} ${v[nameKey]}`, pop: false,
    }));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(o => o.label.toLowerCase().includes(q));
  }, [search, nameKey]);

  const govOptions = useMemo(() => {
    if (!country) return [];
    const govs = LOCATIONS[country]?.governorates || {};
    const all = Object.entries(govs).map(([k, v]) => ({
      key: k, label: v[nameKey] || v.en, pop: v.popular,
    }));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(o => o.label.toLowerCase().includes(q));
  }, [country, search, nameKey]);

  const cityOptions = useMemo(() => {
    if (!country || !governorate) return [];
    const cities = LOCATIONS[country]?.governorates?.[governorate]?.cities || {};
    const all = Object.entries(cities).map(([k, v]) => ({
      key: k, label: v[nameKey] || v.en, pop: v.popular,
    }));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(o => o.label.toLowerCase().includes(q));
  }, [country, governorate, search, nameKey]);

  const neighborhoodOptions = useMemo(() => {
    if (!country || !governorate || !city) return [];
    const hoods = LOCATIONS[country]?.governorates?.[governorate]?.cities?.[city]?.neighborhoods || [];
    const all = hoods.map((n) => ({ key: n, label: n, pop: false }));
    if (!search) return all;
    const q = search.toLowerCase();
    return all.filter(o => o.label.toLowerCase().includes(q));
  }, [country, governorate, city, search]);

  // Handlers
  const selectCountry = (k) => { setCountry(k); setGovernorate(null); setCity(null); setNeighborhood(null); setSearch(''); };
  const selectGov = (k) => { setGovernorate(k); setCity(null); setNeighborhood(null); setSearch(''); };
  const selectCity = (k) => { setCity(k); setNeighborhood(null); setSearch(''); };
  const selectNeighborhood = (k) => { setNeighborhood(k); setSearch(''); };
  const clearAll = () => { if (!countryCode) setCountry(null); setGovernorate(null); setCity(null); setNeighborhood(null); setSearch(''); };

  // Breadcrumb labels
  const countryLabel = country ? `${LOCATIONS[country]?.flag} ${LOCATIONS[country]?.[nameKey]}` : null;
  const govLabel = governorate ? (LOCATIONS[country]?.governorates?.[governorate]?.[nameKey] || '') : null;
  const cityLabel = city ? (LOCATIONS[country]?.governorates?.[governorate]?.cities?.[city]?.[nameKey] || '') : null;
  const neighborhoodLabel = neighborhood || null;

  // Step title
  const stepTitle = [
    t.selectCountry,
    t.selectGov,
    t.selectCity,
    t.selectNeighborhood,
  ][step] || t.confirm;

  // Current options and select handler
  const currentOptions = [countryOptions, govOptions, cityOptions, neighborhoodOptions][step] || [];
  const currentSelect = [selectCountry, selectGov, selectCity, selectNeighborhood][step] || (() => {});

  return (
    <div
      className={className}
      dir={isRtl ? 'rtl' : 'ltr'}
      style={{
        fontFamily: "'Cairo','Tajawal',sans-serif",
        background: '#ffffff',
        borderRadius: 16,
        boxShadow: '0 4px 24px rgba(0,0,0,0.08)',
        padding: 20,
        maxWidth: 400,
        width: '100%',
        ...style,
      }}
    >
      {/* Breadcrumb chips */}
      {(countryLabel || govLabel || cityLabel || neighborhoodLabel) && (
        <div style={{
          display: 'flex', flexWrap: 'wrap', gap: 6,
          marginBottom: 12, direction: isRtl ? 'rtl' : 'ltr',
        }}>
          {countryLabel && !countryCode && (
            <Chip label={countryLabel} onClear={() => { setCountry(null); setGovernorate(null); setCity(null); setNeighborhood(null); }} isRtl={isRtl} />
          )}
          {govLabel && (
            <Chip label={govLabel} onClear={() => { setGovernorate(null); setCity(null); setNeighborhood(null); }} isRtl={isRtl} />
          )}
          {cityLabel && (
            <Chip label={cityLabel} onClear={() => { setCity(null); setNeighborhood(null); }} isRtl={isRtl} />
          )}
          {neighborhoodLabel && (
            <Chip label={neighborhoodLabel} onClear={() => setNeighborhood(null)} isRtl={isRtl} />
          )}
        </div>
      )}

      {/* Step dots */}
      {step < 4 && (
        <StepDots total={countryCode ? 3 : 4} current={effectiveStep} isRtl={isRtl} />
      )}

      {/* Confirmed state */}
      {step === 4 ? (
        <div style={{ textAlign: 'center' }}>
          <div style={{
            fontSize: 40, marginBottom: 8,
          }}>📍</div>
          <div style={{
            fontSize: 15, fontWeight: 700, color: '#1f2937',
            marginBottom: 4, direction: isRtl ? 'rtl' : 'ltr',
          }}>
            {[countryLabel, govLabel, cityLabel, neighborhoodLabel].filter(Boolean).join(' › ')}
          </div>
          <button
            onClick={clearAll}
            style={{
              marginTop: 10, padding: '8px 20px',
              background: '#fef3c7', color: '#92400e',
              border: '1px solid #f59e0b', borderRadius: 8,
              cursor: 'pointer', fontSize: 13,
              fontFamily: "'Cairo','Tajawal',sans-serif",
            }}
          >
            {t.clear}
          </button>
        </div>
      ) : (
        <>
          {/* Step label */}
          <div style={{
            fontSize: 13, color: '#6b7280', marginBottom: 4,
            direction: isRtl ? 'rtl' : 'ltr',
          }}>
            {t.step} {isRtl ? toArabicNumerals(effectiveStep + 1) : effectiveStep + 1} {t.of} {isRtl ? toArabicNumerals(countryCode ? 3 : 4) : (countryCode ? 3 : 4)}
          </div>
          <div style={{
            fontSize: 16, fontWeight: 700, color: '#1f2937',
            marginBottom: 12, direction: isRtl ? 'rtl' : 'ltr',
          }}>
            {stepTitle}
          </div>

          {/* Search */}
          <SearchBox
            value={search}
            onChange={setSearch}
            placeholder={t.searchPlaceholder}
            isRtl={isRtl}
          />

          {/* Options */}
          <OptionList
            options={currentOptions}
            onSelect={currentSelect}
            lang={lang}
            isRtl={isRtl}
          />
        </>
      )}
    </div>
  );
}
