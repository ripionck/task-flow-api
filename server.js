const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const connectDB = require('./config/db');
const config = require('./config/config');
const errorHandler = require('./middlewares/error');
const { protect } = require('./middlewares/auth');
const http = require('http');
const socketIo = require('socket.io');
const jwt = require('jsonwebtoken');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

// Models
const Message = require('./models/Message');
const User = require('./models/User');

// Routes
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const boardRoutes = require('./routes/boardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

// Environment variables
require('dotenv').config();

// Connect to database
connectDB();

const app = express();
const server = http.createServer(app);

// Create socket.io server with proper CORS configuration
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
  transports: ['websocket'],
});

// Socket.io connection management
const connectedUsers = new Map();
const userSockets = new Map();

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

// SINGLE socket.io connection handler
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

  // Message sending handler - SINGLE implementation
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

// Make io accessible throughout the application
app.set('io', io);

// Set up file upload storage
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueFilename = `${uuidv4()}-${file.originalname}`;
    cb(null, uniqueFilename);
  },
});

const upload = multer({ storage });

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

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/boards', boardRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/notifications', notificationRoutes);

app.get('/api/messages', protect, async (req, res) => {
  try {
    const messages = await Message.find()
      .populate('user', 'name avatar')
      .sort({ createdAt: 1 }) // Changed to ascending order
      .limit(50);

    const messagesWithFlag = messages.map((msg) => ({
      ...msg.toObject(),
      isCurrentUser: msg.user._id.toString() === req.user.userId,
    }));

    res.json(messagesWithFlag);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Handle file uploads - Add auth middleware
app.post('/api/upload', protect, upload.single('file'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No file uploaded' });
    }

    const fileUrl = `${req.protocol}://${req.get('host')}/uploads/${
      req.file.filename
    }`;

    res.json({
      name: req.file.originalname,
      url: fileUrl,
      type: req.file.mimetype,
      size: req.file.size,
    });
  } catch (error) {
    console.error('File upload error:', error);
    res.status(500).json({ message: 'File upload failed' });
  }
});

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Root route
app.get('/', (req, res) => {
  res.send('Task Management API is running');
});

// Error handler
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});

module.exports = app;
