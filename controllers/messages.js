const Message = require('../models/Message');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get messages between users
// @route   GET /api/messages/:userId
// @access  Private
exports.getMessages = asyncHandler(async (req, res, next) => {
  const messages = await Message.find({
    $or: [
      { senderId: req.user.displayId, receiverId: req.params.userId },
      { senderId: req.params.userId, receiverId: req.user.displayId },
    ],
  }).sort({ createdAt: 1 });

  res.status(200).json({
    success: true,
    count: messages.length,
    data: messages,
  });
});

// @desc    Send message
// @route   POST /api/messages
// @access  Private
exports.sendMessage = asyncHandler(async (req, res, next) => {
  const { receiverId, text } = req.body;

  if (!receiverId || !text) {
    return next(
      new ErrorResponse('Please provide a receiver and message text', 400),
    );
  }

  // Check if receiver exists
  const receiver = await User.findOne({ displayId: receiverId });
  if (!receiver) {
    return next(
      new ErrorResponse(`User not found with id of ${receiverId}`, 404),
    );
  }

  const message = await Message.create({
    senderId: req.user.displayId,
    receiverId,
    text,
  });

  res.status(201).json({
    success: true,
    data: message,
  });
});

// @desc    Mark message as read
// @route   PUT /api/messages/:id/read
// @access  Private
exports.markAsRead = asyncHandler(async (req, res, next) => {
  let message = await Message.findById(req.params.id);

  if (!message) {
    return next(
      new ErrorResponse(`Message not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is the receiver of the message
  if (message.receiverId !== req.user.displayId) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to mark this message as read`,
        403,
      ),
    );
  }

  message = await Message.findByIdAndUpdate(
    req.params.id,
    { isRead: true },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    success: true,
    data: message,
  });
});

// @desc    Get user conversations
// @route   GET /api/messages/conversations
// @access  Private
exports.getConversations = asyncHandler(async (req, res, next) => {
  // Get all unique users the current user has exchanged messages with
  const conversations = await Message.aggregate([
    {
      $match: {
        $or: [
          { senderId: req.user.displayId },
          { receiverId: req.user.displayId },
        ],
      },
    },
    {
      $sort: { createdAt: -1 },
    },
    {
      $group: {
        _id: {
          $cond: [
            { $eq: ['$senderId', req.user.displayId] },
            '$receiverId',
            '$senderId',
          ],
        },
        lastMessage: { $first: '$$ROOT' },
        unreadCount: {
          $sum: {
            $cond: [
              {
                $and: [
                  { $eq: ['$receiverId', req.user.displayId] },
                  { $eq: ['$isRead', false] },
                ],
              },
              1,
              0,
            ],
          },
        },
      },
    },
    {
      $lookup: {
        from: 'users',
        localField: '_id',
        foreignField: 'displayId',
        as: 'user',
      },
    },
    {
      $unwind: '$user',
    },
    {
      $project: {
        _id: 1,
        userId: '$_id',
        name: '$user.name',
        email: '$user.email',
        color: '$user.color',
        lastMessage: 1,
        unreadCount: 1,
      },
    },
  ]);

  res.status(200).json({
    success: true,
    count: conversations.length,
    data: conversations,
  });
});
