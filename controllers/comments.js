const Comment = require('../models/Comment');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get comments for a task
// @route   GET /api/tasks/:taskId/comments
// @access  Private
exports.getComments = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.taskId}`, 404),
    );
  }

  const comments = await Comment.find({ task: req.params.taskId }).sort({
    createdAt: -1,
  });

  res.status(200).json({
    success: true,
    count: comments.length,
    data: comments,
  });
});

// @desc    Get single comment
// @route   GET /api/tasks/:taskId/comments/:id
// @access  Private
exports.getComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404),
    );
  }

  res.status(200).json({
    success: true,
    data: comment,
  });
});

// @desc    Add comment to task
// @route   POST /api/tasks/:taskId/comments
// @access  Private
exports.createComment = asyncHandler(async (req, res, next) => {
  req.body.task = req.params.taskId;
  req.body.user = req.user.displayId;

  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.taskId}`, 404),
    );
  }

  const comment = await Comment.create(req.body);

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'commented on',
    targetType: 'task',
    targetId: task._id,
    targetName: task.title,
  });

  res.status(201).json({
    success: true,
    data: comment,
  });
});

// @desc    Update comment
// @route   PUT /api/tasks/:taskId/comments/:id
// @access  Private
exports.updateComment = asyncHandler(async (req, res, next) => {
  let comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404),
    );
  }

  // Make sure user is comment owner
  if (comment.user !== req.user.displayId && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this comment`,
        403,
      ),
    );
  }

  comment = await Comment.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: comment,
  });
});

// @desc    Delete comment
// @route   DELETE /api/tasks/:taskId/comments/:id
// @access  Private
exports.deleteComment = asyncHandler(async (req, res, next) => {
  const comment = await Comment.findById(req.params.id);

  if (!comment) {
    return next(
      new ErrorResponse(`Comment not found with id of ${req.params.id}`, 404),
    );
  }

  // Make sure user is comment owner
  if (comment.user !== req.user.displayId && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this comment`,
        403,
      ),
    );
  }

  await comment.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});
