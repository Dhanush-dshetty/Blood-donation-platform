const express = require('express');
const router = express.Router();
const { protect, hospitalOnly } = require('../middleware/auth');
const Hospital = require('../models/Hospital');

// Get hospital profile
router.get('/profile', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id }).populate('user', 'name email phone');
    if (!hospital) return res.status(404).json({ message: 'Hospital profile not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Update hospital profile
router.put('/profile', protect, hospitalOnly, async (req, res) => {
  try {
    const updates = req.body;
    if (updates.latitude && updates.longitude) {
      updates.location = {
        type: 'Point',
        coordinates: [parseFloat(updates.longitude), parseFloat(updates.latitude)]
      };
    }
    const hospital = await Hospital.findOneAndUpdate(
      { user: req.user.id }, updates, { new: true }
    ).populate('user', 'name email phone');
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
