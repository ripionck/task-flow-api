const Board = require('../models/Board');
const TeamMember = require('../models/TeamMember');
const User = require('../models/User');

// @desc    Get board team members
// @route   GET /api/boards/:id/team
// @access  Private
exports.getTeamMembers = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found',
      });
    }

    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (!teamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this board',
      });
    }

    const teamMembers = await TeamMember.find({ boardId: board._id }).populate({
      path: 'userId',
      select: 'fullName email avatar',
    });

    res.status(200).json({
      success: true,
      count: teamMembers.length,
      data: teamMembers,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Add team member to board
// @route   POST /api/boards/:id/team
// @access  Private
exports.addTeamMember = async (req, res, next) => {
  try {
    const { userId, role } = req.body;

    if (!userId || !role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both userId and role',
      });
    }

    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found',
      });
    }

    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (
      (!teamMember || !['owner', 'admin'].includes(teamMember.role)) &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to add members to this board',
      });
    }

    const existingMember = await TeamMember.findOne({
      userId,
      boardId: board._id,
    });

    if (existingMember) {
      return res.status(400).json({
        success: false,
        message: 'User is already a member of this board',
      });
    }

    const newTeamMember = await TeamMember.create({
      userId,
      boardId: board._id,
      role,
    });

    const user = await User.findById(userId).select('fullName');
    if (user) {
      const update = {};
      if (!board.team.includes(userId)) {
        update.$push = { team: userId };
      }
      if (user.fullName && !board.teamNames.includes(user.fullName)) {
        update.$push = { ...update.$push, teamNames: user.fullName };
      }
      if (Object.keys(update).length > 0) {
        await Board.findByIdAndUpdate(board._id, update);
      }
    }

    res.status(201).json({
      success: true,
      data: newTeamMember,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Remove team member from board
// @route   DELETE /api/boards/:id/team/:userId
// @access  Private
exports.removeTeamMember = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found',
      });
    }

    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (
      (!teamMember || teamMember.role !== 'owner') &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to remove members from this board',
      });
    }

    const memberToRemove = await TeamMember.findOne({
      userId: req.params.userId,
      boardId: board._id,
    });

    if (!memberToRemove) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
    }

    if (memberToRemove.role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot remove the owner of the board',
      });
    }

    await TeamMember.deleteOne({ _id: memberToRemove._id });

    const userToRemove = await User.findById(req.params.userId).select(
      'fullName',
    );
    if (userToRemove) {
      const update = {
        $pull: { team: req.params.userId },
      };
      if (userToRemove.fullName) {
        update.$pull.teamNames = userToRemove.fullName;
      }
      await Board.findByIdAndUpdate(board._id, update);
    }

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update team member role
// @route   PUT /api/boards/:id/team/:userId
// @access  Private
exports.updateTeamMemberRole = async (req, res, next) => {
  try {
    const { role } = req.body;

    if (!role) {
      return res.status(400).json({
        success: false,
        message: 'Please provide a role',
      });
    }

    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found',
      });
    }

    const teamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (
      (!teamMember || teamMember.role !== 'owner') &&
      req.user.role !== 'admin'
    ) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update member roles on this board',
      });
    }

    const memberToUpdate = await TeamMember.findOne({
      userId: req.params.userId,
      boardId: board._id,
    });

    if (!memberToUpdate) {
      return res.status(404).json({
        success: false,
        message: 'Team member not found',
      });
    }

    if (memberToUpdate.role === 'owner') {
      return res.status(400).json({
        success: false,
        message: 'Cannot change the role of the owner',
      });
    }

    memberToUpdate.role = role;
    await memberToUpdate.save();

    res.status(200).json({
      success: true,
      data: memberToUpdate,
    });
  } catch (error) {
    next(error);
  }
};
