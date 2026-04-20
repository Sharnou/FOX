'use client';
export const dynamic = 'force-dynamic';

import { Suspense } from 'react';
import CallManager from '../components/CallManager';

/**
 * /call — Dedicated call page
 * This page hosts the CallManager component which handles all WebRTC logic,
 * incoming/outgoing call UI, accept/decline, ICE negotiation, and TURN relay.
 * Mounting CallManager here ensures it's always active during a call session.
 */
function CallPageInner() {
  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0a', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', fontFamily: 'Cairo, sans-serif' }}>
      <CallManager />
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
