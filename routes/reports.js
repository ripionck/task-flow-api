const express = require('express');
const {
  getProjectCompletionStats,
  getTaskDistribution,
  getTeamPerformance,
  getWorkloadDistribution,
  getActivityTimeline,
  getProjectTimeTracking,
  getTaskCompletionTrend,
  getDashboardSummary,
} = require('../controllers/reports');

const router = express.Router();

const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/dashboard/summary', getDashboardSummary);

router.get('/projects/completion', getProjectCompletionStats);
router.get('/projects/time-tracking', getProjectTimeTracking);

router.get('/tasks/distribution', getTaskDistribution);
router.get('/tasks/completion-trend', getTaskCompletionTrend);

router.get(
  '/team/performance',
  authorize('Admin', 'Manager'),
  getTeamPerformance,
);

router.get('/workload', getWorkloadDistribution);

router.get('/activity/timeline', getActivityTimeline);

module.exports = router;
