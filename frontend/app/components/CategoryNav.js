'use client';

// run 43: Arabic category labels + icons + RTL accessibility for Arab marketplace users
// Replaced English-only category names with bilingual (Arabic-first) labels and emoji icons.
// Added aria-label, aria-pressed, dir="rtl" and scrollbar-hide for mobile UX.
const CATEGORIES = [
  { key: 'All',         label: 'الكل',        icon: '🌐' },
  { key: 'Vehicles',    label: 'سيارات',      icon: '🚗' },
  { key: 'Electronics', label: 'إلكترونيات',  icon: '📱' },
  { key: 'Real Estate', label: 'عقارات',      icon: '🏠' },
  { key: 'Jobs',        label: 'وظائف',       icon: '💼' },
  { key: 'Services',    label: 'خدمات',       icon: '🔧' },
  { key: 'Supermarket', label: 'سوبرماركت',   icon: '🛒' },
  { key: 'Pharmacy',    label: 'صيدلية',      icon: '💊' },
  { key: 'Fast Food',   label: 'طعام سريع',   icon: '🍕' },
  { key: 'Fashion',     label: 'موضة',        icon: '👗' },
];

export default function CategoryNav({ active, onChange }) {
  return (
    <nav
      aria-label="تصفح الفئات"
      dir="rtl"
      className="flex gap-2 p-3 overflow-x-auto bg-white shadow-sm"
      style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
    >
      {CATEGORIES.map(({ key, label, icon }) => (
        <button
          key={key}
          onClick={() => onChange(key)}
          aria-pressed={active === key}
          aria-label={label}
          className={
            `flex items-center gap-1.5 px-4 py-2 rounded-full text-sm whitespace-nowrap font-semibold transition-colors duration-150 ` +
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
