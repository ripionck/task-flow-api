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
  dueDate: {
    type: Date,
  },
  teamNames: [
    {
      type: String,
      trim: true,
    },
  ],
  createdBy: {
    type: String,
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

// Virtual for dueIn calculation
BoardSchema.virtual('dueIn').get(function () {
  if (!this.dueDate) return null;
  const diff = this.dueDate - Date.now();
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));

  if (days < 0) return 'Overdue';
  if (days === 0) return 'Today';
  if (days === 1) return 'Tomorrow';
  if (days < 7) return `${days} days`;
  if (days < 30) return `${Math.floor(days / 7)} weeks`;
  return `${Math.floor(days / 30)} months`;
});

// Virtual for team initials
BoardSchema.virtual('team').get(function () {
  return this.teamNames.map((name) =>
    name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .substring(0, 2),
  );
});

BoardSchema.set('toJSON', {
  virtuals: true,
  transform: (doc, ret) => {
    delete ret._id;
    delete ret.__v;
    return ret;
  },
});

module.exports = mongoose.model('Board', BoardSchema);
