const express = require('express');
const router = express.Router();
const { protect, hospitalOnly } = require('../middleware/auth');
const axios = require('axios');
const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');

// Get AI donor match rankings for a request
router.post('/match-donors', protect, hospitalOnly, async (req, res) => {
  try {
    const { donors, bloodGroup, urgencyLevel } = req.body;
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/rank-donors`,
      { donors, bloodGroup, urgencyLevel }
    );
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ message: 'AI service unavailable', error: err.message });
  }
});

// Get demand forecast for a hospital
router.get('/forecast', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    // Gather last 90 days of requests for this hospital
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const history = await BloodRequest.find({
      hospital: hospital._id,
      createdAt: { $gte: since }
    });

    const response = await axios.post(
      `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/forecast-demand`,
      { history }
    );
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ message: 'AI service unavailable', error: err.message });
  }
});

// Chatbot endpoint for donors
router.post('/chat', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const response = await axios.post(
      `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/chat`,
      { message }
    );
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ message: 'AI service unavailable', error: err.message });
  }
});

module.exports = router;
