const Task = require('../models/Task');
const Board = require('../models/Board');
const TeamMember = require('../models/TeamMember');
const Notification = require('../models/Notification');

// @desc    Create new task
// @route   POST /api/tasks
// @access  Private
exports.createTask = async (req, res, next) => {
  try {
    // Add user to request body
    req.body.createdBy = req.user.id;

    // Check if board exists and user has access
    const board = await Board.findById(req.body.boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found',
      });
    }

    // Check if user is a team member of this board
    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (!teamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to create tasks in this board',
      });
    }

    // Create task
    const task = await Task.create(req.body);

    // Create notifications for assignees
    if (req.body.assignees && req.body.assignees.length > 0) {
      const notifications = req.body.assignees.map((assigneeId) => ({
        userId: assigneeId,
        type: 'assignment',
        content: `You have been assigned to a new task: ${task.title}`,
        relatedItemId: task._id,
        relatedItemType: 'task',
      }));

      await Notification.insertMany(notifications);
    }

    res.status(201).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all tasks for a board
// @route   GET /api/boards/:boardId/tasks
// @access  Private
exports.getBoardTasks = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.boardId);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found',
      });
    }

    // Check if user is a team member of this board
    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (!teamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access tasks in this board',
      });
    }

    const tasks = await Task.find({ boardId: req.params.boardId })
      .populate({
        path: 'assignees',
        select: 'fullName email avatar',
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email avatar',
      });

    res.status(200).json({
      success: true,
      count: tasks.length,
      data: tasks,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single task
// @route   GET /api/tasks/:id
// @access  Private
exports.getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate({
        path: 'assignees',
        select: 'fullName email avatar',
      })
      .populate({
        path: 'createdBy',
        select: 'fullName email avatar',
      });

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
        message: 'Not authorized to access this task',
      });
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update task
// @route   PUT /api/tasks/:id
// @access  Private
exports.updateTask = async (req, res, next) => {
  try {
    let task = await Task.findById(req.params.id);

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
        message: 'Not authorized to update this task',
      });
    }

    // Save current assignees to compare later
    const currentAssignees = [...task.assignees];

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate({
      path: 'assignees',
      select: 'fullName email avatar',
    });

    // Create notifications for new assignees
    if (req.body.assignees) {
      const newAssignees = req.body.assignees.filter(
        (assigneeId) => !currentAssignees.includes(assigneeId),
      );

      if (newAssignees.length > 0) {
        const notifications = newAssignees.map((assigneeId) => ({
          userId: assigneeId,
          type: 'assignment',
          content: `You have been assigned to task: ${task.title}`,
          relatedItemId: task._id,
          relatedItemType: 'task',
        }));

        await Notification.insertMany(notifications);
      }
    }

    res.status(200).json({
      success: true,
      data: task,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete task
// @route   DELETE /api/tasks/:id
// @access  Private
exports.deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);

    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Check if user is a team member with appropriate permissions
    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: task.boardId,
    });

    if (
      (!teamMember || teamMember.role === 'member') &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete this task',
      });
    }

    await task.remove();

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
