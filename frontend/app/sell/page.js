'use client';
export const dynamic = 'force-dynamic';
import { useState, useEffect, useRef } from 'react';
import { analyzeImageForAd, checkAdSimilarity } from '../../lib/geminiAI';
import { fetchWithRetry } from '../../lib/fetchWithRetry';
import { detectLang, detectCurrency } from '../../lib/lang';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// Arabic category names mapped to English backend values
const CATS = [
  { ar: 'مركبات',         en: 'Vehicles',     icon: '🚗' },
  { ar: 'إلكترونيات',     en: 'Electronics',  icon: '📱' },
  { ar: 'عقارات',         en: 'Real Estate',  icon: '🏠' },
  { ar: 'وظائف',          en: 'Jobs',         icon: '💼' },
  { ar: 'خدمات',          en: 'Services',     icon: '🔧' },
  { ar: 'سوبرماركت',      en: 'Supermarket',  icon: '🛒' },
  { ar: 'صيدلية',         en: 'Pharmacy',     icon: '💊' },
  { ar: 'طعام سريع',      en: 'Fast Food',    icon: '🍔' },
  { ar: 'أزياء',          en: 'Fashion',      icon: '👗' },
  { ar: 'عام',            en: 'General',      icon: '📦' },
];

const CURRENCIES = ['EGP', 'SAR', 'AED', 'USD', 'EUR', 'MAD', 'TND', 'LYD', 'IQD', 'JOD'];

const CONDITIONS = [
  { ar: 'جديد',       en: 'new',       icon: '✨' },
  { ar: 'مستعمل',     en: 'used',      icon: '🔄' },
  { ar: 'ممتاز',      en: 'excellent',  icon: '⭐' },
  { ar: 'للإيجار',    en: 'rent',      icon: '🔑' },
];

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

const SUBCATS = {
  Vehicles: [
    {v:'Cars', ar:'سيارات', subsubs:[{v:'Sedan',ar:'سيدان'},{v:'SUV',ar:'SUV / دفع رباعي'},{v:'Pickup',ar:'بيك آب'},{v:'Coupe',ar:'كوبيه'},{v:'Electric',ar:'كهربائية'},{v:'Other',ar:'أخرى'}]},
    {v:'Motorcycles', ar:'دراجات نارية', subsubs:[{v:'Sport',ar:'رياضية'},{v:'Scooter',ar:'سكوتر'},{v:'OffRoad',ar:'أوف رود'},{v:'Other',ar:'أخرى'}]},
    {v:'SpareParts', ar:'قطع غيار', subsubs:[{v:'Engine',ar:'محرك'},{v:'Tires',ar:'كفرات'},{v:'BodyParts',ar:'هيكل'},{v:'Other',ar:'أخرى'}]},
    {v:'Trucks', ar:'شاحنات', subsubs:[{v:'LightTruck',ar:'خفيفة'},{v:'HeavyTruck',ar:'ثقيلة'},{v:'Other',ar:'أخرى'}]},
    {v:'Boats', ar:'قوارب', subsubs:[{v:'FishingBoat',ar:'قارب صيد'},{v:'Yacht',ar:'يخت'},{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
  ],
  Electronics: [
    {v:'MobilePhones', ar:'هواتف محمولة', subsubs:[{v:'iPhone',ar:'آيفون'},{v:'Samsung',ar:'سامسونج'},{v:'Huawei',ar:'هواوي'},{v:'Xiaomi',ar:'شاومي'},{v:'Oppo',ar:'أوبو'},{v:'Other',ar:'أخرى'}]},
    {v:'Laptops', ar:'لابتوب', subsubs:[{v:'MacBook',ar:'ماك بوك'},{v:'GamingLaptop',ar:'جيمينج'},{v:'Business',ar:'للأعمال'},{v:'Other',ar:'أخرى'}]},
    {v:'Tablets', ar:'تابلت', subsubs:[{v:'iPad',ar:'آيباد'},{v:'SamsungTab',ar:'سامسونج تاب'},{v:'Other',ar:'أخرى'}]},
    {v:'TVs', ar:'تليفزيونات', subsubs:[{v:'SmartTV',ar:'سمارت'},{v:'OLED',ar:'OLED'},{v:'LED',ar:'LED'},{v:'Other',ar:'أخرى'}]},
    {v:'Cameras', ar:'كاميرات', subsubs:[{v:'DSLR',ar:'DSLR'},{v:'Mirrorless',ar:'ميرورليس'},{v:'Security',ar:'مراقبة'},{v:'Other',ar:'أخرى'}]},
    {v:'Gaming', ar:'ألعاب', subsubs:[{v:'PlayStation',ar:'بلايستيشن'},{v:'Xbox',ar:'إكس بوكس'},{v:'Nintendo',ar:'نينتندو'},{v:'PCGaming',ar:'PC'},{v:'Other',ar:'أخرى'}]},
    {v:'Audio', ar:'صوتيات', subsubs:[{v:'Headphones',ar:'سماعات رأس'},{v:'Earbuds',ar:'إيربودز'},{v:'Speakers',ar:'سبيكر'},{v:'Other',ar:'أخرى'}]},
    {v:'Accessories', ar:'إكسسوارات', subsubs:[{v:'Chargers',ar:'شواحن'},{v:'Cases',ar:'كفرات'},{v:'PowerBanks',ar:'باور بانك'},{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
  ],
  'Real Estate': [
    {v:'Apartments', ar:'شقق', subsubs:[{v:'Studio',ar:'استوديو'},{v:'1BR',ar:'غرفة واحدة'},{v:'2BR',ar:'غرفتان'},{v:'3BR',ar:'3 غرف'},{v:'4BR',ar:'4 غرف+'},{v:'Duplex',ar:'دوبلكس'},{v:'Penthouse',ar:'بنتهاوس'},{v:'Other',ar:'أخرى'}]},
    {v:'Villas', ar:'فيلات', subsubs:[{v:'Independent',ar:'مستقلة'},{v:'Compound',ar:'كمبوند'},{v:'TwinHouse',ar:'توين هاوس'},{v:'TownHouse',ar:'تاون هاوس'},{v:'Other',ar:'أخرى'}]},
    {v:'Land', ar:'أراضي', subsubs:[{v:'Residential',ar:'سكنية'},{v:'Commercial',ar:'تجارية'},{v:'Agricultural',ar:'زراعية'},{v:'Other',ar:'أخرى'}]},
    {v:'Commercial', ar:'تجاري', subsubs:[{v:'Shop',ar:'محل'},{v:'Warehouse',ar:'مخزن'},{v:'Restaurant',ar:'مطعم'},{v:'Other',ar:'أخرى'}]},
    {v:'Offices', ar:'مكاتب', subsubs:[{v:'Private',ar:'خاص'},{v:'Shared',ar:'مشترك'},{v:'Other',ar:'أخرى'}]},
    {v:'Rooms', ar:'غرف', subsubs:[{v:'Single',ar:'مفردة'},{v:'Double',ar:'مزدوجة'},{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
  ],
  Jobs: [
    {v:'FullTime', ar:'دوام كامل', subsubs:[{v:'IT',ar:'تكنولوجيا'},{v:'Engineering',ar:'هندسة'},{v:'Medical',ar:'طبي'},{v:'Marketing',ar:'تسويق'},{v:'Finance',ar:'مالية'},{v:'Education',ar:'تعليم'},{v:'Sales',ar:'مبيعات'},{v:'Other',ar:'أخرى'}]},
    {v:'PartTime', ar:'دوام جزئي', subsubs:[{v:'Delivery',ar:'توصيل'},{v:'Tutoring',ar:'دروس'},{v:'CustomerService',ar:'خدمة عملاء'},{v:'Other',ar:'أخرى'}]},
    {v:'Freelance', ar:'فريلانس', subsubs:[{v:'Design',ar:'تصميم'},{v:'Development',ar:'برمجة'},{v:'Writing',ar:'كتابة'},{v:'Translation',ar:'ترجمة'},{v:'Other',ar:'أخرى'}]},
    {v:'Internship', ar:'تدريب', subsubs:[{v:'Technical',ar:'تقني'},{v:'Business',ar:'أعمال'},{v:'Other',ar:'أخرى'}]},
    {v:'Remote', ar:'عن بُعد', subsubs:[{v:'Development',ar:'برمجة'},{v:'CustomerService',ar:'خدمة عملاء'},{v:'Content',ar:'محتوى'},{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
  ],
  Services: [
    {v:'HomeServices', ar:'خدمات منزلية', subsubs:[{v:'Plumber',ar:'سباكة'},{v:'Electrician',ar:'كهرباء'},{v:'Carpenter',ar:'نجارة'},{v:'Painter',ar:'دهانات'},{v:'ACRepair',ar:'تكييف'},{v:'PestControl',ar:'حشرات'},{v:'Other',ar:'أخرى'}]},
    {v:'Cleaning', ar:'تنظيف', subsubs:[{v:'HomeCleaning',ar:'منازل'},{v:'OfficeCleaning',ar:'مكاتب'},{v:'CarWash',ar:'غسيل سيارات'},{v:'SofaCleaning',ar:'أثاث'},{v:'Other',ar:'أخرى'}]},
    {v:'Repairs', ar:'إصلاح', subsubs:[{v:'Electronics',ar:'إلكترونيات'},{v:'Appliances',ar:'أجهزة'},{v:'Furniture',ar:'أثاث'},{v:'Other',ar:'أخرى'}]},
    {v:'Education', ar:'دروس', subsubs:[{v:'Math',ar:'رياضيات'},{v:'Science',ar:'علوم'},{v:'Languages',ar:'لغات'},{v:'Quran',ar:'قرآن'},{v:'Music',ar:'موسيقى'},{v:'Other',ar:'أخرى'}]},
    {v:'Health', ar:'صحة وجمال', subsubs:[{v:'Fitness',ar:'لياقة'},{v:'Nutrition',ar:'تغذية'},{v:'Salon',ar:'صالون'},{v:'Spa',ar:'سبا'},{v:'Other',ar:'أخرى'}]},
    {v:'Transport', ar:'نقل', subsubs:[{v:'FurnitureMoving',ar:'نقل أثاث'},{v:'Delivery',ar:'توصيل'},{v:'AirportTransfer',ar:'مطار'},{v:'Other',ar:'أخرى'}]},
    {v:'Design', ar:'تصميم', subsubs:[{v:'LogoDesign',ar:'شعار'},{v:'Print',ar:'طباعة'},{v:'WebDesign',ar:'مواقع'},{v:'Video',ar:'فيديو'},{v:'Photography',ar:'تصوير'},{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
  ],
  Supermarket: [
    {v:'Food', ar:'غذاء', subsubs:[{v:'Fresh',ar:'طازج'},{v:'Dairy',ar:'ألبان وبيض'},{v:'Bakery',ar:'مخبوزات'},{v:'Canned',ar:'معلبات'},{v:'Snacks',ar:'سناكس'},{v:'Other',ar:'أخرى'}]},
    {v:'Beverages', ar:'مشروبات', subsubs:[{v:'Juice',ar:'عصائر'},{v:'Water',ar:'مياه'},{v:'SoftDrinks',ar:'غازي'},{v:'Energy',ar:'طاقة'},{v:'HotDrinks',ar:'ساخنة'},{v:'Other',ar:'أخرى'}]},
    {v:'PersonalCare', ar:'عناية شخصية', subsubs:[{v:'Skincare',ar:'بشرة'},{v:'HairCare',ar:'شعر'},{v:'OralCare',ar:'أسنان'},{v:'Hygiene',ar:'نظافة'},{v:'Other',ar:'أخرى'}]},
    {v:'Household', ar:'منزلية', subsubs:[{v:'Cleaning',ar:'منظفات'},{v:'Kitchen',ar:'مطبخ'},{v:'Other',ar:'أخرى'}]},
    {v:'BabyProducts', ar:'منتجات أطفال', subsubs:[{v:'Diapers',ar:'حفاضات'},{v:'BabyFood',ar:'أغذية أطفال'},{v:'BabyToys',ar:'ألعاب'},{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
  ],
  Pharmacy: [
    {v:'Medicines', ar:'أدوية', subsubs:[{v:'OTC',ar:'بدون وصفة'},{v:'Vitamins',ar:'فيتامينات'},{v:'Herbal',ar:'أعشاب'},{v:'Other',ar:'أخرى'}]},
    {v:'MedicalDevices', ar:'أجهزة طبية', subsubs:[{v:'BloodPressure',ar:'جهاز ضغط'},{v:'BloodSugar',ar:'جهاز سكر'},{v:'Thermometer',ar:'ترمومتر'},{v:'Other',ar:'أخرى'}]},
    {v:'Supplements', ar:'مكملات', subsubs:[{v:'Protein',ar:'بروتين'},{v:'WeightLoss',ar:'تخسيس'},{v:'MuscleBuilding',ar:'بناء عضلات'},{v:'Other',ar:'أخرى'}]},
    {v:'BabyHealth', ar:'صحة أطفال', subsubs:[{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
  ],
  'Fast Food': [
    {v:'Pizza', ar:'بيتزا', subsubs:[{v:'Margherita',ar:'مارغريتا'},{v:'Pepperoni',ar:'بيبروني'},{v:'Seafood',ar:'بحرية'},{v:'Other',ar:'أخرى'}]},
    {v:'Burgers', ar:'برجر', subsubs:[{v:'BeefBurger',ar:'لحم'},{v:'ChickenBurger',ar:'دجاج'},{v:'DoubleBurger',ar:'دبل'},{v:'Other',ar:'أخرى'}]},
    {v:'Sandwiches', ar:'ساندوتشات', subsubs:[{v:'Shawarma',ar:'شاورما'},{v:'Falafel',ar:'فلافل'},{v:'Kofta',ar:'كفتة'},{v:'Other',ar:'أخرى'}]},
    {v:'Desserts', ar:'حلويات', subsubs:[{v:'IceCream',ar:'آيس كريم'},{v:'Cake',ar:'كيك'},{v:'Kunafa',ar:'كنافة'},{v:'Other',ar:'أخرى'}]},
    {v:'Oriental', ar:'شرقي', subsubs:[{v:'Koshary',ar:'كشري'},{v:'Grills',ar:'مشويات'},{v:'Mahshi',ar:'محشي'},{v:'Other',ar:'أخرى'}]},
    {v:'Seafood', ar:'مأكولات بحرية', subsubs:[{v:'Fish',ar:'سمك'},{v:'Shrimp',ar:'جمبري'},{v:'Mixed',ar:'مشكل'},{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
  ],
  Fashion: [
    {v:'MensClothing', ar:'رجالي', subsubs:[{v:'Formal',ar:'رسمي'},{v:'Casual',ar:'كاجوال'},{v:'Sports',ar:'رياضي'},{v:'Traditional',ar:'تقليدي'},{v:'Other',ar:'أخرى'}]},
    {v:'WomensClothing', ar:'نسائي', subsubs:[{v:'Abayas',ar:'عبايات'},{v:'Dresses',ar:'فساتين'},{v:'Casual',ar:'كاجوال'},{v:'Sports',ar:'رياضي'},{v:'Other',ar:'أخرى'}]},
    {v:'KidsClothing', ar:'أطفال', subsubs:[{v:'Boys',ar:'أولاد'},{v:'Girls',ar:'بنات'},{v:'Baby',ar:'مواليد'},{v:'SchoolUniform',ar:'يونيفورم'},{v:'Other',ar:'أخرى'}]},
    {v:'Shoes', ar:'أحذية', subsubs:[{v:'Sneakers',ar:'سنيكرز'},{v:'Sandals',ar:'صنادل'},{v:'Sports',ar:'رياضي'},{v:'Formal',ar:'رسمي'},{v:'Other',ar:'أخرى'}]},
    {v:'Bags', ar:'شنط', subsubs:[{v:'Handbag',ar:'حقيبة يد'},{v:'Backpack',ar:'ظهر'},{v:'TravelBag',ar:'سفر'},{v:'Wallet',ar:'محفظة'},{v:'Other',ar:'أخرى'}]},
    {v:'Accessories', ar:'إكسسوارات', subsubs:[{v:'Jewelry',ar:'مجوهرات'},{v:'Watches',ar:'ساعات'},{v:'Sunglasses',ar:'نظارات'},{v:'Other',ar:'أخرى'}]},
    {v:'Other', ar:'أخرى', subsubs:[]},
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
  const [duplicateWarning, setDuplicateWarning] = useState(null);
  const [subsub, setSubsub] = useState('Other');

  // ── Multi-media state ──────────────────────────────────────────────────────
  const [mediaFiles, setMediaFiles] = useState([]); // up to 5 images OR 1 video
  const [mediaType, setMediaType] = useState(null); // 'images' | 'video'
  const [mediaPreviews, setMediaPreviews] = useState([]); // object URLs for display

  // Revoke object URLs on component unmount to prevent memory leaks
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
    // Auto-detect currency based on user's country
    const currency = detectCurrency();
    setForm(f => ({ ...f, currency: currency.code }));
    const user = JSON.parse(localStorage.getItem('user') || '{}');
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
  }, []);

  // ── handlePhotoSelect — max 5, silent auto-analysis on first photo ─────────
  const handlePhotoSelect = async (e) => {
    const files = Array.from(e.target.files).slice(0, 5);
    if (!files.length) return;
    setMediaType('images');
    setMediaFiles(files);
    setVideoFile(null);
    const previews = files.map(f => URL.createObjectURL(f));
    setMediaPreviews(previews);

    // Silent auto-analysis on first image
    try {
      const { analyzeImageFile } = await import('../components/ImageAnalyzer');
      const result = await analyzeImageFile(files[0]);
      if (result) {
        if (!form.title || form.title.length < 3) setForm(f => ({ ...f, title: result.title }));
        if (!form.description || form.description.length < 10) setForm(f => ({ ...f, description: result.description }));
        if (result.category && !form.category) setForm(f => ({ ...f, category: result.category }));
      }
    } catch {}
  };

  // ── handleVideoSelect — validate 30s max ──────────────────────────────────
  const handleVideoSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const video = document.createElement('video');
    video.preload = 'metadata';
    video.src = URL.createObjectURL(file);
    await new Promise(r => { video.onloadedmetadata = r; video.onerror = r; });

    if (video.duration > 30) {
      alert('⚠️ الفيديو يجب أن يكون 30 ثانية كحد أقصى');
      return;
    }

    setMediaType('video');
    setVideoFile(file);
    setMediaFiles([]);
    setMediaPreviews([URL.createObjectURL(file)]);
  };

  function validate() {
    const e = {};
    if (!form.title.trim()) e.title = 'العنوان مطلوب';
    else if (form.title.trim().length < 5) e.title = 'العنوان قصير جداً (5 أحرف على الأقل)';
    if (!form.category) e.category = 'الفئة مطلوبة';
    if (form.price && isNaN(Number(form.price))) e.price = 'السعر يجب أن يكون رقماً';
    if (form.phone && !/^[\d\s+\-()]{7,15}$/.test(form.phone)) e.phone = 'رقم الهاتف غير صحيح';
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  async function submit(forceDuplicate = false) {
    if (!validate()) return;

    // DUPLICATE DETECTION
    if (!forceDuplicate && form.title.trim().length >= 5) {
      try {
        const myAdsRes = await fetchWithRetry(`${API}/api/ads/my/all`, {
          headers: { Authorization: `Bearer ${token}` },
        }, { retries: 1 });
        const myAdsData = await myAdsRes.json();
        const myActiveAds = myAdsData?.active || [];
        if (myActiveAds.length > 0) {
          const similar = await checkAdSimilarity(form.title, myActiveAds);
          const highSimilarity = similar.filter(s => s.similarity >= 80);
          if (highSimilarity.length > 0) {
            setDuplicateWarning({
              message: `⚠️ يبدو أن لديك إعلاناً مشابهاً: "${myActiveAds[highSimilarity[0].index - 1]?.title}" (تشابه ${highSimilarity[0].similarity}%). هل تريد المتابعة؟`,
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
      // ── Build FormData ─────────────────────────────────────────────────────
      const formData = new FormData();
      formData.append('title', form.title);
      formData.append('description', form.description);
      formData.append('price', form.price || '0');
      formData.append('category', form.category);
      formData.append('city', form.city || '');
      formData.append('country', country || 'EG');
      formData.append('phone', form.phone || '');
      formData.append('currency', form.currency || 'EGP');
      formData.append('condition', form.condition || '');
      formData.append('subcategory', form.subcategory || '');
      formData.append('subsub', subsub || 'Other');

      // Attach media files
      if (mediaType === 'images' && mediaFiles.length > 0) {
        mediaFiles.forEach((file) => formData.append('images', file));
      } else if (mediaType === 'video' && videoFile) {
        formData.append('video', videoFile);
      }

      const t = localStorage.getItem('token') || localStorage.getItem('fox_token') || localStorage.getItem('auth_token') || token;
      // FIX E: Debug FormData before submit — visible in browser console
      console.log('Submitting FormData entries:', [...formData.entries()].map(([k,v]) => [k, typeof v === 'string' ? v.slice(0,50) : v.name]));
      const res = await fetch(`${API}/api/ads`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${t}` }, // NO Content-Type — FormData sets it
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        if (res.status === 429) {
          setErrors({ submit: 'لقد وصلت للحد اليومي: يمكنك نشر إعلانين فقط في اليوم الواحد' });
        } else {
          setErrors({ submit: err.message || err.error || 'خطأ في الخادم. يرجى المحاولة لاحقاً.' });
        }
        setLoading(false);
        return;
      }

      const resData = await res.json().catch(() => ({}));
      if (form.phone) localStorage.setItem('last_used_phone', form.phone);
      // Redirect to the new ad if we got an ID, otherwise to homepage
      const newAdId = resData?.ad?._id || resData?._id || resData?.id;
      window.location.href = newAdId ? `/ads/${newAdId}?published=1` : `/?published=1`;
    } catch (e) {
      setErrors({ submit: e.message || 'خطأ في الاتصال بالخادم' });
    }
    setLoading(false);
  }

  const inputStyle = (field) => ({
    width: '100%', padding: '11px 14px', borderRadius: 10,
    border: `1.5px solid ${errors[field] ? '#e53e3e' : '#e0e0e0'}`,
    fontSize: 16, boxSizing: 'border-box',
    fontFamily: "'Cairo', 'Tajawal', system-ui",
    direction: 'rtl', background: errors[field] ? '#fff5f5' : '#fff',
    outline: 'none', transition: 'border-color 0.2s',
  });

  const labelStyle = {
    display: 'block', fontWeight: 'bold', marginBottom: 6, fontSize: 14, color: '#333',
  };

  const stepCount = step === 'start' ? 1 : 2;

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
          <h1 style={{ color: 'white', margin: 0, fontSize: 18, fontWeight: 'bold' }}>نشر إعلان جديد</h1>
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
        {/* Duplicate warning */}
        {duplicateWarning && (
          <div role="alert" style={{
            background: '#fffbeb', border: '1.5px solid #f59e0b',
            borderRadius: 12, padding: '14px 16px', marginBottom: 16,
            direction: 'rtl', fontFamily: 'Cairo, sans-serif',
          }}>
            <p style={{ margin: '0 0 10px', fontSize: 14, color: '#92400e', fontWeight: 600 }}>
              {duplicateWarning.message}
            </p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button onClick={() => setDuplicateWarning(null)}
                style={{ padding: '7px 14px', borderRadius: 8, border: '1px solid #d1d5db',
                  background: '#fff', fontSize: 13, cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                ✏️ تعديل الإعلان
              </button>
              <button onClick={() => submit(true)}
                style={{ padding: '7px 14px', borderRadius: 8, border: 'none',
                  background: '#002f34', color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: 'pointer', fontFamily: 'Cairo, sans-serif' }}>
                نشر على أي حال
              </button>
            </div>
          </div>
        )}

        {/* Submit error */}
        {errors.submit && (
          <div role="alert" style={{
            background: '#fff0f0', border: '1px solid #fcc',
            borderRadius: 10, padding: '12px 14px', marginBottom: 16, color: '#c00', fontSize: 14,
          }}>
            ⚠️ {errors.submit}
          </div>
        )}

        {/* Step 1: Start */}
        {step === 'start' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <p style={{ textAlign: 'center', color: '#555', fontSize: 15, margin: '0 0 8px' }}>
              كيف تريد إضافة إعلانك؟
            </p>
            <button onClick={() => setStep('form')}
              style={{
                display: 'block', background: '#002f34', color: 'white',
                textAlign: 'center', padding: '28px 20px', borderRadius: 18,
                cursor: 'pointer', fontSize: 17, fontWeight: 'bold',
                boxShadow: '0 4px 12px rgba(0,47,52,0.2)', border: 'none',
                fontFamily: 'inherit', width: '100%',
              }}>
              <div style={{ fontSize: 44, marginBottom: 10 }}>📸</div>
              <div>أضف إعلانك</div>
              <div style={{ fontSize: 13, opacity: 0.8, marginTop: 6, fontWeight: 'normal' }}>
                صور + فيديو + تحليل تلقائي بالذكاء الاصطناعي ✨
              </div>
            </button>
            <button onClick={() => setStep('form')}
              style={{
                background: 'white', color: '#002f34', padding: '20px', borderRadius: 18,
                cursor: 'pointer', fontSize: 16, fontWeight: 'bold',
                border: '2px solid #002f34', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              }}>
              <span style={{ fontSize: 24 }}>✍️</span>
              إضافة يدوياً
            </button>
          </div>
        )}

        {/* Step 2: Form */}
        {step === 'form' && (
          <div style={{ background: 'white', borderRadius: 18, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>

            {/* ── Media picker — Photos OR Video ─────────────────────────── */}
            {/* Photo picker */}
            <input type="file" accept="image/*" multiple capture="environment"
              onChange={handlePhotoSelect} style={{ display: 'none' }} id="photo-input" />
            {/* Video picker */}
            <input type="file" accept="video/*" capture="environment"
              onChange={handleVideoSelect} style={{ display: 'none' }} id="video-input" />

            <div style={{ display: 'flex', gap: 8, marginBottom: 12 }}>
              <label htmlFor="photo-input" style={{
                flex: 1, padding: '10px', background: '#6366f1', color: 'white',
                borderRadius: 10, textAlign: 'center', cursor: 'pointer', fontSize: 14,
              }}>
                📷 إضافة صور
              </label>
              <label htmlFor="video-input" style={{
                flex: 1, padding: '10px', background: '#8b5cf6', color: 'white',
                borderRadius: 10, textAlign: 'center', cursor: 'pointer', fontSize: 14,
              }}>
                🎥 فيديو 30 ثانية
              </label>
            </div>

            {/* Media previews */}
            {mediaPreviews.length > 0 && (
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
                {mediaType === 'images' && mediaPreviews.map((src, i) => (
                  <div key={i} style={{ position: 'relative' }}>
                    <img src={src} alt={`صورة ${i + 1}`}
                      style={{ width: 80, height: 80, objectFit: 'cover', borderRadius: 8 }} />
                    <button onClick={() => {
                      const newFiles = mediaFiles.filter((_, idx) => idx !== i);
                      const newPreviews = mediaPreviews.filter((_, idx) => idx !== i);
                      setMediaFiles(newFiles);
                      setMediaPreviews(newPreviews);
                      if (!newFiles.length) setMediaType(null);
                    }} style={{
                      position: 'absolute', top: -6, right: -6, background: 'red', color: 'white',
                      border: 'none', borderRadius: '50%', width: 20, height: 20,
                      cursor: 'pointer', fontSize: 12,
                    }}>×</button>
                  </div>
                ))}
                {mediaType === 'video' && (
                  <video src={mediaPreviews[0]} controls
                    style={{ width: '100%', borderRadius: 10, maxHeight: 200 }} />
                )}
              </div>
            )}

            {/* AI status */}
            {aiStatus && (
              <div style={{
                padding: '10px 16px', borderRadius: 8, marginBottom: 12,
                background: aiStatus.includes('✅') ? '#e8f5e9' : '#fff8e1',
                color: aiStatus.includes('✅') ? '#2e7d32' : '#f57f17',
                fontSize: 14, textAlign: 'center',
              }}>
                {aiStatus}
              </div>
            )}

            {/* Title */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-title">
                عنوان الإعلان <span style={{ color: '#e53e3e' }}>*</span>
              </label>
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
                      const r = await fetch(`${API}/api/ads/ai-generate`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${tok}` },
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
                style={inputStyle('title')} maxLength={100}
                aria-required="true" />
              {errors.title && (
                <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>
                  ⚠️ {errors.title}
                </p>
              )}
            </div>

            {/* Description */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-desc">الوصف</label>
              <textarea id="sell-desc" value={form.description}
                onChange={e => {
                  setForm(p => ({ ...p, description: e.target.value }));
                  setCharCount(e.target.value.length);
                }}
                placeholder="اكتب وصفاً تفصيلياً للمنتج..."
                style={{ ...inputStyle('description'), resize: 'vertical', minHeight: 90 }}
                maxLength={1000} />
              <p style={{ textAlign: 'left', fontSize: 11, color: '#aaa', margin: '3px 0 0' }}>
                {charCount}/1000
              </p>
            </div>

            {/* Category */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>
                الفئة <span style={{ color: '#e53e3e' }}>*</span>
              </label>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
                {CATS.map(cat => (
                  <button key={cat.en} type="button"
                    onClick={() => { setForm(p => ({ ...p, category: cat.en, subcategory: 'Other' })); setSubsub('Other'); if (errors.category) setErrors(p => ({ ...p, category: '' })); }}
                    aria-pressed={form.category === cat.en}
                    style={{
                      padding: '10px 6px', borderRadius: 10,
                      border: `2px solid ${form.category === cat.en ? '#002f34' : '#e0e0e0'}`,
                      background: form.category === cat.en ? '#002f34' : '#fafafa',
                      color: form.category === cat.en ? 'white' : '#444',
                      cursor: 'pointer', fontSize: 12, fontWeight: 'bold', fontFamily: 'inherit',
                      textAlign: 'center', display: 'flex', flexDirection: 'column',
                      alignItems: 'center', gap: 3, transition: 'all 0.15s',
                    }}>
                    <span style={{ fontSize: 20 }}>{cat.icon}</span>
                    <span>{cat.ar}</span>
                  </button>
                ))}
              </div>
              {errors.category && (
                <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '6px 0 0' }}>
                  ⚠️ {errors.category}
                </p>
              )}
              <CategoryPriceHint category={form.category} />
              {form.category && SUBCATS[form.category] && (
                <div style={{ marginTop: 10 }}>
                  <label style={labelStyle}>الفئة الفرعية</label>
                  <select
                    value={form.subcategory || 'Other'}
                    onChange={e => { setForm(p => ({ ...p, subcategory: e.target.value })); setSubsub('Other'); }}
                    aria-label="الفئة الفرعية"
                    style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 15, fontFamily: "'Cairo', 'Tajawal', system-ui", direction: 'rtl', background: '#fff', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                  >
                    {SUBCATS[form.category].map(function(s) { return (
                      <option key={s.v} value={s.v}>{s.ar}</option>
                    ); })}
                  </select>
                </div>
              )}
              {form.category && SUBCATS[form.category] && (function() {
                var _selSub = SUBCATS[form.category].find(function(s) { return s.v === form.subcategory; });
                return _selSub && _selSub.subsubs && _selSub.subsubs.length > 0 ? (
                  <div style={{ marginTop: 10 }}>
                    <label style={labelStyle}>التصنيف الدقيق</label>
                    <select
                      value={subsub}
                      onChange={e => setSubsub(e.target.value)}
                      aria-label="التصنيف الدقيق"
                      style={{ width: '100%', padding: '11px 14px', borderRadius: 10, border: '1.5px solid #e0e0e0', fontSize: 15, fontFamily: "'Cairo', 'Tajawal', system-ui", direction: 'rtl', background: '#fff', outline: 'none', boxSizing: 'border-box', cursor: 'pointer' }}
                    >
                      {_selSub.subsubs.map(function(ss) { return (
                        <option key={ss.v} value={ss.v}>{ss.ar}</option>
                      ); })}
                    </select>
                  </div>
                ) : null;
              })()}
            </div>

            {/* Condition */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle}>حالة المنتج</label>
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {CONDITIONS.map(c => (
                  <button key={c.en} type="button"
                    onClick={() => setForm(p => ({ ...p, condition: c.en }))}
                    aria-pressed={form.condition === c.en}
                    style={{
                      padding: '8px 14px', borderRadius: 20,
                      border: `2px solid ${form.condition === c.en ? '#002f34' : '#e0e0e0'}`,
                      background: form.condition === c.en ? '#002f34' : '#fafafa',
                      color: form.condition === c.en ? 'white' : '#444',
                      cursor: 'pointer', fontSize: 13, fontWeight: 'bold',
                      fontFamily: 'inherit', transition: 'all 0.15s',
                    }}>
                    {c.icon} {c.ar}
                  </button>
                ))}
              </div>
            </div>

            {/* Price + Currency */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-price">السعر</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <select value={form.currency}
                  onChange={e => setForm(p => ({ ...p, currency: e.target.value }))}
                  aria-label="العملة"
                  style={{
                    padding: '11px 10px', borderRadius: 10, border: '1.5px solid #e0e0e0',
                    fontSize: 14, fontFamily: 'inherit', background: '#fff', direction: 'ltr',
                  }}>
                  {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                <input id="sell-price" value={form.price}
                  onChange={e => { setForm(p => ({ ...p, price: e.target.value })); if (errors.price) setErrors(p => ({ ...p, price: '' })); }}
                  type="number" min="0" placeholder="0" inputMode="numeric"
                  style={{ ...inputStyle('price'), flex: 1, direction: 'ltr' }} />
              </div>
              {errors.price && (
                <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>
                  ⚠️ {errors.price}
                </p>
              )}
            </div>

            {/* City */}
            <div style={{ marginBottom: 14 }}>
              <label style={labelStyle} htmlFor="sell-city">المدينة</label>
              <input id="sell-city" value={form.city}
                onChange={e => setForm(p => ({ ...p, city: e.target.value }))}
                placeholder="مثال: القاهرة، الرياض، دبي..."
                style={inputStyle('city')} />
            </div>

            {/* Phone */}
            <div style={{ marginBottom: 20 }}>
              <label style={labelStyle} htmlFor="sell-phone">رقم التواصل</label>
              <input id="sell-phone" value={form.phone}
                onChange={e => { setForm(p => ({ ...p, phone: e.target.value })); if (errors.phone) setErrors(p => ({ ...p, phone: '' })); }} inputMode="tel" autoComplete="tel"
                type="tel" placeholder="مثال: +201012345678"
                style={{ ...inputStyle('phone'), direction: 'ltr' }} />
              {errors.phone && (
                <p role="alert" style={{ color: '#e53e3e', fontSize: 12, margin: '4px 0 0' }}>
                  ⚠️ {errors.phone}
                </p>
              )}
            </div>

            {/* Submit */}
            <button onClick={() => submit()} disabled={loading} aria-busy={loading}
              style={{
                width: '100%', padding: '14px',
                background: loading ? '#aaa' : '#002f34', color: 'white',
                border: 'none', borderRadius: 14, fontWeight: 'bold', fontSize: 17,
                cursor: loading ? 'not-allowed' : 'pointer', fontFamily: 'inherit',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                gap: 10, transition: 'background 0.2s',
              }}>
              {loading ? (
                <><span style={{ display: 'inline-block' }}>⏳</span> جار النشر...</>
              ) : (
                <>🚀 نشر الإعلان</>
              )}
            </button>

            <p style={{ textAlign: 'center', fontSize: 12, color: '#888', marginTop: 10 }}>
              بالنشر توافق على{' '}
              <a href="/terms" style={{ color: '#002f34' }}>شروط الاستخدام</a>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
