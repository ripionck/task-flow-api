const Board = require('../models/Board');

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
      TeamMember: [req.user.id],
      TeamMemberNames: [user.fullName],
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
    const TeamMemberships = await TeamMember.find({ userId: req.user.id });
    const boardIds = TeamMemberships.map((tm) => tm.boardId);

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

    const TeamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (!TeamMember && req.user.role !== 'admin') {
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

    const TeamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (
      (!TeamMember || !['owner', 'admin'].includes(TeamMember.role)) &&
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

    const TeamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (
      (!TeamMember || TeamMember.role !== 'owner') &&
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

// @desc    Get board TeamMember members
// @route   GET /api/boards/:id/TeamMember
// @access  Private
exports.getBoardTeamMember = async (req, res, next) => {
  try {
    const board = await Board.findById(req.params.id);

    if (!board) {
      return res.status(404).json({
        success: false,
        message: 'Board not found',
      });
    }

    const TeamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (!TeamMember && req.user.role !== 'admin') {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this board',
      });
    }

    const TeamMembers = await TeamMember.find({ boardId: board._id }).populate({
      path: 'userId',
      select: 'fullName email avatar',
    });

    res.status(200).json({
      success: true,
      count: TeamMembers.length,
      data: TeamMembers,
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

    const TeamMember = await TeamMember.findOne({
      userId: req.user.id,
      boardId: board._id,
    });

    if (!TeamMember && req.user.role !== 'admin') {
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
