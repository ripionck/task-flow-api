const express = require('express');
const router = express.Router();
const { getActivityLogs, getUserActivity } = require('../controllers/activity');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getActivityLogs);

router.route('/user/:userId').get(protect, getUserActivity);

module.exports = router;
