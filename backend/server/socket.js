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
    socket.on('send_message', async (data) => {
      if (!data || !data.to) return;
      const senderId = data.from || socket.data.userId;
      const recipientId = data.to;

      // Deliver to ALL of recipient's tabs via their room
      io.to('user_' + recipientId).emit('receive_message', {
        ...data,
        delivered: true,
        timestamp: Date.now(),
      });

      // ── WhatsApp-style delivery receipt ──────────────────────
      // Check if recipient is currently online (in their room)
      try {
        const recipientSockets = await io.in('user_' + recipientId).fetchSockets();
        if (recipientSockets && recipientSockets.length > 0) {
          // Recipient is online → mark as delivered, notify sender
          socket.emit('message_delivered', {
            chatId: data.chatId,
            tempId: data.tempId || data.time,  // temp key to match local message
            recipientId,
          });

          // Persist deliveredTo in DB (non-blocking, best-effort)
          if (data.chatId && data.messageId) {
            try {
              const mongoose = await import('mongoose');
              const Chat = mongoose.default.models.Chat || (await import('../models/Chat.js')).default;
              await Chat.updateOne(
                { _id: data.chatId, 'messages._id': data.messageId },
                {
                  $set: { 'messages.$.status': 'delivered' },
                  $addToSet: { 'messages.$.deliveredTo': recipientId },
                }
              );
            } catch (dbErr) {
              // Non-fatal
            }
          }
        }
      } catch (e) { /* fetchSockets failed — proceed anyway */ }
    });

    // ── Mark messages as READ (WhatsApp-style) ──────────────────
    // Emitted by recipient when they open a chat
    socket.on('mark_read', async ({ chatId }) => {
      try {
        if (!chatId) return;
        const userId = socket.data.userId;
        if (!userId) return;

        // Persist read status in DB
        try {
          const mongoose = await import('mongoose');
          const Chat = mongoose.default.models.Chat || (await import('../models/Chat.js')).default;

          // Fetch chat to find the other participant
          const chat = await Chat.findById(chatId).select('buyer seller messages').lean();
          if (!chat) return;

          const otherId = String(chat.buyer) === String(userId)
            ? String(chat.seller)
            : String(chat.buyer);

          // Update all unread messages not sent by this user
          await Chat.updateOne(
            { _id: chatId },
            [
              {
                $set: {
                  messages: {
                    $map: {
                      input: '$messages',
                      as: 'msg',
                      in: {
                        $cond: [
                          {
                            $and: [
                              { $ne: [{ $toString: '$$msg.sender' }, userId] },
                              { $not: { $in: [{ $toObjectId: userId }, { $ifNull: ['$$msg.readBy', []] }] } },
                            ]
                          },
                          {
                            $mergeObjects: [
                              '$$msg',
                              {
                                status: 'read',
                                readBy: { $concatArrays: [{ $ifNull: ['$$msg.readBy', []] }, [{ $toObjectId: userId }]] },
                              }
                            ]
                          },
                          '$$msg'
                        ]
                      }
                    }
                  }
                }
              }
            ]
          ).catch(async () => {
            // Fallback: simpler update if aggregation pipeline fails
            await Chat.updateOne(
              { _id: chatId },
              {
                $set: { 'messages.$[elem].status': 'read' },
                $addToSet: { 'messages.$[elem].readBy': userId },
              },
              {
                arrayFilters: [
                  {
                    'elem.sender': { $ne: mongoose.default.Types.ObjectId.isValid(userId) ? new mongoose.default.Types.ObjectId(userId) : userId },
                    'elem.readBy': { $not: { $elemMatch: { $eq: mongoose.default.Types.ObjectId.isValid(userId) ? new mongoose.default.Types.ObjectId(userId) : userId } } },
                  }
                ],
              }
            );
          });

          // Reset unread counter for this user
          if (String(chat.buyer) === String(userId)) {
            await Chat.updateOne({ _id: chatId }, { $set: { unreadBuyer: 0 } });
          } else {
            await Chat.updateOne({ _id: chatId }, { $set: { unreadSeller: 0 } });
          }

          // Notify the OTHER participant that their messages were read
          io.to('user_' + otherId).emit('messages_read', {
            chatId,
            readBy: userId,
            readAt: new Date(),
          });

          console.log('[Socket] mark_read: chat', chatId, '| reader:', userId, '| notified:', otherId);
        } catch (dbErr) {
          console.error('[Socket] mark_read DB error:', dbErr.message);
        }

        // Confirm to reader that unread count is cleared
        socket.emit('unread_cleared', { chatId });
      } catch (e) {
        console.error('[Socket] mark_read error:', e.message);
      }
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
    socket.on('call:initiate', async ({ targetUserId, callerId, callerName }) => {
      // Check if target is actually in the room (Fix B: user unavailable response)
      try {
        const roomSockets = await io.in('user_' + targetUserId).fetchSockets();
        if (!roomSockets || roomSockets.length === 0) {
          socket.emit('call:user_unavailable', { targetUserId });
          console.log('[Socket] call:initiate — target user offline:', targetUserId);
          return;
        }
      } catch (e) { /* fetchSockets failed — proceed anyway */ }
      io.to('user_' + targetUserId).emit('call:incoming', {
        callerId: callerId || socket.data.userId,
        callerName: callerName || 'مستخدم',
        callerSocketId: socket.id
      });
      console.log('[Socket] call:incoming sent to user_' + targetUserId);
    });

    // get_peer_socket: return current socket ID of a user (Fix C)
    socket.on('get_peer_socket', async ({ userId }, callback) => {
      try {
        const roomSockets = await io.in('user_' + userId).fetchSockets();
        const peerSocketId = roomSockets && roomSockets.length > 0 ? roomSockets[0].id : null;
        if (typeof callback === 'function') callback({ socketId: peerSocketId });
      } catch (e) {
        if (typeof callback === 'function') callback({ socketId: null });
      }
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
