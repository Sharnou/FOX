'use client';
export const dynamic = 'force-dynamic';

import { Suspense, useRef, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import CallManager from '../components/CallManager';

const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || process.env.NEXT_PUBLIC_API_URL || 'https://xtox-production.up.railway.app';

/**
 * /call — Dedicated call page
 * Supports:
 *   /call?to=<userId>&name=<name>   → auto-initiate call to userId
 *   /call?answer=true&from=<callerId>&name=<name>  → navigate here to accept incoming call
 *   /call  → just show CallManager (standby)
 */
function CallPageInner() {
  const params = useSearchParams();
  const toUserId   = params.get('to')     || '';
  const calleeName = params.get('name')   || '';
  const answerMode = params.get('answer') === 'true';
  const fromUserId = params.get('from')   || '';

  const callManagerRef = useRef(null);
  const [socket, setSocket]     = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [ready, setReady]       = useState(false);
  const [statusMsg, setStatusMsg] = useState('جارٍ تحميل نظام الاتصال...');

  // Load user from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('user');
      if (stored) {
        const u = JSON.parse(stored);
        if (!u.token) {
          const t = localStorage.getItem('token') || '';
          if (t) u.token = t;
        }
        setCurrentUser(u);
      }
    } catch {}
  }, []);

  // Connect socket when user is loaded
  useEffect(() => {
    if (!currentUser?.token) return;
    let cancelled = false;
    import('socket.io-client').then(({ io }) => {
      if (cancelled) return;
      const sock = io(SOCKET_URL, {
        auth: { token: currentUser.token },
        transports: ['websocket', 'polling'],
      });
      const uid = (currentUser.id || currentUser._id || '').toString();
      const joinRooms = () => {
        if (uid) {
          sock.emit('join', uid);
          sock.emit('user:online', uid);
        }
      };
      if (sock.connected) joinRooms();
      sock.on('connect', () => { joinRooms(); setReady(true); setStatusMsg(''); });
      // Expose globally so ChatFloat can reuse
      if (typeof window !== 'undefined') window.__xtoxSocket = sock;
      setSocket(sock);
      setReady(sock.connected);
    }).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [currentUser?.token]);

  // Auto-initiate call when socket is ready and `to` param is present
  useEffect(() => {
    if (!ready || !toUserId || !callManagerRef.current) return;
    // Small delay to ensure CallManager is mounted and listeners registered
    const t = setTimeout(() => {
      if (callManagerRef.current?.initiateCall) {
        setStatusMsg('');
        callManagerRef.current.initiateCall(toUserId, decodeURIComponent(calleeName));
      }
    }, 800);
    return () => clearTimeout(t);
  }, [ready, toUserId]);

  return (
    <div style={{
      minHeight: '100vh', background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      fontFamily: 'Cairo, sans-serif',
    }}>
      {statusMsg && (
        <p style={{ color: '#9ca3af', fontSize: 14, marginBottom: 16 }}>{statusMsg}</p>
      )}
      {toUserId && !ready && (
        <p style={{ color: '#6b7280', fontSize: 13 }}>جارٍ الاتصال بـ {decodeURIComponent(calleeName)}...</p>
      )}
      <CallManager ref={callManagerRef} socket={socket} currentUser={currentUser} />
      {/* Back button */}
      <button
        onClick={() => window.history.back()}
        style={{
          position: 'fixed', top: 20, right: 20,
          background: 'rgba(255,255,255,0.1)', color: '#fff',
          border: '1px solid rgba(255,255,255,0.2)',
          borderRadius: 12, padding: '8px 16px', cursor: 'pointer',
          fontSize: 13, fontFamily: 'Cairo, sans-serif',
        }}
      >← رجوع</button>
    </div>
  );
}

export default function CallPage() {
  return (
    <Suspense fallback={
      <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#0a0a0a' }}>
        <p style={{ color: '#9ca3af', fontFamily: 'Cairo, sans-serif' }}>جارٍ تحميل نظام الاتصال...</p>
      </div>
    }>
      <CallPageInner />
    </Suspense>
  );
}
