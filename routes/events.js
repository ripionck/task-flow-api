const express = require('express');
const router = express.Router();
const {
  getEvents,
  getEvent,
  createEvent,
  updateEvent,
  deleteEvent,
} = require('../controllers/events');
const { protect } = require('../middleware/auth');
const advancedResults = require('../middleware/advancedResults');
const Event = require('../models/Event');

router
  .route('/')
  .get(protect, advancedResults(Event), getEvents)
  .post(protect, createEvent);

router
  .route('/:id')
  .get(protect, getEvent)
  .put(protect, updateEvent)
  .delete(protect, deleteEvent);

module.exports = router;
