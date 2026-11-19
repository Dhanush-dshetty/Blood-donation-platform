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

// ── POST /api/requests/inter-hospital-transfer ─────────────────────────
// Hospital A requests blood stock from Hospital B
router.post('/inter-hospital-transfer', protect, hospitalOnly, async (req, res) => {
  try {
    const { targetHospitalId, bloodGroup, unitsRequired, urgency, note } = req.body;
    const Hospital = require('../models/Hospital');
    const BloodRequest = require('../models/BloodRequest');

    if (!targetHospitalId || !bloodGroup || !unitsRequired) {
      return res.status(400).json({ message: 'targetHospitalId, bloodGroup, and unitsRequired are required' });
    }

    // Find requesting hospital
    const requestingHospital = await Hospital.findOne({ user: req.user.id });
    if (!requestingHospital) return res.status(404).json({ message: 'Your hospital profile not found' });

    // Find target hospital
    const targetHospital = await Hospital.findById(targetHospitalId);
    if (!targetHospital) return res.status(404).json({ message: 'Target hospital not found' });

    // Create transfer request (using hospital field = target hospital, requestingHospital = source)
    const transfer = await BloodRequest.create({
      hospital: targetHospital._id,
      requestingHospital: requestingHospital._id,
      bloodGroup,
      unitsRequired: parseInt(unitsRequired),
      urgencyLevel: urgency || 'medium',
      patientCondition: note || '',
      type: 'inter_hospital_transfer',
      transferStatus: 'pending',
      status: 'open'
    });

    // Emit Socket.IO event to target hospital's room
    const io = req.app.get('io');
    if (io) {
      io.to(`hospital_${targetHospitalId}`).emit('inter_hospital_transfer_request', {
        transferId: transfer._id,
        fromHospital: requestingHospital.hospitalName,
        fromCity: requestingHospital.city,
        bloodGroup,
        unitsRequired,
        urgency: urgency || 'medium',
        note
      });
    }

    res.status(201).json({
      message: 'Inter-hospital transfer request sent successfully',
      transfer: {
        _id: transfer._id,
        targetHospital: { _id: targetHospital._id, hospitalName: targetHospital.hospitalName, city: targetHospital.city },
        bloodGroup,
        unitsRequired,
        urgency: urgency || 'medium',
        transferStatus: 'pending',
        createdAt: transfer.createdAt
      }
    });
  } catch (err) {
    console.error('inter-hospital-transfer error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
