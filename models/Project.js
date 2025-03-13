const mongoose = require('mongoose');

const ProjectSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a project name'],
      trim: true,
      maxlength: [100, 'Project name cannot be more than 100 characters'],
    },
    description: {
      type: String,
      required: [true, 'Please provide a project description'],
      maxlength: [500, 'Description cannot be more than 500 characters'],
    },
    progress: {
      type: Number,
      min: [0, 'Progress cannot be less than 0'],
      max: [100, 'Progress cannot be more than 100'],
      default: 0,
    },
    dueDate: {
      type: String,
      required: [true, 'Please provide a due date'],
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
    starred: {
      type: Boolean,
      default: false,
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

// Calculate progress based on completed tasks
ProjectSchema.methods.calculateProgress = async function () {
  const Task = mongoose.model('Task');

  const totalTasks = await Task.countDocuments({ project: this._id });
  if (totalTasks === 0) return 0;

  const completedTasks = await Task.countDocuments({
    project: this._id,
    status: 'Done',
  });

  this.progress = Math.round((completedTasks / totalTasks) * 100);
  await this.save();

  return this.progress;
};

module.exports = mongoose.model('Project', ProjectSchema);
