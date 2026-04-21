/**
 * XTOX Full Category Taxonomy
 * Arabic marketplace — Egypt + Arab world
 * Used for AI classification and UI display
 *
 * When adding new categories here, regenerate translations:
 *   node backend/scripts/generateCategoryTranslations.js
 * Or call: POST /api/ads/admin/regenerate-translations (x-admin-key: xtox-admin-2026)
 */
const CATEGORIES = [
  {
    id: 'electronics', name: 'إلكترونيات', nameEn: 'Electronics', emoji: '📱',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/electronics',
    keywords: ['موبايل', 'هاتف', 'آيفون', 'سامسونج', 'لابتوب', 'كمبيوتر', 'تابلت', 'آيباد', 'كاميرا', 'طابعة', 'شاشة', 'سماعة', 'راوتر', 'بلايستيشن', 'xbox', 'phone', 'laptop', 'camera', 'computer'],
    subcategories: [
      { id: 'mobile', name: 'موبايلات وهواتف', nameEn: 'Mobile Phones', emoji: '📱' },
      { id: 'laptop', name: 'لابتوب وكمبيوتر', nameEn: 'Laptops & PCs', emoji: '💻' },
      { id: 'tablet', name: 'تابلت', nameEn: 'Tablets', emoji: '📲' },
      { id: 'camera', name: 'كاميرات', nameEn: 'Cameras', emoji: '📷' },
      { id: 'tv', name: 'تلفزيونات وشاشات', nameEn: 'TVs & Screens', emoji: '📺' },
      { id: 'gaming', name: 'ألعاب فيديو', nameEn: 'Gaming', emoji: '🎮' },
      { id: 'accessories_tech', name: 'إكسسوارات تقنية', nameEn: 'Tech Accessories', emoji: '🔌' },
      { id: 'audio', name: 'صوتيات وسماعات', nameEn: 'Audio', emoji: '🎧' },
    ]
  },
  {
    id: 'cars', name: 'سيارات ومركبات', nameEn: 'Cars & Vehicles', emoji: '🚗',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/cars',
    keywords: ['سيارة', 'عربية', 'موتوسيكل', 'دراجة', 'توك توك', 'شاحنة', 'ميكروباص', 'car', 'motor', 'bike', 'truck', 'يوسف', 'هيونداي', 'تويوتا', 'بيجو', 'رينو', 'مرسيدس', 'بي ام', 'فيات', 'كيا', 'هوندا', 'نيسان'],
    subcategories: [
      { id: 'passenger_car', name: 'سيارات ملاكي', nameEn: 'Passenger Cars', emoji: '🚗' },
      { id: 'commercial_vehicle', name: 'سيارات نقل وتجارية', nameEn: 'Commercial Vehicles', emoji: '🚛' },
      { id: 'motorcycle', name: 'موتوسيكلات', nameEn: 'Motorcycles', emoji: '🏍️' },
      { id: 'car_parts', name: 'قطع غيار', nameEn: 'Spare Parts', emoji: '⚙️' },
      { id: 'car_accessories', name: 'إكسسوارات سيارات', nameEn: 'Car Accessories', emoji: '🔧' },
      { id: 'boats', name: 'قوارب ومراكب', nameEn: 'Boats', emoji: '⛵' },
    ]
  },
  {
    id: 'real_estate', name: 'عقارات', nameEn: 'Real Estate', emoji: '🏠',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/real_estate',
    keywords: ['شقة', 'فيلا', 'دوبلكس', 'أرض', 'محل', 'مكتب', 'استوديو', 'غرفة', 'apartment', 'villa', 'land', 'office', 'shop', 'إيجار', 'بيع', 'تمليك'],
    subcategories: [
      { id: 'apartment_rent', name: 'شقق للإيجار', nameEn: 'Apartments for Rent', emoji: '🏢' },
      { id: 'apartment_sale', name: 'شقق للبيع', nameEn: 'Apartments for Sale', emoji: '🏠' },
      { id: 'villa', name: 'فيلات ومنازل', nameEn: 'Villas & Houses', emoji: '🏡' },
      { id: 'land', name: 'أراضي', nameEn: 'Land', emoji: '🌍' },
      { id: 'commercial_space', name: 'محلات ومكاتب', nameEn: 'Commercial Spaces', emoji: '🏪' },
      { id: 'room_rent', name: 'غرف للإيجار', nameEn: 'Rooms for Rent', emoji: '🛏️' },
    ]
  },
  {
    id: 'fashion', name: 'أزياء وملابس', nameEn: 'Fashion & Clothing', emoji: '👗',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/fashion',
    keywords: ['ملابس', 'فستان', 'جلابية', 'بنطلون', 'جاكيت', 'حذاء', 'شنطة', 'حقيبة', 'ساعة', 'خاتم', 'عباية', 'حجاب', 'clothes', 'dress', 'shoes', 'bag', 'watch'],
    subcategories: [
      { id: 'mens_clothing', name: 'ملابس رجالي', nameEn: "Men's Clothing", emoji: '👔' },
      { id: 'womens_clothing', name: 'ملابس حريمي', nameEn: "Women's Clothing", emoji: '👗' },
      { id: 'kids_clothing', name: 'ملابس أطفال', nameEn: "Kids' Clothing", emoji: '👶' },
      { id: 'shoes', name: 'أحذية', nameEn: 'Shoes', emoji: '👟' },
      { id: 'bags', name: 'شنط وحقائب', nameEn: 'Bags', emoji: '👜' },
      { id: 'watches_jewelry', name: 'ساعات ومجوهرات', nameEn: 'Watches & Jewelry', emoji: '💍' },
      { id: 'accessories_fashion', name: 'إكسسوارات', nameEn: 'Accessories', emoji: '🧣' },
    ]
  },
  {
    id: 'furniture', name: 'أثاث ومنزل', nameEn: 'Furniture & Home', emoji: '🛋️',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/furniture',
    keywords: ['أثاث', 'كنبة', 'سرير', 'دولاب', 'مطبخ', 'غرفة نوم', 'نيم', 'غسالة', 'ثلاجة', 'بوتاجاز', 'مكيف', 'ديكور', 'سجادة', 'furniture', 'sofa', 'bed', 'fridge', 'washing'],
    subcategories: [
      { id: 'living_room', name: 'أثاث صالون وريسبشن', nameEn: 'Living Room Furniture', emoji: '🛋️' },
      { id: 'bedroom', name: 'أثاث غرف نوم', nameEn: 'Bedroom Furniture', emoji: '🛏️' },
      { id: 'kitchen_appliances', name: 'أجهزة مطبخ', nameEn: 'Kitchen Appliances', emoji: '🍳' },
      { id: 'home_appliances', name: 'أجهزة منزلية كبيرة', nameEn: 'Large Home Appliances', emoji: '🫧' },
      { id: 'decor', name: 'ديكور وإضاءة', nameEn: 'Decor & Lighting', emoji: '🕯️' },
      { id: 'ac_heating', name: 'تكييف وتدفئة', nameEn: 'AC & Heating', emoji: '❄️' },
    ]
  },
  {
    id: 'services', name: 'خدمات', nameEn: 'Services', emoji: '🔧',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/services',
    keywords: ['خدمة', 'صيانة', 'تصميم', 'برمجة', 'نقل', 'تعليم', 'دروس', 'مدرس', 'دكتور', 'طب', 'قانوني', 'محاسبة', 'تنظيف', 'حراسة', 'service', 'repair', 'lesson', 'tutor', 'cleaning'],
    subcategories: [
      { id: 'education', name: 'تعليم ودروس', nameEn: 'Education & Tutoring', emoji: '📚' },
      { id: 'repair_maintenance', name: 'صيانة وإصلاح', nameEn: 'Repair & Maintenance', emoji: '🔧' },
      { id: 'design_tech', name: 'تصميم وبرمجة', nameEn: 'Design & Programming', emoji: '💻' },
      { id: 'transport', name: 'نقل وشحن', nameEn: 'Transport & Shipping', emoji: '🚚' },
      { id: 'health_beauty', name: 'صحة وجمال', nameEn: 'Health & Beauty', emoji: '💇' },
      { id: 'cleaning', name: 'تنظيف ونظافة', nameEn: 'Cleaning', emoji: '🧹' },
      { id: 'legal_financial', name: 'قانوني ومالي', nameEn: 'Legal & Financial', emoji: '⚖️' },
      { id: 'events', name: 'مناسبات وأفراح', nameEn: 'Events & Weddings', emoji: '🎉' },
    ]
  },
  {
    id: 'jobs', name: 'وظائف', nameEn: 'Jobs', emoji: '💼',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/jobs',
    keywords: ['وظيفة', 'شغل', 'عمل', 'مطلوب', 'مرتب', 'راتب', 'توظيف', 'job', 'work', 'hiring', 'vacancy', 'career', 'مبيعات', 'محاسب', 'مهندس', 'طبيب'],
    subcategories: [
      { id: 'job_offered', name: 'وظائف متاحة', nameEn: 'Jobs Available', emoji: '📋' },
      { id: 'job_wanted', name: 'باحثون عن عمل', nameEn: 'Job Seekers', emoji: '👤' },
      { id: 'freelance', name: 'فريلانس وعمل حر', nameEn: 'Freelance', emoji: '🏠' },
    ]
  },
  {
    id: 'pets', name: 'حيوانات أليفة', nameEn: 'Pets', emoji: '🐾',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/pets',
    keywords: ['قطة', 'كلب', 'طير', 'أرنب', 'سمكة', 'حصان', 'حيوان', 'بغبغان', 'كناري', 'cat', 'dog', 'bird', 'rabbit', 'fish', 'pet', 'hamster'],
    subcategories: [
      { id: 'cats', name: 'قطط', nameEn: 'Cats', emoji: '🐱' },
      { id: 'dogs', name: 'كلاب', nameEn: 'Dogs', emoji: '🐶' },
      { id: 'birds', name: 'طيور', nameEn: 'Birds', emoji: '🦜' },
      { id: 'fish', name: 'أسماك وأحواض', nameEn: 'Fish & Aquariums', emoji: '🐟' },
      { id: 'other_pets', name: 'حيوانات أخرى', nameEn: 'Other Pets', emoji: '🐾' },
      { id: 'pet_accessories', name: 'مستلزمات حيوانات', nameEn: 'Pet Accessories', emoji: '🦴' },
    ]
  },
  {
    id: 'sports', name: 'رياضة وترفيه', nameEn: 'Sports & Leisure', emoji: '⚽',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/sports',
    keywords: ['رياضة', 'جيم', 'دراجة', 'سكوتر', 'كرة', 'مضرب', 'سباحة', 'صيد', 'سنارة', 'قصبة', 'شبكة', 'صنارة', 'sport', 'gym', 'bike', 'scooter', 'fishing', 'football', 'tennis'],
    subcategories: [
      { id: 'gym_fitness', name: 'جيم ولياقة', nameEn: 'Gym & Fitness', emoji: '🏋️' },
      { id: 'team_sports', name: 'كرة قدم ورياضات جماعية', nameEn: 'Team Sports', emoji: '⚽' },
      { id: 'outdoor_sports', name: 'رياضات خارجية', nameEn: 'Outdoor Sports', emoji: '🏕️' },
      { id: 'fishing', name: 'صيد وأدواته', nameEn: 'Fishing', emoji: '🎣' },
      { id: 'cycling', name: 'دراجات وسكوتر', nameEn: 'Cycling & Scooters', emoji: '🚲' },
      { id: 'water_sports', name: 'رياضات مائية', nameEn: 'Water Sports', emoji: '🏄' },
      { id: 'sports_clothing', name: 'ملابس رياضية', nameEn: 'Sports Clothing', emoji: '👟' },
    ]
  },
  {
    id: 'kids', name: 'أطفال ومستلزماتهم', nameEn: 'Kids & Baby', emoji: '👶',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/kids',
    keywords: ['طفل', 'أطفال', 'عربية أطفال', 'لعبة', 'مهد', 'سرير أطفال', 'لبس أطفال', 'حفاضات', 'baby', 'kids', 'toy', 'stroller', 'diaper'],
    subcategories: [
      { id: 'toys', name: 'ألعاب أطفال', nameEn: 'Toys', emoji: '🧸' },
      { id: 'baby_gear', name: 'مستلزمات رضع', nameEn: 'Baby Gear', emoji: '🍼' },
      { id: 'kids_furniture', name: 'أثاث أطفال', nameEn: 'Kids Furniture', emoji: '🪑' },
    ]
  },
  {
    id: 'hobbies', name: 'هوايات وترفيه', nameEn: 'Hobbies', emoji: '🎨',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/hobbies',
    keywords: ['كتاب', 'موسيقى', 'جيتار', 'عود', 'ناي', 'تصوير', 'رسم', 'فن', 'كولكشن', 'تحف', 'عملات', 'book', 'music', 'guitar', 'art', 'collection', 'stamp', 'coin'],
    subcategories: [
      { id: 'books', name: 'كتب ومجلات', nameEn: 'Books & Magazines', emoji: '📚' },
      { id: 'music_instruments', name: 'آلات موسيقية', nameEn: 'Musical Instruments', emoji: '🎸' },
      { id: 'photography', name: 'تصوير وإضاءة', nameEn: 'Photography', emoji: '📷' },
      { id: 'art_craft', name: 'فنون وحرف', nameEn: 'Arts & Crafts', emoji: '🎨' },
      { id: 'collectibles', name: 'تحف وأنتيكات', nameEn: 'Collectibles & Antiques', emoji: '🏺' },
    ]
  },
  {
    id: 'agriculture', name: 'زراعة ومواشي', nameEn: 'Agriculture & Livestock', emoji: '🌾',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/agriculture',
    keywords: ['زراعة', 'مواشي', 'أبقار', 'خراف', 'دواجن', 'فراخ', 'بط', 'محصول', 'أرض زراعية', 'معدات زراعة', 'agriculture', 'livestock', 'cattle', 'poultry', 'crops'],
    subcategories: [
      { id: 'livestock', name: 'مواشي وأبقار', nameEn: 'Livestock & Cattle', emoji: '🐄' },
      { id: 'poultry', name: 'دواجن وطيور مزرعة', nameEn: 'Poultry', emoji: '🐔' },
      { id: 'agriculture_equipment', name: 'معدات زراعية', nameEn: 'Agriculture Equipment', emoji: '🚜' },
      { id: 'crops_plants', name: 'محاصيل ونباتات', nameEn: 'Crops & Plants', emoji: '🌱' },
    ]
  },
  {
    id: 'food', name: 'أكل وشرب', nameEn: 'Food & Drinks', emoji: '🍕',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/food',
    keywords: ['أكل', 'طعام', 'طبخ', 'وجبة', 'حلويات', 'مخبز', 'عصير', 'قهوة', 'food', 'meal', 'restaurant', 'sweets', 'bakery', 'juice'],
    subcategories: [
      { id: 'homemade_food', name: 'أكل بيتي وحلويات', nameEn: 'Homemade Food & Sweets', emoji: '🍰' },
      { id: 'restaurant_supplies', name: 'مستلزمات مطاعم', nameEn: 'Restaurant Supplies', emoji: '🍽️' },
      { id: 'food_products', name: 'منتجات غذائية', nameEn: 'Food Products', emoji: '🛒' },
    ]
  },
  {
    id: 'tools', name: 'أدوات ومعدات', nameEn: 'Tools & Equipment', emoji: '🔨',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/tools',
    keywords: ['أداة', 'معدة', 'ماكينة', 'مولد', 'لحام', 'كهرباء', 'سباكة', 'نجارة', 'tool', 'machine', 'generator', 'welding', 'plumbing', 'drill', 'equipment'],
    subcategories: [
      { id: 'power_tools', name: 'أدوات كهربائية', nameEn: 'Power Tools', emoji: '🔌' },
      { id: 'hand_tools', name: 'أدوات يدوية', nameEn: 'Hand Tools', emoji: '🔨' },
      { id: 'industrial', name: 'معدات صناعية', nameEn: 'Industrial Equipment', emoji: '🏭' },
      { id: 'generators', name: 'مولدات وطاقة', nameEn: 'Generators & Energy', emoji: '⚡' },
    ]
  },
  {
    id: 'general', name: 'متفرقات', nameEn: 'General', emoji: '📦',
    imageUrl: 'https://res.cloudinary.com/dni9wcvx3/image/upload/xtox/categories/general',
    keywords: [],
    subcategories: [
      { id: 'other', name: 'أخرى', nameEn: 'Other', emoji: '📦' },
    ]
  },
];

const CATEGORY_MAP = Object.fromEntries(CATEGORIES.map(c => [c.id, c]));

function getCategoryById(id) {
  return CATEGORY_MAP[id] || CATEGORIES.find(c => c.name === id || c.nameEn === id) || null;
}

function getSubcategoryById(categoryId, subcategoryId) {
  const cat = getCategoryById(categoryId);
  return cat?.subcategories?.find(s => s.id === subcategoryId || s.name === subcategoryId || s.nameEn === subcategoryId) || null;
}

export { CATEGORIES, CATEGORY_MAP, getCategoryById, getSubcategoryById };
