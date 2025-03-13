const mongoose = require('mongoose');

const AttachmentSchema = new mongoose.Schema({
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
  filename: {
    type: String,
    required: [true, 'Please provide a filename'],
  },
  originalName: {
    type: String,
    required: [true, 'Please provide the original filename'],
  },
  fileType: {
    type: String,
    required: [true, 'Please provide the file type'],
  },
  fileSize: {
    type: Number,
    required: [true, 'Please provide the file size'],
  },
  url: {
    type: String,
    required: [true, 'Please provide the file URL'],
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Update task attachments count when an attachment is added or removed
AttachmentSchema.post('save', async function () {
  try {
    const Task = mongoose.model('Task');
    const task = await Task.findById(this.task);
    if (task) {
      const attachmentCount = await mongoose
        .model('Attachment')
        .countDocuments({ task: this.task });
      task.attachments = attachmentCount;
      await task.save();
    }
  } catch (error) {
    console.error('Error updating task attachment count:', error);
  }
});

AttachmentSchema.post('remove', async function () {
  try {
    const Task = mongoose.model('Task');
    const task = await Task.findById(this.task);
    if (task) {
      const attachmentCount = await mongoose
        .model('Attachment')
        .countDocuments({ task: this.task });
      task.attachments = attachmentCount;
      await task.save();
    }
  } catch (error) {
    console.error('Error updating task attachment count:', error);
  }
});

module.exports = mongoose.model('Attachment', AttachmentSchema);
