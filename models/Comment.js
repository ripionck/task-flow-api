const mongoose = require('mongoose');

const CommentSchema = new mongoose.Schema(
  {
    task: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Task',
      required: true,
    },
    user: {
      type: String,
      ref: 'User',
      required: true,
    },
    text: {
      type: String,
      required: [true, 'Please provide comment text'],
      trim: true,
      maxlength: [500, 'Comment cannot be more than 500 characters'],
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

// Update task comments count when a comment is added or removed
CommentSchema.post('save', async function () {
  try {
    const Task = mongoose.model('Task');
    const task = await Task.findById(this.task);
    if (task) {
      const commentCount = await mongoose
        .model('Comment')
        .countDocuments({ task: this.task });
      task.comments = commentCount;
      await task.save();
    }
  } catch (error) {
    console.error('Error updating task comment count:', error);
  }
});

CommentSchema.post('remove', async function () {
  try {
    const Task = mongoose.model('Task');
    const task = await Task.findById(this.task);
    if (task) {
      const commentCount = await mongoose
        .model('Comment')
        .countDocuments({ task: this.task });
      task.comments = commentCount;
      await task.save();
    }
  } catch (error) {
    console.error('Error updating task comment count:', error);
  }
});

module.exports = mongoose.model('Comment', CommentSchema);
