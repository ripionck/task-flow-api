const User = require('../models/User');

// @desc    Get all users
// @route   GET /api/users
// @access  Private/Admin
exports.getUsers = async (req, res, next) => {
  try {
    const users = await User.find().lean();

    res.status(200).json({
      success: true,
      count: users.length,
      data: users,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single user
// @route   GET /api/users/:id
// @access  Private
exports.getUser = async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id).lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user
// @route   PUT /api/users/:id
// @access  Private
exports.updateUser = async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id && !req.user.isAdmin) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this user',
      });
    }

    const allowedFields = [
      'name',
      'email',
      'avatar',
      'role',
      'status',
      'statusColor',
      'isTeamMember',
    ];

    // Only admins can update admin status
    if (req.user.isAdmin) {
      allowedFields.push('isAdmin');
    }

    const filteredBody = Object.keys(req.body)
      .filter((key) => allowedFields.includes(key))
      .reduce((obj, key) => {
        obj[key] = req.body[key];
        return obj;
      }, {});

    const user = await User.findByIdAndUpdate(req.params.id, filteredBody, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user settings
// @route   PUT /api/users/:id/settings
// @access  Private
exports.updateUserSettings = async (req, res, next) => {
  try {
    if (req.user.id !== req.params.id) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update these settings',
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { $set: { settings: req.body } },
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete user
// @route   DELETE /api/users/:id
// @access  Private/Admin
exports.deleteUser = async (req, res, next) => {
  try {
    if (req.user.systemRole !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to delete users',
      });
    }

    const user = await User.findByIdAndDelete(req.params.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    // Remove user from all teams
    await TeamMember.deleteMany({ userId: user._id });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add user to team
// @route   PUT /api/users/:id/add-member
// @access  Private/Admin
exports.addTeamMember = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isTeamMember: true },
      { new: true, runValidators: true },
    );

    // Optional: Add to TeamMember collection if needed
    // await TeamMember.create({ userId: user._id, boardId: req.body.boardId });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove user from team
// @route   PUT /api/users/:id/remove-member
// @access  Private/Admin
exports.removeTeamMember = async (req, res, next) => {
  try {
    const user = await User.findByIdAndUpdate(
      req.params.id,
      { isTeamMember: false },
      { new: true, runValidators: true },
    );

    // Optional: Remove from TeamMember collection
    // await TeamMember.deleteMany({ userId: user._id });

    res.status(200).json({
      success: true,
      data: user,
    });
  } catch (error) {
    next(error);
  }
};
