import { encrypt } from './encryption.js';

export function initSocket(io) {
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    if (!token) return next(new Error('Unauthorized'));
    next();
  });
  io.on('connection', (socket) => {
    socket.on('join', (userId) => socket.join(userId));
    socket.on('send_message', (data) => {
      io.to(data.to).emit('receive_message', data);
    });
    socket.on('typing', (data) => io.to(data.to).emit('typing', { from: data.from }));
    // WebRTC signaling
    socket.on('call_offer', (data) => io.to(data.to).emit('call_offer', data));
    socket.on('call_answer', (data) => io.to(data.to).emit('call_answer', data));
    socket.on('ice_candidate', (data) => io.to(data.to).emit('ice_candidate', data));
    socket.on('call_end', (data) => io.to(data.to).emit('call_end', data));
  });
}
