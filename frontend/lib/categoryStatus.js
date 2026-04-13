// Smart product status options per category
export const CATEGORY_STATUS = {
  'Supermarket': [
    { value: 'available', label: 'متاح', icon: '✅' },
    { value: 'out_of_stock', label: 'نفذت الكمية', icon: '❌' },
    { value: 'special_offer', label: 'عرض خاص', icon: '🏷️' },
    { value: 'seasonal', label: 'موسمي', icon: '🌱' },
  ],
  'Pharmacy': [
    { value: 'available', label: 'متاح', icon: '✅' },
    { value: 'out_of_stock', label: 'نفذ', icon: '❌' },
    { value: 'prescription', label: 'يحتاج وصفة', icon: '📋' },
    { value: 'expiring_soon', label: 'قرب انتهاء الصلاحية', icon: '⚠️' },
  ],
  'Fast Food': [
    { value: 'available', label: 'متاح', icon: '✅' },
    { value: 'out_of_stock', label: 'نفذ', icon: '❌' },
    { value: 'seasonal', label: 'موسمي', icon: '🌱' },
    { value: 'pre_order', label: 'طلب مسبق', icon: '📦' },
  ],
  'Vehicles': [
    { value: 'for_sale', label: 'للبيع', icon: '🏷️' },
    { value: 'for_rent', label: 'للإيجار', icon: '🔑' },
    { value: 'installment', label: 'للتقسيط', icon: '💳' },
    { value: 'damaged', label: 'هيكل / تالف', icon: '🔧' },
  ],
  'Real Estate': [
    { value: 'for_sale', label: 'للبيع', icon: '🏠' },
    { value: 'for_rent', label: 'للإيجار السنوي', icon: '📅' },
    { value: 'monthly_rent', label: 'للإيجار الشهري', icon: '🗓️' },
    { value: 'partnership', label: 'للمشاركة', icon: '🤝' },
  ],
  'Jobs': [
    { value: 'open', label: 'متاح', icon: '🟢' },
    { value: 'filled', label: 'شُغلت الوظيفة', icon: '🔴' },
    { value: 'urgent', label: 'عاجل', icon: '⚡' },
    { value: 'part_time', label: 'دوام جزئي', icon: '⏰' },
  ],
  'Services': [
    { value: 'available', label: 'متاح', icon: '✅' },
    { value: 'busy', label: 'مشغول', icon: '🔴' },
    { value: 'booking_only', label: 'حجز مسبق', icon: '📅' },
    { value: 'online', label: 'أونلاين', icon: '💻' },
  ],
  'Fashion': [
    { value: 'new', label: 'جديد', icon: '✨' },
    { value: 'used', label: 'مستعمل', icon: '🔄' },
    { value: 'exchange', label: 'للتبادل', icon: '↔️' },
    { value: 'handmade', label: 'صنع يدوي', icon: '🧵' },
  ],
  'Electronics': [
    { value: 'new', label: 'جديد', icon: '✨' },
    { value: 'used', label: 'مستعمل', icon: '🔄' },
    { value: 'refurbished', label: 'مُجدَّد', icon: '♻️' },
    { value: 'for_rent', label: 'للإيجار', icon: '🔑' },
  ],
  // Default for all other categories
  'default': [
    { value: 'new', label: 'جديد', icon: '✨' },
    { value: 'used', label: 'مستعمل', icon: '🔄' },
    { value: 'for_rent', label: 'للإيجار', icon: '🔑' },
  ],
};

export function getStatusOptions(category) {
  return CATEGORY_STATUS[category] || CATEGORY_STATUS['default'];
}
