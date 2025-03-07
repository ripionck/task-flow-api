const mongoose = require('mongoose');

const NotificationSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  type: {
    type: String,
    enum: ['assignment', 'deadline', 'comment', 'mention'],
    required: true,
  },
  content: {
    type: String,
    required: true,
  },
  relatedItemId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
  },
  relatedItemType: {
    type: String,
    enum: ['task', 'board', 'comment'],
    required: true,
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

module.exports = mongoose.model('Notification', NotificationSchema);
