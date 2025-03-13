const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Please provide a task title'],
      trim: true,
      maxlength: [100, 'Task title cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a task description'],
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    status: {
      type: String,
      enum: ['To Do', 'In Progress', 'Review', 'Done'],
      default: 'To Do',
    },
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Project',
      required: true,
    },
    assignees: [
      {
        type: String,
        ref: 'User',
        required: true,
      },
    ],
    tags: [
      {
        type: String,
        required: true,
      },
    ],
    comments: {
      type: Number,
      default: 0,
    },
    attachments: {
      type: Number,
      default: 0,
    },
    dueDate: {
      type: String,
      required: [true, 'Please provide a due date'],
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

// Update project progress when task status changes
TaskSchema.post('save', async function () {
  try {
    const Project = mongoose.model('Project');
    const project = await Project.findById(this.project);
    if (project) {
      await project.calculateProgress();
    }
  } catch (error) {
    console.error('Error updating project progress:', error);
  }
});

module.exports = mongoose.model('Task', TaskSchema);
