'use client';
import { useState, useEffect, useRef, forwardRef, useImperativeHandle, useCallback } from 'react';

const BACKEND = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

// ─── ICE Configuration (static fallback — merged with dynamic fetch below) ──
const ICE_CONFIG_STATIC = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
    { urls: 'turn:relay.expressturn.com:3478',             username: 'efUN55DZL6OFIRBQXI', credential: 'UfBApCBfMQiOunPs' },
    { urls: 'turn:relay.expressturn.com:3478?transport=tcp', username: 'efUN55DZL6OFIRBQXI', credential: 'UfBApCBfMQiOunPs' },
    { urls: 'turn:openrelay.metered.ca:80',                username: 'openrelayproject',   credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443',               username: 'openrelayproject',   credential: 'openrelayproject' },
  ],
};

// ─── Web Audio API calling tone ─────────────────────────────────────────────
// Candidate 2 fix: track _callingOsc so we can stop it immediately in stopCallingTone()
let _callingCtx = null, _callingOsc = null, _callingTimer = null, _callingActive = false;
function playCallingTone() {
  if (_callingActive) return;
  _callingActive = true;
  const beep = () => {
    if (!_callingActive) return;
    try {
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      _callingCtx = ctx;
      const osc = ctx.createOscillator(), gain = ctx.createGain();
      _callingOsc = osc;
      osc.connect(gain); gain.connect(ctx.destination);
      osc.frequency.setValueAtTime(440, ctx.currentTime);
      osc.frequency.setValueAtTime(480, ctx.currentTime + 0.5);
      gain.gain.setValueAtTime(0.25, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 1.0);
      osc.start(ctx.currentTime); osc.stop(ctx.currentTime + 1.0);
      osc.onended = () => { _callingOsc = null; try { ctx.close(); } catch {} };
    } catch {}
    _callingTimer = setTimeout(beep, 3000);
  };
  beep();
}
function stopCallingTone() {
  _callingActive = false;
  clearTimeout(_callingTimer); _callingTimer = null;
  // Candidate 2 fix: stop the oscillator explicitly before closing context
  if (_callingOsc) {
    try { _callingOsc.stop(); } catch(e) {}
    _callingOsc = null;
  }
  if (_callingCtx) {
    if (_callingCtx.state !== 'closed') {
      try { _callingCtx.close(); } catch(e) {}
    }
    _callingCtx = null;
  }
}

// ─── IndexedDB call event logger ─────────────────────────────────────────────
async function logCallEvent(type, data) {
  try {
    const db = await new Promise((resolve, reject) => {
      const req = indexedDB.open('xtox-calls', 1);
      req.onupgradeneeded = e => e.target.result.createObjectStore('events', { keyPath: 'id', autoIncrement: true });
      req.onsuccess = e => resolve(e.target.result);
      req.onerror = reject;
    });
    db.transaction('events', 'readwrite').objectStore('events').add({ type, ts: Date.now(), ...(data || {}) });
  } catch {}
}

const CallManager = forwardRef(function CallManager({ socket, currentUser }, ref) {
  // ── State ─────────────────────────────────────────────────────────────────
  const [incoming, setIncoming]         = useState(null);
  const [active, setActive]             = useState(null);
  const [duration, setDuration]         = useState(0);
  const [muted, setMuted]               = useState(false);
  const [pushIncoming, setPushIncoming] = useState(null);
  const [offlineRinging, setOfflineRinging] = useState(null);
  const [callStatus, setCallStatus]     = useState(null);
  const [statusMessage, setStatusMessage] = useState('');
  const [pushSent, setPushSent]         = useState(false);
  const [iceConfig, setIceConfig]       = useState(ICE_CONFIG_STATIC);

  // ── Refs ──────────────────────────────────────────────────────────────────
  const remoteAudio      = useRef(null);
  const pcRef            = useRef(null);
  const localStream      = useRef(null);
  const pendingOffer     = useRef(null);   // { offer, callerSocketId, callerName }
  const bufferedICE      = useRef([]);     // remote ICE candidates buffered until remoteDesc set
  const ringtoneRef      = useRef(null);
  const noAnswerTimer    = useRef(null);
  const currentUserRef   = useRef(currentUser);
  const iceConfigRef     = useRef(ICE_CONFIG_STATIC);
  const socketRef        = useRef(socket);
  // FIX-DUP: dedup guard — tracks last seen callerSocketId to prevent processing
  // the same call:incoming event twice (defense in depth against server-side replay bug)
  const lastIncomingKey  = useRef(null);
  useEffect(() => { currentUserRef.current = currentUser; }, [currentUser]);
  useEffect(() => { socketRef.current = socket; }, [socket]);

  // ── Fetch ICE credentials from backend on mount ───────────────────────────
  useEffect(() => {
    fetch(`${BACKEND}/api/ice/credentials`)
      .then(r => r.json())
      .then(data => {
        if (data && Array.isArray(data.iceServers)) {
          // Merge: API servers first, then static fallback TURN servers
          const merged = { iceServers: [...data.iceServers, ...ICE_CONFIG_STATIC.iceServers] };
          setIceConfig(merged);
          iceConfigRef.current = merged;
          console.log('[CALL] step ICE-fetch: loaded', data.iceServers.length, 'servers from API');
        }
      })
      .catch(() => {
        console.warn('[CALL] ICE fetch failed — using static config');
      });
  }, []);

  const fmt = s => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;

  // ── Ringtone ──────────────────────────────────────────────────────────────
  const startRingtone = useCallback(() => {
    try {
      if (ringtoneRef.current) return;
      const audio = new Audio('/sounds/ringtone.wav');
      audio.loop = true; audio.volume = 0.8;
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

  // ── cleanup ────────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearTimeout(noAnswerTimer.current);
    noAnswerTimer.current = null;
    bufferedICE.current = [];
    pendingOffer.current = null;
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    if (localStream.current) {
      localStream.current.getTracks().forEach(t => t.stop());
      localStream.current = null;
    }
    stopRingtone();
    stopCallingTone();
    setActive(null);
    setIncoming(null);
    setPushIncoming(null);
    setOfflineRinging(null);
    setDuration(0);
    setMuted(false);
    setPushSent(false);
  }, [stopRingtone]);

  // ── createPC — create RTCPeerConnection ────────────────────────────────────
  function createPC(targetSocketId) {
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    console.log('[CALL] step createPC: using ICE config with', iceConfigRef.current.iceServers.length, 'servers');
    const pc = new RTCPeerConnection(iceConfigRef.current);
    pcRef.current = pc;

    // Remote audio playback
    pc.ontrack = e => {
      console.log('[CALL] step ontrack:', e.track.kind, 'streams:', e.streams.length);
      if (remoteAudio.current && e.streams[0]) {
        remoteAudio.current.srcObject = e.streams[0];
        remoteAudio.current.play().catch(err => {
          console.warn('[CALL] play() blocked:', err.message);
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

    // ICE candidate handler — sends to targetSocketId if known, else buffers
    pc.onicecandidate = e => {
      if (!e.candidate) return;
      const sock = socketRef.current;
      if (sock && targetSocketId) {
        console.log('[CALL] step ICE-send: candidate to', targetSocketId);
        sock.emit('call:ice', { targetSocketId, candidate: e.candidate });
      }
      // else: candidate after cleanup — ignore
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[CALL] step ICE-state:', pc.iceConnectionState);
      if (pc.iceConnectionState === 'failed') {
        console.warn('[CALL] ICE failed — attempting restart');
        pc.restartIce?.();
      }
      if (['failed', 'closed'].includes(pc.iceConnectionState)) cleanup();
    };

    pc.onconnectionstatechange = () => {
      console.log('[CALL] step connection-state:', pc.connectionState);
    };

    return pc;
  }

  // ── flushBufferedICE — add buffered remote ICE after remoteDesc is set ─────
  async function flushBufferedICE() {
    const pc = pcRef.current;
    if (!pc || !bufferedICE.current.length) return;
    console.log('[CALL] step flush-ICE:', bufferedICE.current.length, 'buffered candidates');
    for (const c of bufferedICE.current) {
      await pc.addIceCandidate(new RTCIceCandidate(c)).catch(e => console.warn('[CALL] addIceCandidate:', e.message));
    }
    bufferedICE.current = [];
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALLER SIDE: initiateCall
  // ─────────────────────────────────────────────────────────────────────────
  useImperativeHandle(ref, () => ({
    async initiateCall(calleeId, calleeName) {
      if (active || incoming || pushIncoming) {
        console.warn('[CALL] initiateCall blocked: another call in progress');
        return;
      }
      if (!socket || !socket.connected) {
        alert('جارٍ الاتصال بالخادم... حاول مرة أخرى بعد ثانية');
        return;
      }

      // ── Candidate 1+4 FIX: Define handlers FIRST and register call:accepted
      // SYNCHRONOUSLY before any async operation. This prevents a race where the
      // callee answers while we are awaiting getUserMedia / createOffer /
      // setLocalDescription, causing the event to arrive before the listener
      // is registered and the call never transitioning to "connected".
      // ─────────────────────────────────────────────────────────────────────
      const calleeSocketIdRef = { current: null };
      const localICEBuffer = [];
      let _callAccepted = false; // prevents no-answer timer from firing after accept

      // onPushSent must be declared before onCallAccepted (referenced inside it)
      const onPushSent = () => { setPushSent(true); };

      // ── call:accepted handler ─────────────────────────────────────────────
      const onCallAccepted = async ({ answer, calleeSocketId }) => {
        _callAccepted = true;

        // Candidate 3 FIX: stopCallingTone() FIRST — before ANY guard or async op.
        // If this handler is reached for any reason, the tone MUST stop immediately.
        stopCallingTone();                          // 1. stop tone
        clearTimeout(noAnswerTimer.current);        // 2. kill no-answer timer
        noAnswerTimer.current = null;
        setOfflineRinging(null);                    // 3. dismiss calling overlay
        setStatusMessage('');
        setPushSent(false);
        socket.off('call:push_sent', onPushSent);
        // Candidate 4 FIX: defensive off (socket.once already removed it, but be safe)
        socket.off('call:accepted', onCallAccepted);

        // Candidate 6 FIX: log receipt + validate SDP before any WebRTC ops
        console.log('[CALL] call:accepted received — answer.type:', answer?.type, '| calleeSocketId:', calleeSocketId);
        if (!answer?.type || !answer?.sdp) {
          console.error('[CALL] call:accepted — invalid answer SDP:', answer);
          cleanup();
          return;
        }

        // Guard: PC may have been closed (ICE failure, or user cancelled before event arrived)
        // NOTE: tone already stopped above, so the overlay is already clear
        if (!pcRef.current || pcRef.current.signalingState === 'closed') {
          console.warn('[CALL] call:accepted — PC already closed (tone stopped above)');
          return;
        }

        // Step 9: setRemoteDescription
        console.log('[CALL] step 9: setRemoteDescription (answer)');
        try {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription({ type: answer.type, sdp: answer.sdp }));
          console.log('[CALL] step 9 OK: remoteDescription set');
        } catch (e) {
          console.error('[CALL] step 9 FAIL: setRemoteDescription error:', e.message);
          cleanup();
          return;
        }

        // Step 10: flush buffered remote ICE
        await flushBufferedICE();

        // Step 11: calleeSocketId now known — flush buffered local ICE to callee
        calleeSocketIdRef.current = calleeSocketId;
        console.log('[CALL] step 11: flushing', localICEBuffer.length, 'buffered local ICE to callee:', calleeSocketId);
        for (const c of localICEBuffer) {
          socket.emit('call:ice', { targetSocketId: calleeSocketId, candidate: c });
        }
        localICEBuffer.length = 0;

        logCallEvent('call_connected', { peerId: calleeId, side: 'caller' });
        // Step 12: transition UI to active call (Candidate 3: Step 5)
        setActive({ peerName: calleeName, remoteSocketId: calleeSocketId, startTime: Date.now() });
      };

      // Candidate 4 FIX: remove any stale listener (e.g. from a previous failed call)
      socket.off('call:accepted', onCallAccepted);
      // Candidate 1 FIX: register SYNCHRONOUSLY — BEFORE the first await below
      socket.once('call:accepted', onCallAccepted);

      // ── ASYNC SECTION ────────────────────────────────────────────────────

      // Step 1: getUserMedia — SIMPLE constraints only
      console.log('[CALL] step 1: getUserMedia');
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
        localStream.current = stream;
        console.log('[CALL] step 1 OK: got audio stream, tracks:', stream.getAudioTracks().length);
      } catch (e) {
        console.error('[CALL] step 1 FAIL: getUserMedia error:', e.name, e.message);
        socket.off('call:accepted', onCallAccepted); // clean up listener on error
        if (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError') {
          alert('يرجى السماح بالوصول للميكروفون لإجراء المكالمات');
        } else if (e.name === 'NotFoundError') {
          alert('لم يتم العثور على مايكروفون في جهازك');
        } else {
          alert('خطأ في الميكروفون: ' + e.message);
        }
        return;
      }

      // Step 2: createPC (targetSocketId unknown yet — ICE will be sent after calleeSocketId known)
      console.log('[CALL] step 2: createPC');
      if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
      const pc = new RTCPeerConnection(iceConfigRef.current);
      pcRef.current = pc;

      // Remote audio playback
      pc.ontrack = e => {
        console.log('[CALL] step ontrack-caller:', e.track.kind);
        if (remoteAudio.current && e.streams[0]) {
          remoteAudio.current.srcObject = e.streams[0];
          remoteAudio.current.play().catch(err => {
            console.warn('[CALL] caller play() blocked:', err.message);
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

      // Buffer ICE until calleeSocketId is known (resolved in call:accepted handler)
      pc.onicecandidate = e => {
        if (!e.candidate) return;
        if (calleeSocketIdRef.current) {
          console.log('[CALL] step ICE-caller-send: candidate to callee', calleeSocketIdRef.current);
          socket.emit('call:ice', { targetSocketId: calleeSocketIdRef.current, candidate: e.candidate });
        } else {
          localICEBuffer.push(e.candidate);
          console.log('[CALL] step ICE-caller-buffer: total', localICEBuffer.length);
        }
      };

      pc.oniceconnectionstatechange = () => {
        console.log('[CALL] step ICE-caller-state:', pc.iceConnectionState);
        if (pc.iceConnectionState === 'failed') pc.restartIce?.();
        if (['failed', 'closed'].includes(pc.iceConnectionState)) cleanup();
      };

      pc.onconnectionstatechange = () => {
        console.log('[CALL] step conn-caller-state:', pc.connectionState);
      };

      // Step 3: addTrack BEFORE createOffer
      console.log('[CALL] step 3: addTrack');
      stream.getTracks().forEach(t => {
        pc.addTrack(t, stream);
        console.log('[CALL] step 3 addTrack:', t.kind);
      });

      // Step 4: createOffer
      console.log('[CALL] step 4: createOffer');
      let offer;
      try {
        offer = await pc.createOffer({ offerToReceiveAudio: true, offerToReceiveVideo: false });
        console.log('[CALL] step 4 OK: offer type=', offer.type, 'sdp length=', offer.sdp.length);
      } catch (e) {
        console.error('[CALL] step 4 FAIL: createOffer error:', e.message);
        socket.off('call:accepted', onCallAccepted);
        cleanup();
        return;
      }

      // Step 5: setLocalDescription
      console.log('[CALL] step 5: setLocalDescription');
      await pc.setLocalDescription(offer);
      console.log('[CALL] step 5 OK: localDescription.type=', pc.localDescription.type);

      // Step 6: emit call:initiate with serialized offer (plain object — NOT RTCSessionDescription)
      const callerName   = currentUserRef.current?.name || currentUserRef.current?.username || 'مستخدم';
      const callerAvatar = currentUserRef.current?.avatar || '';
      const plainOffer   = { type: pc.localDescription.type, sdp: pc.localDescription.sdp };

      console.log('[CALL] step 6: emit call:initiate → calleeId=', calleeId);
      socket.emit('call:initiate', {
        calleeId,
        callerName,
        callerAvatar,
        offer: plainOffer,
      });

      // Step 7: show outgoing call UI + start tone
      setOfflineRinging({ calleeId, calleeName });
      setStatusMessage('جارٍ الاتصال...');
      playCallingTone();
      logCallEvent('outgoing_start', { peerId: calleeId, peerName: calleeName });

      // Register push_sent listener
      socket.once('call:push_sent', onPushSent);

      // 50-second no-answer timeout
      // Guard with _callAccepted flag: if call:accepted fires before timer setup
      // (extremely rare but theoretically possible), the timer won't destroy an active call
      noAnswerTimer.current = setTimeout(() => {
        if (_callAccepted) return; // already accepted — do nothing
        socket.off('call:accepted', onCallAccepted);
        socket.off('call:push_sent', onPushSent);
        socket.emit('call:cancel', { targetUserId: calleeId });
        stopCallingTone();
        setOfflineRinging(null);
        setPushSent(false);
        setCallStatus('no_answer');
        setStatusMessage('لا يوجد رد');
        setTimeout(() => { setCallStatus(null); setStatusMessage(''); }, 3000);
        cleanup();
      }, 50000);
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

    // Join personal room on connect/reconnect
    const joinRooms = () => {
      const uid = (currentUserRef.current?._id || currentUserRef.current?.id) || '';
      if (uid) {
        socket.emit('join_user_room', { userId: uid });
        socket.emit('join', uid);
        console.log('[CALL] Joined user room:', uid);
      }
    };
    joinRooms();
    socket.on('connect', joinRooms);
    socket.on('reconnect', joinRooms);

    // ── CALLEE: call:incoming ──────────────────────────────────────────────
    const onIncoming = ({ offer, callerSocketId, callerName, callerAvatar, callerId }) => {
      console.log('[CALL] step INCOMING: callerSocketId=', callerSocketId, 'caller=', callerName, 'offer type=', offer?.type);

      // FIX-DUP: deduplicate — if we already set up for this exact callerSocketId
      // within the last 5 seconds, ignore the duplicate event.
      // Root cause: server-side JWT pre-join + manual 'join' event double-delivers
      // call:incoming when callee is online. This guard is defense-in-depth.
      const dedupKey = callerSocketId + '_' + (callerId || '');
      if (lastIncomingKey.current === dedupKey) {
        console.warn('[CALL] call:incoming DUPLICATE suppressed — key:', dedupKey);
        return;
      }
      lastIncomingKey.current = dedupKey;
      setTimeout(() => {
        if (lastIncomingKey.current === dedupKey) lastIncomingKey.current = null;
      }, 5000);

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

    // ── ICE relay (both sides) ─────────────────────────────────────────────
    const onICE = async ({ candidate }) => {
      if (!candidate) return;
      const pc = pcRef.current;
      if (!pc) {
        bufferedICE.current.push(candidate);
        console.log('[CALL] step ICE-buffer (no PC yet):', bufferedICE.current.length);
        return;
      }
      if (pc.remoteDescription && pc.remoteDescription.type) {
        await pc.addIceCandidate(new RTCIceCandidate(candidate))
          .catch(e => console.warn('[CALL] addIceCandidate:', e.message));
        console.log('[CALL] step ICE-added to PC');
      } else {
        bufferedICE.current.push(candidate);
        console.log('[CALL] step ICE-buffer (no remoteDesc):', bufferedICE.current.length);
      }
    };

    const onRejected = () => {
      console.log('[CALL] call:rejected');
      stopCallingTone();
      setOfflineRinging(null);
      setPushSent(false);
      setCallStatus('rejected');
      setStatusMessage('رُفضت المكالمة');
      setTimeout(() => { setCallStatus(null); setStatusMessage(''); }, 3000);
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
      setPushSent(false);
      setCallStatus('no_answer');
      setStatusMessage('لا يوجد رد');
      setTimeout(() => { setCallStatus(null); setStatusMessage(''); }, 3000);
      cleanup();
    };

    const onExpired = () => { stopRingtone(); cleanup(); };
    const onCalleeConnected = () => { setStatusMessage('جارٍ الاتصال...'); };

    // SW postMessage: incoming call via push notification
    const onSWMessage = event => {
      if (!event.data) return;
      const { type, callerId, callerName, callerSocketId, offer, roomId } = event.data;
      if (type === 'incoming_call_push' && offer && roomId) {
        console.log('[CALL] step SW-push: callerId=', callerId, 'callerSocketId=', callerSocketId);
        setPushIncoming({ callerId, callerName, callerSocketId, offer, roomId });
        startRingtone();
      }
    };

    socket.on('call:incoming',         onIncoming);
    socket.on('call:ice',              onICE);
    socket.on('call:rejected',         onRejected);
    socket.on('call:ended',            onEnded);
    socket.on('call:cancelled',        onCancelled);
    socket.on('call:no_answer',        onNoAnswer);
    socket.on('call:expired',          onExpired);
    socket.on('call:callee_connected', onCalleeConnected);

    if (typeof navigator !== 'undefined' && navigator.serviceWorker) {
      navigator.serviceWorker.addEventListener('message', onSWMessage);
    }

    return () => {
      socket.off('connect',             joinRooms);
      socket.off('reconnect',           joinRooms);
      socket.off('call:incoming',       onIncoming);
      socket.off('call:ice',            onICE);
      socket.off('call:rejected',       onRejected);
      socket.off('call:ended',          onEnded);
      socket.off('call:cancelled',      onCancelled);
      socket.off('call:no_answer',      onNoAnswer);
      socket.off('call:expired',        onExpired);
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
    if (!pending) { console.error('[CALL] acceptCall: no pending offer!'); return; }
    const { offer, callerSocketId, callerName } = pending;
    if (!callerSocketId) { console.warn('[CALL] acceptCall: callerSocketId missing'); return; }

    stopRingtone();
    setIncoming(null);
    pendingOffer.current = null;

    // Step 1 (callee): getUserMedia — SIMPLE constraints
    console.log('[CALL] callee step 1: getUserMedia');
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
      console.log('[CALL] callee step 1 OK: got audio stream');
    } catch (e) {
      console.error('[CALL] callee step 1 FAIL:', e.name, e.message);
      alert('خطأ في الميكروفون: ' + e.message);
      return;
    }

    // Step 2 (callee): createPC with callerSocketId known from the start
    console.log('[CALL] callee step 2: createPC (callerSocketId=', callerSocketId, ')');
    const pc = createPC(callerSocketId);

    // Step 3 (callee): setRemoteDescription FIRST (then addTrack, then createAnswer)
    console.log('[CALL] callee step 3: setRemoteDescription (offer)');
    if (!offer || !offer.type || !offer.sdp) {
      console.error('[CALL] callee step 3 FAIL: invalid offer:', offer);
      cleanup();
      return;
    }
    try {
      await pc.setRemoteDescription(new RTCSessionDescription({ type: offer.type, sdp: offer.sdp }));
      console.log('[CALL] callee step 3 OK: remoteDescription set, type=', pc.remoteDescription.type);
    } catch (e) {
      console.error('[CALL] callee step 3 FAIL: setRemoteDescription error:', e.message);
      cleanup();
      return;
    }

    // Flush remote ICE that arrived before this setRemoteDescription
    await flushBufferedICE();

    // Step 4 (callee): addTrack AFTER setRemoteDescription
    console.log('[CALL] callee step 4: addTrack');
    stream.getTracks().forEach(t => {
      pc.addTrack(t, stream);
      console.log('[CALL] callee step 4 addTrack:', t.kind);
    });

    // Step 5 (callee): createAnswer
    console.log('[CALL] callee step 5: createAnswer');
    let answer;
    try {
      answer = await pc.createAnswer();
      console.log('[CALL] callee step 5 OK: answer type=', answer.type, 'sdp length=', answer.sdp.length);
    } catch (e) {
      console.error('[CALL] callee step 5 FAIL: createAnswer error:', e.message);
      cleanup();
      return;
    }

    // Step 6 (callee): setLocalDescription
    console.log('[CALL] callee step 6: setLocalDescription (answer)');
    await pc.setLocalDescription(answer);
    console.log('[CALL] callee step 6 OK: localDescription.type=', pc.localDescription.type);

    // Step 7 (callee): emit call:answer (plain object — NOT RTCSessionDescription)
    console.log('[CALL] callee step 7: emit call:answer → callerSocketId=', callerSocketId);
    socket.emit('call:answer', {
      callerSocketId,
      answer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
    });

    logCallEvent('incoming_accept', { peerId: callerSocketId, peerName: callerName, side: 'callee' });
    setActive({ peerName: callerName, remoteSocketId: callerSocketId, startTime: Date.now() });
  }

  function rejectCall() {
    if (incoming?.callerSocketId) socket?.emit('call:reject', { callerSocketId: incoming.callerSocketId });
    pendingOffer.current = null;
    stopRingtone();
    setIncoming(null);
  }

  // ─────────────────────────────────────────────────────────────────────────
  // CALLEE SIDE: acceptPushCall (push notification incoming)
  // ─────────────────────────────────────────────────────────────────────────
  async function acceptPushCall() {
    if (!pushIncoming) return;
    const { callerId, callerName, callerSocketId: swCallerSocketId, offer, roomId } = pushIncoming;
    console.log('[CALL] acceptPushCall: roomId=', roomId, 'callerId=', callerId);
    stopRingtone();
    setPushIncoming(null);

    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: false });
      localStream.current = stream;
    } catch (e) {
      console.error('[CALL] acceptPushCall getUserMedia failed:', e.message);
      alert('خطأ في الميكروفون: ' + e.message);
      return;
    }

    // Bug 4 fix: buffer ICE candidates locally until callerSocketId is known from call:accepted_ok
    const localICEBuffer = [];

    // Create PC manually (not via createPC) so we can buffer ICE
    if (pcRef.current) { pcRef.current.close(); pcRef.current = null; }
    const pc = new RTCPeerConnection(iceConfigRef.current);
    pcRef.current = pc;

    pc.ontrack = e => {
      console.log('[CALL] acceptPushCall ontrack:', e.track.kind);
      if (remoteAudio.current && e.streams[0]) {
        remoteAudio.current.srcObject = e.streams[0];
        remoteAudio.current.play().catch(err => {
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

    // Buffer all ICE candidates until callerSocketId arrives in call:accepted_ok
    pc.onicecandidate = e => {
      if (!e.candidate) return;
      localICEBuffer.push(e.candidate);
      console.log('[CALL] acceptPushCall: ICE buffered, total:', localICEBuffer.length);
    };

    pc.oniceconnectionstatechange = () => {
      console.log('[CALL] acceptPushCall ICE state:', pc.iceConnectionState);
      if (['failed', 'closed'].includes(pc.iceConnectionState)) cleanup();
    };

    pc.onconnectionstatechange = () => {
      console.log('[CALL] acceptPushCall conn state:', pc.connectionState);
    };

    if (!offer || !offer.type || !offer.sdp) {
      console.error('[CALL] acceptPushCall: invalid offer:', offer);
      cleanup();
      return;
    }
    await pc.setRemoteDescription(new RTCSessionDescription({ type: offer.type, sdp: offer.sdp }));
    await flushBufferedICE();

    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    const answer = await pc.createAnswer();
    await pc.setLocalDescription(answer);

    const emitAccept = () => {
      console.log('[CALL] acceptPushCall: emit call:accept_from_push → roomId=', roomId);
      socket.emit('call:accept_from_push', {
        roomId,
        answer: { type: pc.localDescription.type, sdp: pc.localDescription.sdp },
      });
    };
    if (socket.connected) emitAccept();
    else { socket.once('connect', emitAccept); socket.connect(); }

    socket.once('call:accepted_ok', ({ callerSocketId }) => {
      console.log('[CALL] acceptPushCall call:accepted_ok — callerSocketId:', callerSocketId);
      // Now callerSocketId is known — update onicecandidate to send future candidates
      if (pcRef.current) {
        pcRef.current.onicecandidate = e => {
          if (e.candidate && socket) {
            console.log('[CALL] acceptPushCall: ICE sent to callerSocketId:', callerSocketId);
            socket.emit('call:ice', { targetSocketId: callerSocketId, candidate: e.candidate });
          }
        };
      }
      // Flush all ICE candidates that were buffered before callerSocketId was known
      console.log('[CALL] acceptPushCall: flushing', localICEBuffer.length, 'buffered ICE to callerSocketId:', callerSocketId);
      for (const c of localICEBuffer) {
        socket.emit('call:ice', { targetSocketId: callerSocketId, candidate: c });
      }
      localICEBuffer.length = 0;
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
    if (active) logCallEvent('call_end', { peerId: active.remoteSocketId, duration: Math.floor((Date.now() - (active.startTime || 0)) / 1000) });
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

  const overlay = {
    position: 'fixed', bottom: 80, left: '50%', transform: 'translateX(-50%)',
    background: 'linear-gradient(135deg, #1a1a2e, #16213e)', color: '#fff',
    borderRadius: 20, padding: '20px 28px', zIndex: 9999,
    boxShadow: '0 12px 40px rgba(0,0,0,0.5)', textAlign: 'center', minWidth: 280, direction: 'rtl',
  };

  return (
    <>
      <audio ref={remoteAudio} id="xtox-remote-audio" autoPlay playsInline style={{ display: 'none' }} />

      {/* Incoming call (socket-based) */}
      {incoming && !active && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{incoming.callerName || 'مستخدم'}</div>
          <div style={{ fontSize: 13, color: '#aaa', margin: '6px 0 18px' }}>مكالمة صوتية واردة</div>
          <div style={{ display: 'flex', gap: 20, justifyContent: 'center' }}>
            <div style={{ textAlign: 'center' }}>
              <button onClick={rejectCall} style={{ background: '#e74c3c', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 22, cursor: 'pointer', color: 'white' }}>📵</button>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>رفض</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={acceptCall} style={{ background: '#25d366', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 22, cursor: 'pointer', color: 'white' }}>📞</button>
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
              <button onClick={rejectPushCall} style={{ background: '#e74c3c', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 22, cursor: 'pointer', color: 'white' }}>📵</button>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>رفض</div>
            </div>
            <div style={{ textAlign: 'center' }}>
              <button onClick={acceptPushCall} style={{ background: '#25d366', border: 'none', borderRadius: '50%', width: 54, height: 54, fontSize: 22, cursor: 'pointer', color: 'white' }}>📞</button>
              <div style={{ fontSize: 12, color: '#aaa', marginTop: 4 }}>قبول</div>
            </div>
          </div>
        </div>
      )}

      {/* Outgoing call */}
      {offlineRinging && !active && !incoming && (
        <div style={overlay}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>📞</div>
          <div style={{ fontWeight: 700, fontSize: 16 }}>{offlineRinging.calleeName || 'جارٍ الاتصال...'}</div>
          <div style={{ fontSize: 13, color: '#888', margin: '6px 0 18px' }}>
            {pushSent ? '📱 المستخدم خارج التطبيق — تم إرسال إشعار' : (statusMessage || 'جارٍ الاتصال...')}
          </div>
          <button
            onClick={() => {
              socket?.emit('call:cancel', { targetUserId: offlineRinging?.calleeId });
              stopCallingTone();
              cleanup();
            }}
            style={{ background: '#e74c3c', border: 'none', borderRadius: 24, padding: '10px 24px', color: '#fff', fontSize: 15, cursor: 'pointer', fontWeight: 700 }}>
            إلغاء 📵
          </button>
        </div>
      )}

      {/* No answer / rejected */}
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
          <div style={{ fontSize: 22, color: '#25d366', margin: '8px 0 18px', fontFamily: 'monospace' }}>{fmt(duration)}</div>
          <div style={{ display: 'flex', gap: 16, justifyContent: 'center' }}>
            <button onClick={toggleMute}
              style={{ background: muted ? '#e74c3c' : '#444', border: 'none', borderRadius: '50%', width: 44, height: 44, fontSize: 18, cursor: 'pointer' }}>
              {muted ? '🔇' : '🎤'}
            </button>
            <button onClick={hangup}
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
