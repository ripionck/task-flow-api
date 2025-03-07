const express = require('express');
const {
  createComment,
  getComment,
  updateComment,
  deleteComment,
} = require('../controllers/commentController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/').post(createComment);

router.route('/:id').get(getComment).put(updateComment).delete(deleteComment);

module.exports = router;
