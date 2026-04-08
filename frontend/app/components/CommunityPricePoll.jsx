'use client';
import { useState, useEffect } from 'react';

// Arabic-Indic numeral converter
const toArabicIndic = (n) =>
  String(n).replace(/\d/g, (d) => '٠١٢٣٤٥٦٧٨٩'[d]);

const LABELS = {
  ar: {
    title: '🗳️ رأي المجتمع في السعر',
    fair: 'سعر مناسب',
    high: 'سعر مرتفع',
    low: 'سعر منخفض',
    vote: 'صوّت الآن',
    voted: 'شكراً لمشاركتك!',
    totalVotes: 'إجمالي الأصوات',
    change: 'تغيير رأيي',
    fair_emoji: '✅',
    high_emoji: '📈',
    low_emoji: '📉',
    consensus: {
      fair: 'يرى المجتمع أن السعر مناسب',
      high: 'يرى المجتمع أن السعر مرتفع',
      low: 'يرى المجتمع أن السعر منخفض',
    },
  },
  en: {
    title: '🗳️ Community Price Opinion',
    fair: 'Fair Price',
    high: 'Too High',
    low: 'Too Low',
    vote: 'Vote Now',
    voted: 'Thanks for voting!',
    totalVotes: 'Total Votes',
    change: 'Change my vote',
    fair_emoji: '✅',
    high_emoji: '📈',
    low_emoji: '📉',
    consensus: {
      fair: 'Community says: Fair price',
      high: 'Community says: Too high',
      low: 'Community says: Too low',
    },
  },
  de: {
    title: '🗳️ Community-Preisbewertung',
    fair: 'Fairer Preis',
    high: 'Zu hoch',
    low: 'Zu niedrig',
    vote: 'Abstimmen',
    voted: 'Danke für Ihre Stimme!',
    totalVotes: 'Gesamtstimmen',
    change: 'Stimme ändern',
    fair_emoji: '✅',
    high_emoji: '📈',
    low_emoji: '📉',
    consensus: {
      fair: 'Community sagt: Fairer Preis',
      high: 'Community sagt: Zu hoch',
      low: 'Community sagt: Zu niedrig',
    },
  },
};

const VOTE_COLORS = {
  fair: { bar: 'bg-emerald-500', text: 'text-emerald-700', ring: 'ring-emerald-400', bg: 'bg-emerald-50 hover:bg-emerald-100 active:bg-emerald-200' },
  high: { bar: 'bg-rose-500', text: 'text-rose-700', ring: 'ring-rose-400', bg: 'bg-rose-50 hover:bg-rose-100 active:bg-rose-200' },
  low:  { bar: 'bg-amber-500', text: 'text-amber-700', ring: 'ring-amber-400', bg: 'bg-amber-50 hover:bg-amber-100 active:bg-amber-200' },
};

// Seed data: randomized base votes per adId to give social proof feel
const seedVotes = (adId) => {
  let hash = 0;
  for (let i = 0; i < adId.length; i++) hash = (hash * 31 + adId.charCodeAt(i)) >>> 0;
  const fair = 40 + (hash % 40);
  const high = 10 + ((hash >> 4) % 30);
  const low  = 5  + ((hash >> 8) % 15);
  return { fair, high, low };
};

export default function CommunityPricePoll({ adId = 'default', price, currency = 'EGP', lang = 'ar', className = '' }) {
  const L = LABELS[lang] || LABELS.ar;
  const isRTL = lang === 'ar';
  const storageKey = `xtox_price_poll_${adId}`;

  const [votes, setVotes] = useState({ fair: 0, high: 0, low: 0 });
  const [userVote, setUserVote] = useState(null); // 'fair' | 'high' | 'low' | null
  const [showResults, setShowResults] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    try {
      const stored = JSON.parse(localStorage.getItem(storageKey) || 'null');
      const base = seedVotes(adId);
      if (stored) {
        // Merge: base + any stored deltas
        setVotes({
          fair: base.fair + (stored.delta?.fair || 0),
          high: base.high + (stored.delta?.high || 0),
          low:  base.low  + (stored.delta?.low  || 0),
        });
        setUserVote(stored.vote || null);
        setShowResults(true);
      } else {
        setVotes(base);
      }
    } catch {
      setVotes(seedVotes(adId));
    }
  }, [adId]);

  const totalVotes = votes.fair + votes.high + votes.low;

  const pct = (key) => totalVotes === 0 ? 0 : Math.round((votes[key] / totalVotes) * 100);

  const consensus = () => {
    const f = pct('fair'), h = pct('high'), l = pct('low');
    if (f >= h && f >= l) return 'fair';
    if (h >= f && h >= l) return 'high';
    return 'low';
  };

  const handleVote = (choice) => {
    if (animating) return;
    setAnimating(true);

    setVotes((prev) => {
      const next = { ...prev };
      // Remove previous vote if changing
      if (userVote && userVote !== choice) next[userVote] = Math.max(0, next[userVote] - 1);
      if (userVote !== choice) next[choice] = next[choice] + 1;
      return next;
    });

    const base = seedVotes(adId);
    // Calculate delta relative to base for storage
    setTimeout(() => {
      setVotes((current) => {
        try {
          localStorage.setItem(storageKey, JSON.stringify({
            vote: choice,
            delta: {
              fair: current.fair - base.fair,
              high: current.high - base.high,
              low:  current.low  - base.low,
            },
          }));
        } catch {}
        return current;
      });
      setUserVote(choice);
      setShowResults(true);
      setAnimating(false);
    }, 400);
  };

  const handleChange = () => {
    setShowResults(false);
    setUserVote(null);
    try { localStorage.removeItem(storageKey); } catch {}
    setVotes(seedVotes(adId));
  };

  const numFmt = (n) => lang === 'ar' ? toArabicIndic(n) : String(n);

  if (!mounted) return null;

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`font-[Cairo,Tajawal,sans-serif] bg-white rounded-2xl border border-gray-200 shadow-sm p-5 ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Title */}
      <div className="flex items-center gap-2 mb-4">
        <h3 className="text-base font-bold text-gray-800">{L.title}</h3>
        {price && (
          <span className="ms-auto text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-full">
            {numFmt(price)} {currency}
          </span>
        )}
      </div>

      {!showResults ? (
        /* ── Voting Panel ── */
        <div className="space-y-2">
          <p className="text-xs text-gray-500 mb-3">
            {lang === 'ar' ? 'ما رأيك في سعر هذا الإعلان؟' : lang === 'de' ? 'Was denken Sie über diesen Preis?' : 'What do you think about this price?'}
          </p>
          {['fair', 'high', 'low'].map((choice) => (
            <button
              key={choice}
              onClick={() => handleVote(choice)}
              disabled={animating}
              className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl border-2 transition-all duration-200 text-sm font-semibold
                ${VOTE_COLORS[choice].bg}
                ${animating ? 'opacity-60 cursor-not-allowed' : 'cursor-pointer'}
                border-transparent ${animating ? '' : `hover:ring-2 ${VOTE_COLORS[choice].ring} hover:ring-offset-1`}
              `}
            >
              <span className="text-lg">{L[`${choice}_emoji`]}</span>
              <span className={VOTE_COLORS[choice].text}>{L[choice]}</span>
            </button>
          ))}
        </div>
      ) : (
        /* ── Results Panel ── */
        <div className="space-y-3">
          {/* Consensus banner */}
          <div className={`text-xs font-bold px-3 py-2 rounded-lg ${VOTE_COLORS[consensus()].text} ${VOTE_COLORS[consensus()].bg.split(' ')[0]}`}>
            {L.consensus[consensus()]}
          </div>

          {['fair', 'high', 'low'].map((key) => {
            const p = pct(key);
            const isChosen = userVote === key;
            return (
              <div key={key} className="space-y-1">
                <div className="flex items-center justify-between text-xs">
                  <span className={`font-semibold flex items-center gap-1 ${isChosen ? VOTE_COLORS[key].text : 'text-gray-600'}`}>
                    {L[`${key}_emoji`]} {L[key]}
                    {isChosen && <span className="text-[10px] bg-gray-200 text-gray-600 rounded px-1">{lang === 'ar' ? 'صوتك' : lang === 'de' ? 'Deine Stimme' : 'Your vote'}</span>}
                  </span>
                  <span className={`font-bold ${isChosen ? VOTE_COLORS[key].text : 'text-gray-500'}`}>
                    {numFmt(p)}{lang === 'ar' ? '٪' : '%'}
                  </span>
                </div>
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div
                    className={`h-full ${VOTE_COLORS[key].bar} rounded-full transition-all duration-700`}
                    style={{ width: `${p}%` }}
                  />
                </div>
              </div>
            );
          })}

          {/* Total votes */}
          <p className="text-xs text-gray-400 pt-1">
            {L.totalVotes}: {numFmt(totalVotes)} {lang === 'ar' ? 'صوت' : lang === 'de' ? 'Stimmen' : 'votes'}
          </p>

          {/* Voted confirmation */}
          {userVote && (
            <div className="flex items-center justify-between pt-1">
              <span className="text-xs text-emerald-600 font-semibold">✓ {L.voted}</span>
              <button
                onClick={handleChange}
                className="text-xs text-indigo-500 hover:text-indigo-700 underline"
              >
                {L.change}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
