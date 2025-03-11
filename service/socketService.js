const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Message = require('../models/Message');
const User = require('../models/User');

// Maps to track connected users
const connectedUsers = new Map();
const userSockets = new Map();

// Track message read status by user
const messageReadStatus = new Map();

const setupSocketServer = (server) => {
  // Create socket.io server with proper CORS configuration
  const io = socketIo(server, {
    cors: {
      origin: process.env.CLIENT_URL || 'http://localhost:3000',
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket'],
  });

  // Socket authentication middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;
    console.log('Token received from client:', token);
    if (!token) {
      return next(new Error('Authentication error: Token missing'));
    }

    try {
      const decoded = jwt.verify(token, config.jwtSecret);
      console.log('Decoded user data:', decoded);
      socket.user = decoded;
      next();
    } catch (err) {
      console.error('Token verification failed:', err);
      return next(new Error('Authentication error: Invalid token'));
    }
  });

  // Socket.io connection handler
  io.on('connection', (socket) => {
    console.log('New client connected:', socket.id);

    // Authenticate socket connection with user token
    socket.on('authenticate', async ({ userId, username }) => {
      if (userId) {
        console.log(`User authenticated: ${username} (${userId})`);

        // Store user connection
        connectedUsers.set(socket.id, { userId, username });

        // Store socket id for this user
        if (!userSockets.has(userId)) {
          userSockets.set(userId, new Set());
        }
        userSockets.get(userId).add(socket.id);

        // Join user to their personal room
        socket.join(`user:${userId}`);

        // Notify other users that this user is online
        socket.broadcast.emit('user:online', { userId, username });

        // Send currently online users to the newly connected user
        const onlineUsers = Array.from(connectedUsers.values()).reduce(
          (unique, user) => {
            if (!unique.some((u) => u.userId === user.userId)) {
              unique.push(user);
            }
            return unique;
          },
          [],
        );

        socket.emit('users:online', onlineUsers);

        // Initialize message read status for user if not existing
        if (!messageReadStatus.has(userId)) {
          messageReadStatus.set(userId, new Set());
        }

        // Send unread message counts to all connected users
        sendUnreadCountsToAll(io);
      }
    });

    // Message sending handler
    socket.on('sendMessage', async ({ text, file, tempId }) => {
      try {
        const userData = connectedUsers.get(socket.id);
        if (!userData) {
          return socket.emit('error', { message: 'User not authenticated' });
        }

        // Get full user data from database
        const user = await User.findById(userData.userId).select('-password');
        if (!user) {
          return socket.emit('error', { message: 'User not found' });
        }

        // Create a new message
        const message = new Message({
          text: text || '',
          user: user._id,
          file: file || null,
          createdAt: new Date(),
        });

        // Save to database
        const savedMessage = await message.save();
        const populatedMessage = await Message.findById(
          savedMessage._id,
        ).populate('user', 'name avatar');

        // Sender automatically marks their own message as read
        if (messageReadStatus.has(userData.userId)) {
          messageReadStatus
            .get(userData.userId)
            .add(savedMessage._id.toString());
        }

        // Include tempId in the response to the sender
        socket.emit('newMessage', {
          ...populatedMessage.toObject(),
          tempId,
        });

        // Broadcast to everyone else WITHOUT the tempId
        socket.broadcast.emit('newMessage', populatedMessage);

        // Update unread counts for all users
        sendUnreadCountsToAll(io);
      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('error', {
          message: 'Failed to send message: ' + err.message,
        });
      }
    });

    // Handle message read status
    socket.on('message:read', async ({ messageIds }) => {
      try {
        const userData = connectedUsers.get(socket.id);
        if (!userData) {
          return socket.emit('error', { message: 'User not authenticated' });
        }

        // Update read status for this user
        if (!messageReadStatus.has(userData.userId)) {
          messageReadStatus.set(userData.userId, new Set());
        }

        // Add all message IDs to the user's read set
        for (const messageId of messageIds) {
          messageReadStatus.get(userData.userId).add(messageId);
        }

        // Notify all clients about updated read status
        sendUnreadCountsToAll(io);
      } catch (err) {
        console.error('Error updating message read status:', err);
      }
    });

    // Request for unread counts
    socket.on('unread:request', () => {
      sendUnreadCountsToAll(io);
    });

    // Handle disconnect
    socket.on('disconnect', () => {
      const userData = connectedUsers.get(socket.id);
      if (userData) {
        const { userId, username } = userData;
        console.log(`User disconnected: ${username} (${userId})`);

        // Remove from user sockets mapping
        if (userSockets.has(userId)) {
          userSockets.get(userId).delete(socket.id);
          if (userSockets.get(userId).size === 0) {
            userSockets.delete(userId);
            // Only emit offline event if user has no active connections
            socket.broadcast.emit('user:offline', { userId, username });
          }
        }

        // Remove from connected users
        connectedUsers.delete(socket.id);
      } else {
        console.log('Client disconnected:', socket.id);
      }
    });
  });

  // Function to calculate and send unread counts to all users
  const sendUnreadCountsToAll = async (io) => {
    try {
      // Get all messages from the database
      const allMessages = await Message.find({}).sort('createdAt');

      // Create a map of users to their unread message counts
      const unreadCounts = {};

      // Get all unique user IDs from connected users
      const userIds = new Set(
        Array.from(connectedUsers.values()).map((user) => user.userId),
      );

      // Initialize unread counts for all users
      for (const userId of userIds) {
        unreadCounts[userId] = {};

        // For each user, calculate unread messages from each other user
        for (const otherUserId of userIds) {
          if (userId !== otherUserId) {
            unreadCounts[userId][otherUserId] = 0;
          }
        }
      }

      // Calculate unread counts
      for (const message of allMessages) {
        const senderId = message.user.toString();
        const messageId = message._id.toString();

        // For each user, check if they've read this message
        for (const userId of userIds) {
          // Skip messages sent by the user themselves
          if (userId === senderId) continue;

          // Check if user has read this message
          const userReadMessages = messageReadStatus.get(userId) || new Set();
          if (!userReadMessages.has(messageId)) {
            // Increment unread count for this sender for this user
            if (unreadCounts[userId][senderId] !== undefined) {
              unreadCounts[userId][senderId]++;
            }
          }
        }
      }

      // Send unread counts to each user
      for (const userId of userIds) {
        if (userSockets.has(userId)) {
          io.to(`user:${userId}`).emit('unread:counts', unreadCounts[userId]);
        }
      }
    } catch (err) {
      console.error('Error calculating unread counts:', err);
    }
  };

  return { io, userSockets };
};

module.exports = setupSocketServer;
