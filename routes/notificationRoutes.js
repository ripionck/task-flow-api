const express = require('express');
const {
  getMyNotifications,
  getUnreadCount,
  markAsRead,
  markAllAsRead,
  deleteNotification,
  deleteReadNotifications,
} = require('../controllers/notificationController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/').get(getMyNotifications);

router.route('/unread/count').get(getUnreadCount);

router.route('/read-all').put(markAllAsRead);

router.route('/read').delete(deleteReadNotifications);

router.route('/:id').delete(deleteNotification);

router.route('/:id/read').put(markAsRead);

module.exports = router;
