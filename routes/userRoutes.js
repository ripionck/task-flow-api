const express = require('express');
const {
  getUsers,
  getUser,
  updateUser,
  updateUserSettings,
  deleteUser,
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

router.put('/:id/settings', updateUserSettings);

module.exports = router;
