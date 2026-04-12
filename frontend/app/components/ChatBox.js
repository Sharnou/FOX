'use client';
import { useState, useEffect, useRef, useCallback } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://xtox-production.up.railway.app';

const T = {
  ar: {
    btn: '\u{1F4AC} \u0631\u0627\u0633\u0644 \u0627\u0644\u0628\u0627\u0626\u0639',
    loginBtn: '\u{1F4AC} \u0633\u062c\u0644 \u062f\u062e\u0648\u0644 \u0644\u0644\u062a\u0648\u0627\u0635\u0644',
    placeholder: '\u0627\u0643\u062a\u0628 \u0631\u0633\u0627\u0644\u0629...',
    send: '\u0625\u0631\u0633\u0627\u0644',
    sending: '\u062c\u0627\u0631\u064a...',
    loading: '\u062c\u0627\u0631\u064a \u062a\u062d\u0645\u064a\u0644...',
    empty: '\u0627\u0628\u062f\u0623 \u0627\u0644\u0645\u062d\u0627\u062f\u062b\u0629',
    close: '\u00d7',
    seller: '\u0627\u0644\u0628\u0627\u0626\u0639',
    error: '\u062d\u062f\u062b \u062e\u0637\u0623\u060c \u062d\u0627\u0648\u0644 \u0645\u062c\u062f\u062f\u0627\u064b',
  },
  en: {
    btn: '\u{1F4AC} Chat with Seller',
    loginBtn: '\u{1F4AC} Login to Chat',
    placeholder: 'Type a message...',
    send: 'Send',
    sending: 'Sending...',
    loading: 'Loading chat...',
    empty: 'Start the conversation!',
    close: '\u00d7',
    seller: 'Seller',
    error: 'Something went wrong. Try again.',
  },
};

// ── Haversine distance formula ────────────────────────────────────────────────
function haversine(lat1, lon1, lat2, lon2) {
  const R = 6371;
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// ── Web Audio cartoon sounds ──────────────────────────────────────────────────
function playCartoonSound(type) {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    if (type === 'send') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(400, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(800, ctx.currentTime + 0.1);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.2);
      gain.gain.setValueAtTime(0.3, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.3);
    } else if (type === 'receive') {
      osc.type = 'square';
      osc.frequency.setValueAtTime(300, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(600, ctx.currentTime + 0.05);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.15);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 0.15);
    }
  } catch {}
}

// ── Quick emoji reactions ─────────────────────────────────────────────────────
const QUICK_EMOJIS = ['😂', '❤️', '👍', '🔥', '😮', '😢'];

// ── Cartoon SVG characters ────────────────────────────────────────────────────
function MyCharacter({ isTyping }) {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" style={{
      animation: isTyping ? 'bob 0.6s ease-in-out infinite' : 'none',
      filter: 'drop-shadow(0 4px 8px rgba(102,126,234,0.4))',
    }}>
      <circle cx="25" cy="25" r="22" fill="url(#myGrad)" />
      <defs>
        <radialGradient id="myGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#a5b4fc" />
          <stop offset="100%" stopColor="#4f46e5" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="20" r="4" fill="white" opacity="0.95" />
      <circle cx="32" cy="20" r="4" fill="white" opacity="0.95" />
      <circle cx="19" cy="21" r="2" fill="#312e81" />
      <circle cx="33" cy="21" r="2" fill="#312e81" />
      <circle cx="19.5" cy="20" r="0.8" fill="white" />
      <circle cx="33.5" cy="20" r="0.8" fill="white" />
      <path d="M 16 31 Q 25 38 34 31" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="25" cy="10" r="3" fill="#818cf8" opacity="0.7" />
    </svg>
  );
}

function TheirCharacter({ isWaiting }) {
  return (
    <svg width="50" height="50" viewBox="0 0 50 50" style={{
      animation: isWaiting ? 'think 1.2s ease-in-out infinite' : 'none',
      filter: 'drop-shadow(0 4px 8px rgba(245,87,108,0.4))',
    }}>
      <circle cx="25" cy="25" r="22" fill="url(#theirGrad)" />
      <defs>
        <radialGradient id="theirGrad" cx="40%" cy="35%">
          <stop offset="0%" stopColor="#fda4af" />
          <stop offset="100%" stopColor="#f5576c" />
        </radialGradient>
      </defs>
      <circle cx="18" cy="20" r="4" fill="white" opacity="0.95" />
      <circle cx="32" cy="20" r="4" fill="white" opacity="0.95" />
      <circle cx="19" cy="21" r="2" fill="#9f1239" />
      <circle cx="33" cy="21" r="2" fill="#9f1239" />
      <circle cx="19.5" cy="20" r="0.8" fill="white" />
      <circle cx="33.5" cy="20" r="0.8" fill="white" />
      <path d="M 17 33 Q 25 38 33 33" stroke="white" strokeWidth="2.5" fill="none" strokeLinecap="round" />
      <circle cx="38" cy="8" r="2" fill="#fda4af" opacity="0.8" />
      <circle cx="44" cy="5" r="1.5" fill="#fda4af" opacity="0.5" />
    </svg>
  );
}

export default function ChatBox({ targetId, adId, otherName, otherAvatar }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [chatId, setChatId] = useState(null);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [myId, setMyId] = useState(null);
  const [lang, setLang] = useState('ar');
  const [error, setError] = useState(null);
  // Change 3: ad location state
  const [adCity, setAdCity] = useState('');
  const [adDistance, setAdDistance] = useState(null);
  // Typing/waiting animation state
  const [isTyping, setIsTyping] = useState(false);
  const [isWaiting, setIsWaiting] = useState(false);
  // Track last message count to play receive sound
  const prevMsgCount = useRef(0);
  const socketRef = useRef(null);
  const bottomRef = useRef(null);

  // Detect lang and user
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const storedLang = localStorage.getItem('xtox_lang') || 'ar';
      setLang(storedLang);
      const u = JSON.parse(localStorage.getItem('user') || '{}');
      setMyId(u.id || u._id || null);
    } catch {}
  }, []);

  // Change 3: Fetch ad details for location display
  useEffect(() => {
    if (!adId) return;
    fetch(API + '/api/ads/' + adId)
      .then(r => r.ok ? r.json() : null)
      .then(ad => {
        if (!ad) return;
        if (ad.city) setAdCity(ad.city);
        // Get user GPS non-blocking and calculate distance
        if (ad.location?.coordinates && navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
            (pos) => {
              const [adLon, adLat] = ad.location.coordinates;
              const dist = haversine(pos.coords.latitude, pos.coords.longitude, adLat, adLon);
              setAdDistance(dist);
            },
            () => {}, // silent fail
            { timeout: 5000 }
          );
        }
      })
      .catch(() => {});
  }, [adId]);

  // Socket cleanup on unmount
  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  // Auto-scroll to latest message
  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Play receive sound when new messages arrive
  useEffect(() => {
    if (messages.length > prevMsgCount.current) {
      const lastMsg = messages[messages.length - 1];
      const senderId = lastMsg?.sender ? (typeof lastMsg.sender === 'object' ? (lastMsg.sender._id || lastMsg.sender.id) : lastMsg.sender) : null;
      // Only play receive sound for messages from the other party
      if (senderId && myId && String(senderId) !== String(myId)) {
        playCartoonSound('receive');
        setIsWaiting(false);
      }
    }
    prevMsgCount.current = messages.length;
  }, [messages, myId]);

  // Track typing state
  useEffect(() => {
    setIsTyping(text.length > 0);
  }, [text]);

  const sendMessage = useCallback(async (msgText) => {
    const textToSend = msgText || text;
    if (!textToSend.trim() || !chatId || sending) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    if (!msgText) setText('');
    setSending(true);
    setIsWaiting(true);
    const optimisticId = 'tmp_' + Date.now();
    const optimistic = {
      _id: optimisticId,
      sender: myId,
      text: textToSend.trim(),
      createdAt: new Date().toISOString(),
      _optimistic: true,
      _new: true,
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const res = await fetch(API + '/api/chat/' + chatId + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ text: textToSend.trim() }),
      });
      const data = await res.json();
      const savedMsg = data.message || data;
      setMessages(prev => prev.map(m => m._id === optimisticId ? { ...savedMsg, _optimistic: false, _new: true } : m));
      playCartoonSound('send');
      if (socketRef.current && targetId) {
        socketRef.current.emit('send_message', {
          to: targetId,
          from: myId,
          text: textToSend.trim(),
          chatId: chatId,
        });
      }
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimisticId));
      setIsWaiting(false);
    }
    setSending(false);
  }, [text, chatId, sending, myId, targetId]);

  // --- END OF HOOKS ---

  const t = T[lang] || T.ar;
  const isRTL = lang === 'ar';

  if (myId && targetId && String(myId) === String(targetId)) return null;

  const handleOpen = async () => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) {
      window.location.href = '/login';
      return;
    }
    setOpen(true);
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(API + '/api/chat/start', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ sellerId: targetId, targetId: targetId, adId: adId }),
      });
      const data = await res.json();
      const cid = data.chatId || data._id || (data.chat && data.chat._id);
      if (cid) {
        setChatId(cid);
        await loadMessages(cid, token);
        connectSocket(cid, token);
      } else {
        setError(t.error);
      }
    } catch (e) {
      setError(t.error);
    }
    setLoading(false);
  };

  const loadMessages = async (cid, token) => {
    try {
      const res = await fetch(API + '/api/chat/' + cid + '/messages', {
        headers: { 'Authorization': 'Bearer ' + token },
      });
      if (!res.ok) return;
      const data = await res.json();
      const msgs = Array.isArray(data) ? data : (data.messages || []);
      setMessages(msgs.slice().reverse());
    } catch {}
  };

  const connectSocket = (cid, token) => {
    if (typeof window === 'undefined') return;
    import('socket.io-client').then(({ io }) => {
      const s = io(SOCKET_URL, {
        auth: { token },
        transports: ['websocket', 'polling'],
      });
      socketRef.current = s;
      try {
        const u = JSON.parse(localStorage.getItem('user') || '{}');
        if (u.id || u._id) s.emit('join', u.id || u._id);
      } catch {}
      s.on('receive_message', (msg) => {
        if (msg.chatId === cid || msg.to === myId || msg.from === targetId) {
          setMessages(prev => {
            const exists = prev.some(m => m._id && m._id === msg._id);
            if (exists) return prev;
            return [...prev, { ...msg, createdAt: msg.createdAt || new Date().toISOString(), _new: true }];
          });
        }
      });
    }).catch(() => {});
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sellerDisplayName = otherName || t.seller;

  // Format distance
  const distLabel = adDistance !== null
    ? (adDistance < 1 ? Math.round(adDistance * 1000) + ' م' : adDistance.toFixed(1) + ' كم')
    : null;

  const locationLine = adCity
    ? ('📍 ' + adCity + (distLabel ? '  •  ' + distLabel : ''))
    : null;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: isRTL ? "'Cairo','Tajawal',sans-serif" : 'inherit' }}>
      {/* Change 5: Keyframe animations */}
      <style>{`
        @keyframes bob {
          0%,100% { transform: translateY(0) rotate(-3deg); }
          50% { transform: translateY(-8px) rotate(3deg); }
        }
        @keyframes think {
          0%,100% { transform: rotate(-8deg); }
          50% { transform: rotate(8deg); }
        }
        @keyframes cartoonPop {
          0% { transform: scale(0) rotate(-5deg); opacity: 0; }
          60% { transform: scale(1.15) rotate(2deg); }
          80% { transform: scale(0.95) rotate(-1deg); }
          100% { transform: scale(1) rotate(0deg); opacity: 1; }
        }
        .cartoon-msg { animation: cartoonPop 0.4s cubic-bezier(0.68,-0.55,0.265,1.55); }
        .cartoon-msg-sent:hover {
          transform: perspective(200px) rotateY(-2deg) scale(1.02) translateY(-2px) !important;
        }
      `}</style>

      {!open ? (
        <button
          onClick={handleOpen}
          style={{
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            width: '100%', padding: '13px 20px', borderRadius: 14, border: 'none',
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            color: '#fff', fontSize: 15, fontWeight: 700, cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(124,58,237,0.35)', marginTop: 8,
            fontFamily: 'inherit',
          }}
        >
          {t.btn}
        </button>
      ) : (
        <div style={{
          border: '1.5px solid #e5e7eb', borderRadius: 18, overflow: 'hidden',
          display: 'flex', flexDirection: 'column', height: 480,
          boxShadow: '0 8px 32px rgba(124,58,237,0.15)', marginTop: 8,
          // Change 5: Gradient background
          background: 'linear-gradient(135deg, #667eea22 0%, #764ba222 50%, #f093fb22 100%)',
          position: 'relative',
        }}>
          {/* Change 5: Header */}
          <div style={{
            background: 'linear-gradient(135deg, #7c3aed, #4f46e5)',
            padding: '12px 16px', display: 'flex', alignItems: 'center',
            justifyContent: 'space-between', flexShrink: 0,
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
              {otherAvatar ? (
                <img src={otherAvatar} alt={sellerDisplayName}
                  style={{ width: 34, height: 34, borderRadius: '50%', objectFit: 'cover', border: '2px solid rgba(255,255,255,0.4)' }} />
              ) : (
                <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'rgba(255,255,255,0.25)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 15 }}>
                  {((sellerDisplayName && sellerDisplayName[0]) || '?').toUpperCase()}
                </div>
              )}
              <div>
                {/* Change 3: location under seller name */}
                <span style={{ color: '#fff', fontWeight: 700, fontSize: 14, display: 'block' }}>{sellerDisplayName}</span>
                {locationLine && (
                  <span style={{ color: 'rgba(255,255,255,0.8)', fontSize: 11, display: 'block', marginTop: 1 }}>
                    {locationLine}
                  </span>
                )}
              </div>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{t.close}</button>
          </div>

          {/* Change 5: Messages with cartoon bubbles */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', position: 'relative' }}>
            {loading ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: 60, fontSize: 14 }}>{t.loading}</div>
            ) : error ? (
              <div style={{ textAlign: 'center', color: '#ef4444', paddingTop: 60, fontSize: 14 }}>{error}</div>
            ) : messages.length === 0 ? (
              <div style={{ textAlign: 'center', color: '#9ca3af', paddingTop: 60, fontSize: 14 }}>{t.empty}</div>
            ) : (
              messages.map((msg, i) => {
                const senderId = msg.sender ? (typeof msg.sender === 'object' ? (msg.sender._id || msg.sender.id) : msg.sender) : null;
                const isOwn = senderId && myId && String(senderId) === String(myId);
                return (
                  <div key={msg._id || i} className={msg._new ? 'cartoon-msg' : ''} style={{
                    display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 12,
                  }}>
                    <div
                      className={isOwn ? 'cartoon-msg-sent' : ''}
                      style={{
                        maxWidth: '75%', padding: '10px 14px',
                        // Change 5: Cartoon 3D speech bubbles
                        borderRadius: isOwn ? '20px 20px 4px 20px' : '20px 20px 20px 4px',
                        background: isOwn
                          ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                          : 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)',
                        color: '#fff',
                        fontSize: 14, lineHeight: 1.5,
                        boxShadow: isOwn
                          ? '4px 4px 0px #4a3a8a, 0 8px 20px rgba(102,126,234,0.4)'
                          : '-4px 4px 0px #c0394a, 0 8px 20px rgba(245,87,108,0.4)',
                        transform: isOwn
                          ? 'perspective(200px) rotateY(-2deg)'
                          : 'perspective(200px) rotateY(2deg)',
                        transition: 'transform 0.2s',
                        opacity: msg._optimistic ? 0.7 : 1,
                        wordBreak: 'break-word',
                        cursor: 'default',
                      }}
                    >
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />

            {/* Change 5: Cartoon characters at bottom corners */}
            {!loading && !error && (
              <>
                <div style={{
                  position: 'sticky', bottom: 0, left: 0, right: 0,
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end',
                  pointerEvents: 'none', paddingTop: 8,
                }}>
                  <TheirCharacter isWaiting={isWaiting} />
                  <MyCharacter isTyping={isTyping} />
                </div>
              </>
            )}
          </div>

          {/* Change 5: Quick emoji reactions */}
          <div style={{
            padding: '6px 12px', borderTop: '1px solid rgba(99,102,241,0.12)',
            display: 'flex', gap: 6, flexShrink: 0, justifyContent: 'center',
            background: 'rgba(255,255,255,0.6)', backdropFilter: 'blur(8px)',
          }}>
            {QUICK_EMOJIS.map(emoji => (
              <button
                key={emoji}
                onClick={() => sendMessage(emoji)}
                disabled={!chatId || loading}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  fontSize: 22, padding: '2px 4px', borderRadius: 8,
                  transition: 'transform 0.15s',
                  transform: 'scale(1)',
                  lineHeight: 1,
                }}
                onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.3)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
              >
                {emoji}
              </button>
            ))}
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid rgba(99,102,241,0.12)',
            display: 'flex', gap: 8, flexShrink: 0,
            background: 'rgba(255,255,255,0.8)', backdropFilter: 'blur(8px)',
          }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              disabled={loading || !chatId}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 12,
                border: '1.5px solid rgba(99,102,241,0.2)', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', direction: isRTL ? 'rtl' : 'ltr',
                background: 'rgba(255,255,255,0.9)',
              }}
            />
            <button
              onClick={() => sendMessage()}
              disabled={!text.trim() || sending || loading || !chatId}
              style={{
                padding: '9px 18px', borderRadius: 12, border: 'none',
                background: (!text.trim() || sending || loading || !chatId) ? '#e5e7eb'
                  : 'linear-gradient(135deg, #667eea, #764ba2)',
                color: (!text.trim() || sending || loading || !chatId) ? '#9ca3af' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: (!text.trim() || sending) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
                boxShadow: (!text.trim() || sending || loading || !chatId) ? 'none' : '0 4px 12px rgba(102,126,234,0.4)',
              }}
            >
              {sending ? t.sending : t.send}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
