const mongoose = require('mongoose');

const MessageSchema = new mongoose.Schema({
  senderId: {
    type: String,
    ref: 'User',
    required: true,
  },
  receiverId: {
    type: String,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: [true, 'Please provide a message'],
    trim: true,
    maxlength: [1000, 'Message cannot be more than 1000 characters'],
  },
  isRead: {
    type: Boolean,
    default: false,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a compound index for efficient querying of conversations
MessageSchema.index({ senderId: 1, receiverId: 1, createdAt: -1 });

module.exports = mongoose.model('Message', MessageSchema);
