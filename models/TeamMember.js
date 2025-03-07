const mongoose = require('mongoose');

const TeamMemberSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  boardId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Board',
    required: true,
  },
  role: {
    type: String,
    enum: ['owner', 'admin', 'member'],
    default: 'member',
  },
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Create a compound index to ensure a user can only have one role per board
TeamMemberSchema.index({ userId: 1, boardId: 1 }, { unique: true });

module.exports = mongoose.model('TeamMember', TeamMemberSchema);
