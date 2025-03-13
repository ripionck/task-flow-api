const express = require('express');
const router = express.Router();
const {
  getUsers,
  getUser,
  createUser,
  updateUser,
  deleteUser,
} = require('../controllers/users');
const { protect, authorize } = require('../middleware/auth');
const User = require('../models/User');
const advancedResults = require('../middleware/advancedResults');

router
  .route('/')
  .get(protect, advancedResults(User), getUsers)
  .post(protect, authorize('admin'), createUser);

router
  .route('/:id')
  .get(protect, getUser)
  .put(protect, updateUser)
  .delete(protect, authorize('admin'), deleteUser);

module.exports = router;
