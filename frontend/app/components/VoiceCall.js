'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

// ── Translations ───────────────────────────────────────────────────────────────
const TRANSLATIONS = {
  ar: {
    calling: 'جارٍ الاتصال...',
    ringing: 'يرن...',
    connecting: 'جارٍ الاتصال...',
    connected: 'متصل',
    callEnded: 'انتهت المكالمة',
    incomingCall: 'مكالمة واردة',
    accept: 'قبول',
    reject: 'رفض',
    mute: 'كتم',
    unmute: 'إلغاء الكتم',
    speaker: 'السماعة',
    hangUp: 'إنهاء',
    voiceCall: 'مكالمة صوتية',
    callWith: 'مكالمة مع',
    startCall: 'بدء مكالمة',
  },
  en: {
    calling: 'Calling...',
    ringing: 'Ringing...',
    connecting: 'Connecting...',
    connected: 'Connected',
    callEnded: 'Call Ended',
    incomingCall: 'Incoming Call',
    accept: 'Accept',
    reject: 'Reject',
    mute: 'Mute',
    unmute: 'Unmute',
    speaker: 'Speaker',
    hangUp: 'Hang Up',
    voiceCall: 'Voice Call',
    callWith: 'Call with',
    startCall: 'Start Call',
  },
};

// ── WebRTC / STUN Configuration ────────────────────────────────────────────────
const RTC_CONFIG = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
};

// ── Utility helpers ────────────────────────────────────────────────────────────
function formatDuration(seconds) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

function cairoFont(isRTL) {
  return isRTL ? { fontFamily: "'Cairo', 'Noto Sans Arabic', sans-serif" } : {};
}

// ── Animated ringing rings ─────────────────────────────────────────────────────
function RingWaves({ color = '#FF6B35', count = 3 }) {
  return (
    <>
      {Array.from({ length: count }, (_, i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            width: 80 + i * 26,
            height: 80 + i * 26,
            borderRadius: '50%',
            border: `2px solid ${color}`,
            opacity: 0,
            animation: `xtox-ring 1.8s ease-out ${i * 0.45}s infinite`,
            pointerEvents: 'none',
          }}
        />
      ))}
    </>
  );
}

// ── Waveform bars (shown when connected) ──────────────────────────────────────
function AudioWaveform({ active }) {
  const bars = [0.4, 0.7, 1.0, 0.7, 0.5, 0.9, 0.6, 1.0, 0.5, 0.8];
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 3,
        height: 28,
      }}
    >
      {bars.map((h, i) => (
        <div
          key={i}
          style={{
            width: 3,
            height: active ? `${h * 24}px` : '4px',
            borderRadius: 4,
            background: active ? '#22c55e' : '#374151',
            transition: 'height 0.2s ease',
            animation: active ? `xtox-wave ${0.6 + i * 0.08}s ease-in-out ${i * 0.06}s infinite alternate` : 'none',
          }}
        />
      ))}
    </div>
  );
}

// ── Call control button ───────────────────────────────────────────────────────
function CtrlBtn({ onClick, icon, label, bgColor, size = 52, shadow }) {
  const [hovered, setHovered] = useState(false);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 5 }}>
      <button
        onClick={onClick}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{
          width: size,
          height: size,
          borderRadius: '50%',
          background: bgColor,
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
          fontSize: size === 64 ? 26 : 20,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transform: hovered ? 'scale(1.1)' : 'scale(1)',
          boxShadow: hovered && shadow ? shadow : 'none',
          transition: 'transform 0.15s ease, box-shadow 0.15s ease',
        }}
      >
        {icon}
      </button>
      {label && (
        <span style={{ color: '#9ca3af', fontSize: 10, textAlign: 'center', maxWidth: 60 }}>
          {label}
        </span>
      )}
    </div>
  );
}

// ── Status indicator dot ──────────────────────────────────────────────────────
function StatusDot({ color }) {
  return (
    <div
      style={{
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: color,
        display: 'inline-block',
        marginInlineEnd: 6,
        animation: color === '#22c55e' ? 'xtox-blink 2s ease-in-out infinite' : 'none',
      }}
    />
  );
}

// ─────────────────────────────────────────────────────────────────────────────
//  MAIN VOICECALL COMPONENT
// ─────────────────────────────────────────────────────────────────────────────
export default function VoiceCall({ socket, targetId, userId }) {
  // ── Language ────────────────────────────────────────────────────────────────
  const [lang, setLang] = useState('ar');
  const t = TRANSLATIONS[lang] || TRANSLATIONS.ar;
  const isRTL = lang === 'ar';
  const dir = isRTL ? 'rtl' : 'ltr';

  // ── Call state machine ───────────────────────────────────────────────────────
  // idle → calling → connecting → connected → ended
  // idle → ringing (incoming) → connecting → connected → ended
  const [callStatus, setCallStatus] = useState('idle'); // idle|calling|ringing|connecting|connected|ended
  const [incomingCall, setIncomingCall] = useState(null); // { from, offer }
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [duration, setDuration] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const [iceState, setIceState] = useState('');

  // ── Refs ─────────────────────────────────────────────────────────────────────
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteAudioRef = useRef(null);
  const durationRef = useRef(null);

  // ── Detect language from localStorage ────────────────────────────────────────
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const saved = localStorage.getItem('xtox_lang');
        if (saved === 'ar' || saved === 'en') setLang(saved);
      } catch {
        // localStorage unavailable — keep default
      }
    }
  }, []);

  // ── Duration counter ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (callStatus === 'connected') {
      setDuration(0);
      durationRef.current = setInterval(() => setDuration(d => d + 1), 1000);
    } else {
      clearInterval(durationRef.current);
    }
    return () => clearInterval(durationRef.current);
  }, [callStatus]);

  // ── Cleanup helper ────────────────────────────────────────────────────────────
  const cleanup = useCallback(() => {
    clearInterval(durationRef.current);
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(t => t.stop());
      localStreamRef.current = null;
    }
    if (pcRef.current) {
      pcRef.current.onicecandidate = null;
      pcRef.current.oniceconnectionstatechange = null;
      pcRef.current.ontrack = null;
      pcRef.current.close();
      pcRef.current = null;
    }
    if (remoteAudioRef.current) {
      remoteAudioRef.current.srcObject = null;
    }
  }, []);

  // ── Create RTCPeerConnection ──────────────────────────────────────────────────
  const createPeerConnection = useCallback(
    (activeSocket, remoteId) => {
      if (pcRef.current) {
        pcRef.current.close();
        pcRef.current = null;
      }

      const pc = new RTCPeerConnection(RTC_CONFIG);

      // Forward local ICE candidates to remote peer via socket
      pc.onicecandidate = (evt) => {
        if (evt.candidate && activeSocket) {
          activeSocket.emit('ice-candidate', { to: remoteId, candidate: evt.candidate });
        }
      };

      // Track ICE connection health
      pc.oniceconnectionstatechange = () => {
        const s = pc.iceConnectionState;
        setIceState(s);
        if (s === 'connected' || s === 'completed') {
          setCallStatus('connected');
        } else if (s === 'failed') {
          setErrorMsg(lang === 'ar' ? 'فشل الاتصال — يُرجى المحاولة مجدداً' : 'Connection failed — please try again');
          setCallStatus('ended');
          cleanup();
        } else if (s === 'disconnected') {
          setErrorMsg(lang === 'ar' ? 'انقطع الاتصال' : 'Connection lost');
          setCallStatus('ended');
          cleanup();
        }
      };

      // Attach remote audio to <audio> element
      pc.ontrack = (evt) => {
        if (remoteAudioRef.current && evt.streams[0]) {
          remoteAudioRef.current.srcObject = evt.streams[0];
          remoteAudioRef.current.muted = !isSpeakerOn;
        }
      };

      pcRef.current = pc;
      return pc;
    },
    [cleanup, isSpeakerOn, lang]
  );

  // ── Socket event handlers ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!socket) return;

    // ① Remote user is calling us
    const onIncomingCall = ({ from, offer }) => {
      setIncomingCall({ from, offer });
      setCallStatus('ringing');
      setErrorMsg('');
    };

    // ② Remote user accepted our outgoing call
    const onCallAccepted = async ({ answer }) => {
      try {
        setCallStatus('connecting');
        if (pcRef.current) {
          await pcRef.current.setRemoteDescription(new RTCSessionDescription(answer));
        }
      } catch (err) {
        console.error('[VoiceCall] setRemoteDescription error', err);
        setErrorMsg(lang === 'ar' ? 'خطأ في بدء الاتصال' : 'Error starting connection');
        setCallStatus('ended');
        cleanup();
      }
    };

    // ③ Remote user rejected our call
    const onCallRejected = () => {
      cleanup();
      setCallStatus('ended');
      setErrorMsg(lang === 'ar' ? 'تم رفض المكالمة' : 'Call was rejected');
    };

    // ④ Receive ICE candidate from remote peer
    const onIceCandidate = async ({ candidate }) => {
      try {
        if (pcRef.current && candidate) {
          await pcRef.current.addIceCandidate(new RTCIceCandidate(candidate));
        }
      } catch {
        // Non-fatal ICE error — ignore
      }
    };

    // ⑤ Remote user ended the call
    const onCallEnded = () => {
      cleanup();
      setCallStatus('ended');
      setIncomingCall(null);
      setErrorMsg(lang === 'ar' ? 'أنهى الطرف الآخر المكالمة' : 'The other party ended the call');
    };

    socket.on('incoming-call', onIncomingCall);
    socket.on('call-accepted', onCallAccepted);
    socket.on('call-rejected', onCallRejected);
    socket.on('ice-candidate', onIceCandidate);
    socket.on('call-ended', onCallEnded);

    return () => {
      socket.off('incoming-call', onIncomingCall);
      socket.off('call-accepted', onCallAccepted);
      socket.off('call-rejected', onCallRejected);
      socket.off('ice-candidate', onIceCandidate);
      socket.off('call-ended', onCallEnded);
    };
  }, [socket, cleanup, lang]);

  // ── Unmount cleanup ───────────────────────────────────────────────────────────
  useEffect(() => {
    return () => {
      cleanup();
    };
  }, [cleanup]);

  // ── Actions ───────────────────────────────────────────────────────────────────

  async function startCall() {
    if (!socket || !targetId) return;
    setErrorMsg('');
    setCallStatus('calling');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(socket, targetId);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      const offer = await pc.createOffer();
      await pc.setLocalDescription(offer);
      socket.emit('start-call', { to: targetId, from: userId, offer });
    } catch {
      setCallStatus('ended');
      setErrorMsg(lang === 'ar' ? 'تعذّر الوصول إلى الميكروفون. تحقق من الصلاحيات.' : 'Microphone access denied. Check permissions.');
    }
  }

  async function acceptCall() {
    if (!incomingCall || !socket) return;
    const { from, offer } = incomingCall;
    setErrorMsg('');
    setCallStatus('connecting');
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      localStreamRef.current = stream;
      const pc = createPeerConnection(socket, from);
      stream.getTracks().forEach(track => pc.addTrack(track, stream));
      await pc.setRemoteDescription(new RTCSessionDescription(offer));
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('accept-call', { to: from, answer });
      setIncomingCall(null);
    } catch {
      setCallStatus('ended');
      setErrorMsg(lang === 'ar' ? 'تعذّر الوصول إلى الميكروفون' : 'Microphone access denied');
    }
  }

  function rejectCall() {
    if (!incomingCall || !socket) return;
    socket.emit('reject-call', { to: incomingCall.from });
    setIncomingCall(null);
    setCallStatus('idle');
  }

  function endCall() {
    if (socket && targetId) socket.emit('end-call', { to: targetId });
    cleanup();
    setCallStatus('ended');
  }

  function toggleMute() {
    if (!localStreamRef.current) return;
    const audioTrack = localStreamRef.current.getAudioTracks()[0];
    if (audioTrack) {
      audioTrack.enabled = isMuted; // flip current state
      setIsMuted(prev => !prev);
    }
  }

  function toggleSpeaker() {
    if (remoteAudioRef.current) {
      remoteAudioRef.current.muted = isSpeakerOn; // flip current state
    }
    setIsSpeakerOn(prev => !prev);
  }

  // ── Derived UI values ─────────────────────────────────────────────────────────
  const statusLabel = {
    idle: '',
    calling: t.calling,
    ringing: t.ringing,
    connecting: t.connecting,
    connected: t.connected,
    ended: t.callEnded,
  }[callStatus] || '';

  const statusColor = {
    idle: '#9ca3af',
    calling: '#f59e0b',
    ringing: '#3b82f6',
    connecting: '#f59e0b',
    connected: '#22c55e',
    ended: '#ef4444',
  }[callStatus] || '#9ca3af';

  const showControls = callStatus === 'connected' || callStatus === 'calling' || callStatus === 'connecting';

  // ─────────────────────────────────────────────────────────────────────────────
  //  RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  return (
    <div dir={dir} style={{ ...cairoFont(isRTL), position: 'relative' }}>

      {/* Hidden <audio> element for remote stream */}
      <audio ref={remoteAudioRef} autoPlay playsInline style={{ display: 'none' }} />

      {/* ══════════════════════════════════════════════════════════
          INCOMING CALL MODAL — shown when callStatus === 'ringing'
         ══════════════════════════════════════════════════════════ */}
      {callStatus === 'ringing' && incomingCall && (
        <div
          style={{
            position: 'fixed',
            inset: 0,
            zIndex: 9999,
            background: 'rgba(0,0,0,0.75)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backdropFilter: 'blur(4px)',
          }}
        >
          <div
            dir={dir}
            style={{
              background: 'linear-gradient(160deg, #1f2937 0%, #111827 100%)',
              borderRadius: 28,
              padding: '36px 32px',
              minWidth: 300,
              maxWidth: 360,
              textAlign: 'center',
              boxShadow: '0 30px 70px rgba(0,0,0,0.6)',
              border: '1px solid rgba(255,107,53,0.25)',
              ...cairoFont(isRTL),
            }}
          >
            {/* Animated avatar with rings */}
            <div style={{ position: 'relative', width: 80, height: 80, margin: '0 auto 24px' }}>
              <div
                style={{
                  width: 80,
                  height: 80,
                  borderRadius: '50%',
                  background: 'linear-gradient(135deg, #FF6B35, #ff8c5a)',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 36,
                  position: 'relative',
                  zIndex: 1,
                  animation: 'xtox-pulse 1.8s ease-in-out infinite',
                }}
              >
                📞
              </div>
              <RingWaves color="#FF6B35" count={3} />
            </div>

            {/* Title */}
            <p style={{ color: '#FF6B35', fontWeight: 700, fontSize: 20, margin: '0 0 6px 0' }}>
              {t.incomingCall}
            </p>

            {/* Caller ID */}
            <p style={{ color: '#9ca3af', fontSize: 14, margin: '0 0 8px 0' }}>
              {t.callWith}{isRTL ? ' ' : ' '}
              <span style={{ color: '#e5e7eb', fontWeight: 600 }}>
                #{(incomingCall.from || '').slice(-6) || '------'}
              </span>
            </p>

            {/* Ringing animation dots */}
            <div style={{ display: 'flex', justifyContent: 'center', gap: 5, margin: '0 0 28px' }}>
              {[0, 1, 2].map(i => (
                <div
                  key={i}
                  style={{
                    width: 7,
                    height: 7,
                    borderRadius: '50%',
                    background: '#FF6B35',
                    animation: `xtox-bounce 1.2s ease-in-out ${i * 0.2}s infinite`,
                  }}
                />
              ))}
            </div>

            {/* Accept / Reject */}
            <div style={{ display: 'flex', gap: 14, justifyContent: 'center' }}>
              <button
                onClick={rejectCall}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  borderRadius: 14,
                  background: '#ef4444',
                  color: '#fff',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  ...cairoFont(isRTL),
                }}
              >
                <span>📵</span>
                <span>{t.reject}</span>
              </button>
              <button
                onClick={acceptCall}
                style={{
                  flex: 1,
                  padding: '13px 0',
                  borderRadius: 14,
                  background: '#22c55e',
                  color: '#fff',
                  fontWeight: 700,
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: 15,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: 6,
                  ...cairoFont(isRTL),
                }}
              >
                <span>📞</span>
                <span>{t.accept}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          ACTIVE CALL UI — calling / connecting / connected / ended
         ══════════════════════════════════════════════════════════ */}
      {callStatus !== 'idle' && callStatus !== 'ringing' && (
        <div
          style={{
            background: 'linear-gradient(160deg, #1f2937 0%, #111827 100%)',
            borderRadius: 22,
            padding: '28px 24px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: 18,
            boxShadow: '0 10px 40px rgba(0,0,0,0.45)',
            border: '1px solid rgba(255,255,255,0.06)',
            minWidth: 260,
            ...cairoFont(isRTL),
          }}
        >
          {/* Avatar */}
          <div style={{ position: 'relative', width: 72, height: 72 }}>
            <div
              style={{
                width: 72,
                height: 72,
                borderRadius: '50%',
                background: 'linear-gradient(135deg, #374151, #1f2937)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: 30,
                border: `3px solid ${statusColor}`,
                transition: 'border-color 0.4s ease',
              }}
            >
              👤
            </div>
            {/* Online indicator when connected */}
            {callStatus === 'connected' && (
              <div
                style={{
                  position: 'absolute',
                  bottom: 2,
                  right: 2,
                  width: 16,
                  height: 16,
                  borderRadius: '50%',
                  background: '#22c55e',
                  border: '2px solid #111827',
                  animation: 'xtox-blink 2s ease-in-out infinite',
                }}
              />
            )}
            {/* Spinner overlay when calling/connecting */}
            {(callStatus === 'calling' || callStatus === 'connecting') && (
              <div
                style={{
                  position: 'absolute',
                  inset: -5,
                  borderRadius: '50%',
                  border: '3px solid transparent',
                  borderTopColor: '#FF6B35',
                  animation: 'xtox-spin 1s linear infinite',
                }}
              />
            )}
          </div>

          {/* Status row */}
          <div style={{ textAlign: 'center' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <StatusDot color={statusColor} />
              <span
                style={{
                  color: statusColor,
                  fontWeight: 700,
                  fontSize: 16,
                  ...cairoFont(isRTL),
                }}
              >
                {statusLabel}
              </span>
            </div>

            {/* Duration counter */}
            {callStatus === 'connected' && (
              <p
                style={{
                  color: '#6b7280',
                  fontSize: 13,
                  margin: '5px 0 0',
                  fontFamily: 'monospace',
                  letterSpacing: '0.05em',
                }}
              >
                {formatDuration(duration)}
              </p>
            )}

            {/* ICE state hint (for debugging, subtle) */}
            {callStatus === 'connecting' && iceState && (
              <p style={{ color: '#4b5563', fontSize: 10, margin: '3px 0 0', fontFamily: 'monospace' }}>
                ICE: {iceState}
              </p>
            )}

            {/* Error message */}
            {errorMsg && (
              <p
                style={{
                  color: '#ef4444',
                  fontSize: 13,
                  margin: '6px 0 0',
                  ...cairoFont(isRTL),
                }}
              >
                ⚠ {errorMsg}
              </p>
            )}
          </div>

          {/* Audio waveform animation when connected */}
          {callStatus === 'connected' && <AudioWaveform active />}

          {/* ── Call controls ── */}
          {showControls && (
            <div
              style={{
                display: 'flex',
                gap: 18,
                alignItems: 'flex-start',
                justifyContent: 'center',
                flexWrap: 'wrap',
              }}
            >
              {/* Mute / Unmute */}
              <CtrlBtn
                onClick={toggleMute}
                icon={isMuted ? '🔇' : '🎤'}
                label={isMuted ? t.unmute : t.mute}
                bgColor={isMuted ? '#ef4444' : '#374151'}
                size={52}
              />

              {/* Hang up — centre, larger */}
              <CtrlBtn
                onClick={endCall}
                icon="📵"
                label={t.hangUp}
                bgColor="#ef4444"
                size={64}
                shadow="0 6px 20px rgba(239,68,68,0.45)"
              />

              {/* Speaker */}
              <CtrlBtn
                onClick={toggleSpeaker}
                icon={isSpeakerOn ? '🔊' : '🔈'}
                label={t.speaker}
                bgColor={isSpeakerOn ? '#FF6B35' : '#374151'}
                size={52}
              />
            </div>
          )}

          {/* Call-ended close button */}
          {callStatus === 'ended' && (
            <button
              onClick={() => { setCallStatus('idle'); setErrorMsg(''); setDuration(0); }}
              style={{
                padding: '10px 32px',
                borderRadius: 12,
                background: '#374151',
                color: '#d1d5db',
                border: 'none',
                cursor: 'pointer',
                fontSize: 14,
                fontWeight: 600,
                ...cairoFont(isRTL),
              }}
            >
              {isRTL ? 'إغلاق' : 'Close'}
            </button>
          )}
        </div>
      )}

      {/* ══════════════════════════════════════════════════════════
          IDLE STATE — Start call button
         ══════════════════════════════════════════════════════════ */}
      {callStatus === 'idle' && (
        <button
          onClick={startCall}
          style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 8,
            padding: '11px 22px',
            borderRadius: 14,
            background: 'linear-gradient(135deg, #FF6B35, #e85d2c)',
            color: '#fff',
            border: 'none',
            cursor: 'pointer',
            fontWeight: 700,
            fontSize: 14,
            boxShadow: '0 4px 16px rgba(255,107,53,0.38)',
            transition: 'transform 0.15s ease, box-shadow 0.15s ease',
            ...cairoFont(isRTL),
          }}
          onMouseEnter={e => {
            e.currentTarget.style.transform = 'scale(1.04)';
            e.currentTarget.style.boxShadow = '0 6px 22px rgba(255,107,53,0.55)';
          }}
          onMouseLeave={e => {
            e.currentTarget.style.transform = 'scale(1)';
            e.currentTarget.style.boxShadow = '0 4px 16px rgba(255,107,53,0.38)';
          }}
        >
          <span style={{ fontSize: 18 }}>📞</span>
          <span>{t.startCall}</span>
          {isRTL && (
            <span style={{ fontSize: 11, opacity: 0.7, fontWeight: 400 }}>Voice Call</span>
          )}
        </button>
      )}

      {/* ══════════════════════════════════════════════════════════
          GLOBAL CSS ANIMATIONS
         ══════════════════════════════════════════════════════════ */}
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cairo:wght@400;600;700&display=swap');

        @keyframes xtox-pulse {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(1.07); }
        }
        @keyframes xtox-ring {
          0%   { transform: translate(-50%, -50%) scale(1); opacity: 0.65; }
          100% { transform: translate(-50%, -50%) scale(2.4); opacity: 0; }
        }
        @keyframes xtox-blink {
          0%, 100% { opacity: 1; }
          50%       { opacity: 0.35; }
        }
        @keyframes xtox-spin {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes xtox-bounce {
          0%, 100% { transform: translateY(0); opacity: 0.5; }
          50%       { transform: translateY(-5px); opacity: 1; }
        }
        @keyframes xtox-wave {
          from { height: 4px; }
          to   { height: 22px; }
        }
      `}</style>
    </div>
  );
}
