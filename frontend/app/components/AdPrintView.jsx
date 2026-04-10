'use client';

import { useState, useRef } from 'react';

// AdPrintView — print-optimized ad detail view for XTOX Arab marketplace
// Generates a printable / save-as-PDF version of any ad listing
// RTL-first, Cairo/Tajawal, Tailwind only, zero deps, ~310 lines
//
// Props:
//   ad             — ad object (see shape below)
//   lang           — 'ar' | 'en' (default 'ar')
//   className      — extra Tailwind classes
//
// ad shape:
//   _id / id, titleAr, title, descriptionAr, description,
//   price, currency, negotiable, condition,
//   category, categoryAr, city, cityAr,
//   images (array of URLs), createdAt, expiresAt,
//   sellerName, sellerNameAr, sellerCity, sellerCityAr, sellerAvatar

const T = {
  ar: {
    print: 'طباعة',
    whatsapp: 'واتساب',
    copyLink: 'نسخ الرابط',
    linkCopied: '✅ تم النسخ!',
    description: 'الوصف',
    details: 'التفاصيل',
    condition: 'الحالة',
    location: 'الموقع',
    posted: 'تاريخ النشر',
    expires: 'ينتهي في',
    adId: 'رقم الإعلان',
    seller: 'البائع',
    negotiable: 'قابل للتفاوض',
    fixed: 'سعر ثابت',
    new: 'جديد',
    used: 'مستعمل',
    likeNew: 'شبه جديد',
    scanQR: 'امسح الكود لمشاهدة الإعلان على XTOX',
    poweredBy: 'سوق إكستوكس — منصة البيع والشراء العربية',
    printTip: 'Ctrl+P أو ⌘+P للطباعة',
    egp: 'جنيه',
    noDesc: 'لا يوجد وصف',
  },
  en: {
    print: 'Print',
    whatsapp: 'WhatsApp',
    copyLink: 'Copy Link',
    linkCopied: '✅ Copied!',
    description: 'Description',
    details: 'Details',
    condition: 'Condition',
    location: 'Location',
    posted: 'Posted',
    expires: 'Expires',
    adId: 'Ad ID',
    seller: 'Seller',
    negotiable: 'Negotiable',
    fixed: 'Fixed Price',
    new: 'New',
    used: 'Used',
    likeNew: 'Like New',
    scanQR: 'Scan to view this ad on XTOX',
    poweredBy: 'XTOX Marketplace — Arab Buy & Sell Platform',
    printTip: 'Press Ctrl+P or ⌘+P to print',
    egp: 'EGP',
    noDesc: 'No description provided',
  },
};

function fmtDate(str, lang) {
  if (!str) return '—';
  try {
    return new Date(str).toLocaleDateString(
      lang === 'ar' ? 'ar-EG' : 'en-GB',
      { year: 'numeric', month: 'long', day: 'numeric' }
    );
  } catch {
    return str;
  }
}

function fmtPrice(price, currency, t) {
  if (price == null || price === '') return '—';
  const num = Number(price).toLocaleString('ar-EG');
  return `${num} ${currency || t.egp}`;
}

function QR({ value, size = 100 }) {
  const src = `https://api.qrserver.com/v1/create-qr-code/?size=${size}x${size}&data=${encodeURIComponent(value)}&ecc=M`;
  return (
    <img
      src={src}
      alt="QR"
      width={size}
      height={size}
      className="rounded border border-gray-200 bg-white"
      loading="lazy"
    />
  );
}

export default function AdPrintView({ ad = {}, lang = 'ar', className = '' }) {
  const t = T[lang] || T.ar;
  const isRTL = lang === 'ar';
  const [copied, setCopied] = useState(false);
  const [imgErr, setImgErr] = useState(false);

  const adId = ad._id || ad.id || '';
  const adUrl =
    typeof window !== 'undefined'
      ? `${window.location.origin}/ads/${adId}`
      : `https://fox-kohl-eight.vercel.app/ads/${adId}`;

  const title = lang === 'ar' ? ad.titleAr || ad.title : ad.title || ad.titleAr;
  const description =
    lang === 'ar' ? ad.descriptionAr || ad.description : ad.description || ad.descriptionAr;
  const category =
    lang === 'ar' ? ad.categoryAr || ad.category : ad.category || ad.categoryAr;
  const city = lang === 'ar' ? ad.cityAr || ad.city : ad.city || ad.cityAr;
  const sellerName =
    lang === 'ar'
      ? ad.sellerNameAr || ad.sellerName || ad.seller?.name
      : ad.sellerName || ad.seller?.name || ad.sellerNameAr;
  const sellerCity =
    lang === 'ar'
      ? ad.sellerCityAr || ad.sellerCity
      : ad.sellerCity || ad.sellerCityAr;

  const conditionLabel = {
    new: t.new,
    used: t.used,
    like_new: t.likeNew,
    جديد: t.new,
    مستعمل: t.used,
  }[ad.condition] || ad.condition;

  const expiryDate = ad.expiresAt
    ? fmtDate(ad.expiresAt, lang)
    : ad.createdAt
    ? fmtDate(
        new Date(new Date(ad.createdAt).getTime() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        lang
      )
    : '—';

  const detailRows = [
    { label: t.condition, val: conditionLabel },
    { label: t.location, val: city },
    { label: t.posted, val: fmtDate(ad.createdAt, lang) },
    { label: t.expires, val: expiryDate },
    { label: t.adId, val: adId ? String(adId).slice(-8) : undefined },
  ].filter((r) => r.val && r.val !== '—');

  function handlePrint() {
    if (typeof window !== 'undefined') window.print();
  }

  function handleWhatsApp() {
    const text = encodeURIComponent(`${title || ''} - ${adUrl}`);
    if (typeof window !== 'undefined') window.open(`https://wa.me/?text=${text}`, '_blank');
  }

  function handleCopy() {
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      navigator.clipboard.writeText(adUrl).then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 2500);
      });
    }
  }

  return (
    <div
      className={`font-[Cairo,Tajawal,sans-serif] bg-white ${className}`}
      dir={isRTL ? 'rtl' : 'ltr'}
    >
      {/* ── Action bar (hidden on print) ── */}
      <div className="flex flex-wrap items-center gap-3 p-4 bg-gray-50 border-b border-gray-200 print:hidden">
        <button
          onClick={handlePrint}
          className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          🖨️ {t.print}
        </button>
        <button
          onClick={handleWhatsApp}
          className="flex items-center gap-1.5 bg-green-500 hover:bg-green-600 active:bg-green-700 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors"
        >
          📱 {t.whatsapp}
        </button>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1.5 bg-gray-700 hover:bg-gray-800 active:bg-gray-900 text-white text-sm font-semibold px-4 py-2 rounded-lg transition-colors min-w-[120px]"
        >
          {copied ? t.linkCopied : `🔗 ${t.copyLink}`}
        </button>
        <span className="text-xs text-gray-400 ms-auto hidden sm:block">{t.printTip}</span>
      </div>

      {/* ── Printable area ── */}
      <div className="max-w-2xl mx-auto p-6 print:p-4 print:max-w-full">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 mb-5 border-b-2 border-blue-600">
          <div>
            <div className="text-2xl font-extrabold text-blue-700 tracking-tight">XTOX</div>
            <div className="text-xs text-gray-400 mt-0.5">{t.poweredBy}</div>
          </div>
          <QR value={adUrl} size={88} />
        </div>

        {/* Ad image */}
        {ad.images?.[0] && !imgErr && (
          <div className="mb-5 rounded-xl overflow-hidden border border-gray-100 bg-gray-50 flex items-center justify-center h-52 print:h-44">
            <img
              src={ad.images[0]}
              alt={title || ''}
              className="max-h-full max-w-full object-contain"
              onError={() => setImgErr(true)}
            />
          </div>
        )}

        {/* Title + price */}
        <div className="flex items-start justify-between gap-4 mb-5">
          <div className="flex-1 min-w-0">
            <h1 className="text-xl font-bold text-gray-900 leading-snug mb-1.5">
              {title || '—'}
            </h1>
            {category && (
              <span className="inline-block text-xs bg-blue-100 text-blue-700 rounded-full px-3 py-0.5 font-semibold">
                {category}
              </span>
            )}
          </div>
          <div className={`shrink-0 ${isRTL ? 'text-left' : 'text-right'}`}>
            <div className="text-2xl font-extrabold text-green-600">
              {fmtPrice(ad.price, ad.currency, t)}
            </div>
            {ad.negotiable != null && (
              <div
                className={`text-xs font-medium mt-0.5 ${
                  ad.negotiable ? 'text-orange-500' : 'text-gray-400'
                }`}
              >
                {ad.negotiable ? t.negotiable : t.fixed}
              </div>
            )}
          </div>
        </div>

        {/* Details grid */}
        {detailRows.length > 0 && (
          <div className="grid grid-cols-2 gap-3 mb-5">
            {detailRows.map(({ label, val }) => (
              <div key={label} className="bg-gray-50 rounded-lg p-3">
                <div className="text-xs text-gray-400 mb-1">{label}</div>
                <div className="text-sm font-semibold text-gray-800">{val}</div>
              </div>
            ))}
          </div>
        )}

        {/* Description */}
        <div className="mb-5">
          <div className="text-sm font-bold text-gray-700 mb-2">{t.description}</div>
          <div className="text-sm text-gray-600 leading-relaxed whitespace-pre-wrap bg-gray-50 rounded-lg p-3 border border-gray-100">
            {description || t.noDesc}
          </div>
        </div>

        {/* Seller card */}
        {sellerName && (
          <div className="mb-5 bg-blue-50 rounded-xl p-4 border border-blue-100">
            <div className="text-xs font-bold text-blue-600 uppercase tracking-wide mb-2">
              {t.seller}
            </div>
            <div className="flex items-center gap-3">
              {ad.sellerAvatar && (
                <img
                  src={ad.sellerAvatar}
                  alt=""
                  className="w-10 h-10 rounded-full object-cover border-2 border-blue-200 shrink-0"
                  onError={(e) => {
                    e.target.style.display = 'none';
                  }}
                />
              )}
              <div>
                <div className="font-semibold text-gray-800">{sellerName}</div>
                {sellerCity && (
                  <div className="text-xs text-gray-500 mt-0.5">📍 {sellerCity}</div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* QR + scan instruction footer */}
        <div className="flex items-center justify-center gap-5 mt-6 pt-5 border-t border-gray-200">
          <QR value={adUrl} size={80} />
          <div className="text-center">
            <div className="text-xs text-gray-500 font-medium">{t.scanQR}</div>
            <div className="text-xs text-gray-300 mt-1 break-all max-w-[200px]">{adUrl}</div>
          </div>
        </div>

        {/* Document footer */}
        <div className="mt-6 pt-4 border-t border-gray-100 text-center text-xs text-gray-300 print:block">
          {t.poweredBy} — fox-kohl-eight.vercel.app
        </div>
      </div>
    </div>
  );
}
