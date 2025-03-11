const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const http = require('http');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');

const connectDB = require('./config/db');
const errorHandler = require('./middlewares/error');
const { protect } = require('./middlewares/auth');

const Message = require('./models/Message');
const authRoutes = require('./routes/authRoutes');
const userRoutes = require('./routes/userRoutes');
const boardRoutes = require('./routes/boardRoutes');
const taskRoutes = require('./routes/taskRoutes');
const commentRoutes = require('./routes/commentRoutes');
const notificationRoutes = require('./routes/notificationRoutes');

const setupSocketServer = require('./service/socketService');

require('dotenv').config();

// Connect to database
connectDB();

// Initialize Express and HTTP server
const app = express();
const server = http.createServer(app);

// Set up socket.io
const { io, userSockets } = setupSocketServer(server);

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
      .sort({ createdAt: 1 })
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
