const express = require('express');
const {
  createBoard,
  getBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  updateBoardProgress,
} = require('../controllers/boardController');
const { protect, adminCheck } = require('../middlewares/auth');

const router = express.Router();

router.use(protect);
router.use(adminCheck);

router.route('/').get(getBoards).post(createBoard);

router.route('/:id').get(getBoard).put(updateBoard).delete(deleteBoard);

router.route('/:id/progress').put(updateBoardProgress);

module.exports = router;
