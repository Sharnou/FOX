'use client';
export const dynamic = 'force-dynamic';
import { useEffect, useState, useRef, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import CallManager from '../components/CallManager';
import { playNotificationSound } from '../utils/notificationSound';
import { useLanguage } from '../context/LanguageContext';

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


// Resolve best display name from a populated user object
// Fallback chain: name → username → xtoxId only (never phone — privacy)
function resolveUserName(u) {
  if (!u || typeof u !== 'object') return '';
  return u.name || u.username || u.xtoxId || '';
}

// Map ad status string for display (frontend helper)
function mapAdStatus(chatAdStatus, adAdStatus) {
  var s = chatAdStatus || adAdStatus || 'available';
  if (s === 'active') return 'available';
  if (['available','inactive','sold','deleted','expired'].indexOf(s) >= 0) return s;
  return 'available';
}

// ── Safe JSON.parse — never crashes on malformed localStorage values (BUG 11) ──
function safeParse(str, fallback) {
  try { var v = JSON.parse(str); return (v !== null && v !== undefined) ? v : fallback; } catch { return fallback; }
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


// ── WhatsApp-style read receipt tick component ────────────────
// ✓ grey = sent | ✓✓ grey = delivered | ✓✓ blue = read
function MessageTick({ status, readBy }) {
  var isRead      = status === 'read' || (readBy && readBy.length > 0);
  var isDelivered = status === 'delivered' || status === 'read';

  if (isRead) {
    // ✓✓ BLUE — recipient has read the message
    return (
      <span
        aria-label="تمت القراءة"
        title="تمت القراءة"
        style={{ fontSize: 13, color: '#53bdeb', marginLeft: 2, letterSpacing: -1, fontWeight: 700, lineHeight: 1 }}>
        ✓✓
      </span>
    );
  }
  if (isDelivered) {
    // ✓✓ GREY — delivered to recipient's device
    return (
      <span
        aria-label="تم التسليم"
        title="تم التسليم"
        style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginLeft: 2, letterSpacing: -1, fontWeight: 700, lineHeight: 1 }}>
        ✓✓
      </span>
    );
  }
  // ✓ GREY — sent to server
  return (
    <span
      aria-label="تم الإرسال"
      title="تم الإرسال"
      style={{ fontSize: 13, color: 'rgba(255,255,255,0.65)', marginLeft: 2, fontWeight: 700, lineHeight: 1 }}>
      ✓
    </span>
  );
}

// Location message card — inline OSRM directions (no new tab)
function LocationCard({ msg }) {
  const [dirInfo, setDirInfo] = useState(null);
  const [dirErr, setDirErr]   = useState('');
  const [loading, setLoading] = useState(false);

  const getInlineDirections = () => {
    if (!navigator.geolocation) { setDirErr('المتصفح لا يدعم تحديد الموقع'); return; }
    setLoading(true); setDirErr(''); setDirInfo(null);
    navigator.geolocation.getCurrentPosition(async (pos) => {
      const { latitude: uLat, longitude: uLng } = pos.coords;
      try {
        const url = 'https://router.project-osrm.org/route/v1/driving/' +
          uLng + ',' + uLat + ';' + msg.lng + ',' + msg.lat +
          '?overview=false';
        const res  = await fetch(url, { signal: AbortSignal.timeout(8000) });
        const data = await res.json();
        if (data.code === 'Ok' && data.routes?.[0]) {
          const r = data.routes[0];
          setDirInfo({
            dist: (r.distance / 1000).toFixed(1),
            mins: Math.round(r.duration / 60),
          });
        } else { setDirErr('تعذر حساب المسار'); }
      } catch { setDirErr('فشل تحميل المسار'); }
      setLoading(false);
    }, () => { setDirErr('يرجى السماح بالوصول إلى موقعك'); setLoading(false); });
  };

  return (
    <div style={{ background: '#f0f7ff', border: '1px solid #4285F4', borderRadius: 12, padding: '10px 14px', minWidth: 200 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 8 }}>
        <span style={{ fontSize: 20 }}>&#128205;</span>
        <div style={{ fontWeight: 700, fontSize: 14, color: '#002f34' }}>موقعي الحالي</div>
      </div>
      <div style={{ display: 'flex', gap: 8 }}>
        <a href={'https://www.openstreetmap.org/?mlat=' + msg.lat + '&mlon=' + msg.lng + '&zoom=15'}
          target="_blank" rel="noopener noreferrer"
          style={{ flex: 1, background: '#4285F4', color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 8, fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>
          &#128506; عرض
        </a>
        <button onClick={getInlineDirections} disabled={loading}
          style={{ flex: 1, background: '#002f34', color: '#fff', textAlign: 'center', padding: '6px', borderRadius: 8, fontSize: 12, fontWeight: 700, border: 'none', cursor: 'pointer', fontFamily: 'inherit' }}>
          {loading ? '⏳' : '🧭 اتجاهات'}
        </button>
      </div>
      {dirInfo && (
        <div style={{ marginTop: 8, fontSize: 12, color: '#374151', direction: 'rtl', background: '#fff', borderRadius: 8, padding: '6px 10px' }}>
          🚗 {dirInfo.dist} كم &nbsp;·&nbsp; ⏱ {dirInfo.mins} دقيقة
        </div>
      )}
      {dirErr && (
        <div style={{ marginTop: 6, fontSize: 11, color: '#dc2626', direction: 'rtl' }}>{dirErr}</div>
      )}
    </div>
  );
}

// Main ChatPage component
function ChatPageInner() {
  var router = useRouter();
  var searchParams = useSearchParams();
  var { t } = useLanguage();
  var [myId, setMyId]                   = useState('');
  var [currentUser, setCurrentUser]     = useState(null);
  var [targetId, setTargetId]           = useState('');
  var [sellerName, setSellerName]       = useState('');
  var [sellerAvatar, setSellerAvatar]   = useState('');
  var [joined, setJoined]               = useState(false);
  var [messages, setMessages]           = useState([]);
  var [msg, setMsg]                     = useState('');
  // BUG8: callState/incomingCall/isMuted/callDuration removed — CallManager handles all call UI
  var [isTyping, setIsTyping]           = useState(false);
  var [conversations, setConversations] = useState([]);
  var [unreadCounts, setUnreadCounts]   = useState({});
  var [showConvPanel, setShowConvPanel] = useState(false);
  var [chatId, setChatId]               = useState('');
  var [apiChats, setApiChats]           = useState([]);
  var [historyLoaded, setHistoryLoaded] = useState(false);
  var [loginRequired, setLoginRequired] = useState(false);
  var [chatError, setChatError]         = useState('');
  var [partnerOnline, setPartnerOnline] = useState(false); // online presence indicator
  var [partnerLastSeen, setPartnerLastSeen] = useState(null); // last seen timestamp (ms)
  var [onlineUsers, setOnlineUsers]     = useState(new Set()); // all online users (for conv list)
  var [isMobile, setIsMobile]           = useState(false);
  var [socketInstance, setSocketInstance] = useState(null);
  var [chatStatus, setChatStatus]       = useState('active'); // 'active' | 'archived' | 'blocked'
  var [adStatus, setAdStatus]           = useState('');       // 'sold' | '' | etc.
  var [closeAt, setCloseAt]             = useState(null);     // Date when chat will be permanently deleted (7 days after ad sold/deleted)
  var [chatClosed, setChatClosed]       = useState(false);    // true when backend emits chat:closed in real-time
  var [chatClosedStatus, setChatClosedStatus] = useState('sold'); // 'sold' | 'deleted'

  var remoteAudioRef  = useRef(null);
  var messagesEndRef  = useRef(null);
  var typingTimerRef  = useRef(null);
  var socketRef       = useRef(null);
  var chatIdRef       = useRef('');
  var callManagerRef  = useRef(null);
  var pendingRejectRef = useRef(''); // BUG7: stores reject_call roomId until socket connects

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
  // NOTE: deps include searchParams so this re-runs on client-side navigation
  useEffect(function() {
    if (typeof window !== 'undefined') {
      var user   = safeParse(localStorage.getItem('user'), {});
      var uid    = user.id || user._id || '';
      var cid    = searchParams.get('chatId') || new URLSearchParams(window.location.search).get('chatId') || '';
      var tid    = searchParams.get('target') || new URLSearchParams(window.location.search).get('target') || '';
      var sname  = searchParams.get('sellerName') || new URLSearchParams(window.location.search).get('sellerName') || '';
      // Handle push notification reject: /chat?reject_call=<roomId>
      var rejectRoomId = searchParams.get('reject_call') || new URLSearchParams(window.location.search).get('reject_call') || '';
      // BUG7 FIX: socket may not be ready yet — store in ref and emit inside connect handler
      if (rejectRoomId) pendingRejectRef.current = rejectRoomId;
      setCurrentUser(user);
      setTargetId(tid);
      if (sname) setSellerName(sname);
      // If chatId changed: clear stale messages and re-init
      if (cid && cid !== chatIdRef.current) {
        setMessages([]);
        setChatId(cid);
        chatIdRef.current = cid;
      } else if (!chatIdRef.current) {
        setChatId(cid);
        chatIdRef.current = cid;
      }
      if (!myId && uid) setMyId(uid);
    }
  }, [searchParams]);

  // Auto-scroll to latest message
  useEffect(function() {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Load conversations from localStorage
  useEffect(function() {
    if (typeof window === 'undefined') return;
    var stored = safeParse(localStorage.getItem('xtox_conversations'), []);
    setConversations(stored);
    var storedUnread = safeParse(localStorage.getItem('xtox_unread_counts'), {});
    if (targetId && storedUnread[targetId]) {
      var upd = Object.assign({}, storedUnread);
      delete upd[targetId];
      localStorage.setItem('xtox_unread_counts', JSON.stringify(upd));
      setUnreadCounts(upd);
    } else {
      setUnreadCounts(storedUnread);
    }
  }, [targetId]);


  // ── WhatsApp-style: Emit mark_read when chat opens or window regains focus ──
  // This turns all unread messages blue (✓✓ blue) on the sender's screen
  useEffect(function() {
    var cid = chatId || chatIdRef.current;
    if (!cid || !myId) return;

    function emitMarkRead() {
      // Via socket (real-time, preferred):
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('mark_read', { chatId: cid });
      }
      // Via REST fallback (ensures DB is updated even if socket fails):
      var token = null;
      try { token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('xtox_token')) : null; } catch(e) {}
      if (token) {
        fetch(API_URL + '/api/chat/' + cid + '/read', {
          method: 'POST',
          headers: { Authorization: 'Bearer ' + token },
        }).catch(function() {});
      }
    }

    // Mark as read immediately on chat open
    emitMarkRead();

    // Re-mark when window regains focus (user switches back from another tab)
    function onFocus() { emitMarkRead(); }
    window.addEventListener('focus', onFocus);
    return function() { window.removeEventListener('focus', onFocus); };
  }, [chatId, myId]);

  // ── Online/offline presence ─────────────────────────────────────────────────
  useEffect(function() {
    var socket = socketInstance;
    if (!socket || !targetId) return;

    // Check initial status of current chat partner
    socket.emit('check_online', { userId: targetId }, function(res) {
      if (res) setPartnerOnline(!!res.online);
    });

    var onOnline = function(data) {
      if (String(data.userId) === String(targetId)) setPartnerOnline(true);
      setOnlineUsers(function(prev) { var s = new Set(prev); s.add(String(data.userId)); return s; });
    };
    var onOffline = function(data) {
      if (String(data.userId) === String(targetId)) setPartnerOnline(false);
      setOnlineUsers(function(prev) { var s = new Set(prev); s.delete(String(data.userId)); return s; });
    };

    // Also listen for the structured user:status event (set by socket.js on connect/disconnect)
    var onUserStatus = function(data) {
      if (String(data.userId) === String(targetId)) {
        setPartnerOnline(!!data.isOnline);
        if (!data.isOnline && data.lastSeen) {
          setPartnerLastSeen(new Date(data.lastSeen).getTime());
        }
      }
      if (data.isOnline) {
        setOnlineUsers(function(prev) { var s = new Set(prev); s.add(String(data.userId)); return s; });
      } else {
        setOnlineUsers(function(prev) { var s = new Set(prev); s.delete(String(data.userId)); return s; });
      }
    };

    socket.on('user_online', onOnline);
    socket.on('user_offline', onOffline);
    socket.on('user:status', onUserStatus);

    // Fix A: query current online status of chat partner immediately after listeners are
    // attached — we may have missed the user:status broadcast that fired at connect time
    // (React renders async after setSocketInstance, so the broadcast is often missed).
    var doCheckPartnerOnline = function() {
      socket.emit('check_online', { userId: targetId }, function(res) {
        if (res) setPartnerOnline(!!res.online);
      });
    };
    if (socket.connected) {
      doCheckPartnerOnline();
    } else {
      socket.once('connect', doCheckPartnerOnline);
    }

    return function() {
      socket.off('user_online', onOnline);
      socket.off('user_offline', onOffline);
      socket.off('user:status', onUserStatus);
      socket.off('connect', doCheckPartnerOnline); // BUG6 FIX: prevent stale once-listener
    };
  }, [socketInstance, targetId]);

  // Re-fetch messages when chatId changes (fixes blank page on client-side navigation)
  useEffect(function() {
    var cid = chatId || chatIdRef.current;
    if (!cid || !myId) return;
    var token = null;
    try {
      var stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
      var userObj = stored ? safeParse(stored, null) : null;
      token = (userObj && userObj.token) || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    } catch(e) {}
    if (!token) return;
    // Clear stale messages before loading new ones
    setMessages([]);
    fetch(API_URL + '/api/chat/' + cid + '/messages?limit=50', { headers: { Authorization: 'Bearer ' + token } })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(function(msgData) {
        if (!msgData) return;
        var msgs = (msgData.messages || []).slice().reverse();
        setMessages(msgs.map(function(m) {
          return { from: (String(m.sender) === String(myId)) ? 'me' : m.sender, text: m.text || '', type: m.type || 'text', duration: m.duration || 0, time: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(), readBy: m.readBy || [], status: m.status || (m.readBy && m.readBy.length > 0 ? 'read' : 'sent') };
        }));
        // Pick up adTitle/adStatus from messages endpoint (Fix 3)
        if (msgData.adTitle) setApiChats(function(prev) {
          return prev.map(function(ac) { return String(ac._id) === cid ? Object.assign({}, ac, { adTitle: msgData.adTitle }) : ac; });
        });
        if (msgData.adStatus) setAdStatus(function(prev) { return prev || msgData.adStatus; });
        if (msgData.status === 'closed') { setChatStatus('closed'); setChatClosed(true); }
      })
      .catch(function() {});
    // Also rejoin socket room for the new chat
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('join', myId);
    }
  }, [chatId, myId]);

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
        // BUG22 FIX: clean up the io-manager reconnect listener
        try { socketRef.current.io.off('reconnect'); } catch {}
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
      var userObj = stored ? safeParse(stored, null) : null;
      token = (userObj && userObj.token) || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
    } catch(e) {}
    if (!token) {
      setLoginRequired(true);
      setHistoryLoaded(true);
      return;
    }
    setLoginRequired(false);
    var _chatFetchController = new AbortController();
    var _chatFetchTimeout = setTimeout(function() { _chatFetchController.abort(); }, 10000);
    fetch(API_URL + '/api/chat', { headers: { Authorization: 'Bearer ' + token }, signal: _chatFetchController.signal })
      .then(function(r) { return r.ok ? r.json() : null; })
      .then(async function(data) {
        clearTimeout(_chatFetchTimeout);
        if (!data) { setChatError('chat_load_failed'); setHistoryLoaded(true); return; }
        var chatList = data.chats || (Array.isArray(data) ? data : []);
        setApiChats(chatList);
        var apiConvs = chatList.map(function(c) {
          // buyer/seller are populated objects: { _id, name, avatar, ... }
          // Robust ID extraction: handles ObjectId, populated object, and string
          var buyerId  = ((c.buyer?._id  || c.buyer )?.toString?.()  || '').replace(/^new ObjectId\("?|"?\)$/g,'');
          var sellerId = ((c.seller?._id || c.seller)?.toString?.() || '').replace(/^new ObjectId\("?|"?\)$/g,'');
          var otherId = '', otherName = '', otherAvatar = '', otherXtoxId = '';
          var myIdStr = String(myId);
          if (buyerId && buyerId !== myIdStr && buyerId.length >= 5) {
            otherId = buyerId;
            otherName = resolveUserName(c.buyer);
            otherAvatar = (c.buyer && typeof c.buyer === 'object') ? (c.buyer.avatar || '') : '';
            otherXtoxId = (c.buyer && typeof c.buyer === 'object') ? (c.buyer.xtoxId || '') : '';
          } else if (sellerId && sellerId !== myIdStr && sellerId.length >= 5) {
            otherId = sellerId;
            otherName = resolveUserName(c.seller);
            otherAvatar = (c.seller && typeof c.seller === 'object') ? (c.seller.avatar || '') : '';
            otherXtoxId = (c.seller && typeof c.seller === 'object') ? (c.seller.xtoxId || '') : '';
          }
          var lastMsg = c.lastMessage || (c.messages && c.messages.length > 0 ? c.messages[c.messages.length - 1] : null);
          var adTitle = (c.adTitle && c.adTitle !== '') 
            ? c.adTitle 
            : (c.ad && c.ad.title) 
            ? c.ad.title 
            : (c.lastMessage && c.lastMessage.text && c.lastMessage.type !== 'system')
            ? c.lastMessage.text.slice(0, 40)
            : '';
          return { id: otherId, name: otherName, xtoxId: otherXtoxId, avatar: otherAvatar, adTitle: adTitle, adStatus: mapAdStatus(c.adStatus, c.ad && c.ad.status), chatId: c._id, lastMessage: lastMsg ? (lastMsg.text || '') : '', lastTime: (lastMsg && lastMsg.createdAt) ? new Date(lastMsg.createdAt).getTime() : 0 };
        }).filter(function(c) { return c.id; });
        setConversations(function(prev) {
          var merged = apiConvs.slice();
          prev.forEach(function(c) { if (!merged.find(function(m) { return (m.chatId && m.chatId === c.chatId) || m.id === c.id; })) merged.push(c); });
          // Fix C: dedup by chatId — never show the same chatId twice
          var seenChatIds = new Set();
          var deduped = merged.filter(function(c) {
            var key = c.chatId || c.id;
            if (seenChatIds.has(key)) return false;
            seenChatIds.add(key);
            return true;
          });
          var sorted = deduped.sort(function(a, b) { return (b.lastTime || 0) - (a.lastTime || 0); });
          try { localStorage.setItem('xtox_conversations', JSON.stringify(sorted)); } catch(_e) {}
          return sorted;
        });
        var urlChatId = new URLSearchParams(window.location.search).get('chatId');
        if (urlChatId) {
          var chat = chatList.find(function(c) { return String(c._id) === urlChatId; });
          if (chat) {
            var buyerId2  = ((chat.buyer?._id  || chat.buyer )?.toString?.()  || '').replace(/^new ObjectId\("?|"?\)$/g,'');
            var sellerId2 = ((chat.seller?._id || chat.seller)?.toString?.() || '').replace(/^new ObjectId\("?|"?\)$/g,'');
            var myIdStr2  = String(myId);
            var otherId = '', otherName2 = '';
            if (buyerId2 && buyerId2 !== myIdStr2 && buyerId2.length >= 5) { otherId = buyerId2; otherName2 = (chat.buyer && typeof chat.buyer === 'object') ? (chat.buyer.name || '') : ''; }
            else if (sellerId2 && sellerId2 !== myIdStr2 && sellerId2.length >= 5) { otherId = sellerId2; otherName2 = (chat.seller && typeof chat.seller === 'object') ? (chat.seller.name || '') : ''; }
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
                  return { from: (m.sender === myId || String(m.sender) === String(myId)) ? 'me' : m.sender, text: m.text || '', type: m.type || 'text', duration: m.duration || 0, time: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(), readBy: m.readBy || [], status: m.status || (m.readBy && m.readBy.length > 0 ? 'read' : 'sent') };
                }));
              }
            // Read chat status (archived = ad sold or admin closed)
            if (chat.status) setChatStatus(chat.status);
            // Set closeAt for 7-day countdown display
            if (chat.closeAt) setCloseAt(new Date(chat.closeAt));
            // If chat is linked to an ad, fetch the ad status to show sold banner
            if (chat.ad) {
              try {
                var adRes = await fetch(API_URL + '/api/ads/' + (chat.ad?._id || chat.ad));
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
      .catch(function(e) {
        clearTimeout(_chatFetchTimeout);
        if (e && e.name === 'AbortError') {
          setChatError('error_network');
        } else {
          setChatError('chat_load_failed');
        }
        setHistoryLoaded(true);
      });
    return function() { _chatFetchController.abort(); };
  }, [myId]);

  // Socket setup
  async function joinChat() {
    if (!myId) return;
    var ioModule = await import('socket.io-client');
    var io = ioModule.io || ioModule.default;
    var token = typeof window !== 'undefined' ? (localStorage.getItem('token') || localStorage.getItem('xtox_token') || '') : '';
    var s = io(SOCKET_URL, { auth: { token: token }, transports: ['websocket', 'polling'], withCredentials: true });
    socketRef.current = s;
    setSocketInstance(s);
    // Mobile fix: add connection timeout — disconnect if no connect after 8s
    var _socketConnectTimeout = setTimeout(function() {
      if (s && !s.connected) {
        console.warn('[XTOX] Socket connection timed out on mobile');
        s.disconnect();
        // Try reconnect with polling fallback
        setTimeout(function() { if (s) s.connect(); }, 1000);
      }
    }, 8000);
    // Fix A: emit join only after socket is connected (ensures server marks us online
    // before any user:status listeners have a chance to check the value)
    s.on('connect', function() {
      clearTimeout(_socketConnectTimeout);
      s.emit('join', myId);
      // BUG7 FIX: emit pending push-notification reject now that socket is ready
      if (pendingRejectRef.current) {
        s.emit('call:reject_from_push', { roomId: pendingRejectRef.current });
        pendingRejectRef.current = '';
      }
      setJoined(true);
    });
    // Handle already-connected case (reconnection)
    if (s.connected) {
      s.emit('join', myId);
      setJoined(true);
    }
    // BUG22 FIX: Socket.IO v4 removed 'reconnect' from socket instance — use socket.io manager
    s.io.on('reconnect', function() {
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
      // Play notification sound for incoming messages (not from ourselves)
      if (senderId && senderId !== myId) {
        playNotificationSound();
      }
      setMessages(function(prev) { return prev.concat([{ from: senderId, text: data.text, type: data.type || 'text', duration: data.duration || 0, time: msgTime, readBy: [], status: 'sent' }]); });
      // If chat is currently open and window is focused → mark as read immediately
      var curChatId = chatIdRef.current;
      if (curChatId && document.hasFocus()) {
        s.emit('mark_read', { chatId: curChatId });
      }
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
          : [{ id: senderId, chatId: data.chatId || null, lastMessage: data.text, lastTime: msgTime }].concat(prev.slice(0, 49));
        // Only persist conversations that have adTitle or name — skeleton entries will be
        // overwritten by the next API call, so don't persist bare skeletons to localStorage
        var enriched = upd.filter(function(c) { return c.name || c.adTitle || c.xtoxId; });
        if (enriched.length > 0) localStorage.setItem('xtox_conversations', JSON.stringify(upd));
        return upd;
      });
    });

    // ── WhatsApp-style read receipt listeners ──────────────────
    // Sender gets notified that recipient received the message (double grey)
    s.on('message_delivered', function(data) {
      var cid = chatIdRef.current;
      if (!data || !data.chatId || data.chatId !== cid) return;
      setMessages(function(prev) {
        return prev.map(function(m) {
          // Match by tempId (timestamp) or messageId
          if (m.from === 'me' && m.status === 'sent') {
            var tempMatch = data.tempId && (m.tempId === data.tempId || m.time === data.tempId);
            if (tempMatch) {
              return Object.assign({}, m, { status: 'delivered' });
            }
          }
          return m;
        });
      });
    });

    // Sender gets notified that recipient READ the messages (double blue)
    s.on('messages_read', function(data) {
      var cid = chatIdRef.current;
      if (!data || !data.chatId || data.chatId !== cid) return;
      // Update ALL our sent messages in this chat to 'read'
      setMessages(function(prev) {
        return prev.map(function(m) {
          if (m.from === 'me') {
            return Object.assign({}, m, {
              status: 'read',
              readBy: m.readBy && m.readBy.length > 0 ? m.readBy : [data.readBy || 'other'],
            });
          }
          return m;
        });
      });
    });

    // Recipient gets told their unread count for this chat was cleared
    s.on('unread_cleared', function(data) {
      if (!data || (!data.chatId && !data.senderId)) return;
      setUnreadCounts(function(prev) {
        var upd = Object.assign({}, prev);
        // BUG2 FIX: unreadCounts is keyed by senderId (userId), not chatId
        if (data.senderId) delete upd[data.senderId];
        if (data.chatId) delete upd[data.chatId];  // legacy cleanup
        localStorage.setItem('xtox_unread_counts', JSON.stringify(upd));
        return upd;
      });
    });
    s.on('typing', function() {
      setIsTyping(true);
      if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
      typingTimerRef.current = setTimeout(function() { setIsTyping(false); }, 3000);
    });
    // ── chat:ad_status: real-time ad status update (5 states) ──────────────
    s.on('chat:ad_status', function(data) {
      var cid = data.chatId ? String(data.chatId) : '';
      setConversations(function(prev) {
        return prev.map(function(c) {
          if ((c.chatId && String(c.chatId) === cid) || String(c.chatId || '') === cid) {
            return Object.assign({}, c, {
              adStatus: data.adStatus || c.adStatus,
              isClosed: data.isClosed || c.isClosed,
              closedAt: data.closedAt || c.closedAt,
            });
          }
          return c;
        });
      });
      // If currently viewing this chat and it's now closed:
      if (cid && (chatIdRef.current === cid || String(chatIdRef.current) === cid)) {
        setAdStatus(function(prev) { return data.adStatus || prev; });
        if (data.isClosed) {
          setChatClosed(true);
          setChatClosedStatus(data.adStatus || 'sold');
          setChatStatus('closed');
        }
      }
    });
    // ── chat:closed: real-time notification when ad is sold/deleted ──────
    s.on('chat:closed', function(data) {
      var cid = data.chatId ? String(data.chatId) : '';
      // Update conversation list
      setConversations(function(prev) {
        return prev.map(function(c) {
          if ((c.chatId && String(c.chatId) === cid) || (c.chatId && c.chatId.toString() === cid)) {
            return Object.assign({}, c, { isClosed: true, adStatus: data.adStatus || 'sold', closedAt: data.closedAt || null });
          }
          return c;
        });
      });
      // If currently viewing this chat, show closed banner
      if (cid && (chatIdRef.current === cid || String(chatIdRef.current) === cid)) {
        setChatClosed(true);
        setChatClosedStatus(data.adStatus || 'sold');
        setChatStatus('closed');
      }
    });

    // ── system_message: seller/buyer gets notified of key events ─────────
    s.on('system_message', function(data) {
      var smChatId = data.chatId ? String(data.chatId) : '';
      if (!smChatId) return;
      // Only add to message list if currently viewing that chat
      if (chatIdRef.current && String(chatIdRef.current) === smChatId) {
        setMessages(function(prev) {
          return prev.concat([{
            _id: String(Date.now()),
            text: data.text || '',
            type: 'system',
            from: 'system',
            time: Date.now(),
            status: 'delivered',
            readBy: [],
          }]);
        });
      }
    });

    // ── pending_messages: unread messages accumulated while user was offline ────
    s.on('pending_messages', function(data) {
      // data: { chatId, count, lastMessage, senderId }
      var pid = String(data.chatId || '');
      if (!pid || !data.count) return;

      // Update unread count badge on chat list item
      setUnreadCounts(function(prev) {
        var upd = Object.assign({}, prev);
        // Use the server-provided count (authoritative)
        upd[pid] = data.count;
        // Also key by senderId for backward compat
        if (data.senderId) upd[data.senderId] = data.count;
        try { localStorage.setItem('xtox_unread_counts', JSON.stringify(upd)); } catch {}
        return upd;
      });

      // Also bump the conversation list preview
      setConversations(function(prev) {
        return prev.map(function(c) {
          var cid = String(c.chatId || c._id || '');
          if (cid === pid) {
            return Object.assign({}, c, {
              unread: (c.unread || 0) + data.count,
              lastMessage: data.lastMessage ? {
                text: data.lastMessage.text,
                type: data.lastMessage.type || 'text',
                time: data.lastMessage.createdAt ? new Date(data.lastMessage.createdAt).getTime() : Date.now(),
              } : c.lastMessage,
            });
          }
          return c;
        });
      });

      // If currently viewing this exact chat, re-fetch messages to show the new ones
      if (chatIdRef.current && String(chatIdRef.current) === pid) {
        var tok = null;
        try {
          var stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
          var userObj = stored ? JSON.parse(stored) : null;
          tok = (userObj && userObj.token) || (typeof window !== 'undefined' ? localStorage.getItem('token') : null);
        } catch(e) {}
        if (tok) {
          fetch(API_URL + '/api/chat/' + pid + '/messages?limit=50', { headers: { Authorization: 'Bearer ' + tok } })
            .then(function(r) { return r.ok ? r.json() : null; })
            .then(function(msgData) {
              if (!msgData) return;
              var msgs = (msgData.messages || []).slice().reverse();
              setMessages(msgs.map(function(m) {
                return {
                  from: (String(m.sender) === String(myId)) ? 'me' : m.sender,
                  text: m.text || '', type: m.type || 'text', duration: m.duration || 0,
                  time: m.createdAt ? new Date(m.createdAt).getTime() : Date.now(),
                  readBy: m.readBy || [], status: m.status || 'sent',
                };
              }));
            })
            .catch(function() {});
        }
      }
    });

    // Note: call signaling is handled by CallManager component (call:* events via Socket.IO)
    // Old call_offer/incoming_call listeners removed to avoid conflict with CallManager
  }


  // BUG8: startCall/acceptCall/endCall/toggleMute/rejectIncomingCall/createPeerConnection removed
  // All call signaling is handled by <CallManager> component

  // Send text message
  function sendMessage() {
    if (!msg.trim() || !targetId) return;
    // Guard: prevent sending messages to archived/sold/closed chats
    if (isCurrentChatClosed || chatStatus === 'archived' || adStatus === 'sold') return;
    if (!socketRef.current || !socketRef.current.connected) {
      setChatError('chat_disconnected');
      setTimeout(function() { setChatError(''); }, 4000);
      return;
    }
    var now  = Date.now();
    var text = msg;
    var curChatId = chatIdRef.current;
    setMsg('');
    // Optimistic message with 'sent' status (✓ grey)
    setMessages(function(prev) { return prev.concat([{ from: 'me', text: text, type: 'text', duration: 0, time: now, readBy: [], status: 'sent', tempId: now }]); });
    socketRef.current.emit('send_message', { from: myId, to: targetId, text: text, time: now, chatId: curChatId, tempId: now });
    setConversations(function(prev) {
      var exists = prev.find(function(c) { return c.id === targetId; });
      var upd = exists
        ? prev.map(function(c) { return c.id === targetId ? Object.assign({}, c, { lastMessage: text, lastTime: now }) : c; })
        : [{ id: targetId, lastMessage: text, lastTime: now }].concat(prev.slice(0, 49));
      // Only persist if we have enriched conversations (not just bare skeletons)
      if (upd.some(function(c) { return c.name || c.adTitle || c.xtoxId; })) localStorage.setItem('xtox_conversations', JSON.stringify(upd));
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

  // Smart retry: flush SW cache + small backoff before reload
  async function smartRetry() {
    setChatError('');
    setHistoryLoaded(false);
    try {
      if ('caches' in window) {
        var keys = await caches.keys();
        await Promise.all(keys.filter(function(k) { return k.includes('xtox'); }).map(function(k) { return caches.delete(k); }));
      }
    } catch(e) {}
    await new Promise(function(r) { setTimeout(r, 500); });
    window.location.reload();
  }

  // Derived: is the currently open chat closed (ad sold/deleted)?
  var _selectedConv = conversations.find(function(c) { return c.chatId === chatId || c.id === targetId; });
  var isCurrentChatClosed = chatClosed || chatStatus === 'closed' || (_selectedConv && _selectedConv.isClosed);
  var _closedAdStatus = chatClosedStatus || (_selectedConv && _selectedConv.adStatus) || adStatus || 'sold';
  var _closedAt = (_selectedConv && _selectedConv.closedAt) || closeAt;

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
          {targetId ? (
            <>
              <p style={{ margin: 0, fontWeight: 700, fontSize: 15, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', display: 'flex', alignItems: 'center', gap: 6 }}>
                {sellerName || targetId}
                {/* Tier badge next to other user's name in chat header */}
                {(function() {
                  var conv = conversations.find(function(c) { return c.id === targetId; });
                  var pts = conv?.reputationPoints || 0;
                  if (pts < 50) return null;
                  var tier = pts >= 500 ? {emoji:'💎',label:'Platinum',bg:'#1e40af'} : pts >= 200 ? {emoji:'🥇',label:'Gold',bg:'#a16207'} : {emoji:'🥈',label:'Silver',bg:'#475569'};
                  return <span style={{background:'rgba(255,255,255,0.15)',color:'white',fontSize:10,fontWeight:700,padding:'1px 6px',borderRadius:6,flexShrink:0}}>{tier.emoji} {tier.label}</span>;
                })()}
              </p>
              {(function() {
                var _conv = conversations.find(function(c) { return c.id === targetId || c.chatId === chatId; });
                var _adTitle = (_conv && _conv.adTitle) || (apiChats.find(function(c) { return String(c._id) === chatId; }) || {}).adTitle || ((apiChats.find(function(c) { return String(c._id) === chatId; }) || {}).ad || {}).title || '';
                return _adTitle ? <p style={{ margin: 0, fontSize: 11, color: '#9ca3af', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{_adTitle}</p> : null;
              })()}
            </>
          ) : (
            <p style={{ margin: 0, fontWeight: 'bold', fontSize: 15 }}>اختر محادثة للبدء</p>
          )}
          <p style={{ margin: 0, fontSize: 12, display: 'flex', alignItems: 'center', gap: 4 }}>
            {targetId ? (
              <>
                <span style={{ width: 8, height: 8, borderRadius: '50%', background: partnerOnline ? '#22c55e' : '#9ca3af', display: 'inline-block', flexShrink: 0 }} />
                <span style={{ color: partnerOnline ? '#86efac' : 'rgba(255,255,255,0.55)' }}>
                  {partnerOnline ? 'متصل الآن' : partnerLastSeen ? ('آخر ظهور ' + arabicRelTime(partnerLastSeen)) : 'غير متصل'}
                </span>
              </>
            ) : (
              <span style={{ opacity: 0.7 }}>{joined ? 'متصل' : 'جارٍ الاتصال...'}</span>
            )}
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
              <p style={{ margin: 0 }}>{t('chat_no_auth')}</p>
              <a href="/login" style={{ color: '#23e5db', fontSize: 13, marginTop: 4 }}>تسجيل الدخول</a>
            </div>
          ) : chatError && historyLoaded ? (
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: 'rgba(255,255,255,0.7)', fontSize: 14, gap: 10, padding: 24, textAlign: 'center' }}>
              <div style={{ fontSize: 36 }}>⚠️</div>
              <p style={{ margin: 0 }}>{t(chatError)}</p>
              <button onClick={smartRetry} style={{ color: '#23e5db', background: 'none', border: '1px solid #23e5db', borderRadius: 8, padding: '6px 14px', cursor: 'pointer', fontSize: 13 }}>{t('btn_retry')}</button>
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
                var isActive = conv.chatId === chatId || conv.id === targetId;
                return (
                  <li key={conv.chatId || conv.id}>
                    <button
                      onClick={function() {
                        // Fix D: immediately clear unread count for this conversation
                        setUnreadCounts(function(prev) {
                          var u = Object.assign({}, prev);
                          delete u[conv.id];
                          delete u[conv.chatId];
                          localStorage.setItem('xtox_unread_counts', JSON.stringify(u));
                          return u;
                        });
                        // Fix D: also clear from legacy xtox_unread key
                        try {
                          var storedUnread = safeParse(localStorage.getItem('xtox_unread'), {});
                          delete storedUnread[conv.id];
                          delete storedUnread[conv.chatId];
                          localStorage.setItem('xtox_unread', JSON.stringify(storedUnread));
                        } catch (_e) {}
                        setShowConvPanel(false);
                        var dest = conv.chatId
                          ? '/chat?chatId=' + encodeURIComponent(conv.chatId) + '&target=' + encodeURIComponent(conv.id) + (conv.name ? '&sellerName=' + encodeURIComponent(conv.name) : '')
                          : '/chat?target=' + encodeURIComponent(conv.id) + (conv.name ? '&sellerName=' + encodeURIComponent(conv.name) : '');
                        router.push(dest);
                      }}
                      style={{ width: '100%', background: isActive ? 'rgba(35,229,219,0.15)' : 'transparent', border: 'none', borderBottom: '1px solid rgba(255,255,255,0.07)', padding: '14px 16px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 12, textAlign: 'right' }}>
                      <div style={{ position: 'relative', flexShrink: 0 }}>
                        <div style={{ width: 42, height: 42, borderRadius: '50%', background: isActive ? '#23e5db' : '#334155', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 18, color: isActive ? '#002f34' : 'white', fontWeight: 'bold', overflow: 'hidden', flexShrink: 0 }}>
                          {conv.avatar
                            ? <img src={conv.avatar} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} onError={function(e) { e.target.style.display='none'; }} />
                            : (conv.name || conv.adTitle || '?').charAt(0).toUpperCase()
                          }
                        </div>
                        <span style={{ position: 'absolute', bottom: 1, right: 1, width: 11, height: 11, borderRadius: '50%', background: onlineUsers.has(String(conv.id)) ? '#22c55e' : '#4b5563', border: '2px solid #002f34' }} />
                      </div>
                      <div style={{ flex: 1, minWidth: 0, textAlign: 'right' }}>
                        {/* Fix C: Ad title is the PRIMARY label — big bold (it's the chat topic/context) */}
                        <div style={{ color: isActive ? '#23e5db' : 'white', fontWeight: 700, fontSize: 14, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                          {conv.adTitle || 'إعلان غير متاح'}
                        </div>
                        {/* Ad status badge (5 colours) — always shown, defaults to 'available' */}
                        {(function() {
                          var _adSt = conv.adStatus || 'available';
                          var _statusMap = {
                            available: { color: '#4ade80', bg: 'rgba(74,222,128,0.12)',  label: '● متاح' },
                            inactive:  { color: '#15803d', bg: 'rgba(21,128,61,0.15)',   label: '● نائم' },
                            sold:      { color: '#facc15', bg: 'rgba(250,204,21,0.15)',  label: '✓ مباع' },
                            deleted:   { color: '#ef4444', bg: 'rgba(239,68,68,0.15)',   label: '✕ محذوف' },
                            expired:   { color: '#94a3b8', bg: 'rgba(148,163,184,0.10)', label: '◌ منتهي' },
                          };
                          var _s = _statusMap[_adSt] || _statusMap.available;
                          return (
                            <span style={{
                              fontSize: 10, fontWeight: 600, borderRadius: 8,
                              padding: '1px 7px', marginBottom: 2, display: 'inline-block',
                              background: _s.bg, color: _s.color,
                            }}>
                              {_s.label}
                            </span>
                          );
                        })()}
                        {/* Fix C: User name — small purple accent below ad title */}
                        <div style={{ color: isActive ? 'rgba(35,229,219,0.8)' : '#a78bfa', fontSize: 11, fontWeight: 500, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginBottom: 2 }}>
                          👤 {conv.name || conv.xtoxId || 'مستخدم'}
                        </div>
                        {conv.lastMessage && (
                          <div style={{ color: unread > 0 ? '#94a3b8' : 'rgba(255,255,255,0.45)', fontSize: 11, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', fontWeight: unread > 0 ? '600' : 'normal' }}>
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
                  ) : m.type === 'system' ? (
                    <div style={{ width: '100%', textAlign: 'center', color: '#94a3b8', fontSize: 11, padding: '4px 12px', fontStyle: 'italic', userSelect: 'none' }}>
                      {m.text}
                    </div>
                  ) : (
                    <div dir="rtl" role="article" aria-label={isSent ? 'رسالتك' : 'رسالة من ' + (sellerName || m.from)}
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
                          <MessageTick status={m.status} readBy={m.readBy} />
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
              {/* ── Sold / Archived / Closed banner ──────────────────────────── */}
              {(isCurrentChatClosed || chatStatus === 'archived' || adStatus === 'sold') && (
                <div role="status" aria-live="polite" dir="rtl"
                  style={{ background: '#fef3c7', color: '#92400e', padding: '10px 16px', display: 'flex', flexDirection: 'column', gap: 4, fontSize: 13, fontWeight: 600, flexShrink: 0, borderTop: '1px solid #fcd34d' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                    <span style={{ fontSize: 18 }}>🔒</span>
                    <span>
                      {_closedAdStatus === 'deleted' ? 'تم حذف هذا الإعلان' : 'تم بيع هذا الإعلان'} — المحادثة مغلقة ولا يمكن إرسال رسائل جديدة
                    </span>
                  </div>
                  {_closedAt && (
                    <div style={{ fontSize: 11, color: '#b45309', marginRight: 28 }}>
                      ⏳ ستُحذف هذه المحادثة تلقائياً بعد 7 أيام من الإغلاق
                    </div>
                  )}
                </div>
              )}

              <footer style={{ background: '#ffffff', padding: '10px 14px', paddingBottom: 'max(10px, env(safe-area-inset-bottom))', display: 'flex', gap: 10, alignItems: 'center', boxShadow: '0 -2px 8px rgba(0,0,0,0.07)', flexShrink: 0, direction: 'rtl' }}>
                {/* Disable all inputs when chat is archived (ad sold/closed) */}
                {isCurrentChatClosed || chatStatus === 'archived' || adStatus === 'sold' ? (
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

export default function ChatPage() {
  return (
    <Suspense fallback={<div style={{textAlign:'center',padding:60,fontSize:20,fontFamily:"'Cairo',system-ui"}}>⏳ ...</div>}>
      <ChatPageInner />
    </Suspense>
  );
}
