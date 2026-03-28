'use client';
import { useEffect, useState, useRef } from 'react';

const API = 'https://fox-production.up.railway.app';
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
  const [data, setData] = useState(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [hoverStar, setHoverStar] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [socket, setSocket] = useState(null);
  const pcRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const myUserId = typeof window !== 'undefined' ? localStorage.getItem('userId') || '' : '';

  useEffect(() => {
    if (params?.id) {
      fetch(`${API}/api/profile/${params.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setData(data); })
        .catch(() => {});
    }
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

  async function submitReview() {
    if (!myRating) return alert('اختر تقييم أولاً');
    setSubmitting(true);
    try {
      await fetch(`${API}/api/profile/${params.id}/review`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ rating: myRating, comment: myComment })
      });
      const reloadRes = await fetch(`${API}/api/profile/${params.id}`);
      const reloadData = reloadRes.ok ? await reloadRes.json() : null;
      if (reloadData) setData(reloadData);
      setMyRating(0); setMyComment('');
      alert('✅ تم إرسال تقييمك!');
    } catch (e) { alert(e.response?.data?.error || 'خطأ'); }
    setSubmitting(false);
  }

  if (!data) return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', fontSize: 20, color: '#002f34' }}>
      جار التحميل...
    </div>
  );

  const { user, ads, reviews, avgRating, reviewCount } = data;
  const isOwnProfile = myUserId === params?.id;

  return (
    <div style={{ maxWidth: 700, margin: '0 auto', padding: 16, fontFamily: 'system-ui, sans-serif', background: '#f5f5f5', minHeight: '100vh' }}>
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>← رجوع</button>

      {/* Profile Card */}
      <div style={{ background: 'white', borderRadius: 20, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 }}>
        <div style={{ display: 'flex', gap: 20, alignItems: 'flex-start', flexWrap: 'wrap' }}>
          <div style={{ position: 'relative' }}>
            {user.avatar ? (
              <img src={user.avatar} style={{ width: 90, height: 90, borderRadius: '50%', objectFit: 'cover', border: '3px solid #002f34' }} alt="" />
            ) : (
              <div style={{ width: 90, height: 90, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 36, color: 'white' }}>
                {user.name?.[0]?.toUpperCase()}
              </div>
            )}
            {user.role === 'admin' && <span style={{ position: 'absolute', bottom: 0, right: 0, background: '#ffd700', borderRadius: '50%', width: 24, height: 24, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>👑</span>}
          </div>

          <div style={{ flex: 1 }}>
            <h1 style={{ margin: 0, fontSize: 22, fontWeight: 'bold' }}>{user.name}</h1>
            <p style={{ color: '#666', margin: '4px 0', fontSize: 14 }}>📍 {user.city} · {user.country}</p>
            <p style={{ color: '#999', margin: '4px 0', fontSize: 13 }}>عضو منذ {new Date(user.createdAt).toLocaleDateString('ar-EG')}</p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 6 }}>
              {avgRating ? (<><Stars rating={avgRating} /><span style={{ fontWeight: 'bold' }}>{avgRating}</span><span style={{ color: '#999', fontSize: 13 }}>({reviewCount})</span></>) : <span style={{ color: '#999', fontSize: 13 }}>لا توجد تقييمات</span>}
            </div>
            <div style={{ display: 'flex', gap: 16, marginTop: 10 }}>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: 18, color: '#002f34' }}>{ads.length}</div><div style={{ color: '#999', fontSize: 11 }}>إعلان</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: 18, color: '#002f34' }}>{user.reputation || 0}</div><div style={{ color: '#999', fontSize: 11 }}>سمعة</div></div>
              <div style={{ textAlign: 'center' }}><div style={{ fontWeight: 'bold', fontSize: 18, color: '#002f34' }}>{reviewCount}</div><div style={{ color: '#999', fontSize: 11 }}>تقييم</div></div>
            </div>
          </div>
        </div>

        {/* Phone/WhatsApp contact — only if user chose to show */}
        {(user.showPhone || user.showWhatsapp) && !isOwnProfile && (
          <div style={{ marginTop: 16, padding: '12px 16px', background: '#f8f8f8', borderRadius: 12, display: 'flex', flexWrap: 'wrap', gap: 12 }}>
            {user.showPhone && user.phone && (
              <a href={`tel:${user.phone}`}
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#002f34', color: 'white', padding: '8px 16px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 'bold' }}>
                📞 {user.phone}
              </a>
            )}
            {user.showWhatsapp && user.whatsapp && (
              <a href={`https://wa.me/${user.whatsapp.replace(/[^0-9]/g, '')}`} target="_blank" rel="noopener"
                style={{ display: 'flex', alignItems: 'center', gap: 8, background: '#25d366', color: 'white', padding: '8px 16px', borderRadius: 10, textDecoration: 'none', fontSize: 14, fontWeight: 'bold' }}>
                💬 واتساب
              </a>
            )}
          </div>
        )}

        {/* Action buttons — only if not own profile */}
        {!isOwnProfile && (
          <div style={{ display: 'flex', gap: 10, marginTop: 16, flexWrap: 'wrap' }}>
            <a href={`/chat?target=${params.id}`}
              style={{ flex: 1, background: '#002f34', color: 'white', textAlign: 'center', padding: '12px', borderRadius: 12, textDecoration: 'none', fontWeight: 'bold', fontSize: 14 }}>
              💬 مراسلة
            </a>
            {callStatus && (
              <div style={{ width: '100%', background: callActive ? '#e8f8e8' : '#fff8e0', border: `1px solid ${callActive ? '#00aa44' : '#ffd700'}`, borderRadius: 10, padding: '8px 14px', fontSize: 13, textAlign: 'center' }}>
                {callStatus}
              </div>
            )}
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
          <a href="/profile/edit"
            style={{ display: 'block', marginTop: 16, background: '#f0f0f0', textAlign: 'center', padding: '12px', borderRadius: 12, textDecoration: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 14 }}>
            ✏️ تعديل الملف الشخصي
          </a>
        )}
      </div>

      {/* Seller Ads */}
      {ads.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: 12, color: '#002f34', fontSize: 18 }}>📋 إعلانات البائع ({ads.length})</h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: 12 }}>
            {ads.map(ad => (
              <a key={ad._id} href={`/ads/${ad._id}`} style={{ background: 'white', borderRadius: 12, overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.08)', textDecoration: 'none', color: 'inherit' }}>
                <div style={{ height: 100, background: '#f0f0f0', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 }}>
                  {ad.media?.[0] ? <img src={ad.media[0]} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="" /> : '📦'}
                </div>
                <div style={{ padding: '8px 10px' }}>
                  <p style={{ fontWeight: 'bold', fontSize: 12, margin: 0 }}>{ad.title?.slice(0, 28)}</p>
                  <p style={{ color: '#002f34', fontWeight: 'bold', fontSize: 13, margin: '4px 0 0' }}>{ad.price} {ad.currency}</p>
                </div>
              </a>
            ))}
          </div>
        </div>
      )}

      {/* Review Form */}
      {token && !isOwnProfile && (
        <div style={{ background: 'white', borderRadius: 16, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.08)', marginBottom: 16 }}>
          <h2 style={{ fontWeight: 'bold', marginBottom: 16, color: '#002f34', fontSize: 18 }}>⭐ اترك تقييمك</h2>
          <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
            {[1,2,3,4,5].map(i => (
              <button key={i} onMouseEnter={() => setHoverStar(i)} onMouseLeave={() => setHoverStar(0)} onClick={() => setMyRating(i)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 32, color: i <= (hoverStar || myRating) ? '#ffd700' : '#ddd', padding: '0 2px' }}>★</button>
            ))}
            {myRating > 0 && <span style={{ alignSelf: 'center', color: '#666', fontSize: 14, marginRight: 8 }}>{['','سيء','مقبول','جيد','ممتاز','رائع'][myRating]}</span>}
          </div>
          <textarea value={myComment} onChange={e => setMyComment(e.target.value)} placeholder="اكتب تعليقك..."
            style={{ width: '100%', padding: '10px 12px', borderRadius: 10, border: '1px solid #ddd', fontSize: 14, resize: 'vertical', minHeight: 80, boxSizing: 'border-box', fontFamily: 'inherit' }} />
          <button onClick={submitReview} disabled={submitting || !myRating}
            style={{ marginTop: 12, background: myRating ? '#002f34' : '#ccc', color: 'white', border: 'none', padding: '12px 24px', borderRadius: 10, fontWeight: 'bold', cursor: myRating ? 'pointer' : 'not-allowed', fontSize: 15, fontFamily: 'inherit' }}>
            {submitting ? 'جار الإرسال...' : 'إرسال التقييم'}
          </button>
        </div>
      )}

      {/* Reviews List */}
      <div>
        <h2 style={{ fontWeight: 'bold', marginBottom: 12, color: '#002f34', fontSize: 18 }}>💬 التقييمات ({reviewCount})</h2>
        {reviews.length === 0 ? (
          <div style={{ background: 'white', borderRadius: 12, padding: 24, textAlign: 'center', color: '#999' }}>لا توجد تقييمات بعد</div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {reviews.map(r => (
              <div key={r._id} style={{ background: 'white', borderRadius: 12, padding: 16, boxShadow: '0 1px 4px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold' }}>
                    {r.buyerId?.name?.[0]?.toUpperCase()}
                  </div>
                  <div><p style={{ margin: 0, fontWeight: 'bold', fontSize: 14 }}>{r.buyerId?.name}</p><Stars rating={r.rating} /></div>
                  <span style={{ marginRight: 'auto', color: '#999', fontSize: 12 }}>{new Date(r.createdAt).toLocaleDateString('ar-EG')}</span>
                </div>
                {r.comment && <p style={{ margin: 0, color: '#444', fontSize: 14, lineHeight: 1.6 }}>{r.comment}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
