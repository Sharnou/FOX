'use client';
import { useState, useEffect, useRef } from 'react';
import { useLanguage } from '../context/LanguageContext';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API;

export default function ChatFloat() {
  const { t: tr, language, isRTL } = useLanguage();
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { chatId, targetId, name, avatar }
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  // FIX B: top-level error state — if anything throws, silently hide the widget
  const [hasError, setHasError] = useState(false);
  // Action menu per conversation
  const [menuOpenId, setMenuOpenId] = useState(null);
  // ── FEATURE 3: real-time presence ──────────────────────────────────────
  const [onlineUsers, setOnlineUsers] = useState({}); // { [userId]: boolean }
  // ── FEATURE 4: incoming call banner ────────────────────────────────────
  const [incomingCall, setIncomingCall] = useState(null); // { callerId, callerName, callerSocketId }
  const socketRef = useRef(null);       // active mini-chat socket
  const presenceRef = useRef(null);     // persistent presence/call socket
  const messagesEndRef = useRef(null);

  // Load user from localStorage (with token fallback for backwards compat)
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        // If user object has no token (old format), attach it from standalone key
        if (!u.token) {
          const t = localStorage.getItem('token') || '';
          if (t) u.token = t;
        }
        setUser(u);
      }
    } catch {
      setHasError(true);
    }
  }, []);

  // FIX Bug 2: extract stable token string — avoids re-running effect on every render
  const userToken = user?.token || null;

  // Fetch unread count for badge (every 30s)
  useEffect(() => {
    if (!userToken) return;
    const fetchUnread = () => {
      // Skip if offline — avoid failed request spam
      if (typeof navigator !== 'undefined' && !navigator.onLine) return;
      fetch(`${API}/api/chat/unread-count`, { headers: { Authorization: `Bearer ${userToken}` } })
        .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
        .then(d => setUnreadTotal(d.count || d.unreadCount || 0))
        .catch(() => {});
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, [userToken]);

  // Fetch conversations when panel opens
  const fetchConversations = () => {
    if (!user?.token) return;
    setLoading(true);
    fetch(`${API}/api/chat`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        const list = Array.isArray(data) ? data : (data.chats || []);
        setConversations(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    if (!open || !userToken) return;
    fetchConversations();
  }, [open, userToken]);

  // ── FEATURE 3 + 4: Persistent presence socket ───────────────────────────
  // This socket stays connected as long as the user is logged in.
  // It handles: presence updates, incoming call notifications.
  useEffect(() => {
    if (!userToken || !user) return;
    let cancelled = false;

    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      const sock = io(SOCKET_URL, {
        auth: { token: userToken },
        transports: ['websocket', 'polling'],
        reconnection: true,
        reconnectionDelay: 3000,
      });
      presenceRef.current = sock;

      // Store globally so other parts of app can reuse
      if (typeof window !== 'undefined') window.__xtoxSocket = sock;

      const myId = (user?.id || user?._id || '').toString();

      const setup = () => {
        // Join personal room
        if (myId) {
          sock.emit('join', myId);
          sock.emit('user:online', myId);
        }
      };

      if (sock.connected) setup();
      sock.on('connect', setup);
      sock.on('reconnect', setup);

      // Listen for presence changes (broadcast by backend on connect/disconnect)
      sock.on('user:status', ({ userId, isOnline }) => {
        if (!userId) return;
        setOnlineUsers(prev => ({ ...prev, [String(userId)]: !!isOnline }));
      });

      // Also handle legacy user_online / user_offline events
      sock.on('user_online', ({ userId }) => {
        if (userId) setOnlineUsers(prev => ({ ...prev, [String(userId)]: true }));
      });
      sock.on('user_offline', ({ userId }) => {
        if (userId) setOnlineUsers(prev => ({ ...prev, [String(userId)]: false }));
      });

      // ── FEATURE 4: Incoming call via presence socket ──────────────────────
      sock.on('call:incoming', ({ callerId, callerName, callerSocketId, callerAvatar }) => {
        setIncomingCall({
          callerId: callerId || callerSocketId,
          callerName: callerName || 'مستخدم XTOX',
          callerSocketId: callerSocketId || '',
          callerAvatar: callerAvatar || '',
        });
        // Play ringtone
        try {
          const audio = new Audio('/sounds/ringtone.wav');
          audio.loop = true; audio.volume = 0.7;
          audio.play().catch(() => {});
          if (typeof window !== 'undefined') window.__chatFloatRingtone = audio;
        } catch {}
      });

      sock.on('call:cancelled', () => {
        stopRingtoneFloat();
        setIncomingCall(null);
      });

      sock.on('call:ended', () => {
        stopRingtoneFloat();
        setIncomingCall(null);
      });
    }).catch(() => {});

    return () => {
      cancelled = true;
      if (presenceRef.current) {
        presenceRef.current.off('user:status');
        presenceRef.current.off('user_online');
        presenceRef.current.off('user_offline');
        presenceRef.current.off('call:incoming');
        presenceRef.current.off('call:cancelled');
        presenceRef.current.off('call:ended');
        presenceRef.current.off('connect');
        presenceRef.current.off('reconnect');
        presenceRef.current.disconnect();
        presenceRef.current = null;
        if (typeof window !== 'undefined') window.__xtoxSocket = null;
      }
    };
  }, [userToken]);

  // Check initial presence when conversations load
  useEffect(() => {
    if (!conversations.length || !presenceRef.current) return;
    const myId = (user?.id || user?._id || '').toString();
    const partnerIds = conversations.map(conv => {
      const buyerId = conv.buyer?._id?.toString() || conv.buyer?.toString() || '';
      const sellerId = conv.seller?._id?.toString() || conv.seller?.toString() || '';
      return buyerId === myId ? sellerId : buyerId;
    }).filter(Boolean);

    if (!partnerIds.length) return;

    const sock = presenceRef.current;
    if (sock && sock.connected) {
      sock.emit('presence:check', { userIds: partnerIds }, (statuses) => {
        if (!statuses || typeof statuses !== 'object') return;
        setOnlineUsers(prev => ({
          ...prev,
          ...Object.fromEntries(
            Object.entries(statuses).map(([k, v]) => [k, v === 'online'])
          )
        }));
      });
    }
  }, [conversations]);

  function stopRingtoneFloat() {
    if (typeof window !== 'undefined' && window.__chatFloatRingtone) {
      try { window.__chatFloatRingtone.pause(); window.__chatFloatRingtone.currentTime = 0; } catch {}
      window.__chatFloatRingtone = null;
    }
  }

  // ── FEATURE 1 + 2: initiateCall / acceptCall / declineCall ─────────────
  function initiateCall(targetUserId, targetName) {
    if (!targetUserId) return;
    // Navigate to call page — CallManager on that page handles full WebRTC
    const url = `/call?to=${encodeURIComponent(targetUserId)}&name=${encodeURIComponent(targetName || '')}`;
    window.location.href = url;
  }

  function acceptCall() {
    if (!incomingCall) return;
    stopRingtoneFloat();
    const { callerId, callerName } = incomingCall;
    setIncomingCall(null);
    // Navigate to call page with answer=true; call page will accept via CallManager
    window.location.href = `/call?answer=true&from=${encodeURIComponent(callerId)}&name=${encodeURIComponent(callerName || '')}`;
  }

  function declineCall() {
    if (!incomingCall) return;
    stopRingtoneFloat();
    const { callerSocketId, callerId } = incomingCall;
    setIncomingCall(null);
    const sock = presenceRef.current;
    if (sock) {
      sock.emit('call:decline', { callerSocketId, callerId });
    }
  }

  // Socket connection for active mini-chat
  useEffect(() => {
    if (!activeChat || !user?.token) return;
    let cancelled = false;
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      const socket = io(SOCKET_URL, { auth: { token: user.token }, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      const uid = user.id || user._id;
      if (socket.connected && uid) {
        socket.emit('join', uid);
      } else if (uid) {
        socket.on('connect', () => socket.emit('join', uid));
      }
      socket.on('receive_message', (data) => {
        const soundMuted = localStorage.getItem('xtox_mute_sounds') === 'true';
        if (!soundMuted) {
          try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const osc = ctx.createOscillator();
            const gain = ctx.createGain();
            osc.connect(gain); gain.connect(ctx.destination);
            osc.frequency.value = 880; gain.gain.value = 0.1;
            osc.start(); osc.stop(ctx.currentTime + 0.15);
            setTimeout(() => ctx.close(), 500);
          } catch {}
        }
        setMessages(prev => [...prev, {
          _id: data._id || String(Date.now()),
          from: data.from || data.sender,
          sender: data.from || data.sender,
          text: data.text || '',
          type: data.type || 'text',
          createdAt: data.timestamp || data.createdAt || new Date().toISOString(),
        }]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      });
    }).catch(() => {});
    return () => {
      cancelled = true;
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [activeChat?.chatId, userToken]);

  // Load message history when activeChat changes
  useEffect(() => {
    if (!activeChat?.chatId || !userToken) return;
    fetch(`${API}/api/chat/${activeChat.chatId}/messages?limit=30`, {
      headers: { Authorization: `Bearer ${userToken}` }
    })
      .then(r => { if (!r.ok) throw new Error(r.status); return r.json(); })
      .then(data => {
        const msgs = Array.isArray(data) ? data : (data.messages || []);
        setMessages([...msgs].reverse());
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }).catch(() => {});
    // Mark as read
    fetch(`${API}/api/chat/${activeChat.chatId}/read`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${userToken}` }
    }).catch(() => {});
  }, [activeChat?.chatId, userToken]);

  function openConversation(conv) {
    const myId = (user?.id || user?._id || '').toString();
    const buyerId = conv.buyer?._id?.toString() || conv.buyer?.toString() || '';
    const sellerId = conv.seller?._id?.toString() || conv.seller?.toString() || '';
    const otherId = buyerId === myId ? sellerId : buyerId;
    const otherName = buyerId === myId
      ? (conv.seller?.name || conv.seller?.xtoxId || tr('chat_seller'))
      : (conv.buyer?.name || conv.buyer?.xtoxId || tr('chat_buyer'));
    const otherAvatar = buyerId === myId ? conv.seller?.avatar : conv.buyer?.avatar;
    setActiveChat({ chatId: conv._id, targetId: otherId, name: otherName, avatar: otherAvatar });
    setMessages([]);
    setMenuOpenId(null);
  }

  async function sendMsg() {
    if (!msg.trim() || !activeChat) return;
    const myId = (user?.id || user?._id || '').toString();
    const newMsg = { from: myId, to: activeChat.targetId, chatId: activeChat.chatId || activeChat._id, text: msg.trim(), time: new Date().toISOString(), _id: Date.now() };
    setMessages(prev => [...prev, newMsg]);
    setMsg('');
    socketRef.current?.emit('send_message', newMsg);
    fetch(`${API}/api/chat/${activeChat.chatId}/messages`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${user.token}` },
      body: JSON.stringify({ text: newMsg.text, from: myId })
    }).catch(() => {});
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
  }

  // F1: Action handlers per conversation
  async function handleConvAction(action, chatId, e) {
    e.stopPropagation();
    if (!user?.token) return;
    const token = user.token;
    if (action === 'delete') {
      await fetch(`${API}/api/chat/${chatId}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      fetchConversations();
    } else if (action === 'mute') {
      await fetch(`${API}/api/chat/${chatId}/mute`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      fetchConversations();
    } else if (action === 'ignore') {
      await fetch(`${API}/api/chat/${chatId}/ignore`, { method: 'POST', headers: { Authorization: `Bearer ${token}` } }).catch(() => {});
      fetchConversations();
    } else if (action === 'report') {
      const reason = prompt('سبب الإبلاغ') || '';
      await fetch(`${API}/api/chat/${chatId}/report`, { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify({ reason }) }).catch(() => {});
    }
    setMenuOpenId(null);
  }

  // Don't render if not logged in or an error occurred
  if (!user || hasError) return null;

  const myId = (user?.id || user?._id || '').toString();

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 9999, fontFamily: 'sans-serif', direction: 'rtl' }}>
      {/* Panel */}
      {open && (
        <div style={{
          width: 320, height: activeChat ? 440 : 'auto', maxHeight: 520,
          background: '#fff', borderRadius: 16,
          boxShadow: '0 8px 32px rgba(0,0,0,0.18)',
          display: 'flex', flexDirection: 'column',
          marginBottom: 12, overflow: 'hidden',
          border: '1px solid #e5e7eb'
        }}>
          {/* Header */}
          <div style={{ background: '#7C3AED', color: '#fff', padding: '12px 16px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {activeChat ? (
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: 0 }}>&#8592;</button>
                {activeChat.avatar && <img src={activeChat.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontWeight: 600, fontSize: 14 }}>{activeChat.name}</span>
                {/* Call button in active chat header */}
                {activeChat.targetId && (
                  <button
                    onClick={() => initiateCall(activeChat.targetId, activeChat.name)}
                    title="مكالمة صوتية"
                    style={{
                      background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                      border: 'none', borderRadius: '50%',
                      width: 28, height: 28,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      cursor: 'pointer', fontSize: 13, flexShrink: 0,
                      marginRight: 2,
                    }}
                  >📞</button>
                )}
              </div>
            ) : (
              <span style={{ fontWeight: 700, fontSize: 15 }}>&#128172; {tr('chat_conversations')}</span>
            )}
            <button onClick={() => { setOpen(false); setActiveChat(null); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>&#10005;</button>
          </div>

          {/* FEATURE 4: Incoming call banner — shown above conversation list */}
          {!activeChat && incomingCall && (
            <div style={{
              background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
              color: 'white', padding: '12px 16px',
              animation: 'chatfloat-pulse 1.2s ease-in-out infinite',
            }}>
              <div style={{ fontWeight: 'bold', fontSize: 13, marginBottom: 6 }}>
                📞 {incomingCall.callerName} يتصل بك
              </div>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  onClick={acceptCall}
                  style={{
                    flex: 1, background: '#22c55e', color: 'white', border: 'none',
                    borderRadius: 8, padding: '8px', fontWeight: 'bold',
                    cursor: 'pointer', fontSize: 13
                  }}
                >✓ رد</button>
                <button
                  onClick={declineCall}
                  style={{
                    flex: 1, background: '#ef4444', color: 'white', border: 'none',
                    borderRadius: 8, padding: '8px', fontWeight: 'bold',
                    cursor: 'pointer', fontSize: 13
                  }}
                >✕ رفض</button>
              </div>
            </div>
          )}

          {/* Incoming call banner when panel is CLOSED — shown as floating notification */}

          {/* Conversations list */}
          {!activeChat && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 8, maxHeight: 380 }}>
              {loading && <p style={{ textAlign: 'center', color: '#888', padding: 20, fontSize: 13 }}>
                {tr('loading_short')}
              </p>}
              {!loading && conversations.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: 24, fontSize: 13 }}>
                  {tr('chat_no_convs')}<br />
                  {tr('chat_start_from_ad')}
                </p>
              )}
              {conversations.map(conv => {
                const buyerId = conv.buyer?._id?.toString() || conv.buyer?.toString() || '';
                const sellerId = conv.seller?._id?.toString() || conv.seller?.toString() || '';
                const otherUserId = buyerId === myId ? sellerId : buyerId;
                const otherName = buyerId === myId
                  ? (conv.seller?.name || conv.seller?.xtoxId || tr('chat_seller'))
                  : (conv.buyer?.name || conv.buyer?.xtoxId || tr('chat_buyer'));
                const otherAvatar = buyerId === myId ? conv.seller?.avatar : conv.buyer?.avatar;
                const lastMsg = conv.lastMessage || conv.messages?.[conv.messages.length - 1];
                const unread = buyerId === myId ? conv.unreadBuyer : conv.unreadSeller;
                const isMuted = conv.mutedBy?.map(id => id?.toString()).includes(myId);
                // FEATURE 3: live presence from state
                const isOnline = !!onlineUsers[otherUserId];
                return (
                  <div key={conv._id} style={{ position: 'relative' }}>
                    <div onClick={() => openConversation(conv)} style={{
                      display: 'flex', alignItems: 'center', gap: 10, padding: '10px 8px',
                      borderRadius: 10, cursor: 'pointer', borderBottom: '1px solid #f3f4f6',
                      background: '#fff', transition: 'background 0.15s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = '#f5f3ff'}
                    onMouseLeave={e => e.currentTarget.style.background = '#fff'}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 40, height: 40, borderRadius: '50%', background: '#7C3AED', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontWeight: 700, fontSize: 16, overflow: 'hidden' }}>
                          {otherAvatar ? <img src={otherAvatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (otherName?.[0] || '؟')}
                        </div>
                        {unread > 0 && <span style={{ position: 'absolute', top: -2, right: -2, background: '#ef4444', color: '#fff', borderRadius: '50%', width: 16, height: 16, fontSize: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 700 }}>{unread}</span>}
                      </div>
                      <div style={{ flex: 1, overflow: 'hidden' }}>
                        <div style={{ fontWeight: 700, fontSize: 13, color: '#111', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1 }}>
                          {conv.adTitle ? conv.adTitle.slice(0, 28) : 'إعلان غير متاح'}
                        </div>
                        {/* FEATURE 3: Live presence badge */}
                        <span style={{
                          fontSize: 9, fontWeight: 600, borderRadius: 6,
                          padding: '1px 5px', marginBottom: 1, display: 'inline-block',
                          background: isOnline ? 'rgba(74,222,128,0.12)' : 'rgba(156,163,175,0.12)',
                          color: isOnline ? 'rgb(74,222,128)' : 'rgb(156,163,175)',
                        }}>
                          {isOnline ? '● متاح' : '● غير متاح'}
                        </span>
                        <div style={{ fontSize: 10, color: '#7c3aed', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 1, display: 'flex', alignItems: 'center', gap: 3 }}>
                          👤 {otherName}
                          {isMuted && <span>🔇</span>}
                        </div>
                        <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg?.text || 'ابدأ المحادثة'}</div>
                      </div>
                      {/* FEATURE 1: Call button — shown before ⋮ menu */}
                      <button
                        onClick={(e) => { e.stopPropagation(); initiateCall(otherUserId, otherName); }}
                        title="مكالمة صوتية"
                        style={{
                          background: 'linear-gradient(135deg, #22c55e, #16a34a)',
                          border: 'none', borderRadius: '50%',
                          width: 32, height: 32,
                          display: 'flex', alignItems: 'center', justifyContent: 'center',
                          cursor: 'pointer',
                          boxShadow: 'rgba(34,197,94,0.4) 0px 2px 8px',
                          fontSize: 14, flexShrink: 0, marginRight: 4,
                        }}
                      >📞</button>
                      {/* F1: ⋮ action button */}
                      <div style={{ position: 'relative', flexShrink: 0 }} onClick={e => e.stopPropagation()}>
                        <button
                          onClick={e => { e.stopPropagation(); setMenuOpenId(menuOpenId === conv._id ? null : conv._id); }}
                          style={{
                            background: 'none', border: 'none', cursor: 'pointer',
                            fontSize: 18, color: '#374151', padding: 0,
                            minWidth: 36, minHeight: 36, borderRadius: '50%',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            lineHeight: 1, flexShrink: 0,
                          }}
                          title="خيارات"
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(0,0,0,0.08)'; }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'none'; }}
                          aria-label="خيارات المحادثة"
                        >⋮</button>
                        {menuOpenId === conv._id && (
                          <div style={{ position: 'absolute', left: 0, top: 28, background: '#fff', borderRadius: 10, boxShadow: '0 4px 16px rgba(0,0,0,0.15)', minWidth: 140, zIndex: 200, overflow: 'hidden', direction: 'rtl' }}>
                            {[
                              { label: isMuted ? tr('chat_unmute') : tr('chat_mute'), action: 'mute' },
                              { label: tr('chat_ignore'), action: 'ignore' },
                              { label: '🚩 إبلاغ', action: 'report' },
                              { label: '🗑️ حذف', action: 'delete' },
                            ].map(({ label, action }) => (
                              <button key={action} onClick={e => handleConvAction(action, conv._id, e)}
                                style={{ display: 'block', width: '100%', padding: '9px 14px', border: 'none', background: 'none', cursor: 'pointer', fontSize: 12, color: '#111', textAlign: 'right' }}
                                onMouseEnter={e => e.currentTarget.style.background = '#f5f5f5'}
                                onMouseLeave={e => e.currentTarget.style.background = 'none'}
                              >{label}</button>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
              <a href="/chat" style={{ display: 'block', textAlign: 'center', color: '#7C3AED', fontSize: 12, padding: '10px 0', textDecoration: 'none' }}>
                {'عرض كل المحادثات ←'}
              </a>
            </div>
          )}

          {/* Mini chat view */}
          {activeChat && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {messages.map((m, i) => {
                  const isMe = (m.from || m.sender?.toString?.()) === myId || m.from?._id === myId || m.sender?.toString() === myId;
                  return (
                    <div key={m._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-start' : 'flex-end' }}>
                      <div style={{
                        maxWidth: '75%', padding: '7px 11px', borderRadius: isMe ? '12px 12px 2px 12px' : '12px 12px 12px 2px',
                        background: isMe ? '#7C3AED' : '#f3f4f6',
                        color: isMe ? '#fff' : '#111', fontSize: 13, lineHeight: 1.4
                      }}>
                        {m.text}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>
              <div style={{ padding: '8px 12px', borderTop: '1px solid #e5e7eb', display: 'flex', gap: 8 }}>
                <input
                  value={msg}
                  onChange={e => setMsg(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && sendMsg()}
                  placeholder={'اكتب رسالة...'}
                  style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 20, padding: '8px 14px', fontSize: 13, outline: 'none', direction: 'rtl' }}
                />
                <button onClick={sendMsg} style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>&#8593;</button>
              </div>
            </>
          )}
        </div>
      )}

      {/* FEATURE 4: Incoming call popup when panel is closed */}
      {!open && incomingCall && (
        <div style={{
          width: 280,
          background: 'linear-gradient(135deg, #1e1b4b, #312e81)',
          color: 'white', padding: '14px 16px', borderRadius: 16,
          marginBottom: 12, animation: 'chatfloat-pulse 1.2s ease-in-out infinite',
          boxShadow: '0 4px 20px rgba(99,102,241,0.6)',
        }}>
          <div style={{ fontWeight: 'bold', fontSize: 14, marginBottom: 8 }}>
            📞 {incomingCall.callerName} يتصل بك
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button
              onClick={acceptCall}
              style={{
                flex: 1, background: '#22c55e', color: 'white', border: 'none',
                borderRadius: 8, padding: '9px', fontWeight: 'bold',
                cursor: 'pointer', fontSize: 13
              }}
            >✓ رد</button>
            <button
              onClick={declineCall}
              style={{
                flex: 1, background: '#ef4444', color: 'white', border: 'none',
                borderRadius: 8, padding: '9px', fontWeight: 'bold',
                cursor: 'pointer', fontSize: 13
              }}
            >✕ رفض</button>
          </div>
        </div>
      )}

      {/* Floating button */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: 52, height: 52, borderRadius: '50%',
          background: 'linear-gradient(135deg, #7C3AED, #5B21B6)',
          border: 'none', cursor: 'pointer',
          boxShadow: '0 4px 16px rgba(124,58,237,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 22, transition: 'transform 0.2s',
          position: 'relative'
        }}
        onMouseEnter={e => e.currentTarget.style.transform = 'scale(1.1)'}
        onMouseLeave={e => e.currentTarget.style.transform = 'scale(1)'}
        title={tr('chat_conversations')}
      >
        {open ? '✕' : '💬'}
        {!open && (unreadTotal > 0 || incomingCall) && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: incomingCall ? '#22c55e' : '#ef4444',
            color: '#fff', borderRadius: '50%',
            width: 18, height: 18, fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, border: '2px solid #fff'
          }}>{incomingCall ? '📞' : (unreadTotal > 9 ? '9+' : unreadTotal)}</span>
        )}
      </button>

      {/* Pulse animation for incoming call */}
      <style>{`
        @keyframes chatfloat-pulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.02); }
          100% { transform: scale(1); }
        }
      `}</style>
    </div>
  );
}
