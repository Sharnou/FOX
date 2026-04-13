'use client';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

const STUN = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }, { urls: 'stun:stun1.l.google.com:19302' }] };

const CallManager = forwardRef(function CallManager({ socket, currentUser }, ref) {
  const [incoming, setIncoming] = useState(null);   // { callerId, callerName, callerSocketId }
  const [active, setActive] = useState(null);        // { peerName, remoteSocketId, startTime }
  const [duration, setDuration] = useState(0);
  const [muted, setMuted] = useState(false);
  const pc = useRef(null);
  const localStream = useRef(null);
  const remoteAudio = useRef(null);

  const fmt = s => `${String(Math.floor(s/60)).padStart(2,'0')}:${String(s%60).padStart(2,'0')}`;

  const cleanup = useCallback(() => {
    pc.current?.close(); pc.current = null;
    localStream.current?.getTracks().forEach(t => t.stop()); localStream.current = null;
    setActive(null); setIncoming(null); setDuration(0); setMuted(false);
  }, []);

  function createPC(remoteSocketId) {
    const p = new RTCPeerConnection(STUN);
    p.onicecandidate = e => {
      if (e.candidate && remoteSocketId) socket.emit('call:ice', { targetSocketId: remoteSocketId, candidate: e.candidate });
    };
    p.ontrack = e => { if (remoteAudio.current) remoteAudio.current.srcObject = e.streams[0]; };
    pc.current = p;
    return p;
  }

  async function getAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    return stream;
  }

  // Expose initiateCall to parent via ref
  useImperativeHandle(ref, () => ({
    async initiateCall(targetUserId, targetName) {
      if (active || incoming) return;
      try {
        const stream = await getAudio();
        const p = createPC(null);
        stream.getTracks().forEach(t => p.addTrack(t, stream));
        const offer = await p.createOffer();
        await p.setLocalDescription(offer);
        socket.emit('call:initiate', { targetUserId, callerId: currentUser?._id || currentUser?.id, callerName: currentUser?.name });
        // Wait for responder to be ready, then send offer
        socket.once('call:answered_ready', async ({ responderSocketId }) => {
          p.onicecandidate = e => {
            if (e.candidate) socket.emit('call:ice', { targetSocketId: responderSocketId, candidate: e.candidate });
          };
          socket.emit('call:offer', { targetSocketId: responderSocketId, offer });
        });
        socket.once('call:answered', async ({ answer, responderSocketId }) => {
          try {
            await p.setRemoteDescription(new RTCSessionDescription(answer));
            setActive({ peerName: targetName, remoteSocketId: responderSocketId, startTime: Date.now() });
          } catch {}
        });
      } catch {}
    }
  }), [socket, currentUser, active, incoming]);

  useEffect(() => {
    if (!socket || !currentUser) return;
    const userId = currentUser._id || currentUser.id;
    if (!userId) return;
    socket.emit('join_user_room', { userId });

    socket.on('call:incoming', ({ callerId, callerName, callerSocketId }) => {
      setIncoming({ callerId, callerName, callerSocketId });
    });

    socket.on('call:offer', async ({ offer, callerSocketId }) => {
      try {
        const stream = await getAudio().catch(() => null);
        if (!stream) return;
        const p = createPC(callerSocketId);
        stream.getTracks().forEach(t => p.addTrack(t, stream));
        await p.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await p.createAnswer();
        await p.setLocalDescription(answer);
        socket.emit('call:answer', { callerSocketId, answer });
      } catch {}
    });

    socket.on('call:ice', ({ candidate }) => {
      pc.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    });

    socket.on('call:rejected', () => { cleanup(); });
    socket.on('call:ended', () => cleanup());

    return () => {
      socket.off('call:incoming');
      socket.off('call:offer');
      socket.off('call:ice');
      socket.off('call:rejected');
      socket.off('call:ended');
    };
  }, [socket, currentUser]);

  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setDuration(Math.floor((Date.now() - active.startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);

  function hangup() {
    if (active?.remoteSocketId) socket.emit('call:end', { otherSocketId: active.remoteSocketId });
    cleanup();
  }

  async function acceptCall() {
    const { callerSocketId, callerName } = incoming;
    setIncoming(null);
    setActive({ peerName: callerName, remoteSocketId: callerSocketId, startTime: Date.now() });
    socket.emit('call:answered_ready', { callerSocketId });
  }

  function rejectCall() {
    socket.emit('call:reject', { callerSocketId: incoming.callerSocketId });
    setIncoming(null);
  }

  function toggleMute() {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  }

  const overlay = {
    position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#fff',
    borderRadius: 20, padding: '20px 28px', zIndex: 9999,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)', textAlign: 'center', minWidth: 280
  };

  return (
    <>
      <audio ref={remoteAudio} autoPlay playsInline />
      {incoming && !active && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{incoming.callerName}</div>
          <div style={{ fontSize: 13, color: '#aaa', margin: '6px 0 18px' }}>مكالمة صوتية واردة</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <button onClick={acceptCall} style={{ background: '#25d366', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 24, cursor: 'pointer' }}>✅</button>
            <button onClick={rejectCall} style={{ background: '#e74c3c', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 24, cursor: 'pointer' }}>❌</button>
          </div>
        </div>
      )}
      {active && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{active.peerName}</div>
          <div style={{ fontSize: 22, color: '#25d366', margin: '8px 0 18px', fontFamily: 'monospace' }}>{fmt(duration)}</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button onClick={toggleMute} style={{ background: muted ? '#e74c3c' : '#444', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 18, cursor: 'pointer' }}>{muted ? '🔇' : '🎤'}</button>
            <button onClick={hangup} style={{ background: '#e74c3c', border: 'none', borderRadius: 24, padding: '10px 24px', color: '#fff', fontSize: 15, cursor: 'pointer' }}>إنهاء 📵</button>
          </div>
        </div>
      )}
    </>
  );
});

export default CallManager;
