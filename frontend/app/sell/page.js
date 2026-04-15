'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
// Offline duplicate detection replaces frontend Gemini call

// ─── Offline duplicate detection — no AI needed ────────────────────────────
function _offlineSimilarity(title1, title2) {
  if (!title1 || !title2) return 0;
  const norm = t => t.toLowerCase().replace(/[^؀-ۿ\w\s]/g, ' ').split(/\s+/).filter(w => w.length > 1);
  const words1 = new Set(norm(title1));
  const words2 = new Set(norm(title2));
  if (!words1.size || !words2.size) return 0;
  const intersection = [...words1].filter(w => words2.has(w)).length;
  const union = new Set([...words1, ...words2]).size;
  return Math.round((intersection / union) * 100);
}

function checkAdSimilarity(newTitle, existingAds) {
  if (!existingAds || existingAds.length === 0) return [];
  return existingAds
    .slice(0, 10)
    .map((ad, i) => ({ index: i + 1, similarity: _offlineSimilarity(newTitle, ad.title || ''), reason: 'عنوان مشابه' }))
    .filter(s => s.similarity >= 70);
}
// ──────────────────────────────────────────────────────────────────────────

import { classifyProduct, saveAICorrection, formatDescription } from '../../lib/imageClassifier';
import { getStatusOptions } from '../../lib/categoryStatus';
import { fetchWithRetry } from '../../lib/fetchWithRetry';
import { detectLang, detectCurrency } from '../../lib/lang';
import { COUNTRIES } from '../utils/geoDetect';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// Arabic category names mapped to English backend values
const CATS = [
  { ar: 'سيارات',         en: 'Vehicles',     icon: '🚗' },
  { ar: 'إلكترونيات',     en: 'Electronics',  icon: '📱' },
  { ar: 'عقارات',         en: 'Real Estate',  icon: '🏠' },
  { ar: 'وظائف',          en: 'Jobs',         icon: '💼' },
  { ar: 'خدمات',          en: 'Services',     icon: '🔧' },
  { ar: 'سوبرماركت',      en: 'Supermarket',  icon: '🛒' },
  { ar: 'صيدلية',         en: 'Pharmacy',     icon: '💊' },
  { ar: 'طعام',           en: 'Fast Food',    icon: '🍔' },
  { ar: 'موضة',           en: 'Fashion',      icon: '👗' },
  { ar: 'عام',            en: 'General',      icon: '📦' },
];

const CURRENCIES = ['EGP', 'SAR', 'AED', 'USD', 'EUR', 'MAD', 'TND', 'LYD', 'IQD', 'JOD'];

const CATEGORY_PRICE_HINTS = {
  'Vehicles':    { min: 5000,    max: 500000,  symbol: 'ج.م' },
  'Electronics': { min: 100,     max: 50000,   symbol: 'ج.م' },
  'Real Estate': { min: 100000,  max: 5000000, symbol: 'ج.م' },
  'Jobs':        { min: 1000,    max: 50000,   symbol: 'ج.م' },
  'Services':    { min: 50,      max: 5000,    symbol: 'ج.م' },
  'Supermarket': { min: 5,       max: 500,     symbol: 'ج.م' },
  'Pharmacy':    { min: 10,      max: 2000,    symbol: 'ج.م' },
  'Fast Food':   { min: 20,      max: 500,     symbol: 'ج.م' },
  'Fashion':     { min: 10,      max: 2000,    symbol: 'ج.م' },
  'General':     { min: 10,      max: 10000,   symbol: 'ج.م' },
};

// SUBCATS — 3 levels with optional level4 data
const SUBCATS = {
  Vehicles: [
    { v:'ملاكي', ar:'ملاكي',
      subsubs:[{v:'سيدان',ar:'سيدان'},{v:'هاتشباك',ar:'هاتشباك'},{v:'SUV',ar:'SUV'},{v:'كوبيه',ar:'كوبيه'},{v:'مينيفان',ar:'مينيفان'},{v:'بيك أب',ar:'بيك أب'},{v:'كروس أوفر',ar:'كروس أوفر'},{v:'أخرى',ar:'أخرى'}],
      level4:['تويوتا','هوندا','كيا','هيونداي','نيسان','مرسيدس','بي إم دبليو','أودي','شيري','MG','رينو','بيجو','فولكسفاغن','لكزس','إنفينيتي','سكودا','أوبل','فيات','سوزوكي','ميتسوبيشي','سيات','فورد','شيفروليه','جيب','لاند روفر','بورش','أخرى'],
    },
    { v:'دراجات نارية', ar:'دراجات نارية',
      subsubs:[{v:'رياضية',ar:'رياضية'},{v:'طرق وعرة',ar:'طرق وعرة'},{v:'سكوتر',ar:'سكوتر'},{v:'كلاسيك',ar:'كلاسيك'},{v:'ثلاثية العجلات',ar:'ثلاثية العجلات'},{v:'كهربائية',ar:'كهربائية'},{v:'أخرى',ar:'أخرى'}],
      level4:['هوندا','ياماها','سوزوكي','كاواساكي','KTM','بي إم دبليو','هارلي ديفيدسون','صيني','أخرى'],
    },
    { v:'تجاري', ar:'تجاري',
      subsubs:[{v:'شاحنة نقل',ar:'شاحنة نقل'},{v:'ميكروباص',ar:'ميكروباص'},{v:'ونيت',ar:'ونيت'},{v:'جرار أرضي',ar:'جرار أرضي'},{v:'توك توك',ar:'توك توك'},{v:'كرفانة',ar:'كرفانة'},{v:'مقطورة',ar:'مقطورة'},{v:'أخرى',ar:'أخرى'}],
      level4:['إيسوزو','مرسيدس','مان','فولفو','كيا','فورد','هيونداي','هونغ يانغ','يونايتد','أخرى'],
    },
    { v:'قطع غيار', ar:'قطع غيار',
      subsubs:[{v:'محرك وقير',ar:'محرك وقير'},{v:'كهرباء وإلكترونيات',ar:'كهرباء وإلكترونيات'},{v:'هيكل وبودي',ar:'هيكل وبودي'},{v:'إطارات وجنوط',ar:'إطارات وجنوط'},{v:'زيوت وفلاتر',ar:'زيوت وفلاتر'},{v:'اكسسوارات',ar:'اكسسوارات'},{v:'أخرى',ar:'أخرى'}],
      level4:['أصلي OEM','جينيون','تشاينيز','مستعمل بحالة جيدة','أخرى'],
    },
    { v:'مراكب وقوارب', ar:'مراكب وقوارب',
      subsubs:[{v:'قارب بمحرك',ar:'قارب بمحرك'},{v:'قارب صيد',ar:'قارب صيد'},{v:'يخت',ar:'يخت'},{v:'زورق',ar:'زورق'},{v:'كانو وكياك',ar:'كانو وكياك'},{v:'جت سكي',ar:'جت سكي'},{v:'أخرى',ar:'أخرى'}],
      level4:['هيومان','باهيا','مركبة مصرية','مستورد','أخرى'],
    },
    { v:'آليات زراعية', ar:'آليات زراعية',
      subsubs:[{v:'جرار زراعي',ar:'جرار زراعي'},{v:'حصادة',ar:'حصادة'},{v:'مضخة مياه',ar:'مضخة مياه'},{v:'تيلر',ar:'تيلر'},{v:'رشاش',ar:'رشاش'},{v:'أخرى',ar:'أخرى'}],
      level4:['جون ديار','ماسي فيرجسون','كوبوتا','نيو هولاند','فيات آجري','صيني','أخرى'],
    },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
  Electronics: [
    { v:'موبايلات', ar:'موبايلات',
      subsubs:[{v:'آيفون',ar:'آيفون'},{v:'سامسونج',ar:'سامسونج'},{v:'شاومي',ar:'شاومي'},{v:'هواوي',ar:'هواوي'},{v:'أوبو',ar:'أوبو'},{v:'فيفو',ar:'فيفو'},{v:'ريلمي',ar:'ريلمي'},{v:'جوجل بيكسل',ar:'جوجل بيكسل'},{v:'أخرى',ar:'أخرى'}],
      level4:['64GB','128GB','256GB','512GB','1TB','أخرى'],
    },
    { v:'لابتوب', ar:'لابتوب',
      subsubs:[{v:'HP',ar:'HP'},{v:'ديل',ar:'ديل'},{v:'لينوفو',ar:'لينوفو'},{v:'أسوس',ar:'أسوس'},{v:'أيسر',ar:'أيسر'},{v:'ماك/آبل',ar:'ماك/آبل'},{v:'سامسونج',ar:'سامسونج'},{v:'MSI',ar:'MSI'},{v:'أخرى',ar:'أخرى'}],
      level4:['Core i3/Ryzen 3','Core i5/Ryzen 5','Core i7/Ryzen 7','Core i9/Ryzen 9','Apple M-Series','أخرى'],
    },
    { v:'تلفزيونات وشاشات', ar:'تلفزيونات وشاشات',
      subsubs:[{v:'OLED',ar:'OLED'},{v:'QLED/AMOLED',ar:'QLED/AMOLED'},{v:'LED ذكي',ar:'LED ذكي'},{v:'شاشة كمبيوتر',ar:'شاشة كمبيوتر'},{v:'بروجيكتور',ar:'بروجيكتور'},{v:'أخرى',ar:'أخرى'}],
      level4:['32 بوصة','43 بوصة','55 بوصة','65 بوصة','75 بوصة+','أخرى'],
    },
    { v:'كاميرات', ar:'كاميرات',
      subsubs:[{v:'DSLR/ميرورليس',ar:'DSLR/ميرورليس'},{v:'كاميرا مراقبة',ar:'كاميرا مراقبة'},{v:'أكشن كام GoPro',ar:'أكشن كام GoPro'},{v:'طائرة/درون',ar:'طائرة/درون'},{v:'كاميرا فيديو',ar:'كاميرا فيديو'},{v:'أخرى',ar:'أخرى'}],
      level4:['كانون','نيكون','سوني','فوجي فيلم','باناسونيك','DJI','أخرى'],
    },
    { v:'أجهزة منزلية', ar:'أجهزة منزلية',
      subsubs:[{v:'ثلاجة',ar:'ثلاجة'},{v:'غسالة',ar:'غسالة'},{v:'تكييف مسبليت',ar:'تكييف مسبليت'},{v:'بوتاجاز وأفران',ar:'بوتاجاز وأفران'},{v:'مكيف شباك',ar:'مكيف شباك'},{v:'مكنسة كهربائية',ar:'مكنسة كهربائية'},{v:'أخرى',ar:'أخرى'}],
      level4:['LG','سامسونج','كاريير','شارب','توشيبا','أريستون','أخرى'],
    },
    { v:'ألعاب إلكترونية', ar:'ألعاب إلكترونية',
      subsubs:[{v:'بلايستيشن',ar:'بلايستيشن'},{v:'إكس بوكس',ar:'إكس بوكس'},{v:'نينتندو',ar:'نينتندو'},{v:'ألعاب PC',ar:'ألعاب PC'},{v:'اكسسوارات جيمنج',ar:'اكسسوارات جيمنج'},{v:'أخرى',ar:'أخرى'}],
      level4:['جديد','مستعمل','للإيجار','أخرى'],
    },
    { v:'اكسسوارات وصوتيات', ar:'اكسسوارات وصوتيات',
      subsubs:[{v:'سماعات',ar:'سماعات'},{v:'مكبرات صوت',ar:'مكبرات صوت'},{v:'تابلت',ar:'تابلت'},{v:'ساعات ذكية',ar:'ساعات ذكية'},{v:'شواحن وباورة',ar:'شواحن وباورة'},{v:'أخرى',ar:'أخرى'}],
      level4:['أصلي','ثيرد بارتي','مستعمل','أخرى'],
    },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
  'Real Estate': [
    { v:'شقق', ar:'شقق',
      subsubs:[{v:'استوديو',ar:'استوديو'},{v:'1 غرفة',ar:'1 غرفة'},{v:'2 غرفة',ar:'2 غرفة'},{v:'3 غرف',ar:'3 غرف'},{v:'4 غرف+',ar:'4 غرف+'},{v:'دوبلكس',ar:'دوبلكس'},{v:'بنتهاوس',ar:'بنتهاوس'},{v:'أخرى',ar:'أخرى'}],
      level4:['مفروشة','نصف مفروشة','غير مفروشة','سوبر لوكس','قيد الإنشاء','أخرى'],
    },
    { v:'فيلات ومنازل', ar:'فيلات ومنازل',
      subsubs:[{v:'فيلا مستقلة',ar:'فيلا مستقلة'},{v:'دوبلكس',ar:'دوبلكس'},{v:'تاون هاوس',ar:'تاون هاوس'},{v:'منزل شعبي',ar:'منزل شعبي'},{v:'شاليه',ar:'شاليه'},{v:'قصر',ar:'قصر'},{v:'أخرى',ar:'أخرى'}],
      level4:['مفروش','غير مفروش','مع مسبح','مع جراج','مشترك','أخرى'],
    },
    { v:'محلات وعيادات', ar:'محلات وعيادات',
      subsubs:[{v:'محل تجاري',ar:'محل تجاري'},{v:'عيادة طبية',ar:'عيادة طبية'},{v:'صيدلية',ar:'صيدلية'},{v:'كوفي شوب',ar:'كوفي شوب'},{v:'مطعم جاهز',ar:'مطعم جاهز'},{v:'معرض',ar:'معرض'},{v:'أخرى',ar:'أخرى'}],
      level4:['جاهز للتشغيل','قيد الإنشاء','يحتاج تجهيز','أخرى'],
    },
    { v:'أراضي', ar:'أراضي',
      subsubs:[{v:'سكنية',ar:'سكنية'},{v:'زراعية',ar:'زراعية'},{v:'تجارية',ar:'تجارية'},{v:'صناعية',ar:'صناعية'},{v:'سياحية',ar:'سياحية'},{v:'صحراوية',ar:'صحراوية'},{v:'أخرى',ar:'أخرى'}],
      level4:['مسورة','مع خدمات كاملة','بدون خدمات','مع رخصة بناء','أخرى'],
    },
    { v:'مكاتب وإدارية', ar:'مكاتب وإدارية',
      subsubs:[{v:'مكتب',ar:'مكتب'},{v:'طابق إداري كامل',ar:'طابق إداري كامل'},{v:'شركة مجهزة',ar:'شركة مجهزة'},{v:'Co-working مشترك',ar:'Co-working مشترك'},{v:'أخرى',ar:'أخرى'}],
      level4:['مفروش','غير مفروش','مع إنترنت','بدون تجهيز','أخرى'],
    },
    { v:'مخازن ومستودعات', ar:'مخازن ومستودعات',
      subsubs:[{v:'مستودع',ar:'مستودع'},{v:'هنجر',ar:'هنجر'},{v:'ثلاجة تبريد',ar:'ثلاجة تبريد'},{v:'منطقة لوجستية',ar:'منطقة لوجستية'},{v:'أخرى',ar:'أخرى'}],
      level4:['صغير <500م','متوسط 500-2000م','كبير >2000م','أخرى'],
    },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
  Jobs: [
    { v:'تقنية ومعلومات', ar:'تقنية ومعلومات',
      subsubs:[{v:'مطور برامج',ar:'مطور برامج'},{v:'مصمم UI/UX',ar:'مصمم UI/UX'},{v:'شبكات وأمن',ar:'شبكات وأمن'},{v:'دعم تقني',ar:'دعم تقني'},{v:'بيانات وذكاء اصطناعي',ar:'بيانات وذكاء اصطناعي'},{v:'مدير مشاريع',ar:'مدير مشاريع'},{v:'أخرى',ar:'أخرى'}],
      level4:['دوام كامل','دوام جزئي','عن بُعد','عقد محدد','تدريب','أخرى'],
    },
    { v:'طبي وصحة', ar:'طبي وصحة',
      subsubs:[{v:'طبيب',ar:'طبيب'},{v:'صيدلاني',ar:'صيدلاني'},{v:'تمريض',ar:'تمريض'},{v:'معالج طبيعي',ar:'معالج طبيعي'},{v:'أسنان',ar:'أسنان'},{v:'مختبر',ar:'مختبر'},{v:'أخرى',ar:'أخرى'}],
      level4:['دوام كامل','دوام جزئي','عيادة خاصة','مستشفى حكومي','أخرى'],
    },
    { v:'تعليم وتدريب', ar:'تعليم وتدريب',
      subsubs:[{v:'مدرس',ar:'مدرس'},{v:'مدرب',ar:'مدرب'},{v:'أستاذ جامعي',ar:'أستاذ جامعي'},{v:'معلم لغات',ar:'معلم لغات'},{v:'مشرف تربوي',ar:'مشرف تربوي'},{v:'أخرى',ar:'أخرى'}],
      level4:['حضوري','أونلاين','هجين','خاص','مجموعات','أخرى'],
    },
    { v:'هندسة', ar:'هندسة',
      subsubs:[{v:'مدني وإنشائي',ar:'مدني وإنشائي'},{v:'كهرباء',ar:'كهرباء'},{v:'ميكانيكا',ar:'ميكانيكا'},{v:'معماري',ar:'معماري'},{v:'بترول',ar:'بترول'},{v:'كيميائي',ar:'كيميائي'},{v:'أخرى',ar:'أخرى'}],
      level4:['دوام كامل','عقد','مشروع','عن بُعد','أخرى'],
    },
    { v:'مبيعات وتسويق', ar:'مبيعات وتسويق',
      subsubs:[{v:'مندوب مبيعات',ar:'مندوب مبيعات'},{v:'مسوق رقمي',ar:'مسوق رقمي'},{v:'مدير مبيعات',ar:'مدير مبيعات'},{v:'خدمة عملاء',ar:'خدمة عملاء'},{v:'تيليسيلز',ar:'تيليسيلز'},{v:'أخرى',ar:'أخرى'}],
      level4:['براتب ثابت','عمولة','راتب + عمولة','أخرى'],
    },
    { v:'مالي ومحاسبة', ar:'مالي ومحاسبة',
      subsubs:[{v:'محاسب',ar:'محاسب'},{v:'مدقق حسابات',ar:'مدقق حسابات'},{v:'محلل مالي',ar:'محلل مالي'},{v:'مسؤول مشتريات',ar:'مسؤول مشتريات'},{v:'أخرى',ar:'أخرى'}],
      level4:['دوام كامل','دوام جزئي','عقد','أخرى'],
    },
    { v:'خدمات عامة وعمالة', ar:'خدمات عامة وعمالة',
      subsubs:[{v:'نظافة وتنظيف',ar:'نظافة وتنظيف'},{v:'حارس وأمن',ar:'حارس وأمن'},{v:'سائق',ar:'سائق'},{v:'طباخ',ar:'طباخ'},{v:'خادمة',ar:'خادمة'},{v:'عامل مصنع',ar:'عامل مصنع'},{v:'أخرى',ar:'أخرى'}],
      level4:['إقامة + راتب','بدون إقامة','يومي','شهري','أخرى'],
    },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
  Services: [
    { v:'صيانة ومقاولات', ar:'صيانة ومقاولات',
      subsubs:[{v:'كهرباء',ar:'كهرباء'},{v:'سباكة',ar:'سباكة'},{v:'نجارة',ar:'نجارة'},{v:'بياض ودهانات',ar:'بياض ودهانات'},{v:'تكييف',ar:'تكييف'},{v:'سيراميك وبلاط',ar:'سيراميك وبلاط'},{v:'حدادة',ar:'حدادة'},{v:'أخرى',ar:'أخرى'}],
      level4:['منزلي','تجاري','صناعي','طارئ 24 ساعة','أخرى'],
    },
    { v:'نقل وشحن', ar:'نقل وشحن',
      subsubs:[{v:'نقل أثاث',ar:'نقل أثاث'},{v:'شحن دولي',ar:'شحن دولي'},{v:'توصيل طرود',ar:'توصيل طرود'},{v:'نقل سيارات',ar:'نقل سيارات'},{v:'مطار',ar:'مطار'},{v:'أخرى',ar:'أخرى'}],
      level4:['داخل المدينة','بين مدن','دولي','أخرى'],
    },
    { v:'تعليم وتدريس', ar:'تعليم وتدريس',
      subsubs:[{v:'دروس خصوصية',ar:'دروس خصوصية'},{v:'تدريب مهني',ar:'تدريب مهني'},{v:'لغات أجنبية',ar:'لغات أجنبية'},{v:'تحفيظ قرآن',ar:'تحفيظ قرآن'},{v:'فنون وموسيقى',ar:'فنون وموسيقى'},{v:'أخرى',ar:'أخرى'}],
      level4:['في المنزل','أونلاين','في مركز','أخرى'],
    },
    { v:'تصميم وإعلام', ar:'تصميم وإعلام',
      subsubs:[{v:'تصميم جرافيك',ar:'تصميم جرافيك'},{v:'تصوير فوتوغرافي',ar:'تصوير فوتوغرافي'},{v:'إنتاج فيديو',ar:'إنتاج فيديو'},{v:'برمجة مواقع',ar:'برمجة مواقع'},{v:'أخرى',ar:'أخرى'}],
      level4:['مشروع كامل','بالساعة','اشتراك شهري','أخرى'],
    },
    { v:'رعاية ومنزل', ar:'رعاية ومنزل',
      subsubs:[{v:'تمريض منزلي',ar:'تمريض منزلي'},{v:'رعاية أطفال',ar:'رعاية أطفال'},{v:'تنظيف منازل',ar:'تنظيف منازل'},{v:'طهو وضيافة',ar:'طهو وضيافة'},{v:'أخرى',ar:'أخرى'}],
      level4:['يومي','أسبوعي','شهري','دوام كامل','أخرى'],
    },
    { v:'حيوانات أليفة', ar:'حيوانات أليفة',
      subsubs:[{v:'تدريب حيوانات',ar:'تدريب حيوانات'},{v:'تزيين وعناية',ar:'تزيين وعناية'},{v:'بيطري متنقل',ar:'بيطري متنقل'},{v:'رعاية مؤقتة',ar:'رعاية مؤقتة'},{v:'أخرى',ar:'أخرى'}],
      level4:['كلاب','قطط','طيور','أخرى'],
    },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
  Supermarket: [
    { v:'خضروات وفاكهة', ar:'خضروات وفاكهة', subsubs:[{v:'خضروات',ar:'خضروات'},{v:'فاكهة',ar:'فاكهة'},{v:'أعشاب',ar:'أعشاب'},{v:'بهارات',ar:'بهارات'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'لحوم ودواجن', ar:'لحوم ودواجن', subsubs:[{v:'لحم بقري',ar:'لحم بقري'},{v:'دجاج',ar:'دجاج'},{v:'لحم خروف',ar:'لحم خروف'},{v:'مفروم',ar:'مفروم'},{v:'مشكل',ar:'مشكل'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'أسماك ومأكولات بحرية', ar:'أسماك ومأكولات بحرية', subsubs:[{v:'بلطي',ar:'بلطي'},{v:'جمبري',ar:'جمبري'},{v:'تونا',ar:'تونا'},{v:'سمك مشكل',ar:'سمك مشكل'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'منتجات الألبان', ar:'منتجات الألبان', subsubs:[{v:'جبنة',ar:'جبنة'},{v:'زبادي',ar:'زبادي'},{v:'لبن',ar:'لبن'},{v:'زبدة',ar:'زبدة'},{v:'قشطة',ar:'قشطة'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'مواد جافة وتموين', ar:'مواد جافة وتموين', subsubs:[{v:'أرز وبقوليات',ar:'أرز وبقوليات'},{v:'معكرونة ومكرونة',ar:'معكرونة ومكرونة'},{v:'دقيق وسكر',ar:'دقيق وسكر'},{v:'كونسروة',ar:'كونسروة'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'مشروبات', ar:'مشروبات', subsubs:[{v:'عصائر',ar:'عصائر'},{v:'مياه',ar:'مياه'},{v:'مشروبات غازية',ar:'مشروبات غازية'},{v:'عصير طازج',ar:'عصير طازج'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'منظفات ومنزلية', ar:'منظفات ومنزلية', subsubs:[{v:'صابون ومنظفات',ar:'صابون ومنظفات'},{v:'مناشف ومفارش',ar:'مناشف ومفارش'},{v:'أدوات مطبخ',ar:'أدوات مطبخ'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
  Pharmacy: [
    { v:'أدوية وعلاج', ar:'أدوية وعلاج', subsubs:[{v:'مسكنات',ar:'مسكنات'},{v:'مضادات حيوية',ar:'مضادات حيوية'},{v:'ضغط وسكر',ar:'ضغط وسكر'},{v:'قلب وشرايين',ar:'قلب وشرايين'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'مستلزمات طبية', ar:'مستلزمات طبية', subsubs:[{v:'ضغط وسكر (أجهزة)',ar:'ضغط وسكر (أجهزة)'},{v:'تضميد وجروح',ar:'تضميد وجروح'},{v:'قسطرة وانابيب',ar:'قسطرة وانابيب'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'تجميل وعناية', ar:'تجميل وعناية', subsubs:[{v:'كريمات بشرة',ar:'كريمات بشرة'},{v:'شامبو وعناية شعر',ar:'شامبو وعناية شعر'},{v:'عطور',ar:'عطور'},{v:'مكياج',ar:'مكياج'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'أطفال ورضع', ar:'أطفال ورضع', subsubs:[{v:'حليب أطفال',ar:'حليب أطفال'},{v:'حفاضات',ar:'حفاضات'},{v:'كريمات أطفال',ar:'كريمات أطفال'},{v:'مستلزمات',ar:'مستلزمات'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'أعشاب وطبيعي', ar:'أعشاب وطبيعي', subsubs:[{v:'عسل وحبة بركة',ar:'عسل وحبة بركة'},{v:'زيوت طبيعية',ar:'زيوت طبيعية'},{v:'أعشاب طبية',ar:'أعشاب طبية'},{v:'مكملات',ar:'مكملات'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
  'Fast Food': [
    { v:'مطاعم وكافيهات', ar:'مطاعم وكافيهات', subsubs:[{v:'شاورما وكباب',ar:'شاورما وكباب'},{v:'مأكولات بحرية',ar:'مأكولات بحرية'},{v:'فطار وفول',ar:'فطار وفول'},{v:'حلويات ومشروبات',ar:'حلويات ومشروبات'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'وجبات منزلية', ar:'وجبات منزلية', subsubs:[{v:'أكل مصري',ar:'أكل مصري'},{v:'أكل شرقي',ar:'أكل شرقي'},{v:'أكل غربي',ar:'أكل غربي'},{v:'حلويات منزلية',ar:'حلويات منزلية'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'مخابز وحلويات', ar:'مخابز وحلويات', subsubs:[{v:'خبز وعيش',ar:'خبز وعيش'},{v:'كيك وتورتات',ar:'كيك وتورتات'},{v:'حلويات شرقية',ar:'حلويات شرقية'},{v:'بيتزا وفطائر',ar:'بيتزا وفطائر'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'مشروبات وعصائر', ar:'مشروبات وعصائر', subsubs:[{v:'عصائر طازجة',ar:'عصائر طازجة'},{v:'قهوة وشاي',ar:'قهوة وشاي'},{v:'كوكتيل',ar:'كوكتيل'},{v:'مشروبات ساخنة',ar:'مشروبات ساخنة'},{v:'أخرى',ar:'أخرى'}], level4:[] },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
  Fashion: [
    { v:'ملابس رجالي', ar:'ملابس رجالي',
      subsubs:[{v:'قميص',ar:'قميص'},{v:'بنطلون',ar:'بنطلون'},{v:'جلابية/جلباب',ar:'جلابية/جلباب'},{v:'بدلة',ar:'بدلة'},{v:'تيشيرت',ar:'تيشيرت'},{v:'جاكيت معطف',ar:'جاكيت معطف'},{v:'كاجوال',ar:'كاجوال'},{v:'أخرى',ar:'أخرى'}],
      level4:['S','M','L','XL','XXL','3XL+','Free Size','أخرى'],
    },
    { v:'ملابس نسائي', ar:'ملابس نسائي',
      subsubs:[{v:'فستان',ar:'فستان'},{v:'بلوزة',ar:'بلوزة'},{v:'تنورة',ar:'تنورة'},{v:'بنطلون',ar:'بنطلون'},{v:'عباءة',ar:'عباءة'},{v:'بيجاما',ar:'بيجاما'},{v:'كاجوال',ar:'كاجوال'},{v:'أخرى',ar:'أخرى'}],
      level4:['S','M','L','XL','XXL','3XL+','Free Size','أخرى'],
    },
    { v:'ملابس أطفال', ar:'ملابس أطفال',
      subsubs:[{v:'بيبي 0-2سنة',ar:'بيبي 0-2سنة'},{v:'أطفال 2-6سنة',ar:'أطفال 2-6سنة'},{v:'أطفال 6-12سنة',ar:'أطفال 6-12سنة'},{v:'تيجز 12-16سنة',ar:'تيجز 12-16سنة'},{v:'أخرى',ar:'أخرى'}],
      level4:['بنات','أولاد','للاثنين','أخرى'],
    },
    { v:'أحذية', ar:'أحذية',
      subsubs:[{v:'رجالي',ar:'رجالي'},{v:'نسائي',ar:'نسائي'},{v:'أطفال',ar:'أطفال'},{v:'رياضي',ar:'رياضي'},{v:'رسمي',ar:'رسمي'},{v:'شبشب',ar:'شبشب'},{v:'أخرى',ar:'أخرى'}],
      level4:['36','37','38','39','40','41','42','43','44','45','46+','أخرى'],
    },
    { v:'حقائب وشنط', ar:'حقائب وشنط',
      subsubs:[{v:'شنطة يد',ar:'شنطة يد'},{v:'حقيبة ظهر',ar:'حقيبة ظهر'},{v:'حقيبة سفر',ar:'حقيبة سفر'},{v:'محفظة',ar:'محفظة'},{v:'أخرى',ar:'أخرى'}],
      level4:['جلد طبيعي','جلد صناعي','قماش','أخرى'],
    },
    { v:'اكسسوارات', ar:'اكسسوارات',
      subsubs:[{v:'ساعات',ar:'ساعات'},{v:'مجوهرات',ar:'مجوهرات'},{v:'نظارات',ar:'نظارات'},{v:'أحزمة',ar:'أحزمة'},{v:'عطور',ar:'عطور'},{v:'أخرى',ar:'أخرى'}],
      level4:['رجالي','نسائي','للاثنين','أخرى'],
    },
    { v:'عباءات وحجاب', ar:'عباءات وحجاب',
      subsubs:[{v:'عباءة خليجية',ar:'عباءة خليجية'},{v:'عباءة مصرية',ar:'عباءة مصرية'},{v:'حجاب وإيشارب',ar:'حجاب وإيشارب'},{v:'خمار ونقاب',ar:'خمار ونقاب'},{v:'أخرى',ar:'أخرى'}],
      level4:['قطن','شيفون','كريب','جورجيت','أخرى'],
    },
    { v:'أخرى', ar:'أخرى', subsubs:[], level4:[] },
  ],
};

function CategoryPriceHint({ category }) {
  const hint = CATEGORY_PRICE_HINTS[category];
  if (!hint) return null;
  return (
    <div style={{
      marginTop: 6, padding: '7px 12px', borderRadius: 8,
      background: 'rgba(99,102,241,0.07)', border: '1px solid rgba(99,102,241,0.18)',
      direction: 'rtl', textAlign: 'right', fontSize: 13,
    }}>
      <span style={{ color: '#6366f1', fontWeight: 700 }}>💡 نطاق السعر المقترح: </span>
      <span style={{ color: '#374151' }}>
        {hint.min.toLocaleString('ar-EG')} – {hint.max.toLocaleString('ar-EG')} {hint.symbol}
      </span>
    </div>
  );
}

export default function SellPage() {
  const [step, setStep] = useState('start'); // start | form
  const [form, setForm] = useState({
    title: '', description: '', category: '', subcategory: '',
    price: '', city: '', phone: '', currency: 'EGP', condition: '',
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [aiStatus, setAiStatus] = useState('');
  const [token, setToken] = useState('');
  const [country, setCountry] = useState('EG');
  const [charCount, setCharCount] = useState(0);
  const [aiDebounce, setAiDebounce] = useState(null);
  const subsubRef = useRef(null);
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [subsub, setSubsub] = useState('');
  const [level4, setLevel4] = useState('');
  const [selectedLevel4Options, setSelectedLevel4Options] = useState([]);
  const [dynamicSubsubOptions, setDynamicSubsubOptions] = useState([]);
  const [subsubLoading, setSubsubLoading] = useState(false);

  // Inject subsubPulse animation
  useEffect(() => {
    const id = 'subsub-pulse-style';
    if (!document.getElementById(id)) {
      const el = document.createElement('style');
      el.id = id;
      el.textContent = '@keyframes subsubPulse{0%,100%{border-color:#e53e3e}50%{border-color:rgba(229,62,62,.35)}}@keyframes spin{to{transform:rotate(360deg)}}';
      document.head.appendChild(el);
    }
    return () => { const el = document.getElementById('subsub-pulse-style'); if (el) el.remove(); };
  }, []);

  // Fetch dynamic subsub options from AI-learned DB when category+subcategory changes
  useEffect(() => {
    if (!form.category || !form.subcategory || form.subcategory === 'أخرى') {
      setDynamicSubsubOptions([]);
      return;
    }
    let cancelled = false;
    setSubsubLoading(true);
    fetch(`${API}/api/ads/subsub-options?category=${encodeURIComponent(form.category)}&subcategory=${encodeURIComponent(form.subcategory)}`)
      .then(r => r.json())
      .then(data => {
        if (cancelled) return;
        setSubsubLoading(false);
        if (data && data.success && Array.isArray(data.options) && data.options.length) {
          setDynamicSubsubOptions(data.options);
        } else {
          setDynamicSubsubOptions([]);
        }
      })
      .catch(() => { if (!cancelled) { setSubsubLoading(false); setDynamicSubsubOptions([]); } });
    return () => { cancelled = true; };
  }, [form.category, form.subcategory]);

  // Update level4 options when subcategory changes
  useEffect(() => {
    if (!form.category || !form.subcategory) {
      setSelectedLevel4Options([]);
      setLevel4('');
      return;
    }
    const subCatList = SUBCATS[form.category] || [];
    const selectedSub = subCatList.find(function(s) { return s.v === form.subcategory; });
    const l4 = (selectedSub && selectedSub.level4 && selectedSub.level4.length > 0) ? selectedSub.level4 : [];
    setSelectedLevel4Options(l4);
    setLevel4('');
  }, [form.category, form.subcategory]);

  const [editAdId, setEditAdId] = useState(null);
  const [verificationError, setVerificationError] = useState(false);
  const [backendDupError, setBackendDupError] = useState(null);
  const [repBypassModal, setRepBypassModal] = useState(null); // { currentPoints, reputationRequired }
  const [gpsLoading, setGpsLoading] = useState(false);
  const [lat, setLat] = useState(null);
  const [lng, setLng] = useState(null);
  const [gpsError, setGpsError] = useState('');
  const [aiDetectedLabel, setAiDetectedLabel] = useState('');
  const [aiResult, setAiResult] = useState(null);

  // ── Multi-media state ──────────────────────────────────────────────────────
  const [mediaFiles, setMediaFiles] = useState([]);
  const [mediaType, setMediaType] = useState(null);
  const [mediaPreviews, setMediaPreviews] = useState([]);

  useEffect(() => {
    const urls = mediaPreviews;
    return () => { urls.forEach(url => { try { URL.revokeObjectURL(url); } catch {} }); };
  }, [mediaPreviews]);
  const [videoFile, setVideoFile] = useState(null);
  // ──────────────────────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const t = localStorage.getItem('token') || localStorage.getItem('fox_token') || localStorage.getItem('auth_token');
    if (!t) { window.location.href = '/login'; return; }
    setToken(t);
    const detectedCountry = localStorage.getItem('country') || localStorage.getItem('xtox_country') || 'EG';
    setCountry(detectedCountry);
    const currency = detectCurrency();
    setForm(f => ({ ...f, currency: currency.code }));
    let user = {};
    try { user = JSON.parse(localStorage.getItem('user') || '{}'); } catch {}
    if (user.phone) setForm(f => ({ ...f, phone: user.phone }));
    const lastPhone = localStorage.getItem('last_used_phone');
    if (lastPhone) setForm(f => ({ ...f, phone: f.phone || lastPhone }));
    const aiData = sessionStorage.getItem('ai_generated_listing');
    if (aiData) {
      try {
        const parsed = JSON.parse(aiData);
        setForm(f => ({
          ...f,
          title: parsed.title || f.title,
          description: parsed.description || f.description,
          category: parsed.category || f.category,
          price: parsed.price ? String(parsed.price) : f.price,
        }));
        sessionStorage.removeItem('ai_generated_listing');
      } catch {}
    }

    // Edit mode
    try {
      const _params = new URLSearchParams(window.location.search);
      const _editId = _params.get('edit');
      if (_editId) {
        setEditAdId(_editId);
        const _editT = localStorage.getItem('token') || localStorage.getItem('fox_token') || localStorage.getItem('auth_token') || '';
        fetch((process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app') + '/api/ads/' + _editId, {
          headers: _editT ? { Authorization: 'Bearer ' + _editT } : {}
        }).then(r => r.json()).then(adData => {
          const _ad = adData._id ? adData : (adData.ad || adData);
          if (!_ad || !_ad._id) return;
          setForm(f => ({
            ...f,
            title: _ad.title || f.title,
            description: _ad.description || f.description,
            category: _ad.category || f.category,
            subcategory: _ad.subcategory || f.subcategory,
            price: _ad.price !== undefined ? String(_ad.price) : f.price,
            city: _ad.city || f.city,
            phone: _ad.phone || f.phone,
            currency: _ad.currency || f.currency,
            condition: _ad.condition || f.condition,
          }));
          if (_ad.subsub && _ad.subsub !== 'أخرى') setSubsub(_ad.subsub);
          if (_ad.level4) setLevel4(_ad.level4);
          setStep('form');
        }).catch(() => {});
      }
    } catch {}
  }, []);

  useEffect(() => { detectLocation(); }, []);

  useEffect(() => {
    try {
      const user = JSON.parse(localStorage.getItem('xtox_user') || '{}');
      if (user.phone) setForm(f => ({ ...f, phone: user.phone }));
    } catch {}
  }, []);

  const _prevCatRef = typeof window !== 'undefined' ? (window.__xtoxPrevCat = window.__xtoxPrevCat || {}) : {};
  useEffect(() => {
    if (!aiDetectedLabel || !form.category) return;
    const saved = _prevCatRef.cat;
    if (saved && (form.category !== saved.cat || form.subcategory !== saved.sub)) {
      saveAICorrection(aiDetectedLabel, {
        category: form.category,
        subcategory: form.subcategory || 'أخرى',
        subsub: subsub || 'أخرى',
      });
    }
    _prevCatRef.cat = { cat: form.category, sub: form.subcategory };
  }, [form.category, form.subcategory]);

  async function detectLocation() {
    if (!navigator.geolocation) { setGpsError('المتصفح لا يدعم تحديد الموقع'); return; }
    setGpsLoading(true);
    setGpsError('');
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const posLat = pos.coords.latitude;
        const posLon = pos.coords.longitude;
        setLat(posLat);
        setLng(posLon);
        let cityFound = false;
        try {
          const r = await fetch('https://ipapi.co/' + posLat + ',' + posLon + '/json/');
          const data = await r.json();
          if (data && data.city) { setForm(p => ({ ...p, city: data.city })); cityFound = true; }
        } catch (_) {}
        if (!cityFound) {
          try {
            const r2 = await fetch('https://nominatim.openstreetmap.org/reverse?format=json&lat=' + posLat + '&lon=' + posLon);
            const data2 = await r2.json();
            const city = (data2 && data2.address) ? (data2.address.city || data2.address.town || data2.address.county) : null;
            if (city) setForm(p => ({ ...p, city }));
          } catch (_2) {}
        }
        setGpsLoading(false);
      },
      () => { setGpsLoading(false); },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  }

  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    if (!files.length) return;
    setMediaType('images');
    setMediaFiles(files);
    setVideoFile(null);
    const previews = files.map(f => URL.createObjectURL(f));
    setMediaPreviews(previews);
    setAiStatus('🔍 جاري تحليل الصورة...');
    try {
      const tf = await import('@tensorflow/tfjs');
      const mobilenet = await import('@tensorflow-models/mobilenet');
      const img = document.createElement('img');
      img.crossOrigin = 'anonymous';
      img.style.display = 'none';
      document.body.appendChild(img);
      const objUrl = URL.createObjectURL(files[0]);
      img.src = objUrl;
      await new Promise(r => { img.onload = r; img.onerror = r; });
      const model = await mobilenet.load({ version: 2, alpha: 1.0 });
      const predictions = await model.classify(img, 10);
      document.body.removeChild(img);
      URL.revokeObjectURL(objUrl);
      const result = classifyProduct(predictions, form.title);
      if (result) {
        setAiDetectedLabel(result.detectedAs);
        setAiResult(result);
        setForm(f => {
          const updated = { ...f };
          if (result.category && !f.category) updated.category = result.category;
          if (result.subcategory && (!f.subcategory || f.subcategory === 'أخرى')) updated.subcategory = result.subcategory;
          if (result.title && (!f.title || f.title.length < 3)) updated.title = result.title;
          if (result.description && (!f.description || f.description.length < 10)) {
            updated.description = formatDescription(result.description, f.condition || 'used');
          }
          return updated;
        });
        if (result.subsub && result.subsub !== 'أخرى') {
          setSubsub(s => (s === 'أخرى' || s === '' ? result.subsub : s));
        } else if (!result.subsub || result.subsub === 'أخرى') {
          setSubsub(s => (s === '' ? 'أخرى' : s));
        }
        if (result.category) {
          const pct = Math.round((result.probability ?? result.confidence ?? 0) * 100);
          setAiStatus('🤖 تم الكشف: ' + result.detectedAs + (pct > 0 ? ' (' + pct + '%)' : '') + (result.learned ? ' ✅ مُتعلَّم' : ''));
        } else {
          setAiStatus('⚠️ تعذّر التعرف على المنتج — يرجى اختيار الفئة يدوياً');
        }
      } else {
        setAiStatus('⚠️ تعذّر التعرف على المنتج — يرجى اختيار الفئة يدوياً');
      }
    } catch (err) {
      setAiStatus('');
    }
  };

  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    await new Promise(r => { video.onloadedmetadata = r; video.onerror = r; });
    if (video.duration > 30) { alert('⚠️ الفيديو يجب أن يكون 30 ثانية كحد أقصى'); return; }
    setMediaType('video');
    setVideoFile(file);
    setMediaFiles([]);
    setMediaPreviews([URL.createObjectURL(file)]);
  };

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'العنوان مطلوب';
    if (!form.city || !form.city.trim()) e.city = 'المدينة مطلوبة';
    else if (form.title.trim().length < 5) e.title = 'العنوان قصير جداً (5 أحرف على الأقل)';
    if (!form.category) e.category = 'الفئة مطلوبة';
    if (form.price && isNaN(Number(form.price))) e.price = 'السعر يجب أن يكون رقماً';
    // phone validation removed — phone is taken from user profile
    if (form.category && SUBCATS[form.category]) {
      const _selSub2 = SUBCATS[form.category].find(function(s) { return s.v === form.subcategory; });
      if (_selSub2 && _selSub2.subsubs && _selSub2.subsubs.length > 0 && (!subsub || subsub === 'أخرى')) {
        if (subsubRef.current) subsubRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(forceDuplicate = false) {
    if (!validate()) return;
    if (!forceDuplicate && form.title.trim().length >= 5) {
      try {
        const myAdsRes = await fetchWithRetry(API + '/api/ads/my/all', { headers: { Authorization: 'Bearer ' + token } }, { retries: 1 });
        const myAdsData = await myAdsRes.json();
        const myActiveAds = myAdsData?.active || [];
        if (myActiveAds.length > 0) {
          const similar = checkAdSimilarity(form.title, myActiveAds);
          const highSimilarity = similar.filter(s => s.similarity >= 80);
          if (highSimilarity.length > 0) {
            setDuplicateWarning({
              message: '⚠️ يبدو أن لديك إعلاناً مشابهاً: "' + (myActiveAds[highSimilarity[0].index - 1] && myActiveAds[highSimilarity[0].index - 1].title) + '" (تشابه ' + highSimilarity[0].similarity + '%). هل تريد المتابعة؟',
              similar: highSimilarity,
            });
            return;
          }
        }
      } catch {}
    }
    setDuplicateWarning(null);
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('price', Number(form.price || 0));
      formData.append('category', form.category);
      formData.append('city', form.city || '');
      formData.append('country', country || 'EG');
      // phone is not sent from sell form — taken from user profile on backend
      formData.append('currency', form.currency || 'EGP');
      formData.append('condition', form.condition || '');
      formData.append('subcategory', form.subcategory || '');
      formData.append('subsub', subsub || 'أخرى');
      formData.append('level4', level4 || '');
      if (forceDuplicate) formData.append('forceDuplicate', 'true');
      if (lat !== null) formData.append('lat', String(lat));
      if (lng !== null) formData.append('lng', String(lng));
      if (mediaType === 'images' && mediaFiles.length > 0) {
        mediaFiles.forEach((file) => formData.append('images', file));
      } else if (mediaType === 'video' && videoFile) {
        formData.append('video', videoFile);
      }
      const t = localStorage.getItem('token') || localStorage.getItem('fox_token') || localStorage.getItem('auth_token') || token;
      const _isEdit = !!editAdId;
      const _url = _isEdit ? (API + '/api/ads/' + editAdId) : (API + '/api/ads');
      const _method = _isEdit ? 'PUT' : 'POST';
      const res = await fetch(_url, {
        method: _method,
        headers: { Authorization: 'Bearer ' + t },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 403 && err.code === 'UNVERIFIED_USER') { setVerificationError(true); setLoading(false); return; }
        if (res.status === 409 && err.code === 'DUPLICATE_AD') { setBackendDupError({ existingAdId: err.existingAdId }); setLoading(false); return; }
        if (res.status === 429) {
          if (err.canUsePoints) {
            setRepBypassModal({ currentPoints: err.currentPoints || 0, reputationRequired: err.reputationRequired || 100 });
          } else {
            setErrors({ submit: err.error || 'لقد وصلت للحد اليومي للإعلانات' });
          }
        } else {
          setErrors({ submit: 'حدث خطأ أثناء نشر الإعلان، يرجى المحاولة مجدداً' });
        }
        setLoading(false);
        return;
      }
      var resData = await res.json().catch(function() { return {}; });
      // phone no longer stored in localStorage — taken from profile
      var _adResult = (resData && resData.ad && resData.ad._id) ? resData.ad : resData;
      var newAdId = (resData && resData._id) || (_adResult && _adResult._id) || (resData && resData.id);
      if (_isEdit) {
        window.location.href = '/ads/' + editAdId + '?updated=1';
      } else {
        window.location.href = newAdId ? ('/ads/' + newAdId + '?published=1') : '/?published=1';
      }
    } catch (e) {
      setErrors({ submit: 'حدث خطأ في الاتصال، يرجى المحاولة مجدداً' });
    }
    setLoading(false);
  }

  const inputStyle = (field) => ({
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: '1.5px solid ' + (errors[field] ? '#e53e3e' : '#e0e0e0'),
    fontSize: 16, boxSizing: 'border-box',
    fontFamily: "'Cairo', 'Tajawal', system-ui",
    direction: 'rtl', background: errors[field] ? '#fff5f5' : '#fff',
    outline: 'none', transition: 'border-color 0.2s',
  });

  const labelStyle = { display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14, color: '#333' };
  const selectStyle = { width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 15, fontFamily: "'Cairo', 'Tajawal', system-ui", direction: 'rtl', background: '#fff', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' };

  const stepCount = step === 'start' ? 1 : 2;

  async function resubmitWithPoints() {
    setRepBypassModal(null);
    setLoading(true);
    try {
      const subsub = level4 || form.subsub || '';
      const formData = new FormData();
      formData.append('title', form.title || '');
      formData.append('description', form.description || '');
      formData.append('category', form.category || '');
      formData.append('subcategory', form.subcategory || '');
      formData.append('subsub', subsub || 'أخرى');
      formData.append('price', String(form.price || ''));
      formData.append('city', form.city || '');
      formData.append('currency', form.currency || 'EGP');
      formData.append('condition', form.condition || '');
      formData.append('useReputationPoints', 'true');
      if (mediaType === 'images' && mediaFiles.length > 0) {
        mediaFiles.forEach((file) => formData.append('images', file));
      } else if (mediaType === 'video' && videoFile) {
        formData.append('video', videoFile);
      }
      const t = localStorage.getItem('token') || localStorage.getItem('fox_token') || localStorage.getItem('auth_token') || token;
      const res = await fetch(API + '/api/ads', {
        method: 'POST',
        headers: { Authorization: 'Bearer ' + t },
        body: formData,
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        setErrors({ submit: err.error || 'حدث خطأ أثناء نشر الإعلان' });
        setLoading(false);
        return;
      }
      const resData = await res.json().catch(() => ({}));
      const newAdId = (resData && resData._id) || (resData && resData.ad && resData.ad._id) || (resData && resData.id);
      window.location.href = newAdId ? ('/ads/' + newAdId + '?published=1') : '/?published=1';
    } catch (e) {
      setErrors({ submit: 'حدث خطأ في الاتصال، يرجى المحاولة مجدداً' });
      setLoading(false);
    }
  }

  return (
    <div dir="rtl" lang="ar" style={{
      maxWidth: 540, margin: '0 auto', padding: '0 0 32px',
      fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
      minHeight: '100vh', background: '#f5f5f5',
    }}>
      {/* Header */}
      <div style={{
        background: '#002f34', color: 'white', padding: '14px 16px',
        display: 'flex', alignItems: 'center', gap: 12,
        position: 'sticky', top: 0, zIndex: 10,
      }}>
        <button onClick={() => step === 'form' ? setStep('start') : history.back()}
          aria-label="رجوع"
          style={{ background: 'none', border: 'none', color: 'white', fontWeight: 'bold', fontSize: 22, cursor: 'pointer', lineHeight: 1 }}>
          →
        </button>
        <div style={{ flex: 1 }}>
          <h1 style={{ color: 'white', margin: 0, fontSize: 18, fontWeight: 'bold' }}>{editAdId ? 'تعديل الإعلان' : 'نشر إعلان جديد'}</h1>
          <div style={{ display: 'flex', gap: 6, marginTop: 6 }}>
            {[1, 2].map(n => (
              <div key={n} style={{
                height: 4, flex: 1, borderRadius: 4,
                background: n <= stepCount ? '#c8f5c5' : 'rgba(255,255,255,0.3)',
                transition: 'background 0.3s',
              }} />
            ))}
          </div>
        </div>
      </div>

      <div style={{ padding: '20px 16px' }}>
        {verificationError && (
          <div role="alert" style={{ background: '#fef2f2', border: '1px solid #fca5a5', borderRadius: 8, padding: 16, marginBottom: 16, textAlign: 'center', direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
            <p style={{ color: '#dc2626', fontWeight: 'bold', margin: 0, fontSize: 15 }}>يجب التحقق من حسابك أولاً</p>
            <p style={{ color: '#6b7280', fontSize: 14, margin: '8px 0 0' }}>قم بالتحقق من رقم واتساب أو البريد الإلكتروني للمتابعة</p>
            <a href="/login" style={{ color: '#1d4ed8', fontSize: 14, display: 'inline-block', marginTop: 8 }}>الذهاب للتحقق ←</a>
          </div>
        )}

        {backendDupError && (
          <div role="alert" style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '14px 16px', marginBottom: 16, direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#92400e', fontWeight: 600 }}>لديك إعلان مشابه بالفعل. لا يمكن نشر إعلانات متكررة.</p>
            {backendDupError.existingAdId && (
              <a href={'/ads/' + backendDupError.existingAdId} style={{ color: '#1d4ed8', fontSize: 13, display: 'inline-block', marginBottom: 8 }}>عرض الإعلان الموجود ←</a>
            )}
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setBackendDupError(null)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>✏️ تعديل الإعلان</button>
            </div>
          </div>
        )}

        {duplicateWarning && (
          <div role="alert" style={{ background: '#fffbeb', border: '1.5px solid #f59e0b', borderRadius: 12, padding: '14px 16px', marginBottom: 16, direction: 'rtl', fontFamily: 'Cairo, sans-serif' }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#92400e', fontWeight: 600 }}>{duplicateWarning.message}</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDuplicateWarning(null)} style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #d1d5db', background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>✏️ تعديل الإعلان</button>
              <button onClick={() => submit(true)} style={{ padding: '7px 14px', borderRadius: 8, border: 'none', background: '#002f34', color: '#fff', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>نشر على أي حال</button>
            </div>
          </div>
        )}

        {errors.submit && (
          <div role="alert" style={{ background: '#fff0f0', border: '1px solid #fcc', borderRadius: 10, padding: '12px 14px', marginBottom: 16, color: '#c00', fontSize: 14 }}>
            ⚠️ {errors.submit}
          </div>
        )}

        {/* Step 1: Start */}
        {step === 'start' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ textAlign: 'center', color: '#555', fontSize: 15, margin: '0 0 8px' }}>كيف تريد إضافة إعلانك؟</p>
            <button onClick={() => setStep('form')} style={{ display: 'block', background: '#002f34', color: 'white', textAlign: 'center', padding: '28px 20px', borderRadius: 18, cursor: 'pointer', fontSize: 17, fontWeight: 'bold', boxShadow: '0 4px 12px rgba(0,47,52,0.2)', border: 'none', fontFamily: 'inherit', width: '100%' }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📸</div>
              <div>أضف إعلانك</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6, fontWeight: 'normal' }}>صور + فيديو + تحليل تلقائي بالذكاء الاصطناعي ✨</div>
            </button>
            <button onClick={() => setStep('form')} style={{ background: 'white', color: '#002f34', padding: '20px', borderRadius: 18, cursor: 'pointer', fontSize: 16, fontWeight: 'bold', border: '2px solid #002f34', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>✍️</span>
              إضافة يدوياً
            </button>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <div style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

            {/* Media picker */}
            <input type="file" accept="image/*" multiple capture="environment" onChange={handlePhotoSelect} style={{ display: 'none' }} id="photo-input" />
            <input type="file" accept="video/*" capture="environment" onChange={handleVideoSelect} style={{ display: 'none' }} id="video-input" />
            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <label htmlFor="photo-input" style={{ flex: 1, padding: '10px', background: '#6366f1', color: 'white', borderRadius: 10, textAlign: 'center', cursor: 'pointer', fontSize: 14 }}>📷 إضافة صور</label>
              <label htmlFor="video-input" style={{ flex: 1, padding: '10px', background: '#8b5cf6', color: 'white', borderRadius: 10, textAlign: 'center', cursor: 'pointer', fontSize: 14 }}>🎥 فيديو 30 ثانية</label>
            </div>

            {mediaPreviews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {mediaType === 'images' && mediaPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt={'صورة ' + (i + 1)} style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} loading="eager" />
                    <button onClick={() => {
                      const newFiles = mediaFiles.filter((_, idx) => idx !== i);
                      const newPreviews = mediaPreviews.filter((_, idx) => idx !== i);
                      setMediaFiles(newFiles);
                      setMediaPreviews(newPreviews);
                      if (!newFiles.length) setMediaType(null);
                    }} style={{ position: 'absolute', top: -6, right: -6, background: 'red', color: 'white', border: 'none', borderRadius: '50%', width: 20, height: 20, cursor: 'pointer', fontSize: 12 }}>×</button>
                  </div>
                ))}
                {mediaType === 'video' && <video src={mediaPreviews[0]} controls style={{ width: '100%', borderRadius: 10, maxHeight: 200 }} />}
              </div>
            )}

            {aiStatus && (
              <div style={{ padding: '10px 16px', borderRadius: 8, marginBottom: 12, background: aiStatus.startsWith('🤖') ? 'rgba(99,102,241,0.08)' : '#fff8e1', border: '1px solid ' + (aiStatus.startsWith('🤖') ? 'rgba(99,102,241,0.25)' : '#f59e0b'), color: aiStatus.startsWith('🤖') ? '#4338ca' : '#92400e', fontSize: 13, textAlign: 'right', direction: 'rtl', fontFamily: "'Cairo', 'Tajawal', system-ui", display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ flex: 1 }}>{aiStatus}</span>
                {aiDetectedLabel && aiStatus.startsWith('🤖') && (
                  <button type="button" onClick={() => { setAiStatus(''); setAiDetectedLabel(''); setAiResult(null); }} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 16, color: '#6b7280', padding: '0 2px', lineHeight: 1 }} title="إلغاء التعبئة التلقائية" aria-label="إلغاء التعبئة التلقائية">×</button>
                )}
              </div>
            )}

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-title">عنوان الإعلان <span style={{ color: '#e53e3e' }}>*</span></label>
              <input id="sell-title" value={form.title}
                onChange={e => {
                  const value = e.target.value;
                  setForm(p => ({ ...p, title: value }));
                  if (errors.title) setErrors(p => ({ ...p, title: '' }));
                  if (aiDebounce) clearTimeout(aiDebounce);
                  const timeout = setTimeout(async () => {
                    if (value.length < 5) return;
                    try {
                      const tok = localStorage.getItem('token') || localStorage.getItem('fox_token') || '';
                      const r = await fetch(API + '/api/ads/ai-generate', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
                        body: JSON.stringify({ text: value }),
                      });
                      const data = await r.json();
                      if (data.category && data.category !== 'General') {
                        setForm(f => ({
                          ...f, category: data.category || f.category,
                          subcategory: data.subcategory || f.subcategory,
                          price: data.suggestedPrice && !f.price ? String(data.suggestedPrice) : f.price,
                          condition: data.condition || f.condition,
                          description: f.description || data.description || '',
                        }));
                        setAiStatus('✅ تم اكتشاف الفئة تلقائياً');
                      }
                    } catch {}
                  }, 1500);
                  setAiDebounce(timeout);
                }}
                placeholder="مثال: آيفون 14 برو ماكس بحالة ممتازة"
                style={inputStyle('title')} maxLength={100} aria-required="true" />
              {errors.title && <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>⚠️ {errors.title}</p>}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-desc">الوصف</label>
              <textarea id="sell-desc" value={form.description}
                onChange={e => { setForm(p => ({ ...p, description: e.target.value })); setCharCount(e.target.value.length); }}
                placeholder="اكتب وصفاً تفصيلياً للمنتج..."
                style={{ ...inputStyle('description'), resize: 'vertical', minHeight: 90 }} maxLength={1000} />
              <p style={{ textAlign: 'left', fontSize: 11, color: '#aaa', margin: '3px 0 0' }}>{charCount}/1000</p>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-category">الفئة <span style={{ color: '#e53e3e' }}>*</span></label>
              <select id="sell-category" value={form.category}
                onChange={e => {
                  const _newCat = e.target.value;
                  const firstStatus = (getStatusOptions(_newCat, '')[0] || {}).value || '';
                  setForm(p => ({ ...p, category: _newCat, subcategory: '', condition: firstStatus }));
                  setSubsub(''); setLevel4(''); setSelectedLevel4Options([]);
                }}
                aria-hidden="false" tabIndex={-1}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
                <option value="">اختر الفئة</option>
                {CATS.map(cat => <option key={cat.en} value={cat.en}>{cat.ar}</option>)}
              </select>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {CATS.map(cat => (
                  <button key={cat.en} type="button"
                    onClick={() => {
                      if (aiDetectedLabel && form.category && cat.en !== form.category) {
                        saveAICorrection(aiDetectedLabel, { category: cat.en, subcategory: 'أخرى', subsub: 'أخرى' });
                      }
                      const firstStatus = (getStatusOptions(cat.en, '')[0] || {}).value || '';
                      setForm(p => ({ ...p, category: cat.en, subcategory: '', condition: firstStatus }));
                      setSubsub(''); setLevel4(''); setSelectedLevel4Options([]);
                      if (errors.category) setErrors(p => ({ ...p, category: '' }));
                    }}
                    aria-pressed={form.category === cat.en}
                    style={{ padding: '10px 6px', borderRadius: 10, border: '2px solid ' + (form.category === cat.en ? '#002f34' : '#e0e0e0'), background: form.category === cat.en ? '#002f34' : '#fafafa', color: form.category === cat.en ? 'white' : '#444', cursor: 'pointer', fontSize: 12, fontWeight: 'bold', fontFamily: 'inherit', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 3, transition: 'all 0.15s' }}>
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <span>{cat.ar}</span>
                  </button>
                ))}
              </div>
              {errors.category && <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '6px 0 0' }}>⚠️ {errors.category}</p>}
              <CategoryPriceHint category={form.category} />

              {/* Subcategory dropdown */}
              {form.category && SUBCATS[form.category] && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle} htmlFor="sell-subcategory">الفئة الفرعية</label>
                  <select id="sell-subcategory" name="sell-subcategory"
                    value={form.subcategory || ''}
                    onChange={e => {
                      const newSub = e.target.value;
                      const firstStatus = (getStatusOptions(form.category, newSub)[0] || {}).value || '';
                      setForm(p => ({ ...p, subcategory: newSub, condition: firstStatus }));
                      setSubsub(''); setLevel4(''); setSelectedLevel4Options([]);
                      if (errors.subsub) setErrors(p => ({ ...p, subsub: '' }));
                      setTimeout(() => { if (subsubRef.current) subsubRef.current.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, 100);
                    }}
                    aria-label="الفئة الفرعية" style={selectStyle}>
                    <option value="">-- اختر الفئة الفرعية --</option>
                    {SUBCATS[form.category].map(function(s) { return <option key={s.v} value={s.v}>{s.ar}</option>; })}
                  </select>
                </div>
              )}

              {/* Subsub dropdown */}
              {form.category && SUBCATS[form.category] && (function() {
                var _selSub = SUBCATS[form.category].find(function(s) { return s.v === form.subcategory; });
                return _selSub && _selSub.subsubs && _selSub.subsubs.length > 0 ? (
                  <div ref={subsubRef} style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: !subsub ? 'rgba(229,62,62,0.04)' : 'rgba(99,102,241,0.04)', border: !subsub ? '2px solid #e53e3e' : '2px solid rgba(99,102,241,0.25)', animation: !subsub ? 'subsubPulse 1.5s ease-in-out infinite' : 'none', transition: 'border-color 0.3s, background 0.3s' }}>
                    <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 15, color: '#002f34' }} htmlFor="sell-subsub">
                      التصنيف الفرعي الثاني <span style={{ color: '#e53e3e', fontWeight: 900 }}>*</span>
                      {!subsub && <span style={{ marginRight: 6, fontSize: 12, background: '#e53e3e', color: '#fff', borderRadius: 6, padding: '1px 7px', fontWeight: 700 }}>مطلوب</span>}
                    </label>
                    {subsubLoading && (
                      <div style={{ fontSize: 12, color: '#6366f1', marginBottom: 4, display: 'flex', alignItems: 'center', gap: 6 }}>
                        <span style={{ display: 'inline-block', width: 12, height: 12, borderRadius: '50%', border: '2px solid #6366f1', borderTopColor: 'transparent', animation: 'spin 0.7s linear infinite' }} />
                        جاري تحميل خيارات إضافية...
                      </div>
                    )}
                    <select id="sell-subsub" name="sell-subsub" value={subsub}
                      onChange={e => { setSubsub(e.target.value); setLevel4(''); if (errors.subsub) setErrors(p => ({ ...p, subsub: '' })); }}
                      aria-required="true" aria-label="التصنيف الفرعي الثاني"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid ' + (errors.subsub ? '#e53e3e' : '#c7d2fe'), fontSize: 15, fontFamily: "'Cairo', 'Tajawal', system-ui", direction: 'rtl', background: '#fff', outline: 'none', boxSizing: 'border-box', cursor: 'pointer', fontWeight: 600 }}>
                      <option value="">-- اختر التصنيف الفرعي الثاني --</option>
                      {(function() {
                        var staticOpts = _selSub.subsubs.filter(function(ss) { return ss.v !== 'أخرى'; });
                        var dynamicOpts = dynamicSubsubOptions.filter(function(d) { return !staticOpts.some(function(s) { return s.ar === d.ar || s.v === d.en; }); });
                        return [
                          ...staticOpts.map(function(ss) { return <option key={ss.v} value={ss.v}>{ss.ar}</option>; }),
                          ...dynamicOpts.map(function(d, i) { return <option key={'dyn_' + i} value={d.en || d.ar}>{d.ar}</option>; }),
                          <option key="other" value="أخرى">أخرى</option>,
                        ];
                      })()}
                    </select>
                    <p style={{ margin: '6px 0 0', fontSize: 12, color: errors.subsub ? '#e53e3e' : '#6366f1', fontWeight: 600 }}>
                      {errors.subsub ? ('⚠️ ' + errors.subsub) : 'هذا الحقل مهم جداً لظهور إعلانك في التصنيف الصحيح'}
                    </p>
                  </div>
                ) : null;
              })()}

              {/* Level4 dropdown */}
              {selectedLevel4Options && selectedLevel4Options.length > 0 && (
                <div style={{ marginTop: 12, padding: '12px 14px', borderRadius: 12, background: 'rgba(99,102,241,0.04)', border: '2px solid rgba(99,102,241,0.25)', transition: 'border-color 0.3s, background 0.3s' }}>
                  <label style={{ display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 15, color: '#002f34' }} htmlFor="sell-level4">
                    {form.category === 'Vehicles' ? 'الماركة / المواصفة' : 'التفاصيل'}
                  </label>
                  <select id="sell-level4" name="sell-level4" value={level4}
                    onChange={e => setLevel4(e.target.value)}
                    aria-label={form.category === 'Vehicles' ? 'الماركة / المواصفة' : 'التفاصيل'}
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #c7d2fe', fontSize: 15, fontFamily: "'Cairo', 'Tajawal', system-ui", direction: 'rtl', background: '#fff', outline: 'none', boxSizing: 'border-box', cursor: 'pointer', fontWeight: 600 }}>
                    <option value="">-- اختر --</option>
                    {selectedLevel4Options.map(function(opt) { return <option key={opt} value={opt}>{opt}</option>; })}
                  </select>
                </div>
              )}
            </div>

            {/* Condition / Status */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-condition">حالة المنتج</label>
              <select id="sell-condition" value={form.condition}
                onChange={e => setForm(p => ({ ...p, condition: e.target.value }))}
                aria-hidden="false" tabIndex={-1}
                style={{ position: 'absolute', opacity: 0, pointerEvents: 'none', width: 0, height: 0, overflow: 'hidden' }}>
                <option value="">اختر الحالة</option>
                {getStatusOptions(form.category, form.subcategory).map(c => <option key={c.value} value={c.value}>{c.label}</option>)}
              </select>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {getStatusOptions(form.category, form.subcategory).map(c => (
                  <button key={c.value} type="button"
                    onClick={() => setForm(p => ({ ...p, condition: c.value }))}
                    aria-pressed={form.condition === c.value}
                    style={{ padding: '8px 14px', borderRadius: 20, border: '2px solid ' + (form.condition === c.value ? '#002f34' : '#e0e0e0'), background: form.condition === c.value ? '#002f34' : '#fafafa', color: form.condition === c.value ? 'white' : '#444', cursor: 'pointer', fontSize: 13, fontWeight: 'bold', fontFamily: 'inherit', transition: 'all 0.15s' }}>
                    {c.icon} {c.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Price + Currency */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <div>
                  <label style={labelStyle} htmlFor="sell-currency">العملة</label>
                  <select id="sell-currency" name="sell-currency" value={form.currency}
                    onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                    aria-label="العملة"
                    style={{ padding: '11px 10px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 14, fontFamily: 'inherit', background: '#fff', direction: 'ltr' }}>
                    {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div style={{ flex: 1 }}>
                  <label style={labelStyle} htmlFor="sell-price">السعر</label>
                  <input id="sell-price" value={form.price}
                    onChange={e => { setForm(p => ({ ...p, price: e.target.value })); if (errors.price) setErrors(p => ({ ...p, price: '' })); }}
                    type="number" min="0" placeholder="0" inputMode="numeric"
                    style={{ ...inputStyle('price'), direction: 'ltr' }} />
                </div>
              </div>
              {errors.price && <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>⚠️ {errors.price}</p>}
            </div>

            {/* City */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-city">المدينة <span style={{ color: '#e53e3e' }}>*</span></label>
              <input id="sell-city" value={form.city} required
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="مثال: القاهرة، الرياض، دبي..."
                style={inputStyle('city')} />
              {gpsLoading && <p style={{ color: '#6366f1', fontSize: 12, margin: '4px 0 0', fontFamily: "'Cairo','Tajawal',system-ui" }}>📍 جارٍ تحديد موقعك...</p>}
              {errors.city && <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>⚠️ {errors.city}</p>}
              {country && COUNTRIES[country] && (
                <p style={{ margin: '6px 0 0', fontSize: 12, color: '#6366f1', display: 'flex', alignItems: 'center', gap: 4 }}>
                  📍 إعلانك سيظهر في: <span style={{ fontWeight: 700 }}>{COUNTRIES[country].flag} {COUNTRIES[country].name}</span>
                </p>
              )}
              {lat && <input type="hidden" id="sell-lat" name="lat" value={lat} />}
              {lng && <input type="hidden" id="sell-lng" name="lng" value={lng} />}
            </div>

            {/* Phone — taken from profile, no longer entered here */}
            <div style={{ marginBottom: 20, background: '#f0fdf4', borderRadius: 10, padding: '10px 14px', border: '1px solid #bbf7d0' }}>
              <p style={{ margin: 0, fontSize: 13, color: '#166534', fontWeight: 600 }}>
                📱 رقم التواصل يُستخدم من ملفك الشخصي
              </p>
              <p style={{ margin: '4px 0 0', fontSize: 12, color: '#15803d' }}>
                يمكنك تحديث رقم الواتساب من صفحة <a href="/profile" style={{ color: '#166534', fontWeight: 700 }}>الملف الشخصي</a>
              </p>
            </div>

            {/* Submit */}
            <button onClick={() => submit()} disabled={loading} aria-busy={loading}
              style={{ width: '100%', padding: '14px', background: loading ? '#aaa' : '#002f34', color: 'white', border: 'none', borderRadius: 14, fontWeight: 'bold', fontSize: 17, cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, transition: 'background 0.2s' }}>
              {loading ? <><span style={{ display: 'inline-block' }}>⏳</span> {editAdId ? 'جار التحديث...' : 'جار النشر...'}</> : <>{editAdId ? '✏️ تحديث الإعلان' : '🚀 نشر الإعلان'}</>}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 10 }}>
              بالنشر توافق على{' '}
              <Link href="/terms" style={{ color: '#002f34' }}>شروط الاستخدام</Link>
            </p>
          </div>
        )}
      </div>

      {/* ── Reputation bypass modal ── */}
      {repBypassModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', zIndex: 9999,
          display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
        }}>
          <div style={{
            background: '#1a1a2e', border: '1.5px solid rgba(139,92,246,0.4)',
            borderRadius: 18, padding: '28px 22px', maxWidth: 380, width: '100%',
            direction: 'rtl', fontFamily: "'Cairo', 'Tajawal', system-ui",
            boxShadow: '0 8px 40px rgba(0,0,0,0.6)',
          }}>
            <div style={{ fontSize: 36, textAlign: 'center', marginBottom: 12 }}>⚠️</div>
            <h2 style={{ color: '#f8fafc', fontSize: 18, fontWeight: 800, textAlign: 'center', margin: '0 0 10px' }}>
              لقد وصلت إلى الحد اليومي للإعلانات
            </h2>
            <p style={{ color: '#94a3b8', fontSize: 14, textAlign: 'center', margin: '0 0 16px', lineHeight: 1.6 }}>
              يمكنك نشر إعلان إضافي مقابل <strong style={{ color: '#a78bfa' }}>100 نقطة سمعة</strong>
            </p>
            <div style={{
              background: 'rgba(99,102,241,0.12)', border: '1px solid rgba(99,102,241,0.25)',
              borderRadius: 10, padding: '12px 16px', textAlign: 'center', marginBottom: 20,
            }}>
              <span style={{ color: '#94a3b8', fontSize: 13 }}>نقاطك الحالية: </span>
              <strong style={{ color: repBypassModal.currentPoints >= 100 ? '#4ade80' : '#f87171', fontSize: 18 }}>
                {repBypassModal.currentPoints} نقطة
              </strong>
            </div>
            {repBypassModal.currentPoints >= 100 ? (
              <button
                onClick={() => resubmitWithPoints()}
                style={{
                  width: '100%', padding: '13px', background: 'linear-gradient(135deg, #16a34a, #15803d)',
                  color: 'white', border: 'none', borderRadius: 12, fontWeight: 700, fontSize: 16,
                  cursor: 'pointer', fontFamily: 'inherit', marginBottom: 10, display: 'flex',
                  alignItems: 'center', justifyContent: 'center', gap: 8,
                }}>
                ✅ استخدم 100 نقطة وانشر الإعلان
              </button>
            ) : (
              <div style={{ color: '#f87171', textAlign: 'center', fontSize: 13, marginBottom: 14 }}>
                نقاطك غير كافية. تحتاج {repBypassModal.reputationRequired} نقطة على الأقل.
              </div>
            )}
            <button
              onClick={() => setRepBypassModal(null)}
              style={{
                width: '100%', padding: '11px', background: 'rgba(255,255,255,0.06)',
                color: '#94a3b8', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                fontWeight: 600, fontSize: 14, cursor: 'pointer', fontFamily: 'inherit',
              }}>
              إلغاء
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
