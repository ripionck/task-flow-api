const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  updateTaskStatus,
} = require('../controllers/tasks');
const { protect } = require('../middleware/auth');

// Include comment routes for task comments
const commentRouter = require('./comments');
router.use('/:taskId/comments', commentRouter);

// Include attachment routes for task attachments
const attachmentRouter = require('./attachments');
router.use('/:taskId/attachments', attachmentRouter);

router.route('/').get(protect, getTasks).post(protect, createTask);

router
  .route('/:id')
  .get(protect, getTask)
  .put(protect, updateTask)
  .delete(protect, deleteTask);

router.route('/:id/status').put(protect, updateTaskStatus);

module.exports = router;
