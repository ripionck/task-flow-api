const express = require('express');
const {
  createBoard,
  getBoards,
  getBoard,
  updateBoard,
  deleteBoard,
  getBoardTeam,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
  updateBoardProgress,
} = require('../controllers/boardController');
const { protect, adminCheck } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

// Admin-only routes
router.use(adminCheck);

router.route('/').get(getBoards).post(createBoard);

router.route('/:id').get(getBoard).put(updateBoard).delete(deleteBoard);

router.route('/:id/team').get(getBoardTeam).post(addTeamMember);

router
  .route('/:id/team/:userId')
  .delete(removeTeamMember)
  .put(updateTeamMemberRole);

router.route('/:id/progress').put(updateBoardProgress);

module.exports = router;
