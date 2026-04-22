// backend/config/categoryImageMap.js
// Maps category/subcategory names to their default image slugs
// Images exist at: https://fox-kohl-eight.vercel.app/category-images/{slug}.jpg
// Uploaded to Cloudinary at: xtox/defaults/{slug}

export const CATEGORY_IMAGE_SLUGS = {
  // Electronics
  'إلكترونيات': 'electronics', 'electronics': 'electronics',
  'موبايلات': 'mobile-phones', 'موبايل': 'mobile-phones',
  'لابتوب': 'laptops', 'كمبيوتر محمول': 'laptops',
  'تابلت': 'tablets', 'تابليت': 'tablets',
  'كاميرات': 'cameras', 'كاميرا': 'cameras',
  'سماعات': 'headphones',
  'شاشات': 'monitors',
  'ألعاب فيديو': 'video-games', 'بلايستيشن': 'video-games',
  'أجهزة منزلية': 'home-appliances', 'غسالة': 'home-appliances',
  // Cars
  'سيارات': 'cars', 'cars': 'cars', 'سيارة': 'cars',
  'سيارات ملاكي': 'passenger-cars',
  'دراجات نارية': 'motorcycles', 'موتوسيكل': 'motorcycles',
  'قطع غيار': 'car-parts',
  'إكسسوارات سيارات': 'car-accessories',
  // Real Estate
  'عقارات': 'real-estate', 'real-estate': 'real-estate',
  'شقق للإيجار': 'apartments-rent', 'إيجار': 'apartments-rent',
  'شقق للبيع': 'apartments-sale', 'شقة': 'apartments-sale',
  'فيلل': 'villas', 'فيلا': 'villas',
  'أراضي': 'land', 'أرض': 'land',
  'مكاتب': 'offices', 'محل': 'offices',
  // Clothes
  'ملابس': 'clothes', 'clothes': 'clothes',
  'ملابس رجالي': 'mens-clothes',
  'ملابس حريمي': 'womens-clothes', 'فستان': 'womens-clothes',
  'ملابس أطفال': 'kids-clothes',
  'أحذية': 'shoes', 'حذاء': 'shoes',
  'اكسسوارات': 'accessories', 'حقيبة': 'accessories',
  // Furniture
  'أثاث': 'furniture', 'furniture': 'furniture',
  'غرف نوم': 'bedroom', 'سرير': 'bedroom',
  'أنتريهات': 'living-room', 'كنبة': 'living-room',
  'مطابخ': 'kitchen-furniture',
  'مكاتب وكراسي': 'office-furniture',
  'ديكور': 'decor',
  // Services
  'خدمات': 'services', 'services': 'services',
  'صيانة': 'maintenance',
  'تعليم وتدريس': 'education', 'دروس': 'education',
  'تصميم': 'design',
  'سباكة وكهرباء': 'plumbing-electrical',
  'نقل وشحن': 'moving',
  // Jobs
  'وظائف': 'jobs', 'jobs': 'jobs', 'وظيفة': 'jobs',
  'تقنية ومعلومات': 'it-jobs',
  'مبيعات وتسويق': 'sales-jobs',
  'طب وصحة': 'medical-jobs',
  'تعليم': 'teaching-jobs',
  'هندسة': 'engineering-jobs',
  // Animals
  'حيوانات': 'animals', 'animals': 'animals',
  'كلاب': 'dogs', 'كلب': 'dogs',
  'قطط': 'cats', 'قط': 'cats',
  'طيور': 'birds', 'طائر': 'birds',
  'أسماك': 'fish',
  'مستلزمات حيوانات': 'pet-supplies',
  // Sports
  'رياضة': 'sports', 'sports': 'sports',
  'معدات رياضية': 'sports-equipment',
  'ملابس رياضية': 'sportswear',
  'دراجات': 'bicycles', 'عجلة': 'bicycles',
  'كرة قدم': 'football',
  // Books
  'كتب وتعليم': 'books', 'books': 'books', 'كتاب': 'books',
  'كتب مدرسية': 'textbooks',
  'روايات': 'novels',
  'كورسات': 'courses',
  'أدوات مكتبية': 'stationery',
  // Toys
  'ألعاب أطفال': 'toys', 'toys': 'toys', 'لعبة': 'toys',
  'ألعاب تعليمية': 'educational-toys',
  'دمى': 'dolls',
  'سكوتر ودراجات أطفال': 'kids-bikes',
  // Health & Beauty
  'صحة وجمال': 'health-beauty', 'health-beauty': 'health-beauty',
  'عطور': 'perfumes', 'عطر': 'perfumes',
  'مستحضرات تجميل': 'cosmetics', 'مكياج': 'cosmetics',
  'أجهزة طبية': 'medical-devices',
  'مكملات غذائية': 'supplements',
  // Food
  'طعام ومشروبات': 'food', 'food': 'food', 'أكل': 'food',
  'طعام منزلي': 'homemade-food',
  'مواد غذائية': 'groceries',
  'حلويات': 'sweets',
  // Other / fallback
  'أخرى': 'other', 'other': 'other',
  'أدوات منزلية': 'household-tools',
  'مقتنيات ونادر': 'collectibles',
  'هدايا': 'gifts',
};

/**
 * Returns the best image slug for a given category/subcategory pair.
 * Falls back to 'other' if no match found.
 */
export function getImageSlug(subcategory, category) {
  if (subcategory && CATEGORY_IMAGE_SLUGS[subcategory]) return CATEGORY_IMAGE_SLUGS[subcategory];
  if (category && CATEGORY_IMAGE_SLUGS[category]) return CATEGORY_IMAGE_SLUGS[category];
  // Try lowercase
  const subLower = subcategory?.toLowerCase();
  const catLower = category?.toLowerCase();
  if (subLower && CATEGORY_IMAGE_SLUGS[subLower]) return CATEGORY_IMAGE_SLUGS[subLower];
  if (catLower && CATEGORY_IMAGE_SLUGS[catLower]) return CATEGORY_IMAGE_SLUGS[catLower];
  return 'other';
}
