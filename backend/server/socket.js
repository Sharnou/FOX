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

  io.on('connection', async (socket) => {
    console.log('[Socket] Connected:', socket.id);

    // ── Mark user online in DB on connect ────────────────────────
    const connectedUserId = socket.data.userId;
    if (connectedUserId) {
      try {
        const mongoose = await import('mongoose');
        const User = mongoose.default.models.User;
        if (User) {
          await User.updateOne({ _id: connectedUserId }, { isOnline: true, lastSeen: new Date() });
        }
        // Broadcast online status to all clients
        io.emit('user:status', { userId: connectedUserId, isOnline: true, lastSeen: new Date() });
      } catch (e) {
        console.warn('[Socket] Failed to update online status on connect:', e.message);
      }
    }

    // ── Register user → join personal room ──────────────────────
    // Room-per-User pattern: all tabs for same user share the room
    socket.on('join', async (payload) => {
      // Guard: only process first join per socket (prevents 4-5x duplicate joins from React re-renders)
      if (socket._xtoxJoined) return;
      socket._xtoxJoined = true;
      // Accept both plain string userId (correct) and {userId} object (defensive fallback)
      const userId = typeof payload === 'string' ? payload : (payload?.userId || null);
      if (!userId || typeof userId !== 'string') { socket._xtoxJoined = false; return; }
      socket.data.userId = userId;
      // Join personal notification room (supports multi-tab)
      socket.join('user_' + userId);
      console.log('[Socket] User joined room:', 'user_' + userId, '| socket:', socket.id);
      // Broadcast online status to all other clients
      socket.broadcast.emit('user_online', { userId, timestamp: new Date() });
      // Fix B: also emit user:status (standardized event) so any chat page
      // that missed the connect-time broadcast picks up the online status
      io.emit('user:status', { userId, isOnline: true });

      // ── Replay any pending call for this user (Part 2: WhatsApp-style offline call) ──
      for (const [roomId, pending] of pendingCalls.entries()) {
        // FIX-DUP: skip entries already delivered via room emit to online callee
        if (String(pending.to) === String(userId) && (Date.now() - pending.timestamp) < 60000 && !pending.delivered) {
          // Replay call:incoming to the now-connected callee
          socket.emit('call:incoming', {
            callerId: pending.callerId,
            callerName: pending.callerName || 'مستخدم XTOX',
            callerAvatar: '',
            callerSocketId: pending.callerSocketId,
            offer: pending.offer || null,  // B1: include stored offer for acceptCall()
          });
          // Notify caller that callee is now online and ringing in-app
          io.to('user_' + pending.callerId).emit('call:callee_connected', { calleeId: userId });
          console.log('[Socket] Replayed pending call to newly connected callee:', userId, '| roomId:', roomId);
          break; // One pending call at a time
        }
      }

      // ── Offline message delivery: emit pending_messages for each chat with unread msgs ──
      try {
        const _ChatModel = (await import('../models/Chat.js')).default;
        const pendingChats = await _ChatModel.find({
          $or: [
            { buyer: userId, unreadBuyer: { $gt: 0 } },
            { seller: userId, unreadSeller: { $gt: 0 } },
          ],
          status: { $ne: 'closed' },
          deletedBy: { $ne: userId },
        })
        .select('_id buyer seller unreadBuyer unreadSeller messages adTitle')
        .lean();

        for (const chat of pendingChats) {
          const isBuyer = String(chat.buyer) === String(userId);
          const count = isBuyer ? (chat.unreadBuyer || 0) : (chat.unreadSeller || 0);
          if (count <= 0) continue;
          const otherId = isBuyer ? String(chat.seller) : String(chat.buyer);
          const msgs = chat.messages || [];
          const lastMsg = msgs.length > 0 ? msgs[msgs.length - 1] : null;
          socket.emit('pending_messages', {
            chatId: String(chat._id),
            count,
            lastMessage: lastMsg ? {
              text: lastMsg.text || '',
              type: lastMsg.type || 'text',
              createdAt: lastMsg.createdAt,
            } : null,
            senderId: otherId,
          });
        }
        if (pendingChats.length > 0) {
          console.log('[Socket] pending_messages: sent', pendingChats.length, 'notifications to user:', userId);
        }
      } catch (pendingErr) {
        console.warn('[Socket] pending_messages check error:', pendingErr.message);
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
    // Emitted by recipient when they open a chat.
    // PERMANENT FIX: use plain object $set (NOT array) — no updatePipeline needed.
    // otherId declared at top-level so it is always in scope (no scope-related ReferenceError).
    socket.on('mark_read', async ({ chatId, userId: payloadUserId }) => {
      try {
        if (!chatId) return;
        // Accept userId from payload (frontend) or from authenticated socket
        const userId = payloadUserId || socket.data.userId;
        if (!userId) return;

        const mongoose = await import('mongoose');
        const Chat = mongoose.default.models.Chat || (await import('../models/Chat.js')).default;

        const chat = await Chat.findById(chatId).select('buyer seller').lean();
        if (!chat) return;

        const isBuyer  = String(chat.buyer)  === String(userId);
        const isSeller = String(chat.seller) === String(userId);
        if (!isBuyer && !isSeller) return;

        // otherId always defined here — no scope issues
        const otherId = isBuyer ? String(chat.seller) : String(chat.buyer);
        const field   = isBuyer ? 'unreadBuyer' : 'unreadSeller';

        // Plain object update — NOT an array. Avoids the updatePipeline error.
        await Chat.updateOne({ _id: chatId }, { $set: { [field]: 0 } });

        // Notify the OTHER participant that their messages were read
        if (otherId) {
          io.to('user_' + otherId).emit('messages_read', {
            chatId,
            readBy: userId,
            by: userId,
            readAt: new Date(),
          });
        }

        // Confirm to reader that unread count is cleared
        socket.emit('unread_cleared', { chatId, senderId: otherId });

        console.log('[Socket] mark_read: chat', chatId, '| reader:', userId, '| notified:', otherId);
      } catch (err) {
        console.error('[Socket] mark_read error:', err.message);
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

    // ── WebRTC Call Signaling (Room-per-Socket pattern) ─────────────
    // Personal room for direct calls
    socket.on('join_user_room', ({ userId }) => {
      if (userId) socket.join('user_' + userId);
    });

    // Initiate call — notify the target user (offer optional, used for offline push)
    // Guard: prevent duplicate relay of same offer (e.g., due to React effect re-runs)
    const seenOffers = new Set();
    socket.on('call:initiate', async ({ targetUserId, calleeId, callerId, callerName, callerAvatar, offer }) => {
      // B1: accept calleeId OR targetUserId from frontend
      targetUserId = targetUserId || calleeId;
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
            const vapidSubject    = process.env.VAPID_SUBJECT || 'mailto:XTOX@XTOX.com';

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
                  callerSocketId: socket.id,   // Fix #82/#83: callee needs this to reconnect
                  offer: offer || null,          // SDP offer for offline answering
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
                    callerSocketId: socket.id,  // Fix #82/#83: for direct reconnect
                    offer: offer || null,
                    roomId,
                    url: `/chat?call=incoming&roomId=${roomId}&callerId=${actualCallerId}`,
                  },
                  actions: [
                    { action: 'answer', title: '📞 رد' },   // Fix #83: must match SW notificationclick handler
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
                  // Store pending call with 45s TTL
                  const timeout = setTimeout(() => {
                    pendingCalls.delete(roomId);
                    // Notify caller that callee never answered
                    try {
                      io.to('user_' + actualCallerId).emit('call:no_answer', { calleeId: targetUserId });
                      io.to('user_' + actualCallerId).emit('call:expired', { roomId });
                    } catch {}
                  }, 45000);
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
                  socket.emit('call:push_sent', { calleeId: targetUserId });
                  console.log('[Push] Sent call notification to', sent, 'subscription(s), roomId:', roomId);
                  return;
                }
              }
            }
          } catch (pushErr) {
            console.error('[Push] Failed to send call notification:', pushErr.message);
          }

          // No push subscription available — notify caller immediately
          socket.emit('call:no_answer', { calleeId: targetUserId });
          console.log('[Socket] call:initiate — no push subscriptions for:', targetUserId);
          return;
        }
      } catch (e) { /* fetchSockets failed — proceed anyway */ }
      // FIX E: Auto system message on call — notify both parties via chat history
      try {
        const _ChatModel = await import('../models/Chat.js').then(m => m.default);
        const _mongoose  = await import('mongoose');
        const _User = _mongoose.default.models.User;
        const _callChat = await _ChatModel.findOne({
          $or: [
            { buyer: actualCallerId, seller: targetUserId },
            { buyer: targetUserId, seller: actualCallerId },
          ],
          status: 'active',
        }).select('_id buyer seller').lean();
        if (_callChat) {
          let _callerDisplayName = callerName || 'مستخدم XTOX';
          if (_User && _callerDisplayName === 'مستخدم XTOX') {
            const _callerDoc = await _User.findById(actualCallerId).select('name username xtoxId').lean().catch(() => null);
            if (_callerDoc) _callerDisplayName = _callerDoc.name || _callerDoc.username || _callerDoc.xtoxId || 'مستخدم XTOX';
          }
          const _callMsgText = `📞 ${_callerDisplayName} يتصل بك`;
          await _ChatModel.findByIdAndUpdate(_callChat._id, {
            $push: { messages: { sender: actualCallerId, text: _callMsgText, type: 'system', status: 'delivered' } }
          }).catch(() => {});
          io.to('user_' + _callChat.buyer?.toString()).emit('system_message', { chatId: _callChat._id, text: _callMsgText });
          io.to('user_' + _callChat.seller?.toString()).emit('system_message', { chatId: _callChat._id, text: _callMsgText });
        }
      } catch (_callSmsErr) {
        console.warn('[Socket] call system message error:', _callSmsErr.message);
      }

      // Emit call:incoming WITH offer so callee can do full WebRTC setup in acceptCall()
      io.to('user_' + targetUserId).emit('call:incoming', {
        callerId: actualCallerId,
        callerName: callerName || 'مستخدم',
        callerAvatar: callerAvatar || '',
        callerSocketId: socket.id,
        offer: offer || null,
      });
      console.log('[Socket] call:incoming (with offer) sent to user_' + targetUserId);
      // 30-second no-answer timeout for online callee
      const onlineNoAnswerKey = `online_${actualCallerId}_${targetUserId}`;
      const onlineTimeout = setTimeout(() => {
        pendingCalls.delete(onlineNoAnswerKey);
        try {
          io.to('user_' + actualCallerId).emit('call:no_answer', { calleeId: targetUserId });
          io.to('user_' + targetUserId).emit('call:cancelled', { callerId: actualCallerId });
        } catch {}
      // FIX-RACE: increase from 30s → 45s to reduce no-answer race condition
      }, 45000);
      pendingCalls.set(onlineNoAnswerKey, {
        offer: null, callerId: actualCallerId, callerName, callerSocketId: socket.id,
        to: targetUserId, timeout: onlineTimeout, timestamp: Date.now(),
        // FIX-DUP: mark as already delivered to prevent join-handler replay
        // (JWT middleware pre-joins the room so _xtoxJoined is NOT set yet
        //  when call:incoming is emitted; the later 'join' event replay would
        //  re-emit call:incoming to the same socket causing a duplicate)
        delivered: true,
      });
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
      // Relay answer to the original caller — emit call:accepted (matches frontend socket.once)
      // FIX-RACE: emit to specific socket AND to user room (handles stale callerSocketId)
      io.to(pending.callerSocketId).emit('call:accepted', {
        answer,
        calleeSocketId: socket.id,
      });
      // Also emit to caller's user room in case their socket ID changed
      if (pending.callerId) {
        io.to('user_' + pending.callerId).emit('call:accepted', {
          answer,
          calleeSocketId: socket.id,
        });
      }
      // Tell callee to proceed with callerSocketId so it can send ICE
      socket.emit('call:accepted_ok', { callerId: pending.callerId, callerSocketId: pending.callerSocketId });
      console.log('[Socket] call:accept_from_push — roomId:', roomId, '| callee:', socket.id, '→ caller:', pending.callerSocketId);
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
      // Emit call:accepted — matches frontend socket.once('call:accepted')
      // FIX-RACE: emit to specific socket AND to user room for resilience.
      // If the caller's socket reconnected after call:initiate (new socket ID),
      // the room emit ensures call:accepted is still delivered.
      io.to(callerSocketId).emit('call:accepted', { answer, calleeSocketId: socket.id });

      // Clean up any pending call for this callee (online timeout or push pending)
      const calleeId = socket.data.userId;
      if (calleeId) {
        for (const [roomId, pending] of pendingCalls.entries()) {
          if (String(pending.to) === String(calleeId)) {
            clearTimeout(pending.timeout);
            pendingCalls.delete(roomId);
            // Also emit to caller's user room (handles stale callerSocketId after reconnect)
            if (pending.callerId) {
              io.to('user_' + pending.callerId).emit('call:accepted', { answer, calleeSocketId: socket.id });
            }
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
    socket.on('call:end', ({ targetSocketId, otherSocketId }) => {
      const dest = targetSocketId || otherSocketId;
      if (!dest) return;
      io.to(dest).emit('call:ended');
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
      // FIX: clear pending call so the no-answer timer doesn't fire spuriously
      const callerId = socket.data.userId;
      if (callerId) {
        for (const [roomId, pending] of pendingCalls.entries()) {
          if (String(pending.callerId) === String(callerId) && String(pending.to) === String(targetUserId)) {
            clearTimeout(pending.timeout);
            pendingCalls.delete(roomId);
          }
        }
      }
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
          const nowOffline = new Date();
          // Broadcast offline status to all other clients
          socket.broadcast.emit('user_offline', { userId, timestamp: nowOffline });
          // Broadcast structured user:status event for online indicator UI
          io.emit('user:status', { userId, isOnline: false, lastSeen: nowOffline });
          // Update isOnline=false + lastSeen in DB
          try {
            const mongoose = await import('mongoose');
            const User = mongoose.default.models.User;
            if (User) await User.updateOne({ _id: userId }, { isOnline: false, lastSeen: nowOffline }).catch(() => {});
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
