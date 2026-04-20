'use client';
import React from 'react';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useRef } from 'react';
import Link from 'next/link';
import MicPermissionCard from '../../components/MicPermissionCard';
import { useRouter } from 'next/navigation';
import { COUNTRIES } from '../../utils/geoDetect';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

function getTierBadge(pts) {
  if (pts >= 500) return '💎 Platinum';
  if (pts >= 200) return '🥇 Gold';
  if (pts >= 50)  return '🥈 Silver';
  return '🥉 Bronze';
}
function getTierColor(pts) {
  if (pts >= 500) return '#1e40af';
  if (pts >= 200) return '#a16207';
  if (pts >= 50)  return '#475569';
  return '#92400e';
}
function getTierBg(pts) {
  if (pts >= 500) return '#e8f4fd';
  if (pts >= 200) return '#fefce8';
  if (pts >= 50)  return '#f1f5f9';
  return '#fef3c7';
}

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || '';

function Stars({ rating }) {
  return (
    <span>
      {[1,2,3,4,5].map(i => (
        <span key={i} style={{ color: i <= Math.round(rating) ? '#ffd700' : '#ddd', fontSize: 18 }}>★</span>
      ))}
    </span>
  );
}

export default function ProfilePage({ params }) {
  const router = useRouter();
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(true);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [socket, setSocket] = useState(null);
  const [activeTab, setActiveTab] = useState('ads');
  const pcRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const [myUserId, setMyUserId] = React.useState('');
  const [myReputation, setMyReputation] = React.useState(0);
  const [dmLoading, setDmLoading] = React.useState(false);
  const [token, setToken] = React.useState('');
  const [avatarUploading, setAvatarUploading] = React.useState(false);
  const [avatarUrl, setAvatarUrl] = React.useState(null);
  const [isCurrentWinner, setIsCurrentWinner] = React.useState(false);
  const avatarInputRef = useRef(null);

  // ── FIX: seller review hooks ABOVE all conditional returns (Rules of Hooks) ──
  const [sellerReviews, setSellerReviews] = React.useState([]);
  const [sellerAvgRating, setSellerAvgRating] = React.useState(0);
  const [sellerReviewCount, setSellerReviewCount] = React.useState(0);
  const [reviewsLoaded, setReviewsLoaded] = React.useState(false);

  // ── Fix 1: redirect if params.id is invalid ──────────────────────────
  useEffect(() => {
    const id = params?.id;
    if (!id || id === 'undefined' || id === 'null') {
      router.replace('/');
    }
  }, [params?.id]);

  useEffect(() => {
    // Initialize from localStorage (avoids hydration mismatch)
    if (typeof window !== 'undefined') {
      setToken(localStorage.getItem('token') || '');
      setMyUserId(localStorage.getItem('userId') || '');
    }
  }, []);

  // Fetch viewer's own reputation for DM gating
  useEffect(() => {
    if (!myUserId) return;
    // Try localStorage first (fast path)
    try {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      const userObj = stored ? JSON.parse(stored) : null;
      if (userObj && typeof userObj.reputationPoints === 'number') {
        setMyReputation(userObj.reputationPoints);
        return;
      }
    } catch {}
    // Fallback: fetch profile
    fetch(API + '/api/profile/' + myUserId)
      .then(r => r.ok ? r.json() : null)
      .then(d => { if (d && d.user) setMyReputation(d.user.reputationPoints || d.user.reputation || 0); })
      .catch(() => {});
  }, [myUserId]);

  // sendDirect: create or find direct message chat and navigate
  async function sendDirectMessage() {
    const tok = token || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    if (!tok) { window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname); return; }
    setDmLoading(true);
    try {
      const res = await fetch(API + '/api/chat/direct', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + tok },
        body: JSON.stringify({ targetUserId: params?.id }),
      });
      const data = await res.json();
      if (data.chatId || data._id) {
        router.push('/chat?chatId=' + (data.chatId || data._id));
      } else if (data.error === 'insufficient_reputation') {
        alert('تحتاج 100 نقطة سمعة للتواصل المباشر مع المستخدمين');
      } else {
        alert(data.message || data.error || 'حدث خطأ');
      }
    } catch (e) {
      alert('حدث خطأ، يرجى المحاولة لاحقاً');
    }
    setDmLoading(false);
  }

  // ── Fix 2: handle fetch errors, show proper error state ───────────────
  useEffect(() => {
    const id = params?.id;
    if (!id || id === 'undefined' || id === 'null') {
      setLoading(false);
      return;
    }
    setLoading(true);
    const controller = new AbortController();
    const loadProfile = async () => {
      try {
        const r = await fetch(API + '/api/profile/' + id, { signal: controller.signal });
        if (!r.ok) {
          setError('المستخدم غير موجود');
          setLoading(false);
          return;
        }
        const d = await r.json();
        if (d) {
          setData(d);
          setLoading(false);
        }
        // Check if viewed profile is the current winner
        try {
          const wr = await fetch(`${API}/api/winner/current`);
          if (wr.ok) {
            const wd = await wr.json();
            if (wd.winner && wd.winner._id && id) {
              setIsCurrentWinner(wd.winner._id.toString() === id.toString());
            }
          }
        } catch {}
      } catch {
        setError('حدث خطأ، يرجى المحاولة لاحقاً');
        setLoading(false);
      }
    };
    loadProfile();
    return () => controller.abort();
  }, [params?.id]);

  useEffect(() => {
    if (!SOCKET_URL || !myUserId || !params?.id) return;
    let s;
    import('socket.io-client').then(({ io }) => {
      s = io(SOCKET_URL, { auth: { token: typeof window !== 'undefined' ? localStorage.getItem('token') || 'guest' : 'guest' } });
      s.emit('join', myUserId);
      s.on('call_offer', async (d) => {
        setCallStatus('مكالمة واردة...');
        const pc = await createPeer(s, d.from);
        await pc.setRemoteDescription(d.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('call_answer', { to: d.from, answer });
        setCallActive(true); setCallStatus('متصل 🟢');
      });
      s.on('call_answer', async (d) => { await pcRef.current?.setRemoteDescription(d.answer); setCallStatus('متصل 🟢'); });
      s.on('ice_candidate', async (d) => { await pcRef.current?.addIceCandidate(d.candidate); });
      s.on('call_end', () => { endCall(); setCallStatus('انتهت المكالمة'); });
      setSocket(s);
    });
    return () => s?.disconnect();
  }, [myUserId, params?.id]);

  async function createPeer(s, targetId) {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };
    pc.onicecandidate = e => { if (e.candidate) s.emit('ice_candidate', { to: targetId, candidate: e.candidate }); };
    pcRef.current = pc;
    return pc;
  }

  async function startCall() {
    if (!params?.id) return;
    setCallStatus('جار الاتصال...');
    try {
      const pc = await createPeer(socket, params.id);
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_offer', { to: params.id, from: myUserId, offer });
      setCallActive(true);
    } catch { setCallStatus('فشل الاتصال — تحقق من الميكروفون'); }
  }

  function endCall() {
    socket?.emit('call_end', { to: params.id });
    pcRef.current?.close(); pcRef.current = null;
    setCallActive(false); setCallStatus('');
  }

  // Load seller reviews from new endpoint
  React.useEffect(() => {
    const id = params?.id;
    if (!id || id === 'undefined' || id === 'null') return;
    fetch(API + '/api/reviews/seller/' + id)
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (d) {
          setSellerReviews(d.reviews || []);
          setSellerAvgRating(d.avgRating || 0);
          setSellerReviewCount(d.totalCount || 0);
        }
        setReviewsLoaded(true);
      })
      .catch(() => setReviewsLoaded(true));
  }, [params?.id]);

  async function submitReview() {
    // Reviews are now per-ad — handled in ad detail page
  }


  // ── Change 4: Avatar upload handler ──────────────────────────────────────
  async function handleAvatarUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const tok = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!tok) return;
    setAvatarUploading(true);
    try {
      const fd = new FormData();
      fd.append('avatar', file);
      const res = await fetch(API + '/api/profile/avatar', {
        method: 'PATCH',
        headers: { Authorization: 'Bearer ' + tok },
        body: fd,
      });
      const result = await res.json();
      if (result.avatar) {
        setAvatarUrl(result.avatar);
        // Update in-memory data as well
        setData(d => d ? { ...d, user: { ...d.user, avatar: result.avatar } } : d);
      }
    } catch {}
    setAvatarUploading(false);
  }

  // ── Loading / Error states ────────────────────────────────────────────
  if (loading) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 20, color: '#002f34' }}>
      جار التحميل...
    </div>
  );

  if (error) return (
    <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 20, color: '#002f34', gap: 16 }} dir="rtl">
      <div style={{ fontSize: 48 }}>🔍</div>
      <p style={{ margin: 0, fontWeight: 'bold' }}>{error}</p>
      <button
        onClick={() => router.back()}
        style={{ background: '#002f34', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 12, fontSize: 15, cursor: 'pointer', fontFamily: 'inherit' }}>
        ← رجوع
      </button>
    </div>
  );

  if (!data) return null;

  const { user, ads } = data;
  const isOwnProfile = myUserId === params?.id;

  // Renamed to lowercase to avoid TDZ risk after minification (depends on state)
  const tabs = [
    { key: 'ads',     labelAr: 'الإعلانات', icon: '📋', count: ads.length },
    { key: 'reviews', labelAr: 'التقييمات', icon: '⭐', count: sellerReviewCount },
  ];

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif", background: '#f5f5f5', minHeight: '100vh' }} dir="rtl">
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>← رجوع</button>

      {/* Profile Card */}
      <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative', cursor: isOwnProfile ? 'pointer' : 'default' }}
            onClick={() => isOwnProfile && avatarInputRef.current?.click()}
          >
            {/* Change 4: Hidden file input for avatar upload */}
            {isOwnProfile && (
              <input
                ref={avatarInputRef}
                type="file"
                accept="image/*"
                style={{ display: 'none' }}
                onChange={handleAvatarUpload}
              />
            )}
            {/* Change 4: Loading overlay during upload */}
            {avatarUploading && (
              <div style={{
                position: 'absolute', inset: 0, borderRadius: '50%',
                background: 'rgba(0,0,0,0.5)', display: 'flex',
                alignItems: 'center', justifyContent: 'center', zIndex: 3, fontSize: 20,
              }}>⏳</div>
            )}
            {(avatarUrl || user.avatar) ? (
              <img loading="lazy" src={avatarUrl || user.avatar} style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid #002f34' }} alt="" />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'white' }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
            {/* Change 4: Camera overlay on own profile */}
            {isOwnProfile && !avatarUploading && (
              <div style={{
                position: 'absolute', bottom: 0, right: 0,
                background: '#6366f1', borderRadius: '50%',
                width: 28, height: 28, display: 'flex',
                alignItems: 'center', justifyContent: 'center',
                fontSize: 14, cursor: 'pointer', zIndex: 2,
                boxShadow: '0 2px 8px rgba(99,102,241,0.4)',
                border: '2px solid white',
              }}>📷</div>
            )}
            {user.role === 'admin' && <span style={{ position: 'absolute', bottom: 0, right: 0, background: '#ffd700', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👑</span>}
            {/* Online Status Badge */}
            {user.isOnline ? (
              <span
                title="متصل الآن"
                style={{
                  position: 'absolute',
                  bottom: 4,
                  left: 4,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '2px solid white',
                  zIndex: 2,
                }}
              />
            ) : user.lastSeen ? (
              <span
                style={{
                  position: 'absolute',
                  bottom: -20,
                  left: '50%',
                  transform: 'translateX(-50%)',
                  fontSize: 10,
                  color: '#9ca3af',
                  whiteSpace: 'nowrap',
                  background: 'rgba(255,255,255,0.85)',
                  borderRadius: 4,
                  padding: '1px 4px',
                }}
              >
                {'آخر ظهور ' + Math.round((Date.now() - new Date(user.lastSeen)) / 60000) + ' د'}
              </span>
            ) : null}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>{user.name}</h1>
            <p style={{ color: '#666', margin: '4px 0', fontSize: 14 }}>
              📍 {user.city}
              {user.country && (
                <>
                  {' · '}
                  {COUNTRIES[user.country]
                    ? `${COUNTRIES[user.country].flag} ${COUNTRIES[user.country].name}`
                    : user.country}
                </>
              )}
            </p>
            <p style={{ color: '#999', margin: '4px 0', fontSize: 13 }}>عضو منذ {new Date(user.createdAt).toLocaleDateString('ar-EG')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              {sellerAvgRating > 0 ? (<><Stars rating={sellerAvgRating} /><span style={{ fontWeight: 'bold' }}>{sellerAvgRating}</span><span style={{ color: '#999', fontSize: 13 }}>({sellerReviewCount})</span></>) : <span style={{ color: '#999', fontSize: 13 }}>لا توجد تقييمات</span>}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: 18, color: '#002f34' }}>{ads.length}</div><div style={{ color: '#999', fontSize: 11 }}>إعلان</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: 18, color: '#002f34' }}>{user.reputationPoints || user.reputation || 0}</div><div style={{ color: '#999', fontSize: 11 }}>نقاط سمعة</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: 18, color: '#002f34' }}>{sellerReviewCount}</div><div style={{ color: '#999', fontSize: 11 }}>تقييم</div></div>
            </div>

            {/* Winner Crown Badge */}
            {isCurrentWinner && (
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, background: 'linear-gradient(135deg, #fcd34d, #f59e0b)', color: '#78350f', borderRadius: 20, padding: '4px 14px', marginTop: 10, fontWeight: 800, fontSize: 13 }}>
                👑 الفائز هذا الشهر
              </div>
            )}

            {/* Tier badge */}
            {(user.reputationPoints || 0) > 0 && (
              <div style={{ marginTop: 8 }}>
                <span style={{
                  background: getTierBg(user.reputationPoints || 0),
                  color: getTierColor(user.reputationPoints || 0),
                  fontSize: 12, fontWeight: 700,
                  padding: '3px 10px', borderRadius: 10,
                }}>
                  {getTierBadge(user.reputationPoints || 0)}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Phone/WhatsApp contact — only if user chose to show */}
        {(user.showPhone || user.showWhatsapp) && !isOwnProfile && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8f8f8', borderRadius: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {user.showPhone && user.phone && (
              <a href={'tel:' + user.phone}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#002f34', color: 'white', padding: '8px 16px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 'bold' }}>
                📞 {user.phone}
              </a>
            )}
            {user.showWhatsapp && user.whatsapp && (
              <a href={'https://wa.me/' + user.whatsapp.replace(/[^0-9]/g, '')} target="_blank" rel="noopener"
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#25d366', color: 'white', padding: '8px 16px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 'bold' }}>
                💬 واتساب
              </a>
            )}
          </div>
        )}

        {/* Action buttons — only if not own profile */}
        {!isOwnProfile && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <a href={'/chat?target=' + params.id}
              onClick={(e) => {
                const tok = localStorage.getItem('token') || localStorage.getItem('xtox_token');
                if (!tok) {
                  e.preventDefault();
                  window.location.href = '/login?redirect=' + encodeURIComponent(window.location.pathname);
                }
              }}
              style={{ flex: 1, background: '#002f34', color: 'white', textAlign: 'center', padding: '12px', borderRadius: 12, textDecoration: 'none', fontWeight: 'bold', fontSize: 14 }}>
              💬 مراسلة
            </a>

            {/* DM button — visible only if viewer has 100+ rep AND logged in */}
            {token && myReputation >= 100 ? (
              <button
                onClick={sendDirectMessage}
                disabled={dmLoading}
                title="رسالة مباشرة (100+ نقطة)"
                style={{ flex: 1, background: '#6366f1', color: 'white', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 'bold', fontSize: 14, cursor: dmLoading ? 'wait' : 'pointer', fontFamily: 'inherit', opacity: dmLoading ? 0.7 : 1 }}>
                {dmLoading ? '...' : '💬 رسالة مباشرة'}
              </button>
            ) : token && myReputation < 100 ? (
              <div
                title="تحتاج 100 نقطة للتواصل المباشر"
                style={{ flex: 1, background: '#e5e7eb', color: '#9ca3af', textAlign: 'center', padding: '12px', borderRadius: 12, fontWeight: 'bold', fontSize: 14, cursor: 'not-allowed' }}>
                💬 رسالة مباشرة
                <span style={{ display: 'block', fontSize: 10, fontWeight: 'normal', marginTop: 2 }}>تحتاج 100 نقطة</span>
              </div>
            ) : null}

            {callStatus && (
              <div style={{ width: '100%', background: callActive ? '#e8f8e8' : '#fff8e0', border: '1px solid ' + (callActive ? '#00aa44' : '#ffd700'), borderRadius: 10, padding: '8px 14px', fontSize: 13, textAlign: 'center' }}>
                {callStatus}
              </div>
            )}
            <MicPermissionCard />
            {!callActive ? (
              <button onClick={startCall}
                style={{ flex: 1, background: '#00aa44', color: 'white', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 'bold', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                📞 مكالمة خاصة
              </button>
            ) : (
              <button onClick={endCall}
                style={{ flex: 1, background: '#cc0000', color: 'white', border: 'none', padding: '12px', borderRadius: 12, fontWeight: 'bold', fontSize: 14, cursor: 'pointer', fontFamily: 'inherit' }}>
                ⛔ إنهاء المكالمة
              </button>
            )}
          </div>
        )}

        {/* Own profile edit link */}
        {isOwnProfile && (
          <Link href="/profile/edit"
            style={{ display: 'block', marginTop: 16, background: '#f0f0f0', textAlign: 'center', padding: '12px', borderRadius: 12, textDecoration: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 14 }}>
            ✏️ تعديل الملف الشخصي
          </Link>
        )}
      </div>

      {/* ── Tabbed Navigation ── */}
      <div style={{
        display: 'flex',
        background: '#002f34',
        borderRadius: 16,
        padding: 6,
        marginBottom: 16,
        gap: 6,
        boxShadow: '0 2px 10px rgba(0,47,52,0.18)',
      }}>
        {tabs.map(tab => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                flex: 1,
                padding: '10px 8px',
                borderRadius: 12,
                border: 'none',
                cursor: 'pointer',
                fontFamily: 'inherit',
                fontWeight: 'bold',
                fontSize: 14,
                transition: 'all 0.2s ease',
                background: isActive ? '#23e5db' : 'transparent',
                color: isActive ? '#002f34' : '#a0d8d6',
                boxShadow: isActive ? '0 2px 8px rgba(35,229,219,0.35)' : 'none',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
              }}
            >
              <span style={{ fontSize: 16 }}>{tab.icon}</span>
              <span>{tab.labelAr}</span>
              <span style={{
                background: isActive ? '#002f34' : '#23e5db22',
                color: isActive ? '#23e5db' : '#a0d8d6',
                borderRadius: 20,
                padding: '1px 8px',
                fontSize: 12,
                fontWeight: 'bold',
                minWidth: 24,
                textAlign: 'center',
              }}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Tab: Ads ── */}
      {activeTab === 'ads' && (
        <div>
          {ads.length === 0 ? (
            <div style={{ background: 'white', borderRadius: 16, padding: 40, textAlign: 'center', color: '#999', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div>
              <p style={{ margin: 0, fontSize: 16, fontWeight: 'bold', color: '#002f34' }}>لا توجد إعلانات بعد</p>
              <p style={{ margin: '8px 0 0', fontSize: 13 }}>لم ينشر هذا البائع أي إعلانات حتى الآن</p>
            </div>
          ) : (
            <>
              <p style={{ color: '#666', fontSize: 13, marginBottom: 12, marginTop: 0 }}>
                {ads.length} إعلان منشور
              </p>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
                {ads.map(ad => (
                  <a key={ad._id} href={'/ads/' + ad._id} style={{ background: 'white', borderRadius: 14, overflow: 'hidden', boxShadow: '0 1px 6px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit', display: 'block', transition: 'transform 0.15s, box-shadow 0.15s' }}
                    onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; e.currentTarget.style.boxShadow = '0 4px 14px rgba(0,47,52,0.14)'; }}
                    onMouseLeave={e => { e.currentTarget.style.transform = 'none'; e.currentTarget.style.boxShadow = '0 1px 6px rgba(0,0,0,0.08)'; }}>
                    <div style={{ height: 110, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, overflow: 'hidden', position: 'relative' }}>
                      {ad.media?.[0] ? (
                        <img loading="lazy" src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt={ad.title} />
                      ) : (
                        <span>📦</span>
                      )}
                      {ad.featured && (
                        <span style={{ position: 'absolute', top: 6, right: 6, background: '#ffd700', color: '#002f34', fontSize: 10, fontWeight: 'bold', padding: '2px 6px', borderRadius: 6 }}>مميز</span>
                      )}
                    </div>
                    <div style={{ padding: '10px 10px 12px' }}>
                      <p style={{ fontWeight: 'bold', fontSize: 12, margin: 0, color: '#1a1a1a', lineHeight: 1.4, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>{ad.title}</p>
                      <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 14, margin: '6px 0 0' }}>{ad.price?.toLocaleString('ar-EG')} {ad.currency}</p>
                      {ad.city && <p style={{ color: '#999', fontSize: 11, margin: '3px 0 0' }}>📍 {ad.city}</p>}
                    </div>
                  </a>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      {/* ── Tab: Reviews ── */}
      {activeTab === 'reviews' && (
        <div>
          {/* Info banner: rate via ad page */}
          {token && !isOwnProfile && (
            <div style={{ background: 'linear-gradient(135deg, #002f34 0%, #0f4c54 100%)', borderRadius: 14, padding: '14px 18px', marginBottom: 14, color: 'white', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ fontSize: 24 }}>💡</span>
              <div>
                <p style={{ margin: 0, fontWeight: 'bold', fontSize: 14 }}>كيف تقيّم البائع؟</p>
                <p style={{ margin: '4px 0 0', fontSize: 12, opacity: 0.85 }}>افتح إعلان البائع ثم اضغط "قيّم البائع" — التقييم مرتبط بإعلان محدد</p>
              </div>
            </div>
          )}

          {/* Reviews Summary Bar */}
          {sellerReviewCount > 0 && (
            <div style={{ background: 'white', borderRadius: 16, padding: '14px 18px', marginBottom: 12, boxShadow: '0 1px 4px rgba(0,0,0,0.06)', display: 'flex', alignItems: 'center', gap: 14 }}>
              <div style={{ textAlign: 'center' }}>
                <div style={{ fontSize: 36, fontWeight: 'bold', color: '#002f34', lineHeight: 1 }}>{sellerAvgRating}</div>
                <Stars rating={sellerAvgRating} />
                <div style={{ color: '#999', fontSize: 12, marginTop: 2 }}>{sellerReviewCount} تقييم</div>
              </div>
              <div style={{ flex: 1 }}>
                {[5,4,3,2,1].map(star => {
                  const cnt = sellerReviews.filter(r => Math.round(r.rating) === star).length;
                  const pct = sellerReviewCount > 0 ? Math.round((cnt / sellerReviewCount) * 100) : 0;
                  return (
                    <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 3 }}>
                      <span style={{ fontSize: 11, color: '#666', width: 10, textAlign: 'center' }}>{star}</span>
                      <span style={{ color: '#ffd700', fontSize: 11 }}>★</span>
                      <div style={{ flex: 1, height: 6, background: '#f0f0f0', borderRadius: 4, overflow: 'hidden' }}>
                        <div style={{ width: pct + '%', height: '100%', background: '#23e5db', borderRadius: 4, transition: 'width 0.4s ease' }} />
                      </div>
                      <span style={{ fontSize: 11, color: '#999', width: 24 }}>{cnt}</span>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Reviews List */}
          <div>
            <h2 style={{ fontWeight: 'bold', marginBottom: 12, color: '#002f34', fontSize: 16, marginTop: 0 }}>💬 جميع التقييمات ({sellerReviewCount})</h2>
            {!reviewsLoaded ? (
              <div style={{ textAlign: 'center', padding: 32, color: '#999' }}>جار تحميل التقييمات...</div>
            ) : sellerReviews.length === 0 ? (
              <div style={{ background: 'white', borderRadius: 12, padding: 40, textAlign: 'center', color: '#999', boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: 40, marginBottom: 8 }}>💬</div>
                <p style={{ margin: 0, fontWeight: 'bold', color: '#002f34' }}>لا توجد تقييمات بعد</p>
                <p style={{ margin: '6px 0 0', fontSize: 13 }}>افتح أحد إعلانات البائع لتقييمه</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sellerReviews.map(r => (
                  <div key={r._id} style={{ background: 'white', borderRadius: 14, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                      <div style={{ width: 38, height: 38, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 16, flexShrink: 0, overflow: 'hidden' }}>
                        {r.reviewer?.avatar
                          ? <img src={r.reviewer.avatar} style={{ width: 38, height: 38, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                          : (r.reviewer?.name?.[0]?.toUpperCase() || '?')}
                      </div>
                      <div style={{ flex: 1 }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <p style={{ margin: 0, fontWeight: 'bold', fontSize: 14 }}>{r.reviewer?.name || 'مستخدم'}</p>
                          {r.reviewer?.reputationPoints >= 500 && <span style={{ fontSize: 11, background: '#1e40af', color: 'white', borderRadius: 6, padding: '1px 6px' }}>💎 Platinum</span>}
                          {r.reviewer?.reputationPoints >= 200 && r.reviewer?.reputationPoints < 500 && <span style={{ fontSize: 11, background: '#a16207', color: 'white', borderRadius: 6, padding: '1px 6px' }}>🥇 Gold</span>}
                          {r.reviewer?.reputationPoints >= 50 && r.reviewer?.reputationPoints < 200 && <span style={{ fontSize: 11, background: '#475569', color: 'white', borderRadius: 6, padding: '1px 6px' }}>🥈 Silver</span>}
                        </div>
                        <Stars rating={r.rating} />
                      </div>
                      <span style={{ color: '#bbb', fontSize: 11, flexShrink: 0 }}>{new Date(r.createdAt).toLocaleDateString('ar-EG')}</span>
                    </div>
                    {r.comment && (
                      <p style={{ margin: 0, color: '#444', fontSize: 14, lineHeight: 1.65, borderTop: '1px solid #f5f5f5', paddingTop: 8 }} dir="auto">{r.comment}</p>
                    )}
                    {r.adSnapshot?.title && (
                      <div style={{ marginTop: 10, padding: '8px 12px', background: '#f8f8f8', borderRadius: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
                        {r.adSnapshot.image && <img src={r.adSnapshot.image} style={{ width: 40, height: 40, objectFit: 'cover', borderRadius: 6, flexShrink: 0 }} alt="" />}
                        <div>
                          <p style={{ margin: 0, fontSize: 12, fontWeight: 'bold', color: '#002f34' }}>{r.adSnapshot.title}</p>
                          <p style={{ margin: 0, fontSize: 11, color: '#666' }}>{r.adSnapshot.price ? r.adSnapshot.price.toLocaleString('ar-EG') + ' ج.م' : ''} {r.adSnapshot.category ? '• ' + r.adSnapshot.category : ''}</p>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
