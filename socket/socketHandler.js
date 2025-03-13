const Message = require('../models/Message');
const User = require('../models/User');

// Store online users
const onlineUsers = new Map();

exports.handleSocketConnection = (io, socket) => {
  const userId = socket.user.displayId;

  console.log(`User connected: ${userId}`);

  // Add user to online users
  onlineUsers.set(userId, socket.id);

  // Broadcast user online status
  io.emit('userStatus', {
    userId,
    status: 'online',
  });

  // Join personal room for direct messages
  socket.join(userId);

  // Handle private message
  socket.on('privateMessage', async (data) => {
    try {
      const { receiverId, text } = data;

      if (!receiverId || !text) {
        return socket.emit('error', {
          message: 'Receiver ID and message text are required',
        });
      }

      // Check if receiver exists
      const receiver = await User.findOne({ displayId: receiverId });
      if (!receiver) {
        return socket.emit('error', {
          message: `User not found with id of ${receiverId}`,
        });
      }

      // Create and save message
      const message = await Message.create({
        senderId: userId,
        receiverId,
        text,
      });

      // Send to sender
      socket.emit('messageReceived', message);

      // Send to receiver if online
      if (onlineUsers.has(receiverId)) {
        io.to(receiverId).emit('messageReceived', message);
      }

      // Update conversations list for both users
      updateConversationsList(io, userId);
      updateConversationsList(io, receiverId);
    } catch (error) {
      console.error('Error sending private message:', error);
      socket.emit('error', { message: 'Failed to send message' });
    }
  });

  // Handle typing status
  socket.on('typing', (data) => {
    const { receiverId, isTyping } = data;

    if (onlineUsers.has(receiverId)) {
      io.to(receiverId).emit('userTyping', {
        userId,
        isTyping,
      });
    }
  });

  // Handle read receipt
  socket.on('markAsRead', async (data) => {
    try {
      const { messageId } = data;

      const message = await Message.findById(messageId);

      if (!message) {
        return socket.emit('error', {
          message: `Message not found with id of ${messageId}`,
        });
      }

      // Check if user is the receiver of the message
      if (message.receiverId !== userId) {
        return socket.emit('error', {
          message: 'Not authorized to mark this message as read',
        });
      }

      // Update message
      message.isRead = true;
      await message.save();

      // Notify sender if online
      if (onlineUsers.has(message.senderId)) {
        io.to(message.senderId).emit('messageRead', { messageId });
      }
    } catch (error) {
      console.error('Error marking message as read:', error);
      socket.emit('error', { message: 'Failed to mark message as read' });
    }
  });

  // Handle disconnect
  socket.on('disconnect', () => {
    console.log(`User disconnected: ${userId}`);

    // Remove user from online users
    onlineUsers.delete(userId);

    // Broadcast user offline status
    io.emit('userStatus', {
      userId,
      status: 'offline',
    });
  });
};

// Helper function to update conversations list
async function updateConversationsList(io, userId) {
  try {
    if (!onlineUsers.has(userId)) return;

    // Get all unique users the current user has exchanged messages with
    const conversations = await Message.aggregate([
      {
        $match: {
          $or: [{ senderId: userId }, { receiverId: userId }],
        },
      },
      {
        $sort: { createdAt: -1 },
      },
      {
        $group: {
          _id: {
            $cond: [{ $eq: ['$senderId', userId] }, '$receiverId', '$senderId'],
          },
          lastMessage: { $first: '$$ROOT' },
          unreadCount: {
            $sum: {
              $cond: [
                {
                  $and: [
                    { $eq: ['$receiverId', userId] },
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

    // Send updated conversations list to user
    io.to(userId).emit('conversationsUpdated', conversations);
  } catch (error) {
    console.error('Error updating conversations list:', error);
  }
}
