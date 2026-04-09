// frontend/lib/productKB.js
// Comprehensive offline product knowledge base for XTOX marketplace
// Maps image recognition results to marketplace fields
//
// PRODUCT_KB indices (0-based) — keep in sync with MOBILENET_LABEL_MAP and KEYWORD_MAP:
//  0  Smartphones          Electronics / MobilePhones
//  1  Feature Phones       Electronics / MobilePhones
//  2  Phone Accessories    Electronics / Accessories
//  3  Laptop               Electronics / Laptops
//  4  Desktop PC           Electronics / Laptops  (no Desktop sub exists)
//  5  Tablet               Electronics / Tablets
//  6  Monitor              Electronics / Accessories
//  7  Computer Accessories Electronics / Accessories
//  8  TV                   Electronics / TVs
//  9  Sound System         Electronics / Audio
// 10  Headphones           Electronics / Audio
// 11  PlayStation          Electronics / Gaming
// 12  Xbox                 Electronics / Gaming
// 13  Nintendo             Electronics / Gaming
// 14  Game Disc            Electronics / Gaming
// 15  Gaming Accessories   Electronics / Gaming
// 16  Camera               Electronics / Cameras
// 17  Camera Lens          Electronics / Cameras
// 18  Action Camera        Electronics / Cameras
// 19  Smartwatch           Electronics / Accessories
// 20  Fitness Band         Electronics / Accessories
// 21  Air Conditioner      General (no Home Appliances top-level cat)
// 22  Washing Machine      General
// 23  Refrigerator         General
// 24  Microwave            General
// 25  Vacuum Cleaner       General
// 26  Fan                  General
// 27  Car                  Vehicles / Cars
// 28  Motorcycle           Vehicles / Motorcycles
// 29  Bicycle              Vehicles (Other)
// 30  Car Parts            Vehicles / SpareParts
// 31  Men's Shirt          Fashion / MensClothing
// 32  Men's Pants          Fashion / MensClothing
// 33  Men's Jacket         Fashion / MensClothing
// 34  Women's Dress        Fashion / WomensClothing
// 35  Women's Abaya        Fashion / WomensClothing
// 36  Sneakers             Fashion / Shoes
// 37  Sandals              Fashion / Shoes
// 38  Formal Shoes         Fashion / Shoes
// 39  Handbag              Fashion / Bags
// 40  Backpack             Fashion / Bags
// 41  Watch (Fashion)      Fashion / Accessories
// 42  Sunglasses           Fashion / Accessories
// 43  Jewelry              Fashion / Accessories
// 44  Sofa                 General
// 45  Bed                  General
// 46  Table                General
// 47  Chair                General
// 48  Wardrobe             General
// 49  Cookware             General
// 50  Blender              General
// 51  Coffee Machine       General
// 52  Wall Clock           General
// 53  Lamp / Lighting      General
// 54  Mirror               General
// 55  Carpet / Rug         General
// 56  Lighter / Igniter    General
// 57  Power Tools          General
// 58  Hand Tools           General
// 59  Gym Equipment        General
// 60  Football / Soccer    General
// 61  (alias → 29 Bicycle)
// 62  Fishing Gear         General
// 63  Pet Supplies         General
// 64  Aquarium / Fish      General
// 65  Books                General
// 66  Musical Instruments  General
// 67  Art Supplies         General

export const PRODUCT_KB = [
  // ─── 0: Smartphones ────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'MobilePhones', subsub: 'Other',
    titleTemplate: 'هاتف ذكي للبيع',
    descTemplate: 'هاتف ذكي بحالة ممتازة — {condition} — يعمل بكفاءة عالية. جميع الملحقات متوفرة.',
    keywords: ['mobile', 'phone', 'iphone', 'samsung', 'galaxy', 'huawei', 'xiaomi', 'oppo', 'vivo', 'realme', 'oneplus', 'pixel', 'motorola', 'جوال', 'هاتف'],
    mobilenetLabels: ['cellular telephone', 'cell phone', 'mobile phone', 'smartphone', 'iphone'],
  },
  // ─── 1: Feature Phones ─────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'MobilePhones', subsub: 'Other',
    titleTemplate: 'هاتف بسيط للبيع',
    descTemplate: 'هاتف بسيط بحالة جيدة — {condition} — يعمل بشكل سليم.',
    keywords: ['nokia 3310', 'keypad phone', 'basic phone', 'feature phone'],
    mobilenetLabels: [],
  },
  // ─── 2: Phone Accessories ──────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Accessories', subsub: 'Chargers',
    titleTemplate: 'إكسسوار هاتف للبيع',
    descTemplate: 'إكسسوار هاتف بحالة ممتازة — {condition}.',
    keywords: ['charger', 'cable', 'phone case', 'screen protector', 'powerbank', 'power bank', 'شاحن', 'كابل', 'باور بانك'],
    mobilenetLabels: [],
  },
  // ─── 3: Laptop ─────────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Laptops', subsub: 'Other',
    titleTemplate: 'لابتوب للبيع',
    descTemplate: 'لابتوب بحالة {condition} — مواصفات ممتازة. يصلح للعمل والدراسة.',
    keywords: ['laptop', 'notebook', 'macbook', 'lenovo', 'dell', 'hp laptop', 'asus', 'acer', 'لابتوب'],
    mobilenetLabels: ['laptop', 'notebook', 'laptop computer', 'powerbook'],
  },
  // ─── 4: Desktop PC ─────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Laptops', subsub: 'Other',
    titleTemplate: 'كمبيوتر مكتبي للبيع',
    descTemplate: 'كمبيوتر مكتبي بحالة {condition} — مواصفات جيدة.',
    keywords: ['desktop', 'tower', 'كمبيوتر مكتبي', 'desktop computer'],
    mobilenetLabels: ['desktop computer', 'personal computer'],
  },
  // ─── 5: Tablet ─────────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Tablets', subsub: 'Other',
    titleTemplate: 'تابلت للبيع',
    descTemplate: 'تابلت بحالة {condition} — شاشة واضحة وأداء سريع.',
    keywords: ['tablet', 'ipad', 'galaxy tab', 'تابلت'],
    mobilenetLabels: ['tablet computer', 'ipad'],
  },
  // ─── 6: Monitor ────────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Accessories', subsub: 'Other',
    titleTemplate: 'شاشة كمبيوتر للبيع',
    descTemplate: 'شاشة كمبيوتر بحالة {condition} — دقة عالية وألوان واضحة.',
    keywords: ['monitor', 'شاشة كمبيوتر', 'pc screen'],
    mobilenetLabels: ['monitor', 'screen', 'display'],
  },
  // ─── 7: Computer Accessories ───────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Accessories', subsub: 'Other',
    titleTemplate: 'إكسسوار كمبيوتر للبيع',
    descTemplate: 'إكسسوار كمبيوتر بحالة {condition}.',
    keywords: ['keyboard', 'mouse', 'usb', 'hard disk', 'ram', 'ssd', 'هارد', 'كيبورد', 'ماوس'],
    mobilenetLabels: [],
  },
  // ─── 8: TV ─────────────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'TVs', subsub: 'SmartTV',
    titleTemplate: 'تلفزيون للبيع',
    descTemplate: 'شاشة تلفزيون بحالة {condition} — دقة عالية — مثالية للمنزل.',
    keywords: ['tv', 'television', 'تلفزيون', 'samsung tv', 'lg tv', 'sony tv', 'smart tv'],
    mobilenetLabels: ['television', 'television set', 'tv', 'television system'],
  },
  // ─── 9: Sound System ───────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Audio', subsub: 'Speakers',
    titleTemplate: 'سبيكر صوت للبيع',
    descTemplate: 'نظام صوت بحالة {condition} — صوت قوي وواضح.',
    keywords: ['speaker', 'sound', 'audio', 'soundbar', 'سبيكر', 'صوت'],
    mobilenetLabels: ['loudspeaker', 'speaker system', 'home theater', 'subwoofer'],
  },
  // ─── 10: Headphones ────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Audio', subsub: 'Headphones',
    titleTemplate: 'سماعات للبيع',
    descTemplate: 'سماعات بحالة {condition} — جودة صوت عالية.',
    keywords: ['headphone', 'earphone', 'airpods', 'earbuds', 'سماعة', 'سماعات', 'إيربودز'],
    mobilenetLabels: ['headphone', 'earphone', 'earbud'],
  },
  // ─── 11: PlayStation ───────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Gaming', subsub: 'PlayStation',
    titleTemplate: 'بلايستيشن للبيع',
    descTemplate: 'جهاز بلايستيشن بحالة {condition} — يعمل بشكل ممتاز.',
    keywords: ['playstation', 'ps5', 'ps4', 'ps3', 'sony gaming', 'بلايستيشن'],
    mobilenetLabels: ['joystick', 'game controller', 'controller'],
  },
  // ─── 12: Xbox ──────────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Gaming', subsub: 'Xbox',
    titleTemplate: 'إكس بوكس للبيع',
    descTemplate: 'جهاز إكس بوكس بحالة {condition} — يعمل بشكل ممتاز.',
    keywords: ['xbox', 'إكس بوكس'],
    mobilenetLabels: [],
  },
  // ─── 13: Nintendo ──────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Gaming', subsub: 'Nintendo',
    titleTemplate: 'نينتندو سويتش للبيع',
    descTemplate: 'جهاز نينتندو بحالة {condition} — يعمل بشكل ممتاز.',
    keywords: ['nintendo', 'switch', 'wii', 'نينتندو'],
    mobilenetLabels: [],
  },
  // ─── 14: Game Disc ─────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Gaming', subsub: 'PCGaming',
    titleTemplate: 'لعبة للبيع',
    descTemplate: 'لعبة بحالة {condition}.',
    keywords: ['game disc', 'game cd', 'لعبة', 'cd game'],
    mobilenetLabels: [],
  },
  // ─── 15: Gaming Accessories ────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Gaming', subsub: 'Other',
    titleTemplate: 'إكسسوار جيمينج للبيع',
    descTemplate: 'إكسسوار جيمينج بحالة {condition}.',
    keywords: ['gaming chair', 'gaming headset', 'دراعة', 'gaming accessory'],
    mobilenetLabels: [],
  },
  // ─── 16: Camera ────────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Cameras', subsub: 'DSLR',
    titleTemplate: 'كاميرا للبيع',
    descTemplate: 'كاميرا رقمية بحالة {condition} — تصوير احترافي.',
    keywords: ['camera', 'كاميرا', 'dslr', 'canon', 'nikon', 'fujifilm', 'sony camera', 'mirrorless'],
    mobilenetLabels: ['camera', 'reflex camera', 'dslr', 'digital camera', 'polaroid camera', 'film camera'],
  },
  // ─── 17: Camera Lens ───────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Cameras', subsub: 'Other',
    titleTemplate: 'عدسة كاميرا للبيع',
    descTemplate: 'عدسة كاميرا بحالة {condition}.',
    keywords: ['lens', 'عدسة', 'camera lens'],
    mobilenetLabels: [],
  },
  // ─── 18: Action Camera ─────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Cameras', subsub: 'Other',
    titleTemplate: 'كاميرا أكشن للبيع',
    descTemplate: 'كاميرا أكشن بحالة {condition}.',
    keywords: ['gopro', 'action camera', 'go pro', 'كاميرا أكشن'],
    mobilenetLabels: [],
  },
  // ─── 19: Smartwatch ────────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Accessories', subsub: 'Other',
    titleTemplate: 'ساعة ذكية للبيع',
    descTemplate: 'ساعة ذكية بحالة {condition}.',
    keywords: ['smartwatch', 'apple watch', 'galaxy watch', 'ساعة ذكية', 'smart watch'],
    mobilenetLabels: ['digital watch', 'smartwatch'],
  },
  // ─── 20: Fitness Band ──────────────────────────────────────────────────────
  {
    category: 'Electronics', subcategory: 'Accessories', subsub: 'Other',
    titleTemplate: 'سوار رياضي ذكي للبيع',
    descTemplate: 'سوار رياضي ذكي بحالة {condition}.',
    keywords: ['fitness band', 'fitness tracker', 'mi band', 'fitbit', 'سوار رياضي'],
    mobilenetLabels: [],
  },
  // ─── 21: Air Conditioner ───────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'مكيف هواء للبيع',
    descTemplate: 'مكيف هواء بحالة {condition} — يبرّد بكفاءة عالية.',
    keywords: ['ac', 'air conditioner', 'تكييف', 'مكيف', 'split unit'],
    mobilenetLabels: ['air conditioner', 'window air conditioner'],
  },
  // ─── 22: Washing Machine ───────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'غسالة ملابس للبيع',
    descTemplate: 'غسالة ملابس بحالة {condition} — تعمل بكفاءة.',
    keywords: ['washing machine', 'غسالة', 'washer'],
    mobilenetLabels: ['washer', 'washing machine'],
  },
  // ─── 23: Refrigerator ──────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'ثلاجة للبيع',
    descTemplate: 'ثلاجة بحالة {condition} — تعمل بكفاءة عالية.',
    keywords: ['fridge', 'refrigerator', 'ثلاجة'],
    mobilenetLabels: ['refrigerator', 'fridge', 'electric refrigerator'],
  },
  // ─── 24: Microwave ─────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'ميكروويف للبيع',
    descTemplate: 'ميكروويف بحالة {condition}.',
    keywords: ['microwave', 'ميكروويف'],
    mobilenetLabels: ['microwave', 'microwave oven'],
  },
  // ─── 25: Vacuum Cleaner ────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'مكنسة كهربائية للبيع',
    descTemplate: 'مكنسة كهربائية بحالة {condition}.',
    keywords: ['vacuum', 'vacuum cleaner', 'مكنسة'],
    mobilenetLabels: ['vacuum', 'vacuum cleaner'],
  },
  // ─── 26: Fan ───────────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'مروحة للبيع',
    descTemplate: 'مروحة بحالة {condition}.',
    keywords: ['fan', 'مروحة'],
    mobilenetLabels: ['electric fan', 'ceiling fan', 'pedestal fan'],
  },
  // ─── 27: Car ───────────────────────────────────────────────────────────────
  {
    category: 'Vehicles', subcategory: 'Cars', subsub: 'Sedan',
    titleTemplate: 'سيارة للبيع',
    descTemplate: 'سيارة بحالة {condition} — تسير بشكل ممتاز. جميع الأوراق متوفرة.',
    keywords: ['car', 'سيارة', 'toyota', 'hyundai', 'kia', 'bmw', 'mercedes', 'honda', 'nissan', 'mazda', 'chevrolet', 'سيارات'],
    mobilenetLabels: ['car', 'automobile', 'motor vehicle', 'sports car', 'race car', 'convertible', 'suv', 'limousine', 'minivan', 'pickup truck'],
  },
  // ─── 28: Motorcycle ────────────────────────────────────────────────────────
  {
    category: 'Vehicles', subcategory: 'Motorcycles', subsub: 'Other',
    titleTemplate: 'دراجة نارية للبيع',
    descTemplate: 'دراجة نارية بحالة {condition}.',
    keywords: ['motorcycle', 'motorbike', 'موتو', 'دراجة نارية', 'scooter', 'سكوتر'],
    mobilenetLabels: ['motorcycle', 'motorbike', 'moped', 'scooter'],
  },
  // ─── 29: Bicycle ───────────────────────────────────────────────────────────
  {
    category: 'Vehicles', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'دراجة هوائية للبيع',
    descTemplate: 'دراجة هوائية بحالة {condition}.',
    keywords: ['bicycle', 'bike', 'دراجة هوائية', 'bmx'],
    mobilenetLabels: ['bicycle', 'mountain bike', 'bike'],
  },
  // ─── 30: Car Parts ─────────────────────────────────────────────────────────
  {
    category: 'Vehicles', subcategory: 'SpareParts', subsub: 'Other',
    titleTemplate: 'قطعة غيار سيارة للبيع',
    descTemplate: 'قطعة غيار سيارة بحالة {condition}.',
    keywords: ['tire', 'tyre', 'wheel', 'car battery', 'exhaust', 'قطع غيار'],
    mobilenetLabels: [],
  },
  // ─── 31: Men's Shirt ───────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'MensClothing', subsub: 'Casual',
    titleTemplate: 'قميص رجالي للبيع',
    descTemplate: 'قميص رجالي بحالة {condition}.',
    keywords: ['shirt', 'تيشيرت', 'قميص', 'polo'],
    mobilenetLabels: ['shirt', 'jersey', 't-shirt', 'polo shirt'],
  },
  // ─── 32: Men's Pants ───────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'MensClothing', subsub: 'Casual',
    titleTemplate: 'بنطلون رجالي للبيع',
    descTemplate: 'بنطلون رجالي بحالة {condition}.',
    keywords: ['pants', 'jeans', 'بنطلون', 'trousers'],
    mobilenetLabels: ['jean', 'trousers', 'pants', 'jeans'],
  },
  // ─── 33: Men's Jacket ──────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'MensClothing', subsub: 'Casual',
    titleTemplate: 'جاكت للبيع',
    descTemplate: 'جاكت بحالة {condition}.',
    keywords: ['jacket', 'coat', 'جاكت', 'معطف'],
    mobilenetLabels: ['jacket', 'coat', 'overcoat', 'windbreaker'],
  },
  // ─── 34: Women's Dress ─────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'WomensClothing', subsub: 'Dresses',
    titleTemplate: 'فستان للبيع',
    descTemplate: 'فستان أنيق بحالة {condition}.',
    keywords: ['dress', 'فستان', 'gown'],
    mobilenetLabels: ['gown', 'evening gown', 'bridal gown', 'kimono'],
  },
  // ─── 35: Women's Abaya ─────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'WomensClothing', subsub: 'Abayas',
    titleTemplate: 'عباية للبيع',
    descTemplate: 'عباية بحالة {condition}.',
    keywords: ['abaya', 'عباية', 'جلباب', 'hijab'],
    mobilenetLabels: [],
  },
  // ─── 36: Sneakers ──────────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'Shoes', subsub: 'Sneakers',
    titleTemplate: 'حذاء رياضي للبيع',
    descTemplate: 'حذاء رياضي بحالة {condition} — ماركة أصلية.',
    keywords: ['shoes', 'sneakers', 'nike', 'adidas', 'puma', 'حذاء', 'كوتشي', 'رياضي', 'كروس'],
    mobilenetLabels: ['sneaker', 'running shoe', 'athletic shoe', 'tennis shoe', 'loafer', 'moccasin', 'clog', 'shoe'],
  },
  // ─── 37: Sandals ───────────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'Shoes', subsub: 'Sandals',
    titleTemplate: 'صندل للبيع',
    descTemplate: 'صندل بحالة {condition}.',
    keywords: ['sandal', 'صندل', 'شبشب', 'flip flop', 'flipflop'],
    mobilenetLabels: ['sandal', 'flip-flop', 'thong'],
  },
  // ─── 38: Formal Shoes ──────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'Shoes', subsub: 'Formal',
    titleTemplate: 'حذاء رسمي للبيع',
    descTemplate: 'حذاء رسمي بحالة {condition}.',
    keywords: ['formal shoe', 'formal shoes', 'جزمة', 'boot', 'كعب', 'oxford'],
    mobilenetLabels: ['oxford shoe', 'boot', 'cowboy boot', 'high heel'],
  },
  // ─── 39: Handbag ───────────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'Bags', subsub: 'Handbag',
    titleTemplate: 'حقيبة يد للبيع',
    descTemplate: 'حقيبة يد بحالة {condition}.',
    keywords: ['bag', 'handbag', 'شنطة', 'حقيبة', 'purse'],
    mobilenetLabels: ['handbag', 'purse', 'clutch bag', 'bag'],
  },
  // ─── 40: Backpack ──────────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'Bags', subsub: 'Backpack',
    titleTemplate: 'حقيبة ظهر للبيع',
    descTemplate: 'حقيبة ظهر بحالة {condition}.',
    keywords: ['backpack', 'شنطة ظهر', 'ظهر'],
    mobilenetLabels: ['backpack', 'knapsack', 'rucksack'],
  },
  // ─── 41: Watch (Fashion) ───────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'Accessories', subsub: 'Watches',
    titleTemplate: 'ساعة يد للبيع',
    descTemplate: 'ساعة يد بحالة {condition}.',
    keywords: ['watch', 'ساعة', 'casio', 'rolex', 'omega', 'fossil', 'wristwatch'],
    mobilenetLabels: ['wristwatch', 'analog clock'],
  },
  // ─── 42: Sunglasses ────────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'Accessories', subsub: 'Sunglasses',
    titleTemplate: 'نظارة شمسية للبيع',
    descTemplate: 'نظارة شمسية بحالة {condition}.',
    keywords: ['sunglasses', 'نظارة شمسية', 'نظارات', 'glasses'],
    mobilenetLabels: ['sunglasses', 'glasses', 'spectacles'],
  },
  // ─── 43: Jewelry ───────────────────────────────────────────────────────────
  {
    category: 'Fashion', subcategory: 'Accessories', subsub: 'Jewelry',
    titleTemplate: 'مجوهرات للبيع',
    descTemplate: 'مجوهرات بحالة {condition}.',
    keywords: ['gold', 'ذهب', 'فضة', 'خاتم', 'سوار', 'عقد', 'حلق', 'jewelry'],
    mobilenetLabels: ['necklace', 'ring', 'bracelet', 'earring', 'pendant'],
  },
  // ─── 44: Sofa ──────────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'كنبة للبيع',
    descTemplate: 'كنبة بحالة {condition} — مريحة ونظيفة.',
    keywords: ['sofa', 'couch', 'كنبة', 'أريكة', 'انتريه'],
    mobilenetLabels: ['sofa', 'couch', 'studio couch', 'loveseat'],
  },
  // ─── 45: Bed ───────────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'سرير للبيع',
    descTemplate: 'سرير بحالة {condition}.',
    keywords: ['bed', 'سرير', 'mattress', 'مرتبة'],
    mobilenetLabels: ['bed', 'double bed', 'four-poster bed', 'bunk bed', 'crib'],
  },
  // ─── 46: Table ─────────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'طاولة للبيع',
    descTemplate: 'طاولة بحالة {condition}.',
    keywords: ['table', 'طاولة', 'مكتب', 'desk'],
    mobilenetLabels: ['dining table', 'table', 'coffee table', 'desk'],
  },
  // ─── 47: Chair ─────────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'كرسي للبيع',
    descTemplate: 'كرسي بحالة {condition} — مريح.',
    keywords: ['chair', 'كرسي'],
    mobilenetLabels: ['chair', 'rocking chair', 'folding chair', 'office chair'],
  },
  // ─── 48: Wardrobe ──────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'دولاب ملابس للبيع',
    descTemplate: 'دولاب ملابس بحالة {condition}.',
    keywords: ['wardrobe', 'دولاب', 'خزانة', 'closet'],
    mobilenetLabels: ['wardrobe', 'cabinet', 'closet'],
  },
  // ─── 49: Cookware ──────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'أواني طبخ للبيع',
    descTemplate: 'أواني طبخ بحالة {condition}.',
    keywords: ['pan', 'pot', 'طنجرة', 'مقلاة', 'cookware'],
    mobilenetLabels: ['frying pan', 'pot', 'wok', 'pressure cooker', 'saucepan'],
  },
  // ─── 50: Blender ───────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'خلاط كهربائي للبيع',
    descTemplate: 'خلاط كهربائي بحالة {condition}.',
    keywords: ['blender', 'خلاط', 'عصارة', 'mixer'],
    mobilenetLabels: ['blender', 'mixer', 'food processor'],
  },
  // ─── 51: Coffee Machine ────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'ماكينة قهوة للبيع',
    descTemplate: 'ماكينة قهوة بحالة {condition}.',
    keywords: ['coffee machine', 'ماكينة قهوة', 'nespresso', 'espresso'],
    mobilenetLabels: ['coffee maker', 'espresso machine', 'coffeemaker'],
  },
  // ─── 52: Wall Clock ────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'ساعة حائط للبيع',
    descTemplate: 'ساعة حائط بحالة {condition} — تعمل بشكل ممتاز.',
    keywords: ['clock', 'wall clock', 'ساعة حائط', 'ساعة مكتب'],
    mobilenetLabels: ['digital clock', 'wall clock', 'stopwatch', 'sundial', 'clock'],
  },
  // ─── 53: Lamp / Lighting ───────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'إضاءة للبيع',
    descTemplate: 'إضاءة بحالة {condition} — تعمل بشكل ممتاز.',
    keywords: ['lamp', 'لمبة', 'إضاءة', 'نجفة', 'lighting'],
    mobilenetLabels: ['table lamp', 'floor lamp', 'lampshade', 'light bulb', 'torch'],
  },
  // ─── 54: Mirror ────────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'مرآة للبيع',
    descTemplate: 'مرآة بحالة {condition}.',
    keywords: ['mirror', 'مرآة'],
    mobilenetLabels: ['mirror'],
  },
  // ─── 55: Carpet ────────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'سجادة للبيع',
    descTemplate: 'سجادة بحالة {condition}.',
    keywords: ['carpet', 'rug', 'سجادة', 'موكيت'],
    mobilenetLabels: ['carpet', 'rug', 'prayer rug'],
  },
  // ─── 56: Lighter / Igniter ─────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'ولاعة للبيع',
    descTemplate: 'ولاعة بحالة ممتازة.',
    keywords: ['lighter', 'igniter', 'ولاعة', 'zippo'],
    mobilenetLabels: ['lighter', 'light', 'igniter', 'ignitor', 'cigarette lighter', 'zippo lighter', 'fire'],
  },
  // ─── 57: Power Tools ───────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'أدوات كهربائية للبيع',
    descTemplate: 'أدوات كهربائية بحالة {condition}.',
    keywords: ['drill', 'مثقاب', 'مطرقة', 'power tool', 'chainsaw'],
    mobilenetLabels: ['power drill', 'chain saw', 'hammer'],
  },
  // ─── 58: Hand Tools ────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'أدوات يدوية للبيع',
    descTemplate: 'أدوات يدوية بحالة {condition}.',
    keywords: ['wrench', 'مفتاح', 'screwdriver', 'pliers'],
    mobilenetLabels: ['wrench', 'pliers', 'screwdriver'],
  },
  // ─── 59: Gym Equipment ─────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'معدات رياضية للبيع',
    descTemplate: 'معدات رياضية بحالة {condition}.',
    keywords: ['dumbbell', 'gym', 'تمارين', 'عدة رياضة', 'جيم', 'barbell', 'treadmill'],
    mobilenetLabels: ['dumbbell', 'barbell', 'weight', 'treadmill', 'exercise equipment'],
  },
  // ─── 60: Football / Soccer ─────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'كرة قدم للبيع',
    descTemplate: 'كرة قدم بحالة {condition}.',
    keywords: ['football', 'soccer', 'كرة قدم', 'ball'],
    mobilenetLabels: ['soccer ball', 'football'],
  },
  // ─── 61: (alias — same as 29 Bicycle, kept for KEYWORD_MAP completeness) ───
  {
    category: 'Vehicles', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'دراجة هوائية للبيع',
    descTemplate: 'دراجة هوائية بحالة {condition}.',
    keywords: [],
    mobilenetLabels: [],
  },
  // ─── 62: Fishing Gear ──────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'أدوات صيد للبيع',
    descTemplate: 'أدوات صيد بحالة {condition}.',
    keywords: ['fishing', 'صنارة', 'صيد', 'fishing rod'],
    mobilenetLabels: ['fishing rod'],
  },
  // ─── 63: Pet Supplies ──────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'مستلزمات حيوانات أليفة للبيع',
    descTemplate: 'مستلزمات حيوانات أليفة بحالة {condition}.',
    keywords: ['pet', 'قطة', 'كلب', 'cat food', 'dog food', 'هريرة', 'pet supplies'],
    mobilenetLabels: ['cat', 'dog', 'kitten', 'puppy'],
  },
  // ─── 64: Aquarium / Fish ───────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'حوض سمك للبيع',
    descTemplate: 'حوض سمك بحالة {condition}.',
    keywords: ['aquarium', 'حوض سمك', 'fish tank'],
    mobilenetLabels: ['aquarium', 'fish', 'goldfish'],
  },
  // ─── 65: Books ─────────────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'كتاب للبيع',
    descTemplate: 'كتاب بحالة {condition} — محتوى قيم.',
    keywords: ['book', 'كتاب', 'novel', 'كتب', 'textbook'],
    mobilenetLabels: ['book', 'novel', 'textbook'],
  },
  // ─── 66: Musical Instruments ───────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'آلة موسيقية للبيع',
    descTemplate: 'آلة موسيقية بحالة {condition}.',
    keywords: ['guitar', 'piano', 'جيتار', 'بيانو', 'عود', 'طبلة', 'violin'],
    mobilenetLabels: ['guitar', 'piano', 'violin', 'drum', 'keyboard instrument'],
  },
  // ─── 67: Art Supplies ──────────────────────────────────────────────────────
  {
    category: 'General', subcategory: 'Other', subsub: 'Other',
    titleTemplate: 'أدوات رسم وفن للبيع',
    descTemplate: 'أدوات رسم وفن بحالة {condition}.',
    keywords: ['art', 'paint', 'رسم', 'فرشاة', 'paintbrush'],
    mobilenetLabels: ['paintbrush', 'palette'],
  },
];

// ─── MobileNet ImageNet label → KB index fast lookup ─────────────────────────
// MobileNet returns comma-separated label strings — split and lower-case before lookup
export const MOBILENET_LABEL_MAP = {
  // Smartphones (0)
  'cellular telephone': 0, 'cell phone': 0, 'mobile phone': 0, 'smartphone': 0, 'iphone': 0,

  // Laptop (3)
  'laptop': 3, 'notebook': 3, 'laptop computer': 3, 'powerbook': 3,

  // Desktop PC (4)
  'desktop computer': 4, 'personal computer': 4,

  // Tablet (5)
  'tablet computer': 5, 'ipad': 5,

  // Monitor (6)
  'monitor': 6, 'screen': 6, 'display': 6,

  // TV (8)
  'television': 8, 'television set': 8, 'tv': 8, 'television system': 8,

  // Sound System (9)
  'loudspeaker': 9, 'speaker system': 9, 'home theater': 9, 'subwoofer': 9,

  // Headphones (10)
  'headphone': 10, 'earphone': 10, 'earbud': 10,

  // PlayStation / Gaming (11)
  'joystick': 11, 'game controller': 11, 'controller': 11,

  // Camera (16)
  'camera': 16, 'reflex camera': 16, 'dslr': 16, 'digital camera': 16,
  'polaroid camera': 16, 'film camera': 16,

  // Smartwatch (19)
  'digital watch': 19, 'smartwatch': 19,

  // Air Conditioner (21)
  'air conditioner': 21, 'window air conditioner': 21,

  // Washing Machine (22)
  'washer': 22, 'washing machine': 22,

  // Refrigerator (23)
  'refrigerator': 23, 'fridge': 23, 'electric refrigerator': 23,

  // Microwave (24)
  'microwave': 24, 'microwave oven': 24,

  // Vacuum (25)
  'vacuum': 25, 'vacuum cleaner': 25,

  // Fan (26)
  'electric fan': 26, 'ceiling fan': 26, 'pedestal fan': 26,

  // Car (27)
  'car': 27, 'automobile': 27, 'motor vehicle': 27, 'sports car': 27,
  'race car': 27, 'convertible': 27, 'suv': 27, 'limousine': 27,
  'minivan': 27, 'pickup truck': 27,

  // Motorcycle (28)
  'motorcycle': 28, 'motorbike': 28, 'moped': 28, 'scooter': 28,

  // Bicycle (29)
  'bicycle': 29, 'mountain bike': 29, 'bike': 29,

  // Men's Shirt (31)
  'shirt': 31, 'jersey': 31, 't-shirt': 31, 'polo shirt': 31,

  // Men's Pants (32)
  'jean': 32, 'trousers': 32, 'pants': 32, 'jeans': 32,

  // Men's Jacket (33)
  'jacket': 33, 'coat': 33, 'overcoat': 33, 'windbreaker': 33,

  // Women's Dress (34)
  'gown': 34, 'evening gown': 34, 'bridal gown': 34, 'kimono': 34,

  // Sneakers (36)
  'sneaker': 36, 'running shoe': 36, 'athletic shoe': 36, 'tennis shoe': 36,
  'loafer': 36, 'moccasin': 36, 'clog': 36, 'shoe': 36,

  // Sandals (37)
  'sandal': 37, 'flip-flop': 37, 'thong': 37,

  // Formal Shoes (38)
  'oxford shoe': 38, 'boot': 38, 'cowboy boot': 38, 'high heel': 38,

  // Handbag (39)
  'handbag': 39, 'purse': 39, 'clutch bag': 39, 'bag': 39,

  // Backpack (40)
  'backpack': 40, 'knapsack': 40, 'rucksack': 40,

  // Watch / Fashion (41)
  'wristwatch': 41,

  // Sunglasses (42)
  'sunglasses': 42, 'glasses': 42, 'spectacles': 42,

  // Jewelry (43)
  'necklace': 43, 'ring': 43, 'bracelet': 43, 'earring': 43, 'pendant': 43,

  // Sofa (44)
  'sofa': 44, 'couch': 44, 'studio couch': 44, 'loveseat': 44,

  // Bed (45)
  'bed': 45, 'double bed': 45, 'four-poster bed': 45, 'bunk bed': 45, 'crib': 45,

  // Table (46)
  'dining table': 46, 'table': 46, 'coffee table': 46, 'desk': 46,

  // Chair (47)
  'chair': 47, 'rocking chair': 47, 'folding chair': 47, 'office chair': 47,

  // Wardrobe (48)
  'wardrobe': 48, 'cabinet': 48, 'closet': 48,

  // Cookware (49)
  'frying pan': 49, 'pot': 49, 'wok': 49, 'pressure cooker': 49, 'saucepan': 49,

  // Blender (50)
  'blender': 50, 'mixer': 50, 'food processor': 50,

  // Coffee Machine (51)
  'coffee maker': 51, 'espresso machine': 51, 'coffeemaker': 51,

  // Wall Clock (52) — note: 'analog clock' alone can map to watch (41) below;
  // 'wall clock' / 'digital clock' map to clock (52)
  'digital clock': 52, 'wall clock': 52, 'stopwatch': 52, 'sundial': 52, 'clock': 52,
  'analog clock': 41,  // wrist analog → fashion watch

  // Lamp (53)
  'table lamp': 53, 'floor lamp': 53, 'lampshade': 53, 'light bulb': 53, 'torch': 53,

  // Mirror (54)
  'mirror': 54,

  // Carpet (55)
  'carpet': 55, 'rug': 55, 'prayer rug': 55,

  // Lighter / Igniter (56) — CRITICAL: must be correct
  'lighter': 56, 'light': 56, 'igniter': 56, 'ignitor': 56,
  'cigarette lighter': 56, 'zippo lighter': 56, 'fire': 56,

  // Power Tools (57)
  'power drill': 57, 'chain saw': 57, 'hammer': 57,

  // Hand Tools (58)
  'wrench': 58, 'pliers': 58, 'screwdriver': 58,

  // Gym Equipment (59)
  'dumbbell': 59, 'barbell': 59, 'weight': 59, 'treadmill': 59, 'exercise equipment': 59,

  // Football / Soccer (60)
  'soccer ball': 60, 'football': 60,

  // Fishing (62)
  'fishing rod': 62,

  // Pet Supplies (63)
  'cat': 63, 'dog': 63, 'kitten': 63, 'puppy': 63,

  // Aquarium (64)
  'aquarium': 64, 'fish': 64, 'goldfish': 64,

  // Books (65)
  'book': 65, 'novel': 65, 'textbook': 65,

  // Musical Instruments (66)
  'guitar': 66, 'piano': 66, 'violin': 66, 'drum': 66, 'keyboard instrument': 66,

  // Art Supplies (67)
  'paintbrush': 67, 'palette': 67,
};

// ─── Keyword → KB index fast lookup (for title/filename-based matching) ────────
// Keys must be lowercase. Checked via String.includes(), longest first for priority.
export const KEYWORD_MAP = {
  // Smartphones (0) — order: specific brands first
  'iphone': 0, 'samsung galaxy': 0, 'galaxy s': 0, 'galaxy a': 0,
  'huawei p': 0, 'xiaomi': 0, 'oppo': 0, 'vivo': 0, 'realme': 0,
  'oneplus': 0, 'google pixel': 0, 'motorola': 0,
  'هاتف ذكي': 0, 'جوال': 0,

  // Feature phones (1)
  'nokia 3310': 1, 'keypad phone': 1, 'basic phone': 1, 'feature phone': 1,

  // Phone Accessories (2)
  'screen protector': 2, 'power bank': 2, 'powerbank': 2, 'phone case': 2,
  'شاحن': 2, 'باور بانك': 2,

  // Laptop (3)
  'macbook': 3, 'lenovo': 3, 'dell xps': 3, 'asus rog': 3, 'acer': 3,
  'hp laptop': 3, 'gaming laptop': 3, 'لابتوب': 3,

  // Desktop (4)
  'desktop': 4, 'كمبيوتر مكتبي': 4, 'tower pc': 4,

  // Tablet (5)
  'ipad': 5, 'galaxy tab': 5, 'تابلت': 5,

  // Monitor (6)
  'شاشة كمبيوتر': 6,

  // Computer Accessories (7)
  'keyboard': 7, 'كيبورد': 7, 'gaming mouse': 7, 'hard disk': 7, 'هارد ديسك': 7,
  'ssd': 7, 'ram': 7,

  // TV (8)
  'تلفزيون': 8, 'samsung tv': 8, 'lg tv': 8, 'sony tv': 8, 'smart tv': 8,
  'شاشة تلفاز': 8,

  // Sound System (9)
  'soundbar': 9, 'سبيكر': 9, 'home theater': 9,

  // Headphones (10)
  'airpods': 10, 'سماعات': 10, 'سماعة': 10, 'إيربودز': 10, 'earbuds': 10,
  'headphones': 10,

  // PlayStation (11)
  'playstation': 11, 'ps5': 11, 'ps4': 11, 'ps3': 11, 'بلايستيشن': 11,

  // Xbox (12)
  'xbox': 12, 'إكس بوكس': 12,

  // Nintendo (13)
  'nintendo': 13, 'نينتندو': 13, 'nintendo switch': 13,

  // Game disc (14)
  'game disc': 14, 'لعبة ps': 14, 'لعبة xbox': 14,

  // Gaming accessories (15)
  'gaming chair': 15, 'دراعة': 15, 'gaming headset': 15,

  // Camera (16)
  'dslr': 16, 'كاميرا': 16, 'canon eos': 16, 'nikon d': 16, 'sony alpha': 16,
  'fujifilm': 16,

  // Lens (17)
  'عدسة': 17, 'camera lens': 17, 'lens 50mm': 17,

  // Action Camera (18)
  'gopro': 18, 'action camera': 18, 'go pro': 18,

  // Smartwatch (19)
  'apple watch': 19, 'galaxy watch': 19, 'ساعة ذكية': 19, 'smart watch': 19,
  'smartwatch': 19,

  // Fitness Band (20)
  'fitness band': 20, 'mi band': 20, 'fitbit': 20, 'سوار رياضي': 20,

  // AC (21)
  'تكييف': 21, 'مكيف': 21, 'split unit': 21, 'air conditioner': 21,

  // Washing Machine (22)
  'غسالة': 22, 'washing machine': 22,

  // Fridge (23)
  'ثلاجة': 23, 'refrigerator': 23,

  // Microwave (24)
  'ميكروويف': 24, 'microwave': 24,

  // Vacuum (25)
  'مكنسة': 25, 'vacuum cleaner': 25,

  // Fan (26)
  'مروحة': 26, 'ceiling fan': 26,

  // Car (27)
  'سيارة': 27, 'toyota': 27, 'hyundai': 27, 'kia': 27, 'bmw': 27,
  'mercedes': 27, 'honda civic': 27, 'nissan': 27, 'mazda': 27, 'chevrolet': 27,

  // Motorcycle (28)
  'دراجة نارية': 28, 'موتو': 28, 'scooter': 28, 'motorbike': 28,

  // Bicycle (29)
  'دراجة هوائية': 29, 'bicycle': 29, 'bmx': 29,

  // Car Parts (30)
  'قطع غيار': 30, 'tyre': 30, 'tire': 30, 'car battery': 30,

  // Men's Shirts (31)
  'تيشيرت': 31, 'قميص': 31, 'polo shirt': 31,

  // Men's Pants (32)
  'بنطلون': 32, 'jeans': 32,

  // Jacket (33)
  'جاكت': 33, 'معطف': 33,

  // Dress (34)
  'فستان': 34,

  // Abaya (35)
  'عباية': 35, 'جلباب': 35, 'hijab': 35, 'abaya': 35,

  // Sneakers (36)
  'nike': 36, 'adidas': 36, 'puma': 36, 'كوتشي': 36, 'sneakers': 36,
  'حذاء رياضي': 36, 'running shoes': 36,

  // Sandals (37)
  'صندل': 37, 'شبشب': 37, 'flip flop': 37, 'sandals': 37,

  // Formal shoes (38)
  'جزمة': 38, 'كعب': 38, 'formal shoes': 38, 'oxford': 38,

  // Handbag (39)
  'حقيبة يد': 39, 'شنطة يد': 39, 'handbag': 39,

  // Backpack (40)
  'شنطة ظهر': 40, 'backpack': 40,

  // Watch Fashion (41)
  'rolex': 41, 'casio': 41, 'omega': 41, 'fossil': 41, 'ساعة يد': 41,

  // Sunglasses (42)
  'نظارة شمسية': 42, 'نظارات': 42, 'sunglasses': 42,

  // Jewelry (43)
  'ذهب': 43, 'فضة': 43, 'خاتم': 43, 'سوار ذهب': 43, 'عقد': 43,
  'مجوهرات': 43,

  // Sofa (44)
  'كنبة': 44, 'أريكة': 44, 'انتريه': 44, 'sofa': 44,

  // Bed (45)
  'سرير': 45, 'مرتبة': 45, 'mattress': 45,

  // Table (46)
  'طاولة': 46,

  // Chair (47)
  'كرسي': 47,

  // Wardrobe (48)
  'دولاب': 48, 'خزانة ملابس': 48, 'wardrobe': 48,

  // Cookware (49)
  'طنجرة': 49, 'مقلاة': 49,

  // Blender (50)
  'خلاط': 50, 'عصارة': 50, 'blender': 50,

  // Coffee Machine (51)
  'ماكينة قهوة': 51, 'nespresso': 51, 'espresso machine': 51,

  // Clock (52)
  'ساعة حائط': 52, 'wall clock': 52, 'ساعة مكتب': 52,

  // Lamp (53)
  'نجفة': 53, 'إضاءة': 53, 'لمبة': 53,

  // Mirror (54)
  'مرآة': 54,

  // Carpet (55)
  'سجادة': 55, 'موكيت': 55, 'carpet': 55,

  // Lighter (56)
  'ولاعة': 56, 'lighter': 56, 'zippo': 56,

  // Power Tools (57)
  'مثقاب': 57, 'مطرقة': 57, 'drill': 57, 'power drill': 57,

  // Hand Tools (58)
  'مفتاح ربط': 58, 'wrench': 58, 'screwdriver': 58,

  // Gym (59)
  'دمبل': 59, 'جيم': 59, 'treadmill': 59, 'dumbbell': 59,

  // Football (60)
  'كرة قدم': 60, 'football': 60, 'soccer ball': 60,

  // Fishing (62)
  'صنارة': 62, 'صيد': 62,

  // Pets (63)
  'قطة': 63, 'كلب': 63, 'هريرة': 63, 'pet food': 63,

  // Aquarium (64)
  'حوض سمك': 64, 'aquarium': 64,

  // Books (65)
  'كتاب': 65, 'كتب': 65,

  // Musical Instruments (66)
  'جيتار': 66, 'بيانو': 66, 'عود': 66, 'طبلة': 66, 'guitar': 66,

  // Art Supplies (67)
  'فرشاة رسم': 67, 'رسم': 67,
};
