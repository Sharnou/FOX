'use client';
/**
 * SellerInvoiceGenerator.jsx
 * Printable invoice generator for XTOX Arab marketplace sellers.
 * Props:
 *   saleData    - { itemTitle, itemCategory, price, quantity, buyerCity, paymentMethod, saleDate, transactionId }
 *   sellerInfo  - { name, city, country, phone, rating }
 *   currency    - 'EGP' | 'SAR' | 'AED' | 'USD'
 *   lang        - 'ar' | 'en' | 'de'
 *   className   - optional wrapper class
 */
import { useState, useRef } from 'react';

const FX = { EGP: 1, SAR: 0.085, AED: 0.2, USD: 0.021 };
const SYMBOLS = { EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ', USD: '$' };

const LABELS = {
  ar: {
    title: 'فاتورة بيع',
    invoiceNo: 'رقم الفاتورة',
    date: 'التاريخ',
    hijriDate: 'التاريخ الهجري',
    seller: 'البائع',
    buyer: 'المشتري',
    city: 'المدينة',
    country: 'الدولة',
    phone: 'الهاتف',
    rating: 'التقييم',
    item: 'البضاعة',
    category: 'التصنيف',
    qty: 'الكمية',
    unitPrice: 'سعر الوحدة',
    subtotal: 'المجموع الفرعي',
    platformFee: 'رسوم المنصة (2%)',
    total: 'الإجمالي',
    payment: 'طريقة الدفع',
    transId: 'رقم العملية',
    thankYou: 'شكراً لثقتك في XTOX',
    print: 'طباعة الفاتورة',
    download: 'تحميل PDF',
    switch: 'اللغة',
    numerals: 'أرقام عربية',
    xtoxNote: 'هذه الفاتورة صادرة من منصة XTOX للسوق المحلي العربي',
    paid: 'مدفوعة',
  },
  en: {
    title: 'Sale Invoice',
    invoiceNo: 'Invoice No.',
    date: 'Date',
    hijriDate: 'Hijri Date',
    seller: 'Seller',
    buyer: 'Buyer',
    city: 'City',
    country: 'Country',
    phone: 'Phone',
    rating: 'Rating',
    item: 'Item',
    category: 'Category',
    qty: 'Quantity',
    unitPrice: 'Unit Price',
    subtotal: 'Subtotal',
    platformFee: 'Platform Fee (2%)',
    total: 'Total',
    payment: 'Payment Method',
    transId: 'Transaction ID',
    thankYou: 'Thank you for using XTOX',
    print: 'Print Invoice',
    download: 'Download PDF',
    switch: 'Language',
    numerals: 'Arabic Numerals',
    xtoxNote: 'This invoice is issued by XTOX Arab Local Marketplace',
    paid: 'PAID',
  },
  de: {
    title: 'Verkaufsrechnung',
    invoiceNo: 'Rechnungsnr.',
    date: 'Datum',
    hijriDate: 'Hijri-Datum',
    seller: 'Verkäufer',
    buyer: 'Käufer',
    city: 'Stadt',
    country: 'Land',
    phone: 'Telefon',
    rating: 'Bewertung',
    item: 'Artikel',
    category: 'Kategorie',
    qty: 'Menge',
    unitPrice: 'Stückpreis',
    subtotal: 'Zwischensumme',
    platformFee: 'Plattformgebühr (2%)',
    total: 'Gesamt',
    payment: 'Zahlungsmethode',
    transId: 'Transaktions-ID',
    thankYou: 'Vielen Dank für Ihre Nutzung von XTOX',
    print: 'Rechnung drucken',
    download: 'PDF herunterladen',
    switch: 'Sprache',
    numerals: 'Arabische Ziffern',
    xtoxNote: 'Diese Rechnung wurde vom XTOX arabischen Marktplatz ausgestellt',
    paid: 'BEZAHLT',
  },
};

function toHijri(date) {
  const jd =
    Math.floor((14 + 12 * date.getMonth() + 365.25 * (date.getFullYear() + Math.floor(date.getMonth() / 12))) / 12) -
    Math.floor(date.getFullYear() / 100) +
    Math.floor(date.getFullYear() / 400) +
    date.getDate() -
    32045 +
    Math.floor((14 + 11 * (Math.floor((14 + 12 * date.getMonth()) / 12)) +
      365 * (date.getFullYear() + Math.floor(date.getMonth() / 12)) -
      Math.floor((date.getFullYear() + Math.floor(date.getMonth() / 12)) / 100) +
      Math.floor((date.getFullYear() + Math.floor(date.getMonth() / 12)) / 400) +
      date.getDate() - 32167) / 29.5306);
  const l = jd - 1948440 + 10632;
  const n = Math.floor((l - 1) / 10631);
  const ll = l - 10631 * n + 354;
  const j =
    Math.floor((10985 - ll) / 5316) * Math.floor((50 * ll) / 17719) +
    Math.floor(ll / 5670) * Math.floor((43 * ll) / 15238);
  const lll = ll - Math.floor((30 - j) / 15) * Math.floor((17719 * j) / 50) - Math.floor(j / 16) * Math.floor((15238 * j) / 43) + 29;
  const month = Math.floor((24 + 29.5306 * (j - 1)) / 29.5306);
  const year = 30 * n + j - 30;
  const day = lll;
  const MONTHS_AR = ['محرم','صفر','ربيع الأول','ربيع الثاني','جمادى الأولى','جمادى الثانية','رجب','شعبان','رمضان','شوال','ذو القعدة','ذو الحجة'];
  return `${day} ${MONTHS_AR[(month - 1) % 12]} ${year}`;
}

function toArNumerals(str) {
  return String(str).replace(/[0-9]/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

export default function SellerInvoiceGenerator({
  saleData = {},
  sellerInfo = {},
  currency = 'EGP',
  lang: initialLang = 'ar',
  className = '',
}) {
  const [lang, setLang] = useState(initialLang);
  const [curr, setCurr] = useState(currency);
  const [arabicNumerals, setArabicNumerals] = useState(lang === 'ar');
  const printRef = useRef(null);
  const T = LABELS[lang];
  const isRTL = lang === 'ar';

  const {
    itemTitle = 'بضاعة',
    itemCategory = 'عام',
    price = 0,
    quantity = 1,
    buyerCity = '—',
    paymentMethod = 'نقداً',
    saleDate = new Date().toISOString(),
    transactionId = 'TXN-000000',
  } = saleData;

  const {
    name: sellerName = 'البائع',
    city: sellerCity = '—',
    country: sellerCountry = 'مصر',
    phone: sellerPhone = '—',
    rating: sellerRating = 5,
  } = sellerInfo;

  const dateObj = new Date(saleDate);
  const gregStr = dateObj.toLocaleDateString(lang === 'ar' ? 'ar-EG' : lang === 'de' ? 'de-DE' : 'en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });
  const hijriStr = toHijri(dateObj);

  const unitPriceEGP = price;
  const unitPrice = unitPriceEGP * FX[curr];
  const subtotal = unitPrice * quantity;
  const fee = subtotal * 0.02;
  const total = subtotal - fee;

  const fmt = (n) => {
    const s = n.toFixed(2);
    return arabicNumerals ? toArNumerals(s) : s;
  };

  const handlePrint = () => {
    const content = printRef.current;
    if (!content) return;
    const win = window.open('', '_blank');
    win.document.write(`
      <html dir="${isRTL ? 'rtl' : 'ltr'}">
      <head>
        <title>XTOX Invoice - ${transactionId}</title>
        <link rel="preconnect" href="https://fonts.googleapis.com"/>
        <link href="https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;700&display=swap" rel="stylesheet"/>
        <style>
          body { font-family: Cairo, Tajawal, sans-serif; margin: 0; padding: 20px; background: white; }
          @media print { body { padding: 0; } .no-print { display: none; } }
        </style>
      </head>
      <body>${content.innerHTML}</body>
      </html>
    `);
    win.document.close();
    win.focus();
    setTimeout(() => { win.print(); win.close(); }, 500);
  };

  return (
    <div
      className={`font-cairo min-h-screen bg-gray-50 p-4 ${isRTL ? 'rtl' : 'ltr'} ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Controls */}
      <div className="no-print flex flex-wrap gap-3 justify-end mb-4">
        <select
          value={lang}
          onChange={e => setLang(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
        >
          <option value="ar">العربية</option>
          <option value="en">English</option>
          <option value="de">Deutsch</option>
        </select>
        <select
          value={curr}
          onChange={e => setCurr(e.target.value)}
          className="border border-gray-300 rounded-lg px-3 py-1 text-sm"
        >
          {Object.keys(FX).map(c => <option key={c} value={c}>{c}</option>)}
        </select>
        <button
          onClick={() => setArabicNumerals(v => !v)}
          className={`px-3 py-1 rounded-lg text-sm border ${arabicNumerals ? 'bg-green-600 text-white border-green-700' : 'bg-white text-gray-700 border-gray-300'}`}
        >
          {T.numerals}
        </button>
        <button
          onClick={handlePrint}
          className="bg-blue-600 text-white px-4 py-1 rounded-lg text-sm hover:bg-blue-700"
        >
          🖨️ {T.print}
        </button>
      </div>

      {/* Invoice Card */}
      <div
        ref={printRef}
        className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden border border-gray-100"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-green-700 to-green-500 px-8 py-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-3xl font-bold tracking-tight">XTOX</div>
              <div className="text-green-200 text-sm mt-0.5">{T.xtoxNote}</div>
            </div>
            <div className={`text-right ${isRTL ? 'text-left' : 'text-right'}`}>
              <div className="text-2xl font-bold">{T.title}</div>
              <div className="text-green-200 text-sm">{T.invoiceNo}: <span className="text-white font-mono">{transactionId}</span></div>
              <span className="mt-1 inline-block bg-white text-green-700 text-xs font-bold px-2 py-0.5 rounded-full">{T.paid}</span>
            </div>
          </div>
        </div>

        {/* Dates */}
        <div className="bg-green-50 px-8 py-3 flex flex-wrap gap-4 text-sm text-green-900 border-b border-green-100">
          <span>📅 {T.date}: <strong>{gregStr}</strong></span>
          <span>☪️ {T.hijriDate}: <strong>{arabicNumerals ? toArNumerals(hijriStr) : hijriStr}</strong></span>
        </div>

        {/* Seller & Buyer */}
        <div className="px-8 py-5 grid grid-cols-2 gap-6 border-b border-gray-100">
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-2">{T.seller}</div>
            <div className="font-bold text-gray-800">{sellerName}</div>
            <div className="text-sm text-gray-600">{T.city}: {sellerCity}</div>
            <div className="text-sm text-gray-600">{T.country}: {sellerCountry}</div>
            {sellerPhone !== '—' && <div className="text-sm text-gray-600">{T.phone}: {sellerPhone}</div>}
            <div className="text-sm text-gray-600">{T.rating}: {'★'.repeat(Math.round(sellerRating))}</div>
          </div>
          <div>
            <div className="text-xs text-gray-500 uppercase font-semibold mb-2">{T.buyer}</div>
            <div className="text-sm text-gray-600">{T.city}: {buyerCity}</div>
            <div className="text-sm text-gray-600">{T.payment}: {paymentMethod}</div>
          </div>
        </div>

        {/* Item Table */}
        <div className="px-8 py-5">
          <table className="w-full text-sm border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-600 text-xs uppercase">
                <th className="text-start py-2 px-3 rounded-tl-lg">{T.item}</th>
                <th className="text-center py-2 px-3">{T.category}</th>
                <th className="text-center py-2 px-3">{T.qty}</th>
                <th className="text-end py-2 px-3 rounded-tr-lg">{T.unitPrice}</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-gray-100">
                <td className="py-3 px-3 font-medium text-gray-800">{itemTitle}</td>
                <td className="py-3 px-3 text-center text-gray-600">{itemCategory}</td>
                <td className="py-3 px-3 text-center">{arabicNumerals ? toArNumerals(quantity) : quantity}</td>
                <td className="py-3 px-3 text-end font-semibold">
                  {SYMBOLS[curr]} {fmt(unitPrice)}
                </td>
              </tr>
            </tbody>
          </table>

          {/* Totals */}
          <div className="mt-4 space-y-2 max-w-xs ms-auto">
            <div className="flex justify-between text-sm text-gray-600">
              <span>{T.subtotal}</span>
              <span>{SYMBOLS[curr]} {fmt(subtotal)}</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>{T.platformFee}</span>
              <span className="text-red-500">- {SYMBOLS[curr]} {fmt(fee)}</span>
            </div>
            <div className="flex justify-between font-bold text-lg text-gray-900 border-t border-gray-200 pt-2">
              <span>{T.total}</span>
              <span className="text-green-700">{SYMBOLS[curr]} {fmt(total)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="bg-gray-50 px-8 py-4 flex items-center justify-between border-t border-gray-100">
          <div className="text-xs text-gray-400">{T.transId}: <span className="font-mono text-gray-600">{transactionId}</span></div>
          <div className="text-xs text-green-700 font-semibold">{T.thankYou} 🌿</div>
        </div>
      </div>

      <style jsx global>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&family=Tajawal:wght@400;700&display=swap');
        .font-cairo { font-family: 'Cairo', 'Tajawal', sans-serif; }
      `}</style>
    </div>
  );
}
