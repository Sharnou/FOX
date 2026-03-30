'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useRef } from 'react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://xtox.up.railway.app';

// ─── Arabic relative time ────────────────────────────────────────────────────
function arabicRelTime(ts) {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'الآن';
  if (diff < 60) return `منذ ${diff} ثانية`;
  const mins = Math.floor(diff / 60);
  if (mins < 60) {
    if (mins === 1) return 'منذ دقيقة';
    if (mins <= 10) return `منذ ${mins} دقائق`;
    return `منذ ${mins} دقيقة`;
  }
  const hours = Math.floor(mins / 60);
  if (hours < 24) {
    if (hours === 1) return 'منذ ساعة';
    if (hours <= 10) return `منذ ${hours} ساعات`;
    return `منذ ${hours} ساعة`;
  }
  const days = Math.floor(hours / 24);
  if (days === 1) return 'منذ يوم';
  if (days <= 10) return `منذ ${days} أيام`;
  return `منذ ${days} يوم`;
}

// ─── Typing indicator dots ────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div
      dir="ltr"
      aria-label="يكتب..."
      style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}
    >
      <div style={{
        padding: '10px 16px',
        borderRadius: '18px 18px 18px 4px',
        background: '#e5e7eb',
        display: 'inline-flex',
        gap: 4,
        alignItems: 'center',
      }}>
        {[0, 1, 2].map(i => (
          <span
            key={i}
            style={{
              width: 8,
              height: 8,
              borderRadius: '50%',
              background: '#9ca3af',
              display: 'inline-block',
              animation: `xtox-bounce 1.2s ease-in-out infinite`,
              animationDelay: `${i * 0.2}s`,
            }}
          />
        ))}
      </div>
    </div>
  );
}

// ─── Incoming call modal ──────────────────────────────────────────────────────
function IncomingCallModal({ from, onAccept, onReject }) {
  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="مكالمة واردة"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        background: 'rgba(0,0,0,0.72)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: 24,
      }}
    >
      <div
        dir="rtl"
        style={{
          background: 'white',
          borderRadius: 24,
          padding: '36px 28px',
          textAlign: 'center',
          minWidth: 280,
          maxWidth: 340,
          width: '100%',
          boxShadow: '0 24px 64px rgba(0,0,0,0.35)',
          animation: 'xtox-pop 0.2s ease-out',
        }}
      >
        {/* Ringing animation ring */}
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <div style={{
            position: 'absolute',
            inset: -10,
            borderRadius: '50%',
            border: '3px solid #22c55e',
            animation: 'xtox-ring 1.5s ease-out infinite',
            opacity: 0,
          }} />
          <div style={{ fontSize: 52 }}>📞</div>
        </div>

        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 'bold', color: '#111' }}>
          مكالمة واردة
        </h2>
        <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: 14 }}>
          من {from}
        </p>

        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'center' }}>
          {/* Reject */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onReject}
              aria-label="رفض المكالمة"
              style={{
                background: '#ef4444',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 64,
                height: 64,
                fontSize: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(239,68,68,0.4)',
                transition: 'transform 0.1s',
              }}
            >
              ✕
            </button>
            <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>
              رفض
            </span>
          </div>

          {/* Accept */}
          <div style={{ textAlign: 'center' }}>
            <button
              onClick={onAccept}
              aria-label="قبول المكالمة"
              style={{
                background: '#22c55e',
                color: 'white',
                border: 'none',
                borderRadius: '50%',
                width: 64,
                height: 64,
                fontSize: 24,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: '0 4px 16px rgba(34,197,94,0.4)',
                transition: 'transform 0.1s',
              }}
            >
              📞
            </button>
            <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: '#22c55e', fontWeight: 600 }}>
              قبول
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}


// ─── Location message card ────────────────────────────────────────────────────
function LocationCard({ msg }) {
  return (
    <div style={{ background: '#f0f7ff', border: '1px solid #4285F4', borderRadius: 12, padding: '10px 14px', minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>📍</span>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#002f34' }}>موقعي الحالي</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={`https://www.google.com/maps?q=${msg.lat},${msg.lng}`} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, background: '#4285F4', color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          🗺️ عرض
        </a>
        <a href={`https://www.google.com/maps/dir/?api=1&destination=${msg.lat},${msg.lng}`} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, background: '#002f34', color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          🚗 اتجاهات
        </a>
      </div>
    </div>
  );
}

// ─── Main page ────────────────────────────────────────────────────────────────
export default function ChatPage() {
  const [myId, setMyId]           = useState('');
  const [targetId, setTargetId]   = useState('');
  const [joined, setJoined]       = useState(false);
  const [messages, setMessages]   = useState([]);
  const [msg, setMsg]             = useState('');
  const [callStatus, setCallStatus] = useState('idle'); // idle | calling | ringing | active | ended
  const [incomingCall, setIncomingCall] = useState(null); // { from, offer } | null
  const [isTyping, setIsTyping]   = useState(false);
  const [socket, setSocket]       = useState(null);

  const pcRef            = useRef(null);
  const remoteAudioRef   = useRef(null);
  const localStreamRef   = useRef(null);
  const messagesEndRef   = useRef(null);
  const typingTimerRef   = useRef(null);
  const socketRef        = useRef(null);

  // ── Init ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user   = JSON.parse(localStorage.getItem('user') || '{}');
      const params = new URLSearchParams(window.location.search);
      setMyId(user.id || user._id || '');
      setTargetId(params.get('target') || '');
    }
  }, []);

  // ── Auto-scroll ───────────────────────────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Join chat when myId is ready ──────────────────────────────────────────
  useEffect(() => {
    if (myId && !joined) joinChat();
  }, [myId]);

  // ── Socket setup ──────────────────────────────────────────────────────────
  async function joinChat() {
    if (!myId) return;
    const { io } = await import('socket.io-client');
    const token  = typeof window !== 'undefined'
      ? (localStorage.getItem('token') || 'guest')
      : 'guest';

    const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    socketRef.current = s;

    s.emit('join', myId);
    setJoined(true);

    // Receive message
    s.on('receive_message', (data) => {
      setMessages(prev => [
        ...prev,
        { from: data.from || targetId, text: data.text, time: Date.now() },
      ]);
    });

    // Typing indicator from remote
    s.on('typing', ({ from }) => {
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(() => setIsTyping(false), 3000);
    });

    // Incoming call — show custom modal instead of window.confirm
    s.on('incoming_call', ({ from, offer }) => {
      setCallStatus('ringing');
      setIncomingCall({ from, offer });
    });

    s.on('call_answered', async ({ answer }) => {
      if (pcRef.current) {
        await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        setCallStatus('active');
      }
    });

    s.on('ice_candidate', async (candidate) => {
      if (pcRef.current && candidate) {
        await pcRef.current.addIceCandidate(candidate).catch(() => {});
      }
    });

    s.on('call_ended', () => {
      endCall();
      setCallStatus('ended');
      setTimeout(() => setCallStatus('idle'), 2000);
    });

    setSocket(s);
    return () => s.disconnect();
  }

  // ── WebRTC helpers ────────────────────────────────────────────────────────
  function createPeerConnection(s, remoteId) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
      ],
    });
    pc.ontrack = (e) => {
      if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0];
    };
    pc.onicecandidate = (e) => {
      if (e.candidate) s.emit('ice_candidate', { to: remoteId, candidate: e.candidate });
    };
    pcRef.current = pc;
    return pc;
  }

  // ── Accept incoming call (called from modal) ──────────────────────────────
  async function acceptIncomingCall() {
    if (!incomingCall || !socketRef.current) return;
    const { from, offer } = incomingCall;
    setIncomingCall(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(socketRef.current, from);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('call_answer', { to: from, answer });
      setCallStatus('active');
    } catch {
      setCallStatus('idle');
    }
  }

  // ── Reject incoming call (called from modal) ──────────────────────────────
  function rejectIncomingCall() {
    if (!incomingCall || !socketRef.current) return;
    socketRef.current.emit('call_end', { to: incomingCall.from });
    setIncomingCall(null);
    setCallStatus('idle');
  }

  // ── Start outgoing call ───────────────────────────────────────────────────
  async function startCall() {
    if (!targetId || !socketRef.current) return;
    setCallStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(socketRef.current, targetId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('call_offer', { to: targetId, from: myId, offer });
    } catch {
      setCallStatus('idle');
    }
  }

  // ── End call ──────────────────────────────────────────────────────────────
  function endCall() {
    if (socketRef.current && targetId) socketRef.current.emit('call_end', { to: targetId });
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setCallStatus('idle');
  }

  // ── Send message ──────────────────────────────────────────────────────────
  function sendMessage() {
    if (!msg.trim() || !socketRef.current || !targetId) return;
    socketRef.current.emit('send_message', { from: myId, to: targetId, text: msg, time: Date.now() });
    setMessages(prev => [...prev, { from: 'me', text: msg, time: Date.now() }]);
    setMsg('');
  }

  // ── Emit typing event ─────────────────────────────────────────────────────
  function handleTyping(e) {
    setMsg(e.target.value);
    if (socketRef.current && targetId) {
      socketRef.current.emit('typing', { to: targetId, from: myId });
    }
  }


  // ── Share location ─────────────────────────────────────────────────────────
  const shareLocation = () => {
    if (!navigator.geolocation) return alert('GPS غير متاح');
    navigator.geolocation.getCurrentPosition(pos => {
      const { latitude: lat, longitude: lng } = pos.coords;
      const locationMsg = {
        type: 'location',
        lat,
        lng,
        label: 'موقعي الحالي',
        text: `📍 موقعي: ${lat.toFixed(5)}, ${lng.toFixed(5)}`,
        from: 'me',
        time: Date.now(),
      };
      if (socketRef.current && targetId) {
        socketRef.current.emit('send_message', { from: myId, to: targetId, ...locationMsg });
      }
      setMessages(prev => [...prev, locationMsg]);
    });
  };

  // ── Call button config ────────────────────────────────────────────────────
  const callConfig = {
    idle:    { label: '📞 مكالمة',          bg: '#16a34a', action: startCall,  disabled: false },
    calling: { label: '⏳ جار الاتصال...',   bg: '#f97316', action: undefined,  disabled: true  },
    ringing: { label: '📳 واردة...',         bg: '#22c55e', action: undefined,  disabled: true  },
    active:  { label: '⛔ إنهاء المكالمة',   bg: '#ef4444', action: endCall,   disabled: false },
    ended:   { label: '✅ انتهت',            bg: '#9ca3af', action: undefined,  disabled: true  },
  };
  const cc = callConfig[callStatus] || callConfig.idle;

  // ─────────────────────────────────────────────────────────────────────────
  return (
    <div
      dir="rtl"
      lang="ar"
      style={{
        height: '100dvh',
        display: 'flex',
        flexDirection: 'column',
        fontFamily: "'Cairo', 'Noto Sans Arabic', system-ui, sans-serif",
        background: '#f1f5f9',
        overflow: 'hidden',
      }}
    >
      {/* Hidden audio element for remote WebRTC stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* ── Incoming call modal ── */}
      {incomingCall && (
        <IncomingCallModal
          from={incomingCall.from}
          onAccept={acceptIncomingCall}
          onReject={rejectIncomingCall}
        />
      )}

      {/* ── Header ── */}
      <header
        role="banner"
        style={{
          background: '#1e293b',
          color: 'white',
          padding: '12px 16px',
          display: 'flex',
          alignItems: 'center',
          gap: 12,
          flexShrink: 0,
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)',
        }}
      >
        <button
          onClick={() => history.back()}
          aria-label="العودة للخلف"
          style={{
            background: 'rgba(255,255,255,0.12)',
            border: 'none',
            color: 'white',
            fontSize: 18,
            cursor: 'pointer',
            borderRadius: 8,
            width: 36,
            height: 36,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          →
        </button>

        {/* Avatar placeholder */}
        <div
          aria-hidden="true"
          style={{
            width: 40,
            height: 40,
            borderRadius: '50%',
            background: '#f97316',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            fontSize: 18,
            flexShrink: 0,
          }}
        >
          👤
        </div>

        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {targetId ? `محادثة مع ${targetId}` : 'اختر محادثة للبدء'}
          </p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
            {joined ? '🟢 متصل' : '⏳ جار الاتصال...'}
          </p>
        </div>

        {targetId && (
          <button
            onClick={cc.action}
            disabled={cc.disabled}
            aria-label={callStatus === 'active' ? 'إنهاء المكالمة الصوتية' : 'بدء مكالمة صوتية'}
            style={{
              background: cc.bg,
              color: 'white',
              border: 'none',
              padding: '8px 14px',
              borderRadius: 20,
              cursor: cc.disabled ? 'not-allowed' : 'pointer',
              fontSize: 13,
              fontWeight: 'bold',
              fontFamily: 'inherit',
              opacity: cc.disabled ? 0.65 : 1,
              transition: 'background 0.25s, opacity 0.2s',
              whiteSpace: 'nowrap',
              flexShrink: 0,
            }}
          >
            {cc.label}
          </button>
        )}
      </header>

      {/* ── Messages area ── */}
      <main
        role="log"
        aria-label="سجل المحادثة"
        aria-live="polite"
        style={{
          flex: 1,
          overflowY: 'auto',
          padding: '16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 6,
        }}
      >
        {/* Empty state: no target selected */}
        {!targetId && (
          <div
            role="status"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              paddingTop: 80,
              textAlign: 'center',
              gap: 12,
            }}
          >
            <div style={{ fontSize: 72 }}>💬</div>
            <p style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: '#64748b' }}>
              اختر محادثة للبدء
            </p>
            <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', maxWidth: 260, lineHeight: 1.6 }}>
              ابحث عن إعلان وتواصل مع البائع مباشرةً
            </p>
          </div>
        )}

        {/* Empty state: target selected but no messages yet */}
        {targetId && messages.length === 0 && (
          <div
            role="status"
            style={{
              flex: 1,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#94a3b8',
              paddingTop: 60,
              textAlign: 'center',
              gap: 10,
            }}
          >
            <div style={{ fontSize: 56 }}>💬</div>
            <p style={{ margin: 0, fontSize: 16, color: '#64748b', fontWeight: 600 }}>
              ابدأ المحادثة
            </p>
            <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>
              أرسل رسالة للتواصل مع {targetId}
            </p>
          </div>
        )}

        {/* Message bubbles */}
        {messages.map((m, i) => {
          const isSent = m.from === 'me';
          return (
            <div
              key={i}
              dir="ltr"
              style={{
                display: 'flex',
                justifyContent: isSent ? 'flex-end' : 'flex-start',
              }}
            >
              {m.type === 'location' ? (
                <div>
                  <LocationCard msg={m} />
                  <div style={{ fontSize: 11, marginTop: 4, opacity: 0.65, textAlign: isSent ? 'left' : 'right', color: '#64748b' }}>
                    {arabicRelTime(m.time)}
                  </div>
                </div>
              ) : (
                <div
                  dir="rtl"
                  role="article"
                  aria-label={isSent ? 'رسالتك' : `رسالة من ${m.from}`}
                  style={{
                    maxWidth: '75%',
                    padding: '10px 14px',
                    borderRadius: isSent
                      ? '18px 18px 4px 18px'
                      : '18px 18px 18px 4px',
                    background: isSent ? '#f97316' : '#ffffff',
                    color: isSent ? '#ffffff' : '#1e293b',
                    boxShadow: '0 1px 4px rgba(0,0,0,0.10)',
                    fontSize: 15,
                    lineHeight: 1.55,
                    wordBreak: 'break-word',
                  }}
                >
                  <div>{m.text}</div>
                  <div
                    style={{
                      fontSize: 11,
                      marginTop: 4,
                      opacity: 0.65,
                      textAlign: isSent ? 'left' : 'right',
                    }}
                  >
                    {arabicRelTime(m.time)}
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {/* Typing indicator */}
        {isTyping && <TypingDots />}

        <div ref={messagesEndRef} aria-hidden="true" />
      </main>

      {/* ── Input area ── */}
      {targetId && (
        <footer
          style={{
            background: '#ffffff',
            padding: '10px 14px',
            display: 'flex',
            gap: 10,
            alignItems: 'center',
            boxShadow: '0 -2px 8px rgba(0,0,0,0.07)',
            flexShrink: 0,
            direction: 'rtl',
          }}
        >
          <button
            onClick={shareLocation}
            aria-label="مشاركة الموقع"
            title="مشاركة موقعي الحالي"
            style={{
              background: '#f0f7ff',
              border: '1.5px solid #4285F4',
              borderRadius: '50%',
              width: 46,
              height: 46,
              cursor: 'pointer',
              fontSize: 20,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s',
            }}
          >
            📍
          </button>
          <input
            value={msg}
            onChange={handleTyping}
            onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="اكتب رسالة..."
            dir="rtl"
            aria-label="حقل كتابة الرسالة"
            style={{
              flex: 1,
              padding: '11px 16px',
              borderRadius: 24,
              border: '1.5px solid #e2e8f0',
              fontSize: 15,
              fontFamily: 'inherit',
              outline: 'none',
              background: '#f8fafc',
              transition: 'border-color 0.2s',
              color: '#1e293b',
            }}
            onFocus={e => { e.target.style.borderColor = '#f97316'; }}
            onBlur={e => { e.target.style.borderColor = '#e2e8f0'; }}
          />
          <button
            onClick={sendMessage}
            disabled={!msg.trim()}
            aria-label="إرسال الرسالة"
            style={{
              background: msg.trim() ? '#f97316' : '#e2e8f0',
              color: msg.trim() ? '#ffffff' : '#94a3b8',
              border: 'none',
              borderRadius: '50%',
              width: 46,
              height: 46,
              cursor: msg.trim() ? 'pointer' : 'not-allowed',
              fontSize: 18,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
              transition: 'background 0.2s, color 0.2s',
            }}
          >
            ↑
          </button>
        </footer>
      )}

      {/* ── Animation keyframes ── */}
      <style>{`
        @keyframes xtox-bounce {
          0%, 60%, 100% { transform: translateY(0);  opacity: 0.35; }
          30%            { transform: translateY(-7px); opacity: 1;    }
        }
        @keyframes xtox-pop {
          from { transform: scale(0.85); opacity: 0; }
          to   { transform: scale(1);    opacity: 1; }
        }
        @keyframes xtox-ring {
          0%   { transform: scale(0.9); opacity: 0.7; }
          100% { transform: scale(1.6); opacity: 0;   }
        }
      `}</style>
    </div>
  );
}
