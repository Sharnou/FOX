'use client';
import { useState, useEffect, useRef } from 'react';

const API = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || API;

export default function ChatFloat() {
  const [open, setOpen] = useState(false);
  const [user, setUser] = useState(null);
  const [conversations, setConversations] = useState([]);
  const [activeChat, setActiveChat] = useState(null); // { chatId, targetId, name, avatar }
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Load user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) setUser(JSON.parse(stored));
    } catch {}
  }, []);

  // Fetch unread count for badge (every 30s)
  useEffect(() => {
    if (!user?.token) return;
    const fetchUnread = () => {
      fetch(`${API}/api/chat/unread-count`, { headers: { Authorization: `Bearer ${user.token}` } })
        .then(r => r.json()).then(d => setUnreadTotal(d.count || 0)).catch(() => {});
    };
    fetchUnread();
    const t = setInterval(fetchUnread, 30000);
    return () => clearInterval(t);
  }, [user]);

  // Fetch conversations when panel opens
  useEffect(() => {
    if (!open || !user?.token) return;
    setLoading(true);
    fetch(`${API}/api/chat`, { headers: { Authorization: `Bearer ${user.token}` } })
      .then(r => r.json())
      .then(data => {
        const list = Array.isArray(data) ? data : (data.chats || []);
        setConversations(list);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, [open, user]);

  // Socket connection for active mini-chat
  useEffect(() => {
    if (!activeChat || !user?.token) return;
    let socket;
    import('socket.io-client').then(({ io }) => {
      socket = io(SOCKET_URL, { auth: { token: user.token }, transports: ['websocket', 'polling'] });
      socketRef.current = socket;
      socket.emit('join', user.id || user._id);
      socket.on('receive_message', (data) => {
        setMessages(prev => [...prev, data]);
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
      });
    });
    return () => { socket?.disconnect(); };
  }, [activeChat, user]);

  // Load message history when activeChat changes
  useEffect(() => {
    if (!activeChat?.chatId || !user?.token) return;
    fetch(`${API}/api/chat/${activeChat.chatId}/messages?limit=30`, {
      headers: { Authorization: `Bearer ${user.token}` }
    })
      .then(r => r.json())
      .then(data => {
        const msgs = Array.isArray(data) ? data : (data.messages || []);
        setMessages([...msgs].reverse());
        setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
      }).catch(() => {});
    // Mark as read
    fetch(`${API}/api/chat/${activeChat.chatId}/read`, {
      method: 'PATCH', headers: { Authorization: `Bearer ${user.token}` }
    }).catch(() => {});
  }, [activeChat, user]);

  function openConversation(conv) {
    const myId = user?.id || user?._id;
    const otherId = conv.buyer?._id === myId ? conv.seller?._id : conv.buyer?._id;
    const otherName = conv.buyer?._id === myId ? (conv.seller?.name || 'بائع') : (conv.buyer?.name || 'مشتري');
    const otherAvatar = conv.buyer?._id === myId ? conv.seller?.avatar : conv.buyer?.avatar;
    setActiveChat({ chatId: conv._id, targetId: otherId, name: otherName, avatar: otherAvatar });
    setMessages([]);
  }

  async function sendMsg() {
    if (!msg.trim() || !activeChat) return;
    const myId = user?.id || user?._id;
    const newMsg = { from: myId, to: activeChat.targetId, text: msg.trim(), time: new Date().toISOString(), _id: Date.now() };
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

  // Don't render if not logged in
  if (!user) return null;

  const myId = user?.id || user?._id;

  return (
    <div style={{ position: 'fixed', bottom: 80, right: 20, zIndex: 9999, fontFamily: 'sans-serif', direction: 'rtl' }}>
      {/* Panel */}
      {open && (
        <div style={{
          width: 320, height: activeChat ? 440 : 380,
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
                <button onClick={() => setActiveChat(null)} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', padding: 0 }}>←</button>
                {activeChat.avatar && <img src={activeChat.avatar} alt="" style={{ width: 28, height: 28, borderRadius: '50%', objectFit: 'cover' }} />}
                <span style={{ fontWeight: 600, fontSize: 14 }}>{activeChat.name}</span>
              </div>
            ) : (
              <span style={{ fontWeight: 700, fontSize: 15 }}>💬 المحادثات</span>
            )}
            <button onClick={() => { setOpen(false); setActiveChat(null); }} style={{ background: 'none', border: 'none', color: '#fff', fontSize: 18, cursor: 'pointer', lineHeight: 1 }}>✕</button>
          </div>

          {/* Conversations list */}
          {!activeChat && (
            <div style={{ flex: 1, overflowY: 'auto', padding: 8 }}>
              {loading && <p style={{ textAlign: 'center', color: '#888', padding: 20, fontSize: 13 }}>جاري التحميل...</p>}
              {!loading && conversations.length === 0 && (
                <p style={{ textAlign: 'center', color: '#888', padding: 24, fontSize: 13 }}>لا توجد محادثات بعد.<br />ابدأ محادثة من أي إعلان!</p>
              )}
              {conversations.map(conv => {
                const otherId = conv.buyer?._id === myId ? conv.seller?._id : conv.buyer?._id;
                const otherName = conv.buyer?._id === myId ? (conv.seller?.name || 'بائع') : (conv.buyer?.name || 'مشتري');
                const otherAvatar = conv.buyer?._id === myId ? conv.seller?.avatar : conv.buyer?.avatar;
                const lastMsg = conv.lastMessage || conv.messages?.[conv.messages.length - 1];
                const unread = conv.buyer?._id === myId ? conv.unreadBuyer : conv.unreadSeller;
                return (
                  <div key={conv._id} onClick={() => openConversation(conv)} style={{
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
                      <div style={{ fontWeight: 600, fontSize: 13, color: '#111' }}>{otherName}</div>
                      <div style={{ fontSize: 11, color: '#6b7280', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{lastMsg?.text || 'ابدأ المحادثة'}</div>
                    </div>
                  </div>
                );
              })}
              <a href="/chat" style={{ display: 'block', textAlign: 'center', color: '#7C3AED', fontSize: 12, padding: '10px 0', textDecoration: 'none' }}>عرض كل المحادثات →</a>
            </div>
          )}

          {/* Mini chat view */}
          {activeChat && (
            <>
              <div style={{ flex: 1, overflowY: 'auto', padding: '8px 12px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                {messages.map((m, i) => {
                  const isMe = m.from === myId || m.from?._id === myId;
                  return (
                    <div key={m._id || i} style={{ display: 'flex', justifyContent: isMe ? 'flex-start' : 'flex-end' }}>
                      <div style={{
                        maxWidth: '75%', padding: '7px 11px', borderRadius: isMe ? '12px 12px 12px 2px' : '12px 12px 2px 12px',
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
                  placeholder="اكتب رسالة..."
                  style={{ flex: 1, border: '1px solid #e5e7eb', borderRadius: 20, padding: '8px 14px', fontSize: 13, outline: 'none', direction: 'rtl' }}
                />
                <button onClick={sendMsg} style={{ background: '#7C3AED', color: '#fff', border: 'none', borderRadius: '50%', width: 36, height: 36, cursor: 'pointer', fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>↑</button>
              </div>
            </>
          )}
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
        title="المحادثات"
      >
        {open ? '✕' : '💬'}
        {!open && unreadTotal > 0 && (
          <span style={{
            position: 'absolute', top: -2, right: -2,
            background: '#ef4444', color: '#fff', borderRadius: '50%',
            width: 18, height: 18, fontSize: 10,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontWeight: 700, border: '2px solid #fff'
          }}>{unreadTotal > 9 ? '9+' : unreadTotal}</span>
        )}
      </button>
    </div>
  );
}
