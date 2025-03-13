const express = require('express');
const router = express.Router();
const {
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  toggleStarProject,
} = require('../controllers/projects');
const { protect } = require('../middleware/auth');

// Include task routes for project tasks
const taskRouter = require('./tasks');
router.use('/:projectId/tasks', taskRouter);

router.route('/').get(protect, getProjects).post(protect, createProject);

router
  .route('/:id')
  .get(protect, getProject)
  .put(protect, updateProject)
  .delete(protect, deleteProject);

router.route('/:id/star').put(protect, toggleStarProject);

module.exports = router;
