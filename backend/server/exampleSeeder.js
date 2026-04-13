'use strict';
import SubcategoryExample from '../models/SubcategoryExample.js';

const SEEDS = [
  // VEHICLES
  { category: 'Vehicles', subcategory: 'Cars', subsub: '', examples: ['سيارة','عربية','أوتوماتيك','يدوي','موديل','فيتس','هيونداي','تويوتا','كيا','بيجو','رينو','شيفروليه','سياره للبيع','car for sale','sedan','automatic','manual gearbox','used car','km','كيلومتر','مكيف','حادثة','تشليح','ترخيص','سياحي','ملاكي','نقل','اوتوماتيك','يدوى'] },
  { category: 'Vehicles', subcategory: 'Motorcycles', subsub: '', examples: ['موتوسيكل','دراجة نارية','سوزوكي','هوندا سي بي','ياماها','بجاج','TVS','موتو','تيل','بنزين','مرسيدس موتور','motorcycle','scooter','moped','bike'] },
  { category: 'Vehicles', subcategory: 'Trucks', subsub: '', examples: ['شاحنة','تريلا','نقل','عفش','نصف نقل','ميني باص','أتوبيس','ميكروباص','truck','lorry','pickup','van for cargo','نقليات'] },
  { category: 'Vehicles', subcategory: 'Boats', subsub: '', examples: ['قارب','يخت','لنش','مركب','صيد','بحري','boat','yacht','fishing boat','marine'] },
  { category: 'Vehicles', subcategory: 'CarParts', subsub: '', examples: ['قطع غيار','غيار','كفرات','تايرات','بطارية','فلتر','زيت','أكسسوارات سيارة','تشليح','spare parts','car parts','tires','rims','battery','engine parts'] },

  // ELECTRONICS
  { category: 'Electronics', subcategory: 'MobilePhones', subsub: '', examples: ['موبايل','تليفون','آيفون','سامسونج','شاومي','أوبو','ريلمي','تيكنو','إيتل','هواوي','نوكيا','ايفون','iphone','samsung','xiaomi','oppo','realme','phone','smartphone','مستعمل هاتف','شاشة مكسورة','شاشة مكسوره'] },
  { category: 'Electronics', subcategory: 'Laptops', subsub: '', examples: ['لابتوب','لاب توب','كمبيوتر محمول','ماك بوك','ديل','اتش بي','لينوفو','أسوس','توشيبا','laptop','macbook','dell','hp','lenovo','asus','notebook','core i5','core i7','رام'] },
  { category: 'Electronics', subcategory: 'TVs', subsub: '', examples: ['تليفزيون','شاشة','سمارت TV','ال جي','سامسونج شاشة','OLED','LED','4K','smart tv','television','تلفاز','شاشه'] },
  { category: 'Electronics', subcategory: 'Cameras', subsub: '', examples: ['كاميرا','تصوير','كانون','نيكون','سوني','DSLR','gopro','lens','عدسة','camera','photography','mirrorless'] },
  { category: 'Electronics', subcategory: 'Gaming', subsub: '', examples: ['بلايستيشن','PS4','PS5','إكس بوكس','نينتندو','جيمز','العاب','جويستيك','gaming','playstation','xbox','nintendo','controller','game console'] },
  { category: 'Electronics', subcategory: 'Tablets', subsub: '', examples: ['تابلت','آيباد','سامسونج تاب','iPad','tablet','tab','galaxy tab'] },

  // REAL ESTATE
  { category: 'RealEstate', subcategory: 'Apartments', subsub: '', examples: ['شقة','شقه','للإيجار','للبيع','أوضة','غرفة','ريسبشن','صالة','دور','بدروم','apartment','flat','rent','sale','room','floor','furnished','مفروش','غير مفروش','تشطيب','سوبر لوكس'] },
  { category: 'RealEstate', subcategory: 'Villas', subsub: '', examples: ['فيلا','villa','دوبلكس','بنتهاوس','مستقل','قطعة أرض','منزل','بيت','house','duplex','penthouse','compound'] },
  { category: 'RealEstate', subcategory: 'Offices', subsub: '', examples: ['مكتب','محل','محلات','إداري','تجاري','مستودع','office','shop','commercial','store','retail','warehouse','للإيجار تجاري'] },
  { category: 'RealEstate', subcategory: 'Land', subsub: '', examples: ['أرض','قطعة','فدان','متر مربع','land','plot','قراريط','عزبة','زراعي','سكني'] },

  // JOBS
  { category: 'Jobs', subcategory: 'FullTime', subsub: '', examples: ['وظيفة','مطلوب','محاسب','مهندس','مبيعات','full time','دوام كامل','براتب','راتب','تعيين','توظيف','job vacancy','hiring','hr','موارد بشرية','خبرة'] },
  { category: 'Jobs', subcategory: 'PartTime', subsub: '', examples: ['part time','دوام جزئي','ساعات','عمل إضافي','freelance','فريلانس','مشروع','project','دوام مرن'] },
  { category: 'Jobs', subcategory: 'Internship', subsub: '', examples: ['تدريب','internship','trainee','متدرب','تدريب صيفي','summer training'] },

  // SERVICES
  { category: 'Services', subcategory: 'HomeServices', subsub: '', examples: ['سباك','كهربائي','نجار','دهان','صيانة','تكييف','غاز','home service','plumber','electrician','carpenter','painter','maintenance','repair','تصليح'] },
  { category: 'Services', subcategory: 'Tutoring', subsub: '', examples: ['مدرس','درس خصوصي','تأسيس','مذاكرة','شرح','tutor','private lesson','teaching','رياضيات','فيزياء','chemistry','english teacher'] },
  { category: 'Services', subcategory: 'Transport', subsub: '', examples: ['نقل عفش','ونيت','شحن','توصيل','أوبر','كريم','moving','delivery','shipping','courier','logistics','نقليات','نقل أثاث'] },
  { category: 'Services', subcategory: 'Beauty', subsub: '', examples: ['صالون','حلاق','ميكاب','مكياج','كوافير','beauty','salon','makeup','hair','barber','nails','spa','manicure'] },

  // FASHION
  { category: 'Fashion', subcategory: 'MensClothing', subsub: '', examples: ['ملابس رجالي','بدلة','قميص','بنطلون','جاكيت','كوتشي','حذاء رجالي','men clothes','shirt','pants','suit','jacket','shoes men'] },
  { category: 'Fashion', subcategory: 'WomensClothing', subsub: '', examples: ['ملابس حريمي','فستان','بلوزة','تنورة','حجاب','عباية','شنطة','كعب','ladies clothes','dress','blouse','hijab','abaya','women shoes','handbag'] },
  { category: 'Fashion', subcategory: 'KidsClothing', subsub: '', examples: ['ملابس أطفال','مدرسة','يونيفورم','طفل','بيبي','kids clothes','children','baby','school uniform','toy clothes'] },
  { category: 'Fashion', subcategory: 'Accessories', subsub: '', examples: ['اكسسوارات','ساعة','خاتم','سوار','عقد','نظارة','accessories','watch','ring','bracelet','necklace','sunglasses','belt'] },

  // SUPERMARKET — rich Arabic food terms added
  { category: 'Supermarket', subcategory: 'Groceries', subsub: '', examples: [
    'بقالة','مواد غذائية','أرز','سكر','زيت','دقيق','groceries','food','rice','sugar','oil','flour','supermarket','منتجات',
    'بطاطس','خضروات','فاكهة','لحم','دجاج','سمك','سوبرماركت',
    'طماطم','خيار','بصل','ثوم','جزر','فلفل','بقوليات','عدس','فول','حمص',
    'تفاح','موز','برتقال','عنب','بطيخ','خوخ','تمر','زبيب',
    'لحم بقري','لحم خروف','كبدة','قلب','سجق','كفتة',
    'سمك بلطي','سمك قاروص','جمبري','كابوريا','تونة',
    'حليب','لبن','جبنة','زبدة','كريمة','زبادي','بيض'
  ] },
  { category: 'Supermarket', subcategory: 'Household', subsub: '', examples: ['منتجات منزلية','تنظيف','غسيل','صابون','مسحوق','household','cleaning','detergent','washing','bleach','مواد تنظيف'] },

  // FAST FOOD
  { category: 'FastFood', subcategory: 'Restaurants', subsub: '', examples: ['مطعم','أكل','وجبة','بيتزا','برجر','شاورما','كشري','فول','طعمية','restaurant','food delivery','meal','pizza','burger','shawarma'] },
  { category: 'FastFood', subcategory: 'Cafes', subsub: '', examples: ['كافيه','قهوة','كوفي','شاي','عصير','cafe','coffee','tea','juice','drinks','cappuccino'] },

  // PHARMACY
  { category: 'Pharmacy', subcategory: 'Medicines', subsub: '', examples: ['دواء','أدوية','علاج','مكملات','فيتامين','medicine','pharmacy','supplement','vitamin','capsule','tablet','syrup'] },
  { category: 'Pharmacy', subcategory: 'BabyProducts', subsub: '', examples: ['بيبي','رضاعة','حفاضات','مستحضرات أطفال','baby products','diapers','formula','baby care','pampers'] },
];

async function seedExamples() {
  for (const seed of SEEDS) {
    await SubcategoryExample.findOneAndUpdate(
      { category: seed.category, subcategory: seed.subcategory, subsub: seed.subsub || '' },
      { $setOnInsert: { examples: seed.examples, source: 'seed', lastUpdated: new Date() } },
      { upsert: true }
    );
  }
}

export { seedExamples };
