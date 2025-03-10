const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const errorHandler = require('./middlewares/error');
const http = require('http');
const socketIo = require('socket.io');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const boardRoutes = require('./routes/boardRoutes');
const teamMemberRoutes = require('./routes/teamMemberRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Environment variables
require('dotenv').config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || '*', // Replace with your client URL in production
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    credentials: true,
  },
});

// Socket.io connection management
const connectedUsers = new Map(); // Store socket to user mapping
const userSockets = new Map(); // Store user to socket mapping

io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  // Authenticate socket connection with user token
  socket.on('authenticate', ({ userId, username }) => {
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

  // Handle user typing in comments
  socket.on('comment:typing', ({ taskId, user }) => {
    const userData = connectedUsers.get(socket.id);
    if (userData && taskId) {
      socket.to(`task:${taskId}`).emit('comment:typing', {
        taskId,
        user: user || userData,
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

// Make io accessible throughout the application
app.set('io', io);

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Socket.io middleware for routes
app.use((req, res, next) => {
  req.io = io;
  req.userSockets = userSockets;
  next();
});

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/team-members', teamMemberRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

// Root route
app.get('/', (req, res) => {
  res.send('TaskFlow API is running');
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
