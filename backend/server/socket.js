// Real-time chat + voice signaling (WebRTC + Socket.IO)
// Architecture: Room-per-User pattern (Socket.IO 2025 best practice)
// Each user joins room 'user_<userId>' — supports multiple tabs/devices
// Messages delivered via io.to('user_X').emit() — no manual socket ID mapping

// ── Pending push calls: roomId → { offer, callerId, callerSocketId, to, timeout } ──
const pendingCalls = new Map();

export function initSocket(io) {

  // ── Auth middleware — decode JWT and set socket.data.userId ──────────────────
  io.use(async (socket, next) => {
    // Bug C fix: accept token from auth.token OR from Authorization header
    const authHeader = socket.handshake.headers.authorization || '';
    const headerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : authHeader;
    const token = socket.handshake.auth.token || headerToken || null;
    if (!token) return next(new Error('Unauthorized'));
    try {
      // Decode JWT to get userId — allows server to identify user without 'join' event
      const jwt = (await import('jsonwebtoken')).default;
      const JWT_SECRET = process.env.JWT_SECRET || 'xtox_secret_2024';
      const payload = jwt.verify(token, JWT_SECRET);
      const userId = payload.id || payload._id || payload.userId || null;
      if (userId) {
        socket.data.userId = String(userId);
        // Pre-join personal room immediately on connect (don't wait for 'join' event)
        socket.join('user_' + socket.data.userId);
      }
    } catch (jwtErr) {
      // Token invalid — allow connection but userId will be set via 'join' event
      // (lenient: don't disconnect, let 'join' event handle identification)
      console.warn('[Socket] JWT decode failed:', jwtErr.message);
    }
    next();
  });

  io.on('connection', (socket) => {
    console.log('[Socket] Connected:', socket.id);

    // ── Register user → join personal room ──────────────────────
    // Room-per-User pattern: all tabs for same user share the room
    socket.on('join', (payload) => {
      // Accept both plain string userId (correct) and {userId} object (defensive fallback)
      const userId = typeof payload === 'string' ? payload : (payload?.userId || null);
      if (!userId || typeof userId !== 'string') return;
      socket.data.userId = userId;
      // Join personal notification room (supports multi-tab)
      socket.join('user_' + userId);
      console.log('[Socket] User joined room:', 'user_' + userId, '| socket:', socket.id);
      // Broadcast online status to all other clients
      socket.broadcast.emit('user_online', { userId, timestamp: new Date() });

      // ── Replay any pending call for this user (Part 2: WhatsApp-style offline call) ──
      for (const [roomId, pending] of pendingCalls.entries()) {
        if (String(pending.to) === String(userId) && (Date.now() - pending.timestamp) < 60000) {
          // Replay call:incoming to the now-connected callee
          socket.emit('call:incoming', {
            callerId: pending.callerId,
            callerName: pending.callerName || 'مستخدم XTOX',
            callerSocketId: pending.callerSocketId,
          });
          // Notify caller that callee is now online and ringing in-app
          io.to('user_' + pending.callerId).emit('call:callee_connected', { calleeId: userId });
          console.log('[Socket] Replayed pending call to newly connected callee:', userId, '| roomId:', roomId);
          break; // One pending call at a time
        }
      }
    });

    // ── Check online status ─────────────────────────────────────
    socket.on('check_online', async ({ userId }, callback) => {
      if (!userId || typeof callback !== 'function') return;
      try {
        const roomSockets = await io.in('user_' + userId).fetchSockets();
        callback({ userId, online: roomSockets.length > 0 });
      } catch(e) {
        callback({ userId, online: false });
      }
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

    // Initiate call — notify the target user (offer optional, used for offline push)
    // Guard: prevent duplicate relay of same offer (e.g., due to React effect re-runs)
    const seenOffers = new Set();
    socket.on('call:initiate', async ({ targetUserId, callerId, callerName, callerAvatar, offer }) => {
      const actualCallerId = callerId || socket.data.userId;
      // Dedup: same caller→target+offer within 30s is treated as duplicate
      const offerKey = `${actualCallerId}_${targetUserId}_${(offer?.sdp || '').slice(0, 50)}`;
      if (seenOffers.has(offerKey)) {
        console.log('[Socket] call:initiate duplicate suppressed:', offerKey.slice(0, 60));
        return;
      }
      seenOffers.add(offerKey);
      setTimeout(() => seenOffers.delete(offerKey), 5000);  // 5s dedup window (reduced from 30s to allow quick retries)
      // Check if target is actually in the room
      try {
        const roomSockets = await io.in('user_' + targetUserId).fetchSockets();
        if (!roomSockets || roomSockets.length === 0) {
          // User is OFFLINE — send push notification if available
          try {
            const webpush = (await import('web-push')).default;
            // Use env vars if set, otherwise use hardcoded defaults (generated VAPID keys)
            const vapidPublicKey  = process.env.VAPID_PUBLIC_KEY  || 'BCTRfwu1JjM-5_-xGHauSSiVOBd6dkyEJJp3L57_-C6B-oDQW2IAmcnEVpwsGAsvmhBsvWLu9tMHe29zmcOn0UU';
            const vapidPrivateKey = process.env.VAPID_PRIVATE_KEY || '324Nf1YsyLKC_Mo0aQcTLqEYO7r1DraMQPLTxY43F3Q';
            const vapidSubject    = process.env.VAPID_SUBJECT || 'mailto:xtox@xtox.com';

            if (vapidPublicKey && vapidPrivateKey) {
              webpush.setVapidDetails(vapidSubject, vapidPublicKey, vapidPrivateKey);

              const PushSubscription = (await import('../models/PushSubscription.js')).default;
              const subs = await PushSubscription.find({ user: targetUserId }).lean();

              if (subs.length > 0) {
                // Generate a unique roomId for this pending call
                const roomId = `call_${actualCallerId}_${targetUserId}_${Date.now()}`;
                
                const payload = JSON.stringify({
                  type: 'incoming_call',
                  callerId: actualCallerId,
                  callerName: callerName || 'مستخدم XTOX',
                  callerAvatar: callerAvatar || '',
                  offer: offer || null,   // SDP offer for offline answering
                  roomId,
                  title: `📞 مكالمة واردة من ${callerName || 'مستخدم XTOX'}`,
                  body: 'اضغط للرد أو الرفض',
                  icon: '/favicon.ico',
                  badge: '/favicon.ico',
                  tag: `call-${roomId}`,
                  requireInteraction: true,
                  data: {
                    type: 'incoming_call',
                    callerId: actualCallerId,
                    callerName: callerName || 'مستخدم XTOX',
                    offer: offer || null,
                    roomId,
                    url: `/chat?call=incoming&roomId=${roomId}&callerId=${actualCallerId}`,
                  },
                  actions: [
                    { action: 'accept', title: '✅ رد' },
                    { action: 'reject', title: '❌ رفض' },
                  ],
                });

                let sent = 0;
                for (const sub of subs) {
                  try {
                    await webpush.sendNotification(sub.subscription, payload);
                    sent++;
                  } catch (err) {
                    if (err.statusCode === 410) {
                      await PushSubscription.deleteOne({ _id: sub._id }).catch(() => {});
                    }
                  }
                }

                if (sent > 0) {
                  // Store pending call with 60s TTL
                  const timeout = setTimeout(() => {
                    pendingCalls.delete(roomId);
                    // Notify caller that callee never answered
                    try {
                      io.to('user_' + actualCallerId).emit('call:no_answer', { calleeId: targetUserId });
                      io.to('user_' + actualCallerId).emit('call:expired', { roomId });
                    } catch {}
                  }, 60000);
                  pendingCalls.set(roomId, {
                    offer,
                    callerId: actualCallerId,
                    callerName: callerName || 'مستخدم XTOX',
                    callerSocketId: socket.id,
                    to: targetUserId,
                    timeout,
                    timestamp: Date.now(),
                  });

                  // Tell caller we're ringing the offline user
                  socket.emit('call:ringing_offline', { roomId, to: targetUserId });
                  console.log('[Push] Sent call notification to', sent, 'subscription(s), roomId:', roomId);
                  return;
                }
              }
            }
          } catch (pushErr) {
            console.error('[Push] Failed to send call notification:', pushErr.message);
          }

          // No push subscription available — still store pending call (will replay when callee connects)
          const fallbackRoomId = `call_${actualCallerId}_${targetUserId}_${Date.now()}`;
          const fallbackTimeout = setTimeout(() => {
            pendingCalls.delete(fallbackRoomId);
            try {
              io.to('user_' + actualCallerId).emit('call:no_answer', { calleeId: targetUserId });
              io.to('user_' + actualCallerId).emit('call:expired', { roomId: fallbackRoomId });
            } catch {}
          }, 60000);
          pendingCalls.set(fallbackRoomId, {
            offer,
            callerId: actualCallerId,
            callerName: callerName || 'مستخدم XTOX',
            callerSocketId: socket.id,
            to: targetUserId,
            timeout: fallbackTimeout,
            timestamp: Date.now(),
          });
          socket.emit('call:ringing_offline', {
            roomId: fallbackRoomId,
            to: targetUserId,
            message: 'جارٍ الاتصال... المستخدم خارج التطبيق',
          });
          console.log('[Socket] call:initiate — stored pending call (no push subs):', targetUserId, '| roomId:', fallbackRoomId);
          return;
        }
      } catch (e) { /* fetchSockets failed — proceed anyway */ }
      io.to('user_' + targetUserId).emit('call:incoming', {
        callerId: actualCallerId,
        callerName: callerName || 'مستخدم',
        callerSocketId: socket.id,
      });
      console.log('[Socket] call:incoming sent to user_' + targetUserId);
    });

    // ── Offline push call: callee accepts via push notification ──────────
    socket.on('call:accept_from_push', async ({ roomId, answer }) => {
      const pending = pendingCalls.get(roomId);
      if (!pending) {
        socket.emit('call:expired', { roomId });
        return;
      }
      clearTimeout(pending.timeout);
      pendingCalls.delete(roomId);
      // Relay answer to the original caller
      io.to(pending.callerSocketId).emit('call:answered', {
        answer,
        responderSocketId: socket.id,
      });
      // Tell callee to proceed
      socket.emit('call:accepted_ok', { callerId: pending.callerId, callerSocketId: pending.callerSocketId });
      console.log('[Socket] call:accept_from_push — roomId:', roomId, 'callee:', socket.id);
    });

    // ── Offline push call: callee rejects via push notification ──────────
    socket.on('call:reject_from_push', ({ roomId }) => {
      const pending = pendingCalls.get(roomId);
      if (pending) {
        clearTimeout(pending.timeout);
        pendingCalls.delete(roomId);
        io.to(pending.callerSocketId).emit('call:rejected');
        console.log('[Socket] call:reject_from_push — roomId:', roomId);
      }
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
      // Clean up any pending call for this callee
      const calleeId = socket.data.userId;
      if (calleeId) {
        for (const [roomId, pending] of pendingCalls.entries()) {
          if (String(pending.to) === String(calleeId)) {
            clearTimeout(pending.timeout);
            pendingCalls.delete(roomId);
            break;
          }
        }
      }
    });

    // Reject incoming call
    socket.on('call:reject', ({ callerSocketId }) => {
      io.to(callerSocketId).emit('call:rejected');
      // Clean up any pending call for this callee
      const calleeId = socket.data.userId;
      if (calleeId) {
        for (const [roomId, pending] of pendingCalls.entries()) {
          if (String(pending.to) === String(calleeId)) {
            clearTimeout(pending.timeout);
            pendingCalls.delete(roomId);
            break;
          }
        }
      }
    });

    // ICE candidate relay
    socket.on('call:ice', ({ targetSocketId, candidate }) => {
      io.to(targetSocketId).emit('call:ice', { candidate, fromSocketId: socket.id });
    });

    // End call
    socket.on('call:end', ({ otherSocketId }) => {
      io.to(otherSocketId).emit('call:ended');
      // Clean up any pending call for this user (caller or callee)
      const userId = socket.data.userId;
      if (userId) {
        for (const [roomId, pending] of pendingCalls.entries()) {
          if (String(pending.callerId) === String(userId) || String(pending.to) === String(userId)) {
            clearTimeout(pending.timeout);
            pendingCalls.delete(roomId);
            break;
          }
        }
      }
    });

    // Cancel outgoing call before callee answers (notify callee to stop ringing)
    // Caller knows targetUserId but not callee's socket ID yet
    socket.on('call:cancel', ({ targetUserId }) => {
      if (!targetUserId) return;
      io.to('user_' + targetUserId).emit('call:cancelled', {
        callerId: socket.data.userId,
      });
      console.log('[Socket] call:cancel — caller:', socket.data.userId, '→ callee room:', 'user_' + targetUserId);
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
          // Broadcast offline status to all other clients
          socket.broadcast.emit('user_offline', { userId, timestamp: new Date() });
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
