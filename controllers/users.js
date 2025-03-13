const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = asyncHandler(async (req, res, next) => {
  if (req.query.all === 'true') {
    const users = await User.find();

    return res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  }

  // Otherwise use the advancedResults middleware results
  res.status(200).json(res.advancedResults);
});

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is requesting their own profile or is an admin
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this user's data`,
        403,
      ),
    );
  }

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Create user
// @route   POST /api/users
// @access  Private/Admin
exports.createUser = asyncHandler(async (req, res, next) => {
  const user = await User.create(req.body);

  res.status(201).json({
    success: true,
    data: user,
  });
});

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = asyncHandler(async (req, res, next) => {
  let user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is updating their own profile or is an admin
  if (req.user.id !== req.params.id && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this user`,
        403,
      ),
    );
  }

  // Don't allow role updates unless admin
  if (req.body.role && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update role`,
        403,
      ),
    );
  }

  user = await User.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  res.status(200).json({
    success: true,
    data: user,
  });
});

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = asyncHandler(async (req, res, next) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    return next(
      new ErrorResponse(`User not found with id of ${req.params.id}`, 404),
    );
  }

  await user.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});
