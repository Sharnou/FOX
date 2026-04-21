'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useEffect, useRef, useState, useCallback } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

const ICE_SERVERS_STATIC = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  { urls: 'turn:relay.expressturn.com:3478',              username: 'efUN55DZL6OFIRBQXI', credential: 'UfBApCBfMQiOunPs' },
  { urls: 'turn:relay.expressturn.com:3478?transport=tcp', username: 'efUN55DZL6OFIRBQXI', credential: 'UfBApCBfMQiOunPs' },
  { urls: 'turn:openrelay.metered.ca:80',                 username: 'openrelayproject',   credential: 'openrelayproject'   },
  { urls: 'turn:openrelay.metered.ca:443',                username: 'openrelayproject',   credential: 'openrelayproject'   },
];

// ── Helpers ────────────────────────────────────────────────────────────────────
function fmt(s) {
  return `${Math.floor(s / 60).toString().padStart(2, '0')}:${(s % 60).toString().padStart(2, '0')}`;
}

function getStoredUser() {
  try {
    const stored = localStorage.getItem('user');
    if (stored) return JSON.parse(stored);
  } catch {}
  return null;
}

function getToken(user) {
  return user?.token || localStorage.getItem('xtox_token') || localStorage.getItem('token') || '';
}

// ── Inner component (needs Suspense for useSearchParams) ───────────────────────
function CallPageInner() {
  const router      = useRouter();
  const searchParams = useSearchParams();

  const toUserId   = searchParams.get('to')    || '';
  const nameParam  = searchParams.get('name')  || '';
  const adId       = searchParams.get('adId')  || '';

  // Decode Arabic names that arrive URL-encoded
  const decodedName = (() => { try { return decodeURIComponent(nameParam); } catch { return nameParam; } })();

  const [status,       setStatus]       = useState('calling');   // calling | ringing | connected | ended
  const [duration,     setDuration]     = useState(0);
  const [muted,        setMuted]        = useState(false);
  const [speaker,      setSpeaker]      = useState(true);
  const [displayName,  setDisplayName]  = useState(decodedName || 'مكالمة');
  const [callerAvatar, setCallerAvatar] = useState(null);

  const localStreamRef    = useRef(null);
  const pcRef             = useRef(null);
  const socketRef         = useRef(null);
  const timerRef          = useRef(null);
  const remoteAudioRef    = useRef(null);
  const remoteSocketIdRef = useRef(null);   // other side's socket.id
  const endedRef          = useRef(false);  // guard against double-end

  // ── Fetch caller avatar / name if we have a userId ──────────────────────────
  useEffect(() => {
    if (!toUserId) return;
    const user  = getStoredUser();
    const token = getToken(user);
    fetch(`${API_BASE}/api/profile/${toUserId}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    })
      .then(r => r.ok ? r.json() : null)
      .then(d => {
        if (!d) return;
        const u = d.user || d;
        if (u?.avatar) setCallerAvatar(u.avatar);
        if (u?.name && !decodedName) setDisplayName(u.name);
      })
      .catch(() => {});
  }, [toUserId]);

  // ── Timer ────────────────────────────────────────────────────────────────────
  const startTimer = useCallback(() => {
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => setDuration(d => d + 1), 1000);
  }, []);

  // ── End call (central) ───────────────────────────────────────────────────────
  const endCall = useCallback((emit = true) => {
    if (endedRef.current) return;
    endedRef.current = true;

    clearInterval(timerRef.current);

    if (emit && socketRef.current && remoteSocketIdRef.current) {
      socketRef.current.emit('call:end', { targetSocketId: remoteSocketIdRef.current });
    }
    if (emit && socketRef.current && toUserId) {
      // also try user-room fallback
      socketRef.current.emit('call:cancel', { targetUserId: toUserId });
    }

    localStreamRef.current?.getTracks().forEach(t => t.stop());
    try { pcRef.current?.close(); } catch {}
    try { socketRef.current?.disconnect(); } catch {}

    setStatus('ended');
    setTimeout(() => router.back(), 1500);
  }, [router, toUserId]);

  // ── Main WebRTC + Socket setup ────────────────────────────────────────────────
  const startCall = useCallback(async () => {
    const user  = getStoredUser();
    const token = getToken(user);
    if (!token) { router.push('/login'); return; }

    // Fetch TURN credentials from backend (keeps API key server-side)
    let iceServers = [...ICE_SERVERS_STATIC];
    try {
      const apiBase = process.env.NEXT_PUBLIC_API_URL || 'https://fox-production-c2a0.up.railway.app';
      const res = await fetch(`${apiBase}/api/ice/credentials`);
      if (res.ok) {
        const data = await res.json();
        if (data.iceServers) iceServers = [...iceServers, ...data.iceServers];
      }
    } catch {}

    // Get microphone
    let stream;
    try {
      stream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
        video: false,
      });
      localStreamRef.current = stream;
    } catch {
      alert('لا يمكن الوصول إلى الميكروفون. تأكد من منح الإذن.');
      router.back();
      return;
    }

    // PeerConnection
    const pc = new RTCPeerConnection({ iceServers });
    pcRef.current = pc;
    stream.getTracks().forEach(t => pc.addTrack(t, stream));

    pc.ontrack = (e) => {
      if (remoteAudioRef.current) {
        remoteAudioRef.current.srcObject = e.streams[0];
        remoteAudioRef.current.play().catch(() => {});
      }
    };

    pc.onconnectionstatechange = () => {
      if (pc.connectionState === 'connected') { setStatus('connected'); startTimer(); }
      if (['disconnected', 'failed', 'closed'].includes(pc.connectionState)) endCall(false);
    };

    // Socket
    const { io } = await import('socket.io-client');
    const socket = io(API_BASE, {
      auth: { token },
      transports: ['websocket', 'polling'],
    });
    socketRef.current = socket;

    socket.on('connect', async () => {
      const uid = (user?.id || user?._id || '').toString();
      if (uid) {
        socket.emit('join', uid);
        socket.emit('user:online', uid);
      }

      if (toUserId) {
        // ── OUTBOUND CALL ──────────────────────────────────────────────────
        setStatus('calling');

        pc.onicecandidate = (e) => {
          if (e.candidate && remoteSocketIdRef.current) {
            socket.emit('call:ice', { targetSocketId: remoteSocketIdRef.current, candidate: e.candidate });
          }
        };

        const offer       = await pc.createOffer();
        await pc.setLocalDescription(offer);

        const callerNameVal = user?.name || user?.username || displayName || 'مستخدم';
        socket.emit('call:initiate', {
          targetUserId: toUserId,
          calleeId:     toUserId,
          callerId:     uid,
          offer,
          callerName:   callerNameVal,
          callerAvatar: user?.avatar || '',
          adId,
        });
      }
    });

    // ── CALLER: got answer back ────────────────────────────────────────────
    socket.on('call:accepted', async ({ answer, calleeSocketId }) => {
      if (calleeSocketId) remoteSocketIdRef.current = calleeSocketId;
      try {
        await pc.setRemoteDescription(new RTCSessionDescription(answer));
        setStatus('connected');
        startTimer();
      } catch {}
    });

    // ── CALLEE: got incoming call ──────────────────────────────────────────
    socket.on('call:incoming', async ({ offer, callerSocketId, callerName: incomingName, callerAvatar: incomingAvatar }) => {
      // If we're the page opened to answer, handle it
      remoteSocketIdRef.current = callerSocketId;
      if (incomingName) setDisplayName(incomingName);
      if (incomingAvatar) setCallerAvatar(incomingAvatar);

      setStatus('ringing');

      pc.onicecandidate = (e) => {
        if (e.candidate) {
          socket.emit('call:ice', { targetSocketId: callerSocketId, candidate: e.candidate });
        }
      };

      try {
        await pc.setRemoteDescription(new RTCSessionDescription(offer));
      } catch {}
    });

    // ── ICE candidates (both sides) ───────────────────────────────────────
    socket.on('call:ice', async ({ candidate, fromSocketId }) => {
      if (fromSocketId) remoteSocketIdRef.current = fromSocketId;
      try { await pc.addIceCandidate(new RTCIceCandidate(candidate)); } catch {}
    });

    // ── Remote ended / rejected / no answer ──────────────────────────────
    socket.on('call:ended',    () => endCall(false));
    socket.on('call:rejected', () => { setStatus('ended'); setTimeout(() => router.back(), 1500); });
    socket.on('call:cancelled',() => { setStatus('ended'); setTimeout(() => router.back(), 1500); });
    socket.on('call:no_answer',() => { setStatus('ended'); setTimeout(() => router.back(), 1500); });
    socket.on('call:expired',  () => { setStatus('ended'); setTimeout(() => router.back(), 1500); });

    // ── Callee connected (backup: re-send offer if reconnected) ──────────
    socket.on('call:callee_connected', () => {/* backend handles re-emit */});

  }, [toUserId, adId, startTimer, endCall, displayName, router]);

  // ── Answer incoming ──────────────────────────────────────────────────────────
  const answerCall = useCallback(async () => {
    const pc            = pcRef.current;
    const socket        = socketRef.current;
    const callerSocketId = remoteSocketIdRef.current;
    if (!pc || !socket || !callerSocketId) return;

    try {
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      socket.emit('call:answer', { callerSocketId, answer });
      setStatus('connected');
      startTimer();
    } catch (err) {
      console.error('[CALL] answerCall error:', err);
    }
  }, [startTimer]);

  // ── Reject incoming ──────────────────────────────────────────────────────────
  const rejectCall = useCallback(() => {
    const callerSocketId = remoteSocketIdRef.current;
    if (socketRef.current && callerSocketId) {
      socketRef.current.emit('call:reject', { callerSocketId });
    }
    endCall(false);
  }, [endCall]);

  // ── Mute / Speaker ───────────────────────────────────────────────────────────
  const toggleMute = useCallback(() => {
    const track = localStreamRef.current?.getAudioTracks()[0];
    if (track) { track.enabled = !track.enabled; setMuted(m => !m); }
  }, []);

  const toggleSpeaker = useCallback(() => setSpeaker(s => !s), []);

  // ── Lifecycle ────────────────────────────────────────────────────────────────
  useEffect(() => { startCall(); }, []); // eslint-disable-line

  useEffect(() => () => {
    clearInterval(timerRef.current);
    localStreamRef.current?.getTracks().forEach(t => t.stop());
    try { pcRef.current?.close(); }     catch {}
    try { socketRef.current?.disconnect(); } catch {}
  }, []);

  // ── Status label ─────────────────────────────────────────────────────────────
  const statusLabel = {
    calling:   'جارٍ الاتصال...',
    ringing:   'يرن...',
    connected: `● متصل  ${fmt(duration)}`,
    ended:     'انتهت المكالمة',
  }[status] ?? '';

  const statusColor = status === 'connected' ? '#22c55e' : status === 'ended' ? '#ef4444' : '#94a3b8';

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <>
      <audio ref={remoteAudioRef} id="xtox-remote-audio" autoPlay playsInline style={{ display: 'none' }} />

      <div style={{
        minHeight: '100vh',
        background: 'linear-gradient(180deg,#0a0a1a 0%,#0d1117 100%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
        fontFamily: 'Cairo,Tajawal,system-ui,sans-serif',
        position: 'relative', overflow: 'hidden',
      }}>

        {/* ── Back button ─────────────────────────────────────────────────── */}
        <button
          onClick={() => endCall()}
          style={{
            position: 'fixed', top: 'env(safe-area-inset-top, 20px)', right: 20,
            background: 'rgba(255,255,255,0.08)', color: '#fff',
            border: '1px solid rgba(255,255,255,0.15)', borderRadius: 12,
            padding: '8px 16px', cursor: 'pointer', fontSize: 13,
            fontFamily: 'inherit', backdropFilter: 'blur(8px)', zIndex: 10,
          }}
        >← رجوع</button>

        {/* ── Avatar ──────────────────────────────────────────────────────── */}
        <div style={{
          width: 110, height: 110, borderRadius: '50%',
          background: 'linear-gradient(135deg,#6366f1,#8b5cf6)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 44, fontWeight: 700, color: '#fff',
          boxShadow: '0 0 60px rgba(99,102,241,0.5)',
          marginBottom: 24, overflow: 'hidden',
          border: '3px solid rgba(99,102,241,0.6)',
        }}>
          {callerAvatar
            ? <img src={callerAvatar} alt={displayName} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            : (displayName[0] || '?').toUpperCase()
          }
        </div>

        {/* ── Name ────────────────────────────────────────────────────────── */}
        <h2 style={{ color: '#fff', fontSize: 22, fontWeight: 700, margin: '0 0 10px', textAlign: 'center' }}>
          {displayName}
        </h2>

        {/* ── Status ──────────────────────────────────────────────────────── */}
        <p style={{ color: statusColor, fontSize: 15, margin: '0 0 48px', textAlign: 'center', letterSpacing: 0.5 }}>
          {statusLabel}
        </p>

        {/* ── Mute + Speaker (connected only) ─────────────────────────────── */}
        {status === 'connected' && (
          <div style={{ display: 'flex', gap: 24, marginBottom: 48 }}>
            <button onClick={toggleMute} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: muted ? 'rgba(239,68,68,0.2)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${muted ? '#ef4444' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 16, padding: '14px 20px', cursor: 'pointer',
              color: muted ? '#ef4444' : '#fff', fontFamily: 'inherit', fontSize: 12,
            }}>
              <span style={{ fontSize: 22 }}>{muted ? '🔇' : '🎙️'}</span>
              <span>{muted ? 'إلغاء الكتم' : 'كتم'}</span>
            </button>

            <button onClick={toggleSpeaker} style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
              background: speaker ? 'rgba(99,102,241,0.15)' : 'rgba(255,255,255,0.08)',
              border: `1px solid ${speaker ? '#6366f1' : 'rgba(255,255,255,0.15)'}`,
              borderRadius: 16, padding: '14px 20px', cursor: 'pointer',
              color: speaker ? '#818cf8' : '#fff', fontFamily: 'inherit', fontSize: 12,
            }}>
              <span style={{ fontSize: 22 }}>{speaker ? '📢' : '🔈'}</span>
              <span>سماعة</span>
            </button>
          </div>
        )}

        {/* ── Answer / Reject (ringing) ────────────────────────────────────── */}
        {status === 'ringing' && (
          <div style={{ display: 'flex', gap: 32, marginBottom: 32 }}>
            <button onClick={rejectCall} style={{
              width: 68, height: 68, borderRadius: '50%',
              background: '#ef4444', border: 'none', cursor: 'pointer',
              fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(239,68,68,0.5)',
            }}>❌</button>

            <button onClick={answerCall} style={{
              width: 68, height: 68, borderRadius: '50%',
              background: '#22c55e', border: 'none', cursor: 'pointer',
              fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
              boxShadow: '0 4px 20px rgba(34,197,94,0.5)',
            }}>✅</button>
          </div>
        )}

        {/* ── End call button (calling or connected) ───────────────────────── */}
        {(status === 'calling' || status === 'connected') && (
          <button onClick={() => endCall()} style={{
            width: 68, height: 68, borderRadius: '50%',
            background: '#ef4444', border: 'none', cursor: 'pointer',
            fontSize: 26, display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 4px 20px rgba(239,68,68,0.5)', margin: '0 auto',
          }}>📵</button>
        )}

        {/* ── Ended label ─────────────────────────────────────────────────── */}
        {status === 'ended' && (
          <p style={{ color: '#64748b', fontSize: 14 }}>جارٍ الإغلاق...</p>
        )}

        {/* ── Pulse ring animation ─────────────────────────────────────────── */}
        <style>{`
          @keyframes call-pulse {
            0%   { transform: scale(1);   opacity: 0.6; }
            100% { transform: scale(1.8); opacity: 0;   }
          }
        `}</style>
        {(status === 'calling' || status === 'ringing') && (
          <div style={{
            position: 'absolute', width: 110, height: 110, borderRadius: '50%',
            border: '2px solid rgba(99,102,241,0.4)',
            animation: 'call-pulse 1.8s ease-out infinite',
            pointerEvents: 'none',
            top: '50%', left: '50%',
            transform: 'translate(-50%, calc(-50% - 80px))',
          }} />
        )}
      </div>
    </>
  );
}

// ── Page export (Suspense required for useSearchParams in Next.js App Router) ──
export default function CallPage() {
  return (
    <Suspense fallback={
      <div style={{
        minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
        background: 'linear-gradient(180deg,#0a0a1a 0%,#0d1117 100%)',
      }}>
        <p style={{ color: '#9ca3af', fontFamily: 'Cairo,sans-serif' }}>جارٍ تحميل نظام الاتصال...</p>
      </div>
    }>
      <CallPageInner />
    </Suspense>
  );
}
