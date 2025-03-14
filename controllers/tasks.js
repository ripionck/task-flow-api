const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const { logActivity } = require('../middleware/logger');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all tasks
// @route   GET /api/tasks
// @route   GET /api/projects/:projectId/tasks
// @access  Private
exports.getTasks = asyncHandler(async (req, res, next) => {
  // If getting tasks for a specific project
  if (req.params.projectId) {
    const tasks = await Task.find({ project: req.params.projectId });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  }

  // If admin wants all tasks
  if (req.user.isAdmin && req.query.all === 'true') {
    const tasks = await Task.find();

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  }

  // For regular users, get only their assigned tasks
  if (!req.user.isAdmin) {
    const tasks = await Task.find({ assignees: { $in: [req.user.displayId] } });

    return res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  }

  res.status(200).json(res.advancedResults);
});

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate('project');

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is assigned to the task or project, or is an admin
  if (
    !task.assignees.includes(req.user.displayId) &&
    !task.project.assignees.includes(req.user.displayId) &&
    !req.user.isAdmin
  ) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this task`,
        403,
      ),
    );
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

// @desc    Create new task
// @route   POST /api/tasks
// @route   POST /api/projects/:projectId/tasks
// @access  Private
exports.createTask = asyncHandler(async (req, res, next) => {
  // Add user to request body
  req.body.createdBy = req.user.displayId;

  // If projectId is in the route params, add it to the request body
  if (req.params.projectId) {
    req.body.project = req.params.projectId;
  }

  // Check if project exists
  const project = await Project.findById(req.body.project);

  if (!project) {
    return next(
      new ErrorResponse(
        `Project not found with id of ${req.body.project}`,
        404,
      ),
    );
  }

  // Check if user is assigned to the project or is an admin
  if (!project.assignees.includes(req.user.displayId) && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to add tasks to this project`,
        403,
      ),
    );
  }

  // Ensure the creator is included in assignees
  if (!req.body.assignees || !req.body.assignees.includes(req.user.displayId)) {
    req.body.assignees = req.body.assignees || [];
    req.body.assignees.push(req.user.displayId);
  }

  const task = await Task.create(req.body);

  // Log activity
  await logActivity(
    req,
    req.user,
    'created',
    'task',
    task._id,
    `Created task: ${task.title}`,
  );

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'created',
    targetType: 'task',
    targetId: task._id,
    targetName: task.title,
  });

  res.status(201).json({
    success: true,
    data: task,
  });
});

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = asyncHandler(async (req, res, next) => {
  let task = await Task.findById(req.params.id);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is assigned to the task or is an admin
  if (!task.assignees.includes(req.user.displayId) && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this task`,
        403,
      ),
    );
  }

  task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'updated',
    targetType: 'task',
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    success: true,
    data: task,
  });
});

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is the creator of the task or is an admin
  if (task.createdBy !== req.user.displayId && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this task`,
        403,
      ),
    );
  }

  await task.deleteOne();

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'deleted',
    targetType: 'task',
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Update task status
// @route   PUT /api/tasks/:id/status
// @access  Private
exports.updateTaskStatus = asyncHandler(async (req, res, next) => {
  const { status } = req.body;

  if (!status) {
    return next(new ErrorResponse('Please provide a status', 400));
  }

  let task = await Task.findById(req.params.id);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is assigned to the task or is an admin
  if (!task.assignees.includes(req.user.displayId) && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this task status`,
        403,
      ),
    );
  }

  task = await Task.findByIdAndUpdate(
    req.params.id,
    { status },
    {
      new: true,
      runValidators: true,
    },
  );

  // Create activity log
  const action = status === 'Done' ? 'completed' : 'updated';
  await ActivityLog.create({
    userId: req.user.displayId,
    action,
    targetType: 'task',
    targetId: task._id,
    targetName: task.title,
  });

  res.status(200).json({
    success: true,
    data: task,
  });
});
