const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  deleteUser,
  addTeamMember,
  removeTeamMember,
  updateUserSettings,
} = require('../controllers/userController');
const { protect, adminCheck } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/').get(adminCheck, getUsers);

router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(adminCheck, deleteUser);

router.route('/:id/settings').put(updateUserSettings);

// Team membership routes
router.put('/:id/add-member', adminCheck, addTeamMember);
router.put('/:id/remove-member', adminCheck, removeTeamMember);

module.exports = router;
