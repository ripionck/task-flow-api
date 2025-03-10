const mongoose = require('mongoose');

const BoardSchema = new mongoose.Schema({
  title: {
    type: String,
    required: [true, 'Please add a title'],
    trim: true,
  },
  description: {
    type: String,
    trim: true,
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  tagColors: [
    {
      type: String,
      trim: true,
    },
  ],
  progress: {
    type: Number,
    default: 0,
    min: 0,
    max: 100,
  },
  dueIn: {
    type: String,
    trim: true,
  },
  dueDate: {
    type: Date,
  },
  team: [
    {
      type: String,
      trim: true,
    },
  ],
  teamNames: [
    {
      type: String,
      trim: true,
    },
  ],
  createdBy: {
    type: String,
    trim: true,
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  lastUpdated: {
    type: Date,
    default: Date.now,
  },
  totalTasks: {
    type: Number,
    default: 0,
  },
  completedTasks: {
    type: Number,
    default: 0,
  },
});

// Update lastUpdated timestamp before saving
BoardSchema.pre('save', function (next) {
  this.lastUpdated = Date.now();
  next();
});

module.exports = mongoose.model('Board', BoardSchema);
