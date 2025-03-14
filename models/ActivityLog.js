const mongoose = require('mongoose');

const ActivityLogSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.ObjectId,
    ref: 'User',
    required: true,
  },
  action: {
    type: String,
    required: [true, 'Please add an action'],
    enum: [
      'created',
      'updated',
      'deleted',
      'completed',
      'commented',
      'uploaded',
      'assigned',
    ],
  },
  resource: {
    type: String,
    required: [true, 'Please add a resource type'],
    enum: ['project', 'task', 'comment', 'attachment', 'event'],
  },
  resourceId: {
    type: mongoose.Schema.ObjectId,
    required: true,
  },
  details: {
    type: String,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Index for faster queries
ActivityLogSchema.index({ user: 1, createdAt: -1 });
ActivityLogSchema.index({ resourceId: 1 });

module.exports = mongoose.model('ActivityLog', ActivityLogSchema);
