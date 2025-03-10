const Board = require('../models/Board');
const TeamMember = require('../models/TeamMember');

// @desc    Create new board
// @route   POST /api/boards
// @access  Private
exports.createBoard = async (req, res, next) => {
  try {
    const User = require('../models/User');
    const user = await User.findById(req.user.id).select('fullName');

    if (!user) {
      return res.status(404).json({
        success: false,
        message: 'User not found',
      });
    }

    const boardData = {
      ...req.body,
      createdBy: user.fullName,
      team: [req.user.id],
      teamNames: [user.fullName],
    };

    const board = await Board.create(boardData);

    await TeamMember.create({
      userId: req.user.id,
      boardId: board._id,
      role: 'owner',
    });

    res.status(201).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get all boards
// @route   GET /api/boards
// @access  Private
exports.getBoards = async (req, res, next) => {
  try {
    const teamMemberships = await TeamMember.find({ userId: req.user.id });
    const boardIds = teamMemberships.map((tm) => tm.boardId);

    const boards = await Board.find({ _id: { $in: boardIds } });

    res.status(200).json({
      success: true,
      count: boards.length,
      data: boards,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get single board
// @route   GET /api/boards/:id
// @access  Private
exports.getBoard = async (req, res, next) => {
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

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update board
// @route   PUT /api/boards/:id
// @access  Private
exports.updateBoard = async (req, res, next) => {
  try {
    let board = await Board.findById(req.params.id);

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
        message: 'Not authorized to update this board',
      });
    }

    board = await Board.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.status(200).json({
      success: true,
      data: board,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete board
// @route   DELETE /api/boards/:id
// @access  Private
exports.deleteBoard = async (req, res, next) => {
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
        message: 'Not authorized to delete this board',
      });
    }

    await TeamMember.deleteMany({ boardId: board._id });
    await Board.deleteOne({ _id: req.params.id });

    res.status(200).json({
      success: true,
      data: {},
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Get board team members
// @route   GET /api/boards/:id/team
// @access  Private
exports.getBoardTeam = async (req, res, next) => {
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
    const User = require('../models/User');

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
    const User = require('../models/User');

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

// @desc    Update board progress
// @route   PUT /api/boards/:id/progress
// @access  Private
exports.updateBoardProgress = async (req, res, next) => {
  try {
    const { progress, totalTasks, completedTasks } = req.body;

    let updateData = {};

    if (progress !== undefined) {
      updateData.progress = Math.min(Math.max(progress, 0), 100);
    }

    if (totalTasks !== undefined) {
      updateData.totalTasks = totalTasks;
    }

    if (completedTasks !== undefined) {
      updateData.completedTasks = completedTasks;
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

    if (!teamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this board',
      });
    }

    const updatedBoard = await Board.findByIdAndUpdate(
      req.params.id,
      updateData,
      { new: true, runValidators: true },
    );

    res.status(200).json({
      success: true,
      data: updatedBoard,
    });
  } catch (error) {
    next(error);
  }
};
