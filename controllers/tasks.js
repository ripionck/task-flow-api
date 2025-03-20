const Task = require('../models/Task');
const Project = require('../models/Project');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const paginateResults = require('../utils/paginateResults');

// @desc    Get all tasks
// @route   GET /api/tasks
// @route   GET /api/projects/:projectId/tasks
// @access  Private
exports.getTasks = asyncHandler(async (req, res, next) => {
  let query;

  if (req.params.projectId) {
    // Check if project exists
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return next(
        new ErrorResponse(
          `Project not found with id of ${req.params.projectId}`,
          404,
        ),
      );
    }

    query = Task.find({ project: req.params.projectId });
  } else {
    // Copy req.query
    const reqQuery = { ...req.query };

    // Fields to exclude from filtering
    const removeFields = ['select', 'sort', 'page', 'limit'];
    removeFields.forEach((param) => delete reqQuery[param]);

    // Create query string
    let queryStr = JSON.stringify(reqQuery);

    // Create operators ($gt, $gte, etc)
    queryStr = queryStr.replace(
      /\b(gt|gte|lt|lte|in)\b/g,
      (match) => `$${match}`,
    );

    // Finding resource
    query = Task.find(JSON.parse(queryStr)).populate([
      { path: 'project', select: 'name' },
      { path: 'assignees' },
    ]);
  }

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Apply pagination
  const { query: paginatedQuery, pagination } = await paginateResults(
    Task,
    query,
    req,
  );

  // Execute query
  const tasks = await paginatedQuery;

  res.status(200).json({
    success: true,
    count: tasks.length,
    pagination,
    data: tasks,
  });
});

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.id).populate([
    { path: 'project', select: 'name' },
    { path: 'assignees' },
  ]);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404),
    );
  }

  res.status(200).json({
    success: true,
    data: task,
  });
});

// @desc    Create new task
// @route   POST /api/projects/:projectId/tasks
// @access  Private
exports.createTask = asyncHandler(async (req, res, next) => {
  // Check if project exists
  const project = await Project.findById(req.params.projectId);
  if (!project) {
    return next(
      new ErrorResponse(
        `Project not found with id of ${req.params.projectId}`,
        404,
      ),
    );
  }

  // Add project and user to req.body
  req.body.project = req.params.projectId;
  req.body.createdBy = req.user.id;

  // Validate assignees exist
  if (req.body.assignees && req.body.assignees.length > 0) {
    for (const assigneeId of req.body.assignees) {
      const userExists = await User.findById(assigneeId);
      if (!userExists) {
        return next(
          new ErrorResponse(`User not found with id of ${assigneeId}`, 404),
        );
      }
    }
  }

  const task = await Task.create(req.body);

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

  // Make sure user is task creator or admin
  if (task.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this task`,
        401,
      ),
    );
  }

  // Validate assignees exist
  if (req.body.assignees && req.body.assignees.length > 0) {
    for (const assigneeId of req.body.assignees) {
      const userExists = await User.findById(assigneeId);
      if (!userExists) {
        return next(
          new ErrorResponse(`User not found with id of ${assigneeId}`, 404),
        );
      }
    }
  }

  task = await Task.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
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

  // Make sure user is task creator or admin
  if (task.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this task`,
        401,
      ),
    );
  }

  await task.remove();

  // Update project progress
  const project = await Project.findById(task.project);
  if (project) {
    await project.calculateProgress();
  }

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

  // Validate status
  if (!['To Do', 'In Progress', 'Review', 'Done'].includes(status)) {
    return next(new ErrorResponse(`Invalid status value`, 400));
  }

  let task = await Task.findById(req.params.id);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404),
    );
  }

  task = await Task.findByIdAndUpdate(
    req.params.id,
    { status },
    { new: true, runValidators: true },
  );

  // Project progress will be updated via the post-save hook

  res.status(200).json({
    success: true,
    data: task,
  });
});

// @desc    Update task assignees
// @route   PUT /api/tasks/:id/assignees
// @access  Private
exports.updateTaskAssignees = asyncHandler(async (req, res, next) => {
  const { assignees } = req.body;

  if (!assignees || !Array.isArray(assignees)) {
    return next(
      new ErrorResponse('Please provide an array of assignee IDs', 400),
    );
  }

  // Validate all assignees exist
  for (const assigneeId of assignees) {
    const userExists = await User.findById(assigneeId);
    if (!userExists) {
      return next(
        new ErrorResponse(`User not found with id of ${assigneeId}`, 404),
      );
    }
  }

  let task = await Task.findById(req.params.id);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.id}`, 404),
    );
  }

  task = await Task.findByIdAndUpdate(
    req.params.id,
    { assignees },
    { new: true, runValidators: true },
  ).populate('assignees');

  res.status(200).json({
    success: true,
    data: task,
  });
});
