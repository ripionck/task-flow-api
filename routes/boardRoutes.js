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
} = require('../controllers/boardController');
const { getBoardTasks } = require('../controllers/taskController');
const { protect } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/').get(getBoards).post(createBoard);

router.route('/:id').get(getBoard).put(updateBoard).delete(deleteBoard);

router.route('/:id/team').get(getBoardTeam).post(addTeamMember);

router
  .route('/:id/team/:userId')
  .delete(removeTeamMember)
  .put(updateTeamMemberRole);

router.route('/:boardId/tasks').get(getBoardTasks);

module.exports = router;
