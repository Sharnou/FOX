// Powerful offline analyzer — no API needed
// Covers Egyptian, Gulf, Levantine, Moroccan Arabic + English

const CATEGORY_RULES = [
  {
    main: 'Electronics', sub: 'Mobiles',
    keywords: ['موبايل','تليفون','هاتف','جوال','آيفون','ايفون','سامسونج','شاومي','هواوي','اوبو','فيفو','ريلمي','نوكيا','تكنو','إنفينكس','iphone','samsung','xiaomi','huawei','oppo','vivo','realme','nokia','tecno','infinix','phone','mobile','smartphone','redmi','oneplus','pixel','motorola','جالكسي','galaxy'],
    priceRange: [500, 25000], currency: 'EGP'
  },
  {
    main: 'Electronics', sub: 'Laptops',
    keywords: ['لابتوب','لاب توب','حاسوب محمول','كمبيوتر محمول','ماك بوك','ديل','اتش بي','لينوفو','آسوس','اكر','laptop','notebook','dell','hp','lenovo','asus','acer','macbook','gaming','كور اي','core i'],
    priceRange: [3000, 60000]
  },
  {
    main: 'Electronics', sub: 'TVs',
    keywords: ['تلفزيون','تليفزيون','شاشة تلفزيون','سمارت تي في','هيسنس','ال جي','سوني تلفزيون','samsung tv','lg tv','hisense','tv','television','smart tv','4k','oled','qled','شاشة عرض'],
    priceRange: [2000, 40000]
  },
  {
    main: 'Electronics', sub: 'Tablets',
    keywords: ['تابلت','تاب','آيباد','ايباد','ipad','tablet','samsung tab','lenovo tab','هواوي تاب'],
    priceRange: [1000, 20000]
  },
  {
    main: 'Electronics', sub: 'Cameras',
    keywords: ['كاميرا','كميرا','camera','canon','nikon','sony alpha','gopro','dslr','mirrorless','كاميرا مراقبة','تصوير'],
    priceRange: [500, 30000]
  },
  {
    main: 'Electronics', sub: 'Audio',
    keywords: ['سماعة','سماعات','هيدفون','اير بودز','airpods','headphone','headset','speaker','مكبر صوت','بلوتوث'],
    priceRange: [100, 5000]
  },
  {
    main: 'Vehicles', sub: 'Cars',
    keywords: ['سيارة','عربية','عربيه','سيارات','تويوتا','هيونداي','كيا','نيسان','بي ام','مرسيدس','شيفروليه','فيات','رينو','هوندا','مازدا','فورد','بيجو','سيتروين','اوبل','car','toyota','hyundai','kia','nissan','bmw','mercedes','chevrolet','fiat','renault','honda','mazda','ford','peugeot','citroen','opel','سكودا','سوزوكي'],
    priceRange: [15000, 800000]
  },
  {
    main: 'Vehicles', sub: 'Motorcycles',
    keywords: ['موتوسيكل','دراجة نارية','موتو','موتسيكل','عجلة','motorcycle','bike','scooter','vespa'],
    priceRange: [3000, 80000]
  },
  {
    main: 'Real Estate', sub: 'Apartments',
    keywords: ['شقة','شقه','للايجار','للبيع','عقار','اپارتمان','apartment','flat','rent','villa','منزل','بيت','دوبلكس','بنتهاوس','استوديو','روف','شاليه','فيلا','دور','طابق','وحدة سكنية'],
    priceRange: [50000, 10000000]
  },
  {
    main: 'Fashion', sub: 'Clothing',
    keywords: ['ملابس','فستان','بلوزة','طقم','جاكيت','جاكت','كوتش','احذية','حذاء','شنطة','حقيبة','اكسسوار','ساعة','نظارة','clothes','dress','shoes','bag','fashion','shirt','pants','jacket','watch','sunglasses','accessory'],
    priceRange: [50, 8000]
  },
  {
    main: 'Jobs', sub: 'Full-time',
    keywords: ['وظيفة','شغل','عمل','مطلوب','توظيف','vacancy','job','hiring','نفر','عمال','كاشير','سكرتيرة','محاسب','مهندس','مبيعات','سائق','طباخ','required','wanted'],
    priceRange: [2000, 20000]
  },
  {
    main: 'Services', sub: 'Home Services',
    keywords: ['سباك','كهربائي','نجار','بويا','نقل عفش','تكييف','صيانة','نظافة','تنظيف','ترميم','دهان','سيراميك','بلاط','plumber','electrician','carpenter','painter','cleaning','maintenance','ac repair'],
    priceRange: [100, 10000]
  },
  {
    main: 'Supermarket', sub: 'Food',
    keywords: ['بقالة','سوبرماركت','مواد غذائية','اكل','طعام','خضروات','فاكهة','لحم','دجاج','منتجات','groceries','food','supermarket','vegetables','fruits'],
    priceRange: [10, 1000]
  },
  {
    main: 'Pharmacy', sub: 'Medicine',
    keywords: ['دواء','دوا','صيدلية','علاج','مكمل غذائي','فيتامين','medicine','pharmacy','supplement','vitamins','medical','كريم','مرهم'],
    priceRange: [20, 3000]
  },
  {
    main: 'Fast Food', sub: 'Restaurant',
    keywords: ['مطعم','اكل','وجبة','بيتزا','برجر','كشري','فول','طعمية','سندوتش','restaurant','pizza','burger','food delivery','كفتة','شاورما','سمك مشوي'],
    priceRange: [20, 500]
  },
];

const CONDITION_PATTERNS = [
  { value: 'new', keywords: ['جديد','كسر زيرو','جديده','جديدة','new','brand new','sealed','zero','زيرو','طازج','لم يستخدم','لم تستخدم'] },
  { value: 'excellent', keywords: ['ممتاز','زي الجديد','كالجديد','بحاله ممتازة','بحالة ممتازة','excellent','like new','mint','بحالة جيدة جداً','نظيف جداً'] },
  { value: 'used', keywords: ['مستعمل','استعمال','استخدام','used','second hand','مش جديد','بحالة جيدة','شغال'] },
  { value: 'rent', keywords: ['للايجار','ايجار','إيجار','للإيجار','rent','rental','اجار','أجار'] },
];

const PRICE_PATTERNS = [
  /(\d[\d,.]*)[\s]*(جنيه|ج\.?م|ريال|درهم|دينار|دولار|يورو|egp|sar|aed|usd|eur|\$|£|€)/gi,
  /بـ?سعر[\s:]*(\d[\d,.]*)/gi,
  /السعر[\s:]*(\d[\d,.]*)/gi,
  /(\d[\d,.]*)[\s]*(فقط|only)/gi,
];

export function analyzeTextOffline(text = '') {
  const lower = text.toLowerCase();

  // Detect best category
  let best = { main: 'General', sub: 'Other', score: 0, priceRange: [100, 5000] };
  for (const rule of CATEGORY_RULES) {
    const score = rule.keywords.filter(k => lower.includes(k.toLowerCase())).length;
    if (score > best.score) best = { ...rule, score };
  }

  // Detect condition
  let condition = 'used';
  for (const p of CONDITION_PATTERNS) {
    if (p.keywords.some(k => lower.includes(k.toLowerCase()))) { condition = p.value; break; }
  }

  // Extract price
  let suggestedPrice = 0;
  for (const pattern of PRICE_PATTERNS) {
    const match = text.match(pattern);
    if (match) {
      const num = match[0].match(/\d[\d,.]*/);
      if (num) { suggestedPrice = parseFloat(num[0].replace(/,/g, '')); break; }
    }
  }
  if (!suggestedPrice && best.priceRange) {
    suggestedPrice = Math.round(best.priceRange[0] * 1.5);
  }

  // Build title from first meaningful line
  const lines = text.split(/[\n.!؟]/).map(l => l.trim()).filter(l => l.length > 3);
  const title = (lines[0] || text).slice(0, 80).trim();

  // Build description
  const restText = lines.slice(1).join(' ').trim();
  const conditionAr = { new: 'جديد', excellent: 'بحالة ممتازة', used: 'مستعمل بحالة جيدة', rent: 'للإيجار' };
  const description = restText.length > 10
    ? restText.slice(0, 400)
    : `${title} - ${conditionAr[condition]} - السعر: ${suggestedPrice.toLocaleString()} - للتواصل عبر الواتساب`;

  const confidence = best.score > 0 ? 'high' : 'low';

  return { title, description, category: best.main, subcategory: best.sub, suggestedPrice, condition, confidence, source: 'offline' };
}

export default { analyzeTextOffline };
