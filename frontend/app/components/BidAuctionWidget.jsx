'use client';
/**
 * BidAuctionWidget.jsx
 * Auction-style bidding panel for XTOX marketplace ad pages.
 * - Live countdown to auction end (Arabic-Indic numerals)
 * - Current highest bid display
 * - Quick-bid increment buttons
 * - Expandable bid history with avatars
 * - Flash animation on new bid
 * - Tri-lingual AR / EN / DE
 * - RTL-aware (Cairo/Tajawal fonts)
 * - Tailwind only, zero external deps
 * - localStorage-backed (keyed by auctionId)
 *
 * Props:
 *   auctionId    {string}  unique auction identifier
 *   startPrice   {number}  opening price (default 100)
 *   currency     {string}  'EGP' | 'USD' | 'EUR' (default 'EGP')
 *   endTime      {string}  ISO date string for auction end (default 24h from now)
 *   lang         {string}  'ar' | 'en' | 'de' (default 'ar')
 *   className    {string}  extra Tailwind classes
 */
import { useState, useEffect, useCallback, useRef } from 'react';

/* ─── Translations ──────────────────────────────────────────────────────────── */
const T = {
  ar: {
    title: 'المزاد الآن',
    currentBid: 'أعلى عرض',
    bidders: 'مزايد',
    timeLeft: 'الوقت المتبقي',
    days: 'يوم',
    hours: 'سا',
    mins: 'د',
    secs: 'ث',
    placeBid: 'قدّم عرضك',
    yourBid: 'عرضك',
    quickBid: 'مزايدة سريعة',
    history: 'سجل المزايدات',
    hideHistory: 'إخفاء السجل',
    noBids: 'لا توجد مزايدات بعد',
    bidPlaced: '✓ تم تقديم عرضك',
    tooLow: 'عرضك أقل من الحد الأدنى',
    ended: 'انتهى المزاد',
    winner: 'الفائز',
    you: 'أنت',
    minBid: 'الحد الأدنى',
    currency: { EGP: 'ج.م', USD: '$', EUR: '€' },
  },
  en: {
    title: 'Live Auction',
    currentBid: 'Current Bid',
    bidders: 'bidder(s)',
    timeLeft: 'Time Left',
    days: 'd',
    hours: 'h',
    mins: 'm',
    secs: 's',
    placeBid: 'Place Bid',
    yourBid: 'Your Bid',
    quickBid: 'Quick Bid',
    history: 'Bid History',
    hideHistory: 'Hide History',
    noBids: 'No bids yet',
    bidPlaced: '✓ Bid placed!',
    tooLow: 'Bid too low',
    ended: 'Auction Ended',
    winner: 'Winner',
    you: 'You',
    minBid: 'Min bid',
    currency: { EGP: 'EGP', USD: '$', EUR: '€' },
  },
  de: {
    title: 'Live-Auktion',
    currentBid: 'Höchstgebot',
    bidders: 'Bieter',
    timeLeft: 'Verbleibend',
    days: 'T',
    hours: 'Std',
    mins: 'Min',
    secs: 'Sek',
    placeBid: 'Gebot abgeben',
    yourBid: 'Ihr Gebot',
    quickBid: 'Schnellgebot',
    history: 'Gebotsverlauf',
    hideHistory: 'Verlauf ausblenden',
    noBids: 'Noch keine Gebote',
    bidPlaced: '✓ Gebot abgegeben!',
    tooLow: 'Gebot zu niedrig',
    ended: 'Auktion beendet',
    winner: 'Gewinner',
    you: 'Sie',
    minBid: 'Mindestgebot',
    currency: { EGP: 'EGP', USD: '$', EUR: '€' },
  },
};

/* ─── Arabic-Indic numerals ─────────────────────────────────────────────────── */
const toAI = (n, lang) =>
  lang !== 'ar'
    ? String(n)
    : String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);

/* ─── Seed bids ─────────────────────────────────────────────────────────────── */
const SEED_BIDS = [
  { id: 1, user: 'محمد', avatar: '🧑', amount: 0, ts: Date.now() - 3600000 },
  { id: 2, user: 'Sara',  avatar: '👩', amount: 0, ts: Date.now() - 2100000 },
  { id: 3, user: 'Ali',   avatar: '👨', amount: 0, ts: Date.now() - 900000  },
];

/* ─── Helpers ───────────────────────────────────────────────────────────────── */
const STEP = 50; // minimum bid increment (EGP-equivalent)

function calcTimeLeft(endMs) {
  const diff = Math.max(0, endMs - Date.now());
  return {
    total: diff,
    days:  Math.floor(diff / 86400000),
    hours: Math.floor((diff % 86400000) / 3600000),
    mins:  Math.floor((diff % 3600000)  / 60000),
    secs:  Math.floor((diff % 60000)    / 1000),
  };
}

function pad(n) { return String(n).padStart(2, '0'); }

function relTime(ts, lang) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60)  return lang === 'ar' ? `منذ ${toAI(diff, 'ar')}ث` : lang === 'de' ? `vor ${diff}s` : `${diff}s ago`;
  if (diff < 3600) return lang === 'ar' ? `منذ ${toAI(Math.floor(diff/60), 'ar')}د` : lang === 'de' ? `vor ${Math.floor(diff/60)}min` : `${Math.floor(diff/60)}m ago`;
  return lang === 'ar' ? `منذ ${toAI(Math.floor(diff/3600), 'ar')}سا` : lang === 'de' ? `vor ${Math.floor(diff/3600)}Std` : `${Math.floor(diff/3600)}h ago`;
}

/* ─── Component ─────────────────────────────────────────────────────────────── */
export default function BidAuctionWidget({
  auctionId  = 'demo',
  startPrice = 100,
  currency   = 'EGP',
  endTime,
  lang       = 'ar',
  className  = '',
}) {
  const t   = T[lang] || T.ar;
  const rtl = lang === 'ar';
  const bidStorageKey = `xtox_auction_${auctionId}`;

  /* ── end timestamp ── */
  const endMs = useRef(
    endTime ? new Date(endTime).getTime() : Date.now() + 24 * 3600 * 1000
  ).current;

  /* ── persisted state ── */
  const loadState = () => {
    try {
      const raw = localStorage.getItem(bidStorageKey);
      if (raw) return JSON.parse(raw);
    } catch {}
    const seedBids = SEED_BIDS.map((b, i) => ({
      ...b,
      amount: startPrice + STEP * (i + 1),
    }));
    return { bids: seedBids, myBid: null };
  };

  const [state, setState]         = useState(loadState);
  const [timeLeft, setTimeLeft]   = useState(() => calcTimeLeft(endMs));
  const [customBid, setCustomBid] = useState('');
  const [flash, setFlash]         = useState(false);
  const [toast, setToast]         = useState('');
  const [showHistory, setShowHistory] = useState(false);
  const [bidError, setBidError]   = useState('');

  const highestBid = state.bids.length
    ? Math.max(...state.bids.map(b => b.amount))
    : startPrice;
  const minNext = highestBid + STEP;
  const ended   = timeLeft.total <= 0;

  /* ── persist ── */
  useEffect(() => {
    try { localStorage.setItem(bidStorageKey, JSON.stringify(state)); } catch {}
  }, [state, bidStorageKey]);

  /* ── countdown tick ── */
  useEffect(() => {
    if (ended) return;
    const id = setInterval(() => setTimeLeft(calcTimeLeft(endMs)), 1000);
    return () => clearInterval(id);
  }, [endMs, ended]);

  /* ── flash helper ── */
  const triggerFlash = () => {
    setFlash(true);
    setTimeout(() => setFlash(false), 700);
  };

  /* ── place bid ── */
  const placeBid = useCallback((amount) => {
    const val = Number(amount);
    if (!val || val < minNext) {
      setBidError(t.tooLow);
      setTimeout(() => setBidError(''), 2000);
      return;
    }
    const newBid = {
      id:     Date.now(),
      user:   t.you,
      avatar: '⭐',
      amount: val,
      ts:     Date.now(),
      isMe:   true,
    };
    setState(prev => ({
      bids:  [...prev.bids, newBid],
      myBid: val,
    }));
    setCustomBid('');
    setToast(t.bidPlaced);
    triggerFlash();
    setTimeout(() => setToast(''), 2500);
  }, [minNext, t]);

  /* ── winner ── */
  const winner = ended && state.bids.length
    ? state.bids.find(b => b.amount === highestBid)
    : null;

  /* ─── Render ─────────────────────────────────────────────────────────────── */
  return (
    <div
      dir={rtl ? 'rtl' : 'ltr'}
      style={{ fontFamily: rtl ? "'Cairo', 'Tajawal', sans-serif" : 'inherit' }}
      className={`relative rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50
        shadow-lg overflow-hidden select-none ${className}`}
    >
      {/* Flash overlay */}
      {flash && (
        <div className="absolute inset-0 bg-amber-400/20 pointer-events-none z-10 animate-pulse rounded-2xl" />
      )}

      {/* Toast */}
      {toast && (
        <div className="absolute top-3 left-1/2 -translate-x-1/2 z-20 bg-emerald-600 text-white text-xs font-bold
          px-4 py-1.5 rounded-full shadow-lg whitespace-nowrap">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-r from-amber-500 to-orange-500">
        <span className="text-xl">🔨</span>
        <h3 className="text-white font-extrabold text-sm tracking-wide">{t.title}</h3>
        <span className={`${rtl ? 'mr-auto' : 'ml-auto'} flex items-center gap-1`}>
          <span className={`w-2 h-2 rounded-full ${ended ? 'bg-gray-300' : 'bg-green-300 animate-pulse'}`} />
          <span className="text-white/80 text-xs">{ended ? t.ended : 'LIVE'}</span>
        </span>
      </div>

      <div className="px-4 py-4 space-y-4">

        {/* Current Bid */}
        <div className="text-center">
          <p className="text-xs text-gray-500 mb-0.5">{t.currentBid}</p>
          <p className={`text-4xl font-black ${flash ? 'text-amber-600' : 'text-gray-900'} transition-colors duration-300`}>
            {t.currency[currency]}{toAI(highestBid.toLocaleString(), lang)}
          </p>
          <p className="text-xs text-gray-400 mt-0.5">
            {toAI(state.bids.length, lang)} {t.bidders}
          </p>
        </div>

        {/* Countdown */}
        {!ended ? (
          <div className="grid grid-cols-4 gap-2">
            {[
              [timeLeft.days,  t.days],
              [timeLeft.hours, t.hours],
              [timeLeft.mins,  t.mins],
              [timeLeft.secs,  t.secs],
            ].map(([val, label]) => (
              <div key={label} className="flex flex-col items-center bg-amber-100 rounded-xl py-2">
                <span className="text-xl font-black text-amber-800">{toAI(pad(val), lang)}</span>
                <span className="text-[10px] text-amber-600">{label}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-2 bg-gray-100 rounded-xl">
            <p className="text-gray-600 font-bold text-sm">{t.ended}</p>
            {winner && (
              <p className="text-xs text-gray-500 mt-1">
                {t.winner}: <span className="font-bold text-amber-600">{winner.user}</span>
                {' — '}{t.currency[currency]}{toAI(winner.amount.toLocaleString(), lang)}
              </p>
            )}
          </div>
        )}

        {/* Quick Bid Buttons */}
        {!ended && (
          <div>
            <p className="text-xs text-gray-500 mb-2 font-semibold">{t.quickBid}</p>
            <div className="flex gap-2 flex-wrap">
              {[STEP, STEP * 2, STEP * 5].map(inc => (
                <button
                  key={inc}
                  onClick={() => placeBid(minNext + inc - STEP)}
                  className="flex-1 min-w-[70px] text-xs font-bold py-2 rounded-xl bg-amber-500 hover:bg-amber-600
                    active:scale-95 text-white transition-all shadow-sm"
                >
                  +{toAI(inc, lang)} {t.currency[currency]}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Custom Bid Input */}
        {!ended && (
          <div>
            <p className="text-xs text-gray-500 mb-1 font-semibold">
              {t.yourBid} — {t.minBid}: {t.currency[currency]}{toAI(minNext, lang)}
            </p>
            <div className="flex gap-2">
              <input
                type="number"
                min={minNext}
                step={STEP}
                value={customBid}
                onChange={e => { setCustomBid(e.target.value); setBidError(''); }}
                placeholder={`${minNext}+`}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none
                  focus:ring-2 focus:ring-amber-400 bg-white text-gray-800"
              />
              <button
                onClick={() => placeBid(customBid)}
                className="px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 active:scale-95
                  text-white text-sm font-bold transition-all shadow"
              >
                {t.placeBid}
              </button>
            </div>
            {bidError && (
              <p className="text-rose-500 text-xs mt-1 font-semibold">{bidError}</p>
            )}
          </div>
        )}

        {/* Bid History Toggle */}
        <button
          onClick={() => setShowHistory(h => !h)}
          className="w-full text-xs text-amber-700 font-semibold py-1.5 rounded-xl border border-amber-200
            hover:bg-amber-50 transition-colors"
        >
          {showHistory ? t.hideHistory : t.history} ({toAI(state.bids.length, lang)})
        </button>

        {/* Bid History List */}
        {showHistory && (
          <div className="max-h-48 overflow-y-auto space-y-2 pr-1">
            {state.bids.length === 0 ? (
              <p className="text-center text-xs text-gray-400 py-3">{t.noBids}</p>
            ) : (
              [...state.bids].reverse().map(bid => (
                <div
                  key={bid.id}
                  className={`flex items-center gap-3 px-3 py-2 rounded-xl text-xs
                    ${bid.isMe ? 'bg-amber-100 border border-amber-300' : 'bg-gray-50'}`}
                >
                  <span className="text-lg">{bid.avatar}</span>
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-gray-800 truncate">
                      {bid.isMe ? `⭐ ${bid.user}` : bid.user}
                    </p>
                    <p className="text-gray-400">{relTime(bid.ts, lang)}</p>
                  </div>
                  <p className="font-extrabold text-amber-700 whitespace-nowrap">
                    {t.currency[currency]}{toAI(bid.amount.toLocaleString(), lang)}
                  </p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
