const express = require('express');
const router = express.Router();
const {
  getMessages,
  sendMessage,
  markAsRead,
  getConversations,
} = require('../controllers/messages');
const { protect } = require('../middleware/auth');

router.route('/').post(protect, sendMessage);

router.route('/conversations').get(protect, getConversations);

router.route('/:userId').get(protect, getMessages);

router.route('/:id/read').put(protect, markAsRead);

module.exports = router;
