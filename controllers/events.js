const Event = require('../models/Event');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all events
// @route   GET /api/events
// @access  Private
exports.getEvents = asyncHandler(async (req, res, next) => {
  // Add filter for events where user is an attendee
  if (!req.query.attendee && !req.user.isAdmin) {
    req.query.attendees = { $in: [req.user.displayId] };
  }

  res.status(200).json(res.advancedResults);
});

// @desc    Get single event
// @route   GET /api/events/:id
// @access  Private
exports.getEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return next(
      new ErrorResponse(`Event not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is an attendee of the event or is an admin
  if (!event.attendees.includes(req.user.displayId) && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this event`,
        403,
      ),
    );
  }

  res.status(200).json({
    success: true,
    data: event,
  });
});

// @desc    Create new event
// @route   POST /api/events
// @access  Private
exports.createEvent = asyncHandler(async (req, res, next) => {
  // Add user to request body
  req.body.createdBy = req.user.displayId;

  // Ensure the creator is included in attendees
  if (!req.body.attendees || !req.body.attendees.includes(req.user.displayId)) {
    req.body.attendees = req.body.attendees || [];
    req.body.attendees.push(req.user.displayId);
  }

  const event = await Event.create(req.body);

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'created',
    targetType: 'event',
    targetId: event._id,
    targetName: event.title,
  });

  res.status(201).json({
    success: true,
    data: event,
  });
});

// @desc    Update event
// @route   PUT /api/events/:id
// @access  Private
exports.updateEvent = asyncHandler(async (req, res, next) => {
  let event = await Event.findById(req.params.id);

  if (!event) {
    return next(
      new ErrorResponse(`Event not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is the creator of the event or is an admin
  if (event.createdBy !== req.user.displayId && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this event`,
        403,
      ),
    );
  }

  event = await Event.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'updated',
    targetType: 'event',
    targetId: event._id,
    targetName: event.title,
  });

  res.status(200).json({
    success: true,
    data: event,
  });
});

// @desc    Delete event
// @route   DELETE /api/events/:id
// @access  Private
exports.deleteEvent = asyncHandler(async (req, res, next) => {
  const event = await Event.findById(req.params.id);

  if (!event) {
    return next(
      new ErrorResponse(`Event not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is the creator of the event or is an admin
  if (event.createdBy !== req.user.displayId && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this event`,
        403,
      ),
    );
  }

  await event.remove();

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'deleted',
    targetType: 'event',
    targetId: event._id,
    targetName: event.title,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});
