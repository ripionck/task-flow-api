const path = require('path');
const express = require('express');
const morgan = require('morgan');
const colors = require('colors');
const fileupload = require('express-fileupload');
const cookieParser = require('cookie-parser');
const cors = require('cors');
const mongoSanitize = require('express-mongo-sanitize');
const helmet = require('helmet');
const xss = require('xss-clean');
const rateLimit = require('express-rate-limit');
const hpp = require('hpp');
const http = require('http');
const socketIo = require('socket.io');
const errorHandler = require('./middleware/error');
const connectDB = require('./config/db');
const { socketAuth } = require('./middleware/auth');
const { handleSocketConnection } = require('./socket/socketHandler');

require('dotenv').config();

// Connect to database
connectDB();

// Route files
const auth = require('./routes/auth');
const users = require('./routes/users');
const projects = require('./routes/projects');
const tasks = require('./routes/tasks');
const comments = require('./routes/comments');
const attachments = require('./routes/attachments');
const events = require('./routes/events');
const messages = require('./routes/messages');
const activity = require('./routes/activity');

const app = express();

// Create HTTP server
const server = http.createServer(app);

// Initialize Socket.io
const io = socketIo(server, {
  cors: {
    origin: process.env.CLIENT_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
    credentials: true,
  },
});

// Body parser
app.use(express.json());

// Cookie parser
app.use(cookieParser());

// Dev logging middleware
if (process.env.NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// File uploading
app.use(fileupload());

// Sanitize data
app.use(mongoSanitize());

// Set security headers
app.use(helmet());

// Prevent XSS attacks
app.use(xss());

// Rate limiting
const limiter = rateLimit({
  windowMs: 10 * 60 * 1000, // 10 mins
  max: 100,
});
app.use(limiter);

// Prevent http param pollution
app.use(hpp());

// Enable CORS
app.use(cors());

// Set static folder
app.use(express.static(path.join(__dirname, 'public')));

// Mount routers
app.use('/api/auth', auth);
app.use('/api/users', users);
app.use('/api/projects', projects);
app.use('/api/tasks', tasks);
app.use('/api/comments', comments);
app.use('/api/attachments', attachments);
app.use('/api/events', events);
app.use('/api/messages', messages);
app.use('/api/activity', activity);

app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to the TaskFlow API',
  });
});

app.use(errorHandler);

// Socket.io middleware for authentication
io.use(socketAuth);

// Handle socket connections
io.on('connection', (socket) => handleSocketConnection(io, socket));

const PORT = process.env.PORT || 5000;

server.listen(
  PORT,
  console.log(
    `Server running in ${process.env.NODE_ENV} mode on port ${PORT}`.yellow
      .bold,
  ),
);

// Handle unhandled promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`.red);
  // Close server & exit process
  server.close(() => process.exit(1));
});
