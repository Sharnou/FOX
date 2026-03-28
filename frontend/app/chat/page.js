'use client';
import { useEffect, useState, useRef } from 'react';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'https://fox-production.up.railway.app';

export default function ChatPage() {
  const [myId, setMyId] = useState('');
  const [targetId, setTargetId] = useState('');
  const [joined, setJoined] = useState(false);
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [callStatus, setCallStatus] = useState('idle'); // idle | calling | ringing | active | ended
  const [socket, setSocket] = useState(null);
  const pcRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const localStreamRef = useRef(null);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const user = JSON.parse(localStorage.getItem('user') || '{}');
      const params = new URLSearchParams(window.location.search);
      const storedId = user.id || user._id || '';
      const target = params.get('target') || '';
      setMyId(storedId);
      setTargetId(target);
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (myId && !joined) joinChat();
  }, [myId]);

  async function joinChat() {
    if (!myId) return;
    const { io } = await import('socket.io-client');
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') || 'guest' : 'guest';
    const s = io(SOCKET_URL, { auth: { token }, transports: ['websocket', 'polling'] });
    
    s.emit('join', myId);
    setJoined(true);
    
    s.on('receive_message', (data) => {
      setMessages(prev => [...prev, { from: data.from || targetId, text: data.text, time: Date.now() }]);
    });
    
    s.on('incoming_call', async ({ from, offer }) => {
      setCallStatus('ringing');
      const accepted = window.confirm(`📞 مكالمة واردة من ${from}. قبول؟`);
      if (!accepted) { s.emit('call_end', { to: from }); setCallStatus('idle'); return; }
      
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(s, from);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      s.emit('call_answer', { to: from, answer });
      setCallStatus('active');
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

  function createPeerConnection(s, remoteId) {
    const pc = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' }
      ]
    });
    pc.ontrack = (e) => { if (remoteAudioRef.current) remoteAudioRef.current.srcObject = e.streams[0]; };
    pc.onicecandidate = (e) => { if (e.candidate) s.emit('ice_candidate', { to: remoteId, candidate: e.candidate }); };
    pcRef.current = pc;
    return pc;
  }

  async function startCall() {
    if (!targetId || !socket) return;
    setCallStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(socket, targetId);
      stream.getTracks().forEach(t => pc.addTrack(t, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('call_offer', { to: targetId, from: myId, offer });
    } catch (e) {
      setCallStatus('idle');
      alert('فشل الاتصال: ' + e.message);
    }
  }

  function endCall() {
    if (socket && targetId) socket.emit('call_end', { to: targetId });
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStreamRef.current) { localStreamRef.current.getTracks().forEach(t => t.stop()); localStreamRef.current = null; }
    if (remoteAudioRef.current) remoteAudioRef.current.srcObject = null;
    setCallStatus('idle');
  }

  function sendMessage() {
    if (!msg.trim() || !socket || !targetId) return;
    const data = { from: myId, to: targetId, text: msg, time: Date.now() };
    socket.emit('send_message', data);
    setMessages(prev => [...prev, { from: 'me', text: msg, time: Date.now() }]);
    setMsg('');
  }

  const callColors = { idle: '#002f34', calling: '#ff9800', ringing: '#4caf50', active: '#f44336', ended: '#999' };
  const callLabels = { idle: '📞 مكالمة', calling: '⏳ جار الاتصال...', ringing: '📳 مكالمة واردة', active: '⛔ إنهاء', ended: '✅ انتهت' };

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', fontFamily: "'Cairo', system-ui", background: '#f5f5f5' }}>
      <audio ref={remoteAudioRef} autoPlay style={{ display: 'none' }} />
      
      {/* Header */}
      <div style={{ background: '#002f34', color: 'white', padding: '12px 16px', display: 'flex', alignItems: 'center', gap: 12, flexShrink: 0 }}>
        <button onClick={() => history.back()} style={{ background: 'none', border: 'none', color: 'white', fontSize: 20, cursor: 'pointer' }}>←</button>
        <div style={{ flex: 1 }}>
          <p style={{ margin: 0, fontWeight: 'bold' }}>محادثة مع {targetId || '...'}</p>
          <p style={{ margin: 0, fontSize: 12, opacity: 0.7 }}>{joined ? '🟢 متصل' : '⏳ جار الاتصال...'}</p>
        </div>
        <button
          onClick={callStatus === 'active' ? endCall : callStatus === 'idle' ? startCall : undefined}
          disabled={callStatus === 'calling' || callStatus === 'ringing'}
          style={{ background: callColors[callStatus], color: 'white', border: 'none', padding: '8px 16px', borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 'bold', fontFamily: 'inherit' }}>
          {callLabels[callStatus]}
        </button>
      </div>

      {/* Messages */}
      <div style={{ flex: 1, overflowY: 'auto', padding: '16px', display: 'flex', flexDirection: 'column', gap: 8 }}>
        {messages.length === 0 && (
          <div style={{ textAlign: 'center', color: '#999', marginTop: 40 }}>
            <div style={{ fontSize: 48 }}>💬</div>
            <p>ابدأ المحادثة</p>
          </div>
        )}
        {messages.map((m, i) => (
          <div key={i} style={{ display: 'flex', justifyContent: m.from === 'me' ? 'flex-end' : 'flex-start' }}>
            <div style={{ maxWidth: '75%', padding: '10px 14px', borderRadius: m.from === 'me' ? '18px 18px 4px 18px' : '18px 18px 18px 4px', background: m.from === 'me' ? '#002f34' : 'white', color: m.from === 'me' ? 'white' : '#333', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', fontSize: 15 }}>
              {m.text}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div style={{ background: 'white', padding: '12px 16px', display: 'flex', gap: 10, boxShadow: '0 -1px 4px rgba(0,0,0,0.08)', flexShrink: 0 }}>
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && sendMessage()}
          placeholder="اكتب رسالة..."
          style={{ flex: 1, padding: '10px 16px', borderRadius: 24, border: '1px solid #ddd', fontSize: 15, fontFamily: 'inherit', outline: 'none' }} />
        <button onClick={sendMessage}
          style={{ background: '#002f34', color: 'white', border: 'none', borderRadius: '50%', width: 44, height: 44, cursor: 'pointer', fontSize: 18, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
          ↑
        </button>
      </div>
    </div>
  );
}
