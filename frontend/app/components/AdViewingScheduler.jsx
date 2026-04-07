// AdViewingScheduler.jsx
// Schedule in-person viewing appointments between buyer and seller
// Tri-lingual: AR / EN / DE | RTL-aware | Cairo/Tajawal fonts | Arabic-Indic numerals | Tailwind only

"use client";
import { useState } from "react";

const TRANSLATIONS = {
  ar: {
    title: "تحديد موعد معاينة",
    subtitle: "اختر يومًا وتوقيتًا مناسبًا للمعاينة الشخصية",
    selectDate: "اختر التاريخ",
    selectTime: "اختر الوقت",
    selectLocation: "مكان اللقاء",
    confirm: "تأكيد الموعد",
    cancel: "إلغاء",
    confirmed: "تم تأكيد الموعد",
    confirmedMsg: "سيتلقى البائع إشعارًا بموعدك",
    morning: "الصباح",
    afternoon: "الظهيرة",
    evening: "المساء",
    morning_range: "٩ ص – ١٢ م",
    afternoon_range: "١٢ م – ٤ م",
    evening_range: "٤ م – ٨ م",
    loc_seller: "عند البائع",
    loc_buyer: "عند المشتري",
    loc_public: "مكان عام",
    note: "ملاحظة للبائع (اختياري)",
    note_placeholder: "مثال: تواصل معي قبل الحضور",
    chars: "حرف",
    day_names: ["أحد", "اثن", "ثلا", "أرب", "خمس", "جمع", "سبت"],
    months: ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"],
    badge: "حجز موعد",
    step1: "الموعد",
    step2: "التأكيد",
  },
  en: {
    title: "Schedule a Viewing",
    subtitle: "Pick a date and time for an in-person viewing",
    selectDate: "Select Date",
    selectTime: "Select Time",
    selectLocation: "Meeting Location",
    confirm: "Confirm Appointment",
    cancel: "Cancel",
    confirmed: "Appointment Confirmed",
    confirmedMsg: "The seller will be notified of your appointment",
    morning: "Morning",
    afternoon: "Afternoon",
    evening: "Evening",
    morning_range: "9 AM – 12 PM",
    afternoon_range: "12 PM – 4 PM",
    evening_range: "4 PM – 8 PM",
    loc_seller: "Seller's Place",
    loc_buyer: "Buyer's Place",
    loc_public: "Public Location",
    note: "Note to seller (optional)",
    note_placeholder: "e.g. Call me before you arrive",
    chars: "chars",
    day_names: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"],
    months: ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"],
    badge: "Book Viewing",
    step1: "Date & Time",
    step2: "Confirm",
  },
  de: {
    title: "Besichtigungstermin",
    subtitle: "Wählen Sie Datum und Uhrzeit für eine persönliche Besichtigung",
    selectDate: "Datum wählen",
    selectTime: "Uhrzeit wählen",
    selectLocation: "Treffpunkt",
    confirm: "Termin bestätigen",
    cancel: "Abbrechen",
    confirmed: "Termin bestätigt",
    confirmedMsg: "Der Verkäufer wird über Ihren Termin benachrichtigt",
    morning: "Morgen",
    afternoon: "Nachmittag",
    evening: "Abend",
    morning_range: "9–12 Uhr",
    afternoon_range: "12–16 Uhr",
    evening_range: "16–20 Uhr",
    loc_seller: "Beim Verkäufer",
    loc_buyer: "Beim Käufer",
    loc_public: "Öffentlicher Ort",
    note: "Notiz an Verkäufer (optional)",
    note_placeholder: "z.B. Bitte vorher anrufen",
    chars: "Zeichen",
    day_names: ["So", "Mo", "Di", "Mi", "Do", "Fr", "Sa"],
    months: ["Jan","Feb","Mär","Apr","Mai","Jun","Jul","Aug","Sep","Okt","Nov","Dez"],
    badge: "Termin buchen",
    step1: "Datum",
    step2: "Bestätigen",
  },
};

function toArabicIndic(n) {
  return String(n).replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[+d]);
}

function formatNum(n, lang) {
  return lang === "ar" ? toArabicIndic(n) : String(n);
}

function buildCalendarDays(year, month) {
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);
  return cells;
}

const TIME_SLOTS = ["morning", "afternoon", "evening"];
const LOCATIONS = ["loc_seller", "loc_buyer", "loc_public"];
const LOCATION_ICONS = { loc_seller: "🏠", loc_buyer: "🏡", loc_public: "☕" };

export default function AdViewingScheduler({
  adId,
  lang = "ar",
  onSchedule,
  onCancel,
}) {
  const isRTL = lang === "ar";
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;

  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [selectedSlot, setSelectedSlot] = useState(null);
  const [selectedLoc, setSelectedLoc] = useState(null);
  const [note, setNote] = useState("");
  const [step, setStep] = useState(1); // 1=pick, 2=confirm, 3=done
  const [sending, setSending] = useState(false);

  const cells = buildCalendarDays(viewYear, viewMonth);

  function prevMonth() {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
    setSelectedDay(null);
  }
  function nextMonth() {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
    setSelectedDay(null);
  }

  function isPast(day) {
    const d = new Date(viewYear, viewMonth, day);
    d.setHours(0,0,0,0);
    const tod = new Date(); tod.setHours(0,0,0,0);
    return d < tod;
  }

  function handleConfirm() {
    setSending(true);
    setTimeout(() => {
      if (onSchedule) onSchedule({ adId, day: selectedDay, month: viewMonth, year: viewYear, slot: selectedSlot, location: selectedLoc, note });
      setSending(false);
      setStep(3);
    }, 900);
  }

  const canProceed = selectedDay && selectedSlot && selectedLoc;

  if (step === 3) {
    return (
      <div dir={isRTL ? "rtl" : "ltr"} className="max-w-sm mx-auto rounded-2xl bg-white shadow-lg p-6 text-center font-['Cairo','Tajawal',sans-serif]">
        <div className="text-5xl mb-3">✅</div>
        <h2 className="text-xl font-bold text-emerald-700 mb-1">{t.confirmed}</h2>
        <p className="text-sm text-gray-500 mb-4">{t.confirmedMsg}</p>
        <div className="bg-emerald-50 rounded-xl p-4 text-sm text-emerald-800 space-y-1">
          <div className="font-semibold">
            {formatNum(selectedDay, lang)} {t.months[viewMonth]} {formatNum(viewYear, lang)}
          </div>
          <div>{t[selectedSlot]} – {t[selectedSlot + "_range"]}</div>
          <div>{LOCATION_ICONS[selectedLoc]} {t[selectedLoc]}</div>
          {note && <div className="text-gray-500 italic">{note}</div>}
        </div>
      </div>
    );
  }

  return (
    <div dir={isRTL ? "rtl" : "ltr"} className="max-w-sm mx-auto rounded-2xl bg-white shadow-lg overflow-hidden font-['Cairo','Tajawal',sans-serif]">
      {/* Header */}
      <div className="bg-gradient-to-br from-violet-600 to-indigo-600 px-5 py-4">
        <div className="flex items-center gap-2">
          <span className="bg-white/20 text-white text-xs font-bold px-2 py-0.5 rounded-full">
            📅 {t.badge}
          </span>
        </div>
        <h2 className="text-white font-bold text-lg mt-1">{t.title}</h2>
        <p className="text-white/70 text-xs">{t.subtitle}</p>
        {/* Step indicators */}
        <div className={`flex gap-2 mt-3 ${isRTL ? "flex-row-reverse" : ""}`}>
          {[1,2].map(s => (
            <div key={s} className={`flex-1 h-1 rounded-full transition-all ${step >= s ? "bg-white" : "bg-white/30"}`} />
          ))}
        </div>
        <div className={`flex justify-between text-white/60 text-xs mt-1 ${isRTL ? "flex-row-reverse" : ""}`}>
          <span>{t.step1}</span><span>{t.step2}</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {step === 1 && (
          <>
            {/* Calendar */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{t.selectDate}</p>
              <div className="border border-gray-100 rounded-xl overflow-hidden">
                {/* Month nav */}
                <div className="flex items-center justify-between bg-gray-50 px-3 py-2">
                  <button onClick={isRTL ? nextMonth : prevMonth} className="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm">
                    {isRTL ? "›" : "‹"}
                  </button>
                  <span className="text-sm font-bold text-gray-700">
                    {t.months[viewMonth]} {formatNum(viewYear, lang)}
                  </span>
                  <button onClick={isRTL ? prevMonth : nextMonth} className="w-7 h-7 rounded-full hover:bg-gray-200 flex items-center justify-center text-gray-600 text-sm">
                    {isRTL ? "‹" : "›"}
                  </button>
                </div>
                {/* Day headers */}
                <div className={`grid grid-cols-7 ${isRTL ? "" : ""}`}>
                  {(isRTL ? [...t.day_names].reverse() : t.day_names).map((d, i) => (
                    <div key={i} className="text-center text-xs text-gray-400 py-1">{d}</div>
                  ))}
                </div>
                {/* Cells */}
                <div className="grid grid-cols-7 gap-0.5 p-1">
                  {cells.map((day, i) => {
                    if (!day) return <div key={i} />;
                    const past = isPast(day);
                    const sel = selectedDay === day && viewMonth === viewMonth;
                    return (
                      <button
                        key={i}
                        disabled={past}
                        onClick={() => setSelectedDay(day)}
                        className={[
                          "aspect-square rounded-lg text-xs font-medium transition-all",
                          past ? "text-gray-200 cursor-not-allowed" : "hover:bg-violet-100 cursor-pointer",
                          sel ? "bg-violet-600 text-white shadow-md" : "text-gray-700",
                        ].join(" ")}
                      >
                        {formatNum(day, lang)}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Time slots */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{t.selectTime}</p>
              <div className="grid grid-cols-3 gap-2">
                {TIME_SLOTS.map(slot => (
                  <button
                    key={slot}
                    onClick={() => setSelectedSlot(slot)}
                    className={[
                      "rounded-xl p-2 border-2 text-center transition-all",
                      selectedSlot === slot
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-100 hover:border-violet-300",
                    ].join(" ")}
                  >
                    <div className="text-lg">{slot === "morning" ? "🌅" : slot === "afternoon" ? "☀️" : "🌙"}</div>
                    <div className="text-xs font-semibold text-gray-700">{t[slot]}</div>
                    <div className="text-[10px] text-gray-400">{t[slot + "_range"]}</div>
                  </button>
                ))}
              </div>
            </div>

            {/* Location */}
            <div>
              <p className="text-xs font-semibold text-gray-400 uppercase mb-2">{t.selectLocation}</p>
              <div className="space-y-2">
                {LOCATIONS.map(loc => (
                  <button
                    key={loc}
                    onClick={() => setSelectedLoc(loc)}
                    className={[
                      "w-full flex items-center gap-3 rounded-xl p-3 border-2 transition-all text-start",
                      selectedLoc === loc
                        ? "border-violet-500 bg-violet-50"
                        : "border-gray-100 hover:border-violet-300",
                    ].join(" ")}
                  >
                    <span className="text-xl">{LOCATION_ICONS[loc]}</span>
                    <span className="text-sm font-medium text-gray-700">{t[loc]}</span>
                    {selectedLoc === loc && <span className={`${isRTL ? "mr-auto" : "ml-auto"} text-violet-500`}>✓</span>}
                  </button>
                ))}
              </div>
            </div>

            {/* Proceed */}
            <button
              disabled={!canProceed}
              onClick={() => setStep(2)}
              className={[
                "w-full py-3 rounded-xl font-bold text-sm transition-all",
                canProceed
                  ? "bg-violet-600 text-white hover:bg-violet-700 shadow-md shadow-violet-200"
                  : "bg-gray-100 text-gray-300 cursor-not-allowed",
              ].join(" ")}
            >
              {t.step2} →
            </button>
          </>
        )}

        {step === 2 && (
          <>
            {/* Summary */}
            <div className="bg-violet-50 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm text-violet-800">
                <span>📅</span>
                <span className="font-semibold">
                  {formatNum(selectedDay, lang)} {t.months[viewMonth]} {formatNum(viewYear, lang)}
                </span>
              </div>
              <div className="flex items-center gap-2 text-sm text-violet-700">
                <span>{selectedSlot === "morning" ? "🌅" : selectedSlot === "afternoon" ? "☀️" : "🌙"}</span>
                <span>{t[selectedSlot]} – {t[selectedSlot + "_range"]}</span>
              </div>
              <div className="flex items-center gap-2 text-sm text-violet-700">
                <span>{LOCATION_ICONS[selectedLoc]}</span>
                <span>{t[selectedLoc]}</span>
              </div>
            </div>

            {/* Note */}
            <div>
              <p className="text-xs font-semibold text-gray-400 mb-1">{t.note}</p>
              <div className="relative">
                <textarea
                  value={note}
                  onChange={e => setNote(e.target.value.slice(0, 200))}
                  placeholder={t.note_placeholder}
                  rows={3}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-violet-300"
                />
                <span className={`absolute bottom-2 ${isRTL ? "left-2" : "right-2"} text-xs text-gray-300`}>
                  {formatNum(note.length, lang)}/٢٠٠
                </span>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setStep(1)}
                className="flex-1 py-3 rounded-xl border-2 border-gray-200 text-sm font-semibold text-gray-600 hover:border-gray-300 transition-all"
              >
                {t.cancel}
              </button>
              <button
                onClick={handleConfirm}
                disabled={sending}
                className="flex-2 flex-[2] py-3 rounded-xl bg-violet-600 text-white text-sm font-bold hover:bg-violet-700 transition-all shadow-md shadow-violet-200 disabled:opacity-60"
              >
                {sending ? "⏳" : t.confirm}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
