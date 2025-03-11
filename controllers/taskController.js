const Task = require('../models/Task');
const Board = require('../models/Board');
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

    // Create notifications for assignees if they are user IDs
    // Note: Our model now supports string assignees (initials), but the controller
    // appears to expect user IDs for notifications
    if (req.body.assignees && req.body.assignees.length > 0) {
      // Only create notifications if assignees are ObjectIds (not initials)
      if (
        typeof req.body.assignees[0] !== 'string' ||
        req.body.assignees[0].length > 3
      ) {
        const notifications = req.body.assignees.map((assigneeId) => ({
          userId: assigneeId,
          type: 'assignment',
          content: `You have been assigned to a new task: ${task.title}`,
          relatedItemId: task._id,
          relatedItemType: 'task',
        }));

        await Notification.insertMany(notifications);
      }
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

    // Modify the populate logic since assignees might be initials now
    let tasksQuery = Task.find({ boardId: req.params.boardId });

    // Only populate if assignees are ObjectIds
    if (board.assigneesType === 'user') {
      tasksQuery = tasksQuery.populate({
        path: 'assignees',
        select: 'fullName email avatar',
      });
    }

    // Always populate createdBy
    tasksQuery = tasksQuery.populate({
      path: 'createdBy',
      select: 'fullName email avatar',
    });

    const tasks = await tasksQuery;

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
    // First get the task without populating to check the assignee type
    const taskCheck = await Task.findById(req.params.id);

    if (!taskCheck) {
      return res.status(404).json({
        success: false,
        message: 'Task not found',
      });
    }

    // Determine if we need to populate assignees based on their type
    let taskQuery = Task.findById(req.params.id);

    // Check if assignees are ObjectIds (not string initials)
    const hasObjectIdAssignees =
      taskCheck.assignees.length > 0 &&
      (typeof taskCheck.assignees[0] !== 'string' ||
        taskCheck.assignees[0].length > 3);

    if (hasObjectIdAssignees) {
      taskQuery = taskQuery.populate({
        path: 'assignees',
        select: 'fullName email avatar',
      });
    }

    // Always populate createdBy
    taskQuery = taskQuery.populate({
      path: 'createdBy',
      select: 'fullName email avatar',
    });

    const task = await taskQuery;

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

    // Determine if assignees are user IDs or initials
    const hasObjectIdAssignees =
      currentAssignees.length > 0 &&
      (typeof currentAssignees[0] !== 'string' ||
        currentAssignees[0].length > 3);

    task = await Task.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    // Only populate if assignees are ObjectIds
    if (hasObjectIdAssignees) {
      task = await Task.findById(task._id).populate({
        path: 'assignees',
        select: 'fullName email avatar',
      });
    }

    // Create notifications for new assignees only if they're user IDs
    if (req.body.assignees && hasObjectIdAssignees) {
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

    // Updated to use deleteOne() instead of remove() which is deprecated
    await Task.deleteOne({ _id: task._id });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};
