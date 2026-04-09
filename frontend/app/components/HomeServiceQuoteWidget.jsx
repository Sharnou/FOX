'use client';
import { useState } from 'react';

/**
 * HomeServiceQuoteWidget
 * XTOX Arab Marketplace — Request quotes from home service providers
 * Supports AR/EN/DE · RTL-first · Cairo/Tajawal · Tailwind only · Zero deps
 * Props: onSubmitRequest(request), lang ('ar'|'en'|'de'), className
 */

const T = {
  ar: {
    title: 'اطلب عرض سعر لخدمة منزلية',
    subtitle: 'تواصل مع مزودي الخدمات المحترفين في منطقتك',
    categories: ['سباكة', 'كهرباء', 'تكييف وتبريد', 'نجارة', 'دهانات', 'تنظيف', 'حدادة', 'صيانة عامة'],
    categoryLabel: 'نوع الخدمة',
    descLabel: 'وصف المشكلة',
    descPlaceholder: 'اشرح المشكلة بالتفصيل...',
    cityLabel: 'المدينة',
    cityPlaceholder: 'مثال: القاهرة، الرياض',
    urgencyLabel: 'درجة الاستعجال',
    urgencyOptions: ['عادي (خلال أسبوع)', 'عاجل (خلال 48 ساعة)', 'طارئ (اليوم)'],
    budgetLabel: 'الميزانية التقريبية',
    budgetPlaceholder: 'مثال: 500',
    currency: 'ج.م',
    submitBtn: 'إرسال الطلب',
    successTitle: 'تم إرسال طلبك!',
    successMsg: 'سيتواصل معك مزودو الخدمة خلال وقت قصير.',
    newRequest: 'طلب جديد',
    quoteCount: (n) => `${toArabicNumerals(n)} عرض سعر وارد`,
    providersNear: 'مزودو خدمة قريبون',
    verified: 'موثق',
    rating: 'التقييم',
    respond: 'تواصل',
    noCategory: 'اختر نوع الخدمة',
    noUrgency: 'اختر درجة الاستعجال',
    recentRequests: 'الطلبات الأخيرة',
    status: { open: 'مفتوح', closed: 'مغلق' },
  },
  en: {
    title: 'Request a Home Service Quote',
    subtitle: 'Connect with professional service providers near you',
    categories: ['Plumbing', 'Electrical', 'AC & Cooling', 'Carpentry', 'Painting', 'Cleaning', 'Ironwork', 'General Maintenance'],
    categoryLabel: 'Service Type',
    descLabel: 'Problem Description',
    descPlaceholder: 'Describe the issue in detail...',
    cityLabel: 'City',
    cityPlaceholder: 'e.g. Cairo, Riyadh',
    urgencyLabel: 'Urgency Level',
    urgencyOptions: ['Standard (within a week)', 'Urgent (within 48h)', 'Emergency (today)'],
    budgetLabel: 'Approximate Budget',
    budgetPlaceholder: 'e.g. 500',
    currency: 'EGP',
    submitBtn: 'Submit Request',
    successTitle: 'Request Submitted!',
    successMsg: 'Service providers will contact you shortly.',
    newRequest: 'New Request',
    quoteCount: (n) => `${n} quote(s) received`,
    providersNear: 'Nearby Providers',
    verified: 'Verified',
    rating: 'Rating',
    respond: 'Contact',
    noCategory: 'Select service type',
    noUrgency: 'Select urgency',
    recentRequests: 'Recent Requests',
    status: { open: 'Open', closed: 'Closed' },
  },
  de: {
    title: 'Angebot für Hausdienstleistung anfragen',
    subtitle: 'Verbinden Sie sich mit professionellen Dienstleistern in Ihrer Nähe',
    categories: ['Sanitär', 'Elektrik', 'Klimaanlage', 'Tischlerei', 'Malerarbeiten', 'Reinigung', 'Schlosserarbeiten', 'Allgemeine Wartung'],
    categoryLabel: 'Dienstleistungsart',
    descLabel: 'Problembeschreibung',
    descPlaceholder: 'Beschreiben Sie das Problem...',
    cityLabel: 'Stadt',
    cityPlaceholder: 'z.B. Kairo, Riad',
    urgencyLabel: 'Dringlichkeit',
    urgencyOptions: ['Standard (innerhalb einer Woche)', 'Dringend (innerhalb 48h)', 'Notfall (heute)'],
    budgetLabel: 'Ungefähres Budget',
    budgetPlaceholder: 'z.B. 500',
    currency: 'EGP',
    submitBtn: 'Anfrage senden',
    successTitle: 'Anfrage gesendet!',
    successMsg: 'Dienstleister werden sich in Kürze melden.',
    newRequest: 'Neue Anfrage',
    quoteCount: (n) => `${n} Angebot(e) erhalten`,
    providersNear: 'Anbieter in der Nähe',
    verified: 'Verifiziert',
    rating: 'Bewertung',
    respond: 'Kontakt',
    noCategory: 'Dienstleistung wählen',
    noUrgency: 'Dringlichkeit wählen',
    recentRequests: 'Aktuelle Anfragen',
    status: { open: 'Offen', closed: 'Geschlossen' },
  },
};

const CATEGORY_ICONS = ['🔧', '⚡', '❄️', '🪵', '🎨', '🧹', '⚙️', '🏠'];
const URGENCY_COLORS = ['bg-green-100 text-green-800', 'bg-yellow-100 text-yellow-800', 'bg-red-100 text-red-800'];

const toArabicNumerals = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const MOCK_PROVIDERS = [
  { id: 1, nameAr: 'أحمد الفني', nameEn: 'Ahmed Al-Fanni', nameDe: 'Ahmed Al-Fanni', avatar: '👨‍🔧', rating: 4.8, reviews: 124, verified: true, city: 'القاهرة', categories: [0, 7] },
  { id: 2, nameAr: 'شركة النجمة للصيانة', nameEn: 'Al-Najma Maintenance', nameDe: 'Al-Najma Wartung', avatar: '🏢', rating: 4.6, reviews: 89, verified: true, city: 'الرياض', categories: [1, 2, 7] },
  { id: 3, nameAr: 'محمود للنجارة', nameEn: 'Mahmoud Carpentry', nameDe: 'Mahmoud Tischlerei', avatar: '👨‍🏭', rating: 4.9, reviews: 56, verified: false, city: 'الإسكندرية', categories: [3] },
];

const MOCK_REQUESTS = [
  { id: 1, categoryIdx: 0, descAr: 'تسريب في أنبوب المطبخ', descEn: 'Kitchen pipe leaking', cityAr: 'القاهرة', cityEn: 'Cairo', urgencyIdx: 1, budget: 300, quoteCount: 3, status: 'open' },
  { id: 2, categoryIdx: 2, descAr: 'عطل في وحدة التكييف', descEn: 'AC unit not cooling', cityAr: 'الإسكندرية', cityEn: 'Alexandria', urgencyIdx: 2, budget: 500, quoteCount: 5, status: 'open' },
];

export default function HomeServiceQuoteWidget({
  onSubmitRequest,
  lang = 'ar',
  className = '',
}) {
  const t = T[lang] || T.ar;
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';
  const font = isRTL ? "'Cairo', 'Tajawal', sans-serif" : 'inherit';

  const [activeLang, setActiveLang] = useState(lang);
  const tl = T[activeLang] || T.ar;
  const isRTLActive = activeLang === 'ar';
  const dirActive = isRTLActive ? 'rtl' : 'ltr';
  const fontActive = isRTLActive ? "'Cairo', 'Tajawal', sans-serif" : 'inherit';

  const [useArabicNumerals, setUseArabicNumerals] = useState(isRTLActive);
  const [submitted, setSubmitted] = useState(false);
  const [activeTab, setActiveTab] = useState('request'); // 'request' | 'providers' | 'recent'

  const [form, setForm] = useState({
    categoryIdx: '',
    description: '',
    city: '',
    urgencyIdx: '',
    budget: '',
  });

  const num = (n) => (useArabicNumerals && isRTLActive ? toArabicNumerals(n) : String(n));

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.categoryIdx && form.categoryIdx !== 0) return;
    if (!form.urgencyIdx && form.urgencyIdx !== 0) return;
    const req = {
      ...form,
      categoryIdx: Number(form.categoryIdx),
      urgencyIdx: Number(form.urgencyIdx),
      budget: Number(form.budget),
      lang: activeLang,
    };
    onSubmitRequest?.(req);
    setSubmitted(true);
  };

  const tabs = [
    { key: 'request', labelAr: 'طلب جديد', labelEn: 'New Request', labelDe: 'Neue Anfrage' },
    { key: 'providers', labelAr: 'المزودون', labelEn: 'Providers', labelDe: 'Anbieter' },
    { key: 'recent', labelAr: 'الطلبات', labelEn: 'Requests', labelDe: 'Anfragen' },
  ];
  const tabLabel = (tab) => activeLang === 'ar' ? tab.labelAr : activeLang === 'de' ? tab.labelDe : tab.labelEn;

  return (
    <div
      dir={dirActive}
      style={{ fontFamily: fontActive }}
      className={`bg-white rounded-2xl shadow-lg overflow-hidden border border-gray-100 ${className}`}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-orange-500 to-amber-500 px-5 py-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{tl.title}</h2>
            <p className="text-orange-100 text-xs mt-0.5">{tl.subtitle}</p>
          </div>
          <div className="text-3xl">🏠</div>
        </div>
        {/* Language + numeral toggles */}
        <div className={`flex gap-2 mt-3 ${isRTLActive ? 'flex-row-reverse' : ''}`}>
          {['ar', 'en', 'de'].map((l) => (
            <button
              key={l}
              onClick={() => { setActiveLang(l); setUseArabicNumerals(l === 'ar'); }}
              className={`px-2 py-0.5 rounded text-xs font-bold transition ${activeLang === l ? 'bg-white text-orange-600' : 'bg-orange-400 text-white'}`}
            >
              {l.toUpperCase()}
            </button>
          ))}
          {isRTLActive && (
            <button
              onClick={() => setUseArabicNumerals((v) => !v)}
              className="px-2 py-0.5 rounded text-xs bg-orange-400 text-white"
            >
              {useArabicNumerals ? '123' : '١٢٣'}
            </button>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className={`flex border-b border-gray-100 ${isRTLActive ? 'flex-row-reverse' : ''}`}>
        {tabs.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 py-3 text-sm font-semibold transition border-b-2 ${activeTab === tab.key ? 'border-orange-500 text-orange-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
          >
            {tabLabel(tab)}
          </button>
        ))}
      </div>

      <div className="p-5">
        {/* ── TAB: Request Form ── */}
        {activeTab === 'request' && !submitted && (
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Category */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{tl.categoryLabel}</label>
              <div className="grid grid-cols-4 gap-2">
                {tl.categories.map((cat, i) => (
                  <button
                    type="button"
                    key={i}
                    onClick={() => setForm((f) => ({ ...f, categoryIdx: i }))}
                    className={`flex flex-col items-center gap-1 p-2 rounded-xl border text-xs font-medium transition ${form.categoryIdx === i ? 'border-orange-500 bg-orange-50 text-orange-700' : 'border-gray-200 text-gray-600 hover:border-orange-300'}`}
                  >
                    <span className="text-xl">{CATEGORY_ICONS[i]}</span>
                    <span className="text-center leading-tight">{cat}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{tl.descLabel}</label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder={tl.descPlaceholder}
                required
                className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400 resize-none"
              />
            </div>

            {/* City + Budget row */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">{tl.cityLabel}</label>
                <input
                  value={form.city}
                  onChange={(e) => setForm((f) => ({ ...f, city: e.target.value }))}
                  placeholder={tl.cityPlaceholder}
                  required
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-1">
                  {tl.budgetLabel} ({tl.currency})
                </label>
                <input
                  type="number"
                  value={form.budget}
                  onChange={(e) => setForm((f) => ({ ...f, budget: e.target.value }))}
                  placeholder={tl.budgetPlaceholder}
                  min={0}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
                />
              </div>
            </div>

            {/* Urgency */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-1">{tl.urgencyLabel}</label>
              <div className="flex flex-col gap-2">
                {tl.urgencyOptions.map((opt, i) => (
                  <label
                    key={i}
                    className={`flex items-center gap-3 p-3 rounded-xl border cursor-pointer transition ${form.urgencyIdx === i ? 'border-orange-400 bg-orange-50' : 'border-gray-200'}`}
                  >
                    <input
                      type="radio"
                      name="urgency"
                      value={i}
                      checked={form.urgencyIdx === i}
                      onChange={() => setForm((f) => ({ ...f, urgencyIdx: i }))}
                      className="accent-orange-500"
                    />
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${URGENCY_COLORS[i]}`}>{opt}</span>
                  </label>
                ))}
              </div>
            </div>

            <button
              type="submit"
              className="w-full bg-orange-500 hover:bg-orange-600 text-white font-bold py-3 rounded-xl transition text-sm"
            >
              {tl.submitBtn}
            </button>
          </form>
        )}

        {/* ── Success ── */}
        {activeTab === 'request' && submitted && (
          <div className="text-center py-8 space-y-3">
            <div className="text-5xl">✅</div>
            <h3 className="text-lg font-bold text-gray-800">{tl.successTitle}</h3>
            <p className="text-sm text-gray-500">{tl.successMsg}</p>
            <button
              onClick={() => { setSubmitted(false); setForm({ categoryIdx: '', description: '', city: '', urgencyIdx: '', budget: '' }); }}
              className="mt-4 px-6 py-2 bg-orange-500 text-white rounded-xl text-sm font-semibold hover:bg-orange-600 transition"
            >
              {tl.newRequest}
            </button>
          </div>
        )}

        {/* ── TAB: Providers ── */}
        {activeTab === 'providers' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-600">{tl.providersNear}</p>
            {MOCK_PROVIDERS.map((p) => {
              const name = activeLang === 'ar' ? p.nameAr : activeLang === 'de' ? p.nameDe : p.nameEn;
              return (
                <div key={p.id} className="flex items-center gap-3 p-3 border border-gray-100 rounded-xl hover:shadow-sm transition">
                  <div className="text-3xl">{p.avatar}</div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-semibold text-sm text-gray-800 truncate">{name}</span>
                      {p.verified && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full font-medium">
                          ✓ {tl.verified}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 mt-0.5">
                      <span className="text-xs text-yellow-500">{'★'.repeat(Math.round(p.rating))}</span>
                      <span className="text-xs text-gray-500">{num(p.rating)} ({num(p.reviews)})</span>
                    </div>
                    <div className="flex gap-1 mt-1 flex-wrap">
                      {p.categories.map((ci) => (
                        <span key={ci} className="text-xs bg-orange-50 text-orange-600 px-1.5 py-0.5 rounded-full">
                          {CATEGORY_ICONS[ci]} {tl.categories[ci]}
                        </span>
                      ))}
                    </div>
                  </div>
                  <button className="text-xs bg-orange-500 text-white px-3 py-1.5 rounded-lg font-semibold hover:bg-orange-600 transition shrink-0">
                    {tl.respond}
                  </button>
                </div>
              );
            })}
          </div>
        )}

        {/* ── TAB: Recent Requests ── */}
        {activeTab === 'recent' && (
          <div className="space-y-3">
            <p className="text-sm font-semibold text-gray-600">{tl.recentRequests}</p>
            {MOCK_REQUESTS.map((req) => {
              const desc = activeLang === 'ar' ? req.descAr : req.descEn;
              const city = activeLang === 'ar' ? req.cityAr : req.cityEn;
              return (
                <div key={req.id} className="p-3 border border-gray-100 rounded-xl space-y-2">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xl">{CATEGORY_ICONS[req.categoryIdx]}</span>
                      <span className="font-semibold text-sm text-gray-800">{tl.categories[req.categoryIdx]}</span>
                    </div>
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${req.status === 'open' ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'}`}>
                      {tl.status[req.status]}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{desc}</p>
                  <div className="flex items-center justify-between text-xs text-gray-500 flex-wrap gap-1">
                    <span>📍 {city}</span>
                    <span className={URGENCY_COLORS[req.urgencyIdx] + ' px-2 py-0.5 rounded-full'}>{tl.urgencyOptions[req.urgencyIdx]}</span>
                    <span>💰 {num(req.budget)} {tl.currency}</span>
                    <span>📩 {tl.quoteCount(req.quoteCount)}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
