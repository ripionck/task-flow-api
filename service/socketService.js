const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const config = require('../config/config');
const Message = require('../models/Message');
const User = require('../models/User');

// Maps to track connected users
const connectedUsers = new Map();
const userSockets = new Map();

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
      }
    });

    // Join a board room to receive updates for that board
    socket.on('board:join', (boardId) => {
      if (boardId) {
        console.log(`Socket ${socket.id} joined board: ${boardId}`);
        socket.join(`board:${boardId}`);
      }
    });

    // Leave a board room
    socket.on('board:leave', (boardId) => {
      if (boardId) {
        console.log(`Socket ${socket.id} left board: ${boardId}`);
        socket.leave(`board:${boardId}`);
      }
    });

    // Handle user typing in comments or chat
    socket.on('comment:typing', ({ taskId, isTyping }) => {
      const userData = connectedUsers.get(socket.id);
      if (userData && taskId) {
        // For global chat use 'global' as taskId
        const room = taskId === 'global' ? 'global' : `task:${taskId}`;

        // Broadcast to appropriate room
        socket.to(room).emit('comment:typing', {
          taskId,
          user: userData,
          isTyping,
        });
      }
    });

    // Join a task room to receive updates for comments
    socket.on('task:join', (taskId) => {
      if (taskId) {
        console.log(`Socket ${socket.id} joined task: ${taskId}`);
        socket.join(`task:${taskId}`);
      }
    });

    // Leave a task room
    socket.on('task:leave', (taskId) => {
      if (taskId) {
        console.log(`Socket ${socket.id} left task: ${taskId}`);
        socket.leave(`task:${taskId}`);
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

        // Include tempId in the response to the sender
        socket.emit('newMessage', {
          ...populatedMessage.toObject(),
          tempId,
        });

        // Broadcast to everyone else WITHOUT the tempId
        socket.broadcast.emit('newMessage', populatedMessage);
      } catch (err) {
        console.error('Error sending message:', err);
        socket.emit('error', {
          message: 'Failed to send message: ' + err.message,
        });
      }
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

  return { io, userSockets };
};

module.exports = setupSocketServer;
