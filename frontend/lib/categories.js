// Shared category + subcategory definitions for FOX/XTOX
// Used by: sell page, search, ad display, auto-assignment

export const CATEGORIES = {
  Vehicles: {
    ar: 'سيارات',
    subcategories: [
      { value: 'Cars', ar: 'سيارات' },
      { value: 'Motorcycles', ar: 'دراجات نارية' },
      { value: 'Trucks', ar: 'شاحنات' },
      { value: 'Boats', ar: 'قوارب' },
      { value: 'SpareParts', ar: 'قطع غيار' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['سيارة','عربية','موتور','شاحنة','مركبة','car','vehicle','truck','motorcycle','bike','boat','قطع غيار','اوتوماتيك','مانيوال'],
  },
  Electronics: {
    ar: 'إلكترونيات',
    subcategories: [
      { value: 'MobilePhones', ar: 'هواتف محمولة' },
      { value: 'Laptops', ar: 'لابتوب' },
      { value: 'Tablets', ar: 'تابلت' },
      { value: 'TVs', ar: 'تليفزيونات' },
      { value: 'Cameras', ar: 'كاميرات' },
      { value: 'Gaming', ar: 'ألعاب إلكترونية' },
      { value: 'Audio', ar: 'صوتيات' },
      { value: 'Accessories', ar: 'إكسسوارات' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['موبايل','تليفون','لابتوب','تابلت','تليفزيون','كاميرا','بلايستيشن','xbox','سماعات','شاشة','طابعة','phone','laptop','tablet','tv','camera','gaming','iphone','samsung','huawei'],
  },
  'Real Estate': {
    ar: 'عقارات',
    subcategories: [
      { value: 'Apartments', ar: 'شقق' },
      { value: 'Villas', ar: 'فيلات' },
      { value: 'Land', ar: 'أراضي' },
      { value: 'Commercial', ar: 'تجاري' },
      { value: 'Offices', ar: 'مكاتب' },
      { value: 'Rooms', ar: 'غرف' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['شقة','فيلا','أرض','مكتب','محل','عقار','apartment','villa','land','office','room','studio','duplex','بيت','منزل','سكن'],
  },
  Jobs: {
    ar: 'وظائف',
    subcategories: [
      { value: 'FullTime', ar: 'دوام كامل' },
      { value: 'PartTime', ar: 'دوام جزئي' },
      { value: 'Freelance', ar: 'فريلانس' },
      { value: 'Internship', ar: 'تدريب' },
      { value: 'Remote', ar: 'عن بُعد' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['وظيفة','وظائف','مطلوب','فرصة عمل','دوام','freelance','job','work','hiring','vacancy','تدريب','internship'],
  },
  Services: {
    ar: 'خدمات',
    subcategories: [
      { value: 'HomeServices', ar: 'خدمات منزلية' },
      { value: 'Cleaning', ar: 'تنظيف' },
      { value: 'Repairs', ar: 'إصلاح وصيانة' },
      { value: 'Education', ar: 'تعليم ودروس' },
      { value: 'Health', ar: 'صحة وجمال' },
      { value: 'Transport', ar: 'نقل وشحن' },
      { value: 'Design', ar: 'تصميم وطباعة' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['سباك','كهربائي','نجار','نقل','تنظيف','دروس','مدرس','تصليح','خدمة','صيانة','plumber','electrician','cleaning','repair','teacher','tutor','design'],
  },
  Supermarket: {
    ar: 'سوبرماركت',
    subcategories: [
      { value: 'Food', ar: 'مواد غذائية' },
      { value: 'Beverages', ar: 'مشروبات' },
      { value: 'PersonalCare', ar: 'عناية شخصية' },
      { value: 'Household', ar: 'منزلية' },
      { value: 'BabyProducts', ar: 'منتجات أطفال' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['غذاء','أكل','مشروب','عناية','منظف','سوبرماركت','food','grocery','beverage','personal care','household','baby'],
  },
  Pharmacy: {
    ar: 'صيدلية',
    subcategories: [
      { value: 'Medicines', ar: 'أدوية' },
      { value: 'MedicalDevices', ar: 'أجهزة طبية' },
      { value: 'Supplements', ar: 'مكملات غذائية' },
      { value: 'BabyHealth', ar: 'صحة الأطفال' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['دواء','صيدلية','مكمل','فيتامين','أجهزة طبية','medicine','pharmacy','supplement','vitamin','medical device'],
  },
  'Fast Food': {
    ar: 'طعام',
    subcategories: [
      { value: 'Pizza', ar: 'بيتزا' },
      { value: 'Burgers', ar: 'برجر' },
      { value: 'Sandwiches', ar: 'ساندوتشات' },
      { value: 'Desserts', ar: 'حلويات' },
      { value: 'Oriental', ar: 'مأكولات شرقية' },
      { value: 'Seafood', ar: 'مأكولات بحرية' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['بيتزا','برجر','ساندوتش','حلويات','مطعم','كشري','فطير','شاورما','pizza','burger','sandwich','dessert','food','restaurant'],
  },
  Fashion: {
    ar: 'موضة',
    subcategories: [
      { value: 'MensClothing', ar: 'ملابس رجالية' },
      { value: 'WomensClothing', ar: 'ملابس نسائية' },
      { value: 'KidsClothing', ar: 'ملابس أطفال' },
      { value: 'Shoes', ar: 'أحذية' },
      { value: 'Bags', ar: 'شنط' },
      { value: 'Accessories', ar: 'إكسسوارات' },
      { value: 'Other', ar: 'أخرى' },
    ],
    keywords: ['ملابس','فستان','قميص','بنطلون','حذاء','شنطة','إكسسوار','fashion','clothes','dress','shirt','shoes','bag','accessories','جاكيت','عباءة'],
  },
};

// Auto-detect subcategory from title + description text
export function autoDetectSubcategory(category, text) {
  if (!category || !text || !CATEGORIES[category]) return 'Other';
  const lower = text.toLowerCase();

  const hints = {
    Vehicles: [
      { kw: ['سيارة','عربية','car','sedan','suv','كوبيه','بيك اب'], val: 'Cars' },
      { kw: ['موتور','دراجة','motorcycle','bike'], val: 'Motorcycles' },
      { kw: ['شاحنة','truck','van','نقل'], val: 'Trucks' },
      { kw: ['قارب','boat','yacht'], val: 'Boats' },
      { kw: ['قطع غيار','spare','parts','كفرات','بطارية'], val: 'SpareParts' },
    ],
    Electronics: [
      { kw: ['موبايل','تليفون','iphone','samsung','huawei','phone','mobile'], val: 'MobilePhones' },
      { kw: ['لابتوب','laptop','notebook','macbook'], val: 'Laptops' },
      { kw: ['تابلت','ipad','tablet'], val: 'Tablets' },
      { kw: ['تليفزيون','شاشة','tv','television','monitor'], val: 'TVs' },
      { kw: ['كاميرا','camera','dslr','gopro'], val: 'Cameras' },
      { kw: ['بلايستيشن','xbox','gaming','game','playstation','nintendo'], val: 'Gaming' },
      { kw: ['سماعات','speaker','headphone','earphone','audio'], val: 'Audio' },
    ],
    'Real Estate': [
      { kw: ['شقة','apartment','flat','studio','دوبلكس'], val: 'Apartments' },
      { kw: ['فيلا','villa','house','منزل','بيت'], val: 'Villas' },
      { kw: ['أرض','land','plot','قطعة'], val: 'Land' },
      { kw: ['محل','تجاري','commercial','shop'], val: 'Commercial' },
      { kw: ['مكتب','office'], val: 'Offices' },
      { kw: ['غرفة','room','اوضة'], val: 'Rooms' },
    ],
    Jobs: [
      { kw: ['full time','دوام كامل','full-time'], val: 'FullTime' },
      { kw: ['part time','دوام جزئي','part-time'], val: 'PartTime' },
      { kw: ['freelance','فريلانس','مستقل'], val: 'Freelance' },
      { kw: ['تدريب','internship','training'], val: 'Internship' },
      { kw: ['remote','عن بعد','اونلاين'], val: 'Remote' },
    ],
    Services: [
      { kw: ['سباك','كهربائي','نجار','صباغ','تركيب','home'], val: 'HomeServices' },
      { kw: ['تنظيف','cleaning','نظافة'], val: 'Cleaning' },
      { kw: ['تصليح','صيانة','repair','maintenance'], val: 'Repairs' },
      { kw: ['مدرس','دروس','تعليم','teacher','tutor','lesson'], val: 'Education' },
      { kw: ['دكتور','طبيب','صحة','health','beauty','تجميل'], val: 'Health' },
      { kw: ['نقل','شحن','transport','delivery','توصيل'], val: 'Transport' },
      { kw: ['تصميم','design','طباعة','print'], val: 'Design' },
    ],
  };

  const catHints = hints[category];
  if (catHints) {
    for (const item of catHints) {
      if (item.kw.some(function(k) { return lower.includes(k); })) return item.val;
    }
  }
  return 'Other';
}

// Get subcategory Arabic label
export function getSubcategoryAr(category, subcategory) {
  if (!category || !subcategory || !CATEGORIES[category]) return subcategory || '';
  const found = CATEGORIES[category].subcategories.find(function(s) { return s.value === subcategory; });
  return found ? found.ar : subcategory;
}
