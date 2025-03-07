const mongoose = require('mongoose');

const ColumnSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Please provide a column name'],
    trim: true,
  },
  color: {
    type: String,
    default: '#3b82f6', // Default blue color
  },
});

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
  coverImage: {
    type: String,
    default: '',
  },
  tags: [
    {
      type: String,
      trim: true,
    },
  ],
  columns: {
    type: [ColumnSchema],
    default: [
      { name: 'To Do', color: '#ef4444' }, // Red
      { name: 'In Progress', color: '#f59e0b' }, // Amber
      { name: 'Done', color: '#10b981' }, // Green
    ],
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  updatedAt: {
    type: Date,
    default: Date.now,
  },
});

// Update the updatedAt timestamp before saving
BoardSchema.pre('save', function (next) {
  this.updatedAt = Date.now();
  next();
});

module.exports = mongoose.model('Board', BoardSchema);
