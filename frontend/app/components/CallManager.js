'use client';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

// ─── ICE Configuration (STUN + TURN for NAT traversal) ──────────────────────
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turns:openrelay.metered.ca:443',              username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
};

// ─── getUserMedia — simple constraints, no exotic params ────────────────────
async function getAudio() {
  return navigator.mediaDevices.getUserMedia({
    audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
    video: false,
  });
}

// ─── Web Audio API calling tone ─────────────────────────────────────────────
let _callingCtx = null;
let _callingTimer = null;
let _callingActive = false;

function playCallingTone() {
  if (_callingActive) return;
  _callingActive = true;
  const beep = () => {
    if (!_callingActive) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      _callingCtx = ctx;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.0);
      osc.onended = () => { try { ctx.close(); } catch {} };
    } catch {}
    _callingTimer = setTimeout(beep, 3000);
  };
  beep();
}

function stopCallingTone() {
  _callingActive = false;
  clearTimeout(_callingTimer);
  _callingTimer = null;
  try { if (_callingCtx) { _callingCtx.close(); _callingCtx = null; } } catch {}
}

const CallManager = forwardRef(function CallManager({ socket, currentUser }, ref) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [incoming, setIncoming]         = useState(null);
  const [active, setActive]             = useState(null);
  const [duration, setDuration]         = useState(0);
  const [muted, setMuted]               = useState(false);
  const [pushIncoming, setPushIncoming] = useState(null);
  const [offlineRinging, setOfflineRinging] = useState(null);
  const [callStatus, setCallStatus]     = useState(null); // 'no_answer' | null
  const [statusMessage, setStatusMessage] = useState('');

  // ── Refs ──────────────────────────────────────────────────────────────────
  const remoteAudio      = useRef(null);   // <audio> element — always in DOM
  const pcRef            = useRef(null);   // RTCPeerConnection
  const localStream      = useRef(null);   // local mic stream
  const pendingOffer     = useRef(null);   // { offer, callerSocketId, callerName, callerAvatar }
  const bufferedICE      = useRef([]);     // remote ICE candidates buffered until remoteDescription set
  const pendingLocalICE  = useRef([]);     // local ICE candidates buffered until remoteSocketId known
  const ringtoneRef      = useRef(null);
  const noAnswerTimer    = useRef(null);
  const currentUserRef   = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ── URL autoAnswer detection (push opened app with autoAnswer= param) ─────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const autoAnswerParam = params.get('autoAnswer');
    if (autoAnswerParam) {
      let callerId = '';
      let callerSocketId = null;
      const callerName = params.get('callerName') || 'مستخدم XTOX';
      if (autoAnswerParam === 'true') {
        callerId = params.get('callerId') || params.get('roomId') || '';
      } else {
        const idx = autoAnswerParam.indexOf('_');
        if (idx > 0) {
          callerId = autoAnswerParam.slice(0, idx);
          callerSocketId = autoAnswerParam.slice(idx + 1) || null;
        } else {
          callerId = autoAnswerParam;
        }
      }
      if (callerId) {
        console.log('[CALL] autoAnswer URL — callerId:', callerId, '| callerSocketId:', callerSocketId);
        setIncoming({ callerId, callerName, callerAvatar: '', callerSocketId });
        startRingtone();
      }
    }
  }, []);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Ringtone ──────────────────────────────────────────────────────────────
  const startRingtone = useCallback(() => {
    try {
      if (ringtoneRef.current) return;
      const audio = new Audio('/sounds/ringtone.wav');
      audio.loop = true;
      audio.volume = 0.8;
      audio.play().catch(() => {});
      ringtoneRef.current = audio;
    } catch {}
  }, []);

  const stopRingtone = useCallback(() => {
    if (ringtoneRef.current) {
      ringtoneRef.current.pause();
      ringtoneRef.current.currentTime = 0;
      ringtoneRef.current = null;
    }
  }, []);

  // ── cleanup — reset everything ────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearTimeout(noAnswerTimer.current);
    noAnswerTimer.current = null;
    bufferedICE.current = [];
    pendingLocalICE.current = [];
    pendingOffer.current = null;
    pcRef.current?.close();
    pcRef.current = null;
    localStream.current?.getTracks().forEach(t => t.stop());
    localStream.current = null;
    stopRingtone();
    stopCallingTone();
    setActive(null);
    setIncoming(null);
    setPushIncoming(null);
    setOfflineRinging(null);
    setDuration(0);
    setMuted(false);
  }, [stopRingtone]);

  // ── createPC — RTCPeerConnection with ontrack + ICE buffering ────────────
  function createPC() {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    const pc = new RTCPeerConnection(ICE_CONFIG);
    pcRef.current = pc;

    // Audio output: attach remote stream to <audio> element
    pc.ontrack = (e) => {
      console.log('[CALL] ontrack', e.track.kind, e.streams.length);
      if (remoteAudio.current && e.streams[0]) {
        remoteAudio.current.srcObject = e.streams[0];
        remoteAudio.current.play().catch(err => {
          console.warn('[CALL] play():', err.message);
          // Recover on next user gesture
          const resume = () => {
            remoteAudio.current?.play().catch(() => {});
            document.removeEventListener('click', resume);
            document.removeEventListener('touchend', resume);
          };
          document.addEventListener('click', resume, { once: true });
          document.addEventListener('touchend', resume, { once: true });
        });
      }
    };

    // Buffer local ICE until remoteSocketId is known (set via setICETarget)
    pc.onicecandidate = (e) => {
      if (!e.candidate) return;
      pendingLocalICE.current.push(e.candidate);
      console.log('[CALL] local ICE buffered — total:', pendingLocalICE.current.length);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[CALL] ICE state:', pc.iceConnectionState);
      if (['failed', 'closed'].includes(pc.iceConnectionState)) cleanup();
    };

    pc.onconnectionstatechange = () => {
      console.log('[CALL] Connection state:', pc.connectionState);
    };

    return pc;
  }

  // ── flushBufferedICE — add remote ICE candidates buffered before remoteDesc ─
  async function flushBufferedICE() {
    const pc = pcRef.current;
    if (!pc) return;
    console.log('[CALL] Flushing', bufferedICE.current.length, 'buffered remote ICE candidates');
    for (const c of bufferedICE.current) {
      await pc.addIceCandidate(c).catch(e => console.warn('[CALL] addIceCandidate:', e.message));
    }
    bufferedICE.current = [];
  }

  // ── sendLocalICE — flush buffered local ICE candidates to now-known target ─
  function sendLocalICE(targetSocketId) {
    if (!socket || !targetSocketId) return;
    console.log('[CALL] Sending', pendingLocalICE.current.length, 'local ICE candidates → socket:', targetSocketId);
    for (const c of pendingLocalICE.current) {
      socket.emit('call:ice', { targetSocketId, candidate: c });
    }
    pendingLocalICE.current = [];
  }

  // ── setICETarget — update pc.onicecandidate to now send directly ──────────
  function setICETarget(targetSocketId) {
    const pc = pcRef.current;
    if (!pc) return;
    pc.onicecandidate = (e) => {
      if (e.candidate && socket) {
        socket.emit('call:ice', { targetSocketId, candidate: e.candidate });
      }
    };
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALLER SIDE: initiateCall
  // ─────────────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    async initiateCall(calleeId, calleeName) {
      if (active || incoming || pushIncoming) return;
      if (!socket || !socket.connected) {
        alert('جارٍ الاتصال بالخادم... حاول مرة أخرى بعد ثانية');
        return;
      }

      // Step 1: getUserMedia
      let stream;
      try {
        stream = await getAudio();
        localStream.current = stream;
      } catch (e) {
        console.error('[CALL] getUserMedia failed:', e.name, e.message);
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          alert('يرجى السماح بالوصول للميكروفون لإجراء المكالمات');
        } else if (e.name === 'NotFoundError') {
          alert('لم يتم العثور على مايكروفون في جهازك');
        } else {
          alert('خطأ في الميكروفون: ' + e.message);
        }
        return;
      }

      // Step 2: createPC
      const pc = createPC();

      // Step 3: addTrack
      stream.getTracks().forEach(t => {
        pc.addTrack(t, stream);
        console.log('[CALL] caller addTrack:', t.kind);
      });

      // Step 4-6: createOffer → setLocalDescription
      const offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await pc.setLocalDescription(offer);
      console.log('[CALL] Offer created — SDP has audio:', offer.sdp.includes('m=audio'));

      // Step 7: emit call:initiate
      const callerName   = currentUserRef.current?.name || currentUserRef.current?.username || 'مستخدم';
      const callerAvatar = currentUserRef.current?.avatar || '';
      socket.emit('call:initiate', {
        calleeId,
        callerName,
        callerAvatar,
        offer: pc.localDescription,
      });

      // Step 8: show "Calling..." — use offlineRinging/setCallStatus for outgoing UI
      setOfflineRinging({ calleeId, calleeName });
      setStatusMessage('جارٍ الاتصال...');
      playCallingTone();

      // Step 9: Listen for call:accepted (callee answered)
      socket.once('call:accepted', async ({ answer, calleeSocketId }) => {
        console.log('[CALL] call:accepted — calleeSocketId:', calleeSocketId);
        clearTimeout(noAnswerTimer.current);
        stopCallingTone();
        setOfflineRinging(null);
        setStatusMessage('');

        // Update ICE target now that we know callee's socket ID
        setICETarget(calleeSocketId);

        // Set remote description
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[CALL] Caller set remote description ✓');

        // Flush any remote ICE that arrived before remote desc
        await flushBufferedICE();

        // Flush local ICE to callee
        sendLocalICE(calleeSocketId);

        setActive({ peerName: calleeName, remoteSocketId: calleeSocketId, startTime: Date.now() });
      });

      // Step 10: call:rejected
      socket.once('call:rejected', () => {
        console.log('[CALL] call:rejected');
        stopCallingTone();
        setOfflineRinging(null);
        setCallStatus('rejected');
        setStatusMessage('رُفضت المكالمة');
        setTimeout(() => { setCallStatus(null); setStatusMessage(''); }, 3000);
        cleanup();
      });

      // Step 11: call:no_answer
      socket.once('call:no_answer', () => {
        console.log('[CALL] call:no_answer');
        stopCallingTone();
        setOfflineRinging(null);
        setCallStatus('no_answer');
        setStatusMessage('لا يوجد رد');
        setTimeout(() => { setCallStatus(null); setStatusMessage(''); }, 3000);
        cleanup();
      });

      // Ringing offline — callee got push notification
      socket.once('call:ringing_offline', ({ roomId, to, message }) => {
        setOfflineRinging({ roomId, to, calleeId, calleeName });
        setStatusMessage(message || 'تم إرسال إشعار للمستخدم');
      });

      // 30-second no-answer timer (caller side for online users)
      noAnswerTimer.current = setTimeout(() => {
        socket.emit('call:cancel', { targetUserId: calleeId });
        stopCallingTone();
        setOfflineRinging(null);
        setCallStatus('no_answer');
        setStatusMessage('لا يوجد رد');
        setTimeout(() => { setCallStatus(null); setStatusMessage(''); }, 3000);
        cleanup();
      }, 30000);
    },

    hangup() {
      if (active?.remoteSocketId) socket?.emit('call:end', { targetSocketId: active.remoteSocketId });
      stopCallingTone();
      cleanup();
    },
  }), [socket, active, incoming, pushIncoming]);

  // ─────────────────────────────────────────────────────────────────────────
  // SOCKET EVENT HANDLERS
  // ─────────────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const getCurrent = () => currentUserRef.current;

    // Join personal room on connect/reconnect
    const joinRooms = () => {
      const uid = (getCurrent()?._id || getCurrent()?.id) || '';
      if (uid) {
        socket.emit('join_user_room', { userId: uid });
        socket.emit('join', uid);
        console.log('[CallManager] Joined rooms:', uid);
      }
    };
    joinRooms();
    socket.on('connect', joinRooms);
    socket.on('reconnect', joinRooms);

    // ── CALLEE SIDE: call:incoming ─────────────────────────────────────────
    // Step 1: store offer + callerSocketId in pendingOffer, show incoming UI
    const onIncoming = ({ offer, callerSocketId, callerName, callerAvatar, callerId }) => {
      console.log('[CALL] call:incoming — callerSocketId:', callerSocketId, '| caller:', callerName);
      pendingOffer.current = {
        offer,
        callerSocketId,
        callerName: callerName || 'مستخدم XTOX',
        callerAvatar: callerAvatar || '',
      };
      setIncoming({
        callerId: callerId || callerSocketId,
        callerName: callerName || 'مستخدم XTOX',
        callerAvatar: callerAvatar || '',
        callerSocketId,
      });
      startRingtone();
    };

    // ── ICE candidate relay (both sides) ──────────────────────────────────
    const onICE = async ({ candidate }) => {
      if (!candidate) return;
      const pc = pcRef.current;
      if (!pc) {
        bufferedICE.current.push(candidate);
        return;
      }
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(e => console.warn('[CALL] addIceCandidate:', e.message));
      } else {
        bufferedICE.current.push(candidate);
        console.log('[CALL] remote ICE buffered (no remoteDesc yet) — total:', bufferedICE.current.length);
      }
    };

    const onRejected = () => {
      console.log('[CALL] call:rejected');
      stopCallingTone();
      cleanup();
    };

    const onEnded = () => {
      console.log('[CALL] call:ended');
      stopRingtone();
      cleanup();
    };

    const onCancelled = () => {
      console.log('[CALL] call:cancelled');
      stopRingtone();
      setIncoming(null);
      pendingOffer.current = null;
    };

    const onNoAnswer = () => {
      console.log('[CALL] call:no_answer');
      stopCallingTone();
      setOfflineRinging(null);
      setCallStatus('no_answer');
      setStatusMessage('لا يوجد رد');
      setTimeout(() => { setCallStatus(null); setStatusMessage(''); }, 3000);
      cleanup();
    };

    const onExpired = () => {
      stopRingtone();
      cleanup();
    };

    const onCalleeConnected = () => {
      setStatusMessage('جارٍ الاتصال...');
    };

    // ── SW postMessage: incoming call via push notification ───────────────
    const onSWMessage = (event) => {
      if (!event.data) return;
      const { type, callerId, callerName, callerSocketId, offer, roomId } = event.data;
      if (type === 'incoming_call_push' && offer && roomId) {
        console.log('[CALL] SW postMessage — callerId:', callerId, '| callerSocketId:', callerSocketId);
        setPushIncoming({ callerId, callerName, callerSocketId, offer, roomId });
        startRingtone();
      }
    };

    socket.on('call:incoming',        onIncoming);
    socket.on('call:ice',             onICE);
    socket.on('call:rejected',        onRejected);
    socket.on('call:ended',           onEnded);
    socket.on('call:cancelled',       onCancelled);
    socket.on('call:no_answer',       onNoAnswer);
    socket.on('call:expired',         onExpired);
    socket.on('call:callee_connected', onCalleeConnected);

    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', onSWMessage);
    }

    return () => {
      socket.off('connect',            joinRooms);
      socket.off('reconnect',          joinRooms);
      socket.off('call:incoming',      onIncoming);
      socket.off('call:ice',           onICE);
      socket.off('call:rejected',      onRejected);
      socket.off('call:ended',         onEnded);
      socket.off('call:cancelled',     onCancelled);
      socket.off('call:no_answer',     onNoAnswer);
      socket.off('call:expired',       onExpired);
      socket.off('call:callee_connected', onCalleeConnected);
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', onSWMessage);
      }
    };
  }, [socket]);

  // Call duration timer
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setDuration(Math.floor((Date.now() - active.startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);

  // ─────────────────────────────────────────────────────────────────────────
  // CALLEE SIDE: acceptCall (socket-based incoming)
  // ─────────────────────────────────────────────────────────────────────────
  async function acceptCall() {
    const pending = pendingOffer.current;
    if (!pending) {
      console.error('[CALL] acceptCall — no pending offer!');
      return;
    }
    const { offer, callerSocketId, callerName } = pending;
    if (!callerSocketId) {
      console.warn('[CALL] acceptCall — callerSocketId missing');
      return;
    }

    stopRingtone();
    setIncoming(null);
    pendingOffer.current = null;

    // Step 2 (callee): getUserMedia
    let stream;
    try {
      stream = await getAudio();
      localStream.current = stream;
    } catch (e) {
      console.error('[CALL] acceptCall getUserMedia failed:', e.message);
      alert('خطأ في الميكروفون: ' + e.message);
      return;
    }

    // createPC → addTrack → setRemoteDescription → flushBufferedICE
    // → createAnswer → setLocalDescription → emit call:answer
    const pc = createPC();
    stream.getTracks().forEach(t => {
      pc.addTrack(t, stream);
      console.log('[CALL] callee addTrack:', t.kind);
    });

    // Set ICE target immediately (we know callerSocketId)
    setICETarget(callerSocketId);

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('[CALL] Callee remote description set ✓');

    // Flush remote ICE received before remote desc was set
    await flushBufferedICE();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('[CALL] Callee answer created ✓ — SDP has audio:', answer.sdp.includes('m=audio'));

    socket.emit('call:answer', { callerSocketId, answer: pc.localDescription });

    // Flush any local ICE already gathered
    sendLocalICE(callerSocketId);

    setActive({ peerName: callerName, remoteSocketId: callerSocketId, startTime: Date.now() });
  }

  function rejectCall() {
    if (incoming?.callerSocketId) socket?.emit('call:reject', { callerSocketId: incoming.callerSocketId });
    pendingOffer.current = null;
    stopRingtone();
    setIncoming(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALLEE SIDE: acceptPushCall (push-based incoming)
  // ─────────────────────────────────────────────────────────────────────────
  async function acceptPushCall() {
    if (!pushIncoming) return;
    const { callerId, callerName, callerSocketId: swCallerSocketId, offer, roomId } = pushIncoming;
    console.log('[CALL] acceptPushCall — roomId:', roomId, '| callerId:', callerId);
    stopRingtone();
    setPushIncoming(null);

    // getUserMedia
    let stream;
    try {
      stream = await getAudio();
      localStream.current = stream;
    } catch (e) {
      console.error('[CALL] acceptPushCall getUserMedia failed:', e.message);
      alert('خطأ في الميكروفون: ' + e.message);
      return;
    }

    // createPC → addTrack → setRemoteDescription(offer)
    const pc = createPC();
    stream.getTracks().forEach(t => {
      pc.addTrack(t, stream);
      console.log('[CALL] acceptPushCall addTrack:', t.kind);
    });

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('[CALL] acceptPushCall remote desc set ✓');

    // flushBufferedICE → createAnswer → setLocalDescription
    await flushBufferedICE();

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);
    console.log('[CALL] acceptPushCall answer created ✓');

    // Wait for socket to be connected, then emit
    const emitAccept = () => {
      console.log('[CALL] acceptPushCall → emitting call:accept_from_push');
      socket.emit('call:accept_from_push', { roomId, answer: pc.localDescription });
    };

    if (socket.connected) {
      emitAccept();
    } else {
      socket.once('connect', emitAccept);
      socket.connect();
    }

    // Listen for call:accepted_ok → get callerSocketId, send local ICE, set active
    socket.once('call:accepted_ok', ({ callerSocketId }) => {
      console.log('[CALL] acceptPushCall call:accepted_ok — callerSocketId:', callerSocketId);
      setICETarget(callerSocketId);
      sendLocalICE(callerSocketId);
      setActive({ peerName: callerName || 'مستخدم', remoteSocketId: callerSocketId, startTime: Date.now() });
    });
  }

  function rejectPushCall() {
    if (!pushIncoming) return;
    socket?.emit('call:reject_from_push', { roomId: pushIncoming.roomId });
    stopRingtone();
    setPushIncoming(null);
  }

  // ── Hangup ────────────────────────────────────────────────────────────────
  function hangup() {
    if (active?.remoteSocketId) socket?.emit('call:end', { targetSocketId: active.remoteSocketId });
    if (offlineRinging?.roomId) socket?.emit('call:reject_from_push', { roomId: offlineRinging.roomId });
    stopCallingTone();
    stopRingtone();
    cleanup();
  }

  function toggleMute() {
    localStream.current?.getAudioTracks().forEach(t => { t.enabled = !t.enabled; });
    setMuted(m => !m);
  }

  // ── UI Styles ─────────────────────────────────────────────────────────────
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

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <>
      {/* audio element ALWAYS in DOM — never conditional */}
      <audio
        ref={remoteAudio}
        id="xtox-remote-audio"
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

      {/* Incoming call (socket-based) */}
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

      {/* Incoming call (push-based) */}
      {pushIncoming && !active && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📲</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{pushIncoming.callerName || 'مستخدم'}</div>
          <div style={{ fontSize: 13, color: '#aaa', margin: '6px 0 18px' }}>مكالمة واردة عبر الإشعارات</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <button onClick={rejectPushCall} aria-label="رفض المكالمة"
                style={{ background: '#e74c3c', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 22, cursor: 'pointer', color: 'white' }}>
                📵
              </button>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>رفض</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={acceptPushCall} aria-label="قبول المكالمة"
                style={{ background: '#25d366', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 22, cursor: 'pointer', color: 'white' }}>
                📞
              </button>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>قبول</div>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing call / ringing offline */}
      {offlineRinging && !active && !incoming && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{offlineRinging.calleeName || 'جارٍ الاتصال...'}</div>
          <div style={{ fontSize: 13, color: '#888', margin: '6px 0 18px' }}>{statusMessage || 'جارٍ الاتصال...'}</div>
          <button
            onClick={() => {
              if (offlineRinging?.roomId) socket?.emit('call:reject_from_push', { roomId: offlineRinging.roomId });
              socket?.emit('call:cancel', { targetUserId: offlineRinging?.calleeId });
              stopCallingTone();
              cleanup();
            }}
            style={{ background: '#e74c3c', border: 'none', borderRadius: 24, padding: '10px 24px', color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 700 }}>
            إلغاء 📵
          </button>
        </div>
      )}

      {/* No answer / rejected status */}
      {(callStatus === 'no_answer' || callStatus === 'rejected') && !active && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📵</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#e74c3c' }}>
            {callStatus === 'rejected' ? 'تم رفض المكالمة' : 'لا يوجد رد'}
          </div>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 6 }}>{statusMessage}</div>
        </div>
      )}

      {/* Active call */}
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
