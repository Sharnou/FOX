// 4-level category hierarchy for FOX/XTOX
// Level 1: Category | Level 2: Subcategory | Level 3: Sub-subcategory | Level 4: Brand/Spec

export const CATEGORIES = {
  Vehicles: {
    ar: 'سيارات',
    subcategories: [
      {
        value: 'ملاكي', ar: 'ملاكي',
        subsubs: [
          { value: 'سيدان', ar: 'سيدان', kw: ['سيدان','sedan'] },
          { value: 'هاتشباك', ar: 'هاتشباك', kw: ['هاتشباك','hatchback'] },
          { value: 'SUV', ar: 'SUV', kw: ['suv','دفع رباعي','jeep','جيب','رانج','patrol'] },
          { value: 'كوبيه', ar: 'كوبيه', kw: ['كوبيه','coupe'] },
          { value: 'مينيفان', ar: 'مينيفان', kw: ['ميني فان','minivan','van','فان'] },
          { value: 'بيك أب', ar: 'بيك أب', kw: ['بيك اب','pickup','pick up','هايلكس','hilux'] },
          { value: 'كروس أوفر', ar: 'كروس أوفر', kw: ['كروس اوفر','crossover'] },
          { value: 'أخرى', ar: 'أخرى', kw: [] },
        ],
        level4: ['تويوتا','هوندا','كيا','هيونداي','نيسان','مرسيدس','بي إم دبليو','أودي','شيري','MG','رينو','بيجو','فولكسفاغن','لكزس','إنفينيتي','سكودا','أوبل','فيات','سوزوكي','ميتسوبيشي','سيات','فورد','شيفروليه','جيب','لاند روفر','بورش','أخرى'],
      },
      {
        value: 'دراجات نارية', ar: 'دراجات نارية',
        subsubs: [
          { value: 'رياضية', ar: 'رياضية', kw: ['sport','رياضي','cbr','r1','gsxr'] },
          { value: 'طرق وعرة', ar: 'طرق وعرة', kw: ['off road','offroad','dirt','كروس'] },
          { value: 'سكوتر', ar: 'سكوتر', kw: ['سكوتر','scooter','vespa'] },
          { value: 'كلاسيك', ar: 'كلاسيك', kw: ['classic','كلاسيك','cruiser','كروزر'] },
          { value: 'ثلاثية العجلات', ar: 'ثلاثية العجلات', kw: ['ثلاثية','three wheel','trike'] },
          { value: 'كهربائية', ar: 'كهربائية', kw: ['كهربائي','electric','ev'] },
          { value: 'أخرى', ar: 'أخرى', kw: [] },
        ],
        level4: ['هوندا','ياماها','سوزوكي','كاواساكي','KTM','بي إم دبليو','هارلي ديفيدسون','صيني','أخرى'],
      },
      {
        value: 'تجاري', ar: 'تجاري',
        subsubs: [
          { value: 'شاحنة نقل', ar: 'شاحنة نقل', kw: ['شاحنة','truck','لوري'] },
          { value: 'ميكروباص', ar: 'ميكروباص', kw: ['ميكروباص','microbus','فان'] },
          { value: 'ونيت', ar: 'ونيت', kw: ['ونيت','وانيت'] },
          { value: 'جرار أرضي', ar: 'جرار أرضي', kw: ['جرار','tractor'] },
          { value: 'توك توك', ar: 'توك توك', kw: ['توك توك','tuk tuk'] },
          { value: 'كرفانة', ar: 'كرفانة', kw: ['كرفانة','caravan'] },
          { value: 'مقطورة', ar: 'مقطورة', kw: ['مقطورة','trailer'] },
          { value: 'أخرى', ar: 'أخرى', kw: [] },
        ],
        level4: ['إيسوزو','مرسيدس','مان','فولفو','كيا','فورد','هيونداي','هونغ يانغ','يونايتد','أخرى'],
      },
      {
        value: 'قطع غيار', ar: 'قطع غيار',
        subsubs: [
          { value: 'محرك وقير', ar: 'محرك وقير', kw: ['محرك','engine','gear','جير','ترس'] },
          { value: 'كهرباء وإلكترونيات', ar: 'كهرباء وإلكترونيات', kw: ['كهرباء','electrical','بطارية','battery','sensor'] },
          { value: 'هيكل وبودي', ar: 'هيكل وبودي', kw: ['هيكل','باب','body','بمبر','bumper','رفرف'] },
          { value: 'إطارات وجنوط', ar: 'إطارات وجنوط', kw: ['كفر','كفرات','tire','جنط','جنوط','rim','اطار'] },
          { value: 'زيوت وفلاتر', ar: 'زيوت وفلاتر', kw: ['زيت','فلتر','oil','filter'] },
          { value: 'اكسسوارات', ar: 'اكسسوارات', kw: ['اكسسوار','accessory'] },
          { value: 'أخرى', ar: 'أخرى', kw: [] },
        ],
        level4: ['أصلي OEM','جينيون','تشاينيز','مستعمل بحالة جيدة','أخرى'],
      },
      {
        value: 'مراكب وقوارب', ar: 'مراكب وقوارب',
        subsubs: [
          { value: 'قارب بمحرك', ar: 'قارب بمحرك', kw: ['قارب بمحرك','motor boat'] },
          { value: 'قارب صيد', ar: 'قارب صيد', kw: ['صيد','fishing','قارب صيد'] },
          { value: 'يخت', ar: 'يخت', kw: ['يخت','yacht'] },
          { value: 'زورق', ar: 'زورق', kw: ['زورق سريع','speed','زورق'] },
          { value: 'كانو وكياك', ar: 'كانو وكياك', kw: ['كانو','كياك','canoe','kayak'] },
          { value: 'جت سكي', ar: 'جت سكي', kw: ['جت سكي','jet ski'] },
          { value: 'أخرى', ar: 'أخرى', kw: [] },
        ],
        level4: ['هيومان','باهيا','مركبة مصرية','مستورد','أخرى'],
      },
      {
        value: 'آليات زراعية', ar: 'آليات زراعية',
        subsubs: [
          { value: 'جرار زراعي', ar: 'جرار زراعي', kw: ['جرار','تراكتور','tractor'] },
          { value: 'حصادة', ar: 'حصادة', kw: ['حصادة','harvester','combine'] },
          { value: 'مضخة مياه', ar: 'مضخة مياه', kw: ['مضخة','pump'] },
          { value: 'تيلر', ar: 'تيلر', kw: ['تيلر','tiller'] },
          { value: 'رشاش', ar: 'رشاش', kw: ['رشاش','sprayer'] },
          { value: 'أخرى', ar: 'أخرى', kw: [] },
        ],
        level4: ['جون ديار','ماسي فيرجسون','كوبوتا','نيو هولاند','فيات آجري','صيني','أخرى'],
      },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['سيارة','عربية','موتور','شاحنة','مركبة','car','vehicle','truck','motorcycle','bike','boat','قطع غيار'],
  },

  'Real Estate': {
    ar: 'عقارات',
    subcategories: [
      { value: 'شقق', ar: 'شقق', subsubs: [{ value: 'استوديو', ar: 'استوديو', kw: ['استوديو','studio'] },{ value: '1 غرفة', ar: '1 غرفة', kw: ['غرفة واحدة','1 bedroom','1br'] },{ value: '2 غرفة', ar: '2 غرفة', kw: ['غرفتين','2 bedroom','2br'] },{ value: '3 غرف', ar: '3 غرف', kw: ['3 غرف','3 bedroom','3br'] },{ value: '4 غرف+', ar: '4 غرف+', kw: ['4 غرف','4 bedroom','4br','5 غرف'] },{ value: 'دوبلكس', ar: 'دوبلكس', kw: ['دوبلكس','duplex'] },{ value: 'بنتهاوس', ar: 'بنتهاوس', kw: ['بنتهاوس','penthouse','روف'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['مفروشة','نصف مفروشة','غير مفروشة','سوبر لوكس','قيد الإنشاء','أخرى'] },
      { value: 'فيلات ومنازل', ar: 'فيلات ومنازل', subsubs: [{ value: 'فيلا مستقلة', ar: 'فيلا مستقلة', kw: ['فيلا','villa','مستقلة'] },{ value: 'دوبلكس', ar: 'دوبلكس', kw: ['دوبلكس','duplex'] },{ value: 'تاون هاوس', ar: 'تاون هاوس', kw: ['تاون','town house'] },{ value: 'منزل شعبي', ar: 'منزل شعبي', kw: ['منزل شعبي','بيت شعبي'] },{ value: 'شاليه', ar: 'شاليه', kw: ['شاليه','chalet'] },{ value: 'قصر', ar: 'قصر', kw: ['قصر','palace'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['مفروش','غير مفروش','مع مسبح','مع جراج','مشترك','أخرى'] },
      { value: 'محلات وعيادات', ar: 'محلات وعيادات', subsubs: [{ value: 'محل تجاري', ar: 'محل تجاري', kw: ['محل','shop','متجر','store'] },{ value: 'عيادة طبية', ar: 'عيادة طبية', kw: ['عيادة','clinic'] },{ value: 'صيدلية', ar: 'صيدلية', kw: ['صيدلية','pharmacy'] },{ value: 'كوفي شوب', ar: 'كوفي شوب', kw: ['كوفي','cafe','كافيه'] },{ value: 'مطعم جاهز', ar: 'مطعم جاهز', kw: ['مطعم','restaurant'] },{ value: 'معرض', ar: 'معرض', kw: ['معرض','showroom'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['جاهز للتشغيل','قيد الإنشاء','يحتاج تجهيز','أخرى'] },
      { value: 'أراضي', ar: 'أراضي', subsubs: [{ value: 'سكنية', ar: 'سكنية', kw: ['سكنية','residential'] },{ value: 'زراعية', ar: 'زراعية', kw: ['زراعية','agricultural','مزرعة'] },{ value: 'تجارية', ar: 'تجارية', kw: ['تجارية','commercial'] },{ value: 'صناعية', ar: 'صناعية', kw: ['صناعية','industrial'] },{ value: 'سياحية', ar: 'سياحية', kw: ['سياحية','touristic'] },{ value: 'صحراوية', ar: 'صحراوية', kw: ['صحراوية','desert'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['مسورة','مع خدمات كاملة','بدون خدمات','مع رخصة بناء','أخرى'] },
      { value: 'مكاتب وإدارية', ar: 'مكاتب وإدارية', subsubs: [{ value: 'مكتب', ar: 'مكتب', kw: ['مكتب','office'] },{ value: 'طابق إداري كامل', ar: 'طابق إداري كامل', kw: ['طابق','floor'] },{ value: 'شركة مجهزة', ar: 'شركة مجهزة', kw: ['شركة مجهزة','equipped'] },{ value: 'Co-working مشترك', ar: 'Co-working مشترك', kw: ['مشترك','coworking','shared'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['مفروش','غير مفروش','مع إنترنت','بدون تجهيز','أخرى'] },
      { value: 'مخازن ومستودعات', ar: 'مخازن ومستودعات', subsubs: [{ value: 'مستودع', ar: 'مستودع', kw: ['مستودع','warehouse'] },{ value: 'هنجر', ar: 'هنجر', kw: ['هنجر','hangar'] },{ value: 'ثلاجة تبريد', ar: 'ثلاجة تبريد', kw: ['ثلاجة تبريد','cold storage'] },{ value: 'منطقة لوجستية', ar: 'منطقة لوجستية', kw: ['لوجستية','logistics'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['صغير <500م','متوسط 500-2000م','كبير >2000م','أخرى'] },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['شقة','فيلا','أرض','مكتب','محل','عقار','apartment','villa','land','office'],
  },

  Electronics: {
    ar: 'إلكترونيات',
    subcategories: [
      { value: 'موبايلات', ar: 'موبايلات', subsubs: [{ value: 'آيفون', ar: 'آيفون', kw: ['iphone','ايفون','آيفون'] },{ value: 'سامسونج', ar: 'سامسونج', kw: ['samsung','سامسونج','galaxy'] },{ value: 'شاومي', ar: 'شاومي', kw: ['xiaomi','شاومي','redmi','poco'] },{ value: 'هواوي', ar: 'هواوي', kw: ['huawei','هواوي'] },{ value: 'أوبو', ar: 'أوبو', kw: ['oppo','أوبو'] },{ value: 'فيفو', ar: 'فيفو', kw: ['vivo','فيفو'] },{ value: 'ريلمي', ar: 'ريلمي', kw: ['realme','ريلمي'] },{ value: 'جوجل بيكسل', ar: 'جوجل بيكسل', kw: ['pixel','بيكسل','google phone'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['64GB','128GB','256GB','512GB','1TB','أخرى'] },
      { value: 'لابتوب', ar: 'لابتوب', subsubs: [{ value: 'HP', ar: 'HP', kw: ['hp','هي بي','hewlett'] },{ value: 'ديل', ar: 'ديل', kw: ['dell','ديل','xps','inspiron'] },{ value: 'لينوفو', ar: 'لينوفو', kw: ['lenovo','لينوفو','thinkpad','ideapad'] },{ value: 'أسوس', ar: 'أسوس', kw: ['asus','اسوس','zenbook','vivobook'] },{ value: 'أيسر', ar: 'أيسر', kw: ['acer','ايسر','aspire','nitro'] },{ value: 'ماك/آبل', ar: 'ماك/آبل', kw: ['macbook','ماك','apple laptop','mac'] },{ value: 'سامسونج', ar: 'سامسونج', kw: ['samsung laptop','سامسونج لابتوب'] },{ value: 'MSI', ar: 'MSI', kw: ['msi','gaming laptop','omen','alienware','legion'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['Core i3/Ryzen 3','Core i5/Ryzen 5','Core i7/Ryzen 7','Core i9/Ryzen 9','Apple M-Series','أخرى'] },
      { value: 'تلفزيونات وشاشات', ar: 'تلفزيونات وشاشات', subsubs: [{ value: 'OLED', ar: 'OLED', kw: ['oled'] },{ value: 'QLED/AMOLED', ar: 'QLED/AMOLED', kw: ['qled','amoled'] },{ value: 'LED ذكي', ar: 'LED ذكي', kw: ['smart','سمارت','led tv','android tv'] },{ value: 'شاشة كمبيوتر', ar: 'شاشة كمبيوتر', kw: ['monitor','شاشة كمبيوتر','شاشة pc'] },{ value: 'بروجيكتور', ar: 'بروجيكتور', kw: ['projector','بروجيكتور','data show'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['32 بوصة','43 بوصة','55 بوصة','65 بوصة','75 بوصة+','أخرى'] },
      { value: 'كاميرات', ar: 'كاميرات', subsubs: [{ value: 'DSLR/ميرورليس', ar: 'DSLR/ميرورليس', kw: ['dslr','mirrorless','ميرورليس','canon','nikon','sony alpha'] },{ value: 'كاميرا مراقبة', ar: 'كاميرا مراقبة', kw: ['مراقبة','security','cctv','ip camera'] },{ value: 'أكشن كام GoPro', ar: 'أكشن كام GoPro', kw: ['gopro','action','أكشن'] },{ value: 'طائرة/درون', ar: 'طائرة/درون', kw: ['drone','درون','طائرة مسيرة','dji'] },{ value: 'كاميرا فيديو', ar: 'كاميرا فيديو', kw: ['video camera','كاميرا فيديو','camcorder'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['كانون','نيكون','سوني','فوجي فيلم','باناسونيك','DJI','أخرى'] },
      { value: 'أجهزة منزلية', ar: 'أجهزة منزلية', subsubs: [{ value: 'ثلاجة', ar: 'ثلاجة', kw: ['ثلاجة','fridge','refrigerator'] },{ value: 'غسالة', ar: 'غسالة', kw: ['غسالة','washing machine','washer'] },{ value: 'تكييف مسبليت', ar: 'تكييف مسبليت', kw: ['تكييف','split','ac','air condition'] },{ value: 'بوتاجاز وأفران', ar: 'بوتاجاز وأفران', kw: ['بوتاجاز','أفران','oven','cooker'] },{ value: 'مكيف شباك', ar: 'مكيف شباك', kw: ['مكيف شباك','window ac'] },{ value: 'مكنسة كهربائية', ar: 'مكنسة كهربائية', kw: ['مكنسة','vacuum'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['LG','سامسونج','كاريير','شارب','توشيبا','أريستون','أخرى'] },
      { value: 'ألعاب إلكترونية', ar: 'ألعاب إلكترونية', subsubs: [{ value: 'بلايستيشن', ar: 'بلايستيشن', kw: ['playstation','بلايستيشن','ps4','ps5','ps3'] },{ value: 'إكس بوكس', ar: 'إكس بوكس', kw: ['xbox','اكس بوكس'] },{ value: 'نينتندو', ar: 'نينتندو', kw: ['nintendo','نينتندو','switch'] },{ value: 'ألعاب PC', ar: 'ألعاب PC', kw: ['pc gaming','gaming pc','rtx','gtx'] },{ value: 'اكسسوارات جيمنج', ar: 'اكسسوارات جيمنج', kw: ['controller','يد تحكم','headset','gaming chair'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['جديد','مستعمل','للإيجار','أخرى'] },
      { value: 'اكسسوارات وصوتيات', ar: 'اكسسوارات وصوتيات', subsubs: [{ value: 'سماعات', ar: 'سماعات', kw: ['headphone','سماعة','airpods','earbuds','tws'] },{ value: 'مكبرات صوت', ar: 'مكبرات صوت', kw: ['speaker','سبيكر','jbl','marshall'] },{ value: 'تابلت', ar: 'تابلت', kw: ['ipad','آيباد','tablet','تابلت'] },{ value: 'ساعات ذكية', ar: 'ساعات ذكية', kw: ['smartwatch','ساعة ذكية','apple watch'] },{ value: 'شواحن وباورة', ar: 'شواحن وباورة', kw: ['charger','شاحن','power bank','باور بانك'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['أصلي','ثيرد بارتي','مستعمل','أخرى'] },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['موبايل','تليفون','iphone','samsung','لابتوب','تابلت','تليفزيون','كاميرا','بلايستيشن','xbox','سماعات'],
  },

  Jobs: {
    ar: 'وظائف',
    subcategories: [
      { value: 'تقنية ومعلومات', ar: 'تقنية ومعلومات', subsubs: [{ value: 'مطور برامج', ar: 'مطور برامج', kw: ['developer','مطور','programmer','مبرمج','software'] },{ value: 'مصمم UI/UX', ar: 'مصمم UI/UX', kw: ['ui','ux','مصمم','design'] },{ value: 'شبكات وأمن', ar: 'شبكات وأمن', kw: ['network','شبكات','security','أمن'] },{ value: 'دعم تقني', ar: 'دعم تقني', kw: ['support','دعم تقني','help desk'] },{ value: 'بيانات وذكاء اصطناعي', ar: 'بيانات وذكاء اصطناعي', kw: ['data','بيانات','ai','ذكاء اصطناعي'] },{ value: 'مدير مشاريع', ar: 'مدير مشاريع', kw: ['project manager','مدير مشاريع','pm'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['دوام كامل','دوام جزئي','عن بُعد','عقد محدد','تدريب','أخرى'] },
      { value: 'طبي وصحة', ar: 'طبي وصحة', subsubs: [{ value: 'طبيب', ar: 'طبيب', kw: ['doctor','طبيب','physician'] },{ value: 'صيدلاني', ar: 'صيدلاني', kw: ['pharmacist','صيدلاني'] },{ value: 'تمريض', ar: 'تمريض', kw: ['nurse','ممرض','تمريض'] },{ value: 'معالج طبيعي', ar: 'معالج طبيعي', kw: ['physiotherapy','معالج'] },{ value: 'أسنان', ar: 'أسنان', kw: ['dentist','أسنان','dental'] },{ value: 'مختبر', ar: 'مختبر', kw: ['lab','مختبر','laboratory'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['دوام كامل','دوام جزئي','عيادة خاصة','مستشفى حكومي','أخرى'] },
      { value: 'تعليم وتدريب', ar: 'تعليم وتدريب', subsubs: [{ value: 'مدرس', ar: 'مدرس', kw: ['teacher','مدرس'] },{ value: 'مدرب', ar: 'مدرب', kw: ['trainer','مدرب'] },{ value: 'أستاذ جامعي', ar: 'أستاذ جامعي', kw: ['professor','أستاذ','lecturer'] },{ value: 'معلم لغات', ar: 'معلم لغات', kw: ['language','لغات','english teacher'] },{ value: 'مشرف تربوي', ar: 'مشرف تربوي', kw: ['supervisor','مشرف تربوي'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['حضوري','أونلاين','هجين','خاص','مجموعات','أخرى'] },
      { value: 'هندسة', ar: 'هندسة', subsubs: [{ value: 'مدني وإنشائي', ar: 'مدني وإنشائي', kw: ['civil','مدني','إنشائي'] },{ value: 'كهرباء', ar: 'كهرباء', kw: ['electrical engineer','مهندس كهرباء'] },{ value: 'ميكانيكا', ar: 'ميكانيكا', kw: ['mechanical','ميكانيكا'] },{ value: 'معماري', ar: 'معماري', kw: ['architect','معماري'] },{ value: 'بترول', ar: 'بترول', kw: ['petroleum','بترول','oil'] },{ value: 'كيميائي', ar: 'كيميائي', kw: ['chemical','كيميائي'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['دوام كامل','عقد','مشروع','عن بُعد','أخرى'] },
      { value: 'مبيعات وتسويق', ar: 'مبيعات وتسويق', subsubs: [{ value: 'مندوب مبيعات', ar: 'مندوب مبيعات', kw: ['sales','مبيعات','مندوب'] },{ value: 'مسوق رقمي', ar: 'مسوق رقمي', kw: ['digital marketing','تسويق رقمي'] },{ value: 'مدير مبيعات', ar: 'مدير مبيعات', kw: ['sales manager','مدير مبيعات'] },{ value: 'خدمة عملاء', ar: 'خدمة عملاء', kw: ['customer service','خدمة عملاء','call center'] },{ value: 'تيليسيلز', ar: 'تيليسيلز', kw: ['telesales','تيليسيلز'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['براتب ثابت','عمولة','راتب + عمولة','أخرى'] },
      { value: 'مالي ومحاسبة', ar: 'مالي ومحاسبة', subsubs: [{ value: 'محاسب', ar: 'محاسب', kw: ['accountant','محاسب'] },{ value: 'مدقق حسابات', ar: 'مدقق حسابات', kw: ['auditor','مدقق'] },{ value: 'محلل مالي', ar: 'محلل مالي', kw: ['financial analyst','محلل مالي'] },{ value: 'مسؤول مشتريات', ar: 'مسؤول مشتريات', kw: ['procurement','مشتريات'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['دوام كامل','دوام جزئي','عقد','أخرى'] },
      { value: 'خدمات عامة وعمالة', ar: 'خدمات عامة وعمالة', subsubs: [{ value: 'نظافة وتنظيف', ar: 'نظافة وتنظيف', kw: ['تنظيف','cleaning','نظافة'] },{ value: 'حارس وأمن', ar: 'حارس وأمن', kw: ['security','حارس','أمن'] },{ value: 'سائق', ar: 'سائق', kw: ['driver','سائق'] },{ value: 'طباخ', ar: 'طباخ', kw: ['cook','طباخ','chef'] },{ value: 'خادمة', ar: 'خادمة', kw: ['maid','خادمة'] },{ value: 'عامل مصنع', ar: 'عامل مصنع', kw: ['worker','عامل','factory'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['إقامة + راتب','بدون إقامة','يومي','شهري','أخرى'] },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['وظيفة','مطلوب','فرصة عمل','دوام','freelance','job','work','hiring'],
  },

  Services: {
    ar: 'خدمات',
    subcategories: [
      { value: 'صيانة ومقاولات', ar: 'صيانة ومقاولات', subsubs: [{ value: 'كهرباء', ar: 'كهرباء', kw: ['كهربائي','electrician','كهرباء'] },{ value: 'سباكة', ar: 'سباكة', kw: ['سباك','plumber','سباكة','مواسير'] },{ value: 'نجارة', ar: 'نجارة', kw: ['نجار','carpenter','نجارة','خشب'] },{ value: 'بياض ودهانات', ar: 'بياض ودهانات', kw: ['دهان','painter','صبغ','بياض'] },{ value: 'تكييف', ar: 'تكييف', kw: ['تكييف','ac','air condition','مكيف'] },{ value: 'سيراميك وبلاط', ar: 'سيراميك وبلاط', kw: ['سيراميك','بلاط','tiles'] },{ value: 'حدادة', ar: 'حدادة', kw: ['حداد','حدادة','welding','لحام'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['منزلي','تجاري','صناعي','طارئ 24 ساعة','أخرى'] },
      { value: 'نقل وشحن', ar: 'نقل وشحن', subsubs: [{ value: 'نقل أثاث', ar: 'نقل أثاث', kw: ['نقل أثاث','نقل عفش','furniture moving'] },{ value: 'شحن دولي', ar: 'شحن دولي', kw: ['شحن دولي','international shipping'] },{ value: 'توصيل طرود', ar: 'توصيل طرود', kw: ['توصيل','delivery','طرود'] },{ value: 'نقل سيارات', ar: 'نقل سيارات', kw: ['نقل سيارات','car transport'] },{ value: 'مطار', ar: 'مطار', kw: ['مطار','airport','transfer'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['داخل المدينة','بين مدن','دولي','أخرى'] },
      { value: 'تعليم وتدريس', ar: 'تعليم وتدريس', subsubs: [{ value: 'دروس خصوصية', ar: 'دروس خصوصية', kw: ['دروس','tutoring','مدرس خصوصي'] },{ value: 'تدريب مهني', ar: 'تدريب مهني', kw: ['تدريب مهني','vocational'] },{ value: 'لغات أجنبية', ar: 'لغات أجنبية', kw: ['لغة إنجليزية','english','french','لغات'] },{ value: 'تحفيظ قرآن', ar: 'تحفيظ قرآن', kw: ['قرآن','quran','تجويد','حفظ'] },{ value: 'فنون وموسيقى', ar: 'فنون وموسيقى', kw: ['موسيقى','music','فنون','guitar','piano'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['في المنزل','أونلاين','في مركز','أخرى'] },
      { value: 'تصميم وإعلام', ar: 'تصميم وإعلام', subsubs: [{ value: 'تصميم جرافيك', ar: 'تصميم جرافيك', kw: ['تصميم','design','graphic','جرافيك'] },{ value: 'تصوير فوتوغرافي', ar: 'تصوير فوتوغرافي', kw: ['تصوير','photography','photographer'] },{ value: 'إنتاج فيديو', ar: 'إنتاج فيديو', kw: ['فيديو','video','production','مونتاج'] },{ value: 'برمجة مواقع', ar: 'برمجة مواقع', kw: ['موقع','website','web','برمجة'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['مشروع كامل','بالساعة','اشتراك شهري','أخرى'] },
      { value: 'رعاية ومنزل', ar: 'رعاية ومنزل', subsubs: [{ value: 'تمريض منزلي', ar: 'تمريض منزلي', kw: ['تمريض منزلي','home nursing'] },{ value: 'رعاية أطفال', ar: 'رعاية أطفال', kw: ['رعاية أطفال','babysitter','حضانة'] },{ value: 'تنظيف منازل', ar: 'تنظيف منازل', kw: ['تنظيف منزل','home cleaning'] },{ value: 'طهو وضيافة', ar: 'طهو وضيافة', kw: ['طبخ','طباخ','catering','ضيافة'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['يومي','أسبوعي','شهري','دوام كامل','أخرى'] },
      { value: 'حيوانات أليفة', ar: 'حيوانات أليفة', subsubs: [{ value: 'تدريب حيوانات', ar: 'تدريب حيوانات', kw: ['تدريب حيوانات','pet training'] },{ value: 'تزيين وعناية', ar: 'تزيين وعناية', kw: ['grooming','تزيين','عناية حيوانات'] },{ value: 'بيطري متنقل', ar: 'بيطري متنقل', kw: ['بيطري','vet','veterinary'] },{ value: 'رعاية مؤقتة', ar: 'رعاية مؤقتة', kw: ['pet sitting','رعاية مؤقتة'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['كلاب','قطط','طيور','أخرى'] },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['سباك','كهربائي','نجار','نقل','تنظيف','دروس','مدرس','تصليح','خدمة','صيانة'],
  },

  Fashion: {
    ar: 'موضة',
    subcategories: [
      { value: 'ملابس رجالي', ar: 'ملابس رجالي', subsubs: [{ value: 'قميص', ar: 'قميص', kw: ['قميص','shirt'] },{ value: 'بنطلون', ar: 'بنطلون', kw: ['بنطلون','pants','trouser'] },{ value: 'جلابية/جلباب', ar: 'جلابية/جلباب', kw: ['جلابية','جلباب','galabeya'] },{ value: 'بدلة', ar: 'بدلة', kw: ['بدلة','suit','طقم'] },{ value: 'تيشيرت', ar: 'تيشيرت', kw: ['تيشيرت','t-shirt','tshirt'] },{ value: 'جاكيت معطف', ar: 'جاكيت معطف', kw: ['جاكيت','معطف','jacket','coat'] },{ value: 'كاجوال', ar: 'كاجوال', kw: ['كاجوال','casual'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['S','M','L','XL','XXL','3XL+','Free Size','أخرى'] },
      { value: 'ملابس نسائي', ar: 'ملابس نسائي', subsubs: [{ value: 'فستان', ar: 'فستان', kw: ['فستان','dress'] },{ value: 'بلوزة', ar: 'بلوزة', kw: ['بلوزة','blouse','top'] },{ value: 'تنورة', ar: 'تنورة', kw: ['تنورة','skirt'] },{ value: 'بنطلون', ar: 'بنطلون', kw: ['بنطلون نسائي','women pants'] },{ value: 'عباءة', ar: 'عباءة', kw: ['عباءة','abaya'] },{ value: 'بيجاما', ar: 'بيجاما', kw: ['بيجاما','pajama'] },{ value: 'كاجوال', ar: 'كاجوال', kw: ['كاجوال نسائي','women casual'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['S','M','L','XL','XXL','3XL+','Free Size','أخرى'] },
      { value: 'ملابس أطفال', ar: 'ملابس أطفال', subsubs: [{ value: 'بيبي 0-2سنة', ar: 'بيبي 0-2سنة', kw: ['مواليد','baby','رضيع','0-2'] },{ value: 'أطفال 2-6سنة', ar: 'أطفال 2-6سنة', kw: ['أطفال صغار','2-6','kids'] },{ value: 'أطفال 6-12سنة', ar: 'أطفال 6-12سنة', kw: ['أطفال','6-12'] },{ value: 'تيجز 12-16سنة', ar: 'تيجز 12-16سنة', kw: ['تيجز','teen','12-16'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['بنات','أولاد','للاثنين','أخرى'] },
      { value: 'أحذية', ar: 'أحذية', subsubs: [{ value: 'رجالي', ar: 'رجالي', kw: ['حذاء رجالي','men shoes'] },{ value: 'نسائي', ar: 'نسائي', kw: ['حذاء نسائي','women shoes','كعب'] },{ value: 'أطفال', ar: 'أطفال', kw: ['حذاء أطفال','kids shoes'] },{ value: 'رياضي', ar: 'رياضي', kw: ['سنيكرز','sneakers','كوتشي','nike shoes'] },{ value: 'رسمي', ar: 'رسمي', kw: ['جزمة رسمية','formal shoes','oxford'] },{ value: 'شبشب', ar: 'شبشب', kw: ['صندل','sandal','شبشب','slippers'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['36','37','38','39','40','41','42','43','44','45','46+','أخرى'] },
      { value: 'حقائب وشنط', ar: 'حقائب وشنط', subsubs: [{ value: 'شنطة يد', ar: 'شنطة يد', kw: ['حقيبة يد','handbag','شنطة يد'] },{ value: 'حقيبة ظهر', ar: 'حقيبة ظهر', kw: ['شنطة ظهر','backpack','حقيبة ظهر'] },{ value: 'حقيبة سفر', ar: 'حقيبة سفر', kw: ['شنطة سفر','travel bag','trolley'] },{ value: 'محفظة', ar: 'محفظة', kw: ['محفظة','wallet','بورتفيه'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['جلد طبيعي','جلد صناعي','قماش','أخرى'] },
      { value: 'اكسسوارات', ar: 'اكسسوارات', subsubs: [{ value: 'ساعات', ar: 'ساعات', kw: ['ساعة','watch','rolex','casio'] },{ value: 'مجوهرات', ar: 'مجوهرات', kw: ['مجوهرات','jewelry','خاتم','عقد','ذهب','فضة'] },{ value: 'نظارات', ar: 'نظارات', kw: ['نظارة','sunglasses','ray ban'] },{ value: 'أحزمة', ar: 'أحزمة', kw: ['حزام','belt'] },{ value: 'عطور', ar: 'عطور', kw: ['عطر','perfume'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['رجالي','نسائي','للاثنين','أخرى'] },
      { value: 'عباءات وحجاب', ar: 'عباءات وحجاب', subsubs: [{ value: 'عباءة خليجية', ar: 'عباءة خليجية', kw: ['عباءة خليجية','gulf abaya'] },{ value: 'عباءة مصرية', ar: 'عباءة مصرية', kw: ['عباءة مصرية','egyptian abaya'] },{ value: 'حجاب وإيشارب', ar: 'حجاب وإيشارب', kw: ['حجاب','إيشارب','scarf'] },{ value: 'خمار ونقاب', ar: 'خمار ونقاب', kw: ['خمار','نقاب','niqab'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: ['قطن','شيفون','كريب','جورجيت','أخرى'] },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['ملابس','فستان','قميص','بنطلون','حذاء','شنطة','إكسسوار','fashion','clothes'],
  },

  Supermarket: {
    ar: 'سوبرماركت',
    subcategories: [
      { value: 'خضروات وفاكهة', ar: 'خضروات وفاكهة', subsubs: [{ value: 'خضروات', ar: 'خضروات', kw: ['خضار','خضروات','vegetables'] },{ value: 'فاكهة', ar: 'فاكهة', kw: ['فواكه','فاكهة','fruit'] },{ value: 'أعشاب', ar: 'أعشاب', kw: ['أعشاب','herbs'] },{ value: 'بهارات', ar: 'بهارات', kw: ['بهارات','spices'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'لحوم ودواجن', ar: 'لحوم ودواجن', subsubs: [{ value: 'لحم بقري', ar: 'لحم بقري', kw: ['لحم بقري','beef'] },{ value: 'دجاج', ar: 'دجاج', kw: ['دجاج','فراخ','chicken'] },{ value: 'لحم خروف', ar: 'لحم خروف', kw: ['لحم خروف','خاروف','lamb'] },{ value: 'مفروم', ar: 'مفروم', kw: ['مفروم','minced'] },{ value: 'مشكل', ar: 'مشكل', kw: ['مشكل','mixed meat'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'أسماك ومأكولات بحرية', ar: 'أسماك ومأكولات بحرية', subsubs: [{ value: 'بلطي', ar: 'بلطي', kw: ['بلطي','tilapia'] },{ value: 'جمبري', ar: 'جمبري', kw: ['جمبري','shrimp'] },{ value: 'تونا', ar: 'تونا', kw: ['تونا','tuna'] },{ value: 'سمك مشكل', ar: 'سمك مشكل', kw: ['سمك مشكل','mixed fish'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'منتجات الألبان', ar: 'منتجات الألبان', subsubs: [{ value: 'جبنة', ar: 'جبنة', kw: ['جبنة','cheese'] },{ value: 'زبادي', ar: 'زبادي', kw: ['زبادي','yogurt'] },{ value: 'لبن', ar: 'لبن', kw: ['لبن','milk'] },{ value: 'زبدة', ar: 'زبدة', kw: ['زبدة','butter'] },{ value: 'قشطة', ar: 'قشطة', kw: ['قشطة','cream'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'مواد جافة وتموين', ar: 'مواد جافة وتموين', subsubs: [{ value: 'أرز وبقوليات', ar: 'أرز وبقوليات', kw: ['أرز','rice','بقوليات','عدس'] },{ value: 'معكرونة ومكرونة', ar: 'معكرونة ومكرونة', kw: ['مكرونة','معكرونة','pasta'] },{ value: 'دقيق وسكر', ar: 'دقيق وسكر', kw: ['دقيق','سكر','flour','sugar'] },{ value: 'كونسروة', ar: 'كونسروة', kw: ['معلبات','كونسروة','canned'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'مشروبات', ar: 'مشروبات', subsubs: [{ value: 'عصائر', ar: 'عصائر', kw: ['عصير','juice'] },{ value: 'مياه', ar: 'مياه', kw: ['مياه','water'] },{ value: 'مشروبات غازية', ar: 'مشروبات غازية', kw: ['غازي','كولا','pepsi','cola'] },{ value: 'عصير طازج', ar: 'عصير طازج', kw: ['عصير طازج','fresh juice'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'منظفات ومنزلية', ar: 'منظفات ومنزلية', subsubs: [{ value: 'صابون ومنظفات', ar: 'صابون ومنظفات', kw: ['صابون','منظف','detergent'] },{ value: 'مناشف ومفارش', ar: 'مناشف ومفارش', kw: ['مناشف','مفارش','towel'] },{ value: 'أدوات مطبخ', ar: 'أدوات مطبخ', kw: ['مطبخ','kitchen','طاسة'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['غذاء','أكل','مشروب','عناية','منظف','سوبرماركت','food','grocery'],
  },

  Pharmacy: {
    ar: 'صيدلية',
    subcategories: [
      { value: 'أدوية وعلاج', ar: 'أدوية وعلاج', subsubs: [{ value: 'مسكنات', ar: 'مسكنات', kw: ['مسكن','panadol','paracetamol'] },{ value: 'مضادات حيوية', ar: 'مضادات حيوية', kw: ['مضاد حيوي','antibiotic'] },{ value: 'ضغط وسكر', ar: 'ضغط وسكر', kw: ['ضغط','سكر','blood pressure','glucose'] },{ value: 'قلب وشرايين', ar: 'قلب وشرايين', kw: ['قلب','شرايين','heart'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'مستلزمات طبية', ar: 'مستلزمات طبية', subsubs: [{ value: 'ضغط وسكر (أجهزة)', ar: 'ضغط وسكر (أجهزة)', kw: ['جهاز ضغط','جهاز سكر','omron','glucometer'] },{ value: 'تضميد وجروح', ar: 'تضميد وجروح', kw: ['تضميد','جروح','bandage'] },{ value: 'قسطرة وانابيب', ar: 'قسطرة وانابيب', kw: ['قسطرة','انابيب'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'تجميل وعناية', ar: 'تجميل وعناية', subsubs: [{ value: 'كريمات بشرة', ar: 'كريمات بشرة', kw: ['كريم','بشرة','skincare','cream'] },{ value: 'شامبو وعناية شعر', ar: 'شامبو وعناية شعر', kw: ['شامبو','شعر','shampoo','hair'] },{ value: 'عطور', ar: 'عطور', kw: ['عطر','perfume'] },{ value: 'مكياج', ar: 'مكياج', kw: ['مكياج','makeup','lipstick'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'أطفال ورضع', ar: 'أطفال ورضع', subsubs: [{ value: 'حليب أطفال', ar: 'حليب أطفال', kw: ['حليب أطفال','baby formula'] },{ value: 'حفاضات', ar: 'حفاضات', kw: ['حفاض','diaper','pampers'] },{ value: 'كريمات أطفال', ar: 'كريمات أطفال', kw: ['كريم أطفال','baby cream'] },{ value: 'مستلزمات', ar: 'مستلزمات', kw: ['مستلزمات أطفال','baby products'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'أعشاب وطبيعي', ar: 'أعشاب وطبيعي', subsubs: [{ value: 'عسل وحبة بركة', ar: 'عسل وحبة بركة', kw: ['عسل','حبة بركة','honey'] },{ value: 'زيوت طبيعية', ar: 'زيوت طبيعية', kw: ['زيت طبيعي','natural oil'] },{ value: 'أعشاب طبية', ar: 'أعشاب طبية', kw: ['أعشاب','herbal','herbs'] },{ value: 'مكملات', ar: 'مكملات', kw: ['مكمل','supplement','فيتامين','vitamin'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['دواء','صيدلية','مكمل','فيتامين','أجهزة طبية','medicine'],
  },

  'Fast Food': {
    ar: 'طعام',
    subcategories: [
      { value: 'مطاعم وكافيهات', ar: 'مطاعم وكافيهات', subsubs: [{ value: 'شاورما وكباب', ar: 'شاورما وكباب', kw: ['شاورما','كباب','shawarma'] },{ value: 'مأكولات بحرية', ar: 'مأكولات بحرية', kw: ['مأكولات بحرية','seafood'] },{ value: 'فطار وفول', ar: 'فطار وفول', kw: ['فطار','فول','فلافل','breakfast'] },{ value: 'حلويات ومشروبات', ar: 'حلويات ومشروبات', kw: ['حلويات','مشروبات','sweets','drinks'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'وجبات منزلية', ar: 'وجبات منزلية', subsubs: [{ value: 'أكل مصري', ar: 'أكل مصري', kw: ['أكل مصري','egyptian food'] },{ value: 'أكل شرقي', ar: 'أكل شرقي', kw: ['أكل شرقي','eastern food'] },{ value: 'أكل غربي', ar: 'أكل غربي', kw: ['أكل غربي','western food'] },{ value: 'حلويات منزلية', ar: 'حلويات منزلية', kw: ['حلويات منزلية','homemade sweets'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'مخابز وحلويات', ar: 'مخابز وحلويات', subsubs: [{ value: 'خبز وعيش', ar: 'خبز وعيش', kw: ['خبز','عيش','bread'] },{ value: 'كيك وتورتات', ar: 'كيك وتورتات', kw: ['كيك','تورتة','cake'] },{ value: 'حلويات شرقية', ar: 'حلويات شرقية', kw: ['كنافة','قطايف','بسبوسة'] },{ value: 'بيتزا وفطائر', ar: 'بيتزا وفطائر', kw: ['بيتزا','فطائر','pizza'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'مشروبات وعصائر', ar: 'مشروبات وعصائر', subsubs: [{ value: 'عصائر طازجة', ar: 'عصائر طازجة', kw: ['عصير طازج','fresh juice'] },{ value: 'قهوة وشاي', ar: 'قهوة وشاي', kw: ['قهوة','شاي','coffee','tea'] },{ value: 'كوكتيل', ar: 'كوكتيل', kw: ['كوكتيل','cocktail'] },{ value: 'مشروبات ساخنة', ar: 'مشروبات ساخنة', kw: ['مشروبات ساخنة','hot drinks'] },{ value: 'أخرى', ar: 'أخرى', kw: [] }], level4: [] },
      { value: 'أخرى', ar: 'أخرى', subsubs: [], level4: [] },
    ],
    keywords: ['بيتزا','برجر','ساندوتش','حلويات','مطعم','كشري','شاورما','pizza','burger'],
  },
};

// Auto-detect subcategory from text (level 2)
export function autoDetectSubcategory(category, text) {
  if (!category || !text || !CATEGORIES[category]) return 'Other';
  var lower = text.toLowerCase();
  var cat = CATEGORIES[category];
  for (var i = 0; i < cat.subcategories.length; i++) {
    var sub = cat.subcategories[i];
    if (!sub.kw) continue;
    if (sub.kw.some(function(k) { return lower.includes(k.toLowerCase()); })) return sub.value;
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

// Get level4 options for a subcategory
export function getLevel4Options(category, subcategory) {
  if (!CATEGORIES[category]) return [];
  var subs = CATEGORIES[category].subcategories;
  for (var i = 0; i < subs.length; i++) {
    if (subs[i].value === subcategory) return subs[i].level4 || [];
  }
  return [];
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
