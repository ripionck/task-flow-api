const Comment = require('../models/Comment');
const Task = require('../models/Task');
const TeamMember = require('../models/TeamMember');
const Notification = require('../models/Notification');

// @desc    Create new comment
// @route   POST /api/comments
// @access  Private
exports.createComment = async (req, res, next) => {
  try {
    // Add user to request body
    req.body.userId = req.user.id;

    // Check if task exists
    const task = await Task.findById(req.body.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is a team member of this board
    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: task.boardId,
    });

    if (!teamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to comment on this task',
      });
    }

    // Create comment
    const comment = await Comment.create(req.body);

    // Create notification for task assignees
    if (task.assignees && task.assignees.length > 0) {
      const assigneesToNotify = task.assignees.filter(
        (assigneeId) => assigneeId.toString() !== req.user.id.toString(),
      );

      if (assigneesToNotify.length > 0) {
        const notifications = assigneesToNotify.map((assigneeId) => ({
          userId: assigneeId,
          type: 'comment',
          content: `New comment on task: ${task.title}`,
          relatedItemId: comment._id,
          relatedItemType: 'comment',
        }));

        await Notification.insertMany(notifications);
      }
    }

    // Populate user information
    const populatedComment = await Comment.findById(comment._id).populate({
      path: 'userId',
      select: 'fullName email avatar',
    });

    res.status(201).json({
      success: true,
      data: populatedComment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all comments for a task
// @route   GET /api/tasks/:taskId/comments
// @access  Private
exports.getTaskComments = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.taskId);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is a team member of this board
    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: task.boardId,
    });

    if (!teamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access comments for this task',
      });
    }

    const comments = await Comment.find({ taskId: req.params.taskId })
      .populate({
        path: 'userId',
        select: 'fullName email avatar',
      })
      .sort({ createdAt: -1 });

    res.status(200).json({
      success: true,
      count: comments.length,
      data: comments,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single comment
// @route   GET /api/comments/:id
// @access  Private
exports.getComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id).populate({
      path: 'userId',
      select: 'fullName email avatar',
    });

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Get associated task
    const task = await Task.findById(comment.taskId);

    // Check if user is a team member of this board
    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: task.boardId,
    });

    if (!teamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this comment',
      });
    }

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update comment
// @route   PUT /api/comments/:id
// @access  Private
exports.updateComment = async (req, res, next) => {
  try {
    let comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Check if the user is the comment owner
    if (
      comment.userId.toString() !== req.user.id &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this comment',
      });
    }

    comment = await Comment.findByIdAndUpdate(
      req.params.id,
      { content: req.body.content },
      {
        new: true,
        runValidators: true,
      },
    ).populate({
      path: 'userId',
      select: 'fullName email avatar',
    });

    res.status(200).json({
      success: true,
      data: comment,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete comment
// @route   DELETE /api/comments/:id
// @access  Private
exports.deleteComment = async (req, res, next) => {
  try {
    const comment = await Comment.findById(req.params.id);

    if (!comment) {
      return res.status(404).json({
        success: false,
        message: 'Comment not found',
      });
    }

    // Get associated task
    const task = await Task.findById(comment.taskId);

    // Check if user is the comment owner or has admin permissions on the board
    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: task.boardId,
    });

    if (
      comment.userId.toString() !== req.user.id &&
      (!teamMember || teamMember.role === 'member') &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this comment',
      });
    }

    await comment.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
