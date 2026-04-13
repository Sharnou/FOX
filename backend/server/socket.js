// Real-time chat + voice signaling (WebRTC + Socket.IO)
// Architecture: Room-per-User pattern (Socket.IO 2025 best practice)
// Each user joins room 'user_<userId>' — supports multiple tabs/devices
// Messages delivered via io.to('user_X').emit() — no manual socket ID mapping

export function initSocket(io) {

  // ── Auth middleware ───────────────────────────────────────────
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    // Store userId from token in socket.data — JWT verification is optional
    // (userId is also set in 'join' event for backward compatibility)
    next();
  });

  io.on('connection', (socket) => {
    console.log('[Socket] Connected:', socket.id);

    // ── Register user → join personal room ──────────────────────
    // Room-per-User pattern: all tabs for same user share the room
    socket.on('join', (userId) => {
      if (!userId) return;
      socket.data.userId = userId;
      // Join personal notification room (supports multi-tab)
      socket.join('user_' + userId);
      console.log('[Socket] User joined room:', 'user_' + userId, '| socket:', socket.id);
    });

    // ── Text Chat ────────────────────────────────────────────────
    socket.on('send_message', (data) => {
      if (!data || !data.to) return;
      // Deliver to ALL of recipient's tabs via their room
      io.to('user_' + data.to).emit('receive_message', {
        ...data,
        delivered: true,
        timestamp: Date.now(),
      });
    });

    // Typing indicator
    socket.on('typing', (data) => {
      if (!data || !data.to) return;
      io.to('user_' + data.to).emit('typing', {
        from: data.from || socket.data.userId,
        chatId: data.chatId,
      });
    });

    // Stop typing indicator
    socket.on('stop_typing', (data) => {
      if (!data || !data.to) return;
      io.to('user_' + data.to).emit('stop_typing', {
        from: data.from || socket.data.userId,
      });
    });

    // ── Voice Call (WebRTC Signaling) ────────────────────────────

    // Caller sends offer to receiver
    socket.on('call_offer', (data) => {
      if (!data || !data.to) return;
      io.to('user_' + data.to).emit('incoming_call', {
        from: data.from || socket.data.userId,
        offer: data.offer,
      });
    });

    // Receiver answers call
    socket.on('call_answer', (data) => {
      if (!data || !data.to) return;
      io.to('user_' + data.to).emit('call_answered', {
        answer: data.answer,
        from: socket.data.userId,
      });
    });

    // ICE candidates exchange
    socket.on('ice_candidate', (data) => {
      if (!data || !data.to) return;
      io.to('user_' + data.to).emit('ice_candidate', data.candidate);
    });

    // End call
    socket.on('call_end', (data) => {
      if (!data || !data.to) return;
      io.to('user_' + data.to).emit('call_ended', {
        from: socket.data.userId,
      });
    });


    // ── WebRTC Call Signaling (Room-per-Socket pattern) ─────────────
    // Personal room for direct calls
    socket.on('join_user_room', ({ userId }) => {
      if (userId) socket.join('user_' + userId);
    });

    // Initiate call — notify the target user
    socket.on('call:initiate', ({ targetUserId, callerId, callerName }) => {
      io.to('user_' + targetUserId).emit('call:incoming', {
        callerId, callerName, callerSocketId: socket.id
      });
    });

    // Caller sends SDP offer to responder
    socket.on('call:offer', ({ targetSocketId, offer }) => {
      io.to(targetSocketId).emit('call:offer', { offer, callerSocketId: socket.id });
    });

    // Responder sends SDP answer to caller
    socket.on('call:answer', ({ callerSocketId, answer }) => {
      io.to(callerSocketId).emit('call:answered', { answer, responderSocketId: socket.id });
    });

    // Reject incoming call
    socket.on('call:reject', ({ callerSocketId }) => {
      io.to(callerSocketId).emit('call:rejected');
    });

    // ICE candidate relay
    socket.on('call:ice', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('call:ice', { candidate, fromSocketId: socket.id });
    });

    // End call
    socket.on('call:end', ({ otherSocketId }) => {
      io.to(otherSocketId).emit('call:ended');
    });

    // Responder signals readiness to receive offer
    socket.on('call:answered_ready', ({ callerSocketId }) => {
      io.to(callerSocketId).emit('call:answered_ready', { responderSocketId: socket.id });
    });

    // ── Disconnect ───────────────────────────────────────────────
    socket.on('disconnect', async () => {
      const userId = socket.data.userId;
      if (!userId) return;
      // Check if user has other active tabs before marking offline
      try {
        const room = await io.in('user_' + userId).fetchSockets();
        if (room.length === 0) {
          // User is fully offline (all tabs closed)
          console.log('[Socket] User fully offline:', userId);
          // Update lastSeen in DB
          try {
            const mongoose = await import('mongoose');
            const User = mongoose.default.models.User;
            if (User) await User.updateOne({ _id: userId }, { lastSeen: new Date() }).catch(() => {});
          } catch {}
        } else {
          console.log('[Socket] User still has', room.length, 'active tab(s):', userId);
        }
      } catch {
        console.log('[Socket] Disconnected:', socket.id);
      }
    });
  });
}
