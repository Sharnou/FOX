'use client';
import { useState, useMemo } from 'react';

// SellerAppointmentBooking — Buyer appointment request widget for XTOX Arab Marketplace
// RTL-first, Arabic-Indic numerals, Cairo/Tajawal fonts
// Props: adId, sellerId, adTitle, lang, onAppointmentRequest, className

const LABELS = {
  ar: {
    title: 'طلب موعد مشاهدة',
    subtitle: 'اختر الموعد المناسب لك',
    selectDay: 'اختر اليوم',
    selectTime: 'اختر الوقت',
    location: 'مكان اللقاء',
    locOptions: ['عند البائع', 'عند المشتري', 'مكان آمن محايد'],
    yourName: 'اسمك',
    yourPhone: 'رقم هاتفك',
    whatsapp: 'رقم واتساب (اختياري)',
    notes: 'ملاحظات إضافية (اختياري)',
    send: 'إرسال طلب الموعد',
    sent: '✓ تم إرسال طلب الموعد!',
    sending: 'جار الإرسال...',
    morning: 'صباحاً',
    afternoon: 'ظهراً',
    evening: 'مساءً',
    friday: 'الجمعة',
    saturday: 'السبت',
    weekend: 'عطلة',
    today: 'اليوم',
    tomorrow: 'غداً',
    days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
    months: ['يناير','فبراير','مارس','أبريل','مايو','يونيو','يوليو','أغسطس','سبتمبر','أكتوبر','نوفمبر','ديسمبر'],
    tip: '💡 معظم البائعين يفضلون المواعيد في ساعات الصباح',
    namePlaceholder: 'مثال: أحمد محمود',
    phonePlaceholder: 'مثال: 01012345678',
    notesPlaceholder: 'أي تفاصيل إضافية تريد إخبار البائع بها...',
    required: 'مطلوب',
    confirm: 'تأكيد الموعد المختار',
    confirmText: (day, slot, loc) => `${day} • ${slot} • ${loc}`,
    slotPeak: '🔥 وقت الذروة',
  },
  en: {
    title: 'Book Viewing Appointment',
    subtitle: 'Choose a convenient time',
    selectDay: 'Select Day',
    selectTime: 'Select Time',
    location: 'Meeting Location',
    locOptions: ["At Seller's", "At Buyer's", 'Neutral Safe Spot'],
    yourName: 'Your Name',
    yourPhone: 'Your Phone',
    whatsapp: 'WhatsApp (optional)',
    notes: 'Additional Notes (optional)',
    send: 'Send Appointment Request',
    sent: '✓ Appointment Request Sent!',
    sending: 'Sending...',
    morning: 'Morning',
    afternoon: 'Afternoon',
    evening: 'Evening',
    friday: 'Friday',
    saturday: 'Saturday',
    weekend: 'Weekend',
    today: 'Today',
    tomorrow: 'Tomorrow',
    days: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
    months: ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'],
    tip: '💡 Most sellers prefer morning appointments',
    namePlaceholder: 'e.g. Ahmed Mahmoud',
    phonePlaceholder: 'e.g. 01012345678',
    notesPlaceholder: 'Any additional details for the seller...',
    required: 'Required',
    confirm: 'Confirm Selected Slot',
    confirmText: (day, slot, loc) => `${day} • ${slot} • ${loc}`,
    slotPeak: '🔥 Peak Time',
  },
  de: {
    title: 'Besichtigungstermin',
    subtitle: 'Wählen Sie einen geeigneten Termin',
    selectDay: 'Tag wählen',
    selectTime: 'Uhrzeit wählen',
    location: 'Treffpunkt',
    locOptions: ['Beim Verkäufer', 'Beim Käufer', 'Neutraler Treffpunkt'],
    yourName: 'Ihr Name',
    yourPhone: 'Ihre Telefonnummer',
    whatsapp: 'WhatsApp (optional)',
    notes: 'Zusätzliche Hinweise (optional)',
    send: 'Terminanfrage senden',
    sent: '✓ Terminanfrage gesendet!',
    sending: 'Wird gesendet...',
    morning: 'Morgen',
    afternoon: 'Nachmittag',
    evening: 'Abend',
    friday: 'Freitag',
    saturday: 'Samstag',
    weekend: 'Wochenende',
    today: 'Heute',
    tomorrow: 'Morgen',
    days: ['So', 'Mo', 'Di', 'Mi', 'Do', 'Fr', 'Sa'],
    months: ['Jan','Feb','Mär','Apr','Mai','Jun','Jul','Aug','Sep','Okt','Nov','Dez'],
    tip: '💡 Die meisten Verkäufer bevorzugen Vormittagstermine',
    namePlaceholder: 'z.B. Ahmed Mahmoud',
    phonePlaceholder: 'z.B. 01012345678',
    notesPlaceholder: 'Weitere Details für den Verkäufer...',
    required: 'Pflichtfeld',
    confirm: 'Ausgewählten Slot bestätigen',
    confirmText: (day, slot, loc) => `${day} • ${slot} • ${loc}`,
    slotPeak: '🔥 Stoßzeit',
  },
};

function toArabicIndic(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function getNext7Days(lang) {
  const L = LABELS[lang] || LABELS.ar;
  const days = [];
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(now.getDate() + i);
    const dow = d.getDay(); // 0=Sun
    const isWeekend = dow === 5 || dow === 6; // Fri/Sat = Arab weekend
    const dayName = i === 0 ? L.today : i === 1 ? L.tomorrow : L.days[dow];
    const dateStr = lang === 'ar'
      ? `${toArabicIndic(d.getDate())} ${L.months[d.getMonth()]}`
      : `${d.getDate()} ${L.months[d.getMonth()]}`;
    days.push({ date: d, dow, isWeekend, dayName, dateStr, index: i });
  }
  return days;
}

const TIME_SLOTS = [
  { id: 'morning-early', range: '9:00 - 11:00', labelKey: 'morning', icon: '🌅', peak: false },
  { id: 'morning-late', range: '11:00 - 13:00', labelKey: 'morning', icon: '☀️', peak: true },
  { id: 'afternoon', range: '13:00 - 17:00', labelKey: 'afternoon', icon: '🌤️', peak: false },
  { id: 'evening', range: '17:00 - 20:00', labelKey: 'evening', icon: '🌆', peak: true },
];

const LOCATION_ICONS = ['🏠', '🏡', '🤝'];

export default function SellerAppointmentBooking({
  adId,
  sellerId,
  adTitle = '',
  lang = 'ar',
  onAppointmentRequest,
  className = '',
}) {
  const L = LABELS[lang] || LABELS.ar;
  const isRtl = lang === 'ar';

  const next7Days = useMemo(() => getNext7Days(lang), [lang]);

  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedLoc, setSelectedLoc] = useState(0);
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [whatsapp, setWhatsapp] = useState('');
  const [notes, setNotes] = useState('');
  const [status, setStatus] = useState('idle'); // idle | sending | sent | error
  const [currentLang, setCurrentLang] = useState(lang);

  const Lc = LABELS[currentLang] || LABELS.ar;
  const isRtlC = currentLang === 'ar';
  const next7 = useMemo(() => getNext7Days(currentLang), [currentLang]);

  const canSubmit = selectedDay !== null && selectedSlot !== null && name.trim() && phone.trim();

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit || status === 'sending') return;
    setStatus('sending');
    const payload = {
      adId,
      sellerId,
      adTitle,
      day: next7[selectedDay]?.date?.toISOString(),
      dayLabel: next7[selectedDay]?.dayName,
      dateLabel: next7[selectedDay]?.dateStr,
      slot: TIME_SLOTS[selectedSlot],
      location: Lc.locOptions[selectedLoc],
      name,
      phone,
      whatsapp,
      notes,
      lang: currentLang,
      requestedAt: new Date().toISOString(),
    };
    try {
      if (typeof onAppointmentRequest === 'function') {
        await onAppointmentRequest(payload);
      }
      setStatus('sent');
    } catch {
      setStatus('sent'); // Optimistic — show success even if backend down
    }
  }

  if (status === 'sent') {
    return (
      <div
        dir={isRtlC ? 'rtl' : 'ltr'}
        className={`rounded-2xl overflow-hidden shadow-lg bg-white border border-emerald-100 ${className}`}
        style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
      >
        <div className="bg-gradient-to-br from-emerald-500 to-teal-600 p-8 text-center text-white">
          <div className="text-5xl mb-3">✅</div>
          <div className="text-xl font-bold mb-1">{Lc.sent}</div>
          {selectedDay !== null && selectedSlot !== null && (
            <div className="text-emerald-100 text-sm mt-2">
              {Lc.confirmText(
                next7[selectedDay]?.dayName,
                TIME_SLOTS[selectedSlot]?.range,
                Lc.locOptions[selectedLoc]
              )}
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div
      dir={isRtlC ? 'rtl' : 'ltr'}
      className={`rounded-2xl overflow-hidden shadow-lg bg-white border border-gray-100 ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-br from-indigo-600 to-purple-700 p-5 text-white">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold">📅 {Lc.title}</h2>
            <p className="text-indigo-200 text-sm mt-0.5">{Lc.subtitle}</p>
          </div>
          {/* Language Switcher */}
          <div className="flex gap-1">
            {['ar', 'en', 'de'].map(l => (
              <button
                key={l}
                onClick={() => setCurrentLang(l)}
                className={`px-2 py-0.5 rounded text-xs font-bold border transition-all ${
                  currentLang === l
                    ? 'bg-white text-indigo-700 border-white'
                    : 'bg-transparent text-indigo-200 border-indigo-400 hover:border-white'
                }`}
              >
                {l.toUpperCase()}
              </button>
            ))}
          </div>
        </div>
        {adTitle && (
          <div className="mt-2 text-xs text-indigo-200 truncate">
            🏷️ {adTitle}
          </div>
        )}
      </div>

      <form onSubmit={handleSubmit} className="p-4 space-y-5">
        {/* Day Selector */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
            {Lc.selectDay}
          </p>
          <div className="grid grid-cols-7 gap-1">
            {next7.map((d, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedDay(i)}
                className={`rounded-xl py-2 px-0.5 text-center text-xs font-bold transition-all border-2 ${
                  selectedDay === i
                    ? 'bg-indigo-600 text-white border-indigo-600 scale-105 shadow'
                    : d.isWeekend
                    ? 'bg-amber-50 text-amber-700 border-amber-200 hover:border-amber-400'
                    : 'bg-gray-50 text-gray-700 border-gray-100 hover:border-indigo-300'
                }`}
              >
                <div className="truncate">{d.dayName}</div>
                <div className={`mt-0.5 ${selectedDay === i ? 'text-indigo-200' : 'text-gray-400'} font-normal`} style={{ fontSize: '10px' }}>
                  {d.dateStr}
                </div>
                {d.isWeekend && (
                  <div style={{ fontSize: '9px' }} className={selectedDay === i ? 'text-indigo-200' : 'text-amber-500'}>
                    {Lc.weekend}
                  </div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Time Slot Selector */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
            {Lc.selectTime}
          </p>
          <div className="grid grid-cols-2 gap-2">
            {TIME_SLOTS.map((slot, i) => (
              <button
                key={slot.id}
                type="button"
                onClick={() => setSelectedSlot(i)}
                className={`rounded-xl p-3 text-right border-2 transition-all text-sm ${
                  isRtlC ? 'text-right' : 'text-left'
                } ${
                  selectedSlot === i
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-800'
                    : 'bg-gray-50 border-gray-100 text-gray-700 hover:border-indigo-200'
                }`}
              >
                <div className="font-bold">{slot.icon} {Lc[slot.labelKey]}</div>
                <div className="text-xs text-gray-400 mt-0.5">{slot.range}</div>
                {slot.peak && (
                  <div className="text-xs text-orange-500 mt-0.5">{Lc.slotPeak}</div>
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Location */}
        <div>
          <p className="text-xs font-bold text-gray-500 mb-2 uppercase tracking-wide">
            {Lc.location}
          </p>
          <div className="flex gap-2">
            {Lc.locOptions.map((opt, i) => (
              <button
                key={i}
                type="button"
                onClick={() => setSelectedLoc(i)}
                className={`flex-1 rounded-xl p-2 text-center text-xs font-bold border-2 transition-all ${
                  selectedLoc === i
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-gray-50 text-gray-600 border-gray-100 hover:border-indigo-200'
                }`}
              >
                <div className="text-base mb-0.5">{LOCATION_ICONS[i]}</div>
                {opt}
              </button>
            ))}
          </div>
        </div>

        {/* Confirmation Summary */}
        {selectedDay !== null && selectedSlot !== null && (
          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-3 text-sm text-indigo-700 font-bold text-center">
            📌 {Lc.confirmText(
              next7[selectedDay]?.dayName + ' ' + next7[selectedDay]?.dateStr,
              TIME_SLOTS[selectedSlot]?.range,
              Lc.locOptions[selectedLoc]
            )}
          </div>
        )}

        {/* Contact Fields */}
        <div className="space-y-3">
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              {Lc.yourName} <span className="text-red-400">*</span>
            </label>
            <input
              type="text"
              value={name}
              onChange={e => setName(e.target.value)}
              placeholder={Lc.namePlaceholder}
              required
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50"
              dir={isRtlC ? 'rtl' : 'ltr'}
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              {Lc.yourPhone} <span className="text-red-400">*</span>
            </label>
            <input
              type="tel"
              value={phone}
              onChange={e => setPhone(e.target.value)}
              placeholder={Lc.phonePlaceholder}
              required
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              💬 {Lc.whatsapp}
            </label>
            <input
              type="tel"
              value={whatsapp}
              onChange={e => setWhatsapp(e.target.value)}
              placeholder={Lc.phonePlaceholder}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50"
              dir="ltr"
            />
          </div>
          <div>
            <label className="text-xs font-bold text-gray-600 block mb-1">
              📝 {Lc.notes}
            </label>
            <textarea
              value={notes}
              onChange={e => setNotes(e.target.value)}
              placeholder={Lc.notesPlaceholder}
              rows={3}
              className="w-full rounded-xl border border-gray-200 p-3 text-sm focus:outline-none focus:border-indigo-400 bg-gray-50 resize-none"
              dir={isRtlC ? 'rtl' : 'ltr'}
            />
          </div>
        </div>

        {/* Tip */}
        <div className="text-xs text-gray-400 text-center">{Lc.tip}</div>

        {/* Submit */}
        <button
          type="submit"
          disabled={!canSubmit || status === 'sending'}
          className={`w-full py-3.5 rounded-xl font-bold text-white text-sm transition-all ${
            canSubmit
              ? 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 shadow-md hover:shadow-lg active:scale-95'
              : 'bg-gray-200 text-gray-400 cursor-not-allowed'
          }`}
        >
          {status === 'sending' ? Lc.sending : `📅 ${Lc.send}`}
        </button>
      </form>
    </div>
  );
}
