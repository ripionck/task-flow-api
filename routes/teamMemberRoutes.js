const express = require('express');
const router = express.Router();
const {
  getTeamMembers,
  addTeamMember,
  removeTeamMember,
  updateTeamMemberRole,
} = require('../controllers/teamController');

router.route('/').get(getTeamMembers).post(addTeamMember);

router.route('/:userId').delete(removeTeamMember).put(updateTeamMemberRole);

module.exports = router;
