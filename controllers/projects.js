const Project = require('../models/Project');
const User = require('../models/User');
const asyncHandler = require('../middleware/async');
const ErrorResponse = require('../utils/errorResponse');
const paginateResults = require('../utils/paginateResults');

// @desc    Get all projects
// @route   GET /api/projects
// @access  Private
exports.getProjects = asyncHandler(async (req, res, next) => {
  let query;

  // Copy req.query
  const reqQuery = { ...req.query };

  // Fields to exclude from filtering
  const removeFields = ['select', 'sort', 'page', 'limit'];
  removeFields.forEach((param) => delete reqQuery[param]);

  // Create query string
  let queryStr = JSON.stringify(reqQuery);

  // Create operators ($gt, $gte, etc)
  queryStr = queryStr.replace(
    /\b(gt|gte|lt|lte|in)\b/g,
    (match) => `$${match}`,
  );

  // Finding resource
  query = Project.find(JSON.parse(queryStr)).populate('assignees');

  // Select fields
  if (req.query.select) {
    const fields = req.query.select.split(',').join(' ');
    query = query.select(fields);
  }

  // Sort
  if (req.query.sort) {
    const sortBy = req.query.sort.split(',').join(' ');
    query = query.sort(sortBy);
  } else {
    query = query.sort('-createdAt');
  }

  // Apply pagination
  const { query: paginatedQuery, pagination } = await paginateResults(
    Project,
    query,
    req,
  );

  // Execute query
  const projects = await paginatedQuery;

  res.status(200).json({
    success: true,
    count: projects.length,
    pagination,
    data: projects,
  });
});

// @desc    Get single project
// @route   GET /api/projects/:id
// @access  Private
exports.getProject = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id).populate('assignees');

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404),
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
  // Add user to req.body
  req.body.createdBy = req.user.id;

  // Validate assignees exist
  if (req.body.assignees && req.body.assignees.length > 0) {
    for (const assigneeId of req.body.assignees) {
      const userExists = await User.findById(assigneeId);
      if (!userExists) {
        return next(
          new ErrorResponse(`User not found with id of ${assigneeId}`, 404),
        );
      }
    }
  }

  const project = await Project.create(req.body);

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

  // Make sure user is project creator or admin
  if (project.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to update this project`,
        401,
      ),
    );
  }

  // Validate assignees exist
  if (req.body.assignees && req.body.assignees.length > 0) {
    for (const assigneeId of req.body.assignees) {
      const userExists = await User.findById(assigneeId);
      if (!userExists) {
        return next(
          new ErrorResponse(`User not found with id of ${assigneeId}`, 404),
        );
      }
    }
  }

  project = await Project.findByIdAndUpdate(req.params.id, req.body, {
    new: true,
    runValidators: true,
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

  // Make sure user is project creator or admin
  if (project.createdBy.toString() !== req.user.id && !req.user.isAdmin) {
    return next(
      new ErrorResponse(
        `User ${req.user.id} is not authorized to delete this project`,
        401,
      ),
    );
  }

  // This will trigger the cascade delete of related tasks
  await project.remove();

  res.status(200).json({
    success: true,
    data: {},
  });
});

// @desc    Get project progress
// @route   GET /api/projects/:id/progress
// @access  Private
exports.getProjectProgress = asyncHandler(async (req, res, next) => {
  const project = await Project.findById(req.params.id);

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404),
    );
  }

  const progress = await project.calculateProgress();

  res.status(200).json({
    success: true,
    data: { progress },
  });
});

// @desc    Toggle project star status
// @route   PUT /api/projects/:id/star
// @access  Private
exports.toggleProjectStar = asyncHandler(async (req, res, next) => {
  let project = await Project.findById(req.params.id);

  if (!project) {
    return next(
      new ErrorResponse(`Project not found with id of ${req.params.id}`, 404),
    );
  }

  // Toggle the starred status
  project = await Project.findByIdAndUpdate(
    req.params.id,
    { starred: !project.starred },
    { new: true },
  );

  res.status(200).json({
    success: true,
    data: project,
  });
});
