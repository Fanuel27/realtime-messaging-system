const { Server } = require('socket.io');
const { socketAuthMiddleware } = require('./middleware/auth');
const db = require('./db');
const config = require('./config');

function setupSocketIO(server) {
  const io = new Server(server, {
    cors: {
      origin: config.CLIENT_ORIGIN,
      credentials: true,
      methods: ['GET', 'POST'],
    },
  });

  // Authenticate socket connections
  io.use(socketAuthMiddleware);

  // Map of userId -> Set of socketIds (to handle multiple tabs from same user)
  const connectedUsers = new Map();

  function broadcastOnlineUsers() {
    const onlineUserIds = Array.from(connectedUsers.keys());
    io.emit('presence:update', { onlineUserIds });
  }

  io.on('connection', (socket) => {
    const user = socket.user;
    const userId = user.id;

    // Join user-specific room
    socket.join(`user:${userId}`);

    // Track active connection
    if (!connectedUsers.has(userId)) {
      connectedUsers.set(userId, new Set());
    }
    connectedUsers.get(userId).add(socket.id);

    // Broadcast updated online presence
    broadcastOnlineUsers();

    // Send current online user list to freshly connected client
    socket.emit('presence:initial', {
      onlineUserIds: Array.from(connectedUsers.keys()),
    });

    // Handle real-time message sending
    socket.on('message:send', async (data, callback) => {
      try {
        const { recipient_id, content, temp_id } = data || {};
        const targetRecipientId = parseInt(recipient_id, 10);

        if (isNaN(targetRecipientId)) {
          const errPayload = { success: false, error: 'A valid recipient_id is required.' };
          if (typeof callback === 'function') callback(errPayload);
          return socket.emit('message:error', errPayload);
        }

        if (targetRecipientId === userId) {
          const errPayload = { success: false, error: 'Cannot send a message to yourself.' };
          if (typeof callback === 'function') callback(errPayload);
          return socket.emit('message:error', errPayload);
        }

        if (typeof content !== 'string' || content.trim().length === 0) {
          const errPayload = { success: false, error: 'Message content cannot be empty.' };
          if (typeof callback === 'function') callback(errPayload);
          return socket.emit('message:error', errPayload);
        }

        if (content.trim().length > 2000) {
          const errPayload = { success: false, error: 'Message content exceeds maximum 2,000 characters.' };
          if (typeof callback === 'function') callback(errPayload);
          return socket.emit('message:error', errPayload);
        }

        // Verify recipient exists in database
        const recipient = db.findUserById(targetRecipientId);
        if (!recipient) {
          const errPayload = { success: false, error: 'Recipient user does not exist.' };
          if (typeof callback === 'function') callback(errPayload);
          return socket.emit('message:error', errPayload);
        }

        // Persist message first
        const savedMessage = db.createMessage(userId, targetRecipientId, content.trim());
        const messagePayload = {
          ...savedMessage,
          temp_id: temp_id || null,
        };

        // Broadcast to recipient and sender rooms
        io.to(`user:${targetRecipientId}`).emit('message:new', messagePayload);
        io.to(`user:${userId}`).emit('message:new', messagePayload);

        if (typeof callback === 'function') {
          callback({ success: true, message: messagePayload });
        }
      } catch (err) {
        console.error('Socket message:send error:', err);
        const errPayload = { success: false, error: 'Failed to process and send message.' };
        if (typeof callback === 'function') callback(errPayload);
        socket.emit('message:error', errPayload);
      }
    });

    // Handle client disconnect
    socket.on('disconnect', () => {
      const userSockets = connectedUsers.get(userId);
      if (userSockets) {
        userSockets.delete(socket.id);
        if (userSockets.size === 0) {
          connectedUsers.delete(userId);
        }
      }
      broadcastOnlineUsers();
    });
  });

  return io;
}

module.exports = { setupSocketIO };
