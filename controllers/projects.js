const Project = require('../models/Project');
const Task = require('../models/Task');
const ActivityLog = require('../models/ActivityLog');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = asyncHandler(async (req, res, next) => {
  // If admin wants all projects
  if (req.user.isAdmin && req.query.all === 'true') {
    const projects = await Project.find();

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  }

  if (!req.query.assignees && !req.user.isAdmin) {
    // This won't work with advancedResults as it's already processed
    // Instead, we need to modify the query before advancedResults is called
    const projects = await Project.find({
      assignees: { $in: [req.user.displayId] },
    });

    return res.status(200).json({
      success: true,
      count: projects.length,
      data: projects,
    });
  }

  // For admins with filtering through advancedResults
  res.status(200).json(res.advancedResults);
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is assigned to the project or is an admin
  if (!project.assignees.includes(req.user.displayId) && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to access this project`,
        403,
      ),
    );
  }

  res.status(200).json({
    success: true,
    data: project,
  });
});

// @desc    Create new project
// @route   POST /api/projects
// @access  Private
exports.createProject = asyncHandler(async (req, res, next) => {
  // Add user to request body
  req.body.createdBy = req.user.displayId;

  // Ensure the creator is included in assignees
  if (!req.body.assignees || !req.body.assignees.includes(req.user.displayId)) {
    req.body.assignees = req.body.assignees || [];
    req.body.assignees.push(req.user.displayId);
  }

  const project = await Project.create(req.body);

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'created',
    targetType: 'project',
    targetId: project._id,
    targetName: project.name,
  });

  res.status(201).json({
    success: true,
    data: project,
  });
});

// @desc    Update project
// @route   PUT /api/projects/:id
// @access  Private
exports.updateProject = asyncHandler(async (req, res, next) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is assigned to the project or is an admin
  if (!project.assignees.includes(req.user.displayId) && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this project`,
        403,
      ),
    );
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
  });

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'updated',
    targetType: 'project',
    targetId: project._id,
    targetName: project.name,
  });

  res.status(200).json({
    success: true,
    data: project,
  });
});

// @desc    Delete project
// @route   DELETE /api/projects/:id
// @access  Private
exports.deleteProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is the creator of the project or is an admin
  if (project.createdBy !== req.user.displayId && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this project`,
        403,
      ),
    );
  }

  // Delete all tasks associated with this project
  await Task.deleteMany({ project: req.params.id });

  await project.deleteOne();

  // Create activity log
  await ActivityLog.create({
    userId: req.user.displayId,
    action: 'deleted',
    targetType: 'project',
    targetId: project._id,
    targetName: project.name,
  });

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Toggle star status of project
// @route   PUT /api/projects/:id/star
// @access  Private
exports.toggleStarProject = asyncHandler(async (req, res, next) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404),
    );
  }

  // Check if user is assigned to the project
  if (!project.assignees.includes(req.user.displayId) && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to star this project`,
        403,
      ),
    );
  }

  project = await Project.findByIdAndUpdate(
    req.params.id,
    { starred: !project.starred },
    {
      new: true,
      runValidators: true,
    },
  );

  res.status(200).json({
    success: true,
    data: project,
  });
});
