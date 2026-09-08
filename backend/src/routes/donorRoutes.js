const express = require('express');
const router = express.Router();
const { protect, donorOnly, hospitalOnly } = require('../middleware/auth');
const {
  getDonorProfile, updateDonorProfile, toggleAvailability,
  getAllDonors, findNearbyDonors
} = require('../controllers/donorController');

router.get('/profile', protect, donorOnly, getDonorProfile);
router.put('/profile', protect, donorOnly, updateDonorProfile);
router.patch('/availability', protect, donorOnly, toggleAvailability);
router.get('/nearby', protect, findNearbyDonors);          // hospital uses this
router.get('/', protect, hospitalOnly, getAllDonors);       // hospital admin view

module.exports = router;
