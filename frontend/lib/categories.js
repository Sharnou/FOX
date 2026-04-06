// 3-level category hierarchy for FOX/XTOX
// Level 1: Category | Level 2: Subcategory | Level 3: Sub-subcategory
// All auto-detected by keyword matching on ad title + description

export const CATEGORIES = {
  Vehicles: {
    ar: 'سيارات',
    subcategories: [
      {
        value: 'Cars', ar: 'سيارات',
        subsubs: [
          { value: 'Sedan', ar: 'سيدان', kw: ['سيدان','sedan'] },
          { value: 'SUV', ar: 'SUV / دفع رباعي', kw: ['suv','دفع رباعي','jeep','جيب','رانج','patrol','پاترول'] },
          { value: 'Pickup', ar: 'بيك آب', kw: ['بيك اب','pickup','pick up','هايلكس','hilux'] },
          { value: 'Coupe', ar: 'كوبيه', kw: ['كوبيه','coupe'] },
          { value: 'Hatchback', ar: 'هاتشباك', kw: ['هاتشباك','hatchback'] },
          { value: 'Minivan', ar: 'ميني فان', kw: ['ميني فان','minivan','van','فان'] },
          { value: 'Electric', ar: 'كهربائية', kw: ['كهربائي','electric','ev','tesla','تيسلا'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Motorcycles', ar: 'دراجات نارية',
        subsubs: [
          { value: 'Sport', ar: 'رياضية', kw: ['sport','رياضي','cbr','r1','gsxr'] },
          { value: 'Cruiser', ar: 'كروزر', kw: ['cruiser','كروزر','harley','هارلي'] },
          { value: 'Scooter', ar: 'سكوتر', kw: ['سكوتر','scooter','vespa','فيسبا'] },
          { value: 'OffRoad', ar: 'أوف رود', kw: ['off road','offroad','dirt','كروس'] },
          { value: 'Electric', ar: 'كهربائية', kw: ['كهربائي','electric','ev'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Trucks', ar: 'شاحنات',
        subsubs: [
          { value: 'LightTruck', ar: 'شاحنة خفيفة', kw: ['خفيفة','light','صغيرة'] },
          { value: 'HeavyTruck', ar: 'شاحنة ثقيلة', kw: ['ثقيلة','heavy','كبيرة'] },
          { value: 'Van', ar: 'فان / ميكروباص', kw: ['فان','van','ميكروباص','microbus'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Boats', ar: 'قوارب',
        subsubs: [
          { value: 'FishingBoat', ar: 'قارب صيد', kw: ['صيد','fishing'] },
          { value: 'Yacht', ar: 'يخت', kw: ['يخت','yacht'] },
          { value: 'SpeedBoat', ar: 'زورق سريع', kw: ['سريع','speed','زورق'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'SpareParts', ar: 'قطع غيار',
        subsubs: [
          { value: 'Engine', ar: 'محرك وجير', kw: ['محرك','engine','gear','جير','ترس'] },
          { value: 'Tires', ar: 'كفرات وجنوط', kw: ['كفر','كفرات','tire','جنط','جنوط','rim'] },
          { value: 'BodyParts', ar: 'هيكل وأبواب', kw: ['هيكل','باب','أبواب','body','بمبر','bumper','رفرف'] },
          { value: 'Electrical', ar: 'كهربائيات', kw: ['كهرباء','electrical','بطارية','battery','sensor'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['سيارة','عربية','موتور','شاحنة','مركبة','car','vehicle','truck','motorcycle','bike','boat','قطع غيار'],
  },

  Electronics: {
    ar: 'إلكترونيات',
    subcategories: [
      {
        value: 'MobilePhones', ar: 'هواتف محمولة',
        subsubs: [
          { value: 'iPhone', ar: 'آيفون', kw: ['iphone','ايفون','آيفون','apple موبايل'] },
          { value: 'Samsung', ar: 'سامسونج', kw: ['samsung','سامسونج','galaxy','جالاكسي'] },
          { value: 'Huawei', ar: 'هواوي', kw: ['huawei','هواوي'] },
          { value: 'Xiaomi', ar: 'شاومي', kw: ['xiaomi','شاومي','redmi','ريدمي','poco'] },
          { value: 'Oppo', ar: 'أوبو', kw: ['oppo','أوبو','realme','ريلمي'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Laptops', ar: 'لابتوب',
        subsubs: [
          { value: 'MacBook', ar: 'ماك بوك', kw: ['macbook','ماك','apple laptop','mac'] },
          { value: 'GamingLaptop', ar: 'لابتوب جيمينج', kw: ['gaming','جيمينج','asus rog','msi','alienware','lenovo legion','hp omen'] },
          { value: 'Business', ar: 'للأعمال', kw: ['business','للأعمال','thinkpad','dell xps','hp elitebook'] },
          { value: 'Student', ar: 'للطلاب', kw: ['student','طالب','للطلاب','budget','اقتصادي'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Tablets', ar: 'تابلت',
        subsubs: [
          { value: 'iPad', ar: 'آيباد', kw: ['ipad','آيباد','apple tablet'] },
          { value: 'SamsungTab', ar: 'سامسونج تاب', kw: ['samsung tab','galaxy tab','سامسونج تاب'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'TVs', ar: 'تليفزيونات',
        subsubs: [
          { value: 'SmartTV', ar: 'سمارت تي في', kw: ['smart','سمارت','android tv','webos'] },
          { value: 'OLED', ar: 'OLED', kw: ['oled','oled'] },
          { value: 'LED', ar: 'LED', kw: ['led','شاشة led'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Cameras', ar: 'كاميرات',
        subsubs: [
          { value: 'DSLR', ar: 'DSLR', kw: ['dslr','canon','nikon','احترافية'] },
          { value: 'Mirrorless', ar: 'ميرورليس', kw: ['mirrorless','ميرورليس','sony alpha','fuji'] },
          { value: 'ActionCam', ar: 'أكشن كام', kw: ['gopro','action','أكشن'] },
          { value: 'Security', ar: 'كاميرا مراقبة', kw: ['مراقبة','security','cctv','ip camera'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Gaming', ar: 'ألعاب إلكترونية',
        subsubs: [
          { value: 'PlayStation', ar: 'بلايستيشن', kw: ['playstation','بلايستيشن','ps4','ps5','ps3'] },
          { value: 'Xbox', ar: 'إكس بوكس', kw: ['xbox','اكس بوكس','xbox series'] },
          { value: 'Nintendo', ar: 'نينتندو', kw: ['nintendo','نينتندو','switch'] },
          { value: 'PCGaming', ar: 'جيمينج PC', kw: ['pc gaming','gaming pc','rtx','gtx','gpu','vga'] },
          { value: 'GameAccessories', ar: 'إكسسوارات ألعاب', kw: ['controller','يد تحكم','headset','gaming chair','كرسي'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Audio', ar: 'صوتيات',
        subsubs: [
          { value: 'Headphones', ar: 'سماعات رأس', kw: ['headphone','سماعة رأس','over ear','سوني wh'] },
          { value: 'Earbuds', ar: 'إيربودز', kw: ['airpods','earbuds','ايربودز','tws','earphone'] },
          { value: 'Speakers', ar: 'سبيكر', kw: ['speaker','سبيكر','jbl','marshall','بلوتوث'] },
          { value: 'HomeTheater', ar: 'هوم ثيتر', kw: ['home theater','هوم ثيتر','surround','subwoofer'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Accessories', ar: 'إكسسوارات',
        subsubs: [
          { value: 'Chargers', ar: 'شواحن', kw: ['charger','شاحن','adapter','محول'] },
          { value: 'Cases', ar: 'كفرات وحافظات', kw: ['case','كفر','cover','حافظة'] },
          { value: 'PowerBanks', ar: 'باور بانك', kw: ['power bank','باور بانك','بطارية خارجية'] },
          { value: 'Cables', ar: 'كابلات', kw: ['cable','كابل','usb','hdmi'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['موبايل','تليفون','iphone','samsung','لابتوب','تابلت','تليفزيون','كاميرا','بلايستيشن','xbox','سماعات'],
  },

  'Real Estate': {
    ar: 'عقارات',
    subcategories: [
      {
        value: 'Apartments', ar: 'شقق',
        subsubs: [
          { value: 'Studio', ar: 'استوديو', kw: ['استوديو','studio','أوضة وريسبشن'] },
          { value: '1BR', ar: 'غرفة نوم واحدة', kw: ['غرفة واحدة','1 bedroom','1br','اوضة واحدة'] },
          { value: '2BR', ar: 'غرفتان', kw: ['غرفتين','2 bedroom','2br','اوضتين'] },
          { value: '3BR', ar: '3 غرف', kw: ['3 غرف','3 bedroom','3br','3 اوض'] },
          { value: '4BR', ar: '4 غرف فأكثر', kw: ['4 غرف','4 bedroom','4br','4 اوض','5 غرف','5br'] },
          { value: 'Duplex', ar: 'دوبلكس', kw: ['دوبلكس','duplex'] },
          { value: 'Penthouse', ar: 'بنتهاوس', kw: ['بنتهاوس','penthouse','روف'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Villas', ar: 'فيلات',
        subsubs: [
          { value: 'Independent', ar: 'مستقلة', kw: ['مستقلة','independent','standalone'] },
          { value: 'Compound', ar: 'كمبوند', kw: ['كمبوند','compound'] },
          { value: 'TwinHouse', ar: 'توين هاوس', kw: ['توين','twin house'] },
          { value: 'TownHouse', ar: 'تاون هاوس', kw: ['تاون','town house'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Land', ar: 'أراضي',
        subsubs: [
          { value: 'Residential', ar: 'سكنية', kw: ['سكنية','residential'] },
          { value: 'Commercial', ar: 'تجارية', kw: ['تجارية','commercial'] },
          { value: 'Agricultural', ar: 'زراعية', kw: ['زراعية','agricultural','مزرعة','farm'] },
          { value: 'Industrial', ar: 'صناعية', kw: ['صناعية','industrial'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Commercial', ar: 'تجاري',
        subsubs: [
          { value: 'Shop', ar: 'محل', kw: ['محل','shop','متجر','store'] },
          { value: 'Warehouse', ar: 'مخزن', kw: ['مخزن','warehouse','مستودع'] },
          { value: 'Restaurant', ar: 'مطعم', kw: ['مطعم','restaurant','كافيه','cafe'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Offices', ar: 'مكاتب',
        subsubs: [
          { value: 'Private', ar: 'مكتب خاص', kw: ['خاص','private'] },
          { value: 'Shared', ar: 'مشترك', kw: ['مشترك','shared','coworking'] },
          { value: 'Floor', ar: 'دور كامل', kw: ['دور','floor'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Rooms', ar: 'غرف',
        subsubs: [
          { value: 'Single', ar: 'غرفة مفردة', kw: ['مفردة','single'] },
          { value: 'Double', ar: 'غرفة مزدوجة', kw: ['مزدوجة','double'] },
          { value: 'Master', ar: 'ماستر', kw: ['ماستر','master'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['شقة','فيلا','أرض','مكتب','محل','عقار','apartment','villa','land','office','room'],
  },

  Jobs: {
    ar: 'وظائف',
    subcategories: [
      {
        value: 'FullTime', ar: 'دوام كامل',
        subsubs: [
          { value: 'IT', ar: 'تكنولوجيا', kw: ['developer','مطور','programmer','مبرمج','software','it','tech'] },
          { value: 'Engineering', ar: 'هندسة', kw: ['engineer','مهندس','engineering','هندسة'] },
          { value: 'Medical', ar: 'طبي', kw: ['doctor','طبيب','nurse','ممرض','medical','طبي','صيدلاني'] },
          { value: 'Marketing', ar: 'تسويق', kw: ['marketing','تسويق','social media','سوشيال'] },
          { value: 'Finance', ar: 'مالية ومحاسبة', kw: ['accountant','محاسب','finance','مالية','محاسبة'] },
          { value: 'Education', ar: 'تعليم', kw: ['teacher','مدرس','lecturer','أستاذ','education'] },
          { value: 'Sales', ar: 'مبيعات', kw: ['sales','مبيعات','مندوب'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'PartTime', ar: 'دوام جزئي',
        subsubs: [
          { value: 'Delivery', ar: 'توصيل', kw: ['delivery','توصيل','مندوب توصيل'] },
          { value: 'Tutoring', ar: 'دروس خصوصية', kw: ['دروس','tutoring','مدرس خصوصي'] },
          { value: 'CustomerService', ar: 'خدمة عملاء', kw: ['customer service','خدمة عملاء','call center','كول سنتر'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Freelance', ar: 'فريلانس',
        subsubs: [
          { value: 'Design', ar: 'تصميم', kw: ['design','تصميم','graphic','جرافيك','ui','ux'] },
          { value: 'Development', ar: 'برمجة', kw: ['develop','برمجة','code','كود','web','mobile app'] },
          { value: 'Writing', ar: 'كتابة محتوى', kw: ['writing','كتابة','content','محتوى','copywriting'] },
          { value: 'Translation', ar: 'ترجمة', kw: ['translation','ترجمة','translate','مترجم'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Internship', ar: 'تدريب',
        subsubs: [
          { value: 'Technical', ar: 'تقني', kw: ['technical','تقني','engineering intern'] },
          { value: 'Business', ar: 'أعمال', kw: ['business','أعمال','management'] },
          { value: 'Creative', ar: 'إبداعي', kw: ['creative','إبداعي','design intern','media'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Remote', ar: 'عن بُعد',
        subsubs: [
          { value: 'Development', ar: 'برمجة', kw: ['develop','برمجة','code'] },
          { value: 'CustomerService', ar: 'خدمة عملاء', kw: ['customer service','خدمة عملاء'] },
          { value: 'Content', ar: 'محتوى', kw: ['content','محتوى','writing','social media'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['وظيفة','مطلوب','فرصة عمل','دوام','freelance','job','work','hiring'],
  },

  Services: {
    ar: 'خدمات',
    subcategories: [
      {
        value: 'HomeServices', ar: 'خدمات منزلية',
        subsubs: [
          { value: 'Plumber', ar: 'سباكة', kw: ['سباك','plumber','سباكة','مواسير','تسريب'] },
          { value: 'Electrician', ar: 'كهرباء', kw: ['كهربائي','electrician','كهرباء'] },
          { value: 'Carpenter', ar: 'نجارة', kw: ['نجار','carpenter','نجارة','خشب'] },
          { value: 'Painter', ar: 'دهانات', kw: ['دهان','painter','صبغ','paint'] },
          { value: 'ACRepair', ar: 'تكييف', kw: ['تكييف','ac','air condition','مكيف'] },
          { value: 'PestControl', ar: 'مكافحة حشرات', kw: ['حشرات','pest','نمل','صراصير','فئران'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Cleaning', ar: 'تنظيف',
        subsubs: [
          { value: 'HomeCleaning', ar: 'تنظيف منازل', kw: ['تنظيف منزل','تنظيف شقة','home cleaning'] },
          { value: 'OfficeCleaning', ar: 'تنظيف مكاتب', kw: ['تنظيف مكتب','office cleaning'] },
          { value: 'CarWash', ar: 'غسيل سيارات', kw: ['غسيل سيارة','car wash','غسيل عربية'] },
          { value: 'SofaCleaning', ar: 'تنظيف أثاث', kw: ['سجاد','كنبة','sofa','carpet','موكيت'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Repairs', ar: 'إصلاح وصيانة',
        subsubs: [
          { value: 'Electronics', ar: 'إصلاح إلكترونيات', kw: ['تصليح موبايل','تصليح لابتوب','شاشة مكسورة','repair phone'] },
          { value: 'Appliances', ar: 'إصلاح أجهزة', kw: ['تصليح غسالة','تصليح ثلاجة','تصليح تكييف','appliance repair'] },
          { value: 'Furniture', ar: 'إصلاح أثاث', kw: ['تصليح أثاث','كنبة','furniture repair'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Education', ar: 'تعليم ودروس',
        subsubs: [
          { value: 'Math', ar: 'رياضيات', kw: ['رياضيات','math','حساب','جبر'] },
          { value: 'Science', ar: 'علوم', kw: ['علوم','science','فيزياء','كيمياء','أحياء'] },
          { value: 'Languages', ar: 'لغات', kw: ['لغة إنجليزية','english','french','فرنسي','arabic','عربي'] },
          { value: 'Quran', ar: 'قرآن وتجويد', kw: ['قرآن','quran','تجويد','حفظ'] },
          { value: 'Music', ar: 'موسيقى', kw: ['موسيقى','music','guitar','piano','عزف'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Health', ar: 'صحة وجمال',
        subsubs: [
          { value: 'Fitness', ar: 'لياقة بدنية', kw: ['جيم','gym','fitness','تدريب شخصي','personal trainer'] },
          { value: 'Nutrition', ar: 'تغذية', kw: ['تغذية','nutrition','diet','رجيم'] },
          { value: 'Salon', ar: 'صالون', kw: ['صالون','salon','حلاق','coiffure','تسريحة'] },
          { value: 'Spa', ar: 'سبا ومساج', kw: ['سبا','spa','مساج','massage'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Transport', ar: 'نقل وشحن',
        subsubs: [
          { value: 'FurnitureMoving', ar: 'نقل أثاث', kw: ['نقل أثاث','نقل عفش','furniture moving'] },
          { value: 'Delivery', ar: 'توصيل طلبات', kw: ['توصيل','delivery','شحن','shipping'] },
          { value: 'AirportTransfer', ar: 'توصيل مطار', kw: ['مطار','airport','transfer'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Design', ar: 'تصميم وطباعة',
        subsubs: [
          { value: 'LogoDesign', ar: 'تصميم شعار', kw: ['لوجو','logo','شعار','brand'] },
          { value: 'Print', ar: 'طباعة', kw: ['طباعة','print','بروشور','بنر','banner'] },
          { value: 'WebDesign', ar: 'تصميم مواقع', kw: ['موقع','website','web design','landing page'] },
          { value: 'Video', ar: 'فيديو وموشن', kw: ['فيديو','video','motion','animation','مونتاج'] },
          { value: 'Photography', ar: 'تصوير', kw: ['تصوير','photography','photographer'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['سباك','كهربائي','نجار','نقل','تنظيف','دروس','مدرس','تصليح','خدمة','صيانة'],
  },

  Supermarket: {
    ar: 'سوبرماركت',
    subcategories: [
      {
        value: 'Food', ar: 'مواد غذائية',
        subsubs: [
          { value: 'Fresh', ar: 'طازج (خضار ولحوم)', kw: ['خضار','لحم','فراخ','سمك','فواكه','طازج','fresh'] },
          { value: 'Dairy', ar: 'ألبان وبيض', kw: ['لبن','جبن','زبادي','بيض','dairy'] },
          { value: 'Bakery', ar: 'مخبوزات', kw: ['عيش','خبز','بسكويت','كيك','bread','bakery'] },
          { value: 'Canned', ar: 'معلبات', kw: ['معلبات','canned','فول','طماطم معلبة'] },
          { value: 'Snacks', ar: 'سناكس', kw: ['سناكس','snacks','شيبسي','شوكولاتة'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Beverages', ar: 'مشروبات',
        subsubs: [
          { value: 'Juice', ar: 'عصائر', kw: ['عصير','juice'] },
          { value: 'Water', ar: 'مياه', kw: ['مياه','water'] },
          { value: 'SoftDrinks', ar: 'مشروبات غازية', kw: ['غازي','كولا','pepsi','cola','soft drink'] },
          { value: 'Energy', ar: 'طاقة', kw: ['طاقة','energy','redbull','monster'] },
          { value: 'HotDrinks', ar: 'مشروبات ساخنة', kw: ['قهوة','شاي','coffee','tea','نسكافيه'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'PersonalCare', ar: 'عناية شخصية',
        subsubs: [
          { value: 'Skincare', ar: 'عناية بالبشرة', kw: ['كريم','بشرة','skincare','cream','moisturizer'] },
          { value: 'HairCare', ar: 'عناية بالشعر', kw: ['شامبو','شعر','shampoo','hair'] },
          { value: 'OralCare', ar: 'عناية بالأسنان', kw: ['معجون أسنان','فرشة أسنان','toothpaste','oral'] },
          { value: 'Hygiene', ar: 'نظافة شخصية', kw: ['صابون','soap','deodorant','مزيل عرق'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Household', ar: 'منزلية',
        subsubs: [
          { value: 'Cleaning', ar: 'منظفات', kw: ['منظف','detergent','cleaning product','مسحوق غسيل'] },
          { value: 'Kitchen', ar: 'أدوات مطبخ', kw: ['مطبخ','طاسة','حلة','kitchen','cookware'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'BabyProducts', ar: 'منتجات أطفال',
        subsubs: [
          { value: 'Diapers', ar: 'حفاضات', kw: ['حفاض','diaper','pampers'] },
          { value: 'BabyFood', ar: 'أغذية أطفال', kw: ['أكل أطفال','baby food','بامبرز أكل'] },
          { value: 'BabyToys', ar: 'ألعاب أطفال', kw: ['لعبة أطفال','baby toy'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['غذاء','أكل','مشروب','عناية','منظف','سوبرماركت','food','grocery'],
  },

  Pharmacy: {
    ar: 'صيدلية',
    subcategories: [
      {
        value: 'Medicines', ar: 'أدوية',
        subsubs: [
          { value: 'OTC', ar: 'أدوية بدون وصفة', kw: ['بدون وصفة','otc','مسكن','panadol','مضاد حيوي'] },
          { value: 'Vitamins', ar: 'فيتامينات', kw: ['فيتامين','vitamin','c','d','b12','zinc'] },
          { value: 'Herbal', ar: 'أعشاب', kw: ['أعشاب','herbal','natural','طبيعي'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'MedicalDevices', ar: 'أجهزة طبية',
        subsubs: [
          { value: 'BloodPressure', ar: 'جهاز ضغط', kw: ['ضغط','blood pressure','omron'] },
          { value: 'BloodSugar', ar: 'جهاز سكر', kw: ['سكر','glucose','blood sugar','glucometer'] },
          { value: 'Thermometer', ar: 'ترمومتر', kw: ['ترمومتر','thermometer','حرارة'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Supplements', ar: 'مكملات غذائية',
        subsubs: [
          { value: 'Protein', ar: 'بروتين', kw: ['بروتين','protein','whey','casein'] },
          { value: 'WeightLoss', ar: 'تخسيس', kw: ['تخسيس','weight loss','حرق دهون','fat burner'] },
          { value: 'MuscleBuilding', ar: 'بناء عضلات', kw: ['عضلات','muscle','creatine','pre workout'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'BabyHealth', ar: 'صحة الأطفال', subsubs: [{ value: 'Other', ar: 'أخرى', kw: [] }] },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['دواء','صيدلية','مكمل','فيتامين','أجهزة طبية','medicine'],
  },

  'Fast Food': {
    ar: 'طعام',
    subcategories: [
      {
        value: 'Pizza', ar: 'بيتزا',
        subsubs: [
          { value: 'Margherita', ar: 'مارغريتا', kw: ['مارغريتا','margherita','جبن فقط'] },
          { value: 'Pepperoni', ar: 'بيبروني', kw: ['بيبروني','pepperoni'] },
          { value: 'Seafood', ar: 'مأكولات بحرية', kw: ['جمبري','بيتزا بحر','seafood pizza'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Burgers', ar: 'برجر',
        subsubs: [
          { value: 'BeefBurger', ar: 'برجر لحم', kw: ['لحم','beef','بقري'] },
          { value: 'ChickenBurger', ar: 'برجر دجاج', kw: ['دجاج','chicken','فراخ'] },
          { value: 'DoubleBurger', ar: 'دبل برجر', kw: ['دبل','double'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Sandwiches', ar: 'ساندوتشات',
        subsubs: [
          { value: 'Shawarma', ar: 'شاورما', kw: ['شاورما','shawarma'] },
          { value: 'Falafel', ar: 'فلافل', kw: ['فلافل','falafel','طعمية'] },
          { value: 'Kofta', ar: 'كفتة', kw: ['كفتة','kofta'] },
          { value: 'Club', ar: 'كلوب', kw: ['كلوب','club sandwich'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Desserts', ar: 'حلويات',
        subsubs: [
          { value: 'IceCream', ar: 'آيس كريم', kw: ['آيس كريم','ice cream','جيلاتو'] },
          { value: 'Cake', ar: 'كيك', kw: ['كيك','cake','تورتة'] },
          { value: 'Kunafa', ar: 'كنافة وقطايف', kw: ['كنافة','قطايف','بسبوسة','قطر'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Oriental', ar: 'مأكولات شرقية',
        subsubs: [
          { value: 'Koshary', ar: 'كشري', kw: ['كشري','koshary'] },
          { value: 'Grills', ar: 'مشويات', kw: ['مشويات','grills','كباب','مشوي'] },
          { value: 'Mahshi', ar: 'محشي', kw: ['محشي','mahshi','ورق عنب'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Seafood', ar: 'مأكولات بحرية',
        subsubs: [
          { value: 'Fish', ar: 'سمك', kw: ['سمك','fish','فيليه'] },
          { value: 'Shrimp', ar: 'جمبري', kw: ['جمبري','shrimp','prawns'] },
          { value: 'Mixed', ar: 'مشكل بحري', kw: ['مشكل','mixed seafood','بحري'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['بيتزا','برجر','ساندوتش','حلويات','مطعم','كشري','شاورما','pizza','burger'],
  },

  Fashion: {
    ar: 'موضة',
    subcategories: [
      {
        value: 'MensClothing', ar: 'ملابس رجالية',
        subsubs: [
          { value: 'Formal', ar: 'رسمي', kw: ['بدلة','قميص رسمي','suit','formal','طقم'] },
          { value: 'Casual', ar: 'كاجوال', kw: ['تيشيرت','كاجوال','casual','تي شيرت','t-shirt'] },
          { value: 'Sports', ar: 'رياضي', kw: ['رياضي','sports','نايكي','اديداس','nike','adidas'] },
          { value: 'Traditional', ar: 'ملابس تقليدية', kw: ['جلباب','قفطان','ثوب','دشداشة'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'WomensClothing', ar: 'ملابس نسائية',
        subsubs: [
          { value: 'Abayas', ar: 'عبايات', kw: ['عباية','abaya','خمار'] },
          { value: 'Dresses', ar: 'فساتين', kw: ['فستان','dress','فساتين'] },
          { value: 'Casual', ar: 'كاجوال', kw: ['بلوزة','كاجوال نسائي','casual women'] },
          { value: 'Sports', ar: 'رياضي', kw: ['رياضي نسائي','women sports','تيشيرت نسائي'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'KidsClothing', ar: 'ملابس أطفال',
        subsubs: [
          { value: 'Boys', ar: 'أولاد', kw: ['ولاد','boys','أولاد'] },
          { value: 'Girls', ar: 'بنات', kw: ['بنات','girls'] },
          { value: 'Baby', ar: 'مواليد', kw: ['مواليد','baby clothes','رضيع'] },
          { value: 'SchoolUniform', ar: 'يونيفورم مدرسي', kw: ['يونيفورم','uniform','مدرسة','school'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Shoes', ar: 'أحذية',
        subsubs: [
          { value: 'Formal', ar: 'جزمة رسمية', kw: ['جزمة رسمية','formal shoes','oxford'] },
          { value: 'Sneakers', ar: 'سنيكرز', kw: ['سنيكرز','sneakers','كوتشي','nike shoes','adidas shoes'] },
          { value: 'Sandals', ar: 'صنادل', kw: ['صندل','sandal','شبشب','slippers'] },
          { value: 'Sports', ar: 'رياضي', kw: ['حذاء رياضي','sports shoes','running'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Bags', ar: 'شنط',
        subsubs: [
          { value: 'Handbag', ar: 'حقيبة يد', kw: ['حقيبة يد','handbag','شنطة يد'] },
          { value: 'Backpack', ar: 'شنطة ظهر', kw: ['شنطة ظهر','backpack','حقيبة ظهر'] },
          { value: 'TravelBag', ar: 'شنطة سفر', kw: ['شنطة سفر','travel bag','trolley','تروللي'] },
          { value: 'Wallet', ar: 'محفظة', kw: ['محفظة','wallet','بورتفيه'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      {
        value: 'Accessories', ar: 'إكسسوارات',
        subsubs: [
          { value: 'Jewelry', ar: 'مجوهرات', kw: ['مجوهرات','jewelry','خاتم','عقد','سوار','ذهب','فضة'] },
          { value: 'Watches', ar: 'ساعات', kw: ['ساعة','watch','rolex','casio'] },
          { value: 'Sunglasses', ar: 'نظارات', kw: ['نظارة شمس','sunglasses','ray ban'] },
          { value: 'Scarves', ar: 'إيشاربات', kw: ['إيشارب','scarf','حجاب'] },
          { value: 'Other', ar: 'أخرى', kw: [] },
        ],
      },
      { value: 'Other', ar: 'أخرى', subsubs: [] },
    ],
    keywords: ['ملابس','فستان','قميص','بنطلون','حذاء','شنطة','إكسسوار','fashion','clothes'],
  },
};

// Auto-detect subcategory from text (level 2)
export function autoDetectSubcategory(category, text) {
  if (!category || !text || !CATEGORIES[category]) return 'Other';
  var lower = text.toLowerCase();
  var cat = CATEGORIES[category];
  for (var i = 0; i < cat.subcategories.length; i++) {
    var sub = cat.subcategories[i];
    if (!sub.keywords) continue;
    if (sub.keywords.some(function(k) { return lower.includes(k.toLowerCase()); })) return sub.value;
  }
  return 'Other';
}

// Auto-detect sub-subcategory from text (level 3)
export function autoDetectSubsub(category, subcategory, text) {
  if (!category || !subcategory || !text || !CATEGORIES[category]) return 'Other';
  var lower = text.toLowerCase();
  var cat = CATEGORIES[category];
  var sub = null;
  for (var i = 0; i < cat.subcategories.length; i++) {
    if (cat.subcategories[i].value === subcategory) { sub = cat.subcategories[i]; break; }
  }
  if (!sub || !sub.subsubs || sub.subsubs.length === 0) return 'Other';
  for (var j = 0; j < sub.subsubs.length; j++) {
    var ss = sub.subsubs[j];
    if (!ss.kw || ss.kw.length === 0) continue;
    if (ss.kw.some(function(k) { return lower.includes(k.toLowerCase()); })) return ss.value;
  }
  return 'Other';
}

// Get Arabic label for any level
export function getCategoryAr(category) {
  return (CATEGORIES[category] && CATEGORIES[category].ar) || category || '';
}
export function getSubcategoryAr(category, subcategory) {
  if (!CATEGORIES[category]) return subcategory || '';
  var subs = CATEGORIES[category].subcategories;
  for (var i = 0; i < subs.length; i++) {
    if (subs[i].value === subcategory) return subs[i].ar;
  }
  return subcategory || '';
}
export function getSubsubAr(category, subcategory, subsub) {
  if (!CATEGORIES[category]) return subsub || '';
  var subs = CATEGORIES[category].subcategories;
  var sub = null;
  for (var i = 0; i < subs.length; i++) {
    if (subs[i].value === subcategory) { sub = subs[i]; break; }
  }
  if (!sub || !sub.subsubs) return subsub || '';
  for (var j = 0; j < sub.subsubs.length; j++) {
    if (sub.subsubs[j].value === subsub) return sub.subsubs[j].ar;
  }
  return subsub || '';
}
