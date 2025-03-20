const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// Helper function to generate display ID
const generateDisplayId = async (firstName, lastName) => {
  const baseDisplayId = (firstName[0] + lastName[0]).toUpperCase();
  let displayId = baseDisplayId;
  let counter = 1;

  while (await User.findOne({ displayId })) {
    displayId = `${baseDisplayId}${counter}`;
    counter++;
  }

  return displayId;
};

// Helper function to generate random color
const generateRandomColor = () => {
  const colors = [
    '#FF6B6B', // Red
    '#4ECDC4', // Teal
    '#45B7D1', // Blue
    '#96CEB4', // Green
    '#FFEEAD', // Yellow
    '#D4A5A5', // Pink
    '#9B59B6', // Purple
    '#3498DB', // Light Blue
    '#E67E22', // Orange
    '#1ABC9C', // Turquoise
    '#34495E', // Navy
    '#16A085', // Emerald
    '#27AE60', // Dark Green
    '#2980B9', // Ocean Blue
    '#8E44AD', // Violet
    '#2C3E50', // Dark Blue
    '#F1C40F', // Sun Yellow
    '#E74C3C', // Bright Red
    '#95A5A6', // Gray
    '#D35400', // Pumpkin
  ];
  return colors[Math.floor(Math.random() * colors.length)];
};

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
  const { name, email, password, role } = req.body;

  // Generate username from name
  let baseUsername = name
    .toLowerCase()
    .replace(/\s+/g, '.')
    .replace(/[^a-z.]/g, '');
  let username = baseUsername;
  let usernameCounter = 1;

  while (await User.findOne({ username })) {
    username = `${baseUsername}${usernameCounter}`;
    usernameCounter++;
  }

  // Generate displayId from first and last name
  const nameParts = name.split(' ').filter((part) => part.length > 0);
  if (nameParts.length < 2) {
    return next(
      new ErrorResponse('Please provide both first and last name', 400),
    );
  }

  const firstName = nameParts[0];
  const lastName = nameParts[nameParts.length - 1];
  const displayId = await generateDisplayId(firstName, lastName);

  // Create user with generated fields
  const user = await User.create({
    username,
    displayId,
    name,
    email,
    password,
    role,
    color: generateRandomColor(),
  });

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
