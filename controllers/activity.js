const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all activity logs
// @route   GET /api/activity
// @access  Private
exports.getActivityLogs = asyncHandler(async (req, res, next) => {
  // Add time display to each log
  const logs = await ActivityLog.find().sort({ timestamp: -1 }).limit(20);

  const logsWithTimeDisplay = logs.map((log) => {
    return {
      ...log._doc,
      timeDisplay: log.getTimeDisplay(),
    };
  });

  res.status(200).json({
    success: true,
    count: logsWithTimeDisplay.length,
    data: logsWithTimeDisplay,
  });
});

// @desc    Get user activity logs
// @route   GET /api/activity/user/:userId
// @access  Private
exports.getUserActivity = asyncHandler(async (req, res, next) => {
  // Check if user is requesting their own activity or is an admin
  if (req.params.userId !== req.user.displayId && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to view this user's activity`,
        403,
      ),
    );
  }

  const logs = await ActivityLog.find({ userId: req.params.userId })
    .sort({ timestamp: -1 })
    .limit(20);

  const logsWithTimeDisplay = logs.map((log) => {
    return {
      ...log._doc,
      timeDisplay: log.getTimeDisplay(),
    };
  });

  res.status(200).json({
    success: true,
    count: logsWithTimeDisplay.length,
    data: logsWithTimeDisplay,
  });
});
