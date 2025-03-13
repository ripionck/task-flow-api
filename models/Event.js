const mongoose = require('mongoose');

const EventSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide an event title'],
      trim: true,
      maxlength: [100, 'Event title cannot be more than 100 characters'],
    },
    date: {
      type: Date,
      required: [true, 'Please provide an event date'],
    },
    startTime: {
      type: String,
      required: [true, 'Please provide a start time'],
    },
    endTime: {
      type: String,
      required: [true, 'Please provide an end time'],
    },
    description: {
      type: String,
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    attendees: [
      {
        type: String,
        ref: 'User',
      },
    ],
    type: {
      type: String,
      enum: ['meeting', 'presentation', 'demo', 'review', 'planning', 'other'],
      default: 'meeting',
    },
    createdBy: {
      type: String,
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
  },
  { timestamps: true },
);

module.exports = mongoose.model('Event', EventSchema);
