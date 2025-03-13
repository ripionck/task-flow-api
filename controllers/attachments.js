const path = require('path');
const Attachment = require('../models/Attachment');
const Task = require('../models/Task');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get attachments for a task
// @route   GET /api/tasks/:taskId/attachments
// @access  Private
exports.getAttachments = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.taskId}`, 404),
    );
  }

  const attachments = await Attachment.find({ task: req.params.taskId });

  res.status(200).json({
    success: true,
    count: attachments.length,
    data: attachments,
  });
});

// @desc    Get single attachment
// @route   GET /api/tasks/:taskId/attachments/:id
// @access  Private
exports.getAttachment = asyncHandler(async (req, res, next) => {
  const attachment = await Attachment.findById(req.params.id);

  if (!attachment) {
    return next(
      new ErrorResponse(
        `Attachment not found with id of ${req.params.id}`,
        404,
      ),
    );
  }

  res.status(200).json({
    success: true,
    data: attachment,
  });
});

// @desc    Upload attachment to task
// @route   POST /api/tasks/:taskId/attachments
// @access  Private
exports.uploadAttachment = asyncHandler(async (req, res, next) => {
  const task = await Task.findById(req.params.taskId);

  if (!task) {
    return next(
      new ErrorResponse(`Task not found with id of ${req.params.taskId}`, 404),
    );
  }

  if (!req.files) {
    return next(new ErrorResponse(`Please upload a file`, 400));
  }

  const file = req.files.file;

  // Make sure the file is an allowed type
  const fileTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|ppt|pptx|zip|rar/;
  const extname = fileTypes.test(path.extname(file.name).toLowerCase());

  if (!extname) {
    return next(new ErrorResponse(`Please upload a valid file type`, 400));
  }

  // Check filesize
  if (file.size > process.env.MAX_FILE_UPLOAD) {
    return next(
      new ErrorResponse(
        `Please upload a file less than ${
          process.env.MAX_FILE_UPLOAD / 1000000
        }MB`,
        400,
      ),
    );
  }

  // Create custom filename
  file.name = `attachment_${task._id}_${Date.now()}${
    path.parse(file.name).ext
  }`;

  // Move file to upload path
  file.mv(`${process.env.FILE_UPLOAD_PATH}/${file.name}`, async (err) => {
    if (err) {
      console.error(err);
      return next(new ErrorResponse(`Problem with file upload`, 500));
    }

    // Create attachment in database
    const attachment = await Attachment.create({
      task: req.params.taskId,
      user: req.user.displayId,
      filename: file.name,
      originalName: req.files.file.name,
      fileType: file.mimetype,
      fileSize: file.size,
      url: `/uploads/${file.name}`,
    });

    res.status(200).json({
      success: true,
      data: attachment,
    });
  });
});

// @desc    Delete attachment
// @route   DELETE /api/tasks/:taskId/attachments/:id
// @access  Private
exports.deleteAttachment = asyncHandler(async (req, res, next) => {
  const attachment = await Attachment.findById(req.params.id);

  if (!attachment) {
    return next(
      new ErrorResponse(
        `Attachment not found with id of ${req.params.id}`,
        404,
      ),
    );
  }

  // Make sure user is attachment owner
  if (attachment.user !== req.user.displayId && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this attachment`,
        403,
      ),
    );
  }

  await attachment.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});
