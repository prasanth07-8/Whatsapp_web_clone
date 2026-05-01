const User = require('../models/User');

const onlineUsers = new Map(); // userId -> socketId

module.exports = (io) => {
  io.on('connection', (socket) => {

    socket.on('user_online', async (userId) => {
      onlineUsers.set(userId, socket.id);
      await User.findByIdAndUpdate(userId, { lastSeen: null });
      io.emit('online_users', Array.from(onlineUsers.keys()));
      io.emit('user_last_seen', { userId, lastSeen: null });

      try {
        const Chat    = require('../models/Chat');
        const Message = require('../models/Message');

        // Join ALL chat rooms this user is part of so they receive messages even without opening a chat
        const userChats = await Chat.find({ participants: userId, deletedFor: { $ne: userId } }).select('_id');
        for (const chat of userChats) {
          socket.join(chat._id.toString());
        }

        // Auto-deliver all 'sent' messages addressed to this user
        const undelivered = await Message.find({
          receiverId: userId,
          status: 'sent',
          isDeleted: false,
        }).select('_id chatId senderId');

        for (const msg of undelivered) {
          await Message.findByIdAndUpdate(msg._id, { status: 'delivered' });
          const senderSocket = onlineUsers.get(msg.senderId.toString());
          if (senderSocket) {
            io.to(senderSocket).emit('message_status_update', {
              messageId: msg._id,
              status: 'delivered',
            });
          }
        }
      } catch (e) { /* non-critical */ }
    });

    // Profile updated — broadcast to all so contacts see new avatar/tagline
    socket.on('profile_updated', (profileData) => {
      socket.broadcast.emit('user_profile_updated', profileData);
    });

    socket.on('join_room', async (chatId) => {
      socket.join(chatId);

      // Find who this socket belongs to
      let thisUserId = null;
      for (const [uid, sid] of onlineUsers.entries()) {
        if (sid === socket.id) { thisUserId = uid; break; }
      }
      if (!thisUserId) return;

      // Mark all 'sent' messages in this chat addressed to this user as 'delivered'
      try {
        const Message = require('../models/Message');
        const undelivered = await Message.find({
          chatId,
          receiverId: thisUserId,
          status: 'sent',
          isDeleted: false,
        }).select('_id senderId');

        for (const msg of undelivered) {
          await Message.findByIdAndUpdate(msg._id, { status: 'delivered' });
          const senderSocket = onlineUsers.get(msg.senderId.toString());
          if (senderSocket) {
            io.to(senderSocket).emit('message_status_update', {
              messageId: msg._id,
              status: 'delivered',
            });
          }
        }
      } catch (e) { /* non-critical */ }
    });
    socket.on('leave_room', (chatId) => socket.leave(chatId));

    socket.on('send_message', (message) => {
      io.to(message.chatId).emit('receive_message', message);
    });

    socket.on('message_deleted', (msg) => io.to(msg.chatId).emit('message_updated', msg));
    socket.on('message_edited',  (msg) => io.to(msg.chatId).emit('message_updated', msg));
    socket.on('message_starred', (msg) => io.to(msg.chatId).emit('message_updated', msg));
    socket.on('message_pinned',  (msg) => io.to(msg.chatId).emit('message_updated', msg));

    // Chat cleared — tell both users to wipe messages
    socket.on('chat_cleared', (chatId) => {
      io.to(chatId).emit('chat_cleared', chatId);
    });

    socket.on('message_delivered', ({ messageId, chatId, senderId }) => {
      const senderSocket = onlineUsers.get(senderId);
      if (senderSocket) io.to(senderSocket).emit('message_status_update', { messageId, status: 'delivered' });
    });

    socket.on('messages_read', ({ chatId, senderId }) => {
      const senderSocket = onlineUsers.get(senderId);
      if (senderSocket) io.to(senderSocket).emit('messages_read_update', { chatId });
    });

    socket.on('typing',      ({ chatId, username }) => socket.to(chatId).emit('typing',      { chatId, username }));
    socket.on('stop_typing', (chatId)               => socket.to(chatId).emit('stop_typing', { chatId }));

    socket.on('disconnect', async () => {
      let disconnectedUserId = null;
      for (const [userId, sid] of onlineUsers.entries()) {
        if (sid === socket.id) {
          disconnectedUserId = userId;
          onlineUsers.delete(userId);
          break;
        }
      }
      if (disconnectedUserId) {
        const now = new Date();
        // Save lastSeen to DB
        await User.findByIdAndUpdate(disconnectedUserId, { lastSeen: now });
        // Broadcast updated online list + lastSeen info
        io.emit('online_users', Array.from(onlineUsers.keys()));
        io.emit('user_last_seen', { userId: disconnectedUserId, lastSeen: now });
      }
    });
  });
};
