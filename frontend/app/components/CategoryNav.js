'use client';
import { useLanguage } from '../context/LanguageContext';

// run 44+: Replaced emoji icons with circular category images from /category-images/

const CAT_IMAGE_MAP = {
  'All':         'other',
  'Vehicles':    'cars',
  'Electronics': 'electronics',
  'Real Estate': 'real-estate',
  'Jobs':        'jobs',
  'Services':    'services',
  'Supermarket': 'groceries',
  'Pharmacy':    'health-beauty',
  'Fast Food':   'food',
  'Fashion':     'clothes',
};

export default function CategoryNav({ active, onChange }) {
  const { t, isRTL } = useLanguage();

  const categories = [
    { key: 'All',         label: t('cat_all') },
    { key: 'Vehicles',    label: t('cat_vehicles') },
    { key: 'Electronics', label: t('cat_electronics') },
    { key: 'Real Estate', label: t('cat_real_estate') },
    { key: 'Jobs',        label: t('cat_jobs') },
    { key: 'Services',    label: t('cat_services') },
    { key: 'Supermarket', label: t('cat_supermarket') },
    { key: 'Pharmacy',    label: t('cat_pharmacy') },
    { key: 'Fast Food',   label: t('cat_fast_food') },
    { key: 'Fashion',     label: t('cat_fashion') },
  ];

  return (
    <nav
      aria-label={t('home_categories')}
      dir="rtl"
      className="flex gap-2 p-3 overflow-x-auto bg-white shadow-sm"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {categories.map(({ key, label }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={active === key}
          aria-label={label}
          className={
            'flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap font-semibold transition-colors duration-150 ' +
            (active === key
              ? 'bg-[#002f34] text-white shadow-md'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200')
          }
        >
          <img
            src={`/category-images/${CAT_IMAGE_MAP[key] || 'other'}.jpg`}
            alt=""
            aria-hidden="true"
            style={{
              width: '20px',
              height: '20px',
              borderRadius: '50%',
              objectFit: 'cover',
              flexShrink: 0,
            }}
            onError={(e) => { e.target.style.display = 'none'; }}
          />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
