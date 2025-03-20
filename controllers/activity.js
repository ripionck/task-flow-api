const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all activity logs
// @route   GET /api/activity
// @access  Private/Admin
exports.getActivityLogs = asyncHandler(async (req, res, next) => {
  let query;

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
  query = ActivityLog.find(JSON.parse(queryStr)).populate({
    path: 'user',
    select: 'name username displayId color',
  });

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
    ActivityLog,
    query,
    req,
  );

  // Execute query
  const logs = await paginatedQuery;

  res.status(200).json({
    success: true,
    count: logs.length,
    pagination,
    data: logs,
  });
});

// @desc    Get activity logs for a specific resource
// @route   GET /api/activity/resource/:resourceId
// @access  Private
exports.getResourceActivityLogs = asyncHandler(async (req, res, next) => {
  const logs = await ActivityLog.find({
    resourceId: req.params.resourceId,
  })
    .populate({
      path: 'user',
      select: 'name username displayId color',
    })
    .sort('-createdAt');

  res.status(200).json({
    success: true,
    count: logs.length,
    data: logs,
  });
});

// @desc    Get activity logs for a specific user
// @route   GET /api/activity/user/:userId
// @access  Private
exports.getUserActivityLogs = asyncHandler(async (req, res, next) => {
  // Pagination
  const page = parseInt(req.query.page, 10) || 1;
  const limit = parseInt(req.query.limit, 10) || 20;
  const startIndex = (page - 1) * limit;
  const endIndex = page * limit;
  const total = await ActivityLog.countDocuments({ user: req.params.userId });

  const logs = await ActivityLog.find({
    user: req.params.userId,
  })
    .populate({
      path: 'user',
      select: 'name username displayId color',
    })
    .sort('-createdAt')
    .skip(startIndex)
    .limit(limit);

  // Pagination result
  const pagination = {};

  if (endIndex < total) {
    pagination.next = {
      page: page + 1,
      limit,
    };
  }

  if (startIndex > 0) {
    pagination.prev = {
      page: page - 1,
      limit,
    };
  }

  res.status(200).json({
    success: true,
    count: logs.length,
    pagination,
    data: logs,
  });
});

// @desc    Create activity log
// @route   POST /api/activity
// @access  Private
exports.createActivityLog = asyncHandler(async (req, res, next) => {
  // Add user to req.body if not provided (for system actions)
  if (!req.body.user) {
    req.body.user = req.user.id;
  }

  const log = await ActivityLog.create(req.body);

  res.status(201).json({
    success: true,
    data: log,
  });
});

// @desc    Delete activity log
// @route   DELETE /api/activity/:id
// @access  Private/Admin
exports.deleteActivityLog = asyncHandler(async (req, res, next) => {
  const log = await ActivityLog.findById(req.params.id);

  if (!log) {
    return next(
      new ErrorResponse(
        `Activity log not found with id of ${req.params.id}`,
        404,
      ),
    );
  }

  // Only admins can delete logs
  if (!req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this log`,
        401,
      ),
    );
  }

  await log.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Clean old activity logs
// @route   DELETE /api/activity/clean
// @access  Private/Admin
exports.cleanActivityLogs = asyncHandler(async (req, res, next) => {
  // Only admins can clean logs
  if (!req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to clean logs`,
        401,
      ),
    );
  }

  const { olderThan } = req.body;

  if (!olderThan) {
    return next(
      new ErrorResponse('Please provide olderThan date parameter', 400),
    );
  }

  const date = new Date(olderThan);

  if (isNaN(date.getTime())) {
    return next(new ErrorResponse('Invalid date format', 400));
  }

  const result = await ActivityLog.deleteMany({
    createdAt: { $lt: date },
  });

  res.status(200).json({
    success: true,
    data: {
      deleted: result.deletedCount,
    },
  });
});
