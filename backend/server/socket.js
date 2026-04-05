// Clean 1-to-1 voice + chat system (WebRTC + Socket.IO)
const users = {}; // userId -> socketId

export function initSocket(io) {
  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    next();
  });

  io.on('connection', (socket) => {
    console.log('[Socket] Connected:', socket.id);

    // ─── Register user ───────────────────────────
    socket.on('join', (userId) => {
      users[userId] = socket.id;
      socket.userId = userId;
      // Join user-specific room for targeted notifications (offers, etc.)
      socket.join('user_' + userId);
      console.log(`[Socket] User joined: ${userId}`);
    });

    // ─── Text Chat ───────────────────────────────
    socket.on('send_message', (data) => {
      const targetSocket = users[data.to];
      if (targetSocket) {
        io.to(targetSocket).emit('receive_message', {
          ...data,
          delivered: true
        });
      }
    });

    // Typing indicator
    socket.on('typing', (data) => {
      const targetSocket = users[data.to];
      if (targetSocket) io.to(targetSocket).emit('typing', { from: data.from });
    });

    // ─── Voice Call (WebRTC Signaling) ───────────

    // Caller sends offer to receiver
    socket.on('call_offer', (data) => {
      const targetSocket = users[data.to];
      if (targetSocket) {
        io.to(targetSocket).emit('incoming_call', {
          from: data.from || socket.userId,
          offer: data.offer
        });
      }
    });

    // Receiver answers call
    socket.on('call_answer', (data) => {
      const targetSocket = users[data.to];
      if (targetSocket) {
        io.to(targetSocket).emit('call_answered', {
          answer: data.answer,
          from: socket.userId
        });
      }
    });

    // ICE candidates exchange
    socket.on('ice_candidate', (data) => {
      const targetSocket = users[data.to];
      if (targetSocket) {
        io.to(targetSocket).emit('ice_candidate', data.candidate);
      }
    });

    // End call
    socket.on('call_end', (data) => {
      const targetSocket = users[data.to];
      if (targetSocket) {
        io.to(targetSocket).emit('call_ended', { from: socket.userId });
      }
    });

    // ─── Disconnect ──────────────────────────────
    socket.on('disconnect', () => {
      if (socket.userId && users[socket.userId] === socket.id) {
        delete users[socket.userId];
        console.log(`[Socket] User left: ${socket.userId}`);
      }
    });
  });
}
