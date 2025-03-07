const express = require('express');
const {
  createTask,
  getTask,
  updateTask,
  deleteTask,
} = require('../controllers/taskController');
const { getTaskComments } = require('../controllers/commentController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/').post(createTask);

router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);

router.route('/:taskId/comments').get(getTaskComments);

module.exports = router;
