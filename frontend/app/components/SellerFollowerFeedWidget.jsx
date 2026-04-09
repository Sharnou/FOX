'use client';
/**
 * SellerFollowerFeedWidget.jsx
 * XTOX Marketplace — Feed of new listings from followed sellers
 * RTL-first, Cairo/Tajawal, Tailwind only, zero deps
 * Props:
 *   followedSellers: Array<{ id, name, nameAr, city, cityAr, avatar, country }>
 *   feedItems: Array<{ id, sellerId, sellerName, sellerNameAr, sellerCity, sellerCityAr,
 *                       title, titleAr, price, currency, category, categoryAr, image,
 *                       createdAt (ISO), isNew }>
 *   lang: 'ar'|'en'|'de'
 *   currency: 'EGP'|'SAR'|'AED'|'USD'
 *   onViewAd: (adId) => void
 *   onUnfollow: (sellerId) => void
 *   className: string
 */
import { useState, useMemo, useCallback } from 'react';

const LABELS = {
  ar: {
    title: 'تحديثات البائعين المتابَعين',
    subtitle: 'أحدث إعلانات البائعين الذين تتابعهم',
    all: 'الكل',
    noFollowing: 'لا تتابع أي بائع حتى الآن',
    noItems: 'لا توجد إعلانات جديدة من البائعين المتابَعين',
    viewAd: 'عرض الإعلان',
    unfollow: 'إلغاء المتابعة',
    markRead: 'تحديد كمقروء',
    markAllRead: 'تحديد الكل كمقروء',
    newBadge: 'جديد',
    following: 'تتابع',
    sellers: 'بائع',
    filterBySeller: 'فلتر بالبائع',
    justNow: 'الآن',
    minutesAgo: 'د',
    hoursAgo: 'س',
    daysAgo: 'ي',
    price: 'السعر',
    useArabicNumerals: 'أرقام عربية',
    useLatinNumerals: 'أرقام إنجليزية',
  },
  en: {
    title: 'Followed Sellers Feed',
    subtitle: 'Latest listings from sellers you follow',
    all: 'All',
    noFollowing: "You're not following any sellers yet",
    noItems: 'No new listings from followed sellers',
    viewAd: 'View Ad',
    unfollow: 'Unfollow',
    markRead: 'Mark as read',
    markAllRead: 'Mark all as read',
    newBadge: 'New',
    following: 'Following',
    sellers: 'sellers',
    filterBySeller: 'Filter by seller',
    justNow: 'Just now',
    minutesAgo: 'm',
    hoursAgo: 'h',
    daysAgo: 'd',
    price: 'Price',
    useArabicNumerals: 'Arabic numerals',
    useLatinNumerals: 'Latin numerals',
  },
  de: {
    title: 'Feed gefolgter Verkäufer',
    subtitle: 'Neueste Anzeigen von verfolgten Verkäufern',
    all: 'Alle',
    noFollowing: 'Sie folgen noch keinem Verkäufer',
    noItems: 'Keine neuen Anzeigen von gefolgten Verkäufern',
    viewAd: 'Anzeige ansehen',
    unfollow: 'Entfolgen',
    markRead: 'Als gelesen markieren',
    markAllRead: 'Alle als gelesen markieren',
    newBadge: 'Neu',
    following: 'Folgend',
    sellers: 'Verkäufer',
    filterBySeller: 'Nach Verkäufer filtern',
    justNow: 'Gerade',
    minutesAgo: 'min',
    hoursAgo: 'Std',
    daysAgo: 'T',
    price: 'Preis',
    useArabicNumerals: 'Arabische Ziffern',
    useLatinNumerals: 'Lateinische Ziffern',
  },
};

const CURRENCY_SYMBOLS = { EGP: 'ج.م', SAR: 'ر.س', AED: 'د.إ', USD: '$' };

function toArabicNumerals(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

function formatNumber(n, useAr) {
  const formatted = Number(n).toLocaleString('en');
  return useAr ? toArabicNumerals(formatted) : formatted;
}

function timeAgo(iso, lang, useAr) {
  const L = LABELS[lang];
  const diff = Math.floor((Date.now() - new Date(iso).getTime()) / 1000);
  let str;
  if (diff < 60) str = L.justNow;
  else if (diff < 3600) str = `${formatNumber(Math.floor(diff / 60), useAr)}${L.minutesAgo}`;
  else if (diff < 86400) str = `${formatNumber(Math.floor(diff / 3600), useAr)}${L.hoursAgo}`;
  else str = `${formatNumber(Math.floor(diff / 86400), useAr)}${L.daysAgo}`;
  return str;
}

const MOCK_SELLERS = [
  { id: 's1', name: 'Ahmed Hassan', nameAr: 'أحمد حسن', city: 'Cairo', cityAr: 'القاهرة', avatar: null, country: 'EG' },
  { id: 's2', name: 'Mohammed Al-Rashid', nameAr: 'محمد الراشد', city: 'Riyadh', cityAr: 'الرياض', avatar: null, country: 'SA' },
  { id: 's3', name: 'Fatima Al-Zahra', nameAr: 'فاطمة الزهراء', city: 'Dubai', cityAr: 'دبي', avatar: null, country: 'AE' },
];

const MOCK_FEED = [
  { id: 'a1', sellerId: 's1', sellerNameAr: 'أحمد حسن', sellerCityAr: 'القاهرة', titleAr: 'لابتوب ديل للبيع بحالة ممتازة', price: 8500, currency: 'EGP', categoryAr: 'إلكترونيات', image: null, createdAt: new Date(Date.now() - 1800000).toISOString(), isNew: true },
  { id: 'a2', sellerId: 's2', sellerNameAr: 'محمد الراشد', sellerCityAr: 'الرياض', titleAr: 'سيارة كامري 2022 للبيع', price: 85000, currency: 'SAR', categoryAr: 'سيارات', image: null, createdAt: new Date(Date.now() - 7200000).toISOString(), isNew: true },
  { id: 'a3', sellerId: 's3', sellerNameAr: 'فاطمة الزهراء', sellerCityAr: 'دبي', titleAr: 'فستان سواريه للبيع', price: 450, currency: 'AED', categoryAr: 'أزياء', image: null, createdAt: new Date(Date.now() - 86400000).toISOString(), isNew: false },
  { id: 'a4', sellerId: 's1', sellerNameAr: 'أحمد حسن', sellerCityAr: 'القاهرة', titleAr: 'هاتف آيفون 14 برو', price: 22000, currency: 'EGP', categoryAr: 'إلكترونيات', image: null, createdAt: new Date(Date.now() - 172800000).toISOString(), isNew: false },
];

export default function SellerFollowerFeedWidget({
  followedSellers = MOCK_SELLERS,
  feedItems = MOCK_FEED,
  lang: initialLang = 'ar',
  currency = 'EGP',
  onViewAd,
  onUnfollow,
  className = '',
}) {
  const [lang, setLang] = useState(initialLang);
  const [useArabicNumerals, setUseArabicNumerals] = useState(lang === 'ar');
  const [selectedSeller, setSelectedSeller] = useState('all');
  const [readIds, setReadIds] = useState(new Set());
  const isRTL = lang === 'ar';
  const L = LABELS[lang];

  const filteredFeed = useMemo(() => {
    if (selectedSeller === 'all') return feedItems;
    return feedItems.filter(item => item.sellerId === selectedSeller);
  }, [feedItems, selectedSeller]);

  const unreadCount = useMemo(
    () => filteredFeed.filter(i => i.isNew && !readIds.has(i.id)).length,
    [filteredFeed, readIds]
  );

  const markRead = useCallback((id) => {
    setReadIds(prev => new Set([...prev, id]));
  }, []);

  const markAllRead = useCallback(() => {
    setReadIds(new Set(filteredFeed.map(i => i.id)));
  }, [filteredFeed]);

  const avatarInitials = (seller) => {
    const name = lang === 'ar' ? seller.nameAr : seller.name;
    return name ? name[0] : '?';
  };

  const flagEmoji = (country) => {
    if (!country || country.length !== 2) return '';
    return String.fromCodePoint(...[...country.toUpperCase()].map(c => 0x1F1E0 + c.charCodeAt(0) - 65));
  };

  return (
    <div
      dir={isRTL ? 'rtl' : 'ltr'}
      className={`bg-white rounded-2xl shadow-lg overflow-hidden font-[Cairo,Tajawal,sans-serif] ${className}`}
      style={{ fontFamily: "'Cairo', 'Tajawal', sans-serif" }}
    >
      {/* Header */}
      <div className="bg-gradient-to-r from-emerald-600 to-teal-500 px-5 py-4">
        <div className="flex items-center justify-between flex-wrap gap-2">
          <div>
            <h2 className="text-white font-bold text-lg leading-tight">{L.title}</h2>
            <p className="text-emerald-100 text-xs mt-0.5">{L.subtitle}</p>
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <span className="bg-red-500 text-white text-xs font-bold px-2 py-0.5 rounded-full">
                {formatNumber(unreadCount, useArabicNumerals)}
              </span>
            )}
            <span className="bg-white/20 text-white text-xs px-2 py-1 rounded-full">
              {formatNumber(followedSellers.length, useArabicNumerals)} {L.sellers}
            </span>
          </div>
        </div>

        {/* Language + Numeral toggles */}
        <div className="flex flex-wrap gap-2 mt-3">
          {['ar', 'en', 'de'].map(l => (
            <button
              key={l}
              onClick={() => { setLang(l); setUseArabicNumerals(l === 'ar'); }}
              className={`text-xs px-2 py-1 rounded-full transition-all ${lang === l ? 'bg-white text-emerald-700 font-bold' : 'bg-white/20 text-white hover:bg-white/30'}`}
            >
              {l === 'ar' ? 'عربي' : l === 'en' ? 'EN' : 'DE'}
            </button>
          ))}
          <button
            onClick={() => setUseArabicNumerals(p => !p)}
            className="text-xs px-2 py-1 rounded-full bg-white/20 text-white hover:bg-white/30 transition-all"
          >
            {useArabicNumerals ? L.useLatinNumerals : L.useArabicNumerals}
          </button>
        </div>
      </div>

      {/* Following avatars row */}
      {followedSellers.length > 0 && (
        <div className="px-4 py-3 bg-emerald-50 border-b border-emerald-100">
          <p className="text-xs text-emerald-700 font-semibold mb-2">{L.following}</p>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setSelectedSeller('all')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedSeller === 'all' ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'}`}
            >
              {L.all}
            </button>
            {followedSellers.map(seller => (
              <button
                key={seller.id}
                onClick={() => setSelectedSeller(prev => prev === seller.id ? 'all' : seller.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all ${selectedSeller === seller.id ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-gray-700 border-gray-200 hover:border-emerald-400'}`}
              >
                <span className="w-5 h-5 rounded-full bg-emerald-200 text-emerald-800 flex items-center justify-center font-bold text-xs flex-shrink-0">
                  {seller.avatar ? (
                    <img src={seller.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                  ) : avatarInitials(seller)}
                </span>
                <span>{lang === 'ar' ? seller.nameAr : seller.name}</span>
                <span>{flagEmoji(seller.country)}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Actions bar */}
      {filteredFeed.length > 0 && (
        <div className="px-4 py-2 border-b border-gray-100 flex items-center justify-end">
          <button
            onClick={markAllRead}
            className="text-xs text-emerald-600 hover:text-emerald-800 font-medium transition-colors"
          >
            ✓ {L.markAllRead}
          </button>
        </div>
      )}

      {/* Feed Items */}
      <div className="divide-y divide-gray-100 max-h-[480px] overflow-y-auto">
        {followedSellers.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">👥</div>
            <p className="text-sm">{L.noFollowing}</p>
          </div>
        ) : filteredFeed.length === 0 ? (
          <div className="py-12 text-center text-gray-400">
            <div className="text-4xl mb-3">📭</div>
            <p className="text-sm">{L.noItems}</p>
          </div>
        ) : (
          filteredFeed.map(item => {
            const isUnread = item.isNew && !readIds.has(item.id);
            return (
              <div
                key={item.id}
                className={`flex gap-3 px-4 py-3 hover:bg-gray-50 transition-colors ${isUnread ? 'bg-emerald-50/40' : ''}`}
              >
                {/* Thumbnail */}
                <div className="w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 bg-gray-100 flex items-center justify-center">
                  {item.image ? (
                    <img src={item.image} alt="" className="w-full h-full object-cover" />
                  ) : (
                    <span className="text-2xl">🛒</span>
                  )}
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5 flex-wrap">
                        {isUnread && (
                          <span className="bg-emerald-500 text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full leading-none">
                            {L.newBadge}
                          </span>
                        )}
                        <span className="text-[10px] text-gray-400 bg-gray-100 px-1.5 py-0.5 rounded-full">
                          {lang === 'ar' ? item.categoryAr : item.category || item.categoryAr}
                        </span>
                      </div>
                      <p className="text-sm font-semibold text-gray-800 mt-0.5 truncate">
                        {lang === 'ar' ? item.titleAr : item.title || item.titleAr}
                      </p>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {lang === 'ar' ? item.sellerNameAr : item.sellerName || item.sellerNameAr}
                        {' · '}
                        {lang === 'ar' ? item.sellerCityAr : item.sellerCity || item.sellerCityAr}
                      </p>
                    </div>
                    <div className={`text-${isRTL ? 'left' : 'right'} flex-shrink-0`}>
                      <p className="text-sm font-bold text-emerald-700">
                        {formatNumber(item.price, useArabicNumerals)}
                        {' '}
                        {CURRENCY_SYMBOLS[item.currency] || item.currency}
                      </p>
                      <p className="text-[10px] text-gray-400 mt-0.5">
                        {timeAgo(item.createdAt, lang, useArabicNumerals)}
                      </p>
                    </div>
                  </div>

                  {/* Action buttons */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <button
                      onClick={() => onViewAd ? onViewAd(item.id) : null}
                      className="text-xs bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1 rounded-full transition-colors font-medium"
                    >
                      {L.viewAd}
                    </button>
                    {isUnread && (
                      <button
                        onClick={() => markRead(item.id)}
                        className="text-xs text-gray-500 hover:text-emerald-600 transition-colors"
                      >
                        ✓ {L.markRead}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer: unfollow list */}
      {followedSellers.length > 0 && (
        <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
          <p className="text-[10px] text-gray-400 text-center">
            {formatNumber(followedSellers.length, useArabicNumerals)} {L.sellers} · {L.following}
          </p>
        </div>
      )}
    </div>
  );
}
