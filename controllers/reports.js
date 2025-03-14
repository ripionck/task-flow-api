const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const Project = require('../models/Project');
const Task = require('../models/Task');
const User = require('../models/User');
const ActivityLog = require('../models/ActivityLog');

// @desc    Get project completion statistics
// @route   GET /api/reports/projects/completion
// @access  Private
exports.getProjectCompletionStats = asyncHandler(async (req, res, next) => {
  // Get date range from query params or use default (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (req.query.days || 30));

  // Find projects in the date range
  const projects = await Project.find({
    createdAt: { $gte: startDate, $lte: endDate },
    user: req.user.id,
  });

  // Get completion statistics for each project
  const projectStats = await Promise.all(
    projects.map(async (project) => {
      const tasks = await Task.find({ project: project._id });
      const totalTasks = tasks.length;
      const completedTasks = tasks.filter(
        (task) => task.status === 'Done',
      ).length;
      const completionPercentage =
        totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0;

      return {
        projectId: project._id,
        projectName: project.name,
        totalTasks,
        completedTasks,
        completionPercentage: Math.round(completionPercentage),
        dueDate: project.dueDate,
      };
    }),
  );

  res.status(200).json({
    success: true,
    count: projectStats.length,
    data: projectStats,
  });
});

// @desc    Get task distribution by status
// @route   GET /api/reports/tasks/distribution
// @access  Private
exports.getTaskDistribution = asyncHandler(async (req, res, next) => {
  const taskDistribution = await Task.aggregate([
    {
      $match: {
        user: req.user._id,
      },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
    {
      $project: {
        status: '$_id',
        count: 1,
        _id: 0,
      },
    },
  ]);

  // Ensure all statuses are represented
  const statuses = ['To Do', 'In Progress', 'Review', 'Done'];
  const distribution = statuses.map((status) => {
    const found = taskDistribution.find((item) => item.status === status);
    return found || { status, count: 0 };
  });

  res.status(200).json({
    success: true,
    data: distribution,
  });
});

// @desc    Get team performance metrics
// @route   GET /api/reports/team/performance
// @access  Private (Admin/Manager)
exports.getTeamPerformance = asyncHandler(async (req, res, next) => {
  // Check if user is admin or manager
  if (req.user.role !== 'Admin' && req.user.role !== 'Manager') {
    return next(
      new ErrorResponse(
        'Not authorized to access team performance reports',
        403,
      ),
    );
  }

  const teamPerformance = await User.aggregate([
    {
      $match: {
        role: { $ne: 'Admin' }, // Exclude admins from the report
      },
    },
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'assignees',
        as: 'assignedTasks',
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        totalTasks: { $size: '$assignedTasks' },
        completedTasks: {
          $size: {
            $filter: {
              input: '$assignedTasks',
              as: 'task',
              cond: { $eq: ['$$task.status', 'Done'] },
            },
          },
        },
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        totalTasks: 1,
        completedTasks: 1,
        completionRate: {
          $cond: [
            { $eq: ['$totalTasks', 0] },
            0,
            {
              $multiply: [{ $divide: ['$completedTasks', '$totalTasks'] }, 100],
            },
          ],
        },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: teamPerformance.length,
    data: teamPerformance,
  });
});

// @desc    Get workload distribution
// @route   GET /api/reports/workload
// @access  Private
exports.getWorkloadDistribution = asyncHandler(async (req, res, next) => {
  // Get all users if admin/manager, otherwise just the current user
  const isAdminOrManager =
    req.user.role === 'Admin' || req.user.role === 'Manager';
  const userMatch = isAdminOrManager ? {} : { _id: req.user._id };

  const workloadDistribution = await User.aggregate([
    {
      $match: userMatch,
    },
    {
      $lookup: {
        from: 'tasks',
        localField: '_id',
        foreignField: 'assignees',
        as: 'tasks',
      },
    },
    {
      $project: {
        name: 1,
        email: 1,
        role: 1,
        todoTasks: {
          $size: {
            $filter: {
              input: '$tasks',
              as: 'task',
              cond: { $eq: ['$$task.status', 'To Do'] },
            },
          },
        },
        inProgressTasks: {
          $size: {
            $filter: {
              input: '$tasks',
              as: 'task',
              cond: { $eq: ['$$task.status', 'In Progress'] },
            },
          },
        },
        reviewTasks: {
          $size: {
            $filter: {
              input: '$tasks',
              as: 'task',
              cond: { $eq: ['$$task.status', 'Review'] },
            },
          },
        },
        doneTasks: {
          $size: {
            $filter: {
              input: '$tasks',
              as: 'task',
              cond: { $eq: ['$$task.status', 'Done'] },
            },
          },
        },
        totalTasks: { $size: '$tasks' },
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: workloadDistribution.length,
    data: workloadDistribution,
  });
});

// @desc    Get activity timeline
// @route   GET /api/reports/activity/timeline
// @access  Private
exports.getActivityTimeline = asyncHandler(async (req, res, next) => {
  // Get date range from query params or use default (last 7 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (req.query.days || 7));

  const timeline = await ActivityLog.aggregate([
    {
      $match: {
        createdAt: { $gte: startDate, $lte: endDate },
        user: req.user._id,
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$createdAt' },
          month: { $month: '$createdAt' },
          day: { $dayOfMonth: '$createdAt' },
        },
        count: { $sum: 1 },
        activities: {
          $push: {
            action: '$action',
            resource: '$resource',
            createdAt: '$createdAt',
          },
        },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
    },
    {
      $project: {
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
          },
        },
        count: 1,
        activities: 1,
        _id: 0,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: timeline.length,
    data: timeline,
  });
});

// @desc    Get project time tracking report
// @route   GET /api/reports/projects/time-tracking
// @access  Private
exports.getProjectTimeTracking = asyncHandler(async (req, res, next) => {
  // This is a placeholder for time tracking functionality
  // In a real implementation, you would have a TimeEntry model
  // and aggregate time spent on different projects

  const projects = await Project.find({ user: req.user.id });

  // Mock time tracking data for demonstration
  const timeTrackingData = projects.map((project) => {
    return {
      projectId: project._id,
      projectName: project.name,
      totalHours: Math.floor(Math.random() * 100), // Random hours for demo
      weeklyBreakdown: [
        { week: 'Week 1', hours: Math.floor(Math.random() * 20) },
        { week: 'Week 2', hours: Math.floor(Math.random() * 20) },
        { week: 'Week 3', hours: Math.floor(Math.random() * 20) },
        { week: 'Week 4', hours: Math.floor(Math.random() * 20) },
      ],
    };
  });

  res.status(200).json({
    success: true,
    count: timeTrackingData.length,
    data: timeTrackingData,
  });
});

// @desc    Get task completion trend
// @route   GET /api/reports/tasks/completion-trend
// @access  Private
exports.getTaskCompletionTrend = asyncHandler(async (req, res, next) => {
  // Get date range from query params or use default (last 30 days)
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - (req.query.days || 30));

  const completionTrend = await Task.aggregate([
    {
      $match: {
        user: req.user._id,
        status: 'Done',
        updatedAt: { $gte: startDate, $lte: endDate },
      },
    },
    {
      $group: {
        _id: {
          year: { $year: '$updatedAt' },
          month: { $month: '$updatedAt' },
          day: { $dayOfMonth: '$updatedAt' },
        },
        count: { $sum: 1 },
      },
    },
    {
      $sort: { '_id.year': 1, '_id.month': 1, '_id.day': 1 },
    },
    {
      $project: {
        date: {
          $dateToString: {
            format: '%Y-%m-%d',
            date: {
              $dateFromParts: {
                year: '$_id.year',
                month: '$_id.month',
                day: '$_id.day',
              },
            },
          },
        },
        completedTasks: '$count',
        _id: 0,
      },
    },
  ]);

  // Fill in missing dates with zero counts
  const trend = [];
  const currentDate = new Date(startDate);

  while (currentDate <= endDate) {
    const dateString = currentDate.toISOString().split('T')[0];
    const existingEntry = completionTrend.find(
      (entry) => entry.date === dateString,
    );

    if (existingEntry) {
      trend.push(existingEntry);
    } else {
      trend.push({
        date: dateString,
        completedTasks: 0,
      });
    }

    currentDate.setDate(currentDate.getDate() + 1);
  }

  res.status(200).json({
    success: true,
    count: trend.length,
    data: trend,
  });
});

// @desc    Get dashboard summary report
// @route   GET /api/reports/dashboard/summary
// @access  Private
exports.getDashboardSummary = asyncHandler(async (req, res, next) => {
  // Projects count
  const projectsCount = await Project.countDocuments({ user: req.user.id });

  // Tasks statistics
  const tasksStats = await Task.aggregate([
    {
      $match: { user: req.user._id },
    },
    {
      $group: {
        _id: '$status',
        count: { $sum: 1 },
      },
    },
  ]);

  // Format task stats
  const tasksByStatus = {};
  tasksStats.forEach((stat) => {
    tasksByStatus[stat._id] = stat.count;
  });

  // Calculate total tasks
  const totalTasks = Object.values(tasksByStatus).reduce(
    (sum, count) => sum + count,
    0,
  );

  // Get upcoming deadlines (tasks due in the next 7 days)
  const today = new Date();
  const nextWeek = new Date();
  nextWeek.setDate(today.getDate() + 7);

  const upcomingDeadlines = await Task.find({
    user: req.user.id,
    dueDate: { $gte: today, $lte: nextWeek },
    status: { $ne: 'Done' },
  })
    .sort({ dueDate: 1 })
    .limit(5)
    .populate('project', 'name');

  // Recent activity
  const recentActivity = await ActivityLog.find({ user: req.user.id })
    .sort({ createdAt: -1 })
    .limit(10);

  res.status(200).json({
    success: true,
    data: {
      projectsCount,
      tasksStats: {
        total: totalTasks,
        todo: tasksByStatus['To Do'] || 0,
        inProgress: tasksByStatus['In Progress'] || 0,
        review: tasksByStatus['Review'] || 0,
        done: tasksByStatus['Done'] || 0,
        completion:
          totalTasks > 0
            ? Math.round(((tasksByStatus['Done'] || 0) / totalTasks) * 100)
            : 0,
      },
      upcomingDeadlines,
      recentActivity,
    },
  });
});
