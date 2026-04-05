'use client';
import React, { useEffect, useState, useRef } from 'react';
import { detectLang } from '../../../lib/lang';

// Auto-optimize Cloudinary images — free (f_auto=best format, q_auto=best quality)
function optimizeImage(url, width = 400) {
  if (!url || !url.includes('cloudinary.com')) return url;
  return url.replace('/upload/', `/upload/f_auto,q_auto,w_${width},c_limit/`);
}
import AdDetailSkeleton from '../../components/AdDetailSkeleton';
import RecentlyViewed, { recordRecentView } from '../../components/RecentlyViewed';
import ReportAd from '../../components/ReportAd';
import ReportSeller from '../../components/ReportSeller';
import MakeOfferModal from '../../components/MakeOfferModal';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://xtox-production.up.railway.app';

function AITranslate({ title, description }) {
  const [translated, setTranslated] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lang, setLang] = useState('en');

  async function translate() {
    setLoading(true);
    try {
      const res = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${process.env.NEXT_PUBLIC_OPENAI_KEY || ''}` },
        body: JSON.stringify({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: `Translate this marketplace ad to ${lang === 'en' ? 'English' : lang === 'ar' ? 'Arabic' : lang === 'fr' ? 'French' : 'German'}:\nTitle: ${title}\nDescription: ${description}\n\nReturn JSON: {"title":"...","description":"..."}` }],
          max_tokens: 300
        })
      });
      const data = await res.json();
      const parsed = JSON.parse(data.choices[0].message.content);
      setTranslated(parsed);
    } catch { setTranslated({ title: 'Translation failed — add OpenAI key to env', description: '' }); }
    setLoading(false);
  }

  if (translated) return (
    <div style={{ marginTop: 12, background: '#f0f8ff', border: '1px solid #b3d9ff', borderRadius: 12, padding: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#0066cc', fontWeight: 'bold' }}>🌐 ترجمة</span>
        <button onClick={() => setTranslated(null)} style={{ background: 'none', border: 'none', color: '#999', cursor: 'pointer', fontSize: 18 }}>×</button>
      </div>
      <p dir="auto" style={{ fontWeight: 'bold', margin: '0 0 4px', fontSize: 15 }}>{translated.title}</p>
      <p dir="auto" style={{ color: '#555', margin: 0, fontSize: 13 }}>{translated.description}</p>
    </div>
  );

  return (
    <div style={{ marginTop: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
      <select value={lang} onChange={e => setLang(e.target.value)}
        style={{ padding: '6px 10px', borderRadius: 8, border: '1px solid #ddd', fontSize: 13, background: 'white' }}>
        <option value="en">English</option>
        <option value="ar">العربية</option>
        <option value="fr">Français</option>
        <option value="de">Deutsch</option>
      </select>
      <button onClick={translate} disabled={loading}
        style={{ padding: '6px 16px', background: loading ? '#ccc' : '#0066cc', color: 'white', border: 'none', borderRadius: 8, cursor: loading ? 'not-allowed' : 'pointer', fontSize: 13, fontFamily: 'inherit' }}>
        {loading ? '...' : '🌐 ترجم'}
      </button>
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
            <button key={i} aria-label={`الصورة ${i + 1}`} onClick={() => goTo(i)}
              style={{ width: i === idx ? 22 : 8, height: 8, borderRadius: 4,
                background: i === idx ? '#002f34' : '#ccc', border: 'none', cursor: 'pointer',
                padding: 0, transition: 'all 0.25s ease' }} />
          ))}
        </div>
      )}
      {count > 1 && (
        <div style={{ display: 'flex', gap: 8, marginTop: 10, overflowX: 'auto', paddingBottom: 4 }}>
          {images.map((src, i) => (
            <img key={i} src={optimizeImage(src, 800)} onClick={() => goTo(i)} loading="lazy" alt={`صورة ${i + 1}`}
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
    if (!sellerId) return;
    fetch(`${API}/api/profile/${sellerId}`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { setSeller(data); setLoading(false); })
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

  const stars = Math.min(5, Math.max(0, Math.round(seller.reputation || seller.rating || 0)));

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
        <a href={`/profile/${sellerId}`} style={{ textDecoration: 'none', flexShrink: 0 }}>
          {seller.avatar
            ? <img src={seller.avatar} alt={seller.name} style={{ width: 62, height: 62, borderRadius: '50%', objectFit: 'cover', border: '2px solid #ff6b35' }} />
            : <div style={{ width: 62, height: 62, borderRadius: '50%', background: 'linear-gradient(135deg,#ff6b35,#f7c59f)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: 26, fontWeight: 700 }}>
                {((seller.name || sellerName || 'U')[0] || 'U').toUpperCase()}
              </div>
          }
        </a>
        <div style={{ flex: 1, minWidth: 0 }}>
          <a href={`/profile/${sellerId}`} style={{ textDecoration: 'none', color: '#1a1a1a', fontWeight: 700, fontSize: 16, display: 'block', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {seller.name || sellerName}
          </a>
          <div style={{ display: 'flex', gap: 2, margin: '5px 0 4px' }}>
            {[1,2,3,4,5].map(n => (
              <span key={n} style={{ color: n <= stars ? '#f5a623' : '#ddd', fontSize: 15 }}>★</span>
            ))}
          </div>
          <div style={{ fontSize: 12, color: '#999' }}>
            {seller.totalAds != null && <span style={{ marginInlineEnd: 6 }}>{seller.totalAds} {label.ads}</span>}
            {seller.createdAt && <span>{label.memberSince} {new Date(seller.createdAt).getFullYear()}</span>}
          </div>
        </div>
        <a href={`/profile/${sellerId}`} style={{
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
  const [lang, setLang] = useState('ar');
  useEffect(() => { setLang(detectLang()); }, []);
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

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'guest_' + Date.now() : '';

  const [user, setUser] = useState(null);
  const [adNotFound, setAdNotFound] = useState(false);
  useEffect(() => {
    if (params?.id) {
      fetch(`${API}/api/ads/${params.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => {
          if (data && !data.error) {
            setAd(data);
            recordRecentView(data._id || params.id);
          } else {
            setAdNotFound(true);
          }
        })
        .catch(() => { setAdNotFound(true); });
    }
  }, [params?.id]);

  useEffect(() => {
    if (params?.id && typeof window !== 'undefined') {
      const savedAds = JSON.parse(localStorage.getItem('xtox_saved_ads') || '[]');
      setSaved(savedAds.includes(params.id));
    }
  }, [params?.id]);

  // Load user from localStorage for chat button
  useEffect(() => {
    const u = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (u) { try { setUser(JSON.parse(u)); } catch {} }
  }, []);

  useEffect(() => {
    if (!SOCKET_URL || !userId) return;
    let s;
    import('socket.io-client').then(({ io }) => {
      s = io(SOCKET_URL, { auth: { token: typeof window !== 'undefined' ? localStorage.getItem('token') || 'guest' : 'guest' } });
      s.emit('join', userId);
      s.on('incoming_call', async (data) => {
        setCallStatus('مكالمة واردة...');
        const pc = await createPeer(s, data.from);
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('call_answer', { to: data.from, answer });
        setCallActive(true);
        setCallStatus('متصل 🟢');
      });
      s.on('call_answer', async (data) => { await pcRef.current?.setRemoteDescription(data.answer); setCallStatus('متصل 🟢'); });
      s.on('ice_candidate', async (data) => { await pcRef.current?.addIceCandidate(data.candidate); });
      s.on('call_end', () => { endCall(); setCallStatus('انتهت المكالمة'); });
      setSocket(s);
    });
    return () => s?.disconnect();
  }, [userId]);


  useEffect(() => {
    if (!ad) return;
    setRelatedLoading(true);
    const qs = new URLSearchParams({ limit: '6', exclude: ad._id || '' });
    if (ad.category) qs.set('category', ad.category);
    if (ad.country) qs.set('country', ad.country);
    fetch(`${API}/api/ads?${qs}`)
      .then(r => r.ok ? r.json() : [])
      .then(data => {
        const list = Array.isArray(data) ? data : (data.ads || data.data || []);
        setRelatedAds(list.filter(a => a._id !== ad._id).slice(0, 6));
      })
      .catch(() => {})
      .finally(() => setRelatedLoading(false));
  }, [ad?._id]);

  // Animated view counter: counts up from 0 to actual views on load
  useEffect(() => {
    const target = ad?.views || ad?.viewCount || 0;
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
  }, [ad?.views, ad?.viewCount]);

  async function createPeer(s, targetId) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };
    pc.onicecandidate = e => { if (e.candidate) s.emit('ice_candidate', { to: targetId, candidate: e.candidate }); };
    pcRef.current = pc;
    return pc;
  }

  async function startCall() {
    if (!ad?.userId?._id && !ad?.userId) return alert('لا يمكن الاتصال الآن');
    const targetId = ad.userId?._id || ad.userId;
    setCallStatus('جار الاتصال...');
    try {
      const pc = await createPeer(socket, targetId);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_offer', { to: targetId, from: userId, offer });
      setCallActive(true);
    } catch (e) { setCallStatus('فشل الاتصال — تحقق من الميكروفون'); }
  }

  function endCall() {
    const targetId = ad?.userId?._id || ad?.userId;
    socket?.emit('call_end', { to: targetId });
    pcRef.current?.close();
    pcRef.current = null;
    setCallActive(false);
    setCallStatus('');
  }

  function copyPhone() {
    const phone = ad?.phone || ad?.userId?.phone;
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

  const handleStartChat = async () => {
    const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
    if (!token) { window.location.href = "/login"; return; }
    const targetSellerId = ad && (ad.userId ? (ad.userId._id || ad.userId) : (ad.seller ? (ad.seller._id || ad.seller) : null));
    try {
      const chatAPIUrl = API + "/api/chat/start";
      const res = await fetch(chatAPIUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer " + token,
        },
        body: JSON.stringify({ targetId: targetSellerId, adId: ad && ad._id }),
      });
      const data = await res.json();
      const chatId = data.chatId || data._id || (data.chat && data.chat._id);
      if (chatId) {
        window.location.href = "/chat?chatId=" + chatId;
      } else {
        window.location.href = "/chat";
      }
    } catch (e) {
      window.location.href = "/chat";
    }
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
  const sellerId = ad.userId?._id || ad.userId;
  const phone = ad?.phone || ad?.userId?.phone;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
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
        <span>📁 {ad.category}</span>
        <span style={{ color: '#e44' }}>⏰ ينتهي {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString('ar-EG') : ''}</span>
      </div>
      {callStatus && (
        <div style={{ background: callActive ? '#e8f8e8' : '#fff8e0', border: `1px solid ${callActive ? '#00aa44' : '#ffcc00'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#333', fontSize: 14, textAlign: 'center' }}>
          {callStatus}
        </div>
      )}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        {user && String(ad.userId?._id || ad.userId) !== String(user.id || user._id) ? (
          <button
            onClick={handleStartChat}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', textAlign: 'center', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
          >
            💬 راسل البائع
          </button>
        ) : !user ? (
          <button
            onClick={() => { window.location.href = '/login'; }}
            style={{ background: '#7c3aed', color: '#fff', border: 'none', textAlign: 'center', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}
          >
            💬 تواصل مع البائع
          </button>
        ) : (
          <a href="/" style={{ background: '#e2e8f0', color: '#64748b', textAlign: 'center', padding: '14px', borderRadius: 12, textDecoration: 'none', fontWeight: 'bold', fontSize: 15, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🏠 الرئيسية</a>
        )}
        {!callActive ? (
          <button onClick={startCall} style={{ background: '#00aa44', color: 'white', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>📞 مكالمة مباشرة</button>
        ) : (
          <button onClick={endCall} style={{ background: '#cc0000', color: 'white', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer', animation: 'pulse 1s infinite' }}>⛔ إنهاء المكالمة</button>
        )}
      </div>
      {phone && (<button onClick={copyPhone} dir="rtl" style={{ width: '100%', marginTop: 10, padding: '13px 16px', borderRadius: 12, border: copied ? '2px solid #00aa44' : '2px solid #e0e0e0', background: copied ? '#e8f8e8' : '#f8f8f8', color: copied ? '#00aa44' : '#002f34', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.25s ease', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
        {copied ? (<><span style={{ fontSize: 18 }}>✓</span><span>تم النسخ</span></>) : (<><span style={{ fontSize: 16 }}>📋</span><span>نسخ الرقم</span><span style={{ color: '#666', fontWeight: 'normal', fontSize: 13 }}>{phone}</span></>)}
      </button>)}
      {phone && (<a href={`https://wa.me/${(phone || '').replace(/\D/g, '').replace(/^0/, '20')}`} target="_blank" rel="noopener noreferrer" dir="rtl" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, width: '100%', marginTop: 10, padding: '13px 16px', borderRadius: 12, background: '#25D366', color: 'white', fontWeight: 'bold', fontSize: 15, textDecoration: 'none', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", boxSizing: 'border-box' }}>
        <span style={{ fontSize: 18 }}>💬</span><span>واتساب</span>
      </a>)}
      <button onClick={async () => { if (navigator.share) { try { await navigator.share({ title: ad?.title || 'إعلان XTOX', text: ad?.description || '', url: window.location.href }); } catch (e) {} } else { navigator.clipboard.writeText(window.location.href); setShareCopied(true); setTimeout(() => setShareCopied(false), 2000); } }} style={{ display: 'block', width: '100%', padding: '12px', marginTop: '8px', background: shareCopied ? '#16a34a' : '#1877F2', color: '#fff', fontWeight: 'bold', fontSize: '16px', borderRadius: '10px', border: 'none', cursor: 'pointer', transition: 'background 0.3s' }}>
        {shareCopied ? '✓ تم نسخ الرابط' : '📤 مشاركة'}
      </button>
      <button onClick={toggleSave} dir="rtl" style={{ width: '100%', marginTop: 10, padding: '13px 16px', borderRadius: 12, border: saved ? '2px solid #e44' : '2px solid #e0e0e0', background: saved ? '#fff0f0' : '#f8f8f8', color: saved ? '#cc2200' : '#555', fontWeight: 'bold', fontSize: 15, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, transition: 'all 0.25s ease', fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
        <span style={{ fontSize: 18 }}>{saved ? '❤️' : '🤍'}</span>
        <span>{saved ? 'محفوظ ✓' : 'احفظ الإعلان'}</span>
      </button>
      {ad?.negotiable && userId !== sellerId && (
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
      {sellerId && (<a href={`/profile/${sellerId}`} style={{ display: 'block', marginTop: 16, background: '#f8f8f8', border: '1px solid #eee', borderRadius: 12, padding: '12px 16px', textDecoration: 'none', color: '#002f34' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>{ad.userId?.name?.[0]?.toUpperCase() || '?'}</div>
          <div><p style={{ margin: 0, fontWeight: 'bold', fontSize: 14 }}>{ad.userId?.name || 'البائع'}</p><p style={{ margin: 0, color: '#666', fontSize: 12 }}>عرض الملف الشخصي والتقييمات →</p></div>
        </div>
      </a>)}
      <AITranslate title={ad.title} description={ad.description} />
      {ad.hashtags && ad.hashtags.length > 0 && (<div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
        {ad.hashtags.map((tag, i) => (<a key={i} href={`/search?q=${tag}`} style={{ padding: '4px 12px', background: '#e8f4f8', color: '#002f34', borderRadius: 20, fontSize: 12, textDecoration: 'none', fontWeight: 'bold' }}>#{tag}</a>))}
      </div>)}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={() => navigator.share?.({ title: ad.title, url: window.location.href }) || navigator.clipboard.writeText(window.location.href).then(() => alert('تم نسخ الرابط'))} style={{ background: 'none', border: '1px solid #ddd', color: '#666', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>🔗 مشاركة الإعلان</button>
        <button onClick={() => setShowReport(true)} style={{ background: 'none', border: '1px solid #ffccbc', color: '#e64a19', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }} title="Report Ad / الإبلاغ عن الإعلان">🚩 الإبلاغ</button>
      </div>
      {showReport && (
        <ReportAd
          adId={ad?._id || params?.id}
          adTitle={ad?.title}
          onClose={() => setShowReport(false)}
          lang="ar"
        />
      )}
      {showReportSeller && (
        <ReportSeller
          sellerId={ad?.seller?._id || ad?.sellerId}
          sellerName={ad?.seller?.name || ad?.sellerName || ''}
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
                  <a key={item._id} href={`/ads/${item._id}`} style={{ textDecoration: 'none', color: 'inherit', borderRadius: 10, overflow: 'hidden', border: '1px solid #eee', background: 'white', display: 'block', transition: 'box-shadow 0.2s' }}
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
      <SellerMiniCard sellerId={ad.seller?._id || ad.sellerId} sellerName={ad.seller?.name || ad.sellerName || ''} lang={lang} />
      <button
        onClick={() => setShowReportSeller(true)}
        className="mt-2 text-xs text-red-500 hover:text-red-700 underline flex items-center gap-1"
        aria-label={lang === 'ar' ? 'الإبلاغ عن البائع' : 'Report Seller'}
      >
        <span>🚩</span>
        <span>{lang === 'ar' ? 'الإبلاغ عن البائع' : 'Report Seller'}</span>
      </button>
      <RecentlyViewed currentAdId={ad?._id} lang="ar" />
    </div>
  );
}

