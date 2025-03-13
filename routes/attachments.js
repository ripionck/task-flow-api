const express = require('express');
const router = express.Router({ mergeParams: true });
const {
  getAttachments,
  getAttachment,
  uploadAttachment,
  deleteAttachment,
} = require('../controllers/attachments');
const { protect } = require('../middleware/auth');

router.route('/').get(protect, getAttachments).post(protect, uploadAttachment);

router
  .route('/:id')
  .get(protect, getAttachment)
  .delete(protect, deleteAttachment);

module.exports = router;
