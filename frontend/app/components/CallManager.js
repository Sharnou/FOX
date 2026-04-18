'use client';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

// ─── ICE config: STUN + TURN (TURN is critical for NAT traversal / different networks) ───
const ICE_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'stun:stun2.l.google.com:19302' },
    { urls: 'stun:stun3.l.google.com:19302' },
    // TURN servers — essential for calls between users on different networks/ISPs
    {
      urls: 'turn:openrelay.metered.ca:80',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
    {
      urls: 'turn:openrelay.metered.ca:443?transport=tcp',
      username: 'openrelayproject',
      credential: 'openrelayproject',
    },
  ],
  iceCandidatePoolSize: 10,
};

// ─── Audio constraints: echo cancellation + noise suppression ───────────────
const AUDIO_CONSTRAINTS = {
  audio: {
    echoCancellation: true,
    noiseSuppression: true,
    autoGainControl: true,
    sampleSize: 16,
    channelCount: 1,
    sampleRate: 8000,
  },
  video: false,
};

// ─── RTCRtpSender API bitrate cap (replaces fragile SDP hacking, Bug #84) ────
// 8kbps is the minimum for intelligible voice — SDP hacking at 4kbps caused silence
async function applyBitrateCap(pc, maxBitrateBps = 8000) {
  const senders = pc.getSenders();
  for (const sender of senders) {
    if (sender.track?.kind !== 'audio') continue;
    try {
      const params = sender.getParameters();
      if (!params.encodings || params.encodings.length === 0) {
        params.encodings = [{}];
      }
      params.encodings[0].maxBitrate = maxBitrateBps;
      await sender.setParameters(params);
      console.log('[CALL] applyBitrateCap — set maxBitrate:', maxBitrateBps, 'bps');
    } catch (e) {
      console.warn('[CALL] applyBitrateCap failed (non-fatal):', e.message);
    }
  }
}

const NO_ANSWER_TIMEOUT_MS = 30000; // 30 seconds

// ─── Web Audio API calling tone (no external file needed) ────────────────────
// Plays a repeating ring-back tone pattern: 1s ring, 2s silence
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
      // Two-tone ring: 440Hz then 480Hz (classic phone ring-back)
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      osc.start(ctx.currentTime);
      osc.stop(ctx.currentTime + 1.0);
      osc.onended = () => { try { ctx.close(); } catch {} };
    } catch (e) {}
    // Ring again after 3 seconds (1s ring + 2s silence)
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
  const [incoming, setIncoming] = useState(null);   // { callerId, callerName, callerSocketId }
  const [active, setActive]     = useState(null);   // { peerName, remoteSocketId, startTime }
  const [duration, setDuration] = useState(0);
  const [muted, setMuted]       = useState(false);
  const [offlineRinging, setOfflineRinging] = useState(null);  // { roomId, to } — ringing an offline user via push
  const [pushIncoming, setPushIncoming]     = useState(null);  // { callerId, callerName, offer, roomId } — received via SW push
  const [callStatus, setCallStatus]         = useState(null);  // 'ringing_offline' | 'no_answer' | null
  const [statusMessage, setStatusMessage]   = useState('');   // human-readable status shown in UI

  const pc               = useRef(null);
  const localStream      = useRef(null);
  const remoteAudio      = useRef(null);
  const ringtoneRef      = useRef(null);
  const pendingICE       = useRef([]);   // buffer ICE candidates until responder socket ID is known
  const receivedICE      = useRef([]);   // buffer incoming ICE candidates until remote description is set
  const noAnswerTimer    = useRef(null); // 30-second auto-hangup timer
  // Use ref to avoid stale closure — always has latest currentUser without re-registering socket listeners
  const currentUserRef   = useRef(currentUser);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);

  // ─── B4: Detect ?autoAnswer=callerId_socketId in URL — show incoming call UI immediately ─
  // When callee opens app from push notification, pre-show the incoming call UI.
  // URL format: ?autoAnswer=<callerId>_<callerSocketId>  (Fix #82)
  // Both callerId (MongoDB hex) and callerSocketId (Socket.IO ID) are embedded.
  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const autoAnswerParam = params.get('autoAnswer');
    if (autoAnswerParam) {
      let callerId = '';
      let callerSocketId = null;
      let callerName = params.get('callerName') || 'مستخدم XTOX';
      if (autoAnswerParam === 'true') {
        // Legacy format: ?autoAnswer=true&callerId=X
        callerId = params.get('callerId') || params.get('roomId') || '';
      } else {
        // New format: ?autoAnswer=callerId_socketId (Fix #82)
        const underscoreIdx = autoAnswerParam.indexOf('_');
        if (underscoreIdx > 0) {
          callerId = autoAnswerParam.slice(0, underscoreIdx);
          callerSocketId = autoAnswerParam.slice(underscoreIdx + 1) || null;
        } else {
          callerId = autoAnswerParam;
        }
      }
      if (callerId) {
        console.log('[CALL] autoAnswer URL detected — callerId:', callerId, '| callerSocketId:', callerSocketId);
        // Pre-show incoming call overlay with callerSocketId if available
        setIncoming({ callerId, callerName, callerSocketId });
        startRingtone();
      }
    }
  }, []);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ─── Ringtone helpers ────────────────────────────────────────────────────────
  const startRingtone = useCallback(() => {
    try {
      if (ringtoneRef.current) return; // already playing
      const audio = new Audio('/sounds/ringtone.wav');
      audio.loop = true;
      audio.volume = 0.8;
      audio.play().catch(() => {}); // autoplay may be blocked — OK
      ringtoneRef.current = audio;
    } catch (e) {}
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
    pc.current?.close();
    pc.current = null;
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

  function createPC(remoteSocketId) {
    if (pc.current) { pc.current.close(); pc.current = null; }
    const p = new RTCPeerConnection(ICE_CONFIG);

    p.onicecandidate = e => {
      if (!e.candidate) return;
      if (remoteSocketId && socket) {
        socket.emit('call:ice', { targetSocketId: remoteSocketId, candidate: e.candidate });
      } else {
        // Buffer candidates until we know the responder's socket ID
        pendingICE.current.push(e.candidate);
      }
    };

    // ─── Fix B: ontrack — set volume/muted explicitly, handle autoplay block ───
    p.ontrack = e => {
      console.log('[CALL] ontrack fired — track:', e.track.kind, '| streams:', e.streams.length, '| remoteAudioRef valid:', !!remoteAudio.current);
      if (remoteAudio.current && e.streams && e.streams[0]) {
        remoteAudio.current.srcObject = e.streams[0];
        remoteAudio.current.volume = 1.0;
        remoteAudio.current.muted = false;
        console.log('[CALL] Set remoteAudio.srcObject — stream tracks:', e.streams[0].getTracks().length);
        remoteAudio.current.play()
          .then(() => console.log('[CALL] Remote audio playing ✓'))
          .catch(err => {
            console.warn('[CALL] Audio autoplay blocked:', err.message, '— attaching click/touch handler for recovery');
            // Recover from autoplay block on first user interaction
            const resume = () => {
              remoteAudio.current?.play().catch(() => {});
              document.removeEventListener('click', resume);
              document.removeEventListener('touchend', resume);
            };
            document.addEventListener('click', resume, { once: true });
            document.addEventListener('touchend', resume, { once: true });
          });
      } else {
        console.error('[CALL] ontrack fired but remoteAudio ref or streams missing! remoteAudio:', !!remoteAudio.current, 'streams[0]:', !!(e.streams && e.streams[0]));
      }
    };

    p.oniceconnectionstatechange = () => {
      const s = p.iceConnectionState;
      console.log('[CALL] ICE connection state:', s);
      // 'disconnected' is a temporary state — ICE may recover, so do NOT cleanup immediately
      // Only cleanup on unrecoverable states: 'failed' or 'closed'
      if (s === 'failed' || s === 'closed') {
        cleanup();
      }
    };

    p.onconnectionstatechange = () => {
      console.log('[CALL] Peer connection state:', p.connectionState);
    };
    p.onicegatheringstatechange = () => {
      console.log('[CALL] ICE gathering state:', p.iceGatheringState);
    };

    pc.current = p;
    return p;
  }

  async function getAudio() {
    // ─── Robust mic permission + rich audio constraints ───────────────────────
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          channelCount: { ideal: 1, max: 1 },
          sampleRate: { ideal: 8000 },
          noiseSuppression: true,
          echoCancellation: true,
          autoGainControl: true,
        },
        video: false,
      });
    } catch (e) {
      if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
        alert('يرجى السماح بالمايكروفون من إعدادات الجهاز أو المتصفح');
        throw e;
      }
      if (e.name === 'NotFoundError') {
        alert('لم يتم العثور على مايكروفون في جهازك');
        throw e;
      }
      alert('خطأ في الوصول للمايكروفون: ' + e.message);
      throw e;
    }
    localStream.current = stream;
    stream.getTracks().forEach(t => console.log('[WebRTC] Got local track:', t.kind, t.label, 'enabled:', t.enabled));
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
      if (!socket || !socket.connected) {
        alert('جارٍ الاتصال بالخادم... حاول مرة أخرى بعد ثانية');
        return;
      }
      try {
        // ─── Fix A: Get microphone FIRST before creating PC or offer ─────────
        console.log('[CALL] initiateCall() — getting microphone first');
        const stream = await getAudio().catch(err => {
          if (err.name === 'NotAllowedError') {
            alert('يرجى السماح بالوصول للميكروفون لإجراء المكالمات');
          }
          throw err;
        });
        console.log('[CALL] Got microphone ✓ tracks:', stream.getTracks().length);

        // Create PC with null remote socket ID — ICE will be buffered
        const p = createPC(null);

        // ─── Fix A: Add tracks BEFORE createOffer ────────────────────────────
        stream.getTracks().forEach(t => {
          p.addTrack(t, stream);
          console.log('[CALL] Caller addTrack:', t.kind, '| enabled:', t.enabled);
        });

        // Now create offer (tracks already present → SDP includes audio)
        const offer = await p.createOffer({ offerToReceiveAudio: true });
        await p.setLocalDescription(offer);
        // Apply bitrate cap via sender API (8kbps min for intelligible voice, replaces SDP hacking)
        await applyBitrateCap(p, 8000);
        console.log('[CALL] Caller created offer — SDP audio:', offer.sdp.includes('m=audio'), '| SDP excerpt:', offer.sdp.substring(0, 200));

        const callerId   = currentUser?._id || currentUser?.id || '';
        const callerName = currentUser?.name || 'مستخدم';
        const callerAvatar = currentUser?.avatar || '';
        // Include the offer in call:initiate so offline users can receive it via push
        socket.emit('call:initiate', {
          targetUserId,
          callerId,
          callerName,
          callerAvatar,
          offer: p.localDescription,  // SDP offer for offline push answering
        });

        // Play outgoing ring-back tone for caller
        playCallingTone();

        // Start 30-second no-answer timer — cancel call and notify callee to stop ringing
        noAnswerTimer.current = setTimeout(() => {
          socket.emit('call:cancel', { targetUserId });  // callee stops ringing
          stopCallingTone();
          cleanup();
        }, NO_ANSWER_TIMEOUT_MS);

        // Wait for responder to be ready, then send offer + flush buffered ICE
        socket.once('call:answered_ready', async ({ responderSocketId }) => {
          clearTimeout(noAnswerTimer.current);
          stopCallingTone();
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
          socket.emit('call:offer', { targetSocketId: responderSocketId, offer: p.localDescription });
          console.log('[WebRTC] Sent offer to responder:', responderSocketId);
        });

        socket.once('call:answered', async ({ answer, responderSocketId }) => {
          try {
            clearTimeout(noAnswerTimer.current);
            stopCallingTone();
            if (pc.current) {
              await pc.current.setRemoteDescription(new RTCSessionDescription(answer));
              console.log('[CALL] Caller set remote desc (answer) — ICE state:', pc.current.iceConnectionState, '| connection:', pc.current.connectionState);
              // Flush any ICE candidates received before answer's remote description
              for (const c of receivedICE.current) {
                await pc.current.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
              }
              receivedICE.current = [];
            }
            setActive({ peerName: targetName, remoteSocketId: responderSocketId, startTime: Date.now() });
          } catch (e) {
            console.error('[CallManager] call:answered error:', e.message);
            cleanup();
          }
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
    if (!socket) return;
    // Use ref to get fresh currentUser without re-registering (avoids duplicate listeners)
    const getCurrent = () => currentUserRef.current;
    const userId = (getCurrent()?._id || getCurrent()?.id) || '';
    // Join user room now and re-join on every reconnect
    if (userId) {
      socket.emit('join_user_room', { userId });
      socket.emit('join', userId); // also emit 'join' for backward compatibility
    }

    const onReconnect = () => {
      const uid = (getCurrent()?._id || getCurrent()?.id) || '';
      if (uid) {
        socket.emit('join_user_room', { userId: uid });
        socket.emit('join', uid);
        console.log('[CallManager] Rejoined user rooms after reconnect:', uid);
      }
    };
    socket.on('reconnect', onReconnect);
    socket.on('connect', onReconnect);

    const onIncoming = ({ callerId, callerName, callerSocketId }) => {
      setIncoming({ callerId, callerName, callerSocketId });
      startRingtone(); // play ringtone when incoming call arrives
    };

    // ─── Fix A (callee side): Get mic → add tracks → setRemoteDesc → createAnswer ───
    const onOffer = async ({ offer, callerSocketId }) => {
      try {
        stopRingtone(); // stop ringing when offer arrives (callee accepted)
        const stream = await getAudio().catch(err => {
          if (err.name === 'NotAllowedError') {
            alert('يرجى السماح بالوصول للميكروفون لإجراء المكالمات');
          }
          return null;
        });
        if (!stream) return;

        const p = createPC(callerSocketId);

        // ─── Fix A: Add local tracks BEFORE setRemoteDescription ─────────────
        stream.getTracks().forEach(t => {
          p.addTrack(t, stream);
          console.log('[CALL] Callee addTrack:', t.kind, '| enabled:', t.enabled);
        });

        await p.setRemoteDescription(new RTCSessionDescription(offer));
        console.log('[CALL] Callee set remote desc (offer) — ICE state:', p.iceConnectionState, '| connection:', p.connectionState);

        // Flush any ICE candidates that arrived before the remote description was set
        for (const c of receivedICE.current) {
          await p.addIceCandidate(new RTCIceCandidate(c)).catch(() => {});
        }
        receivedICE.current = [];

        const answer = await p.createAnswer();
        await p.setLocalDescription(answer);
        // Apply bitrate cap via sender API (8kbps min for intelligible voice)
        await applyBitrateCap(p, 8000);
        console.log('[CALL] Callee created answer — SDP audio:', answer.sdp.includes('m=audio'), '| bitrateCap applied ✓');

        socket.emit('call:answer', { callerSocketId, answer: p.localDescription });
      } catch (e) {
        console.error('[CallManager] onOffer error:', e.message);
        cleanup();
      }
    };

    const onICE = ({ candidate }) => {
      if (!candidate) return;
      // Buffer if PC not created yet or remote description not set
      if (!pc.current || !pc.current.remoteDescription) {
        receivedICE.current.push(candidate);
        return;
      }
      pc.current.addIceCandidate(new RTCIceCandidate(candidate)).catch(() => {});
    };

    const onRejected    = () => { stopRingtone(); cleanup(); };
    const onEnded       = () => { stopRingtone(); cleanup(); };
    const onUnavailable = ({ targetUserId }) => {
      // Previously showed a blocking alert — now the offline call flow handles this via
      // call:ringing_offline. This event is kept for backward compat but should not block.
      // Just silently stop the tone; ringing_offline UI is already shown.
      stopCallingTone();
    };

    // ── Offline push call events ──────────────────────────────────────────────
    const onRingingOffline = ({ roomId, to, message }) => {
      // Caller: user is offline, we sent a push notification (or pending stored) — show ringing UI
      setOfflineRinging({ roomId, to });
      setCallStatus('ringing_offline');
      setStatusMessage(message || 'جارٍ الاتصال... المستخدم خارج التطبيق');
    };

    const onExpired = () => {
      // Call timed out (no answer from push within 60s)
      stopRingtone();
      cleanup();
    };

    const onAcceptedOk = ({ callerSocketId }) => {
      // Push callee accepted — we're now connected as the callee
      // (caller will receive call:answered via socket, this is for the callee side)
    };

    // Callee opened the app while we were waiting (push sent, callee connected)
    const onCalleeConnected = () => {
      setStatusMessage('جارٍ الاتصال...');
    };

    // 60-second timeout expired — callee never answered
    const onNoAnswer = () => {
      stopCallingTone();
      cleanup();
      setCallStatus('no_answer');
      setStatusMessage('لا يوجد رد');
      setTimeout(() => setCallStatus(null), 3000);
    };

    // call:cancelled — caller hung up before callee answered (stop ringing)
    const onCancelled = () => {
      console.log('[CallManager] Call was cancelled by caller');
      stopRingtone();
      setIncoming(null);
    };

    socket.on('call:incoming',          onIncoming);
    socket.on('call:offer',             onOffer);
    socket.on('call:ice',               onICE);
    socket.on('call:rejected',          onRejected);
    socket.on('call:ended',             onEnded);
    socket.on('call:cancelled',         onCancelled);
    socket.on('call:user_unavailable',  onUnavailable);
    socket.on('call:ringing_offline',   onRingingOffline);
    socket.on('call:expired',           onExpired);
    socket.on('call:accepted_ok',       onAcceptedOk);
    socket.on('call:callee_connected',  onCalleeConnected);
    socket.on('call:no_answer',         onNoAnswer);

    // ── Service Worker message: incoming call from push notification ──────
    const onSWMessage = async (event) => {
      if (!event.data) return;
      const { type, callerId, callerName, callerSocketId: swCallerSocketId, offer, roomId } = event.data;
      if (type === 'incoming_call_push' && offer && roomId) {
        console.log('[CALL] SW message incoming_call_push — callerId:', callerId, '| callerSocketId:', swCallerSocketId, '| roomId:', roomId);
        // Show incoming call UI (push-based)
        setPushIncoming({ callerId, callerName, callerSocketId: swCallerSocketId, offer, roomId });
        startRingtone();
      }
    };

    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', onSWMessage);
    }

    return () => {
      socket.off('call:incoming',          onIncoming);
      socket.off('call:offer',             onOffer);
      socket.off('call:ice',               onICE);
      socket.off('call:rejected',          onRejected);
      socket.off('call:ended',             onEnded);
      socket.off('call:cancelled',         onCancelled);
      socket.off('call:user_unavailable',  onUnavailable);
      socket.off('call:ringing_offline',   onRingingOffline);
      socket.off('call:expired',           onExpired);
      socket.off('call:accepted_ok',       onAcceptedOk);
      socket.off('call:callee_connected',  onCalleeConnected);
      socket.off('call:no_answer',         onNoAnswer);
      socket.off('reconnect',              onReconnect);
      socket.off('connect',               onReconnect);
      if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
        navigator.serviceWorker.removeEventListener('message', onSWMessage);
      }
    };
  }, [socket]); // Only [socket] dep: listeners are re-registered only when socket changes (prevents duplicate listeners)

  // Call duration timer
  useEffect(() => {
    if (!active) return;
    const t = setInterval(() => setDuration(Math.floor((Date.now() - active.startTime) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active]);

  function hangup() {
    if (active?.remoteSocketId) socket.emit('call:end', { otherSocketId: active.remoteSocketId });
    // Also cancel any pending offline ring
    if (offlineRinging?.roomId) {
      socket.emit('call:reject_from_push', { roomId: offlineRinging.roomId });
    }
    stopRingtone();
    cleanup();
  }

  // Accept an incoming push call (callee side — push notification brought us here)
  // Fix #82: ensure socket is connected before emitting call:accept_from_push
  async function acceptPushCall() {
    if (!pushIncoming) return;
    const { callerId, callerName, offer, roomId } = pushIncoming;
    console.log('[CALL] acceptPushCall() started — roomId:', roomId, '| callerId:', callerId, '| socket connected:', socket?.connected);
    stopRingtone();
    setPushIncoming(null);
    try {
      console.log('[CALL] acceptPushCall — requesting microphone...');
      const stream = await getAudio().catch(err => {
        if (err.name === 'NotAllowedError') alert('يرجى السماح بالوصول للميكروفون');
        return null;
      });
      if (!stream) { console.error('[CALL] acceptPushCall — failed to get audio stream'); return; }
      console.log('[CALL] acceptPushCall — got microphone ✓ tracks:', stream.getTracks().length);

      const p = createPC(null);  // remote socket ID unknown yet — will learn via call:accepted_ok
      stream.getTracks().forEach(t => {
        p.addTrack(t, stream);
        console.log('[CALL] acceptPushCall — added local track:', t.kind, '| enabled:', t.enabled);
      });

      console.log('[CALL] acceptPushCall — setting remote description (offer)...');
      await p.setRemoteDescription(new RTCSessionDescription(offer));
      console.log('[CALL] acceptPushCall — remote desc set ✓ ICE:', p.iceConnectionState, '| connection:', p.connectionState);

      // Flush ICE candidates that arrived before remote description was set
      if (receivedICE.current.length > 0) {
        console.log('[CALL] acceptPushCall — flushing', receivedICE.current.length, 'pre-buffered remote ICE candidates');
        for (const c of receivedICE.current) {
          await p.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('[CALL] addIceCandidate error:', e.message));
        }
        receivedICE.current = [];
      }

      console.log('[CALL] acceptPushCall — creating answer...');
      const answer = await p.createAnswer();
      await p.setLocalDescription(answer);
      // Apply bitrate cap via sender API (8kbps min for intelligible voice)
      await applyBitrateCap(p, 8000);
      console.log('[CALL] acceptPushCall — answer created ✓ SDP audio:', answer.sdp.includes('m=audio'), '| bitrateCap applied ✓');

      // Fix #82: wait for socket to be connected before emitting call:accept_from_push
      const emitAccept = () => {
        console.log('[CALL] acceptPushCall — emitting call:accept_from_push — roomId:', roomId, '| socket:', socket.id);
        socket.emit('call:accept_from_push', { roomId, answer: p.localDescription });
      };

      if (socket.connected) {
        emitAccept();
      } else {
        console.log('[CALL] acceptPushCall — socket not connected yet, waiting for connect event...');
        socket.once('connect', () => {
          console.log('[CALL] acceptPushCall — socket connected ✓ socket.id:', socket.id);
          emitAccept();
        });
        socket.connect();
      }

      // Wait for call:accepted_ok to know callerSocketId
      socket.once('call:accepted_ok', ({ callerSocketId }) => {
        console.log('[CALL] acceptPushCall — call:accepted_ok received — callerSocketId:', callerSocketId);
        // Update ICE candidate target to caller's socket
        if (p) {
          p.onicecandidate = e => {
            if (e.candidate && socket) {
              console.log('[CALL] acceptPushCall — sending ICE to caller:', callerSocketId);
              socket.emit('call:ice', { targetSocketId: callerSocketId, candidate: e.candidate });
            }
          };
        }
        // Fix #82: flush all buffered ICE candidates to caller using flushPendingICE
        const buffered = pendingICE.current.length;
        if (buffered > 0) {
          console.log('[CALL] acceptPushCall — flushing', buffered, 'buffered local ICE candidates to caller:', callerSocketId);
        }
        flushPendingICE(callerSocketId);
        console.log('[CALL] acceptPushCall — call active ✓ peer:', callerName, '| callerSocketId:', callerSocketId);
        setActive({ peerName: callerName || 'مستخدم', remoteSocketId: callerSocketId, startTime: Date.now() });
      });
    } catch (e) {
      console.error('[CALL] acceptPushCall error:', e.message, e.stack);
      cleanup();
    }
  }

  function rejectPushCall() {
    if (!pushIncoming) return;
    socket.emit('call:reject_from_push', { roomId: pushIncoming.roomId });
    stopRingtone();
    setPushIncoming(null);
  }

  async function acceptCall() {
    const { callerSocketId, callerName } = incoming;
    // Guard: callerSocketId is null when pre-set by autoAnswer URL param
    // — wait for socket to replay call:incoming with the real callerSocketId
    if (!callerSocketId) {
      console.warn('[CALL] acceptCall() called but callerSocketId is null — waiting for call:incoming socket event');
      return;
    }
    stopRingtone();
    setIncoming(null);
    console.log('[CALL] acceptCall() — emitting call:answered_ready to:', callerSocketId);
    // Signal caller that we're ready to receive the offer
    socket.emit('call:answered_ready', { callerSocketId });
    // Set active immediately to show the active call overlay
    setActive({ peerName: callerName, remoteSocketId: callerSocketId, startTime: Date.now() });
  }

  function rejectCall() {
    if (incoming?.callerSocketId) socket.emit('call:reject', { callerSocketId: incoming.callerSocketId });
    stopRingtone();
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
      {/* ─── Fix C: audio element ALWAYS in DOM — never conditional ─────────── */}
      <audio
        ref={remoteAudio}
        id="xtox-remote-audio"
        autoPlay
        playsInline
        controls={false}
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

      {/* ── Push incoming call (callee opened app via notification) ── */}
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

      {/* ── Offline ringing UI (caller waiting for offline user to accept push) ── */}
      {offlineRinging && !active && !incoming && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8, animation: 'pulse 1.5s infinite' }}>📞</div>
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
