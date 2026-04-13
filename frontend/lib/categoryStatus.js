// Smart product status options per category + subcategory
// Structure: { category: { subcategory: [...options], _default: [...options] } }

const _sale = { value: 'for_sale', label: 'للبيع', icon: '🏷️' };
const _rent = { value: 'for_rent', label: 'للإيجار', icon: '🔑' };
const _installment = { value: 'installment', label: 'للتقسيط', icon: '💳' };
const _partnership = { value: 'partnership', label: 'للمشاركة', icon: '🤝' };
const _damaged = { value: 'damaged', label: 'هيكل/تالف', icon: '🔧' };
const _new = { value: 'new', label: 'جديد', icon: '✨' };
const _used = { value: 'used', label: 'مستعمل', icon: '🔄' };
const _refurbished = { value: 'refurbished', label: 'مُجدَّد', icon: '♻️' };
const _available = { value: 'available', label: 'متاح', icon: '✅' };
const _open = { value: 'open', label: 'متاح', icon: '🟢' };
const _annual_rent = { value: 'annual_rent', label: 'للإيجار السنوي', icon: '📅' };
const _monthly_rent = { value: 'monthly_rent', label: 'للإيجار الشهري', icon: '🗓️' };
const _daily_rent = { value: 'daily_rent', label: 'إيجار يومي', icon: '☀️' };

export const SUBCATEGORY_STATUS = {
  Vehicles: {
    'ملاكي': [_sale, _rent, _installment, _partnership, _damaged],
    'دراجات نارية': [_sale, _rent, _installment],
    'تجاري': [_sale, _rent, _installment, _damaged],
    'قطع غيار': [
      { value: 'oem', label: 'أصلي OEM', icon: '✅' },
      { value: 'genuine', label: 'جينيون', icon: '🔵' },
      { value: 'used', label: 'مستعمل بحالة جيدة', icon: '🔄' },
      { value: 'damaged_parts', label: 'لا يعمل (للقطعة)', icon: '🔧' },
    ],
    'مراكب وقوارب': [_sale, _rent, _installment],
    'آليات زراعية': [_sale, _rent, _installment],
    _default: [_sale, _rent, _installment],
  },
  'Real Estate': {
    'شقق': [_sale, _annual_rent, _monthly_rent, _daily_rent, _partnership],
    'فيلات ومنازل': [_sale, _annual_rent, _monthly_rent, _installment, _partnership],
    'محلات وعيادات': [_sale, _rent, { value: 'turnkey', label: 'مشروع جاهز', icon: '🔑' }],
    'أراضي': [_sale, _installment, _partnership, { value: 'agricultural_rent', label: 'للإيجار الزراعي', icon: '🌱' }],
    'مكاتب وإدارية': [_sale, _annual_rent, _monthly_rent],
    'مخازن ومستودعات': [_sale, _rent, _partnership],
    _default: [_sale, _rent, _installment],
  },
  Electronics: {
    'موبايلات': [_new, _used, _refurbished, { value: 'cracked', label: 'شاشة مكسورة', icon: '📱' }],
    'لابتوب': [_new, _used, _refurbished, _rent],
    'تلفزيونات وشاشات': [_new, _used],
    'كاميرات': [_new, _used, _rent],
    'أجهزة منزلية': [_new, _used, { value: 'needs_repair', label: 'يحتاج صيانة', icon: '🔧' }],
    'ألعاب إلكترونية': [_new, _used],
    'اكسسوارات وصوتيات': [_new, _used, { value: 'for_exchange', label: 'للتبادل', icon: '↔️' }],
    _default: [_new, _used, _refurbished],
  },
  Jobs: {
    _default: [
      _open,
      { value: 'filled', label: 'شُغلت الوظيفة', icon: '🔴' },
      { value: 'urgent', label: 'عاجل', icon: '⚡' },
      { value: 'part_time', label: 'دوام جزئي', icon: '⏰' },
      { value: 'remote', label: 'عن بُعد', icon: '🌐' },
    ],
  },
  Services: {
    _default: [
      _available,
      { value: 'busy', label: 'مشغول', icon: '🔴' },
      { value: 'booking_only', label: 'حجز مسبق', icon: '📅' },
      { value: 'online', label: 'أونلاين', icon: '💻' },
    ],
  },
  Fashion: {
    _default: [
      _new,
      _used,
      { value: 'exchange', label: 'للتبادل', icon: '↔️' },
      { value: 'handmade', label: 'صنع يدوي', icon: '🧵' },
    ],
  },
  Supermarket: {
    _default: [
      _available,
      { value: 'out_of_stock', label: 'نفذت الكمية', icon: '❌' },
      { value: 'special_offer', label: 'عرض خاص', icon: '🏷️' },
      { value: 'seasonal', label: 'موسمي', icon: '🌱' },
    ],
  },
  Pharmacy: {
    _default: [
      _available,
      { value: 'out_of_stock', label: 'نفذ', icon: '❌' },
      { value: 'prescription', label: 'يحتاج وصفة', icon: '📋' },
      { value: 'expiring_soon', label: 'قرب انتهاء الصلاحية', icon: '⚠️' },
    ],
  },
  'Fast Food': {
    _default: [
      _available,
      { value: 'out_of_stock', label: 'نفذ', icon: '❌' },
      { value: 'seasonal', label: 'موسمي', icon: '🌱' },
      { value: 'pre_order', label: 'طلب مسبق', icon: '📦' },
    ],
  },
};

const defaultStatus = [
  { value: 'new', label: 'جديد', icon: '✨' },
  { value: 'used', label: 'مستعمل', icon: '🔄' },
  { value: 'for_rent', label: 'للإيجار', icon: '🔑' },
];

export function getStatusOptions(category, subcategory) {
  const catStatus = SUBCATEGORY_STATUS[category];
  if (!catStatus) return defaultStatus;
  if (subcategory && catStatus[subcategory]) return catStatus[subcategory];
  return catStatus['_default'] || defaultStatus;
}
