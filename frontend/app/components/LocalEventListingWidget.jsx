'use client';

/**
 * LocalEventListingWidget.jsx
 * XTOX Marketplace — Local Marketplace Events
 *
 * Lets users browse and post local marketplace events:
 * garage sales, bazaars, flea markets, community sales.
 *
 * Props:
 *   events        — array of event objects (see mock data below for shape)
 *   lang          — 'ar' | 'en' | 'de'  (default 'ar')
 *   onPostEvent   — (formData) => void
 *   onRSVP        — (eventId) => void
 *   className     — optional extra classes
 */

import { useState, useCallback } from 'react';

// ── i18n ─────────────────────────────────────────────────────────────────────
const T = {
  ar: {
    title: 'فعاليات السوق المحلي',
    subtitle: 'بازارات، مبيعات المنازل، أسواق شعبية',
    postBtn: '+ أضف فعالية',
    rsvp: 'سأحضر',
    rsvpDone: '✓ مسجّل',
    attendees: 'مشارك',
    free: 'مجاني',
    paid: 'مدفوع',
    searchPlaceholder: 'ابحث عن فعالية...',
    allTypes: 'الكل',
    garage: 'مبيع منزل',
    bazaar: 'بازار',
    flea: 'سوق شعبي',
    community: 'مجتمعي',
    online: 'أونلاين',
    dateLabel: 'التاريخ',
    timeLabel: 'الوقت',
    locationLabel: 'المكان',
    entranceLabel: 'الدخول',
    organizer: 'المنظّم',
    formTitle: 'أضف فعالية جديدة',
    formName: 'اسم الفعالية',
    formType: 'نوع الفعالية',
    formDate: 'التاريخ',
    formTime: 'الوقت',
    formCity: 'المدينة',
    formAddress: 'العنوان',
    formDesc: 'وصف مختصر',
    formEntrance: 'رسوم الدخول (اتركه فارغاً للمجاني)',
    formSubmit: 'نشر الفعالية',
    formCancel: 'إلغاء',
    noEvents: 'لا توجد فعاليات قريبة. كن أول من يضيف!',
    egyptIndic: 'أرقام هندية',
  },
  en: {
    title: 'Local Market Events',
    subtitle: 'Bazaars, garage sales, flea markets & more',
    postBtn: '+ Add Event',
    rsvp: 'I\'ll Attend',
    rsvpDone: '✓ Registered',
    attendees: 'attendees',
    free: 'Free',
    paid: 'Paid',
    searchPlaceholder: 'Search events...',
    allTypes: 'All',
    garage: 'Garage Sale',
    bazaar: 'Bazaar',
    flea: 'Flea Market',
    community: 'Community',
    online: 'Online',
    dateLabel: 'Date',
    timeLabel: 'Time',
    locationLabel: 'Location',
    entranceLabel: 'Entry',
    organizer: 'Organizer',
    formTitle: 'Post a New Event',
    formName: 'Event Name',
    formType: 'Event Type',
    formDate: 'Date',
    formTime: 'Time',
    formCity: 'City',
    formAddress: 'Address',
    formDesc: 'Short Description',
    formEntrance: 'Entry Fee (leave blank for free)',
    formSubmit: 'Post Event',
    formCancel: 'Cancel',
    noEvents: 'No nearby events. Be the first to add one!',
    egyptIndic: 'Arabic Numerals',
  },
  de: {
    title: 'Lokale Markt-Events',
    subtitle: 'Basare, Flohмärkte, Gemeinschaftsverkäufe',
    postBtn: '+ Event hinzufügen',
    rsvp: 'Ich komme',
    rsvpDone: '✓ Angemeldet',
    attendees: 'Teilnehmer',
    free: 'Kostenlos',
    paid: 'Kostenpflichtig',
    searchPlaceholder: 'Events suchen...',
    allTypes: 'Alle',
    garage: 'Garagesale',
    bazaar: 'Basar',
    flea: 'Flohmarkt',
    community: 'Community',
    online: 'Online',
    dateLabel: 'Datum',
    timeLabel: 'Uhrzeit',
    locationLabel: 'Ort',
    entranceLabel: 'Eintritt',
    organizer: 'Veranstalter',
    formTitle: 'Neues Event erstellen',
    formName: 'Event-Name',
    formType: 'Event-Typ',
    formDate: 'Datum',
    formTime: 'Uhrzeit',
    formCity: 'Stadt',
    formAddress: 'Adresse',
    formDesc: 'Kurzbeschreibung',
    formEntrance: 'Eintrittsgebühr (leer = kostenlos)',
    formSubmit: 'Event veröffentlichen',
    formCancel: 'Abbrechen',
    noEvents: 'Keine Events in der Nähe. Füge das erste hinzu!',
    egyptIndic: 'Arabische Ziffern',
  },
};

// ── helpers ───────────────────────────────────────────────────────────────────
const toIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const TYPE_ICONS = {
  garage: '🏠',
  bazaar: '🛍️',
  flea: '🏪',
  community: '🤝',
  online: '💻',
};

const TYPE_COLORS = {
  garage:    'bg-amber-100 text-amber-800',
  bazaar:    'bg-purple-100 text-purple-800',
  flea:      'bg-green-100 text-green-800',
  community: 'bg-blue-100 text-blue-800',
  online:    'bg-teal-100 text-teal-800',
};

// ── mock data ─────────────────────────────────────────────────────────────────
const MOCK_EVENTS = [
  {
    id: 'e1',
    nameAr: 'بازار رمضان الخيري',
    nameEn: 'Ramadan Charity Bazaar',
    nameDe: 'Ramadan-Wohltätigkeitsbasar',
    type: 'bazaar',
    date: '2026-04-15',
    time: '10:00',
    cityAr: 'القاهرة',
    cityEn: 'Cairo',
    addressAr: 'حديقة الأزهر، منطقة الدراسة',
    addressEn: 'Al-Azhar Park, Al-Darasa area',
    descAr: 'بازار خيري يضم أكثر من ٥٠ بائعاً، تبرعات لصالح دور الأيتام.',
    descEn: 'Charity bazaar with 50+ vendors. Proceeds go to orphanages.',
    entrance: null,
    organizerName: 'جمعية القاهرة الخيرية',
    organizerAvatar: '🕌',
    attendees: 234,
    rsvped: false,
  },
  {
    id: 'e2',
    nameAr: 'مبيع منزل — مدينة نصر',
    nameEn: 'Garage Sale — Nasr City',
    nameDe: 'Garagesale — Nasr City',
    type: 'garage',
    date: '2026-04-13',
    time: '09:00',
    cityAr: 'القاهرة',
    cityEn: 'Cairo',
    addressAr: 'شارع عباس العقاد، مدينة نصر',
    addressEn: 'Abbas El-Akkad St, Nasr City',
    descAr: 'أثاث، ملابس، كتب، وإلكترونيات بأسعار رمزية.',
    descEn: 'Furniture, clothes, books, electronics at symbolic prices.',
    entrance: null,
    organizerName: 'أسرة منصور',
    organizerAvatar: '👨‍👩‍👧',
    attendees: 47,
    rsvped: true,
  },
  {
    id: 'e3',
    nameAr: 'سوق الجمعة الشعبي',
    nameEn: 'Friday Flea Market',
    nameDe: 'Freitags-Flohmarkt',
    type: 'flea',
    date: '2026-04-17',
    time: '08:00',
    cityAr: 'الرياض',
    cityEn: 'Riyadh',
    addressAr: 'طريق الملك عبدالله، حي النسيم',
    addressEn: 'King Abdullah Rd, Al-Naseem District',
    descAr: 'سوق أسبوعي يضم آلاف السلع المستعملة والمقتنيات النادرة.',
    descEn: 'Weekly market with thousands of used goods and rare collectibles.',
    entrance: '10 SAR',
    organizerName: 'نادي الرياض التراثي',
    organizerAvatar: '🏺',
    attendees: 1200,
    rsvped: false,
  },
  {
    id: 'e4',
    nameAr: 'بازار المجتمع الإلكتروني',
    nameEn: 'Online Community Bazaar',
    nameDe: 'Online-Community-Basar',
    type: 'online',
    date: '2026-04-20',
    time: '19:00',
    cityAr: 'أونلاين',
    cityEn: 'Online',
    addressAr: 'رابط يُرسل للمسجلين',
    addressEn: 'Link sent to registrants',
    descAr: 'بيع وشراء مباشر عبر الفيديو. حجز مسبق مطلوب.',
    descEn: 'Live buy & sell via video stream. Pre-registration required.',
    entrance: null,
    organizerName: 'XTOX Live',
    organizerAvatar: '📡',
    attendees: 89,
    rsvped: false,
  },
];

// ── main component ────────────────────────────────────────────────────────────
export default function LocalEventListingWidget({
  events = MOCK_EVENTS,
  lang = 'ar',
  onPostEvent,
  onRSVP,
  className = '',
}) {
  const t = T[lang] || T.ar;
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  const [useIndic, setUseIndic] = useState(lang === 'ar');
  const [activeLang, setActiveLang] = useState(lang);
  const [search, setSearch] = useState('');
  const [filterType, setFilterType] = useState('all');
  const [showForm, setShowForm] = useState(false);
  const [rsvpSet, setRsvpSet] = useState(() => {
    const s = new Set();
    events.forEach((e) => { if (e.rsvped) s.add(e.id); });
    return s;
  });
  const [form, setForm] = useState({
    name: '', type: 'bazaar', date: '', time: '',
    city: '', address: '', desc: '', entrance: '',
  });

  const tActive = T[activeLang] || T.ar;
  const isRTLActive = activeLang === 'ar';
  const dirActive = isRTLActive ? 'rtl' : 'ltr';

  const fmt = useCallback((n) => useIndic ? toIndic(n) : String(n), [useIndic]);

  const getName = (ev) =>
    activeLang === 'ar' ? ev.nameAr :
    activeLang === 'de' ? ev.nameDe : ev.nameEn;
  const getCity = (ev) =>
    activeLang === 'ar' ? ev.cityAr : ev.cityEn;
  const getAddress = (ev) =>
    activeLang === 'ar' ? ev.addressAr : ev.addressEn;
  const getDesc = (ev) =>
    activeLang === 'ar' ? ev.descAr : ev.descEn;

  const filtered = events.filter((ev) => {
    const matchType = filterType === 'all' || ev.type === filterType;
    const matchSearch = !search ||
      ev.nameAr.includes(search) ||
      ev.nameEn.toLowerCase().includes(search.toLowerCase()) ||
      ev.cityAr.includes(search) ||
      ev.cityEn.toLowerCase().includes(search.toLowerCase());
    return matchType && matchSearch;
  });

  const handleRSVP = (id) => {
    setRsvpSet((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
    onRSVP?.(id);
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();
    onPostEvent?.(form);
    setForm({ name: '', type: 'bazaar', date: '', time: '', city: '', address: '', desc: '', entrance: '' });
    setShowForm(false);
  };

  const TYPES = ['all', 'garage', 'bazaar', 'flea', 'community', 'online'];

  return (
    <div
      className={`font-sans bg-white rounded-2xl shadow-lg overflow-hidden ${className}`}
      dir={dirActive}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-l from-emerald-600 to-teal-700 px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-white text-lg font-bold leading-tight">{tActive.title}</h2>
            <p className="text-emerald-100 text-xs mt-0.5">{tActive.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {/* Lang switcher */}
            {['ar', 'en', 'de'].map((l) => (
              <button
                key={l}
                onClick={() => setActiveLang(l)}
                className={`text-xs px-2 py-1 rounded-full font-bold transition-all ${
                  activeLang === l
                    ? 'bg-white text-emerald-700'
                    : 'bg-emerald-500/40 text-white hover:bg-emerald-500/60'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
            {/* Indic toggle */}
            <button
              onClick={() => setUseIndic((v) => !v)}
              className={`text-xs px-2 py-1 rounded-full transition-all ${
                useIndic
                  ? 'bg-white text-emerald-700 font-bold'
                  : 'bg-emerald-500/40 text-white'
              }`}
              title={tActive.egyptIndic}
            >
              {useIndic ? '١٢٣' : '123'}
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="mt-3 relative">
          <input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder={tActive.searchPlaceholder}
            className="w-full rounded-xl px-4 py-2.5 text-sm bg-white/90 placeholder-gray-400 text-gray-800 outline-none focus:bg-white transition"
            dir={dirActive}
          />
          <span className={`absolute top-1/2 -translate-y-1/2 text-gray-400 ${isRTLActive ? 'left-3' : 'right-3'}`}>🔍</span>
        </div>
      </div>

      {/* Filter pills */}
      <div className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-none">
        {TYPES.map((tp) => (
          <button
            key={tp}
            onClick={() => setFilterType(tp)}
            className={`flex-shrink-0 text-xs px-3 py-1.5 rounded-full font-semibold border transition-all ${
              filterType === tp
                ? 'bg-emerald-600 text-white border-emerald-600'
                : 'bg-gray-50 text-gray-600 border-gray-200 hover:border-emerald-400'
            }`}
          >
            {tp === 'all' ? tActive.allTypes : `${TYPE_ICONS[tp]} ${tActive[tp]}`}
          </button>
        ))}
      </div>

      {/* Event cards */}
      <div className="divide-y divide-gray-100">
        {filtered.length === 0 ? (
          <div className="text-center text-gray-400 py-12 text-sm">{tActive.noEvents}</div>
        ) : (
          filtered.map((ev) => {
            const attended = rsvpSet.has(ev.id);
            return (
              <div key={ev.id} className="px-4 py-4 hover:bg-gray-50 transition">
                <div className="flex items-start gap-3">
                  {/* Organizer avatar */}
                  <div className="w-11 h-11 rounded-full bg-emerald-50 flex items-center justify-center text-2xl flex-shrink-0 border border-emerald-100">
                    {ev.organizerAvatar}
                  </div>
                  <div className="flex-1 min-w-0">
                    {/* Name + type badge */}
                    <div className="flex items-start justify-between gap-2 flex-wrap">
                      <h3 className="font-bold text-gray-900 text-sm leading-snug">{getName(ev)}</h3>
                      <span className={`text-xs px-2 py-0.5 rounded-full font-semibold flex-shrink-0 ${TYPE_COLORS[ev.type]}`}>
                        {TYPE_ICONS[ev.type]} {tActive[ev.type]}
                      </span>
                    </div>

                    {/* Meta row */}
                    <div className="flex flex-wrap gap-x-4 gap-y-1 mt-1.5 text-xs text-gray-500">
                      <span>📅 {tActive.dateLabel}: <b className="text-gray-700">{ev.date}</b></span>
                      <span>⏰ {tActive.timeLabel}: <b className="text-gray-700">{ev.time}</b></span>
                      <span>📍 {getCity(ev)}</span>
                      <span>
                        🎟️ {tActive.entranceLabel}:{' '}
                        <b className={ev.entrance ? 'text-orange-600' : 'text-emerald-600'}>
                          {ev.entrance ? ev.entrance : tActive.free}
                        </b>
                      </span>
                    </div>

                    {/* Address */}
                    <p className="text-xs text-gray-500 mt-1 truncate">
                      🗺️ {getAddress(ev)}
                    </p>

                    {/* Description */}
                    <p className="text-xs text-gray-600 mt-1.5 leading-relaxed line-clamp-2">{getDesc(ev)}</p>

                    {/* Footer */}
                    <div className="flex items-center justify-between mt-3 flex-wrap gap-2">
                      <span className="text-xs text-gray-400">
                        👤 {ev.organizerName} · {fmt(ev.attendees)} {tActive.attendees}
                      </span>
                      <button
                        onClick={() => handleRSVP(ev.id)}
                        className={`text-xs px-4 py-1.5 rounded-full font-bold transition-all ${
                          attended
                            ? 'bg-emerald-600 text-white'
                            : 'bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100'
                        }`}
                      >
                        {attended ? tActive.rsvpDone : tActive.rsvp}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Add event button */}
      <div className="px-4 pb-4 pt-2">
        <button
          onClick={() => setShowForm((v) => !v)}
          className="w-full py-3 rounded-xl bg-gradient-to-l from-emerald-600 to-teal-700 text-white font-bold text-sm hover:opacity-90 transition shadow"
        >
          {tActive.postBtn}
        </button>
      </div>

      {/* Post event form */}
      {showForm && (
        <form
          onSubmit={handleFormSubmit}
          className="border-t border-gray-100 px-4 py-5 bg-gray-50 space-y-3"
          dir={dirActive}
        >
          <h4 className="font-bold text-gray-800 text-base">{tActive.formTitle}</h4>
          {[
            { key: 'name', label: tActive.formName, type: 'text', required: true },
            { key: 'date', label: tActive.formDate, type: 'date', required: true },
            { key: 'time', label: tActive.formTime, type: 'time', required: true },
            { key: 'city', label: tActive.formCity, type: 'text', required: true },
            { key: 'address', label: tActive.formAddress, type: 'text', required: false },
            { key: 'entrance', label: tActive.formEntrance, type: 'text', required: false },
          ].map(({ key, label, type, required }) => (
            <div key={key}>
              <label className="block text-xs text-gray-600 mb-1 font-medium">{label}</label>
              <input
                type={type}
                value={form[key]}
                onChange={(e) => setForm((f) => ({ ...f, [key]: e.target.value }))}
                required={required}
                className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-white"
                dir={isRTLActive ? 'rtl' : 'ltr'}
              />
            </div>
          ))}

          {/* Type selector */}
          <div>
            <label className="block text-xs text-gray-600 mb-1 font-medium">{tActive.formType}</label>
            <select
              value={form.type}
              onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-white"
              dir={isRTLActive ? 'rtl' : 'ltr'}
            >
              {['garage', 'bazaar', 'flea', 'community', 'online'].map((tp) => (
                <option key={tp} value={tp}>{tActive[tp]}</option>
              ))}
            </select>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs text-gray-600 mb-1 font-medium">{tActive.formDesc}</label>
            <textarea
              value={form.desc}
              onChange={(e) => setForm((f) => ({ ...f, desc: e.target.value }))}
              rows={3}
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm outline-none focus:border-emerald-500 bg-white resize-none"
              dir={isRTLActive ? 'rtl' : 'ltr'}
            />
          </div>

          <div className="flex gap-3 pt-1">
            <button
              type="submit"
              className="flex-1 py-2.5 rounded-xl bg-emerald-600 text-white font-bold text-sm hover:bg-emerald-700 transition"
            >
              {tActive.formSubmit}
            </button>
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="flex-1 py-2.5 rounded-xl border border-gray-200 text-gray-600 font-bold text-sm hover:bg-gray-100 transition"
            >
              {tActive.formCancel}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
