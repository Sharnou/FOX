'use client';
import { useState, useMemo } from 'react';

/**
 * AdBundleCreator.jsx
 * XTOX Marketplace — Seller bundle deal creator
 * Allows sellers to group multiple ads into a discounted package
 * Arabic-first, RTL, Cairo/Tajawal, multi-currency, Arabic-Indic numerals
 * Props:
 *   sellerAds      – array of { _id, title, titleAr, price, currency, image, category }
 *   onBundleCreate – callback(bundleData)
 *   lang           – 'ar' | 'en' | 'de'  (default 'ar')
 *   className      – extra Tailwind classes
 */

const CURRENCIES = ['EGP', 'SAR', 'AED', 'USD'];
const RATES = { EGP: 1, SAR: 8.5, AED: 9.2, USD: 31 };
const MAX_BUNDLE_ADS = 5;

const T = {
  ar: {
    title: 'إنشاء صفقة حزمة',
    subtitle: 'اجمع إعلانات متعددة في حزمة واحدة بسعر مخفض',
    selectAds: 'اختر الإعلانات',
    selectHint: `اختر من 2 إلى ${MAX_BUNDLE_ADS} إعلانات`,
    bundleName: 'اسم الحزمة',
    bundleNamePh: 'مثال: حزمة أثاث المنزل',
    bundleDesc: 'وصف الحزمة',
    bundleDescPh: 'صف ما يميز هذه الحزمة…',
    bundlePrice: 'سعر الحزمة',
    currency: 'العملة',
    individualTotal: 'القيمة الأصلية',
    bundleSaving: 'توفير',
    discountPct: 'خصم',
    preview: 'معاينة الحزمة',
    create: 'إنشاء الحزمة',
    included: 'مُضمَّن في الحزمة',
    noAds: 'لا توجد إعلانات نشطة. أضف إعلانات أولاً.',
    maxReached: `الحد الأقصى ${MAX_BUNDLE_ADS} إعلانات`,
    validation: {
      minAds: 'اختر إعلانين على الأقل',
      noName: 'أدخل اسماً للحزمة',
      noPrice: 'أدخل سعراً للحزمة',
      highPrice: 'سعر الحزمة أعلى من الإجمالي الأصلي',
      minDiscount: 'يجب أن يكون الخصم 5% على الأقل',
    },
    created: 'تم إنشاء الحزمة بنجاح!',
    items: 'منتج',
    save: 'وفّر',
    dealBadge: 'صفقة حزمة',
    tips: 'نصائح لحزمة ناجحة',
    tip1: 'اختر منتجات تكمل بعضها (مثل هاتف + سماعة)',
    tip2: 'قدّم خصماً بين 10% و30% لجذب المشترين',
    tip3: 'أضف وصفاً واضحاً يوضح الفائدة من الحزمة',
  },
  en: {
    title: 'Create Bundle Deal',
    subtitle: 'Group multiple ads into one discounted package',
    selectAds: 'Select Ads',
    selectHint: `Choose 2 to ${MAX_BUNDLE_ADS} ads`,
    bundleName: 'Bundle Name',
    bundleNamePh: 'e.g. Home Furniture Set',
    bundleDesc: 'Bundle Description',
    bundleDescPh: 'Describe what makes this bundle great…',
    bundlePrice: 'Bundle Price',
    currency: 'Currency',
    individualTotal: 'Individual Total',
    bundleSaving: 'Saving',
    discountPct: 'Discount',
    preview: 'Preview Bundle',
    create: 'Create Bundle',
    included: 'Included in Bundle',
    noAds: 'No active ads. Add ads first.',
    maxReached: `Max ${MAX_BUNDLE_ADS} ads`,
    validation: {
      minAds: 'Select at least 2 ads',
      noName: 'Enter a bundle name',
      noPrice: 'Enter a bundle price',
      highPrice: 'Bundle price is higher than individual total',
      minDiscount: 'Discount must be at least 5%',
    },
    created: 'Bundle created successfully!',
    items: 'items',
    save: 'Save',
    dealBadge: 'Bundle Deal',
    tips: 'Tips for a great bundle',
    tip1: 'Pick complementary items (e.g. phone + earphones)',
    tip2: 'Offer 10–30% discount to attract buyers',
    tip3: 'Write a clear description explaining the bundle value',
  },
  de: {
    title: 'Bundle-Angebot erstellen',
    subtitle: 'Mehrere Anzeigen zu einem Paket zusammenfassen',
    selectAds: 'Anzeigen wählen',
    selectHint: `2 bis ${MAX_BUNDLE_ADS} Anzeigen wählen`,
    bundleName: 'Paketname',
    bundleNamePh: 'z. B. Möbel-Set',
    bundleDesc: 'Paketbeschreibung',
    bundleDescPh: 'Beschreiben Sie das Paket…',
    bundlePrice: 'Paketpreis',
    currency: 'Währung',
    individualTotal: 'Einzelsumme',
    bundleSaving: 'Ersparnis',
    discountPct: 'Rabatt',
    preview: 'Vorschau',
    create: 'Paket erstellen',
    included: 'Im Paket enthalten',
    noAds: 'Keine aktiven Anzeigen vorhanden.',
    maxReached: `Max. ${MAX_BUNDLE_ADS} Anzeigen`,
    validation: {
      minAds: 'Mindestens 2 Anzeigen wählen',
      noName: 'Paketname eingeben',
      noPrice: 'Paketpreis eingeben',
      highPrice: 'Paketpreis über Einzelsumme',
      minDiscount: 'Mindestrabatt 5 %',
    },
    created: 'Paket erfolgreich erstellt!',
    items: 'Artikel',
    save: 'Spare',
    dealBadge: 'Bundle-Deal',
    tips: 'Tipps für ein erfolgreiches Paket',
    tip1: 'Ergänzende Artikel kombinieren (z. B. Handy + Kopfhörer)',
    tip2: '10–30 % Rabatt bieten',
    tip3: 'Klare Beschreibung des Paketvorteils',
  },
};

function toArabicNumerals(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function formatPrice(amount, currency, lang) {
  const rounded = Math.round(amount);
  const numStr = lang === 'ar' ? toArabicNumerals(rounded.toLocaleString()) : rounded.toLocaleString();
  return `${numStr} ${currency}`;
}

function convertPrice(egpPrice, toCurrency) {
  return (egpPrice / RATES.EGP) * RATES[toCurrency];
}

// Demo ads if none provided
const DEMO_ADS = [
  { _id: '1', title: 'Samsung Galaxy S23', titleAr: 'سامسونج جالاكسي S23', price: 12000, currency: 'EGP', image: null, category: 'electronics' },
  { _id: '2', title: 'Wireless Earbuds', titleAr: 'سماعة لاسلكية', price: 800, currency: 'EGP', image: null, category: 'electronics' },
  { _id: '3', title: 'Phone Case', titleAr: 'غطاء هاتف', price: 150, currency: 'EGP', image: null, category: 'electronics' },
  { _id: '4', title: 'Desk Chair', titleAr: 'كرسي مكتب', price: 2500, currency: 'EGP', image: null, category: 'furniture' },
  { _id: '5', title: 'Study Lamp', titleAr: 'مصباح دراسة', price: 400, currency: 'EGP', image: null, category: 'furniture' },
  { _id: '6', title: 'Laptop Stand', titleAr: 'حامل لابتوب', price: 350, currency: 'EGP', image: null, category: 'electronics' },
];

const CATEGORY_ICONS = {
  electronics: '📱', furniture: '🪑', clothing: '👗', vehicles: '🚗', default: '📦',
};

export default function AdBundleCreator({ sellerAds = DEMO_ADS, onBundleCreate, lang: initLang = 'ar', className = '' }) {
  const [lang, setLang] = useState(initLang);
  const [selectedIds, setSelectedIds] = useState([]);
  const [bundleName, setBundleName] = useState('');
  const [bundleDesc, setBundleDesc] = useState('');
  const [bundlePrice, setBundlePrice] = useState('');
  const [currency, setCurrency] = useState('EGP');
  const [showPreview, setShowPreview] = useState(false);
  const [errors, setErrors] = useState({});
  const [success, setSuccess] = useState(false);

  const t = T[lang];
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  const selectedAds = useMemo(
    () => sellerAds.filter(a => selectedIds.includes(a._id)),
    [sellerAds, selectedIds]
  );

  const individualTotalEGP = useMemo(
    () => selectedAds.reduce((sum, a) => sum + (a.currency === 'EGP' ? a.price : a.price * (RATES.EGP / RATES[a.currency])), 0),
    [selectedAds]
  );

  const individualTotal = useMemo(
    () => convertPrice(individualTotalEGP, currency),
    [individualTotalEGP, currency]
  );

  const bundlePriceNum = parseFloat(bundlePrice) || 0;
  const savingAmount = Math.max(0, individualTotal - bundlePriceNum);
  const discountPct = individualTotal > 0 ? Math.round((savingAmount / individualTotal) * 100) : 0;

  function toggleAd(id) {
    setSelectedIds(prev => {
      if (prev.includes(id)) return prev.filter(x => x !== id);
      if (prev.length >= MAX_BUNDLE_ADS) return prev;
      return [...prev, id];
    });
    setErrors({});
  }

  function validate() {
    const e = {};
    if (selectedIds.length < 2) e.ads = t.validation.minAds;
    if (!bundleName.trim()) e.name = t.validation.noName;
    if (!bundlePriceNum) e.price = t.validation.noPrice;
    else if (bundlePriceNum >= individualTotal) e.price = t.validation.highPrice;
    else if (discountPct < 5) e.price = t.validation.minDiscount;
    setErrors(e);
    return Object.keys(e).length === 0;
  }

  function handleCreate() {
    if (!validate()) return;
    const bundleData = {
      name: bundleName,
      description: bundleDesc,
      adIds: selectedIds,
      bundlePrice: bundlePriceNum,
      currency,
      individualTotal,
      savingAmount,
      discountPct,
    };
    onBundleCreate?.(bundleData);
    setSuccess(true);
    setTimeout(() => setSuccess(false), 3000);
  }

  const adTitle = (ad) => lang === 'ar' ? (ad.titleAr || ad.title) : ad.title;


  function catIcon(cat) { return CATEGORY_ICONS[cat] || CATEGORY_ICONS.default; }

  return (
    <div dir={dir} className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl shadow-lg overflow-hidden max-w-2xl mx-auto ${className}`}>
      {/* Header */}
      <div className="bg-gradient-to-r from-violet-600 to-purple-700 px-6 py-5 text-white">
        <div className="flex items-center justify-between mb-1">
          <div>
            <h2 className="text-xl font-bold">{t.title}</h2>
            <p className="text-violet-200 text-sm mt-0.5">{t.subtitle}</p>
          </div>
          <span className="text-4xl">🎁</span>
        </div>
        {/* Lang switcher */}
        <div className="flex gap-1 mt-3">
          {['ar','en','de'].map(l => (
            <button key={l} onClick={() => setLang(l)}
              className={`px-3 py-1 rounded-full text-xs font-bold border transition-all ${lang === l ? 'bg-white text-violet-700 border-white' : 'bg-transparent text-white border-white/40 hover:border-white'}`}>
              {l === 'ar' ? 'ع' : l === 'en' ? 'EN' : 'DE'}
            </button>
          ))}
        </div>
      </div>

      <div className="p-5 space-y-5">
        {/* Select Ads */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="font-bold text-gray-800">{t.selectAds}</label>
            <span className="text-xs text-gray-500">{t.selectHint}</span>
          </div>
          {sellerAds.length === 0 ? (
            <p className="text-gray-400 text-sm text-center py-4">{t.noAds}</p>
          ) : (
            <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
              {sellerAds.map(ad => {
                const sel = selectedIds.includes(ad._id);
                const disabled = !sel && selectedIds.length >= MAX_BUNDLE_ADS;
                return (
                  <button key={ad._id} onClick={() => !disabled && toggleAd(ad._id)} disabled={disabled}
                    className={`w-full flex items-center gap-3 p-3 rounded-xl border-2 transition-all text-start ${sel ? 'border-violet-500 bg-violet-50' : disabled ? 'border-gray-100 bg-gray-50 opacity-50 cursor-not-allowed' : 'border-gray-200 hover:border-violet-300 bg-white'}`}>
                    <span className="text-2xl">{catIcon(ad.category)}</span>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{adTitle(ad)}</p>
                      <p className="text-violet-600 text-xs font-bold">{formatPrice(ad.price, ad.currency || 'EGP', lang)}</p>
                    </div>
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center flex-shrink-0 ${sel ? 'bg-violet-600 border-violet-600' : 'border-gray-300'}`}>
                      {sel && <span className="text-white text-xs">✓</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          )}
          {selectedIds.length >= MAX_BUNDLE_ADS && (
            <p className="text-amber-600 text-xs mt-1 font-medium">{t.maxReached}</p>
          )}
          {errors.ads && <p className="text-red-500 text-xs mt-1">{errors.ads}</p>}
        </div>

        {/* Bundle Summary Bar */}
        {selectedAds.length >= 2 && (
          <div className="bg-violet-50 rounded-xl p-4 flex flex-wrap gap-4 items-center justify-between">
            <div>
              <p className="text-xs text-gray-500">{t.individualTotal}</p>
              <p className="font-bold text-gray-800">{formatPrice(individualTotal, currency, lang)}</p>
            </div>
            {bundlePriceNum > 0 && discountPct >= 5 && (
              <>
                <div className="text-center">
                  <span className="bg-green-100 text-green-700 font-bold text-lg px-3 py-1 rounded-full">
                    -{lang === 'ar' ? toArabicNumerals(discountPct) : discountPct}%
                  </span>
                </div>
                <div>
                  <p className="text-xs text-gray-500">{t.bundleSaving}</p>
                  <p className="font-bold text-green-600">{formatPrice(savingAmount, currency, lang)}</p>
                </div>
              </>
            )}
            <div className="text-xs text-gray-500">
              {lang === 'ar' ? toArabicNumerals(selectedAds.length) : selectedAds.length} {t.items}
            </div>
          </div>
        )}

        {/* Bundle Name */}
        <div>
          <label className="block font-bold text-gray-800 mb-1 text-sm">{t.bundleName}</label>
          <input value={bundleName} onChange={e => setBundleName(e.target.value)} placeholder={t.bundleNamePh}
            className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${errors.name ? 'border-red-400' : 'border-gray-200 focus:border-violet-500'}`} />
          {errors.name && <p className="text-red-500 text-xs mt-1">{errors.name}</p>}
        </div>

        {/* Bundle Description */}
        <div>
          <label className="block font-bold text-gray-800 mb-1 text-sm">{t.bundleDesc}</label>
          <textarea value={bundleDesc} onChange={e => setBundleDesc(e.target.value)} placeholder={t.bundleDescPh} rows={2}
            className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-all resize-none" />
        </div>

        {/* Price + Currency */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-bold text-gray-800 mb-1 text-sm">{t.bundlePrice}</label>
            <input type="number" value={bundlePrice} onChange={e => setBundlePrice(e.target.value)} placeholder="0"
              className={`w-full border-2 rounded-xl px-4 py-2.5 text-sm outline-none transition-all ${errors.price ? 'border-red-400' : 'border-gray-200 focus:border-violet-500'}`} />
            {errors.price && <p className="text-red-500 text-xs mt-1">{errors.price}</p>}
          </div>
          <div>
            <label className="block font-bold text-gray-800 mb-1 text-sm">{t.currency}</label>
            <select value={currency} onChange={e => setCurrency(e.target.value)}
              className="w-full border-2 border-gray-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:border-violet-500 transition-all bg-white">
              {CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        </div>

        {/* Preview toggle */}
        {selectedAds.length >= 2 && bundleName && bundlePriceNum > 0 && discountPct >= 5 && (
          <button onClick={() => setShowPreview(v => !v)}
            className="w-full border-2 border-violet-300 text-violet-700 rounded-xl py-2.5 text-sm font-bold hover:bg-violet-50 transition-all">
            👁 {t.preview}
          </button>
        )}

        {/* Preview Card */}
        {showPreview && selectedAds.length >= 2 && (
          <div className="border-2 border-violet-200 rounded-2xl p-4 bg-gradient-to-br from-violet-50 to-purple-50">
            <div className="flex items-center gap-2 mb-3">
              <span className="bg-violet-600 text-white text-xs font-bold px-2.5 py-1 rounded-full">🎁 {t.dealBadge}</span>
              {discountPct >= 5 && (
                <span className="bg-green-500 text-white text-xs font-bold px-2.5 py-1 rounded-full">
                  -{lang === 'ar' ? toArabicNumerals(discountPct) : discountPct}%
                </span>
              )}
            </div>
            <h3 className="font-bold text-gray-900 mb-1">{bundleName}</h3>
            {bundleDesc && <p className="text-gray-600 text-sm mb-3">{bundleDesc}</p>}
            <p className="text-xs text-gray-500 mb-2">{t.included}:</p>
            <div className="space-y-1 mb-3">
              {selectedAds.map(ad => (
                <div key={ad._id} className="flex items-center gap-2 text-sm">
                  <span>{catIcon(ad.category)}</span>
                  <span className="text-gray-700">{adTitle(ad)}</span>
                  <span className="text-gray-400 text-xs ms-auto">{formatPrice(ad.price, ad.currency || 'EGP', lang)}</span>
                </div>
              ))}
            </div>
            <div className="flex items-center justify-between pt-3 border-t border-violet-200">
              <div>
                <span className="text-gray-400 text-xs line-through">{formatPrice(individualTotal, currency, lang)}</span>
                <p className="font-bold text-violet-700 text-lg">{formatPrice(bundlePriceNum, currency, lang)}</p>
              </div>
              <span className="text-green-600 text-sm font-bold">{t.save} {formatPrice(savingAmount, currency, lang)}</span>
            </div>
          </div>
        )}

        {/* Tips */}
        <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
          <p className="font-bold text-amber-800 text-sm mb-2">💡 {t.tips}</p>
          <ul className="space-y-1">
            {[t.tip1, t.tip2, t.tip3].map((tip, i) => (
              <li key={i} className="text-amber-700 text-xs flex gap-2 items-start">
                <span className="mt-0.5 flex-shrink-0">{lang === 'ar' ? toArabicNumerals(i + 1) : i + 1}.</span>
                <span>{tip}</span>
              </li>
            ))}
          </ul>
        </div>

        {/* Create Button */}
        <button onClick={handleCreate}
          className="w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white font-bold rounded-xl py-3.5 text-base hover:opacity-90 transition-all shadow-lg shadow-violet-200 active:scale-95">
          🎁 {t.create}
        </button>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-xl p-3 text-center text-green-700 font-bold text-sm animate-pulse">
            ✅ {t.created}
          </div>
        )}
      </div>
    </div>
  );
}
