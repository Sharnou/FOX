'use client';
import { useEffect, useState, useRef } from 'react';
import AdDetailSkeleton from '../../components/AdDetailSkeleton';

const API = 'https://fox-production.up.railway.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://fox-production.up.railway.app';

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

export default function AdPageClient({ params }) {
  const [ad, setAd] = useState(null);
  const [mediaIdx, setMediaIdx] = useState(0);
  const [callActive, setCallActive] = useState(false);
  const [callStatus, setCallStatus] = useState('');
  const [socket, setSocket] = useState(null);
  const [copied, setCopied] = useState(false);
  const pcRef = useRef(null);
  const remoteAudioRef = useRef(null);

  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') || 'guest_' + Date.now() : '';

  useEffect(() => {
    if (params?.id) {
      const RAILWAY = 'https://fox-production.up.railway.app';
      fetch(`${RAILWAY}/api/ads/${params.id}`)
        .then(r => r.ok ? r.json() : null)
        .then(data => { if (data) setAd(data); })
        .catch(() => {});
    }
  }, [params?.id]);

  // Init socket for signaling
  useEffect(() => {
    if (!SOCKET_URL || !userId) return;
    let s;
    import('socket.io-client').then(({ io }) => {
      s = io(SOCKET_URL, { auth: { token: typeof window !== 'undefined' ? localStorage.getItem('token') || 'guest' : 'guest' } });
      s.emit('join', userId);
      s.on('call_offer', async (data) => {
        setCallStatus('مكالمة واردة...');
        const pc = await createPeer(s, data.from);
        await pc.setRemoteDescription(data.offer);
        const answer = await pc.createAnswer();
        await pc.setLocalDescription(answer);
        s.emit('call_answer', { to: data.from, answer });
        setCallActive(true);
        setCallStatus('متصل 🟢');
      });
      s.on('call_answer', async (data) => {
        await pcRef.current?.setRemoteDescription(data.answer);
        setCallStatus('متصل 🟢');
      });
      s.on('ice_candidate', async (data) => {
        await pcRef.current?.addIceCandidate(data.candidate);
      });
      s.on('call_end', () => {
        endCall();
        setCallStatus('انتهت المكالمة');
      });
      setSocket(s);
    });
    return () => s?.disconnect();
  }, [userId]);

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
    } catch (e) {
      setCallStatus('فشل الاتصال — تحقق من الميكروفون');
    }
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
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }).catch(() => {
      // Fallback for browsers without clipboard API
      const el = document.createElement('textarea');
      el.value = phone;
      document.body.appendChild(el);
      el.select();
      document.execCommand('copy');
      document.body.removeChild(el);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  }

  if (!ad) return <AdDetailSkeleton />;

  const media = ad.media || [];
  const sellerId = ad.userId?._id || ad.userId;
  const phone = ad?.phone || ad?.userId?.phone;

  return (
    <div style={{ maxWidth: 640, margin: '0 auto', padding: 16, fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif" }}>
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />

      <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: '#002f34', fontWeight: 'bold', fontSize: 16, cursor: 'pointer', marginBottom: 16 }}>
        ← رجوع
      </button>

      {/* Media */}
      {ad.video ? (
        <video src={ad.video} controls autoPlay style={{ width: '100%', borderRadius: 12, maxHeight: 360, objectFit: 'cover' }} />
      ) : media.length > 0 ? (
        <div>
          <img src={media[mediaIdx]} style={{ width: '100%', borderRadius: 12, maxHeight: 360, objectFit: 'cover' }} alt={ad.title} />
          {media.length > 1 && (
            <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
              {media.map((m, i) => (
                <img key={i} src={m} onClick={() => setMediaIdx(i)}
                  style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 8, cursor: 'pointer', border: i === mediaIdx ? '2px solid #002f34' : '2px solid #eee' }} alt="" />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div style={{ height: 200, background: '#f0f0f0', borderRadius: 12, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 60 }}>📦</div>
      )}

      {/* Ad Info */}
      <h1 dir="auto" style={{ fontSize: 22, fontWeight: 'bold', marginTop: 16, marginBottom: 4 }}>{ad.title}</h1>
      <p style={{ fontSize: 26, color: '#002f34', fontWeight: 'bold', margin: '4px 0 8px' }}>{ad.price} {ad.currency}</p>
      <p dir="auto" style={{ color: '#555', lineHeight: 1.6, marginBottom: 12 }}>{ad.description}</p>

      <div style={{ display: 'flex', gap: 16, color: '#999', fontSize: 13, marginBottom: 8, flexWrap: 'wrap' }}>
        <span>📍 {ad.city}</span>
        <span>👁 {ad.views} مشاهدة</span>
        <span>📁 {ad.category}</span>
        <span style={{ color: '#e44' }}>⏰ ينتهي {ad.expiresAt ? new Date(ad.expiresAt).toLocaleDateString('ar-EG') : ''}</span>
      </div>

      {/* Call Status */}
      {callStatus && (
        <div style={{ background: callActive ? '#e8f8e8' : '#fff8e0', border: `1px solid ${callActive ? '#00aa44' : '#ffcc00'}`, borderRadius: 10, padding: '10px 14px', marginBottom: 12, color: '#333', fontSize: 14, textAlign: 'center' }}>
          {callStatus}
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginTop: 16 }}>
        {/* Chat Button */}
        <a href={`/chat?target=${sellerId}&ad=${ad._id}`}
          style={{ background: '#002f34', color: 'white', textAlign: 'center', padding: '14px', borderRadius: 12, textDecoration: 'none', fontWeight: 'bold', fontSize: 15 }}>
          💬 محادثة
        </a>

        {/* P2P Voice Call Button */}
        {!callActive ? (
          <button onClick={startCall}
            style={{ background: '#00aa44', color: 'white', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer' }}>
            📞 مكالمة مباشرة
          </button>
        ) : (
          <button onClick={endCall}
            style={{ background: '#cc0000', color: 'white', border: 'none', padding: '14px', borderRadius: 12, fontWeight: 'bold', fontSize: 15, cursor: 'pointer', animation: 'pulse 1s infinite' }}>
            ⛔ إنهاء المكالمة
          </button>
        )}
      </div>

      {/* Copy Phone Number Button */}
      {phone && (
        <button
          onClick={copyPhone}
          dir="rtl"
          style={{
            width: '100%',
            marginTop: 10,
            padding: '13px 16px',
            borderRadius: 12,
            border: copied ? '2px solid #00aa44' : '2px solid #e0e0e0',
            background: copied ? '#e8f8e8' : '#f8f8f8',
            color: copied ? '#00aa44' : '#002f34',
            fontWeight: 'bold',
            fontSize: 15,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 8,
            transition: 'all 0.25s ease',
            fontFamily: "'Cairo', 'Tajawal', system-ui, sans-serif",
          }}
        >
          {copied ? (
            <>
              <span style={{ fontSize: 18 }}>✓</span>
              <span>تم النسخ</span>
            </>
          ) : (
            <>
              <span style={{ fontSize: 16 }}>📋</span>
              <span>نسخ الرقم</span>
              <span style={{ color: '#666', fontWeight: 'normal', fontSize: 13 }}>{phone}</span>
            </>
          )}
        </button>
      )}

      {/* Seller Profile Link */}
      {sellerId && (
        <a href={`/profile/${sellerId}`}
          style={{ display: 'block', marginTop: 16, background: '#f8f8f8', border: '1px solid #eee', borderRadius: 12, padding: '12px 16px', textDecoration: 'none', color: '#002f34' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#002f34', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', fontSize: 18 }}>
              {ad.userId?.name?.[0]?.toUpperCase() || '?'}
            </div>
            <div>
              <p style={{ margin: 0, fontWeight: 'bold', fontSize: 14 }}>{ad.userId?.name || 'البائع'}</p>
              <p style={{ margin: 0, color: '#666', fontSize: 12 }}>عرض الملف الشخصي والتقييمات →</p>
            </div>
          </div>
        </a>
      )}

      {/* AI Translate Button */}
      <AITranslate title={ad.title} description={ad.description} />

      {/* Hashtags */}
      {ad.hashtags && ad.hashtags.length > 0 && (
        <div style={{ marginTop: 12, display: 'flex', flexWrap: 'wrap', gap: 6 }}>
          {ad.hashtags.map((tag, i) => (
            <a key={i} href={`/search?q=${tag}`}
              style={{ padding: '4px 12px', background: '#e8f4f8', color: '#002f34', borderRadius: 20, fontSize: 12, textDecoration: 'none', fontWeight: 'bold' }}>
              #{tag}
            </a>
          ))}
        </div>
      )}

      {/* Share */}
      <div style={{ marginTop: 16, display: 'flex', gap: 12, justifyContent: 'center' }}>
        <button onClick={() => navigator.share?.({ title: ad.title, url: window.location.href }) || navigator.clipboard.writeText(window.location.href).then(() => alert('تم نسخ الرابط'))}
          style={{ background: 'none', border: '1px solid #ddd', color: '#666', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          🔗 مشاركة الإعلان
        </button>
        <button onClick={() => { const report = prompt('سبب الإبلاغ:'); if (report) alert('تم الإبلاغ. شكراً'); }}
          style={{ background: 'none', border: '1px solid #ddd', color: '#999', padding: '8px 16px', borderRadius: 8, cursor: 'pointer', fontSize: 13 }}>
          🚩 إبلاغ
        </button>
      </div>
    </div>
  );
}
