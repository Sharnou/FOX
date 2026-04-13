'use client';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

const STUN = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
  ],
};

const NO_ANSWER_TIMEOUT_MS = 30000; // 30 seconds

const CallManager = forwardRef(function CallManager({ socket, currentUser }, ref) {
  const [incoming, setIncoming] = useState(null);   // { callerId, callerName, callerSocketId }
  const [active, setActive]     = useState(null);   // { peerName, remoteSocketId, startTime }
  const [duration, setDuration] = useState(0);
  const [muted, setMuted]       = useState(false);

  const pc               = useRef(null);
  const localStream      = useRef(null);
  const remoteAudio      = useRef(null);
  const pendingICE       = useRef([]);   // buffer ICE candidates until responder socket ID is known
  const noAnswerTimer    = useRef(null); // 30-second auto-hangup timer

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  const cleanup = useCallback(() => {
    clearTimeout(noAnswerTimer.current);
    noAnswerTimer.current = null;
    pendingICE.current = [];
    pc.current?.close();
    pc.current = null;
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    setActive(null);
    setIncoming(null);
    setDuration(0);
    setMuted(false);
  }, []);

  function createPC(remoteSocketId) {
    if (pc.current) { pc.current.close(); pc.current = null; }
    const p = new RTCPeerConnection(STUN);
    p.onicecandidate = e => {
      if (!e.candidate) return;
      if (remoteSocketId && socket) {
        socket.emit('call:ice', { targetSocketId: remoteSocketId, candidate: e.candidate });
      } else {
        // Buffer candidates until we know the responder's socket ID
        pendingICE.current.push(e.candidate);
      }
    };
    p.ontrack = e => {
      if (remoteAudio.current) remoteAudio.current.srcObject = e.streams[0];
    };
    p.oniceconnectionstatechange = () => {
      const s = p.iceConnectionState;
      if (s === 'failed' || s === 'disconnected' || s === 'closed') {
        cleanup();
      }
    };
    pc.current = p;
    return p;
  }

  async function getAudio() {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
    localStream.current = stream;
    return stream;
  }

  // Flush buffered ICE candidates to the now-known remote socket
  function flushPendingICE(remoteSocketId) {
    if (!socket || !remoteSocketId) return;
    pendingICE.current.forEach(c => {
      socket.emit('call:ice', { targetSocketId: remoteSocketId, candidate: c });
    });
    pendingICE.current = [];
  }

  // Expose initiateCall and hangup to parent via ref
  useImperativeHandle(ref, () => ({
    async initiateCall(targetUserId, targetName) {
      if (active || incoming) return;
      try {
        const stream = await getAudio();
        // Create PC with null remote socket ID — ICE will be buffered
        const p = createPC(null);
        stream.getTracks().forEach(t => p.addTrack(t, stream));
        const offer = await p.createOffer();
        await p.setLocalDescription(offer);

        socket.emit('call:initiate', {
          targetUserId,
          callerId: currentUser?._id || currentUser?.id,
          callerName: currentUser?.name,
        });

        // Start 30-second no-answer timer
        noAnswerTimer.current = setTimeout(() => {
          socket.emit('call:end', { otherSocketId: '_no_answer_' });
          cleanup();
        }, NO_ANSWER_TIMEOUT_MS);

        // Wait for responder to be ready, then send offer + flush buffered ICE
        socket.once('call:answered_ready', async ({ responderSocketId }) => {
          clearTimeout(noAnswerTimer.current);
          // Update onicecandidate to send directly now we know the socket ID
          if (pc.current) {
            pc.current.onicecandidate = e => {
              if (e.candidate && socket) {
                socket.emit('call:ice', { targetSocketId: responderSocketId, candidate: e.candidate });
              }
            };
          }
          // Flush previously buffered ICE candidates
          flushPendingICE(responderSocketId);
          // Send the offer to the responder
          socket.emit('call:offer', { targetSocketId: responderSocketId, offer });
        });

        socket.once('call:answered', async ({ answer, responderSocketId }) => {
          try {
            clearTimeout(noAnswerTimer.current);
            if (pc.current) {
              await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
            }
            setActive({ peerName: targetName, remoteSocketId: responderSocketId, startTime: Date.now() });
          } catch { cleanup(); }
        });
      } catch {
        cleanup();
      }
    },
    hangup() {
      if (active?.remoteSocketId) socket.emit('call:end', { otherSocketId: active.remoteSocketId });
      cleanup();
    },
  }), [socket, currentUser, active, incoming]);

  useEffect(() => {
    if (!socket || !currentUser) return;
    const userId = currentUser._id || currentUser.id;
    if (!userId) return;
    socket.emit('join_user_room', { userId });

    const onIncoming = ({ callerId, callerName, callerSocketId }) => {
      setIncoming({ callerId, callerName, callerSocketId });
    };

    const onOffer = async ({ offer, callerSocketId }) => {
      try {
        const stream = await getAudio().catch(() => null);
        if (!stream) return;
        const p = createPC(callerSocketId);
        stream.getTracks().forEach(t => p.addTrack(t, stream));
        await p.setRemoteDescription(new RTCSessionDescription(offer));
        const answer = await p.createAnswer();
        await p.setLocalDescription(answer);
        socket.emit('call:answer', { callerSocketId, answer });
      } catch { cleanup(); }
    };

    const onICE = ({ candidate }) => {
      pc.current?.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    };

    const onRejected = () => { cleanup(); };
    const onEnded    = () => { cleanup(); };

    socket.on('call:incoming', onIncoming);
    socket.on('call:offer',    onOffer);
    socket.on('call:ice',      onICE);
    socket.on('call:rejected', onRejected);
    socket.on('call:ended',    onEnded);

    return () => {
      socket.off('call:incoming', onIncoming);
      socket.off('call:offer',    onOffer);
      socket.off('call:ice',      onICE);
      socket.off('call:rejected', onRejected);
      socket.off('call:ended',    onEnded);
    };
  }, [socket, currentUser]);

  // Call duration timer
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
    // Signal caller that we're ready to receive the offer
    socket.emit('call:answered_ready', { callerSocketId });
    // Active state is set after call:answered (when PC is actually connected)
    // But we set a preliminary active to show the overlay immediately
    setActive({ peerName: callerName, remoteSocketId: callerSocketId, startTime: Date.now() });
  }

  function rejectCall() {
    if (incoming?.callerSocketId) socket.emit('call:reject', { callerSocketId: incoming.callerSocketId });
    setIncoming(null);
  }

  function toggleMute() {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  }

  const overlay = {
    position: 'fixed',
    bottom: 80,
    left: '50%',
    transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)',
    color: '#fff',
    borderRadius: 20,
    padding: '20px 28px',
    zIndex: 9999,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)',
    textAlign: 'center',
    minWidth: 280,
    direction: 'rtl',
  };

  return (
    <>
      <audio ref={remoteAudio} autoPlay playsInline />

      {incoming && !active && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{incoming.callerName || 'مستخدم'}</div>
          <div style={{ fontSize: 13, color: '#aaa', margin: '6px 0 18px' }}>مكالمة صوتية واردة</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <button onClick={rejectCall} aria-label="رفض المكالمة"
                style={{ background: '#e74c3c', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 22, cursor: 'pointer', color: 'white' }}>
                📵
              </button>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>رفض</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={acceptCall} aria-label="قبول المكالمة"
                style={{ background: '#25d366', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 22, cursor: 'pointer', color: 'white' }}>
                📞
              </button>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>قبول</div>
            </div>
          </div>
        </div>
      )}

      {active && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{active.peerName || 'مستخدم'}</div>
          <div style={{ fontSize: 22, color: '#25d366', margin: '8px 0 18px', fontFamily: 'monospace' }}>
            {fmt(duration)}
          </div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button onClick={toggleMute} aria-label={muted ? 'إلغاء كتم الصوت' : 'كتم الصوت'}
              style={{ background: muted ? '#e74c3c' : '#444', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 18, cursor: 'pointer' }}>
              {muted ? '🔇' : '🎤'}
            </button>
            <button onClick={hangup} aria-label="إنهاء المكالمة"
              style={{ background: '#e74c3c', border: 'none', borderRadius: 24, padding: '10px 24px', color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 700 }}>
              إنهاء 📵
            </button>
          </div>
        </div>
      )}
    </>
  );
});

export default CallManager;
