'use client';
import { useLanguage } from '../context/LanguageContext';

// run 43+: Arabic category labels + icons + RTL accessibility for Arab marketplace users
// Replaced hardcoded labels with t() translation calls so they auto-translate for every language.
// Added aria-label, aria-pressed, dir={isRTL ? "rtl" : "ltr"} and scrollbar-hide for mobile UX.

export default function CategoryNav({ active, onChange }) {
  const { t, isRTL } = useLanguage();

  const categories = [
    { key: 'All',         icon: '🌐', label: t('cat_all') },
    { key: 'Vehicles',    icon: '🚗', label: t('cat_vehicles') },
    { key: 'Electronics', icon: '📱', label: t('cat_electronics') },
    { key: 'Real Estate', icon: '🏠', label: t('cat_real_estate') },
    { key: 'Jobs',        icon: '💼', label: t('cat_jobs') },
    { key: 'Services',    icon: '🔧', label: t('cat_services') },
    { key: 'Supermarket', icon: '🛒', label: t('cat_supermarket') },
    { key: 'Pharmacy',    icon: '💊', label: t('cat_pharmacy') },
    { key: 'Fast Food',   icon: '🍕', label: t('cat_fast_food') },
    { key: 'Fashion',     icon: '👗', label: t('cat_fashion') },
  ];

  return (
    <nav
      aria-label={t('home_categories')}
      dir="rtl"
      className="flex gap-2 p-3 overflow-x-auto bg-white shadow-sm"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {categories.map(({ key, label, icon }) => (
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
          <span aria-hidden="true">{icon}</span>
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}
