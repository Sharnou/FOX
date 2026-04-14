/**
 * XTOX Voice Call Signaling Test
 * 
 * Tests the full WebRTC signaling flow:
 * 1. Both users connect and join their rooms
 * 2. Caller initiates call → callee receives call:incoming
 * 3. Callee accepts → emits call:answered_ready
 * 4. Caller sends SDP offer → callee receives call:offer
 * 5. Callee sends answer → caller receives call:answered
 * 6. ICE candidate exchange
 * 
 * IMPORTANT: Event name/parameter corrections vs the draft test script:
 *   - socket.emit('join', userId)         ← plain STRING, NOT object
 *   - socket.emit('call:initiate', { targetUserId, ... })  ← NOT 'to'
 *   - Callee receives 'call:incoming' first (not 'call:offer' directly)
 *   - Then callee emits 'call:answered_ready' → caller sends offer via 'call:offer'
 *   - SDP exchange uses SOCKET IDs not USER IDs
 */

const { io } = require('socket.io-client');

const BACKEND = process.env.BACKEND || 'https://xtox-production.up.railway.app';

const TOKEN_A   = process.env.TOKEN_A;
const TOKEN_B   = process.env.TOKEN_B;
const USER_ID_A = process.env.USER_ID_A;
const USER_ID_B = process.env.USER_ID_B;

if (!TOKEN_A || !TOKEN_B || !USER_ID_A || !USER_ID_B) {
  console.error('❌ Missing env vars: TOKEN_A, TOKEN_B, USER_ID_A, USER_ID_B');
  process.exit(1);
}

console.log('XTOX Voice Call Signaling Test');
console.log('Backend:', BACKEND);
console.log('User A (Caller):', USER_ID_A);
console.log('User B (Callee):', USER_ID_B);
console.log('');

const results = {
  callerConnected: false,
  calleeConnected: false,
  callerJoinedRoom: false,
  calleeJoinedRoom: false,
  callIncomingReceived: false,   // callee got call:incoming
  answeredReadySent: false,      // callee sent call:answered_ready
  callerGotAnsweredReady: false, // caller got call:answered_ready
  offerSentByCaller: false,      // caller sent call:offer
  offerReceivedByCallee: false,  // callee got call:offer
  answerSentByCallee: false,     // callee sent call:answer
  answerReceivedByCaller: false, // caller got call:answered
  iceFromCaller: 0,
  iceFromCallee: 0,
  callUserUnavailable: false,
  errors: [],
  warnings: [],
};

// Track socket IDs for verification
let socketIdA = null;
let socketIdB = null;

const FAKE_OFFER = {
  type: 'offer',
  sdp: 'v=0\r\no=- 0 0 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:audio\r\n'
};
const FAKE_ANSWER = {
  type: 'answer',
  sdp: 'v=0\r\no=- 1 1 IN IP4 127.0.0.1\r\ns=-\r\nt=0 0\r\nm=audio 9 UDP/TLS/RTP/SAVPF 111\r\na=mid:audio\r\n'
};

// ── Caller socket ──
console.log('Connecting caller socket...');
const socketA = io(BACKEND, {
  auth: { token: TOKEN_A },
  transports: ['websocket'],
  timeout: 15000,
  reconnection: false,
});

// ── Callee socket ──
console.log('Connecting callee socket...');
const socketB = io(BACKEND, {
  auth: { token: TOKEN_B },
  transports: ['websocket'],
  timeout: 15000,
  reconnection: false,
});

// ────────── CALLER (Socket A) ──────────
socketA.on('connect', () => {
  results.callerConnected = true;
  socketIdA = socketA.id;
  console.log(`[A] ✅ Caller connected: ${socketA.id}`);

  // Join user room — MUST be plain string (not object)
  socketA.emit('join', USER_ID_A);
  socketA.emit('join_user_room', { userId: USER_ID_A });
  results.callerJoinedRoom = true;
  console.log(`[A] Joined room: user_${USER_ID_A}`);

  // Wait 2 seconds for callee to connect and join their room before initiating
  setTimeout(() => {
    if (!results.calleeConnected) {
      results.errors.push('Callee did not connect within 2s — call will likely fail with user_unavailable');
      results.warnings.push('Callee took too long to connect');
    }
    console.log('[A] Initiating call to B...');
    socketA.emit('call:initiate', {
      targetUserId: USER_ID_B,   // ← CORRECT: backend expects 'targetUserId', NOT 'to'
      callerId: USER_ID_A,
      callerName: 'TestCaller',
      callerAvatar: '',
      offer: FAKE_OFFER,         // Include offer for offline push support
    });
    results.offerSentByCaller = true; // (attempted, not confirmed relayed)
  }, 2000);
});

socketA.on('connect_error', (e) => {
  results.errors.push(`Caller connect error: ${e.message}`);
  console.error('[A] ❌ Connect error:', e.message);
});

// Caller receives call:answered_ready from callee accepting
socketA.on('call:answered_ready', ({ responderSocketId }) => {
  results.callerGotAnsweredReady = true;
  console.log(`[A] ✅ call:answered_ready — callee socket: ${responderSocketId}`);
  socketIdB = responderSocketId; // Note: this is the callee's actual socket ID

  // Now send the real SDP offer to the callee's specific socket
  socketA.emit('call:offer', {
    targetSocketId: responderSocketId,   // ← CORRECT: uses socket ID
    offer: FAKE_OFFER,
  });
  console.log(`[A] Sent call:offer to callee socket: ${responderSocketId}`);

  // Send a fake ICE candidate to callee
  setTimeout(() => {
    socketA.emit('call:ice', {
      targetSocketId: responderSocketId,  // ← CORRECT: socket ID based
      candidate: {
        candidate: 'candidate:1 1 UDP 2130706431 192.168.1.1 12345 typ host',
        sdpMid: 'audio',
        sdpMLineIndex: 0,
      },
    });
    results.iceFromCaller++;
    console.log('[A] Sent ICE candidate to B');
  }, 500);
});

// Caller receives answer from callee
socketA.on('call:answered', ({ answer, responderSocketId }) => {
  results.answerReceivedByCaller = true;
  console.log(`[A] ✅ call:answered from callee socket: ${responderSocketId}`);
});

// Caller receives ICE from callee
socketA.on('call:ice', ({ candidate, fromSocketId }) => {
  console.log(`[A] ✅ Received ICE from callee socket: ${fromSocketId}`);
});

socketA.on('call:user_unavailable', ({ targetUserId }) => {
  results.callUserUnavailable = true;
  results.errors.push(`call:user_unavailable fired — callee ${targetUserId} was not in room when call:initiate was sent`);
  console.error('[A] ❌ User unavailable — callee was not online/in-room');
});

socketA.on('call:ringing_offline', ({ roomId, to }) => {
  results.warnings.push(`INFO: Callee offline — push notification sent (roomId: ${roomId})`);
  console.warn('[A] ⚠️ Callee offline — push path triggered:', roomId);
});

socketA.on('error', (e) => {
  results.errors.push(`Socket A error: ${JSON.stringify(e)}`);
});

// ────────── CALLEE (Socket B) ──────────
socketB.on('connect', () => {
  results.calleeConnected = true;
  socketIdB = socketB.id;
  console.log(`[B] ✅ Callee connected: ${socketB.id}`);

  // Join user room — plain string
  socketB.emit('join', USER_ID_B);
  socketB.emit('join_user_room', { userId: USER_ID_B });
  results.calleeJoinedRoom = true;
  console.log(`[B] Joined room: user_${USER_ID_B}`);
});

socketB.on('connect_error', (e) => {
  results.errors.push(`Callee connect error: ${e.message}`);
  console.error('[B] ❌ Connect error:', e.message);
});

// Step 1: Callee receives incoming call notification
socketB.on('call:incoming', ({ callerId, callerName, callerSocketId }) => {
  results.callIncomingReceived = true;
  console.log(`[B] ✅ call:incoming from: ${callerId} (${callerName}) socket: ${callerSocketId}`);

  // Simulate accepting the call — emit call:answered_ready with caller's socket ID
  setTimeout(() => {
    socketB.emit('call:answered_ready', { callerSocketId });
    results.answeredReadySent = true;
    console.log(`[B] Sent call:answered_ready to caller socket: ${callerSocketId}`);
  }, 500);
});

// Step 2: Callee receives the actual SDP offer (after call:answered_ready)
socketB.on('call:offer', ({ offer, callerSocketId }) => {
  results.offerReceivedByCallee = true;
  console.log(`[B] ✅ call:offer received from caller socket: ${callerSocketId}`);

  // Send answer back to caller
  socketB.emit('call:answer', {
    callerSocketId,  // ← CORRECT: socket ID of the caller
    answer: FAKE_ANSWER,
  });
  results.answerSentByCallee = true;
  console.log(`[B] Sent call:answer to caller socket: ${callerSocketId}`);

  // Send ICE candidate to caller
  setTimeout(() => {
    socketB.emit('call:ice', {
      targetSocketId: callerSocketId,  // ← CORRECT: socket ID based
      candidate: {
        candidate: 'candidate:2 1 UDP 2130706431 192.168.1.2 54321 typ host',
        sdpMid: 'audio',
        sdpMLineIndex: 0,
      },
    });
    results.iceFromCallee++;
    console.log('[B] Sent ICE candidate to A');
  }, 500);
});

// Callee receives ICE from caller
socketB.on('call:ice', ({ candidate, fromSocketId }) => {
  console.log(`[B] ✅ Received ICE from caller socket: ${fromSocketId}`);
});

socketB.on('error', (e) => {
  results.errors.push(`Socket B error: ${JSON.stringify(e)}`);
});

// ────────── Print results after 12 seconds ──────────
setTimeout(() => {
  console.log('\n');
  console.log('═══════════════════════════════════════════');
  console.log('           XTOX SIGNALING TEST RESULTS     ');
  console.log('═══════════════════════════════════════════');
  console.log(`Caller connected:          ${results.callerConnected      ? '✅' : '❌'}`);
  console.log(`Callee connected:          ${results.calleeConnected      ? '✅' : '❌'}`);
  console.log(`Caller joined room:        ${results.callerJoinedRoom     ? '✅' : '❌'}`);
  console.log(`Callee joined room:        ${results.calleeJoinedRoom     ? '✅' : '❌'}`);
  console.log(`call:incoming received:    ${results.callIncomingReceived ? '✅' : '❌'}`);
  console.log(`call:answered_ready sent:  ${results.answeredReadySent    ? '✅' : '❌'}`);
  console.log(`Caller got answered_ready: ${results.callerGotAnsweredReady ? '✅' : '❌'}`);
  console.log(`call:offer sent by caller: ${results.offerSentByCaller   ? '✅' : '❌'}`);
  console.log(`call:offer received:       ${results.offerReceivedByCallee ? '✅' : '❌'}`);
  console.log(`call:answer sent:          ${results.answerSentByCallee  ? '✅' : '❌'}`);
  console.log(`call:answered received:    ${results.answerReceivedByCaller ? '✅' : '❌'}`);
  console.log(`ICE from caller:           ${results.iceFromCaller}`);
  console.log(`ICE from callee:           ${results.iceFromCallee}`);
  console.log(`user_unavailable fired:    ${results.callUserUnavailable}`);
  
  if (results.warnings.length > 0) {
    console.log('\n⚠️  Warnings:');
    results.warnings.forEach(w => console.log('  ', w));
  }
  
  if (results.errors.length > 0) {
    console.log('\n❌ Errors:');
    results.errors.forEach(e => console.log('  ', e));
  }

  const signaling_passed = 
    results.callerConnected &&
    results.calleeConnected &&
    results.callIncomingReceived &&
    results.answeredReadySent &&
    results.callerGotAnsweredReady &&
    results.offerReceivedByCallee &&
    results.answerSentByCallee &&
    results.answerReceivedByCaller;

  const partial_pass =
    results.callerConnected &&
    results.calleeConnected &&
    results.callIncomingReceived;

  console.log('\n═══════════════════════════════════════════');
  if (signaling_passed) {
    console.log('OVERALL: ✅ PASS — full signaling flow works');
  } else if (partial_pass) {
    console.log('OVERALL: ⚠️  PARTIAL — connection OK but SDP exchange incomplete');
  } else if (results.callUserUnavailable) {
    console.log('OVERALL: ❌ FAIL — room join not working (call:user_unavailable fired)');
  } else {
    console.log('OVERALL: ❌ FAIL — see errors above');
  }
  console.log('═══════════════════════════════════════════\n');

  socketA.disconnect();
  socketB.disconnect();
  process.exit(signaling_passed ? 0 : (partial_pass ? 2 : 1));
}, 12000);
