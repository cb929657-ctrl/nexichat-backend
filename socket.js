const jwt = require('jsonwebtoken');
const User = require('./models/User');

const onlineUsers = new Map();

module.exports = function initSocket(io) {
  io.use(async (socket, next) => {
    try {
      const token = socket.handshake.auth?.token;
      if (!token) return next(new Error('Authentication required'));
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findById(decoded.id);
      if (!user) return next(new Error('User not found'));
      socket.userId = user._id.toString();
      socket.user = user;
      next();
    } catch (err) {
      next(new Error('Invalid token'));
    }
  });

  io.on('connection', async (socket) => {
    const userId = socket.userId;
    onlineUsers.set(userId, socket.id);
    await User.findByIdAndUpdate(userId, { isOnline: true });
    socket.broadcast.emit('user_online', { userId });
    socket.join(userId);

    socket.on('join_conversation', (id) => socket.join(id));
    socket.on('leave_conversation', (id) => socket.leave(id));

    socket.on('send_message', (data) => {
      socket.to(data.conversationId).emit('receive_message', data.message);
    });

    socket.on('typing_start', ({ conversationId }) => {
      socket.to(conversationId).emit('typing_start', { conversationId, userId, name: socket.user.name });
    });

    socket.on('typing_stop', ({ conversationId }) => {
      socket.to(conversationId).emit('typing_stop', { conversationId, userId });
    });

    socket.on('message_read', ({ conversationId, messageId }) => {
      socket.to(conversationId).emit('message_read', { messageId, userId });
    });

    socket.on('react_message', ({ conversationId, messageId, emoji }) => {
      socket.to(conversationId).emit('react_message', { messageId, emoji, userId });
    });

    socket.on('call_user', ({ toUserId, offer, callType, fromUser }) => {
      const target = onlineUsers.get(toUserId);
      if (target) io.to(target).emit('incoming_call', { offer, callType, fromUser, fromUserId: userId });
      else socket.emit('call_failed', { message: 'User is offline' });
    });

    socket.on('answer_call', ({ toUserId, answer }) => {
      const target = onlineUsers.get(toUserId);
      if (target) io.to(target).emit('call_answered', { answer, fromUserId: userId });
    });

    socket.on('ice_candidate', ({ toUserId, candidate }) => {
      const target = onlineUsers.get(toUserId);
      if (target) io.to(target).emit('ice_candidate', { candidate, fromUserId: userId });
    });

    socket.on('end_call', ({ toUserId }) => {
      const target = onlineUsers.get(toUserId);
      if (target) io.to(target).emit('call_ended', { fromUserId: userId });
    });

    socket.on('reject_call', ({ toUserId }) => {
      const target = onlineUsers.get(toUserId);
      if (target) io.to(target).emit('call_rejected', { fromUserId: userId });
    });

    socket.on('new_status', (data) => socket.broadcast.emit('new_status', data));

    socket.on('disconnect', async () => {
      onlineUsers.delete(userId);
      await User.findByIdAndUpdate(userId, { isOnline: false, lastSeen: new Date() });
      socket.broadcast.emit('user_offline', { userId, lastSeen: new Date() });
    });
  });
};
