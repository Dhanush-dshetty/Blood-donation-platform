const express = require('express');
const router = express.Router();
const { protect, donorOnly, hospitalOnly } = require('../middleware/auth');
const Donor = require('../models/Donor');
const BloodRequest = require('../models/BloodRequest');
const {
  getDonorProfile, updateDonorProfile, toggleAvailability,
  getAllDonors, findNearbyDonors
} = require('../controllers/donorController');

router.get('/profile', protect, donorOnly, getDonorProfile);
router.put('/profile', protect, donorOnly, updateDonorProfile);
router.patch('/availability', protect, donorOnly, toggleAvailability);
router.get('/nearby', protect, findNearbyDonors);
router.get('/', protect, hospitalOnly, getAllDonors);

// ── GET donors for map visualization ──────────────────────────────────
// Accessible by any authenticated user (donors, hospitals, admins)
router.get('/map', protect, async (req, res) => {
  try {
    const { city, bloodGroup } = req.query;
    const filter = {};

    if (bloodGroup && bloodGroup !== 'All') {
      filter.bloodGroup = bloodGroup;
    }

    if (city && city !== 'All') {
      filter.$or = [
        { city: new RegExp(`^${city}$`, 'i') },
        { area: new RegExp(city, 'i') }
      ];
    }

    // Return safe map-relevant fields (protecting direct phone numbers & sensitive credentials)
    const donors = await Donor.find(filter)
      .populate('user', 'name')
      .select('_id bloodGroup isAvailable location area city state totalDonations lastDonationDate responseRate alertHistory')
      .limit(300);

    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// Donor donation history
router.get('/history', protect, donorOnly, async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

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
