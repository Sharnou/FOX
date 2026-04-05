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

  const t = T[lang] || T.ar;
  const isRTL = lang === 'ar';

  // Don't render if viewer IS the seller
  if (myId && targetId && String(myId) === String(targetId)) return null;

  // Open chat — create/resume session
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
        body: JSON.stringify({ targetId: targetId, adId: adId }),
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
      console.error('[ChatBox] open error:', e);
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
            return [...prev, { ...msg, createdAt: msg.createdAt || new Date().toISOString() }];
          });
        }
      });
    }).catch(() => {});
  };

  useEffect(() => {
    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (bottomRef.current) {
      bottomRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const sendMessage = useCallback(async () => {
    if (!text.trim() || !chatId || sending) return;
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token) return;
    const msgText = text.trim();
    setText('');
    setSending(true);
    const optimisticId = 'tmp_' + Date.now();
    const optimistic = {
      _id: optimisticId,
      sender: myId,
      text: msgText,
      createdAt: new Date().toISOString(),
      _optimistic: true,
    };
    setMessages(prev => [...prev, optimistic]);
    try {
      const res = await fetch(API + '/api/chat/' + chatId + '/messages', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + token,
        },
        body: JSON.stringify({ text: msgText }),
      });
      const data = await res.json();
      const savedMsg = data.message || data;
      setMessages(prev => prev.map(m => m._id === optimisticId ? { ...savedMsg, _optimistic: false } : m));
      // Also emit via socket for real-time delivery to other party
      if (socketRef.current && targetId) {
        socketRef.current.emit('send_message', {
          to: targetId,
          from: myId,
          text: msgText,
          chatId: chatId,
        });
      }
    } catch {
      setMessages(prev => prev.filter(m => m._id !== optimisticId));
    }
    setSending(false);
  }, [text, chatId, sending, myId, targetId]);

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  const sellerDisplayName = otherName || t.seller;

  return (
    <div dir={isRTL ? 'rtl' : 'ltr'} style={{ fontFamily: isRTL ? "'Cairo','Tajawal',sans-serif" : 'inherit' }}>
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
          display: 'flex', flexDirection: 'column', height: 420,
          boxShadow: '0 8px 32px rgba(124,58,237,0.12)', marginTop: 8, background: '#fff',
        }}>
          {/* Header */}
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
                  {(sellerDisplayName[0] || '?').toUpperCase()}
                </div>
              )}
              <span style={{ color: '#fff', fontWeight: 700, fontSize: 14 }}>{sellerDisplayName}</span>
            </div>
            <button onClick={() => setOpen(false)} style={{
              background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff',
              borderRadius: 8, width: 28, height: 28, cursor: 'pointer', fontSize: 16,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}>{t.close}</button>
          </div>

          {/* Messages */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '12px 14px', background: '#f9fafb' }}>
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
                  <div key={msg._id || i} style={{
                    display: 'flex', justifyContent: isOwn ? 'flex-end' : 'flex-start', marginBottom: 10,
                  }}>
                    <div style={{
                      maxWidth: '75%', padding: '9px 13px',
                      borderRadius: isOwn ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                      background: isOwn ? 'linear-gradient(135deg, #7c3aed, #4f46e5)' : '#fff',
                      color: isOwn ? '#fff' : '#1f2937', fontSize: 14, lineHeight: 1.5,
                      boxShadow: '0 1px 4px rgba(0,0,0,0.08)',
                      opacity: msg._optimistic ? 0.7 : 1,
                      wordBreak: 'break-word',
                    }}>
                      {msg.text}
                    </div>
                  </div>
                );
              })
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input */}
          <div style={{
            padding: '10px 12px', borderTop: '1px solid #e5e7eb',
            display: 'flex', gap: 8, flexShrink: 0, background: '#fff',
          }}>
            <input
              value={text}
              onChange={e => setText(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.placeholder}
              disabled={loading || !chatId}
              style={{
                flex: 1, padding: '9px 14px', borderRadius: 12,
                border: '1.5px solid #e5e7eb', fontSize: 14, outline: 'none',
                fontFamily: 'inherit', direction: isRTL ? 'rtl' : 'ltr',
                background: '#f9fafb',
              }}
            />
            <button
              onClick={sendMessage}
              disabled={!text.trim() || sending || loading || !chatId}
              style={{
                padding: '9px 18px', borderRadius: 12, border: 'none',
                background: (!text.trim() || sending || loading || !chatId) ? '#e5e7eb'
                  : 'linear-gradient(135deg, #7c3aed, #4f46e5)',
                color: (!text.trim() || sending || loading || !chatId) ? '#9ca3af' : '#fff',
                fontWeight: 700, fontSize: 14, cursor: (!text.trim() || sending) ? 'not-allowed' : 'pointer',
                fontFamily: 'inherit', flexShrink: 0,
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
