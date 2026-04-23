'use client';

import { getCategoryLabel, getSubcategoryLabel, detectUserLang } from '@/lib/categoryTranslations';
import { getAdDefaultImage } from '@/lib/categoryImages';

// Legacy CATEGORY_DISPLAY map — kept for backward compatibility
// New code should use getCategoryLabel(categoryId, lang) from categoryTranslations
const CATEGORY_DISPLAY = {
  electronics: { name: 'إلكترونيات', emoji: '📱' },
  cars: { name: 'سيارات', emoji: '🚗' },
  real_estate: { name: 'عقارات', emoji: '🏠' },
  fashion: { name: 'أزياء', emoji: '👗' },
  furniture: { name: 'أثاث ومنزل', emoji: '🛋️' },
  services: { name: 'خدمات', emoji: '🔧' },
  jobs: { name: 'وظائف', emoji: '💼' },
  pets: { name: 'حيوانات', emoji: '🐾' },
  sports: { name: 'رياضة', emoji: '⚽' },
  kids: { name: 'أطفال', emoji: '👶' },
  hobbies: { name: 'هوايات', emoji: '🎨' },
  agriculture: { name: 'زراعة', emoji: '🌾' },
  food: { name: 'أكل وشرب', emoji: '🍕' },
  tools: { name: 'أدوات', emoji: '🔨' },
  general: { name: 'متفرقات', emoji: '📦' },
};


import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import AIQualityBadge from './AIQualityBadge';
import { useLanguage } from '../context/LanguageContext';

// Auto-optimize Cloudinary images — free (f_auto=best format, q_auto=best quality, w_400=resize)
// Fix D: Added null guard — prevents src={undefined} when url is falsy
function optimizeImage(url, width) {
  var w = width || 400;
  if (!url || typeof url !== 'string') return '/no-image.svg';
  if (!url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', '/upload/f_auto,q_auto,w_' + w + ',c_limit/');
}

// Convert Western numerals to Arabic-Indic numerals for RTL UI
function toArabicNumerals(n) {
  return String(n).replace(/\d/g, d => '٠١٢٣٤٥٦٧٨٩'[d]);
}

// ── Run 107: Ad Expiry Countdown — helper ─────────────────────────────────
function getDaysLeft(createdAt) {
  if (!createdAt) return null;
  const created = new Date(createdAt);
  const expiry = new Date(created.getTime() + 30 * 24 * 60 * 60 * 1000);
  const now = new Date();
  const diff = Math.ceil((expiry - now) / (1000 * 60 * 60 * 24));
  return diff;
}
// ──────────────────────────────────────────────────────────────────────────

// #128 — Dynamic seller trust badge based on sellerScore
function SellerTrustBadge({ ad }) {
  const sellerScore = ad?.sellerScore || ad?.seller?.sellerScore || ad?.userId?.sellerScore || 0;
  const badge = sellerScore >= 70
    ? { label: '✓ بائع موثوق', bg: '#dcfce7', color: '#166534' }
    : sellerScore >= 40
    ? { label: '◑ بائع نشط', bg: '#fef9c3', color: '#854d0e' }
    : { label: '⚠ بائع جديد', bg: '#fee2e2', color: '#991b1b' };
  return (
    <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 8, background: badge.bg, color: badge.color }}>
      {badge.label}
    </span>
  );
}

function StarRating({ rating, count }) {
  if (rating === null || rating === undefined) {
    // StarRating will return null — SellerTrustBadge handles the no-rating case
    return null;
  }
  const filled = Math.round(rating);
  return (
    <span
      className="text-xs inline-flex items-center gap-0.5"
      title={rating + '/5'}
      dir="rtl"
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={i < filled ? 'text-yellow-400' : 'text-gray-300'}
        >
          {i < filled ? '★' : '☆'}
        </span>
      ))}
      {count != null && (
        <span className="text-gray-400 ms-1 text-xs">({toArabicNumerals(count)})</span>
      )}
    </span>
  );
}

const CONDITION_MAP = {
  new:       { ar: 'جديد', bg: '#dcfce7', color: '#15803d', icon: '✨' },
  excellent: { ar: 'ممتاز', bg: '#dbeafe', color: '#1d4ed8', icon: '⭐' },
  used:      { ar: 'مستعمل', bg: '#fef9c3', color: '#92400e', icon: '🔄' },
  rent:      { ar: 'للإيجار', bg: '#ede9fe', color: '#6d28d9', icon: '🔑' },
};

function ConditionBadge({ condition }) {
  if (!condition || !CONDITION_MAP[condition]) return null;
  const { ar, bg, color, icon } = CONDITION_MAP[condition];
  return (
    <span
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 3,
        padding: '2px 7px',
        borderRadius: 8,
        background: bg,
        color,
        fontSize: 11,
        fontWeight: 700,
        lineHeight: 1.5,
      }}
      aria-label={'حالة المنتج: ' + ar}
    >
      {icon} {ar}
    </span>
  );
}


// ── #125 — Subcategory-themed card designs ─────────────────────────────────
// Keys match actual DB values (English autodetect + Arabic frontend submissions)
const SUBCAT_THEMES = {
  // Electronics — English keys (from auto-detect)
  'mobile':        { accent: '#3b82f6', glow: 'rgba(59,130,246,0.5)',   icon: '📱', bg: 'from-blue-950/30' },
  'laptop':        { accent: '#6366f1', glow: 'rgba(99,102,241,0.5)',   icon: '💻', bg: 'from-indigo-950/30' },
  'tablet':        { accent: '#8b5cf6', glow: 'rgba(139,92,246,0.5)',   icon: '📟', bg: 'from-violet-950/30' },
  'camera':        { accent: '#f59e0b', glow: 'rgba(245,158,11,0.5)',   icon: '📷', bg: 'from-amber-950/30' },
  'tv':            { accent: '#10b981', glow: 'rgba(16,185,129,0.5)',   icon: '📺', bg: 'from-emerald-950/30' },
  // Electronics — Arabic keys (from frontend)
  'موبايل':        { accent: '#3b82f6', glow: 'rgba(59,130,246,0.5)',   icon: '📱', bg: 'from-blue-950/30' },
  'لابتوب':        { accent: '#6366f1', glow: 'rgba(99,102,241,0.5)',   icon: '💻', bg: 'from-indigo-950/30' },
  'تابلت':         { accent: '#8b5cf6', glow: 'rgba(139,92,246,0.5)',   icon: '📟', bg: 'from-violet-950/30' },
  'كاميرا':        { accent: '#f59e0b', glow: 'rgba(245,158,11,0.5)',   icon: '📷', bg: 'from-amber-950/30' },
  'تلفزيون':       { accent: '#10b981', glow: 'rgba(16,185,129,0.5)',   icon: '📺', bg: 'from-emerald-950/30' },
  // Cars & Vehicles — English
  'car':           { accent: '#ef4444', glow: 'rgba(239,68,68,0.5)',    icon: '🚗', bg: 'from-red-950/30' },
  'motorcycle':    { accent: '#f97316', glow: 'rgba(249,115,22,0.5)',   icon: '🏍', bg: 'from-orange-950/30' },
  'truck':         { accent: '#78716c', glow: 'rgba(120,113,108,0.5)',  icon: '🚚', bg: 'from-stone-950/30' },
  // Cars & Vehicles — Arabic
  'ملاكي':         { accent: '#ef4444', glow: 'rgba(239,68,68,0.5)',    icon: '🚗', bg: 'from-red-950/30' },
  'دراجات':        { accent: '#f97316', glow: 'rgba(249,115,22,0.5)',   icon: '🏍', bg: 'from-orange-950/30' },
  'تجاري':         { accent: '#78716c', glow: 'rgba(120,113,108,0.5)',  icon: '🚚', bg: 'from-stone-950/30' },
  // Real Estate — English
  'apartment':     { accent: '#0ea5e9', glow: 'rgba(14,165,233,0.5)',   icon: '🏠', bg: 'from-sky-950/30' },
  'villa':         { accent: '#d97706', glow: 'rgba(217,119,6,0.5)',    icon: '🏡', bg: 'from-yellow-950/30' },
  'land':          { accent: '#84cc16', glow: 'rgba(132,204,22,0.5)',   icon: '🌍', bg: 'from-lime-950/30' },
  // Real Estate — Arabic
  'شقق':           { accent: '#0ea5e9', glow: 'rgba(14,165,233,0.5)',   icon: '🏠', bg: 'from-sky-950/30' },
  'شقة':           { accent: '#0ea5e9', glow: 'rgba(14,165,233,0.5)',   icon: '🏠', bg: 'from-sky-950/30' },
  'فيلا':          { accent: '#d97706', glow: 'rgba(217,119,6,0.5)',    icon: '🏡', bg: 'from-yellow-950/30' },
  'أراضي':         { accent: '#84cc16', glow: 'rgba(132,204,22,0.5)',   icon: '🌍', bg: 'from-lime-950/30' },
  'أرض':           { accent: '#84cc16', glow: 'rgba(132,204,22,0.5)',   icon: '🌍', bg: 'from-lime-950/30' },
  // Fashion — English + Arabic
  'clothes':       { accent: '#ec4899', glow: 'rgba(236,72,153,0.5)',   icon: '👗', bg: 'from-pink-950/30' },
  'shoes':         { accent: '#f43f5e', glow: 'rgba(244,63,94,0.5)',    icon: '👟', bg: 'from-rose-950/30' },
  'accessories':   { accent: '#a855f7', glow: 'rgba(168,85,247,0.5)',   icon: '💎', bg: 'from-purple-950/30' },
  'ملابس':         { accent: '#ec4899', glow: 'rgba(236,72,153,0.5)',   icon: '👗', bg: 'from-pink-950/30' },
  'أحذية':         { accent: '#f43f5e', glow: 'rgba(244,63,94,0.5)',    icon: '👟', bg: 'from-rose-950/30' },
  'اكسسوار':       { accent: '#a855f7', glow: 'rgba(168,85,247,0.5)',   icon: '💎', bg: 'from-purple-950/30' },
  // Services
  'services':      { accent: '#14b8a6', glow: 'rgba(20,184,166,0.5)',   icon: '🔧', bg: 'from-teal-950/30' },
  'خدمات':         { accent: '#14b8a6', glow: 'rgba(20,184,166,0.5)',   icon: '🔧', bg: 'from-teal-950/30' },
  // Animals & Pets
  'pets':          { accent: '#22c55e', glow: 'rgba(34,197,94,0.5)',    icon: '🐾', bg: 'from-green-950/30' },
  'حيوان':         { accent: '#22c55e', glow: 'rgba(34,197,94,0.5)',    icon: '🐾', bg: 'from-green-950/30' },
  // Default fallback
  'default':       { accent: '#64748b', glow: 'rgba(100,116,139,0.4)',  icon: '📦', bg: 'from-slate-950/20' },
};

function getTheme(ad) {
  const cat = (ad.subcategory || ad.category || '').toLowerCase();
  const found = Object.entries(SUBCAT_THEMES).find(([k]) => k !== 'default' && cat.includes(k.toLowerCase()));
  return found ? found[1] : SUBCAT_THEMES.default;
}
// ─────────────────────────────────────────────────────────────────────────────

export default function AdCard({
  ad, eager = false }) {
  const { t: tr, language, isRTL } = useLanguage();
  const router = useRouter();
  const [shared, setShared] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savingBookmark, setSavingBookmark] = useState(false);
  const [viewCount, setViewCount] = useState(ad?.views || 0);
  // BUG 3 FIX: Removed expanded/fullAd/loadingAd states — description always visible
  // Feature 3: mini chat box
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);
  const chatEndRef = useRef(null);
  // ── Current user id (for own-ad check) ───────────────────────────────────
  const [currentUserId, setCurrentUserId] = useState(null);

  // ── Media carousel state ──────────────────────────────────────────────────
  const [imgIndex, setImgIndex] = useState(0);
  const touchStartX = useRef(null);

  // Normalize ad id — MongoDB returns _id, some APIs return id
  const adId = ad?._id || ad?.id;

  // Load saved state from localStorage wishlist on mount
  useEffect(() => {
    if (!adId) return;
    try {
      const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
      setSaved(wishlist.includes(String(adId)));
    } catch {
      // ignore parse errors
    }
  }, [adId]);

  // Load current user id for own-ad detection
  useEffect(() => {
    const uid = localStorage.getItem('userId') || localStorage.getItem('xtox_user_id') || localStorage.getItem('xtox_userId');
    setCurrentUserId(uid || null);
  }, []);

  // ── Auto-scroll chatbox to bottom when new messages arrive ───────────────────
  useEffect(() => {
    if (chatOpen && chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, chatOpen]);

  // ── Increment view count when card mounts — Layer 4: session deduplication ──
  useEffect(() => {
    if (!adId) return;
    // Layer 4: Check session storage to prevent double-counting from re-renders/prefetch
    try {
      const sessionKey = 'xtox_viewed_' + adId;
      if (sessionStorage.getItem(sessionKey)) return; // Already counted this session
      sessionStorage.setItem(sessionKey, '1');
    } catch (_) { /* sessionStorage unavailable — proceed anyway */ }
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
    const token = (typeof window !== 'undefined')
      ? localStorage.getItem('xtox_token') || localStorage.getItem('token') || ''
      : '';
    fetch(apiUrl + '/api/ads/' + adId + '/view', {
      method: 'PATCH',
      headers: token ? { 'Authorization': 'Bearer ' + token } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.views != null) setViewCount(data.views); })
      .catch(() => {}); // silent — view count is non-critical
  }, [adId]);


  if (!ad) return null;

  const rating =
    ad.sellerRating ??
    ad.rating ??
    ad.userId?.reputation ??
    ad.reputation ??
    null;

  const ratingCount =
    ad.ratingCount ??
    ad.ratingsCount ??
    ad.userId?.ratingCount ??
    null;

  const handleShare = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const adUrl = window.location.origin + '/ads/' + adId;
    const shareData = {
      title: ad.title,
      text: ad.description || ad.title,
      url: adUrl,
    };

    try {
      if (navigator.share) {
        await navigator.share(shareData);
      } else {
        await navigator.clipboard.writeText(adUrl);
      }
      setShared(true);
      setTimeout(() => setShared(false), 2000);
    } catch (err) {
      // User cancelled or error — do nothing
    }
  };

  const handleBookmark = async (e) => {
    e.preventDefault();
    e.stopPropagation();

    const token =
      localStorage.getItem('xtox_token') || localStorage.getItem('token') || localStorage.getItem('authToken');

    const adIdStr = String(adId);

    if (!token) {
      try {
        const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
        let updated;
        if (saved) {
          updated = wishlist.filter((id) => id !== adIdStr);
        } else {
          updated = [...wishlist, adIdStr];
        }
        localStorage.setItem('xtox_wishlist', JSON.stringify(updated));
        setSaved(!saved);
      } catch {
        // ignore
      }
      return;
    }

    setSavingBookmark(true);
    const prevSaved = saved;
    setSaved(!saved);

    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || "https://xtox-production.up.railway.app";
      const wishlistUrl = saved
        ? apiBase + '/api/wishlist/' + adIdStr
        : apiBase + '/api/wishlist';
      const res = await fetch(wishlistUrl, {
        method: saved ? 'DELETE' : 'POST',
        headers: {
          Authorization: 'Bearer ' + token,
          ...(saved ? {} : { 'Content-Type': 'application/json' }),
        },
        ...(saved ? {} : { body: JSON.stringify({ adId: adIdStr }) }),
      });
      if (!res.ok) throw new Error('API error');

      const wishlist = JSON.parse(localStorage.getItem('xtox_wishlist') || '[]');
      let updated;
      if (prevSaved) {
        updated = wishlist.filter((id) => id !== adIdStr);
      } else {
        updated = [...wishlist, adIdStr];
      }
      localStorage.setItem('xtox_wishlist', JSON.stringify(updated));
    } catch {
      setSaved(prevSaved);
    } finally {
      setSavingBookmark(false);
    }
  };

  const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

  // ── handleSendChat: send a message and append to chatMessages ──────────────
  const handleSendChat = async () => {
    const token = typeof window !== 'undefined'
      ? (localStorage.getItem('xtox_token') || localStorage.getItem('token'))
      : null;
    if (!chatInput.trim() || chatLoading) return;
    if (!token) { alert('سجل دخولك أولاً'); return; }
    const msg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { from: 'me', text: msg, time: new Date() }]);
    setChatLoading(true);
    try {
      const sellerId = ad.seller?._id || ad.seller || ad.userId?._id || ad.userId;
      const res = await fetch(BACKEND + '/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ receiverId: sellerId, adId, message: msg }),
      });
      if (!res.ok) throw new Error('failed');
    } catch {
      setChatMessages(prev => [...prev, { from: 'system', text: 'فشل إرسال الرسالة، حاول مجدداً', time: new Date() }]);
    } finally {
      setChatLoading(false);
    }
  };

  // ── BUG 1 FIX: handleOpenChat — toggle chatbox, redirect to login if unauthenticated ──
  const handleOpenChat = async (e) => {
    if (e) { e.preventDefault(); e.stopPropagation(); }
    const tok = typeof window !== 'undefined'
      ? (localStorage.getItem('xtox_token') || localStorage.getItem('token'))
      : null;
    if (!tok) {
      if (typeof window !== 'undefined') window.location.href = '/login';
      return;
    }
    const myId = (() => { try { return JSON.parse(atob(tok.split('.')[1]))?.id; } catch { return null; } })();
    const sellerId = ad.seller?._id || ad.seller || ad.userId?._id || ad.userId;
    if (myId && sellerId && String(sellerId) === String(myId)) {
      alert('لا يمكنك مراسلة نفسك');
      return;
    }
    // Toggle: clicking again closes the chatbox
    setChatOpen(prev => !prev);
    // Load history only on first open (when chatOpen is currently false = we're opening)
    if (!chatOpen && chatMessages.length === 0) {
      try {
        const r = await fetch(`${BACKEND}/api/chat/history?with=${sellerId}&adId=${adId}`, {
          headers: { Authorization: `Bearer ${tok}` }
        });
        if (r.ok) {
          const d = await r.json();
          const myIdStr = String(myId);
          const msgs = (d.messages || []).map(m => ({
            from: String(m.sender) === myIdStr ? 'me' : 'them',
            text: m.message || m.text || m.content || '',
            time: new Date(m.createdAt || m.timestamp)
          }));
          if (msgs.length > 0) setChatMessages(msgs);
        }
      } catch { /* start fresh */ }
    }
  };

  // ── Notify seller when contact info is viewed (from AdCard) ──────────────
  async function notifySellerContactViewed(type) {
    try {
      const token = localStorage.getItem('xtox_token') || localStorage.getItem('token') || '';
      await fetch(BACKEND + '/api/ads/' + adId + '/contact-viewed', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...(token ? { 'Authorization': 'Bearer ' + token } : {}) },
        body: JSON.stringify({ type }),
      });
    } catch {}
  }

  // ── FIX: Comprehensive image resolution — try ALL field names, handle base64 ─
  // Get all available images from any field name the API might return
  const allImages = [
    ...(Array.isArray(ad?.images) ? ad.images : []),
    ...(Array.isArray(ad?.media) ? ad.media : []),
    ...(Array.isArray(ad?.photos) ? ad.photos : []),
    ad?.image, ad?.imageUrl, ad?.thumbnail, ad?.photo
  ].filter(Boolean).filter((v, i, arr) => arr.indexOf(v) === i); // dedupe

  const firstImage = allImages[0] || null;
  const videoUrl = ad?.videoUrl || ad?.video || null;
  const hasVideo = !!videoUrl;
  const hasMultipleImages = allImages.length > 1;

  // ── Touch swipe support for mobile image carousel ──────────────────────────
  const handleTouchStart = (e) => { touchStartX.current = e.touches[0].clientX; };
  const handleTouchEnd = (e) => {
    if (touchStartX.current === null) return;
    const diff = touchStartX.current - e.changedTouches[0].clientX;
    if (Math.abs(diff) > 40) {
      if (diff > 0) { setImgIndex(prev => (prev + 1) % allImages.length); }
      else { setImgIndex(prev => (prev - 1 + allImages.length) % allImages.length); }
    }
    touchStartX.current = null;
  };

  // ── FIX 2: Correct ad detail URL using normalized adId ──────────────────
  const adDetailUrl = '/ads/' + adId;

  // Own-ad detection: hide contact button on own ads
  const _sellerId = ad.userId?._id || ad.userId || ad.seller?._id || ad.seller;
  const isOwnAd = !!(currentUserId && _sellerId && String(currentUserId) === String(_sellerId));

  // #123/#125 — Determine promotion tier + subcategory theme
  const promoType = ad.promotion?.type || 'none';
  const isFeaturedPromo = promoType === 'featured' && new Date(ad.promotion?.expiresAt) > new Date();
  const isPremiumPromo = promoType === 'premium' && new Date(ad.promotion?.expiresAt) > new Date();
  const theme = getTheme(ad);

  // Premium: subcategory-colored ultra-glow
  const premiumStyle = isPremiumPromo ? {
    border: `2px solid ${theme.accent}`,
    boxShadow: `0 0 20px 4px ${theme.glow}, 0 0 50px 8px ${theme.glow.replace('0.5)', '0.2)').replace('0.4)', '0.15)')}`,
    background: theme.glow.replace(/,\s*[\d.]+\)$/, ', 0.06)'),
  } : {};

  // Featured: gold glow always
  const featuredStyle = isFeaturedPromo && !isPremiumPromo ? {
    border: '2px solid #fbbf24',
    boxShadow: '0 0 16px 3px rgba(251,191,36,0.55), 0 0 32px 6px rgba(251,191,36,0.2)',
    background: 'rgba(251,191,36,0.06)',
  } : {};

  const legacyFeaturedStyle = !isPremiumPromo && !isFeaturedPromo && ad.isFeatured ? {
    border: '2px solid #FFD700',
    boxShadow: '0 4px 16px rgba(255,165,0,0.2)',
    background: '#fff',
  } : {};

  const cardBorder = isPremiumPromo ? premiumStyle.border
    : isFeaturedPromo ? featuredStyle.border
    : ad.isFeatured ? legacyFeaturedStyle.border
    : '1px solid #eee';

  const cardBoxShadow = isPremiumPromo ? premiumStyle.boxShadow
    : isFeaturedPromo ? featuredStyle.boxShadow
    : ad.isFeatured ? legacyFeaturedStyle.boxShadow
    : '0 1px 4px rgba(0,0,0,0.06)';

  const cardBg = isPremiumPromo ? premiumStyle.background
    : isFeaturedPromo ? featuredStyle.background
    : '#fff';

  return (
    // BUG 1 FIX: Card wrapper is a plain div (NOT a Link/anchor).
    // Navigation is handled via onClick→router.push on the inner navigable div.
    // This eliminates the invalid-HTML issue (anchors/buttons nested inside <Link>/<a>)
    // that was corrupting the browser DOM and breaking click events.
    <div className="bg-white rounded-xl slide-in relative"
      style={{
        border: cardBorder,
        boxShadow: cardBoxShadow,
        background: cardBg,
      }}>

      {/* Share button — absolute overlay, sibling to navigable div (valid HTML) */}
      <button
        onClick={handleShare}
        aria-label={tr('ad_share')}
        className={'absolute top-2 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full text-sm transition-colors duration-200 ' + (shared ? 'bg-green-500 text-white' : 'bg-black/40 hover:bg-black/60 text-white')}
      >
        {shared ? '✓' : '📤'}
      </button>
      {/* Bookmark / Wishlist button — absolute overlay */}
      <button
        onClick={handleBookmark}
        aria-label={saved ? 'إزالة من المحفوظات' : 'حفظ في المحفوظات'}
        disabled={savingBookmark}
        className="absolute top-12 right-2 z-10 w-8 h-8 flex items-center justify-center rounded-full bg-black/40 hover:bg-black/60 disabled:opacity-60 transition-colors duration-200"
        style={{ fontSize: 16 }}
      >
        {saved ? '❤️' : '🤍'}
      </button>

      {/* ── NAVIGABLE AREA: clicking anywhere here navigates to ad detail ─────── */}
      {/* Using plain div + onClick instead of <Link> to prevent invalid HTML    */}
      {/* (no more nested anchors or buttons-inside-anchor issues)                */}
      <div
        onClick={() => router.push(adDetailUrl)}
        style={{ cursor: 'pointer', display: 'block', textDecoration: 'none', color: 'inherit' }}
      >
        {/* #123 — Premium badge (top-right corner, animated pulse) */}
        {isPremiumPromo && (
          <span style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            background: theme.accent,
            color: '#fff', fontSize: 11, fontWeight: 700,
            padding: '4px 10px', borderRadius: 20,
            boxShadow: `0 2px 8px ${theme.glow}`,
            animation: 'pulse 2s infinite',
            border: `2px solid ${theme.accent}`,
            letterSpacing: '0.04em',
          }}>
            ✦ PREMIUM
          </span>
        )}
        {/* #125 — Featured badge: gold star */}
        {isFeaturedPromo && !isPremiumPromo && (
          <span style={{
            position: 'absolute', top: 8, right: 8, zIndex: 10,
            display: 'flex', alignItems: 'center', gap: 4,
            background: '#f59e0b',
            color: '#fff', fontSize: 11, fontWeight: 700,
            padding: '4px 10px', borderRadius: 20,
            boxShadow: '0 2px 8px rgba(251,191,36,0.5)',
            border: '2px solid #f59e0b',
            letterSpacing: '0.04em',
          }}>
            ★ FEATURED
          </span>
        )}
        {ad.isFeatured && !isFeaturedPromo && !isPremiumPromo && (
          <div style={{
            position:'absolute', top:8, left:8, zIndex:5,
            background:'linear-gradient(135deg,#FFD700,#FFA500)',
            color:'#000', fontSize:11, fontWeight:700,
            padding:'3px 10px', borderRadius:10,
            boxShadow:'0 2px 8px rgba(255,165,0,0.4)',
            display:'flex', alignItems:'center', gap:4,
          }}>
            ⭐ مميز
          </div>
        )}
        {viewCount > 100 && (
          <div style={{
            position:'absolute', top:8, left: ad.isFeatured ? 72 : 8, zIndex:5,
            background:'linear-gradient(135deg,#ff4500,#ff6b35)',
            color:'#fff', fontSize:11, fontWeight:700,
            padding:'3px 10px', borderRadius:10,
            boxShadow:'0 2px 8px rgba(255,69,0,0.4)',
            display:'flex', alignItems:'center', gap:4,
          }}>
            🔥 رائج
          </div>
        )}

        {/* ── Media Carousel: video > multiple images > single image > placeholder ── */}
        <div style={{ position: 'relative', width: '100%', paddingBottom: '65%', background: '#f0f0f0', borderRadius: '12px 12px 0 0', overflow: 'hidden' }}
            onTouchStart={handleTouchStart}
            onTouchEnd={handleTouchEnd}>
          {hasVideo ? (
            <video src={videoUrl} style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              muted loop autoPlay playsInline />
          ) : firstImage ? (
            <img
              loading={eager ? 'eager' : 'lazy'}
              fetchPriority={eager ? 'high' : 'auto'}
              decoding={eager ? 'sync' : 'async'}
              src={optimizeImage(allImages[imgIndex] || firstImage)}
              alt={ad?.title || 'إعلان'}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
              onError={(e) => {
                e.target.onerror = null;
                e.target.src = getAdDefaultImage(ad);
              }}
            />
          ) : (
            <img
              src={getAdDefaultImage(ad)}
              alt={ad?.title || 'إعلان'}
              style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
            />
          )}

          {/* Navigation dots for multiple images */}
          {hasMultipleImages && (
            <div style={{ position: 'absolute', bottom: 6, left: 0, right: 0, display: 'flex', justifyContent: 'center', gap: 4 }}>
              {allImages.map((_, i) => (
                <div key={i} onClick={e => { e.stopPropagation(); setImgIndex(i); }}
                  style={{ width: 8, height: 8, borderRadius: '50%', background: i === imgIndex ? 'white' : 'rgba(255,255,255,0.5)', cursor: 'pointer', padding: 4, boxSizing: 'content-box', WebkitTapHighlightColor: 'transparent' }} />
              ))}
            </div>
          )}

          {/* Prev/Next arrows for multiple images */}
          {hasMultipleImages && (
            <>
              <button onClick={e => { e.stopPropagation(); setImgIndex(prev => (prev - 1 + allImages.length) % allImages.length); }}
                style={{ position: 'absolute', left: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>‹</button>
              <button onClick={e => { e.stopPropagation(); setImgIndex(prev => (prev + 1) % allImages.length); }}
                style={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)', background: 'rgba(0,0,0,0.4)', color: 'white', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center', WebkitTapHighlightColor: 'transparent', touchAction: 'manipulation' }}>›</button>
            </>
          )}

          {/* Video badge */}
          {hasVideo && (
            <div style={{ position: 'absolute', top: 6, right: 6, background: 'rgba(0,0,0,0.6)', color: 'white', borderRadius: 6, padding: '2px 6px', fontSize: 11 }}>🎥 فيديو</div>
          )}

          {/* Ad Expiry Countdown Badge */}
          {(() => {
            const daysLeft = getDaysLeft(ad.createdAt);
            if (daysLeft === null) return null;
            const color = daysLeft <= 3 ? '#ef4444' : daysLeft <= 7 ? '#f97316' : '#22c55e';
            const label = daysLeft <= 0 ? tr('ad_expired') : daysLeft + ' ' + tr('ad_days_left');
            return (
              <span style={{
                position: 'absolute', bottom: '8px', left: '8px',
                background: color, color: '#fff', fontSize: '10px',
                fontWeight: '700', padding: '2px 7px', borderRadius: '999px',
                zIndex: 10, letterSpacing: '0.02em',
                boxShadow: '0 1px 4px rgba(0,0,0,0.18)', pointerEvents: 'none',
              }}>
                {label}
              </span>
            );
          })()}
        </div>

        <div className="p-3">
          <p className="font-bold text-sm line-clamp-2">{ad.title}</p>
          <div className="flex items-center gap-1.5 mt-1 flex-wrap">
            <ConditionBadge condition={ad.condition} />
            {ad.negotiable && (
              <span
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: 2,
                  padding: '2px 7px', borderRadius: 8,
                  background: '#fff7ed', color: '#c2410c',
                  fontSize: 11, fontWeight: 700,
                }}
                aria-label="السعر قابل للتفاوض"
              >
                💬 قابل للتفاوض
              </span>
            )}
            {/* BUG 1 FIX: WhatsApp <a> moved OUTSIDE navigable div below — no longer a nested anchor */}
          </div>
          {/* Price with drop badge */}
          <div className="mt-1 flex items-center gap-2 flex-wrap">
            <p className="text-brand font-bold m-0">{ad.price} {ad.currency}</p>
            {ad.originalPrice && ad.originalPrice > ad.price && (() => {
              const discountPercent = Math.round((1 - ad.price / ad.originalPrice) * 100);
              return (
                <>
                  <span style={{ textDecoration: 'line-through', color: '#9ca3af', fontSize: 12 }}>
                    {ad.originalPrice} {ad.currency}
                  </span>
                  <span style={{
                    display: 'inline-flex', alignItems: 'center',
                    padding: '2px 7px', borderRadius: 8,
                    background: '#fee2e2', color: '#dc2626',
                    fontSize: 11, fontWeight: 700, marginInlineStart: 2,
                  }}>
                    خصم {toArabicNumerals(discountPercent)}٪
                  </span>
                </>
              );
            })()}
          </div>
          <div className="mt-1 flex items-center gap-1.5 flex-wrap">
            {(ad.seller?.verified || ad.userId?.verified) && (
              <span style={{color:'#23e5db',fontSize:'0.72rem',fontWeight:700,marginInlineEnd:'4px',display:'inline-flex',alignItems:'center'}}>
                موثق ✓
              </span>
            )}
            {/* Tier badge based on seller reputation */}
            {(() => {
              const pts = ad.seller?.reputationPoints || ad.userId?.reputationPoints || 0;
              if (pts < 50) return null;
              const tier = pts >= 500 ? {emoji:'💎',label:'Platinum',bg:'#e8f4fd',color:'#1e40af'} : pts >= 200 ? {emoji:'🥇',label:'Gold',bg:'#fefce8',color:'#a16207'} : {emoji:'🥈',label:'Silver',bg:'#f1f5f9',color:'#475569'};
              return (
                <span style={{background:tier.bg,color:tier.color,fontSize:'0.65rem',fontWeight:700,padding:'1px 5px',borderRadius:6,whiteSpace:'nowrap'}}>
                  {tier.emoji} {tier.label}
                </span>
              );
            })()}
            <SellerTrustBadge ad={ad} />
            <StarRating rating={rating} count={ratingCount} />
            {ad.aiQualityScore != null && <AIQualityBadge score={ad.aiQualityScore} />}
          </div>
          {/* Stats row */}
          <div className="mt-2">
            <p className="text-xs text-gray-500 m-0">👁 {viewCount} | {ad.city}</p>
          </div>
        </div>
      </div>{/* end navigable div */}

      {/* WhatsApp button — OUTSIDE navigable div (valid HTML: no nested anchors) */}
      {ad.phone && (
        <div style={{ padding: '0 12px 4px' }} onClick={e => e.stopPropagation()}>
          <a
            href={'https://wa.me/' + ad.phone.replace(/\D/g, '') + '?text=' + encodeURIComponent('مرحبا، رأيت إعلانك على XTOX')}
            target="_blank"
            rel="noopener noreferrer"
            dir="auto"
            className="mt-2 inline-flex items-center gap-1 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 px-3 py-1 text-xs font-semibold text-white shadow transition-colors"
            onClick={(e) => e.stopPropagation()}
          >
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-3.5 w-3.5">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M12 0C5.373 0 0 5.373 0 12c0 2.123.554 4.116 1.528 5.845L.057 23.448a.75.75 0 0 0 .916.948l5.84-1.53A11.946 11.946 0 0 0 12 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 21.75a9.7 9.7 0 0 1-4.99-1.378l-.357-.214-3.705.971.989-3.614-.233-.371A9.718 9.718 0 0 1 2.25 12C2.25 6.615 6.615 2.25 12 2.25S21.75 6.615 21.75 12 17.385 21.75 12 21.75z"/>
            </svg>
            <span>واتساب</span>
          </a>
        </div>
      )}

      {/* Description — always visible (2-line clamp) */}
      <p
        onClick={e => e.stopPropagation()}
        style={{
          fontSize: '12px',
          color: '#666',
          margin: '4px 12px',
          display: '-webkit-box',
          WebkitLineClamp: 2,
          WebkitBoxOrient: 'vertical',
          overflow: 'hidden',
          lineHeight: '1.4',
          direction: 'rtl',
          fontFamily: 'Cairo, Tajawal, sans-serif',
          minHeight: '2.8em',
        }}
      >
        {ad.description || ad.desc || ''}
      </p>

      {/* Price + city — always visible below description */}
      <div
        onClick={e => e.stopPropagation()}
        style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 4, padding: '0 12px 4px' }}
      >
        <span style={{ fontWeight: 700, color: '#002f34', fontSize: 14 }}>
          {ad.price ? `${Number(ad.price).toLocaleString('ar-EG')} ج.م` : 'السعر عند التواصل'}
        </span>
        {ad.city && <span style={{ fontSize: 11, color: '#9ca3af' }}>📍 {ad.city}</span>}
      </div>

      {/* Seller profile link — OUTSIDE navigable div, no nested anchor issue */}
      {_sellerId && (
        <a
          href={'/profile/' + _sellerId}
          onClick={e => e.stopPropagation()}
          style={{ display: 'block', margin: '4px 12px 0', background: '#f8f8f8', border: '1px solid #eee', borderRadius: 10, padding: '8px 10px', textDecoration: 'none', color: '#002f34' }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {(ad.userId?.avatar || ad.seller?.avatar) ? (
              <img
                src={ad.userId?.avatar || ad.seller?.avatar}
                alt=""
                style={{ width: 32, height: 32, borderRadius: '50%', objectFit: 'cover', flexShrink: 0 }}
              />
            ) : (
              <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,#ff6b35,#f7c59f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 14, flexShrink: 0 }}>
                {((ad.userId?.name || ad.seller?.name || ad.sellerName || 'ب')[0] || 'ب').toUpperCase()}
              </div>
            )}
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: 12, display: 'flex', alignItems: 'center', gap: 3 }}>
                {ad.userId?.name || ad.seller?.name || ad.sellerName || 'البائع'}
                {(ad.userId?.emailVerified || ad.seller?.emailVerified || ad.userId?.whatsappVerified || ad.seller?.whatsappVerified) && (
                  <span style={{ color: '#23e5db', fontSize: 10 }}>✓</span>
                )}
              </p>
              <p style={{ margin: 0, color: '#666', fontSize: 10 }}>عرض الملف الشخصي والتقييمات →</p>
            </div>
          </div>
        </a>
      )}

      {/* BUG 3 FIX: Removed "▼ عرض الإعلان" expand button — description always visible above */}

      {/* === 3 CONTACT ICONS - FIXED #214 === */}
      {!isOwnAd && (
        <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end', marginTop: '8px', padding: '0 4px 4px' }} onClick={e => { e.stopPropagation(); e.preventDefault(); }}>
          <button
            title="محادثة"
            onClick={e => { e.stopPropagation(); e.preventDefault(); setChatOpen(prev => !prev); }}
            style={{ background: '#dbeafe', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '17px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
          >💬</button>
          <button
            title="مكالمة صوتية"
            onClick={e => { e.stopPropagation(); e.preventDefault(); const sid = ad?.seller?._id || ad?.seller || ad?.userId; if (sid) router.push('/call?to=' + sid + '&adId=' + ad._id); }}
            style={{ background: '#dcfce7', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '17px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}
          >📞</button>
          {Boolean(ad?.phone || ad?.seller?.phone) && (
            <a
              href={'https://wa.me/' + String(ad?.phone || ad?.seller?.phone || '').replace(/\D/g, '') + '?text=' + encodeURIComponent('مرحباً، رأيت إعلانك على XTOX')}
              onClick={e => e.stopPropagation()}
              target="_blank"
              rel="noopener noreferrer"
              title="واتساب"
              style={{ background: '#dcfce7', border: 'none', borderRadius: '50%', width: '34px', height: '34px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', fontSize: '17px', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.12)', textDecoration: 'none' }}
            >🟢</a>
          )}
        </div>
      )}
      {/* === END 3 CONTACT ICONS === */}

      {/* BUG 1 FIX: Inline chatbox — outside navigable div, with zIndex:100 so it's never clipped */}
      {chatOpen && !isOwnAd && (
        <div
          onClick={e => e.stopPropagation()}
          style={{
            margin: '0 12px 8px',
            borderRadius: 12,
            border: '1px solid rgba(99,102,241,0.3)',
            background: '#fff',
            boxShadow: '0 4px 20px rgba(0,0,0,0.12)',
            overflow: 'hidden',
            direction: 'rtl',
            position: 'relative',
            zIndex: 100,
          }}
        >
          {/* Chat header */}
          <div style={{
            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
            padding: '10px 14px',
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: 'rgba(255,255,255,0.3)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontSize: 14, color: '#fff', fontWeight: 700,
              }}>
                {(ad.seller?.name || ad.userId?.name || ad.sellerName || 'ب')[0]}
              </div>
              <span style={{ color: '#fff', fontWeight: 600, fontSize: 13 }}>
                {ad.seller?.name || ad.userId?.name || ad.sellerName || 'البائع'}
              </span>
            </div>
            <button
              onClick={e => { e.stopPropagation(); setChatOpen(false); }}
              style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer', fontSize: 18, lineHeight: 1 }}
            >✕</button>
          </div>

          {/* Messages */}
          <div style={{ height: 180, overflowY: 'auto', padding: '10px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {chatMessages.length === 0 && (
              <p style={{ color: '#9ca3af', fontSize: 12, textAlign: 'center', margin: 'auto' }}>
                ابدأ المحادثة مع البائع
              </p>
            )}
            {chatMessages.map((m, i) => (
              <div key={i} style={{
                alignSelf: m.from === 'me' ? 'flex-end' : m.from === 'system' ? 'center' : 'flex-start',
                maxWidth: '80%',
              }}>
                <div style={{
                  background: m.from === 'me' ? 'linear-gradient(135deg,#6366f1,#8b5cf6)' : m.from === 'system' ? '#f3f4f6' : '#f9fafb',
                  color: m.from === 'me' ? '#fff' : '#374151',
                  padding: '6px 10px',
                  borderRadius: m.from === 'me' ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                  fontSize: 12,
                  lineHeight: 1.4,
                }}>
                  {m.text}
                </div>
              </div>
            ))}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={{
            borderTop: '1px solid #f3f4f6',
            padding: '8px 12px',
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <input
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendChat(); } }}
              placeholder="اكتب رسالة..."
              onClick={e => e.stopPropagation()}
              style={{
                flex: 1, border: '1px solid #e5e7eb', borderRadius: 20,
                padding: '6px 14px', fontSize: 12, outline: 'none',
                direction: 'rtl', fontFamily: 'Cairo, Tajawal, sans-serif',
              }}
            />
            <button
              onClick={e => { e.stopPropagation(); handleSendChat(); }}
              disabled={chatLoading || !chatInput.trim()}
              style={{
                background: (chatLoading || !chatInput.trim()) ? '#e5e7eb' : 'linear-gradient(135deg,#6366f1,#8b5cf6)',
                border: 'none', borderRadius: '50%',
                width: 32, height: 32,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                cursor: (chatLoading || !chatInput.trim()) ? 'not-allowed' : 'pointer',
                fontSize: 14, color: '#fff', flexShrink: 0,
              }}
            >
              {chatLoading ? '⏳' : '➤'}
            </button>
          </div>
        </div>
      )}

    </div>
  );
}
