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
  addedAt: {
    type: Date,
    default: Date.now,
  },
});

// Compound index to ensure a user can only have one role per board
TeamMemberSchema.index({ userId: 1, boardId: 1 }, { unique: true });

// Update User's isTeamMember status when added to a board
TeamMemberSchema.post('save', async function (doc) {
  const User = mongoose.model('User');
  await User.findByIdAndUpdate(doc.userId, { isTeamMember: true });
});

// Update User's isTeamMember status when removed from a board
TeamMemberSchema.post('remove', async function (doc) {
  const User = mongoose.model('User');
  const teamMemberships = await mongoose
    .model('TeamMember')
    .countDocuments({ userId: doc.userId });
  if (teamMemberships === 0) {
    await User.findByIdAndUpdate(doc.userId, { isTeamMember: false });
  }
});

module.exports = mongoose.model('TeamMember', TeamMemberSchema);
