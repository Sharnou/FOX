"use client";
/**
 * OfferNegotiationTimeline.jsx
 * XTOX Marketplace — Visual buyer-seller negotiation history timeline.
 *
 * Displays the full offer/counter-offer chain for a deal, with:
 *  - Offer bubbles (buyer left, seller right) with amounts & Arabic-Indic numerals
 *  - Status badges: pending / accepted / rejected / expired / counter
 *  - Relative timestamps (Arabic-Indic, trilingual AR/EN/DE)
 *  - Deal summary card on acceptance (agreed price + handshake animation)
 *  - "Make counter-offer" quick action at bottom
 *  - RTL-aware layout (Arabic flips sides)
 *  - Tailwind only, zero external deps
 *
 * Props:
 *  offers[]        — array of offer objects (see shape below)
 *  currentUserId   — logged-in user's _id (to determine buyer vs seller side)
 *  lang            — 'ar' | 'en' | 'de'
 *  adTitle         — title of the ad being negotiated
 *  originalPrice   — seller's asking price (number)
 *  currency        — 'EGP' | 'EUR' | 'USD' etc.
 *  onCounterOffer  — fn(amount: number) called when user submits a counter
 *  onAccept        — fn(offerId: string) called when user accepts an offer
 *  onReject        — fn(offerId: string) called when user rejects an offer
 *
 * Offer object shape:
 *  { _id, fromUserId, amount, status, createdAt, note? }
 *  status: 'pending' | 'accepted' | 'rejected' | 'expired' | 'countered'
 */

import { useState, useRef, useEffect } from "react";

/* ─── i18n ─────────────────────────────────────────────────────────────── */
const T = {
  ar: {
    title: "سجل التفاوض",
    originalPrice: "السعر الأصلي",
    offer: "عرض",
    counterOffer: "عرض مضاد",
    accepted: "مقبول ✓",
    rejected: "مرفوض ✗",
    expired: "منتهي الصلاحية",
    countered: "تم الرد عليه",
    pending: "قيد الانتظار",
    dealDone: "تم الاتفاق!",
    agreedAt: "السعر المتفق عليه",
    makeCounter: "أرسل عرضًا مضادًا",
    accept: "قبول",
    reject: "رفض",
    yourOffer: "عرضك",
    theirOffer: "عرضه",
    note: "ملاحظة",
    enterAmount: "أدخل المبلغ",
    send: "إرسال",
    cancel: "إلغاء",
    noOffers: "لا توجد عروض بعد",
    discount: "خصم",
    ago: "منذ",
    justNow: "الآن",
    minutes: "دقيقة",
    hours: "ساعة",
    days: "يوم",
  },
  en: {
    title: "Negotiation History",
    originalPrice: "Asking Price",
    offer: "Offer",
    counterOffer: "Counter-Offer",
    accepted: "Accepted ✓",
    rejected: "Rejected ✗",
    expired: "Expired",
    countered: "Countered",
    pending: "Pending",
    dealDone: "Deal Agreed!",
    agreedAt: "Agreed Price",
    makeCounter: "Send Counter-Offer",
    accept: "Accept",
    reject: "Reject",
    yourOffer: "Your offer",
    theirOffer: "Their offer",
    note: "Note",
    enterAmount: "Enter amount",
    send: "Send",
    cancel: "Cancel",
    noOffers: "No offers yet",
    discount: "off",
    ago: "ago",
    justNow: "just now",
    minutes: "min",
    hours: "hr",
    days: "d",
  },
  de: {
    title: "Verhandlungsverlauf",
    originalPrice: "Angebotspreis",
    offer: "Angebot",
    counterOffer: "Gegenangebot",
    accepted: "Akzeptiert ✓",
    rejected: "Abgelehnt ✗",
    expired: "Abgelaufen",
    countered: "Beantwortet",
    pending: "Ausstehend",
    dealDone: "Einigung erzielt!",
    agreedAt: "Vereinbarter Preis",
    makeCounter: "Gegenangebot senden",
    accept: "Akzeptieren",
    reject: "Ablehnen",
    yourOffer: "Dein Angebot",
    theirOffer: "Ihr Angebot",
    note: "Notiz",
    enterAmount: "Betrag eingeben",
    send: "Senden",
    cancel: "Abbrechen",
    noOffers: "Noch keine Angebote",
    discount: "Rabatt",
    ago: "vor",
    justNow: "gerade eben",
    minutes: "Min",
    hours: "Std",
    days: "T",
  },
};

/* ─── Helpers ───────────────────────────────────────────────────────────── */
const toArabicIndic = (n, lang) => {
  if (lang !== "ar") return String(n);
  return String(n).replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d]);
};

const formatAmount = (amount, currency, lang) => {
  const formatted = Number(amount).toLocaleString("en-US");
  const indic = lang === "ar"
    ? formatted.replace(/\d/g, (d) => "٠١٢٣٤٥٦٧٨٩"[d])
    : formatted;
  return `${indic} ${currency}`;
};

const relativeTime = (dateStr, lang) => {
  const t = T[lang] || T.en;
  const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
  if (diff < 60) return t.justNow;
  if (diff < 3600) {
    const m = Math.floor(diff / 60);
    return lang === "ar"
      ? `${t.ago} ${toArabicIndic(m, lang)} ${t.minutes}`
      : `${m} ${t.minutes} ${t.ago}`;
  }
  if (diff < 86400) {
    const h = Math.floor(diff / 3600);
    return lang === "ar"
      ? `${t.ago} ${toArabicIndic(h, lang)} ${t.hours}`
      : `${h} ${t.hours} ${t.ago}`;
  }
  const d = Math.floor(diff / 86400);
  return lang === "ar"
    ? `${t.ago} ${toArabicIndic(d, lang)} ${t.days}`
    : `${d} ${t.days} ${t.ago}`;
};

const discountPct = (original, offer) => {
  if (!original || original <= 0) return 0;
  return Math.round(((original - offer) / original) * 100);
};

/* ─── Status badge ──────────────────────────────────────────────────────── */
const STATUS_STYLES = {
  pending:  "bg-amber-100 text-amber-700 border-amber-200",
  accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-600 border-red-200",
  expired:  "bg-gray-100 text-gray-500 border-gray-200",
  countered:"bg-blue-100 text-blue-600 border-blue-200",
};

function StatusBadge({ status, lang }) {
  const t = T[lang] || T.en;
  const label = t[status] || status;
  const cls = STATUS_STYLES[status] || "bg-gray-100 text-gray-500";
  return (
    <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
      {label}
    </span>
  );
}

/* ─── Single offer bubble ───────────────────────────────────────────────── */
function OfferBubble({ offer, isOwn, lang, currency, originalPrice, onAccept, onReject, isLast, isPending }) {
  const t = T[lang] || T.en;
  const isAr = lang === "ar";
  const pct = discountPct(originalPrice, offer.amount);

  // In RTL (Arabic), own messages go left, theirs go right (mirrored from LTR)
  const alignRight = isAr ? !isOwn : isOwn;

  return (
    <div className={`flex flex-col mb-4 ${alignRight ? "items-end" : "items-start"}`}>
      {/* Label */}
      <p className="text-xs text-gray-400 mb-1 font-medium">
        {isOwn ? t.yourOffer : t.theirOffer}
      </p>

      {/* Bubble */}
      <div
        className={`relative max-w-xs rounded-2xl px-4 py-3 shadow-sm border
          ${isOwn
            ? "bg-indigo-600 text-white border-indigo-500 rounded-br-sm"
            : "bg-white text-gray-800 border-gray-200 rounded-bl-sm"
          }`}
      >
        {/* Amount */}
        <p className={`text-xl font-bold mb-1 ${isAr ? "text-right font-[Cairo,sans-serif]" : ""}`}>
          {formatAmount(offer.amount, currency, lang)}
        </p>

        {/* Discount tag */}
        {pct > 0 && (
          <span className={`inline-block text-xs font-semibold px-2 py-0.5 rounded-full mb-1
            ${isOwn ? "bg-indigo-400 text-white" : "bg-indigo-50 text-indigo-600"}`}>
            {isAr
              ? `${t.discount} ${toArabicIndic(pct, lang)}٪`
              : `${pct}% ${t.discount}`}
          </span>
        )}

        {/* Note */}
        {offer.note && (
          <p className={`text-xs mt-1 opacity-80 ${isAr ? "text-right" : ""}`}>
            {offer.note}
          </p>
        )}

        {/* Timestamp */}
        <p className={`text-xs mt-2 opacity-60 ${isAr ? "text-right" : ""}`}>
          {relativeTime(offer.createdAt, lang)}
        </p>
      </div>

      {/* Status */}
      <div className="mt-1">
        <StatusBadge status={offer.status} lang={lang} />
      </div>

      {/* Action buttons for pending offers (only for the recipient) */}
      {!isOwn && isLast && isPending && (
        <div className={`flex gap-2 mt-2 ${isAr ? "flex-row-reverse" : ""}`}>
          <button
            onClick={() => onAccept && onAccept(offer._id)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-emerald-500 text-white hover:bg-emerald-600 transition-colors"
          >
            {t.accept}
          </button>
          <button
            onClick={() => onReject && onReject(offer._id)}
            className="text-xs font-semibold px-3 py-1.5 rounded-lg bg-red-100 text-red-600 hover:bg-red-200 transition-colors border border-red-200"
          >
            {t.reject}
          </button>
        </div>
      )}
    </div>
  );
}

/* ─── Deal done card ────────────────────────────────────────────────────── */
function DealDoneCard({ agreedAmount, currency, lang }) {
  const t = T[lang] || T.en;
  const isAr = lang === "ar";
  return (
    <div className={`my-4 mx-auto max-w-sm rounded-2xl bg-gradient-to-r from-emerald-50 to-teal-50 border border-emerald-200 p-4 text-center shadow`}>
      <div className="text-3xl mb-1">🤝</div>
      <p className={`font-bold text-emerald-700 text-lg ${isAr ? "font-[Cairo,sans-serif]" : ""}`}>
        {t.dealDone}
      </p>
      <p className="text-sm text-gray-500 mt-1">{t.agreedAt}</p>
      <p className={`text-2xl font-extrabold text-emerald-600 mt-1 ${isAr ? "font-[Cairo,sans-serif]" : ""}`}>
        {formatAmount(agreedAmount, currency, lang)}
      </p>
    </div>
  );
}

/* ─── Counter-offer input ───────────────────────────────────────────────── */
function CounterOfferInput({ lang, currency, lastAmount, originalPrice, onSend, onCancel }) {
  const t = T[lang] || T.en;
  const isAr = lang === "ar";
  const [amount, setAmount] = useState("");
  const inputRef = useRef(null);

  useEffect(() => { inputRef.current?.focus(); }, []);

  const handleSend = () => {
    const val = parseFloat(amount);
    if (!val || val <= 0) return;
    onSend && onSend(val);
    setAmount("");
  };

  return (
    <div className={`mt-4 p-4 rounded-2xl bg-indigo-50 border border-indigo-100 ${isAr ? "text-right" : ""}`}>
      <p className={`text-sm font-semibold text-indigo-700 mb-2 ${isAr ? "font-[Cairo,sans-serif]" : ""}`}>
        {t.makeCounter}
      </p>
      <div className={`flex gap-2 ${isAr ? "flex-row-reverse" : ""}`}>
        <input
          ref={inputRef}
          type="number"
          min="1"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder={t.enterAmount}
          className={`flex-1 rounded-xl border border-indigo-200 px-3 py-2 text-sm outline-none focus:ring-2 focus:ring-indigo-400 bg-white ${isAr ? "text-right" : ""}`}
          onKeyDown={(e) => e.key === "Enter" && handleSend()}
        />
        <span className="self-center text-xs text-gray-400 font-medium">{currency}</span>
      </div>
      {lastAmount && originalPrice && (
        <p className="text-xs text-gray-400 mt-1">
          {isAr
            ? `آخر عرض: ${formatAmount(lastAmount, currency, "ar")}`
            : `Last offer: ${formatAmount(lastAmount, currency, lang)}`}
        </p>
      )}
      <div className={`flex gap-2 mt-3 ${isAr ? "flex-row-reverse" : ""}`}>
        <button
          onClick={handleSend}
          className="flex-1 bg-indigo-600 text-white text-sm font-semibold py-2 rounded-xl hover:bg-indigo-700 transition-colors"
        >
          {t.send}
        </button>
        <button
          onClick={onCancel}
          className="flex-1 bg-white text-gray-600 text-sm font-semibold py-2 rounded-xl border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          {t.cancel}
        </button>
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────────────────────── */
export default function OfferNegotiationTimeline({
  offers = [],
  currentUserId = "",
  lang = "ar",
  adTitle = "",
  originalPrice = 0,
  currency = "EGP",
  onCounterOffer,
  onAccept,
  onReject,
}) {
  const t = T[lang] || T.en;
  const isAr = lang === "ar";
  const [showCounter, setShowCounter] = useState(false);
  const bottomRef = useRef(null);

  // Scroll to bottom on new offers
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [offers]);

  const acceptedOffer = offers.find((o) => o.status === "accepted");
  const lastOffer = offers[offers.length - 1];
  const canCounter =
    !acceptedOffer &&
    lastOffer &&
    lastOffer.status === "pending" &&
    lastOffer.fromUserId !== currentUserId;

  const handleCounterSend = (amount) => {
    setShowCounter(false);
    onCounterOffer && onCounterOffer(amount);
  };

  return (
    <div
      dir={isAr ? "rtl" : "ltr"}
      className="w-full max-w-md mx-auto bg-gray-50 rounded-3xl border border-gray-200 shadow-md overflow-hidden"
      style={{ fontFamily: isAr ? "'Cairo', 'Tajawal', sans-serif" : "inherit" }}
    >
      {/* ── Header ── */}
      <div className="px-5 py-4 bg-white border-b border-gray-100 flex items-center justify-between">
        <div>
          <h2 className="font-bold text-gray-800 text-base leading-tight">{t.title}</h2>
          {adTitle && (
            <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[200px]">{adTitle}</p>
          )}
        </div>
        {/* Original price pill */}
        {originalPrice > 0 && (
          <div className="text-right">
            <p className="text-xs text-gray-400">{t.originalPrice}</p>
            <p className="text-sm font-bold text-gray-700">
              {formatAmount(originalPrice, currency, lang)}
            </p>
          </div>
        )}
      </div>

      {/* ── Timeline ── */}
      <div className="px-4 py-4 max-h-80 overflow-y-auto">
        {offers.length === 0 ? (
          <p className="text-center text-gray-400 text-sm py-8">{t.noOffers}</p>
        ) : (
          <>
            {offers.map((offer, idx) => (
              <OfferBubble
                key={offer._id || idx}
                offer={offer}
                isOwn={offer.fromUserId === currentUserId}
                lang={lang}
                currency={currency}
                originalPrice={originalPrice}
                onAccept={onAccept}
                onReject={onReject}
                isLast={idx === offers.length - 1}
                isPending={offer.status === "pending"}
              />
            ))}
            {acceptedOffer && (
              <DealDoneCard
                agreedAmount={acceptedOffer.amount}
                currency={currency}
                lang={lang}
              />
            )}
          </>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── Footer actions ── */}
      {!acceptedOffer && (
        <div className="px-4 pb-4">
          {showCounter ? (
            <CounterOfferInput
              lang={lang}
              currency={currency}
              lastAmount={lastOffer?.amount}
              originalPrice={originalPrice}
              onSend={handleCounterSend}
              onCancel={() => setShowCounter(false)}
            />
          ) : canCounter ? (
            <button
              onClick={() => setShowCounter(true)}
              className="w-full py-2.5 rounded-2xl bg-indigo-600 text-white font-semibold text-sm hover:bg-indigo-700 transition-colors"
            >
              {t.makeCounter}
            </button>
          ) : null}
        </div>
      )}
    </div>
  );
}
