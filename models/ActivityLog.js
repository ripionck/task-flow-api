const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: String,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    enum: [
      'created',
      'updated',
      'deleted',
      'commented on',
      'completed',
      'assigned',
    ],
    required: true,
  },
  targetType: {
    type: String,
    enum: ['task', 'project', 'event', 'comment'],
    required: true,
  },
  targetId: {
    type: mongoose.Schema.Types.ObjectId,
    required: true,
    refPath: 'targetType',
  },
  targetName: {
    type: String,
    required: true,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

// Create a method to format the time display
ActivityLogSchema.methods.getTimeDisplay = function () {
  const now = new Date();
  const diff = now - this.timestamp;

  // Less than a minute
  if (diff < 60000) {
    return 'Just now';
  }

  // Less than an hour
  if (diff < 3600000) {
    const minutes = Math.floor(diff / 60000);
    return `${minutes} min ago`;
  }

  // Less than a day
  if (diff < 86400000) {
    const hours = Math.floor(diff / 3600000);
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  }

  // Less than a week
  if (diff < 604800000) {
    const days = Math.floor(diff / 86400000);
    return days === 1 ? 'Yesterday' : `${days} days ago`;
  }

  // Format as date
  return this.timestamp.toLocaleDateString();
};

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
