'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import CallManager from '../components/CallManager';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// Arabic relative time
function arabicRelTime(ts) {
  var diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 10) return 'الآن';
  if (diff < 60) return 'منذ ' + diff + ' ثانية';
  var mins = Math.floor(diff / 60);
  if (mins < 60) {
    if (mins === 1) return 'منذ دقيقة';
    if (mins <= 10) return 'منذ ' + mins + ' دقائق';
    return 'منذ ' + mins + ' دقيقة';
  }
  var hours = Math.floor(mins / 60);
  if (hours < 24) {
    if (hours === 1) return 'منذ ساعة';
    if (hours <= 10) return 'منذ ' + hours + ' ساعات';
    return 'منذ ' + hours + ' ساعة';
  }
  var days = Math.floor(hours / 24);
  if (days === 1) return 'منذ يوم';
  if (days <= 10) return 'منذ ' + days + ' أيام';
  return 'منذ ' + days + ' يوم';
}

// Format call duration mm:ss
function formatDuration(seconds) {
  var m = Math.floor(seconds / 60);
  var s = seconds % 60;
  var mm = m < 10 ? '0' + m : '' + m;
  var ss = s < 10 ? '0' + s : '' + s;
  return mm + ':' + ss;
}

// Typing indicator dots
function TypingDots() {
  return (
    <div dir="ltr" aria-label="يكتب..." style={{ display: 'flex', justifyContent: 'flex-start', marginBottom: 4 }}>
      <div style={{ padding: '10px 16px', borderRadius: '18px 18px 18px 4px', background: '#e5e7eb', display: 'inline-flex', gap: 4, alignItems: 'center' }}>
        {[0, 1, 2].map(function(i) {
          return (
            <span key={i} style={{ width: 8, height: 8, borderRadius: '50%', background: '#9ca3af', display: 'inline-block', animation: 'xtox-bounce 1.2s ease-in-out infinite', animationDelay: (i * 0.2) + 's' }} />
          );
        })}
      </div>
    </div>
  );
}

// Incoming call modal
function IncomingCallModal({ from, onAccept, onReject }) {
  return (
    <div role="dialog" aria-modal="true" aria-label="مكالمة واردة"
      style={{ position: 'fixed', inset: 0, zIndex: 1000, background: 'rgba(0,0,0,0.78)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div dir="rtl" style={{ background: 'white', borderRadius: 24, padding: '36px 28px', textAlign: 'center', minWidth: 280, maxWidth: 340, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.35)', animation: 'xtox-pop 0.2s ease-out' }}>
        <div style={{ position: 'relative', display: 'inline-block', marginBottom: 12 }}>
          <div style={{ position: 'absolute', inset: -10, borderRadius: '50%', border: '3px solid #22c55e', animation: 'xtox-ring 1.5s ease-out infinite', opacity: 0 }} />
          <div style={{ fontSize: 52 }}>&#128222;</div>
        </div>
        <h2 style={{ margin: '0 0 6px', fontSize: 22, fontWeight: 'bold', color: '#111' }}>مكالمة واردة</h2>
        <p style={{ margin: '0 0 28px', color: '#6b7280', fontSize: 14 }}>من {from}</p>
        <div style={{ display: 'flex', gap: 24, justifyContent: 'center', alignItems: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <button onClick={onReject} aria-label="رفض المكالمة"
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 64, height: 64, fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.4)' }}>
              &#x2715;
            </button>
            <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: '#ef4444', fontWeight: 600 }}>رفض</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={onAccept} aria-label="قبول المكالمة"
              style={{ background: '#22c55e', color: 'white', border: 'none', borderRadius: '50%', width: 64, height: 64, fontSize: 24, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(34,197,94,0.4)' }}>
              &#128222;
            </button>
            <span style={{ display: 'block', marginTop: 6, fontSize: 13, color: '#22c55e', fontWeight: 600 }}>قبول</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Active call overlay
function ActiveCallOverlay({ callDuration, isMuted, onToggleMute, onEndCall, otherId }) {
  return (
    <div style={{ position: 'fixed', inset: 0, zIndex: 900, background: 'rgba(0,0,0,0.85)', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}>
      <div dir="rtl" style={{ background: '#1e293b', borderRadius: 24, padding: '40px 28px', textAlign: 'center', minWidth: 280, maxWidth: 340, width: '100%', boxShadow: '0 24px 64px rgba(0,0,0,0.5)' }}>
        <div style={{ width: 72, height: 72, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32, margin: '0 auto 16px' }}>&#128222;</div>
        <p style={{ margin: '0 0 4px', color: '#94a3b8', fontSize: 13 }}>متصل مع | Connected with</p>
        <h2 style={{ margin: '0 0 8px', color: 'white', fontSize: 20, fontWeight: 'bold' }}>{otherId}</h2>
        <p style={{ margin: '0 0 32px', color: '#22c55e', fontSize: 24, fontWeight: 'bold', fontVariantNumeric: 'tabular-nums' }}>{formatDuration(callDuration)}</p>
        <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
          <div style={{ textAlign: 'center' }}>
            <button onClick={onToggleMute} aria-label={isMuted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
              style={{ background: isMuted ? '#374151' : '#1d4ed8', color: 'white', border: 'none', borderRadius: '50%', width: 60, height: 60, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              {isMuted ? '🔇' : '🎤'}
            </button>
            <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#94a3b8' }}>{isMuted ? 'مكتوم' : 'مفتوح'}</span>
          </div>
          <div style={{ textAlign: 'center' }}>
            <button onClick={onEndCall} aria-label="إنهاء المكالمة"
              style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '50%', width: 60, height: 60, fontSize: 22, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 16px rgba(239,68,68,0.5)' }}>
              &#9743;
            </button>
            <span style={{ display: 'block', marginTop: 6, fontSize: 12, color: '#ef4444' }}>إنهاء</span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Location message card
function LocationCard({ msg }) {
  return (
    <div style={{ background: '#f0f7ff', border: '1px solid #4285F4', borderRadius: 12, padding: '10px 14px', minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>&#128205;</span>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#002f34' }}>موقعي الحالي</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={'https://www.google.com/maps?q=' + msg.lat + ',' + msg.lng} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, background: '#4285F4', color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          &#128506; عرض
        </a>
        <a href={'https://www.google.com/maps/dir/?api=1&destination=' + msg.lat + ',' + msg.lng} target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, background: '#002f34', color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          &#128663; اتجاهات
        </a>
      </div>
    </div>
  );
}

// Main ChatPage component
export default function ChatPage() {
  var router = useRouter();
  var [myId, setMyId]                   = useState('');
  var [currentUser, setCurrentUser]     = useState(null);
  var [targetId, setTargetId]           = useState('');
  var [sellerName, setSellerName]       = useState('');
  var [sellerAvatar, setSellerAvatar]   = useState('');
  var [joined, setJoined]               = useState(false);
  var [messages, setMessages]           = useState([]);
  var [msg, setMsg]                     = useState('');
  var [callState, setCallState]         = useState('idle');
  var [incomingCall, setIncomingCall]   = useState(null);
  var [isMuted, setIsMuted]             = useState(false);
  var [callDuration, setCallDuration]   = useState(0);
  var [isTyping, setIsTyping]           = useState(false);
  var [conversations, setConversations] = useState([]);
  var [unreadCounts, setUnreadCounts]   = useState({});
  var [showConvPanel, setShowConvPanel] = useState(false);
  var [chatId, setChatId]               = useState('');
  var [apiChats, setApiChats]           = useState([]);
  var [historyLoaded, setHistoryLoaded] = useState(false);
  var [loginRequired, setLoginRequired] = useState(false);
  var [chatError, setChatError]         = useState('');
  var [isMobile, setIsMobile]           = useState(false);
  var [socketInstance, setSocketInstance] = useState(null);
  var [chatStatus, setChatStatus]       = useState('active'); // 'active' | 'archived' | 'blocked'
  var [adStatus, setAdStatus]           = useState('');       // 'sold' | '' | etc.

  var pcRef          = useRef(null);
  var remoteAudioRef = useRef(null);
  var localStreamRef = useRef(null);
  var messagesEndRef = useRef(null);
  var typingTimerRef = useRef(null);
  var socketRef      = useRef(null);
  var chatIdRef      = useRef('');
  var callTimerRef   = useRef(null);
  var callManagerRef = useRef(null);

  // Detect mobile
  useEffect(function() {
    var check = function() { setIsMobile(window.innerWidth <= 768); };
    check();
    window.addEventListener('resize', check);
    return function() { window.removeEventListener('resize', check); };
  }, []);

  // Immediate auth check — redirect to login if no token
  useEffect(function() {
    var token = localStorage.getItem('token') || localStorage.getItem('xtox_token');
    if (!token) { router.push('/login'); return; }
  }, []);

  // Init: read user + URL params
  useEffect(function() {
    if (typeof window !== 'undefined') {
      var user   = JSON.parse(localStorage.getItem('user') || '{}');
      var params = new URLSearchParams(window.location.search);
      var uid    = user.id || user._id || '';
      var cid    = params.get('chatId') || '';
      setMyId(uid);
      setCurrentUser(user);
      setTargetId(params.get('target') || '');
      setChatId(cid);
      chatIdRef.current = cid;
      // Pre-populate sellerName from URL if available (passed by chat list)
      var urlSellerName = params.get('sellerName') || '';
      if (urlSellerName) setSellerName(urlSellerName);
    }
  }, []);

  // Auto-scroll to latest message
  useEffect(function() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Call duration timer
  useEffect(function() {
    if (callState === 'active') {
      setCallDuration(0);
      callTimerRef.current = setInterval(function() {
        setCallDuration(function(prev) { return prev + 1; });
      }, 1000);
    } else {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
      setCallDuration(0);
    }
    return function() {
      if (callTimerRef.current) {
        clearInterval(callTimerRef.current);
        callTimerRef.current = null;
      }
    };
  }, [callState]);

  // Load conversations from localStorage
  useEffect(function() {
    if (typeof window === 'undefined') return;
    var stored = JSON.parse(localStorage.getItem('xtox_conversations') || '[]');
    setConversations(stored);
    var storedUnread = JSON.parse(localStorage.getItem('xtox_unread_counts') || '{}');
    if (targetId && storedUnread[targetId]) {
      var upd = Object.assign({}, storedUnread);
      delete upd[targetId];
      localStorage.setItem('xtox_unread_counts', JSON.stringify(upd));
      setUnreadCounts(upd);
    } else {
      setUnreadCounts(storedUnread);
    }
  }, [targetId]);

  // Fetch seller name from profile API when targetId is set
  useEffect(function() {
    if (!targetId) return;
    fetch(API_URL + '/api/profile/' + targetId)
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(data) {
        if (data && data.name) setSellerName(data.name);
        if (data && data.avatar) setSellerAvatar(data.avatar);
      })
      .catch(function() {});
  }, [targetId]);

  // Join chat when myId is ready
  useEffect(function() {
    if (myId && !joined) joinChat();
    return function() {
      if (typingTimerRef.current) {
        clearTimeout(typingTimerRef.current);
        typingTimerRef.current = null;
      }
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
      }
    };
  }, [myId]);

  // Fetch conversations from API
  useEffect(function() {
    if (!myId) return;
    var token = null;
    try {
      var stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      var userObj = stored ? JSON.parse(stored) : null;
      token = (userObj && userObj.token) || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    } catch(e) {}
    if (!token) {
      setLoginRequired(true);
      setHistoryLoaded(true);
      return;
    }
    setLoginRequired(false);
    fetch(API_URL + '/api/chat', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(async function(data) {
        if (!data) { setChatError('فشل تحميل المحادثات'); setHistoryLoaded(true); return; }
        var chatList = data.chats || (Array.isArray(data) ? data : []);
        setApiChats(chatList);
        var apiConvs = chatList.map(function(c) {
          // buyer/seller are populated objects: { _id, name, avatar, ... }
          var buyerId  = (c.buyer?._id  || (typeof c.buyer  === 'string' ? c.buyer  : '')).toString();
          var sellerId = (c.seller?._id || (typeof c.seller === 'string' ? c.seller : '')).toString();
          var otherId = '', otherName = '', otherAvatar = '';
          if (buyerId && buyerId !== String(myId)) {
            otherId = buyerId;
            otherName = c.buyer?.name || '';
            otherAvatar = c.buyer?.avatar || '';
          } else if (sellerId && sellerId !== String(myId)) {
            otherId = sellerId;
            otherName = c.seller?.name || '';
            otherAvatar = c.seller?.avatar || '';
          }
          var lastMsg = c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null;
          var adTitle = c.adTitle || c.ad?.title || '';
          return { id: otherId, name: otherName, avatar: otherAvatar, adTitle: adTitle, chatId: c._id, lastMessage: lastMsg ? (lastMsg.text || '') : '', lastTime: lastMsg ? new Date(lastMsg.createdAt).getTime() : 0 };
        }).filter(function(c) { return c.id; });
        setConversations(function(prev) {
          var merged = apiConvs.slice();
          prev.forEach(function(c) { if (!merged.find(function(m) { return m.id === c.id; })) merged.push(c); });
          return merged.sort(function(a, b) { return (b.lastTime || 0) - (a.lastTime || 0); });
        });
        var urlChatId = new URLSearchParams(window.location.search).get('chatId');
        if (urlChatId) {
          var chat = chatList.find(function(c) { return String(c._id) === urlChatId; });
          if (chat) {
            var buyerId2  = (chat.buyer?._id  || (typeof chat.buyer  === 'string' ? chat.buyer  : '')).toString();
            var sellerId2 = (chat.seller?._id || (typeof chat.seller === 'string' ? chat.seller : '')).toString();
            var otherId = '', otherName2 = '';
            if (buyerId2 && buyerId2 !== String(myId)) { otherId = buyerId2; otherName2 = chat.buyer?.name || ''; }
            else if (sellerId2 && sellerId2 !== String(myId)) { otherId = sellerId2; otherName2 = chat.seller?.name || ''; }
            if (otherId) setTargetId(function(prev) { return prev || otherId; });
            if (otherName2) setSellerName(function(prev) { return prev || otherName2; });
            setChatId(urlChatId);
            chatIdRef.current = urlChatId;
            try {
              var msgRes = await fetch(API_URL + '/api/chat/' + urlChatId + '/messages?limit=50', { headers: { Authorization: 'Bearer ' + token } });
              if (msgRes.ok) {
                var msgData = await msgRes.json();
                var msgs = (msgData.messages || []).slice().reverse();
                setMessages(msgs.map(function(m) {
                  return { from: (m.sender === myId || String(m.sender) === String(myId)) ? 'me' : m.sender, text: m.text || '', type: m.type || 'text', duration: m.duration || 0, time: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(), readBy: m.readBy || [] };
                }));
              }
            // Read chat status (archived = ad sold or admin closed)
            if (chat.status) setChatStatus(chat.status);
            // If chat is linked to an ad, fetch the ad status to show sold banner
            if (chat.ad) {
              try {
                var adRes = await fetch(API_URL + '/api/ads/' + chat.ad);
                if (adRes.ok) {
                  var adData = await adRes.json();
                  var fetchedAd = adData.ad || adData;
                  if (fetchedAd && fetchedAd.status) setAdStatus(fetchedAd.status);
                }
              } catch(e) {}
            }
            } catch(e) {}
          }
        }
        setHistoryLoaded(true);
      })
      .catch(function() { setChatError('فشل تحميل المحادثات'); setHistoryLoaded(true); });
  }, [myId]);

  // Socket setup
  async function joinChat() {
    if (!myId) return;
    var ioModule = await import('socket.io-client');
    var io = ioModule.io || ioModule.default;
    var token = typeof window !== 'undefined' ? (localStorage.getItem('token') || 'guest') : 'guest';
    var s = io(SOCKET_URL, { auth: { token: token }, transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = s;
    setSocketInstance(s);
    s.emit('join', myId);
    setJoined(true);
    s.on('reconnect', function() {
      s.emit('join', myId);
      setJoined(true);
    });
    s.on('disconnect', function(reason) {
      setJoined(false);
      if (reason === 'io server disconnect') s.connect();
    });
    s.on('receive_message', function(data) {
      var senderId = data.from || targetId;
      var msgTime  = Date.now();
      setMessages(function(prev) { return prev.concat([{ from: senderId, text: data.text, type: data.type || 'text', duration: data.duration || 0, time: msgTime, readBy: [] }]); });
      if (senderId && senderId !== targetId) {
        setUnreadCounts(function(prev) {
          var upd = Object.assign({}, prev);
          upd[senderId] = (prev[senderId] || 0) + 1;
          localStorage.setItem('xtox_unread_counts', JSON.stringify(upd));
          return upd;
        });
      }
      setConversations(function(prev) {
        var exists = prev.find(function(c) { return c.id === senderId; });
        var upd = exists
          ? prev.map(function(c) { return c.id === senderId ? Object.assign({}, c, { lastMessage: data.text, lastTime: msgTime }) : c; })
          : [{ id: senderId, lastMessage: data.text, lastTime: msgTime }].concat(prev.slice(0, 49));
        localStorage.setItem('xtox_conversations', JSON.stringify(upd));
        return upd;
      });
    });
    s.on('typing', function() {
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(function() { setIsTyping(false); }, 3000);
    });
    // Note: call signaling is handled by CallManager component (call:* events via Socket.IO)
    // Old call_offer/incoming_call listeners removed to avoid conflict with CallManager
  }

  // Create RTCPeerConnection
  function createPeerConnection(s, remoteId) {
    var pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] });
    pc.ontrack = function(e) { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };
    pc.onicecandidate = function(e) { if (e.candidate) s.emit('ice_candidate', { to: remoteId, candidate: e.candidate }); };
    pcRef.current = pc;
    return pc;
  }

  // Start outgoing call
  async function startCall() {
    if (!targetId || !socketRef.current) return;
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('المتصفح لا يدعم المكالمات الصوتية | Browser does not support voice calls');
      return;
    }
    setCallState('calling');
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      var pc = createPeerConnection(socketRef.current, targetId);
      stream.getTracks().forEach(function(t) { pc.addTrack(t, stream); });
      var offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socketRef.current.emit('call_offer', { to: targetId, from: myId, offer: pc.localDescription });
    } catch(e) {
      setCallState('idle');
    }
  }

  // Accept incoming call
  async function acceptCall() {
    if (!incomingCall || !socketRef.current) return;
    var from  = incomingCall.from;
    var offer = incomingCall.offer;
    setIncomingCall(null);
    if (typeof navigator === 'undefined' || !navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      alert('المتصفح لا يدعم المكالمات الصوتية | Browser does not support voice calls');
      return;
    }
    try {
      var stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStreamRef.current = stream;
      var pc = createPeerConnection(socketRef.current, from);
      stream.getTracks().forEach(function(t) { pc.addTrack(t, stream); });
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      var answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socketRef.current.emit('call_answer', { to: from, answer: pc.localDescription });
      setCallState('active');
    } catch(e) {
      setCallState('idle');
    }
  }

  // End call
  function endCall() {
    var tid = targetId || (incomingCall ? incomingCall.from : null);
    if (socketRef.current && tid) socketRef.current.emit('call_end', { to: tid });
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(function(t) { t.stop(); });
      localStreamRef.current = null;
    }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setIsMuted(false);
    setCallState('idle');
  }

  // Toggle mute
  function toggleMute() {
    if (!localStreamRef.current) return;
    var newMuted = !isMuted;
    localStreamRef.current.getAudioTracks().forEach(function(t) { t.enabled = !newMuted; });
    setIsMuted(newMuted);
  }

  // Reject incoming call
  function rejectIncomingCall() {
    if (!incomingCall || !socketRef.current) return;
    socketRef.current.emit('call_end', { to: incomingCall.from });
    setIncomingCall(null);
    setCallState('idle');
  }

  // Send text message
  function sendMessage() {
    if (!msg.trim() || !socketRef.current || !targetId) return;
    // Guard: prevent sending messages to archived/sold chats
    if (chatStatus === 'archived' || adStatus === 'sold') return;
    var now  = Date.now();
    var text = msg;
    setMsg('');
    setMessages(function(prev) { return prev.concat([{ from: 'me', text: text, type: 'text', duration: 0, time: now, readBy: [] }]); });
    socketRef.current.emit('send_message', { from: myId, to: targetId, text: text, time: now });
    setConversations(function(prev) {
      var exists = prev.find(function(c) { return c.id === targetId; });
      var upd = exists
        ? prev.map(function(c) { return c.id === targetId ? Object.assign({}, c, { lastMessage: text, lastTime: now }) : c; })
        : [{ id: targetId, lastMessage: text, lastTime: now }].concat(prev.slice(0, 49));
      localStorage.setItem('xtox_conversations', JSON.stringify(upd));
      return upd;
    });
    var currentChatId = chatIdRef.current;
    var token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (token && currentChatId) {
      fetch(API_URL + '/api/chat/' + currentChatId + '/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: 'Bearer ' + token },
        body: JSON.stringify({ text: text }),
      }).catch(function() {});
    }
  }

  function handleTyping(e) {
    setMsg(e.target.value);
    if (socketRef.current && targetId) socketRef.current.emit('typing', { to: targetId, from: myId });
  }

  function shareLocation() {
    if (!navigator.geolocation) { alert('GPS غير متاح'); return; }
    navigator.geolocation.getCurrentPosition(function(pos) {
      var lat = pos.coords.latitude;
      var lng = pos.coords.longitude;
      var locationMsg = { type: 'location', lat: lat, lng: lng, label: 'موقعي الحالي', text: 'موقعي: ' + lat.toFixed(5) + ', ' + lng.toFixed(5), from: 'me', time: Date.now() };
      if (socketRef.current && targetId) socketRef.current.emit('send_message', Object.assign({ from: myId, to: targetId }, locationMsg));
      setMessages(function(prev) { return prev.concat([locationMsg]); });
    });
  }

  // Call button config
  var callConfig = {
    idle:    { label: 'مكالمة',           bg: '#16a34a', action: startCall, disabled: false },
    calling: { label: 'جار الاتصال...',  bg: '#f97316', action: null,      disabled: true  },
    ringing: { label: 'واردة...',          bg: '#22c55e', action: null,      disabled: true  },
    active:  { label: 'إنهاء المكالمة',   bg: '#ef4444', action: endCall,   disabled: false },
    ended:   { label: 'انتهت',             bg: '#9ca3af', action: null,      disabled: true  },
  };
  var cc = callConfig[callState] || callConfig.idle;

  var totalUnread = Object.values(unreadCounts).reduce(function(s, n) { return s + n; }, 0);

  // Mobile panel visibility logic
  // On mobile: show conv panel when showConvPanel=true OR no targetId
  // On mobile: show messages when !showConvPanel AND targetId set
  var convPanelVisible = !isMobile || showConvPanel || !targetId;
  var messageAreaVisible = !isMobile || (!showConvPanel && !!targetId);

  return (
    <div dir="rtl" lang="ar" style={{ height: 'calc(100dvh - 60px)', display: 'flex', flexDirection: 'column', fontFamily: "'Cairo', 'Noto Sans Arabic', system-ui, sans-serif", background: '#f1f5f9', overflow: 'hidden' }}>

      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* CallManager handles all call UI (incoming/active overlays) */}
      <CallManager ref={callManagerRef} socket={socketInstance} currentUser={currentUser} />

      <header role="banner" style={{ background: '#1e293b', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0, boxShadow: '0 2px 8px rgba(0,0,0,0.2)' }}>
        <button onClick={function() {
          if (isMobile && targetId && !showConvPanel) {
            setShowConvPanel(true);
          } else {
            history.back();
          }
        }} aria-label="العودة للخلف"
          style={{ background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          &#8594;
        </button>
        <button onClick={function() { setShowConvPanel(function(p) { return !p; }); }} aria-label="قائمة المحادثات"
          style={{ position: 'relative', background: 'rgba(255,255,255,0.12)', border: 'none', color: 'white', fontSize: 18, cursor: 'pointer', borderRadius: 8, width: 36, height: 36, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          &#128172;
          {totalUnread > 0 && (
            <span aria-label={totalUnread + ' رسائل غير مقروءة'}
              style={{ position: 'absolute', top: -4, left: -4, minWidth: 18, height: 18, background: '#23e5db', color: '#002f34', borderRadius: 9, fontSize: 11, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>
              {totalUnread > 99 ? '99+' : totalUnread}
            </span>
          )}
        </button>
        <div aria-hidden="true" style={{ width: 40, height: 40, borderRadius: '50%', background: '#f97316', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0 }}>
          &#128100;
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 'bold', fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {targetId ? 'محادثة مع ' + (sellerName || targetId) : 'اختر محادثة للبدء'}
          </p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>
            {joined ? 'متصل' : 'جار الاتصال...'}
          </p>
        </div>
        {targetId && (
          <>
            <button
              onClick={function() { callManagerRef.current?.initiateCall(targetId, sellerName || targetId); }}
              title="مكالمة صوتية"
              aria-label="مكالمة صوتية عبر WebRTC"
              style={{ background: 'none', border: 'none', fontSize: 22, cursor: 'pointer', marginRight: 8, flexShrink: 0 }}>
              📞
            </button>
            <button
              onClick={function() { callManagerRef.current?.initiateCall(targetId, sellerName || targetId); }}
              aria-label="بدء مكالمة صوتية"
              style={{ background: '#16a34a', color: 'white', border: 'none', padding: '8px 14px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 'bold', fontFamily: 'inherit', whiteSpace: 'nowrap', flexShrink: 0 }}>
              مكالمة
            </button>
          </>
        )}
      </header>

      {/* Body: conversation panel + message area side by side */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Conversations panel */}
        <div
          aria-label="قائمة المحادثات"
          style={{
            width: isMobile ? '100%' : 320,
            height: '100%',
            overflowY: 'auto',
            flexShrink: 0,
            background: '#002f34',
            display: convPanelVisible ? 'flex' : 'none',
            flexDirection: 'column',
            borderLeft: isMobile ? 'none' : '1px solid rgba(35,229,219,0.15)',
          }}>
          <div style={{ padding: '12px 16px', borderBottom: '1px solid rgba(35,229,219,0.2)', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: '#001f23', flexShrink: 0 }}>
            <h2 style={{ margin: 0, color: '#23e5db', fontSize: 16, fontWeight: 'bold' }}>المحادثات</h2>
            {isMobile && targetId && (
              <button onClick={function() { setShowConvPanel(false); }} aria-label="إغلاق"
                style={{ background: 'rgba(255,255,255,0.1)', border: 'none', color: 'white', cursor: 'pointer', borderRadius: 6, width: 32, height: 32, fontSize: 16, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                &#x2715;
              </button>
            )}
          </div>
          {loginRequired ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.5)', fontSize: 14, gap: 8, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>&#128274;</div>
              <p style={{ margin: 0 }}>سجّل الدخول للمحادثات</p>
              <a href="/login" style={{ color: '#23e5db', fontSize: 13, marginTop: 4 }}>تسجيل الدخول</a>
            </div>
          ) : chatError && historyLoaded ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14, gap: 10, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>⚠️</div>
              <p style={{ margin: 0 }}>{chatError}</p>
              <button onClick={function() { setChatError(''); setHistoryLoaded(false); window.location.reload(); }} style={{ color: '#23e5db', background: 'none', border: '1px solid #23e5db', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>إعادة المحاولة</button>
            </div>
          ) : !historyLoaded && apiChats.length === 0 ? (
            <div style={{ flex: 1, padding: 16, display: 'flex', flexDirection: 'column', gap: 10 }}>
              {[1,2,3].map(function(i) {
                return (
                  <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.07)', opacity: 0.4 }}>
                    <div style={{ width: 42, height: 42, borderRadius: '50%', background: 'rgba(255,255,255,0.15)', flexShrink: 0 }} />
                    <div style={{ flex: 1 }}>
                      <div style={{ height: 12, background: 'rgba(255,255,255,0.15)', borderRadius: 6, marginBottom: 6, width: '60%' }} />
                      <div style={{ height: 10, background: 'rgba(255,255,255,0.1)', borderRadius: 6, width: '80%' }} />
                    </div>
                  </div>
                );
              })}
            </div>
          ) : historyLoaded && apiChats.length === 0 ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.45)', fontSize: 14, gap: 8, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 40 }}>&#128172;</div>
              <p style={{ margin: 0, lineHeight: 1.6 }}>لا توجد محادثات بعد. ابدأ محادثة من صفحة أي إعلان!</p>
            </div>
          ) : (
            <ul style={{ listStyle: 'none', margin: 0, padding: 0, flex: 1, overflowY: 'auto' }}>
              {conversations.map(function(conv) {
                var unread   = unreadCounts[conv.id] || 0;
                var isActive = conv.id === targetId;
                return (
                  <li key={conv.id}>
                    <button
                      onClick={function() {
                        setUnreadCounts(function(prev) {
                          var u = Object.assign({}, prev);
                          delete u[conv.id];
                          localStorage.setItem('xtox_unread_counts', JSON.stringify(u));
                          return u;
                        });
                        setShowConvPanel(false);
                        var dest = conv.chatId
                          ? '/chat?chatId=' + encodeURIComponent(conv.chatId) + '&target=' + encodeURIComponent(conv.id) + (conv.name ? '&sellerName=' + encodeURIComponent(conv.name) : '')
                          : '/chat?target=' + encodeURIComponent(conv.id) + (conv.name ? '&sellerName=' + encodeURIComponent(conv.name) : '');
                        router.push(dest);
                      }}
                      style={{ width: '100%', background: isActive ? 'rgba(35,229,219,0.15)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right' }}>
                      <div style={{ width: 42, height: 42, borderRadius: '50%', background: isActive ? '#23e5db' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, flexShrink: 0, color: isActive ? '#002f34' : 'white', fontWeight: 'bold' }}>
                        {conv.name ? conv.name.charAt(0).toUpperCase() : '?'}
                      </div>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                        <div style={{ color: isActive ? '#23e5db' : 'white', fontWeight: unread > 0 ? 'bold' : 'normal', fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                          {conv.name || 'محادثة'}
                        </div>
                        {conv.adTitle && (
                          <div style={{ color: isActive ? 'rgba(35,229,219,0.7)' : 'rgba(255,255,255,0.35)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                            📦 {conv.adTitle}
                          </div>
                        )}
                        {conv.lastMessage && (
                          <div style={{ color: unread > 0 ? '#94a3b8' : 'rgba(255,255,255,0.45)', fontSize: 12, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unread > 0 ? '600' : 'normal' }}>
                            {conv.lastMessage}
                          </div>
                        )}
                      </div>
                      {unread > 0 && (
                        <span aria-label={unread + ' رسالة غير مقروءة'}
                          style={{ minWidth: 22, height: 22, background: '#23e5db', color: '#002f34', borderRadius: 11, fontSize: 12, fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 6px', flexShrink: 0 }}>
                          {unread > 99 ? '99+' : unread}
                        </span>
                      )}
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Message area */}
        <div style={{
          flex: 1,
          height: '100%',
          display: messageAreaVisible ? 'flex' : 'none',
          flexDirection: 'column',
          minWidth: 0,
        }}>
          <main role="log" aria-label="سجل المحادثة" aria-live="polite"
            style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {!targetId && (
              <div role="status" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', paddingTop: 80, textAlign: 'center', gap: 12 }}>
                <div style={{ fontSize: 72 }}>&#128172;</div>
                <p style={{ margin: 0, fontSize: 20, fontWeight: 'bold', color: '#64748b' }}>اختر محادثة للبدء</p>
                <p style={{ margin: 0, fontSize: 14, color: '#94a3b8', maxWidth: 260, lineHeight: 1.6 }}>ابحث عن إعلان وتواصل مع البائع مباشرة</p>
              </div>
            )}
            {targetId && messages.length === 0 && (
              <div role="status" style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', paddingTop: 60, textAlign: 'center', gap: 10 }}>
                <div style={{ fontSize: 56 }}>&#128172;</div>
                <p style={{ margin: 0, fontSize: 16, color: '#64748b', fontWeight: 600 }}>ابدأ المحادثة</p>
                <p style={{ margin: 0, fontSize: 13, color: '#94a3b8' }}>أرسل رسالة للتواصل مع {sellerName || targetId}</p>
              </div>
            )}
            {messages.map(function(m, i) {
              var isSent = m.from === 'me';
              return (
                <div key={i} dir="ltr" style={{ display: 'flex', justifyContent: isSent ? 'flex-end' : 'flex-start' }}>
                  {m.type === 'location' ? (
                    <div>
                      <LocationCard msg={m} />
                      <div style={{ fontSize: 11, marginTop: 4, opacity: 0.65, textAlign: isSent ? 'left' : 'right', color: '#64748b' }}>{arabicRelTime(m.time)}</div>
                    </div>
                  ) : (
                    <div dir="rtl" role="article" aria-label={isSent ? 'رسالتك' : 'رسالة من ' + m.from}
                      style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: isSent ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: isSent ? '#f97316' : '#ffffff', color: isSent ? '#ffffff' : '#1e293b', boxShadow: '0 1px 4px rgba(0,0,0,0.10)', fontSize: 15, lineHeight: 1.55, wordBreak: 'break-word' }}>
                      {m.type === 'image' && m.text ? (
                        <img src={m.text} alt="صورة مرسلة" loading="lazy"
                          style={{ maxWidth: '100%', maxHeight: 240, borderRadius: 8, display: 'block', cursor: 'pointer' }}
                          onError={function(e) { e.target.style.display='none'; }}
                          onClick={function() { window.open(m.text, '_blank'); }}
                        />
                      ) : m.type === 'voice' && m.text ? (
                        <div style={{ minWidth: 180 }}>
                          <audio controls src={m.text} style={{ width: '100%', height: 36, outline: 'none' }} preload="none">
                            متصفحك لا يدعم تشغيل الصوت
                          </audio>
                          {m.duration > 0 && <div style={{ fontSize: 11, color: isSent ? 'rgba(255,255,255,0.7)' : '#6b7280', marginTop: 4 }}>🎙 {Math.floor(m.duration / 60) > 0 ? Math.floor(m.duration / 60) + ':' : ''}{String(m.duration % 60).padStart(2,'0')} ثانية</div>}
                        </div>
                      ) : (
                        <div style={{ whiteSpace: 'pre-wrap' }}>{m.text}</div>
                      )}
                      <div style={{ fontSize: 11, marginTop: 4, display: 'flex', alignItems: 'center', justifyContent: isSent ? 'flex-start' : 'flex-end', gap: 3, opacity: 0.75 }}>
                        <span>{arabicRelTime(m.time)}</span>
                        {isSent && (
                          <span style={{ color: (m.readBy && m.readBy.length > 0) ? '#34d399' : 'inherit', fontSize: 12, fontWeight: 700 }} title={(m.readBy && m.readBy.length > 0) ? 'تمت القراءة' : 'تم الإرسال'}>
                            {(m.readBy && m.readBy.length > 0) ? '✓✓' : '✓'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {isTyping && <TypingDots />}
            <div ref={messagesEndRef} aria-hidden="true" />
          </main>

          {targetId && (
            <>
              {/* ── Sold / Archived banner ──────────────────────────────────── */}
              {(chatStatus === 'archived' || adStatus === 'sold') && (
                <div role="status" aria-live="polite" dir="rtl"
                  style={{ background: '#1e3a5f', color: '#93c5fd', padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, fontWeight: 600, flexShrink: 0, borderTop: '1px solid rgba(147,197,253,0.2)' }}>
                  <span style={{ fontSize: 18 }}>🏷️</span>
                  <span>تم بيع هذا الإعلان — المحادثة مغلقة ولا يمكن إرسال رسائل جديدة</span>
                </div>
              )}

              <footer style={{ background: '#ffffff', padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 -2px 8px rgba(0,0,0,0.07)', flexShrink: 0, direction: 'rtl' }}>
                {/* Disable all inputs when chat is archived (ad sold/closed) */}
                {chatStatus === 'archived' || adStatus === 'sold' ? (
                  <div style={{ flex: 1, padding: '11px 16px', borderRadius: 24, border: '1.5px solid #e2e8f0', fontSize: 14, background: '#f1f5f9', color: '#94a3b8', textAlign: 'center', userSelect: 'none' }}>
                    المحادثة مغلقة
                  </div>
                ) : (
                  <>
                    <button onClick={shareLocation} aria-label="مشاركة الموقع"
                      style={{ background: '#f0f7ff', border: '1.5px solid #4285F4', borderRadius: '50%', width: 46, height: 46, cursor: 'pointer', fontSize: 20, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      &#128205;
                    </button>
                    <input
                      id="chat-message-input"
                      name="chat-message"
                      value={msg}
                      onChange={handleTyping}
                      onKeyDown={function(e) { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
                      placeholder="اكتب رسالة..."
                      dir="rtl"
                      aria-label="حقل كتابة الرسالة"
                      style={{ flex: 1, padding: '11px 16px', borderRadius: 24, border: '1.5px solid #e2e8f0', fontSize: 16, fontFamily: 'inherit', outline: 'none', background: '#f8fafc', color: '#1e293b' }}
                      onFocus={function(e) { e.target.style.borderColor = '#f97316'; }}
                      onBlur={function(e) { e.target.style.borderColor = '#e2e8f0'; }}
                    />
                    <button onClick={sendMessage} disabled={!msg.trim()} aria-label="إرسال الرسالة"
                      style={{ background: msg.trim() ? '#f97316' : '#e2e8f0', color: msg.trim() ? '#ffffff' : '#94a3b8', border: 'none', borderRadius: '50%', width: 46, height: 46, cursor: msg.trim() ? 'pointer' : 'not-allowed', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                      &#8593;
                    </button>
                  </>
                )}
              </footer>
            </>
          )}
        </div>
      </div>

      <style>{[
        '@keyframes xtox-bounce {',
        '  0%, 60%, 100% { transform: translateY(0); opacity: 0.35; }',
        '  30% { transform: translateY(-7px); opacity: 1; }',
        '}',
        '@keyframes xtox-pop {',
        '  from { transform: scale(0.85); opacity: 0; }',
        '  to { transform: scale(1); opacity: 1; }',
        '}',
        '@keyframes xtox-ring {',
        '  0% { transform: scale(0.9); opacity: 0.7; }',
        '  100% { transform: scale(1.6); opacity: 0; }',
        '}',
        '@keyframes xtox-badge-pulse {',
        '  0%, 100% { transform: scale(1); }',
        '  50% { transform: scale(1.12); }',
        '}',
      ].join('\n')}</style>
    </div>
  );
}
