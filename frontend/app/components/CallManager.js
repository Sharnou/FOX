'use client';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

// ─── A2: ICE config: STUN + TURN + TURNS (critical for NAT traversal) ─────────
const NO_ANSWER_TIMEOUT_MS = 30000;

// ─── A6: applyBitrateCap — uses RTCRtpSender API, 16kbps (safe, no SDP hacking) ─
async function applyBitrateCap(pc, maxBitrateBps = 16000) {
  try {
    const senders = pc.getSenders();
    for (const sender of senders) {
      if (!sender.track || sender.track.kind !== 'audio') continue;
      const params = sender.getParameters();
      if (!params.encodings) params.encodings = [{}];
      if (params.encodings.length === 0) params.encodings.push({});
      params.encodings[0].maxBitrate = maxBitrateBps;
      await sender.setParameters(params);
      console.log('[CALL] applyBitrateCap ✓ — maxBitrate:', maxBitrateBps, 'bps');
    }
  } catch (e) {
    console.warn('[CALL] applyBitrateCap failed (non-fatal):', e.message);
  }
}

// ─── Web Audio API ring-back tone ─────────────────────────────────────────────
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
    } catch (e) {}
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
  const [incoming, setIncoming]           = useState(null);
  const [active, setActive]               = useState(null);
  const [duration, setDuration]           = useState(0);
  const [muted, setMuted]                 = useState(false);
  const [offlineRinging, setOfflineRinging] = useState(null);
  const [pushIncoming, setPushIncoming]   = useState(null);
  const [callStatus, setCallStatus]       = useState(null);
  const [statusMessage, setStatusMessage] = useState('');

  const pcRef            = useRef(null);
  const localStream      = useRef(null);
  // A1: remoteAudio ref — MUST always be in DOM (never conditional)
  const remoteAudio      = useRef(null);
  const ringtoneRef      = useRef(null);
  const pendingICE       = useRef([]);   // outgoing ICE buffered until callee socket ID known
  const receivedICE      = useRef([]);   // incoming ICE buffered until remote description set
  const noAnswerTimer    = useRef(null);
  // A9: pendingOfferRef — stores offer+callerSocketId until user taps Accept
  const pendingOfferRef  = useRef(null);
  const currentUserRef   = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ─── URL autoAnswer detection (push notification opened app) ────────────
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const autoAnswerParam = params.get('autoAnswer');
    if (autoAnswerParam) {
      let callerId = '';
      let callerSocketId = null;
      let callerName = params.get('callerName') || 'مستخدم XTOX';
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
        setIncoming({ callerId, callerName, callerSocketId });
        startRingtone();
      }
    }
  }, []);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  // ─── Ringtone ─────────────────────────────────────────────────────────────
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

  const cleanup = useCallback(() => {
    clearTimeout(noAnswerTimer.current);
    noAnswerTimer.current = null;
    pendingICE.current = [];
    receivedICE.current = [];
    pendingOfferRef.current = null;
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
    setCallStatus(null);
    setStatusMessage('');
  }, [stopRingtone]);

  // ─── A2: createPC — robust ICE + ontrack + ICE state logging ─────────────
  function createPC(remoteSocketId) {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }

    const p = new RTCPeerConnection({
      iceServers: [
        { urls: 'stun:stun.l.google.com:19302' },
        { urls: 'stun:stun1.l.google.com:19302' },
        { urls: 'turn:openrelay.metered.ca:80',
          username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443',
          username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turns:openrelay.metered.ca:443',
          username: 'openrelayproject', credential: 'openrelayproject' },
        { urls: 'turn:openrelay.metered.ca:443?transport=tcp',
          username: 'openrelayproject', credential: 'openrelayproject' },
      ],
      iceCandidatePoolSize: 10,
    });

    // A2: ontrack — set srcObject explicitly, handle autoplay block
    p.ontrack = (event) => {
      console.log('[CALL] ontrack fired — kind:', event.track.kind, '| streams:', event.streams.length);
      if (event.streams && event.streams[0]) {
        if (remoteAudio.current) {
          remoteAudio.current.srcObject = event.streams[0];
          remoteAudio.current.volume = 1.0;
          remoteAudio.current.muted = false;
          const playPromise = remoteAudio.current.play();
          if (playPromise) {
            playPromise
              .then(() => console.log('[CALL] remote audio playing ✓'))
              .catch(e => {
                console.warn('[CALL] audio.play() blocked:', e.message, '— attaching recovery handler');
                const resume = () => {
                  remoteAudio.current?.play().catch(() => {});
                  document.removeEventListener('click', resume);
                  document.removeEventListener('touchend', resume);
                };
                document.addEventListener('click', resume, { once: true });
                document.addEventListener('touchend', resume, { once: true });
              });
          }
        } else {
          console.error('[CALL] remoteAudio.current is NULL — audio element missing from DOM!');
        }
      }
    };

    // A2: onicecandidate — buffer until remoteSocketId is known
    p.onicecandidate = (e) => {
      if (!e.candidate) return;
      if (remoteSocketId && socket) {
        socket.emit('call:ice', { targetSocketId: remoteSocketId, candidate: e.candidate });
      } else {
        pendingICE.current.push(e.candidate);
        console.log('[CALL] ICE buffered (no remoteSocketId yet) — total:', pendingICE.current.length);
      }
    };

    p.oniceconnectionstatechange = () => {
      console.log('[CALL] ICE state:', p.iceConnectionState);
      if (p.iceConnectionState === 'failed' || p.iceConnectionState === 'closed') {
        console.error('[CALL] ICE failed/closed — cleaning up');
        cleanup();
      }
    };

    p.onconnectionstatechange = () => {
      console.log('[CALL] Connection state:', p.connectionState);
      if (p.connectionState === 'connected') {
        console.log('[CALL] ✅ Peer connected — audio should be flowing');
      }
    };

    p.onicegatheringstatechange = () => {
      console.log('[CALL] ICE gathering:', p.iceGatheringState);
    };

    pcRef.current = p;
    return p;
  }

  // ─── A3: getAudio — simple constraints, no exotic sampleRate/channelCount ──
  async function getAudio() {
    const constraints = {
      audio: {
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
      video: false,
    };
    try {
      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      console.log('[CALL] getUserMedia OK — tracks:', stream.getTracks().map(t => t.kind + ':' + t.enabled));
      localStream.current = stream;
      return stream;
    } catch (e) {
      console.error('[CALL] getUserMedia failed:', e.name, e.message);
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        alert('يرجى السماح بالوصول للميكروفون لإجراء المكالمات');
      } else if (e.name === 'NotFoundError') {
        alert('لم يتم العثور على مايكروفون في جهازك');
      } else {
        alert('خطأ في الميكروفون: ' + e.message);
      }
      throw e;
    }
  }

  // Flush buffered outgoing ICE to a now-known remoteSocketId
  function flushPendingICE(remoteSocketId) {
    if (!socket || !remoteSocketId) return;
    console.log('[CALL] Flushing', pendingICE.current.length, 'buffered ICE candidates → socket:', remoteSocketId);
    pendingICE.current.forEach(c => socket.emit('call:ice', { targetSocketId: remoteSocketId, candidate: c }));
    pendingICE.current = [];
  }

  // ─── Expose initiateCall + hangup via ref ─────────────────────────────────
  useImperativeHandle(ref, () => ({
    // A4: initiateCall — correct flow: getAudio → addTrack → createOffer → emit
    async initiateCall(calleeId, calleeName) {
      if (active || incoming) return;
      if (!socket || !socket.connected) {
        alert('جارٍ الاتصال بالخادم... حاول مرة أخرى بعد ثانية');
        return;
      }

      let stream;
      try {
        stream = await getAudio();
      } catch (e) {
        stopCallingTone();
        return;
      }

      const p = createPC(null); // remoteSocketId unknown until call:accepted

      // A4: Add tracks BEFORE createOffer
      stream.getTracks().forEach(t => {
        p.addTrack(t, stream);
        console.log('[CALL] addTrack:', t.kind);
      });

      const offer = await p.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
      await p.setLocalDescription(offer);
      console.log('[CALL] Offer created — SDP has audio:', offer.sdp.includes('m=audio'));

      // A4: Apply bitrate cap AFTER setLocalDescription
      await applyBitrateCap(p, 16000);

      const callerName   = currentUser?.name || currentUser?.username || 'مستخدم';
      const callerAvatar = currentUser?.avatar || '';

      socket.emit('call:initiate', {
        calleeId,
        callerName,
        callerAvatar,
        offer: p.localDescription,
      });

      playCallingTone();

      // 30-second no-answer timer
      noAnswerTimer.current = setTimeout(() => {
        socket.emit('call:cancel', { targetUserId: calleeId });
        stopCallingTone();
        cleanup();
      }, NO_ANSWER_TIMEOUT_MS);

      // A8: Listen for call:accepted (what backend emits when callee answers)
      socket.once('call:accepted', async ({ calleeSocketId, answer }) => {
        console.log('[CALL] call:accepted — calleeSocketId:', calleeSocketId);
        clearTimeout(noAnswerTimer.current);
        stopCallingTone();

        // Update ICE target now that we know callee socket
        if (pcRef.current) {
          pcRef.current.onicecandidate = (e) => {
            if (e.candidate && socket) {
              socket.emit('call:ice', { targetSocketId: calleeSocketId, candidate: e.candidate });
            }
          };
        }

        await p.setRemoteDescription(new RTCSessionDescription(answer));
        console.log('[CALL] Remote description set ✓');

        // Flush buffered ICE to callee
        flushPendingICE(calleeSocketId);

        // Flush any received ICE that arrived before remote desc
        for (const c of receivedICE.current) {
          await p.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('[CALL] addIceCandidate err:', e.message));
        }
        receivedICE.current = [];

        setActive({ peerName: calleeName, remoteSocketId: calleeSocketId, startTime: Date.now() });
      });
    },

    hangup() {
      if (active?.remoteSocketId) socket.emit('call:end', { otherSocketId: active.remoteSocketId });
      cleanup();
    },
  }), [socket, currentUser, active, incoming]);

  // ─── Socket event handlers ─────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;
    const getCurrent = () => currentUserRef.current;
    const userId = (getCurrent()?._id || getCurrent()?.id) || '';

    if (userId) {
      socket.emit('join_user_room', { userId });
      socket.emit('join', userId);
    }

    const onReconnect = () => {
      const uid = (getCurrent()?._id || getCurrent()?.id) || '';
      if (uid) {
        socket.emit('join_user_room', { userId: uid });
        socket.emit('join', uid);
        console.log('[CallManager] Rejoined rooms after reconnect:', uid);
      }
    };
    socket.on('reconnect', onReconnect);
    socket.on('connect', onReconnect);

    // A5: onOffer — callee receives call:incoming WITH offer — store and show UI
    const onOffer = ({ offer, callerSocketId, callerName, callerAvatar, callerId }) => {
      console.log('[CALL] call:incoming — callerSocketId:', callerSocketId, '| callerName:', callerName);
      // Store offer for when user taps Accept
      pendingOfferRef.current = { offer, callerSocketId, callerName: callerName || 'مستخدم XTOX' };
      setIncoming({ callerId: callerId || callerSocketId, callerName: callerName || 'مستخدم XTOX', callerAvatar: callerAvatar || '', callerSocketId });
      startRingtone();
    };

    // A7: ICE candidate handling — buffer until remoteDescription is set
    const onICE = async ({ candidate }) => {
      if (!candidate) return;
      const p = pcRef.current;
      if (!p) {
        receivedICE.current.push(candidate);
        return;
      }
      if (p.remoteDescription && p.remoteDescription.type) {
        try {
          await p.addIceCandidate(new RTCIceCandidate(candidate));
          console.log('[CALL] ICE candidate added ✓');
        } catch (e) {
          console.warn('[CALL] addIceCandidate failed:', e.message);
        }
      } else {
        receivedICE.current.push(candidate);
        console.log('[CALL] ICE buffered (no remoteDesc yet) — total:', receivedICE.current.length);
      }
    };

    const onRejected    = () => { stopCallingTone(); stopRingtone(); cleanup(); };
    const onEnded       = () => { stopRingtone(); cleanup(); };
    const onCancelled   = () => {
      console.log('[CallManager] Call cancelled by caller');
      stopRingtone();
      setIncoming(null);
      pendingOfferRef.current = null;
    };
    const onUnavailable = () => { stopCallingTone(); };

    const onRingingOffline = ({ roomId, to, message }) => {
      setOfflineRinging({ roomId, to });
      setCallStatus('ringing_offline');
      setStatusMessage(message || 'جارٍ الاتصال... المستخدم خارج التطبيق');
    };

    const onExpired = () => {
      stopRingtone();
      cleanup();
    };

    const onAcceptedOk = ({ callerSocketId }) => {
      // Push callee accepted — handled in acceptPushCall
    };

    const onCalleeConnected = () => {
      setStatusMessage('جارٍ الاتصال...');
    };

    const onNoAnswer = () => {
      stopCallingTone();
      cleanup();
      setCallStatus('no_answer');
      setStatusMessage('لا يوجد رد');
      setTimeout(() => setCallStatus(null), 3000);
    };

    socket.on('call:incoming',         onOffer);
    socket.on('call:ice',              onICE);
    socket.on('call:rejected',         onRejected);
    socket.on('call:ended',            onEnded);
    socket.on('call:cancelled',        onCancelled);
    socket.on('call:user_unavailable', onUnavailable);
    socket.on('call:ringing_offline',  onRingingOffline);
    socket.on('call:expired',          onExpired);
    socket.on('call:accepted_ok',      onAcceptedOk);
    socket.on('call:callee_connected', onCalleeConnected);
    socket.on('call:no_answer',        onNoAnswer);

    // ── Service Worker message: incoming call from push notification ──────
    const onSWMessage = async (event) => {
      if (!event.data) return;
      const { type, callerId, callerName, callerSocketId: swCallerSocketId, offer, roomId } = event.data;
      if (type === 'incoming_call_push' && offer && roomId) {
        console.log('[CALL] SW message incoming_call_push — callerId:', callerId, '| callerSocketId:', swCallerSocketId);
        setPushIncoming({ callerId, callerName, callerSocketId: swCallerSocketId, offer, roomId });
        startRingtone();
      }
    };

    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', onSWMessage);
    }

    return () => {
      socket.off('call:incoming',         onOffer);
      socket.off('call:ice',              onICE);
      socket.off('call:rejected',         onRejected);
      socket.off('call:ended',            onEnded);
      socket.off('call:cancelled',        onCancelled);
      socket.off('call:user_unavailable', onUnavailable);
      socket.off('call:ringing_offline',  onRingingOffline);
      socket.off('call:expired',          onExpired);
      socket.off('call:accepted_ok',      onAcceptedOk);
      socket.off('call:callee_connected', onCalleeConnected);
      socket.off('call:no_answer',        onNoAnswer);
      socket.off('reconnect',             onReconnect);
      socket.off('connect',               onReconnect);
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

  function hangup() {
    if (active?.remoteSocketId) socket.emit('call:end', { otherSocketId: active.remoteSocketId });
    if (offlineRinging?.roomId) socket.emit('call:reject_from_push', { roomId: offlineRinging.roomId });
    stopRingtone();
    cleanup();
  }

  // A5: acceptCall — full WebRTC setup (callee side, socket call)
  async function acceptCall() {
    const pending = pendingOfferRef.current;
    if (!pending) {
      console.error('[CALL] acceptCall — no pending offer! pendingOfferRef is null');
      // Fallback: if caller socket ID is known from incoming state but offer is missing,
      // try legacy flow by signaling readiness
      if (incoming?.callerSocketId) {
        stopRingtone();
        setIncoming(null);
        socket.emit('call:answered_ready', { callerSocketId: incoming.callerSocketId });
      }
      return;
    }

    const { offer, callerSocketId, callerName } = pending;
    if (!callerSocketId) {
      console.warn('[CALL] acceptCall — callerSocketId is null — waiting for socket event');
      return;
    }

    stopRingtone();
    setIncoming(null);
    pendingOfferRef.current = null;

    let stream;
    try {
      stream = await getAudio();
    } catch (e) {
      return;
    }

    const p = createPC(callerSocketId);
    stream.getTracks().forEach(t => {
      p.addTrack(t, stream);
      console.log('[CALL] callee addTrack:', t.kind);
    });

    await p.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('[CALL] Callee set remote description ✓');

    // Flush ICE candidates that arrived before remote desc was set
    if (receivedICE.current.length > 0) {
      console.log('[CALL] Flushing', receivedICE.current.length, 'pre-buffered remote ICE candidates');
      for (const c of receivedICE.current) {
        await p.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('[CALL] addIceCandidate err:', e.message));
      }
      receivedICE.current = [];
    }

    const answer = await p.createAnswer();
    await p.setLocalDescription(answer);
    console.log('[CALL] Callee answer created ✓ — SDP has audio:', answer.sdp.includes('m=audio'));

    await applyBitrateCap(p, 16000);

    socket.emit('call:answer', { callerSocketId, answer: p.localDescription });
    setActive({ peerName: callerName, remoteSocketId: callerSocketId, startTime: Date.now() });
  }

  function rejectCall() {
    if (incoming?.callerSocketId) socket.emit('call:reject', { callerSocketId: incoming.callerSocketId });
    pendingOfferRef.current = null;
    stopRingtone();
    setIncoming(null);
  }

  // ── Push call accept/reject ───────────────────────────────────────────────
  async function acceptPushCall() {
    if (!pushIncoming) return;
    const { callerId, callerName, offer, roomId } = pushIncoming;
    console.log('[CALL] acceptPushCall — roomId:', roomId, '| callerId:', callerId, '| socket connected:', socket?.connected);
    stopRingtone();
    setPushIncoming(null);

    let stream;
    try {
      stream = await getAudio();
    } catch (e) {
      return;
    }

    const p = createPC(null);
    stream.getTracks().forEach(t => {
      p.addTrack(t, stream);
      console.log('[CALL] acceptPushCall addTrack:', t.kind);
    });

    await p.setRemoteDescription(new RTCSessionDescription(offer));
    console.log('[CALL] acceptPushCall remote desc set ✓');

    if (receivedICE.current.length > 0) {
      for (const c of receivedICE.current) {
        await p.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
      }
      receivedICE.current = [];
    }

    const answer = await p.createAnswer();
    await p.setLocalDescription(answer);
    await applyBitrateCap(p, 16000);
    console.log('[CALL] acceptPushCall answer created ✓');

    const emitAccept = () => {
      console.log('[CALL] acceptPushCall — emitting call:accept_from_push');
      socket.emit('call:accept_from_push', { roomId, answer: p.localDescription });
    };

    if (socket.connected) {
      emitAccept();
    } else {
      socket.once('connect', () => { emitAccept(); });
      socket.connect();
    }

    socket.once('call:accepted_ok', ({ callerSocketId }) => {
      console.log('[CALL] acceptPushCall call:accepted_ok — callerSocketId:', callerSocketId);
      if (p) {
        p.onicecandidate = e => {
          if (e.candidate && socket) {
            socket.emit('call:ice', { targetSocketId: callerSocketId, candidate: e.candidate });
          }
        };
      }
      flushPendingICE(callerSocketId);
      setActive({ peerName: callerName || 'مستخدم', remoteSocketId: callerSocketId, startTime: Date.now() });
    });
  }

  function rejectPushCall() {
    if (!pushIncoming) return;
    socket.emit('call:reject_from_push', { roomId: pushIncoming.roomId });
    stopRingtone();
    setPushIncoming(null);
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
      {/* A1: audio element ALWAYS in DOM — never conditional */}
      <audio
        ref={remoteAudio}
        id="xtox-remote-audio"
        autoPlay
        playsInline
        style={{ display: 'none' }}
      />

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

      {offlineRinging && !active && !incoming && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#aaa' }}>جارٍ الاتصال...</div>
          <div style={{ fontSize: 13, color: '#888', margin: '6px 0 18px' }}>{statusMessage || 'تم إرسال إشعار للمستخدم'}</div>
          <button
            onClick={() => {
              socket.emit('call:reject_from_push', { roomId: offlineRinging.roomId });
              cleanup();
            }}
            style={{ background: '#e74c3c', border: 'none', borderRadius: 24, padding: '10px 24px', color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 700 }}>
            إلغاء 📵
          </button>
        </div>
      )}

      {callStatus === 'no_answer' && !active && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📵</div>
          <div style={{ fontWeight: 700, fontSize: 16, color: '#e74c3c' }}>لا يوجد رد</div>
          <div style={{ fontSize: 13, color: '#aaa', marginTop: 6 }}>لم يرد المستخدم على المكالمة</div>
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
