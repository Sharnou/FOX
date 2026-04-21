'use client';

import { getCategoryLabel, getSubcategoryLabel, detectUserLang } from '@/lib/categoryTranslations';

// Legacy CATEGORY_DISPLAY map — kept for backward compatibility
// Dynamic lookups now use getCategoryLabel(categoryId, userLang) from categoryTranslations
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

import React, { useEffect, useState, useRef } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { detectLang } from '../../../lib/lang';
import AdDetailSkeleton from '../../components/AdDetailSkeleton';
import RecentlyViewed, { recordRecentView } from '../../components/RecentlyViewed';
import ReportAd from '../../components/ReportAd';
import ReportSeller from '../../components/ReportSeller';
import MakeOfferModal from '../../components/MakeOfferModal';
import ChatBox from '../../components/ChatBox';
import VerifiedBadge from '../../components/VerifiedBadge';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://xtox-production.up.railway.app';

// Auto-optimize Cloudinary images — free (f_auto=best format, q_auto=best quality)
// Also handles raw Cloudinary public_ids (not full URLs) by constructing full URL
const CLOUDINARY_BASE = 'https://res.cloudinary.com/dni9wcvx3/image/upload';
function optimizeImage(url, width = 400) {
  if (!url) return url;
  // Already a full Cloudinary URL — just add optimization params
  if (url.includes('cloudinary.com')) {
    return url.replace('/upload/', '/upload/f_auto,q_auto,w_' + width + ',c_limit/');
  }
  // Raw public_id (no http/data prefix) — construct full Cloudinary URL
  if (!url.startsWith('http') && !url.startsWith('data:') && !url.startsWith('blob:')) {
    return CLOUDINARY_BASE + '/f_auto,q_auto,w_' + width + ',c_limit/' + url;
  }
  return url;
}
function AITranslate({ title, description }) {
  // Bug 2: All required state vars (translateLang, translatedText, isTranslating, translateError)
  const [translateLang, setTranslateLang] = useState('en');
  const [translatedText, setTranslatedText] = useState('');
  const [isTranslating, setIsTranslating] = useState(false);
  const [translateError, setTranslateError] = useState(null);

  // Bug 1: Use backend proxy instead of direct OpenAI call (no key exposure)
  async function handleTranslate() {
    if (!translateLang) return;
    setIsTranslating(true);
    setTranslateError(null);
    try {
      const textToTranslate = [title, description].filter(Boolean).join('\n\n');
      const res = await fetch(`${API}/api/translate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: textToTranslate, targetLang: translateLang }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'فشل الترجمة');
      // Bug 3: Set translated text so it displays
      setTranslatedText(data.translated);
    } catch (err) {
      setTranslateError(err.message || 'فشل الترجمة. حاول مرة أخرى.');
    } finally {
      setIsTranslating(false);
    }
  }

  return (
    <div style={{ marginTop: 12 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {/* Bug 4: Language selector with proper onChange + added es, tr options */}
        <select
          value={translateLang}
          onChange={e => { setTranslateLang(e.target.value); setTranslatedText(''); setTranslateError(null); }}
          style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: 'white' }}
        >
          <option value="en">English</option>
          <option value="ar">العربية</option>
          <option value="fr">Français</option>
          <option value="de">Deutsch</option>
          <option value="es">Español</option>
          <option value="tr">Türkçe</option>
        </select>
        <button
          onClick={handleTranslate}
          disabled={isTranslating}
          style={{ padding: '6px 16px', background: isTranslating ? '#ccc' : '#0066cc', color: 'white', border: 'none', borderRadius: 8, cursor: isTranslating ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'inherit' }}
        >
          {/* Bug 1/3: Show proper Arabic loading text */}
          {isTranslating ? '⏳ جارٍ الترجمة...' : (translatedText ? '✕ إخفاء الترجمة' : '🌐 ترجم')}
        </button>
        {translatedText && (
          <button
            onClick={() => { setTranslatedText(''); setTranslateError(null); }}
            style={{ padding: '6px 12px', background: '#f0f0f0', border: '1px solid #ddd', borderRadius: 8, cursor: 'pointer', fontSize: 13, color: '#555' }}
          >✕</button>
        )}
      </div>
      {/* Bug 3: Display translated text block */}
      {translatedText && (
        <div dir="auto" style={{ marginTop: 12, padding: '14px 16px', background: '#f0f9ff', border: '1px solid #bae6fd', borderRadius: 12, fontSize: 14, lineHeight: 1.7, color: '#0c4a6e', position: 'relative' }}>
          <span style={{ fontSize: 12, color: '#0066cc', fontWeight: 'bold', display: 'block', marginBottom: 6 }}>🌐 ترجمة</span>
          <p style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{translatedText}</p>
        </div>
      )}
      {/* Bug 3: Display error in Arabic */}
      {translateError && (
        <p style={{ color: '#ef4444', fontSize: 13, marginTop: 8, textAlign: 'center' }}>{translateError}</p>
      )}
    </div>
  );
}

/* ─── Image Carousel Component ─────────────────────────────────────────── */
function ImageCarousel({ images, title }) {
  const [idx, setIdx] = useState(0);
  const [fading, setFading] = useState(false);
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const count = images.length;

  function goTo(next) {
    if (next === idx || fading) return;
    setFading(true);
    setTimeout(() => {
      setIdx(next);
      setFading(false);
    }, 150);
  }

  function prev() { goTo((idx - 1 + count) % count); }
  function next() { goTo((idx + 1) % count); }

  function onTouchStart(e) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }

  function onTouchEnd(e) {
    if (touchStartX.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (Math.abs(dx) > Math.abs(dy) && Math.abs(dx) > 40) {
      const isRTL = typeof document !== 'undefined' && document.documentElement.dir === 'rtl';
      if (dx < 0) { isRTL ? prev() : next(); }
      else { isRTL ? next() : prev(); }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }

  const navBtnBase = {
    position: 'absolute', top: '50%', transform: 'translateY(-50%)',
    background: 'rgba(0,0,0,0.45)', color: 'white', border: 'none', borderRadius: '50%',
    width: 38, height: 38, fontSize: 18, cursor: 'pointer', display: 'flex',
    alignItems: 'center', justifyContent: 'center', zIndex: 2, transition: 'background 0.2s',
    lineHeight: 1, userSelect: 'none',
  };

  return (
    <div style={{ userSelect: 'none' }}>
      <div style={{ position: 'relative', borderRadius: 12, overflow: 'hidden', background: '#111' }}
        onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
        <img key={idx} src={optimizeImage(images[idx], 800)} alt={title}
          loading={idx === 0 ? 'eager' : 'lazy'}
          style={{ width: '100%', maxHeight: 360, objectFit: 'cover', display: 'block',
            opacity: fading ? 0 : 1, transition: 'opacity 0.3s ease' }} />
        {count > 1 && (<>
          <button onClick={prev} aria-label="الصورة السابقة" style={{ ...navBtnBase, left: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}>‹</button>
          <button onClick={next} aria-label="الصورة التالية" style={{ ...navBtnBase, right: 8 }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(0,0,0,0.7)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(0,0,0,0.45)'}>›</button>
          <div style={{ position: 'absolute', bottom: 10, right: 10, background: 'rgba(0,0,0,0.55)',
            color: 'white', borderRadius: 20, padding: '3px 10px', fontSize: 12, fontWeight: 'bold', letterSpacing: '0.5px' }}>
            {idx + 1} / {count}
          </div>
        </>)}
      </div>
      {count > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 7, marginTop: 10 }}>
          {images.map((_, i) => (
            <button key={i} aria-label={'الصورة ' + (i + 1)} onClick={() => goTo(i)}
              style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4,
                background: i === idx ? '#002f34' : '#ccc', border: 'none', cursor: 'pointer',
                padding: 0, transition: 'all 0.25s ease' }} />
          ))}
        </div>
      )}
      {count > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {images.map((src, i) => (
            <img key={i} src={optimizeImage(src, 800)} onClick={() => goTo(i)} loading="lazy" alt={'صورة ' + (i + 1)}
              style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, cursor: 'pointer',
                border: i === idx ? '2px solid #002f34' : '2px solid #eee', flexShrink: 0,
                transition: 'border-color 0.2s' }} />
          ))}
        </div>
      )}
    </div>
  );
}

function SellerMiniCard({ sellerId, sellerName, lang = 'ar' }) {
  const [seller, setSeller] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const isRTL = ['ar', 'he', 'ur'].includes(lang);

  React.useEffect(() => {
    if (!sellerId || typeof sellerId !== 'string' || sellerId === 'undefined' || sellerId === 'null' || sellerId.length < 5) return;
    fetch(API + '/api/profile/' + sellerId)
      .then(r => r.ok ? r.json() : null)
      .then(data => {
        if (data) {
          // Profile API returns {user, ads, avgRating, reviewCount} — extract user object
          const userObj = (data.user && data.user._id) ? data.user : data;
          setSeller({
            ...userObj,
            avgRating: data.avgRating != null ? data.avgRating : userObj.avgRating,
            reviewCount: data.reviewCount != null ? data.reviewCount : (userObj.reviewCount || 0),
          });
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [sellerId]);

  const label = {
    seller: isRTL ? 'معلومات البائع' : 'Seller',
    viewProfile: isRTL ? 'عرض الملف الشخصي' : 'View Profile',
    ads: isRTL ? 'إعلان' : 'ads',
    memberSince: isRTL ? 'عضو منذ' : 'Member since',
  };

  if (loading) return (
    <div style={{ background: '#f7f7f7', borderRadius: 14, padding: 16, marginTop: 24 }}>
      <div style={{ display: 'flex', gap: 14, alignItems: 'center' }}>
        <div style={{ width: 60, height: 60, borderRadius: '50%', background: '#e0e0e0' }} />
        <div style={{ flex: 1 }}>
          <div style={{ height: 15, background: '#e0e0e0', borderRadius: 4, marginBottom: 8, width: '55%' }} />
          <div style={{ height: 12, background: '#e0e0e0', borderRadius: 4, width: '35%' }} />
        </div>
      </div>
    </div>
  );

  if (!seller) return null;

  // avgRating is 1-5 scale; reputation is 0-100 scale (100 = 5 stars)
  const starRating = parseFloat(seller.avgRating) ||
    (seller.reputationPoints ? Math.min(5, seller.reputationPoints / 20) : 0) ||
    (seller.reputation ? Math.min(5, seller.reputation / 20) : 0) || 0;
  const stars = Math.min(5, Math.max(0, Math.round(starRating)));

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{
      background: '#fff',
      border: '1px solid #ebebeb',
      borderRadius: 14,
      padding: '16px 18px',
      marginTop: 24,
      boxShadow: '0 2px 8px rgba(0,0,0,0.06)',
    }}>
      <h3 style={{ fontSize: 12, fontWeight: 700, color: '#aaa', marginBottom: 14, textTransform: 'uppercase', letterSpacing: 0.6 }}>
        {label.seller}
      </h3>
      <div style={{ display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap' }}>
        <a href={'/profile/' + sellerId} style={{ textDecoration: 'none', flexShrink: 0 }}>
          {seller.avatar
            ? <img src={seller.avatar} alt={seller.name} style={{ width: 62, height: 62, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff6b35' }} />
            : <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'linear-gradient(135deg,#ff6b35,#f7c59f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 700 }}>
                {((seller.name || sellerName || 'U')[0] || 'U').toUpperCase()}
              </div>
          }
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={'/profile/' + sellerId} style={{ textDecoration: 'none', color: '#1a1a1a', fontWeight: 700, fontSize: 16, display: 'flex', alignItems: 'center', gap: 4, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {seller.name || sellerName}
            <VerifiedBadge emailVerified={seller.emailVerified} whatsappVerified={seller.whatsappVerified} />
          </a>
          <div style={{ display: 'flex', gap: 2, margin: '5px 0 4px' }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ color: n <= stars ? '#f5a623' : '#ddd', fontSize: 15 }}>★</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            <span style={{ display: 'block', marginBottom: 2 }}>
              {seller.reviewCount > 0 ? `(${seller.reviewCount} تقييم)` : 'لا توجد تقييمات بعد'}
            </span>
            {seller.totalAds != null && <span style={{ marginInlineEnd: 6 }}>{seller.totalAds} {label.ads}</span>}
            {seller.createdAt && <span>{label.memberSince} {new Date(seller.createdAt).getFullYear()}</span>}
          </div>
        </div>
        <a href={'/profile/' + sellerId} style={{
          flexShrink: 0,
          display: 'inline-block',
          background: 'linear-gradient(135deg,#ff6b35,#e05a25)',
          color: '#fff',
          borderRadius: 9,
          padding: '9px 16px',
          fontSize: 13,
          fontWeight: 600,
          textDecoration: 'none',
          whiteSpace: 'nowrap',
        }}>
          {label.viewProfile}
        </a>
      </div>
    </div>
  );
}

export default function AdPageClient({ params }) {
  const router = useRouter();
  const pathname = usePathname();
  const [lang, setLang] = useState('ar');
  const [ad, setAd] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [socket, setSocket] = useState(null);
  const [copied, setCopied] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);
  const [saved, setSaved] = useState(false);
  const [showReport, setShowReport] = useState(false);
  const [showReportSeller, setShowReportSeller] = useState(false);
  const [offerOpen, setOfferOpen] = useState(false);
  const [relatedAds, setRelatedAds] = useState([]);
  const [relatedLoading, setRelatedLoading] = useState(false);
  const [displayedViews, setDisplayedViews] = useState(0);
  const pcRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const [userId, setUserId] = React.useState('');

  const [user, setUser] = useState(null);
  const [showChatBox, setShowChatBox] = useState(false);
  const [showPhoneModal, setShowPhoneModal] = useState(false);
  const [adNotFound, setAdNotFound] = useState(false);

  // ── Rate seller modal state ────────────────────────────────────────────
  const [showRateModal, setShowRateModal] = useState(false);
  const [ratingValue, setRatingValue] = useState(0);
  const [ratingComment, setRatingComment] = useState('');
  // ── Review state (declare before useEffect that uses them) ──────────
  const [reviewChecked, setReviewChecked]       = useState(false);
  const [existingReview, setExistingReview]     = useState(null);
  const [showReviewForm, setShowReviewForm]     = useState(false);
  const [reviewRating, setReviewRating]         = useState(0);
  const [reviewComment, setReviewComment]       = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewSubmitted, setReviewSubmitted]   = useState(false);
  const [reviewHover, setReviewHover]           = useState(0);
  // Detect language after all state declarations are initialized
  useEffect(() => { setLang(detectLang()); }, []);
  useEffect(() => {
    if (params && params.id) {
      fetch(API + '/api/ads/' + params.id)
        .then(r => r.ok ? r.json() : null)
        .then(function(data) {
          if (!data) { setAdNotFound(true); return; }
          // Handle both {ad: {...}} and direct ad object response shapes
          var adData = (data.ad && data.ad._id) ? data.ad : data;
          if (adData && !adData.error) {
            // Normalize images field — handles both 'images' and 'media' field names
            if (!adData.images || !adData.images.length) {
              adData.images = (adData.media && adData.media.length) ? adData.media : (adData.photos || []);
            }
            if (!adData.media || !adData.media.length) {
              adData.media = adData.images || [];
            }
            setAd(adData);
            // Fix A: Don't save own ads to recently viewed
            try {
              const _uid = localStorage.getItem('userId') || localStorage.getItem('xtox_user_id') || localStorage.getItem('xtox_userId') || '';
              const _sellerId = String(adData.userId?._id || adData.userId || adData.seller?._id || adData.seller || '');
              if (!_uid || _sellerId !== String(_uid)) {
                recordRecentView(adData._id || params.id);
              }
            } catch {}
          } else {
            setAdNotFound(true);
          }
        })
        .catch(function() { setAdNotFound(true); });
    }
  }, [params && params.id]);

  useEffect(() => {
    if (params && params.id && typeof window !== 'undefined') {
      const savedAds = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
      setSaved(savedAds.includes(params.id));
    }
  }, [params && params.id]);

  // Load user from localStorage for chat button
  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) { try { setUser(JSON.parse(u)); } catch {} }
    // Set userId from localStorage (avoids hydration mismatch)
    const uid = localStorage.getItem('userId') || '';
    setUserId(uid);
    // Auto-open phone modal if ?showPhone=1 (e.g. from AdCard call button)
    if (typeof window !== 'undefined') {
      const sp = new URLSearchParams(window.location.search);
      if (sp.get('showPhone') === '1') {
        setShowPhoneModal(true);
        // Strip ?showPhone=1 so refreshing doesn't re-open the modal
        try { router.replace(pathname, { scroll: false }); } catch (e) {}
      }
    }
  }, []);

  useEffect(() => {
    if (!SOCKET_URL || !userId) return;
    var _s;
    var _mounted = true;
    import('socket.io-client').then(function(_mod) {
      if (!_mounted) return;
      var io = _mod.io;
      // Connect to default namespace only — no custom namespace to avoid "Invalid namespace" errors
      _s = io(SOCKET_URL, { auth: { token: typeof window !== 'undefined' ? localStorage.getItem('xtox_token') || localStorage.getItem('token') || 'guest' : 'guest' } });
      // Handle socket connection errors gracefully — must never block UI
      _s.on('connect_error', function(err) { console.warn('[Socket] connect error:', err.message); });
      _s.emit('join', userId);
      _s.on('incoming_call', function(data) {
        // Wrap async handler in try/catch so mic errors don't crash the page
        (async function() {
          try {
            setCallStatus('مكالمة واردة...');
            var pc = await createPeer(_s, data.from);
            await pc.setRemoteDescription(data.offer);
            var answer = await pc.createAnswer();
            await pc.setLocalDescription(answer);
            _s.emit('call_answer', { to: data.from, answer: answer });
            setCallActive(true);
            setCallStatus('متصل 🟢');
          } catch (e) { setCallStatus('فشل الرد على المكالمة'); }
        })();
      });
      _s.on('call_answer', function(data) { (async function() { try { if (pcRef.current) { await pcRef.current.setRemoteDescription(data.answer); } setCallStatus('متصل 🟢'); } catch {} })(); });
      _s.on('ice_candidate', function(data) { (async function() { try { if (pcRef.current) { await pcRef.current.addIceCandidate(data.candidate); } } catch {} })(); });
      _s.on('call_end', function() { endCall(); setCallStatus('انتهت المكالمة'); });
      setSocket(_s);
    }).catch(function(err) { console.warn('[Socket] failed to load:', err.message); });
    return function() { _mounted = false; if (_s) _s.disconnect(); };
  }, [userId]);


  // ── Check existing review for this ad ─────────────────────────────
  React.useEffect(() => {
    if (!ad || !ad._id) return;
    const tok = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!tok) { setReviewChecked(true); return; }
    fetch(API + '/api/reviews/check/' + ad._id, {
      headers: { Authorization: 'Bearer ' + tok },
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d && d.reviewed) setExistingReview(d.review);
        setReviewChecked(true);
      })
      .catch(() => setReviewChecked(true));
  }, [ad && ad._id]);

  async function submitReview() {
    const tok = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!tok) return alert('يجب تسجيل الدخول أولاً');
    if (!reviewRating) return alert('اختر عدد النجوم');
    if (!reviewComment.trim() || reviewComment.trim().length < 5) {
      return alert('التعليق مطلوب (5 أحرف على الأقل)');
    }
    setReviewSubmitting(true);
    try {
      const res = await fetch(API + '/api/reviews', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ adId: ad._id, rating: reviewRating, comment: reviewComment.trim() }),
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'خطأ في الإرسال');
      } else {
        setExistingReview(data);
        setReviewSubmitted(true);
        setShowReviewForm(false);
        alert('✅ تم إرسال تقييمك بنجاح!');
      }
    } catch (e) {
      alert('خطأ في الاتصال');
    }
    setReviewSubmitting(false);
  }

  async function submitRating() {
    const tok = typeof window !== 'undefined' ? (localStorage.getItem('xtox_token') || localStorage.getItem('token')) : null;
    if (!tok) return alert('يجب تسجيل الدخول أولاً');
    if (!ratingValue) return alert('اختر عدد النجوم أولاً');
    try {
      const res = await fetch(API + '/api/users/' + sellerId + '/rate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ rating: ratingValue, comment: ratingComment }),
      });
      const data = await res.json();
      if (!res.ok) { alert(data.error || 'خطأ في الإرسال'); return; }
      setShowRateModal(false);
      setRatingValue(0);
      setRatingComment('');
      alert('✅ تم إرسال تقييمك للبائع بنجاح!');
    } catch (e) { alert('خطأ في الاتصال بالخادم'); }
  }

    useEffect(() => {
    if (!ad) return;
    setRelatedLoading(true);
    const qs = new URLSearchParams({ limit: '6', exclude: ad._id || '' });
    if (ad.category) qs.set('category', ad.category);
    if (ad.country) qs.set('country', ad.country);
    fetch(API + '/api/ads?' + qs)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data.ads || data.data || []);
        setRelatedAds(list.filter(a => a._id !== ad._id).slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setRelatedLoading(false));
  }, [ad && ad._id]);

  // Animated view counter: counts up from 0 to actual views on load
  useEffect(() => {
    const target = (ad && ad.views) || (ad && ad.viewCount) || 0;
    if (!target) { setDisplayedViews(0); return; }
    let start = 0;
    const duration = 1000;
    const step = target / (duration / 16);
    const timer = setInterval(() => {
      start += step;
      if (start >= target) {
        setDisplayedViews(target);
        clearInterval(timer);
      } else {
        setDisplayedViews(Math.floor(start));
      }
    }, 16);
    return () => clearInterval(timer);
  }, [ad && ad.views, ad && ad.viewCount]);

  async function createPeer(s, targetId) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => { if (remoteAudioRef.current) { remoteAudioRef.current.srcObject = e.streams[0]; remoteAudioRef.current.play().catch(() => {}); } };
    pc.onicecandidate = e => { if (e.candidate) s.emit('ice_candidate', { to: targetId, candidate: e.candidate }); };
    pcRef.current = pc;
    return pc;
  }

  async function startCall() {
    if (!(ad && ad.userId && ad.userId._id) && !(ad && ad.userId)) return alert('لا يمكن الاتصال الآن');
    if (!socket) { setCallStatus('جار الاتصال بالخادم...'); return; }
    var targetId = (ad.userId && ad.userId._id) || ad.userId;
    setCallStatus('جار الاتصال...');
    try {
      var pc = await createPeer(socket, targetId);
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_offer', { to: targetId, from: userId, offer: offer });
      setCallActive(true);
    } catch (e) {
      var errName = (e && e.name) || '';
      if (errName === 'NotAllowedError' || errName === 'PermissionDeniedError') {
        setCallStatus('يرجى السماح بالوصول إلى الميكروفون في إعدادات المتصفح');
      } else if (errName === 'NotFoundError' || errName === 'DevicesNotFoundError') {
        setCallStatus('لم يتم العثور على ميكروفون');
      } else {
        setCallStatus('فشل الاتصال، حاول مرة أخرى');
      }
    }
  }

  function endCall() {
    const targetId = (ad && ad.userId && ad.userId._id) || (ad && ad.userId);
    if (socket) socket.emit('call_end', { to: targetId });
    if (pcRef.current) pcRef.current.close();
    pcRef.current = null;
    setCallActive(false);
    setCallStatus('');
  }

  function copyPhone() {
    const phone = (ad && ad.phone) || (ad && ad.userId && ad.userId.phone);
    if (!phone) return alert('رقم الهاتف غير متاح');
    navigator.clipboard.writeText(phone).then(() => {
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      const el = document.createElement('textarea');
      el.value = phone; document.body.appendChild(el); el.select();
      document.execCommand('copy'); document.body.removeChild(el);
      setCopied(true); setTimeout(() => setCopied(false), 2000);
    });
  }

  function toggleSave() {
    const savedAds = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
    const newSaved = saved ? savedAds.filter(id => id !== params.id) : [...savedAds, params.id];
    localStorage.setItem('xtox_saved_ads', JSON.stringify(newSaved));
    setSaved(!saved);
  }

  function handleStartChat() {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) {
      const returnUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/';
      window.location.href = '/login?redirect=' + encodeURIComponent(returnUrl);
      return;
    }
    setShowChatBox(true);
  }

  // ── CHANGE 2: Notify seller when buyer views contact info ─────────────────
  async function notifySellerContactViewed(type) {
    const token = localStorage.getItem('xtox_token') || localStorage.getItem('token');
    if (!token) return; // only notify if viewer is logged in
    try {
      await fetch(`${API}/api/ads/${ad._id}/contact-viewed`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ type }) // type: 'call' | 'whatsapp' | 'copy'
      });
    } catch (e) { /* non-fatal */ }
  }

  // ── CHANGE 1: WebRTC call handler — navigate to /call page ────────────────
  function handleWebRTCCall() {
    setShowPhoneModal(false);
    notifySellerContactViewed('call');
    router.push(`/call?to=${sellerId}&name=${encodeURIComponent(sellerName)}&adId=${ad._id}`);
  }

  // ── CHANGE 1: WhatsApp via backend (hides phone number from DOM) ──────────
  async function handleWAClick() {
    notifySellerContactViewed('whatsapp');
    try {
      const token = localStorage.getItem('xtox_token') || localStorage.getItem('token');
      const headers = token ? { 'Authorization': `Bearer ${token}` } : {};
      const res = await fetch(`${API}/api/ads/${ad._id}/contact-link?type=whatsapp`, { headers });
      if (res.ok) {
        const data = await res.json();
        if (data.url) { window.open(data.url, '_blank', 'noopener,noreferrer'); return; }
      }
    } catch (e) { /* fallback below */ }
    // Fallback: construct WA URL client-side if backend fails
    const _phone = (ad && ad.phone) || (ad && ad.userId && ad.userId.phone) || '';
    const _waNum = _phone.replace(/\D/g, '').replace(/^0/, '20');
    if (_waNum) window.open('https://wa.me/' + _waNum, '_blank', 'noopener,noreferrer');
  }

  if (adNotFound) return (
    <div style={{ textAlign: 'center', padding: 40, fontFamily: "'Cairo', system-ui, sans-serif" }}>
      <p style={{ fontSize: 24 }}>😕</p>
      <h2 style={{ color: '#002f34' }}>الإعلان غير موجود</h2>
      <p style={{ color: '#666' }}>ربما تم حذف هذا الإعلان أو انتهت صلاحيته</p>
      <a href="/" style={{ color: '#002f34', fontWeight: 'bold' }}>← العودة للرئيسية</a>
    </div>
  );
  if (!ad) return <AdDetailSkeleton />;

  const rawMedia = ad.media || ad.images || [];
  const media = Array.isArray(rawMedia) ? rawMedia : [rawMedia].filter(Boolean);
  // Safely extract seller ID — handles ObjectId, populated object {_id/id}, or string
  const sellerId = (
    (ad.userId && typeof ad.userId === 'object' ? (ad.userId._id || ad.userId.id) : ad.userId) ||
    (ad.seller && typeof ad.seller === 'object' ? (ad.seller._id || ad.seller.id) : ad.seller) ||
    ad.sellerId || ''
  )?.toString?.() || '';
  const sellerName = (ad.userId && ad.userId.name) || (ad.seller && ad.seller.name) || ad.sellerName || 'البائع';
  const phone = (ad && ad.phone) || (ad && ad.userId && ad.userId.phone);

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
      {/* Remote audio for WebRTC voice calls — rendered always so ref is available; plays via srcObject in ontrack handler */}
      <audio ref={remoteAudioRef} style={{ display: 'none' }} />
      <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>← رجوع</button>
      {ad.video ? (
        <video src={ad.video} controls autoPlay style={{ width: '100%', borderRadius: 12, maxHeight: 360, objectFit: 'cover' }} />
      ) : media.length > 0 ? (
        <ImageCarousel images={media} title={ad.title} />
      ) : (
        <div style={{ height: 200, background: '#f0f0f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>📦</div>
      )}
      <h1 dir="auto" style={{ fontSize: 22, fontWeight: 'bold', marginTop: 16, marginBottom: 4 }}>{ad.title}</h1>
      <p style={{ fontSize: 26, color: '#002f34', fontWeight: 'bold', margin: '4px 0 8px' }}>{ad.price} {ad.currency}</p>
      <p dir="auto" style={{ color: '#555', lineHeight: 1.6, marginBottom: 12 }}>{ad.description}</p>
      <div style={{ display: 'flex', gap: 16, color: '#999', fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
        <span>📍 {ad.city}</span><span>👁 {displayedViews} مشاهدة</span>
        <span>{(CATEGORY_DISPLAY[ad.category] || CATEGORY_DISPLAY[ad.category?.toLowerCase()] || { name: ad.category || 'متفرقات', emoji: '📦' }).emoji} {(CATEGORY_DISPLAY[ad.category] || CATEGORY_DISPLAY[ad.category?.toLowerCase()] || { name: ad.category || 'متفرقات', emoji: '📦' }).name}</span>
        <span style={{ color: '#e44' }}>⏰ ينتهي {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString('ar-EG') : ''}</span>
      </div>
      {callStatus && (
        <div style={{ background: callActive ? '#e8f8e8' : '#fff8e0', border: '1px solid ' + (callActive ? '#00aa44' : '#ffcc00'), borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#333', fontSize: 14, textAlign: 'center' }}>
          {callStatus}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        {user && String((ad.userId && ad.userId._id) || ad.userId) !== String(user.id || user._id) ? (
          <button
            onClick={handleStartChat}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', textAlign: 'center', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            💬 راسل البائع
          </button>
        ) : !user ? (
          <button
            onClick={() => { const returnUrl = typeof window !== 'undefined' ? window.location.pathname + window.location.search : '/'; window.location.href = '/login?redirect=' + encodeURIComponent(returnUrl); }}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', textAlign: 'center', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
          >
            💬 تواصل مع البائع
          </button>
        ) : (
          <a href="/" style={{ background: '#e2e8f0', color: '#64748b', textAlign: 'center', padding: '14px', borderRadius: 12, textDecoration: 'none', fontWeight: 'bold', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏠 الرئيسية</a>
        )}
        <button onClick={() => {
          if (!sellerId) { alert('لا يمكن الاتصال الآن'); return; }
          notifySellerContactViewed('call');
          router.push(`/call?to=${sellerId}&name=${encodeURIComponent(sellerName)}&adId=${ad._id}`);
        }} style={{ background: '#00aa44', color: 'white', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>📞 مكالمة مباشرة</button>
      </div>
      {showChatBox && ad && (
        <div id="chat" style={{ marginTop: 16 }}>
          <ChatBox
            targetId={ad.userId ? (typeof ad.userId === 'object' ? (ad.userId._id || String(ad.userId)) : String(ad.userId)) : (ad.seller ? (typeof ad.seller === 'object' ? (ad.seller._id || String(ad.seller)) : String(ad.seller)) : '')}
            adId={ad._id}
            otherName={ad.userId ? (typeof ad.userId === 'object' ? (ad.userId.name || '') : '') : ''}
            otherAvatar={ad.userId ? (typeof ad.userId === 'object' ? (ad.userId.avatar || '') : '') : ''}
          />
        </div>
      )}
      {phone && (<button onClick={() => { notifySellerContactViewed('copy'); copyPhone(); }} dir="rtl" style={{ width: '100%', marginTop: 10, padding: '13px 16px', borderRadius: 12, border: copied ? '2px solid #00aa44' : '2px solid #e0e0e0', background: copied ? '#e8f8e8' : '#f8f8f8', color: copied ? '#00aa44' : '#002f34', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.25s ease', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
        {copied ? (<><span style={{ fontSize: 18 }}>✓</span><span>تم النسخ</span></>) : (<><span style={{ fontSize: 16 }}>📋</span><span>نسخ الرقم</span><span style={{ color: '#666', fontWeight: 'normal', fontSize: '13px' }}>اضغط للاتصال بالبائع</span></>)}
      </button>)}
      {phone && (<button onClick={() => handleWAClick()} dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 10, padding: '13px 16px', borderRadius: 12, background: '#25D366', color: 'white', fontWeight: 'bold', fontSize: 15, border: 'none', cursor: 'pointer', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", boxSizing: 'border-box' }}>
        <span style={{ fontSize: 18 }}>💬</span><span>واتساب</span>
      </button>)}
      <button onClick={async () => { if (navigator.share) { try { await navigator.share({ title: (ad && ad.title) || 'إعلان XTOX', text: (ad && ad.description) || '', url: window.location.href }); } catch (e) {} } else { navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); } }} style={{ display: 'block', width: '100%', padding: '12px', marginTop: '8px', background: shareCopied ? '#16a34a' : '#1877F2', color: '#fff', fontWeight: 'bold', fontSize: '16px', borderRadius: '10px', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}>
        {shareCopied ? '✓ تم نسخ الرابط' : '📤 مشاركة'}
      </button>
      <button onClick={toggleSave} dir="rtl" style={{ width: '100%', marginTop: 10, padding: '13px 16px', borderRadius: 12, border: saved ? '2px solid #e44' : '2px solid #e0e0e0', background: saved ? '#fff0f0' : '#f8f8f8', color: saved ? '#cc2200' : '#555', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.25s ease', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
        <span style={{ fontSize: 18 }}>{saved ? '❤️' : '🤍'}</span>
        <span>{saved ? 'محفوظ ✓' : 'احفظ الإعلان'}</span>
      </button>
      {(ad && ad.negotiable) && userId !== sellerId && (
        <button
          onClick={() => setOfferOpen(true)}
          style={{ width: '100%', marginTop: 10, padding: '13px 16px', borderRadius: 12, border: '2px solid #1877F2', background: '#f0f6ff', color: '#1877F2', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.25s ease', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
        >
          <span style={{ fontSize: 18 }}>💬</span>
          <span>قدّم عرضاً</span>
        </button>
      )}
      {offerOpen && ad && (
        <MakeOfferModal ad={ad} user={{ _id: userId }} onClose={() => setOfferOpen(false)} />
      )}
      {sellerId && (<a href={'/profile/' + sellerId} style={{ display: 'block', marginTop: 16, background: '#f8f8f8', border: '1px solid #eee', borderRadius: 12, padding: '12px 16px', textDecoration: 'none', color: '#002f34' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,#ff6b35,#f7c59f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>{((ad.userId && ad.userId.name) || (ad.seller && ad.seller.name) || ad.sellerName || 'ب')[0].toUpperCase()}</div>
          <div>
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: 14, display: 'flex', alignItems: 'center', gap: 4 }}>
              {(ad.userId && ad.userId.name) || (ad.seller && ad.seller.name) || ad.sellerName || 'البائع'}
              <VerifiedBadge
                emailVerified={(ad.userId && ad.userId.emailVerified) || (ad.seller && ad.seller.emailVerified)}
                whatsappVerified={(ad.userId && ad.userId.whatsappVerified) || (ad.seller && ad.seller.whatsappVerified)}
              />
            </p>
            <p style={{ margin: 0, color: '#666', fontSize: 12 }}>عرض الملف الشخصي والتقييمات →</p>
          </div>
        </div>
      </a>)}
      <AITranslate title={ad.title} description={ad.description} />
      {ad.hashtags && ad.hashtags.length > 0 && (<div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ad.hashtags.map((tag, i) => (<a key={i} href={'/search?q=' + tag} style={{ padding: '4px 12px', background: '#e8f4f8', color: '#002f34', borderRadius: 20, fontSize: 12, textDecoration: 'none', fontWeight: 'bold' }}>#{tag}</a>))}
      </div>)}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={async () => { if (navigator.share) { try { await navigator.share({ title: ad.title, url: window.location.href }); } catch(e) {} } else { try { await navigator.clipboard.writeText(window.location.href); alert('تم نسخ الرابط'); } catch(e) {} } }} style={{ background: 'none', border: '1px solid #ddd', color: '#666', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>🔗 مشاركة الإعلان</button>
        <button onClick={() => setShowReport(true)} style={{ background: 'none', border: '1px solid #ffccbc', color: '#e64a19', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }} title="Report Ad / الإبلاغ عن الإعلان">🚩 الإبلاغ</button>
      </div>
      {showReport && (
        <ReportAd
          adId={(ad && ad._id) || (params && params.id)}
          adTitle={ad && ad.title}
          onClose={() => setShowReport(false)}
          lang="ar"
        />
      )}
      {showReportSeller && (
        <ReportSeller
          sellerId={String((ad.userId && (ad.userId._id || ad.userId.id)) || '').replace('[object Object]', '') || String(typeof ad.userId === 'string' ? ad.userId : '')}
          sellerName={(ad.userId && ad.userId.name) || ad.sellerName || ''}
          onClose={() => setShowReportSeller(false)}
          lang={lang || 'ar'}
        />
      )}

      {/* ── Related Ads ───────────────────────────────────────────── */}
      {(relatedLoading || relatedAds.length > 0) && (
        <div style={{ marginTop: 28 }}>
          <h2 dir="rtl" style={{ fontSize: 17, fontWeight: 'bold', color: '#002f34', marginBottom: 12, borderBottom: '2px solid #e8f4f8', paddingBottom: 8, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>إعلانات مشابهة</span>
            <span style={{ fontSize: 12, color: '#999', fontWeight: 'normal' }}>Related Ads</span>
          </h2>
          {relatedLoading ? (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {[1,2,3,4].map(i => (
                <div key={i} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid #eee', background: '#f9f9f9' }}>
                  <div style={{ height: 100, background: '#e8e8e8' }} />
                  <div style={{ padding: 8 }}>
                    <div style={{ height: 12, background: '#e0e0e0', borderRadius: 6, marginBottom: 6 }} />
                    <div style={{ height: 10, background: '#eee', borderRadius: 6, width: '60%' }} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              {relatedAds.map(item => {
                const itemMedia = item.media || item.images || [];
                const itemImg = Array.isArray(itemMedia) ? itemMedia[0] : itemMedia;
                return (
                  <a key={item._id} href={'/ads/' + item._id} style={{ textDecoration: 'none', color: 'inherit', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee', background: 'white', display: 'block', transition: 'box-shadow 0.2s' }}
                    onMouseEnter={e => e.currentTarget.style.boxShadow = '0 2px 12px rgba(0,0,0,0.12)'}
                    onMouseLeave={e => e.currentTarget.style.boxShadow = 'none'}>
                    {itemImg ? (
                      <img src={optimizeImage(itemImg, 200)} alt={item.title} loading="lazy"
                        style={{ width: '100%', height: 100, objectFit: 'cover', display: 'block' }} />
                    ) : (
                      <div style={{ height: 100, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 }}>📦</div>
                    )}
                    <div style={{ padding: '8px 10px' }}>
                      <p dir="auto" style={{ margin: '0 0 4px', fontSize: 13, fontWeight: 'bold', color: '#222', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.title}</p>
                      <p style={{ margin: 0, fontSize: 13, color: '#002f34', fontWeight: 'bold' }}>{item.price} {item.currency}</p>
                      {item.city && <p style={{ margin: '2px 0 0', fontSize: 11, color: '#999' }}>📍 {item.city}</p>}
                    </div>
                  </a>
                );
              })}
            </div>
          )}
        </div>
      )}
      <SellerMiniCard sellerId={String((ad.userId && (ad.userId._id || ad.userId.id)) || (ad.seller && (ad.seller._id || ad.seller.id)) || ad.sellerId || '').replace('[object Object]', '').trim()} sellerName={(ad.userId && ad.userId.name) || (ad.seller && ad.seller.name) || ad.sellerName || ''} lang={lang} />

      {/* ── Rate Seller Section ── */}
      {/* Guest prompt — not logged in */}
      {reviewChecked && !userId && (
        <div style={{ marginTop: 12, padding: '12px 16px', background: '#f8f4ff', borderRadius: 14, border: '1px solid #e8f0fe', display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 20 }}>⭐</span>
          <div>
            <a
              href={typeof window !== 'undefined' ? `/login?redirect=${encodeURIComponent(window.location.pathname)}` : '/login'}
              style={{ color: '#7c3aed', fontWeight: 'bold', fontSize: 14, textDecoration: 'none' }}
            >
              سجّل دخولك لتقييم البائع
            </a>
          </div>
        </div>
      )}
      {reviewChecked && userId && userId !== String(sellerId) && (
        <div style={{ marginTop: 12, border: '1px solid #e8f0fe', borderRadius: 14, overflow: 'hidden' }}>
          {existingReview ? (
            <div style={{ padding: '12px 16px', background: '#f0fdf4', display: 'flex', alignItems: 'flex-start', gap: 10 }}>
              <span style={{ fontSize: 20 }}>✅</span>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: 13, color: '#15803d' }}>لقد قيّمت هذا الإعلان مسبقاً</p>
                <p style={{ margin: '3px 0 0', fontSize: 12, color: '#555' }}>
                  {'★'.repeat(existingReview.rating)}{'☆'.repeat(5 - existingReview.rating)} — {existingReview.comment}
                </p>
              </div>
            </div>
          ) : !showReviewForm ? (
            <button
              onClick={() => { if (!userId) { const rp = typeof window !== 'undefined' ? window.location.pathname : '/'; window.location.href = '/login?redirect=' + encodeURIComponent(rp); return; } setShowRateModal(true); }}
              style={{ width: '100%', padding: '12px 16px', background: '#f8f4ff', border: 'none', cursor: 'pointer', textAlign: 'right', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", fontSize: 14, fontWeight: 'bold', color: '#7c3aed', display: 'flex', alignItems: 'center', gap: 8 }}
            >
              <span style={{ fontSize: 20 }}>⭐</span>
              <span>قيّم البائع</span>
            </button>
          ) : (
            <div style={{ padding: '14px 16px', background: 'white' }} dir="rtl">
              <p style={{ fontWeight: 'bold', margin: '0 0 10px', fontSize: 15, color: '#002f34' }}>⭐ تقييم البائع</p>
              <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
                {[1,2,3,4,5].map(i => (
                  <button key={i}
                    onMouseEnter={() => setReviewHover(i)}
                    onMouseLeave={() => setReviewHover(0)}
                    onClick={() => setReviewRating(i)}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 30, color: i <= (reviewHover || reviewRating) ? '#ffd700' : '#ddd', padding: '0 2px', lineHeight: 1 }}
                  >★</button>
                ))}
                {reviewRating > 0 && (
                  <span style={{ alignSelf: 'center', color: '#666', fontSize: 13, marginRight: 6 }}>
                    {['','⛔ سيء','😐 مقبول','👍 جيد','😊 ممتاز','🌟 رائع'][reviewRating]}
                  </span>
                )}
              </div>
              {reviewRating === 1 && (
                <div style={{ marginBottom: 10, padding: '8px 12px', background: '#fff3cd', borderRadius: 8, fontSize: 12, color: '#856404' }}>
                  ⚠️ التقييم بنجمة واحدة سيخصم 5 نقاط من سمعة البائع
                </div>
              )}
              <textarea
                value={reviewComment}
                onChange={e => setReviewComment(e.target.value)}
                placeholder="اكتب تعليقاً عن تجربتك مع البائع..."
                maxLength={500}
                style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: reviewComment.trim().length > 0 && reviewComment.trim().length < 5 ? '2px solid #ef4444' : '1px solid #ddd', fontSize: 14, resize: 'vertical', minHeight: 80, boxSizing: 'border-box', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", direction: 'rtl' }}
              />
              {reviewComment.trim().length > 0 && reviewComment.trim().length < 5 && (
                <p style={{ color: '#ef4444', fontSize: 12, margin: '4px 0 0' }}>التعليق يجب أن يكون 5 أحرف على الأقل</p>
              )}
              <p style={{ color: '#999', fontSize: 11, margin: '4px 0 10px' }}>{reviewComment.length}/500</p>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={submitReview}
                  disabled={reviewSubmitting || !reviewRating || reviewComment.trim().length < 5}
                  style={{ flex: 1, background: (reviewRating && reviewComment.trim().length >= 5) ? '#002f34' : '#ccc', color: 'white', border: 'none', padding: '11px', borderRadius: 10, fontWeight: 'bold', cursor: (reviewRating && reviewComment.trim().length >= 5) ? 'pointer' : 'not-allowed', fontSize: 14, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
                >
                  {reviewSubmitting ? 'جار الإرسال...' : 'إرسال التقييم'}
                </button>
                <button
                  onClick={() => setShowReviewForm(false)}
                  style={{ padding: '11px 16px', background: '#f0f0f0', border: 'none', borderRadius: 10, cursor: 'pointer', fontSize: 14, color: '#555', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
                >
                  إلغاء
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      <button
        onClick={() => setShowReportSeller(true)}
        style={{ marginTop: 8, fontSize: 12, color: '#ef4444', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', display: 'flex', alignItems: 'center', gap: 4 }}
        aria-label={lang === 'ar' ? 'الإبلاغ عن البائع' : 'Report Seller'}
      >
        <span>🚩</span>
        <span>{lang === 'ar' ? 'الإبلاغ عن البائع' : 'Report Seller'}</span>
      </button>
      {showRateModal && (
        <div style={{position:'fixed',inset:0,zIndex:9999,background:'rgba(0,0,0,0.6)',display:'flex',alignItems:'center',justifyContent:'center',padding:'24px'}}
          onClick={() => setShowRateModal(false)}>
          <div dir="rtl" style={{background:'white',borderRadius:'20px',padding:'28px 24px',maxWidth:'320px',width:'100%',textAlign:'center',fontFamily:"'Cairo','Tajawal',system-ui,sans-serif",boxShadow:'0 20px 60px rgba(0,0,0,0.3)'}}
            onClick={e => e.stopPropagation()}>
            <div style={{fontSize:'40px',marginBottom:'8px'}}>⭐</div>
            <h3 style={{margin:'0 0 16px',fontSize:'18px',color:'#002f34',fontWeight:'bold'}}>قيّم البائع</h3>
            <div style={{display:'flex',justifyContent:'center',gap:'8px',marginBottom:'16px',fontSize:'32px'}}>
              {[1,2,3,4,5].map(i => (
                <span key={i} onClick={() => setRatingValue(i)} style={{color: ratingValue >= i ? '#f59e0b' : '#ddd',cursor:'pointer',userSelect:'none'}}>★</span>
              ))}
            </div>
            <textarea
              placeholder="اكتب تعليقك (اختياري)"
              style={{width:'100%',padding:'10px',borderRadius:'8px',border:'1px solid #eee',fontFamily:'inherit',fontSize:'14px',marginBottom:'12px',boxSizing:'border-box',direction:'rtl'}}
              rows={3} value={ratingComment} onChange={e => setRatingComment(e.target.value)}
            />
            <button onClick={submitRating} style={{width:'100%',background:'#f59e0b',color:'white',border:'none',padding:'12px',borderRadius:'10px',fontWeight:'bold',fontSize:'15px',cursor:'pointer',fontFamily:'inherit',marginBottom:'8px'}}>إرسال التقييم</button>
            <button onClick={() => setShowRateModal(false)} style={{background:'#f0f0f0',border:'none',padding:'10px 28px',borderRadius:'10px',cursor:'pointer',fontSize:'14px',color:'#555',fontFamily:'inherit'}}>إلغاء</button>
          </div>
        </div>
      )}
      {showPhoneModal && (() => {
        return (
          <div
            style={{ position: 'fixed', inset: 0, zIndex: 9999, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
            onClick={() => setShowPhoneModal(false)}
          >
            <div
              dir="rtl"
              style={{ background: 'white', borderRadius: 20, padding: '28px 24px', minWidth: 280, maxWidth: 340, width: '100%', textAlign: 'center', boxShadow: '0 20px 60px rgba(0,0,0,0.3)', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ fontSize: 52, marginBottom: 12 }}>📞</div>
              <h3 style={{ margin: '0 0 8px', fontSize: 20, color: '#002f34', fontWeight: 'bold' }}>تواصل مع البائع</h3>
              <p style={{ margin: '0 0 20px', color: '#777', fontSize: 14 }}>اختر طريقة التواصل</p>
              <button
                onClick={handleWebRTCCall}
                style={{display:'block',background:'rgb(0,170,68)',color:'white',padding:'14px',borderRadius:'12px',fontWeight:'bold',fontSize:'17px',width:'100%',border:'none',cursor:'pointer',marginBottom:'10px',fontFamily:"'Cairo','Tajawal',system-ui,sans-serif"}}
              >
                📞 مكالمة صوتية مباشرة
              </button>
              <button
                onClick={() => { setShowPhoneModal(false); handleWAClick(); }}
                style={{ display: 'block', background: '#25D366', color: 'white', padding: '12px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, marginBottom: 14, border: 'none', cursor: 'pointer', width: '100%', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}
              >
                💬 واتساب
              </button>
              <button
                onClick={() => { setShowPhoneModal(false); try { router.replace(pathname, { scroll: false }); } catch (e) {} }}
                style={{ background: '#f0f0f0', border: 'none', padding: '10px 28px', borderRadius: 10, cursor: 'pointer', fontSize: 14, color: '#555', fontFamily: 'inherit' }}
              >
                إغلاق
              </button>
            </div>
          </div>
        );
      })()}
      <RecentlyViewed currentAdId={ad && ad._id} lang="ar" />
    </div>
  );
}

