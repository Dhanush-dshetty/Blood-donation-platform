const express = require('express');
const router  = express.Router();
const { protect, hospitalOnly, donorOnly } = require('../middleware/auth');
const {
  createRequest,
  getHospitalRequests,
  respondToRequest,
  getOpenRequests,
  getRequestMetrics,
  getMetricsSummary,
} = require('../controllers/requestController');

// Existing endpoints — unchanged
router.post('/',                protect, hospitalOnly, createRequest);
router.get('/hospital',         protect, hospitalOnly, getHospitalRequests);
router.get('/open',             protect, donorOnly,    getOpenRequests);
router.post('/:id/respond',     protect, donorOnly,    respondToRequest);

// Map active requests (accessible by all authenticated roles)
router.get('/map-active', protect, async (req, res) => {
  try {
    const { city } = req.query;
    const BloodRequest = require('../models/BloodRequest');
    const requests = await BloodRequest.find({ status: { $in: ['open', 'partially_fulfilled'] } })
      .populate('hospital', 'hospitalName city address location phone facilityType')
      .sort({ createdAt: -1 })
      .limit(60);

    const filtered = city && city !== 'All'
      ? requests.filter(r => r.hospital && r.hospital.city && r.hospital.city.toLowerCase() === city.toLowerCase())
      : requests;

    res.json(filtered);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// New evaluation/metrics endpoints (Req A + Req B)
router.get('/metrics/summary',  protect, hospitalOnly, getMetricsSummary);
router.get('/:id/metrics',      protect, hospitalOnly, getRequestMetrics);

module.exports = router;
