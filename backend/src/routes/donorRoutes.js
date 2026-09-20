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
router.get('/nearby', protect, findNearbyDonors);
router.get('/', protect, hospitalOnly, getAllDonors);

// Donor donation history
router.get('/history', protect, donorOnly, async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const BloodRequest = require('../models/BloodRequest');
    const requests = await BloodRequest.find({
      'respondedDonors.donor': donor._id
    }).populate('hospital', 'hospitalName city address').sort({ createdAt: -1 });

    // Flatten into a history array
    const history = requests.map(req => {
      const myResponse = req.respondedDonors.find(
        r => r.donor.toString() === donor._id.toString()
      );
      return {
        requestId: req._id,
        hospital: req.hospital,
        bloodGroup: req.bloodGroup,
        urgencyLevel: req.urgencyLevel,
        respondedAt: myResponse?.respondedAt,
        status: myResponse?.status || 'accepted'
      };
    });

    res.json(history);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
