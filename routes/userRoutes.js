const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  updateUserSettings,
  deleteUser,
} = require('../controllers/userController');
const { protect, authorize } = require('../middlewares/auth');

const router = express.Router();

// Apply auth middleware to all routes
router.use(protect);

router.route('/').get(authorize('admin'), getUsers);

router
  .route('/:id')
  .get(getUser)
  .put(updateUser)
  .delete(authorize('admin'), deleteUser);

router.put('/:id/settings', updateUserSettings);

module.exports = router;
