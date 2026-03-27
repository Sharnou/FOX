'use client';
import { useEffect, useState, useRef } from 'react';
import { io } from 'socket.io-client';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:3000';
export default function ChatPage() {
  const [messages, setMessages] = useState([]);
  const [msg, setMsg] = useState('');
  const [socket, setSocket] = useState(null);
  const [callActive, setCallActive] = useState(false);
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : '';
  const userId = typeof window !== 'undefined' ? localStorage.getItem('userId') : '';
  const targetId = typeof window !== 'undefined' ? new URLSearchParams(location.search).get('target') : '';
  const pcRef = useRef(null);
  const localRef = useRef(null);
  const remoteRef = useRef(null);
  useEffect(() => {
    const s = io(SOCKET_URL, { auth: { token } });
    s.emit('join', userId);
    s.on('receive_message', m => setMessages(p => [...p, m]));
    s.on('call_offer', async data => {
      await startPeer();
      await pcRef.current.setRemoteDescription(data.offer);
      const answer = await pcRef.current.createAnswer();
      await pcRef.current.setLocalDescription(answer);
      s.emit('call_answer', { to: data.from, answer });
      setCallActive(true);
    });
    s.on('call_answer', async data => { await pcRef.current.setRemoteDescription(data.answer); });
    s.on('ice_candidate', async data => { await pcRef.current.addIceCandidate(data.candidate); });
    s.on('call_end', () => { setCallActive(false); pcRef.current?.close(); });
    setSocket(s);
    return () => s.disconnect();
  }, []);
  async function startPeer() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    if (localRef.current) localRef.current.srcObject = stream;
    const pc = new RTCPeerConnection({ iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] });
    stream.getTracks().forEach(t => pc.addTrack(t, stream));
    pc.ontrack = e => { if (remoteRef.current) remoteRef.current.srcObject = e.streams[0]; };
    pc.onicecandidate = e => { if (e.candidate) socket.emit('ice_candidate', { to: targetId, candidate: e.candidate }); };
    pcRef.current = pc;
    return pc;
  }
  async function startCall() {
    const pc = await startPeer();
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    socket.emit('call_offer', { to: targetId, from: userId, offer });
    setCallActive(true);
  }
  function endCall() { socket.emit('call_end', { to: targetId }); pcRef.current?.close(); setCallActive(false); }
  function send() {
    if (!msg.trim()) return;
    const m = { from: userId, to: targetId, text: msg, time: Date.now() };
    socket?.emit('send_message', m);
    setMessages(p => [...p, m]);
    setMsg('');
  }
  return (
    <div className="flex flex-col h-screen max-w-lg mx-auto">
      <div className="bg-brand text-white p-4 flex items-center gap-3">
        <button onClick={() => history.back()}>←</button>
        <span className="font-bold flex-1">المحادثة</span>
        {!callActive ? <button onClick={startCall} className="bg-green-500 px-3 py-1 rounded text-sm">📞 اتصال صوتي</button>
          : <button onClick={endCall} className="bg-red-500 px-3 py-1 rounded text-sm">⛔ إنهاء</button>}
      </div>
      <audio ref={localRef} autoPlay muted className="hidden" />
      <audio ref={remoteRef} autoPlay className="hidden" />
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.from === userId ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-xs px-4 py-2 rounded-2xl text-sm ${m.from === userId ? 'bg-brand text-white' : 'bg-white shadow'}`}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="p-4 bg-white border-t flex gap-2">
        <input value={msg} onChange={e => setMsg(e.target.value)} onKeyDown={e => e.key === 'Enter' && send()} className="flex-1 border rounded-xl p-3 text-sm" placeholder="اكتب رسالة..." />
        <button onClick={send} className="bg-brand text-white px-6 rounded-xl font-bold">إرسال</button>
      </div>
    </div>
  );
}
