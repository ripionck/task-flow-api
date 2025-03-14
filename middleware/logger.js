const ActivityLog = require('../models/ActivityLog');

const logActivity = async (
  req,
  user,
  action,
  resource,
  resourceId,
  details = '',
) => {
  try {
    await ActivityLog.create({
      user: user._id,
      action,
      resource,
      resourceId,
      details,
    });
  } catch (err) {
    console.error('Error logging activity:', err);
  }
};

module.exports = { logActivity };
