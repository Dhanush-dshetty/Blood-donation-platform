const express = require('express');
const router = express.Router();
const { protect, adminOnly } = require('../middleware/auth');
const User = require('../models/User');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');
const BloodRequest = require('../models/BloodRequest');
const BloodInventory = require('../models/BloodInventory');
const BloodUnit = require('../models/BloodUnit');
const SafetyVerification = require('../models/SafetyVerification');

// ── Platform-wide stats ───────────────────────────────────────────
router.get('/stats', protect, adminOnly, async (req, res) => {
  try {
    const [totalDonors, totalHospitals, totalRequests, totalInventory,
           fulfilledRequests, activeDonors] = await Promise.all([
      Donor.countDocuments(),
      Hospital.countDocuments(),
      BloodRequest.countDocuments(),
      BloodInventory.countDocuments(),
      BloodRequest.countDocuments({ status: 'fulfilled' }),
      Donor.countDocuments({ isAvailable: true })
    ]);

    // Blood group distribution
    const bloodGroupStats = await Donor.aggregate([
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Requests per day (last 30 days)
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const requestTrend = await BloodRequest.aggregate([
      { $match: { createdAt: { $gte: thirtyDaysAgo } } },
      { $group: {
        _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
        count: { $sum: 1 }
      }},
      { $sort: { _id: 1 } }
    ]);

    // Average response time (fulfilled requests)
    const avgResponseTime = await BloodRequest.aggregate([
      { $match: { status: 'fulfilled', fulfilledAt: { $exists: true } } },
      { $project: {
        responseTimeHrs: {
          $divide: [{ $subtract: ['$fulfilledAt', '$createdAt'] }, 3600000]
        }
      }},
      { $group: { _id: null, avgHours: { $avg: '$responseTimeHrs' } } }
    ]);

    // Urgency level breakdown
    const urgencyBreakdown = await BloodRequest.aggregate([
      { $group: { _id: '$urgencyLevel', count: { $sum: 1 } } }
    ]);

    res.json({
      totalDonors, totalHospitals, totalRequests, totalInventory,
      fulfilledRequests, activeDonors,
      fulfillmentRate: totalRequests > 0 ? Math.round((fulfilledRequests / totalRequests) * 100) : 0,
      bloodGroupStats,
      requestTrend,
      avgResponseTimeHrs: avgResponseTime[0]?.avgHours?.toFixed(1) || 0,
      urgencyBreakdown
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── All donors ────────────────────────────────────────────────────
router.get('/donors', protect, adminOnly, async (req, res) => {
  try {
    const donors = await Donor.find()
      .populate('user', 'name email phone createdAt')
      .sort({ createdAt: -1 });
    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── All hospitals ─────────────────────────────────────────────────
router.get('/hospitals', protect, adminOnly, async (req, res) => {
  try {
    const hospitals = await Hospital.find()
      .populate('user', 'name email phone createdAt')
      .sort({ createdAt: -1 });
    res.json(hospitals);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── All requests ──────────────────────────────────────────────────
router.get('/requests', protect, adminOnly, async (req, res) => {
  try {
    const requests = await BloodRequest.find()
      .populate('hospital')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Toggle donor availability (admin override) ────────────────────
router.patch('/donors/:id/toggle', protect, adminOnly, async (req, res) => {
  try {
    const donor = await Donor.findById(req.params.id);
    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    donor.isAvailable = !donor.isAvailable;
    await donor.save();
    res.json({ message: 'Updated', isAvailable: donor.isAvailable });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Delete user account ───────────────────────────────────────────
router.delete('/users/:id', protect, adminOnly, async (req, res) => {
  try {
    await User.findByIdAndDelete(req.params.id);
    res.json({ message: 'User deleted' });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Blood Safety Stats ────────────────────────────────────────────
router.get('/blood-safety-stats', protect, adminOnly, async (req, res) => {
  try {
    const [
      totalUnits,
      quarantineUnits,
      availableUnits,
      rejectedUnits,
      expiredUnits,
      verifiedSafeUnits,
      totalVerifications
    ] = await Promise.all([
      BloodUnit.countDocuments(),
      BloodUnit.countDocuments({ status: 'quarantine' }),
      BloodUnit.countDocuments({ status: 'available' }),
      BloodUnit.countDocuments({ status: 'rejected' }),
      BloodUnit.countDocuments({ status: 'expired' }),
      BloodUnit.countDocuments({ verifiedSafe: true }),
      SafetyVerification.countDocuments()
    ]);

    // Units by status
    const statusBreakdown = await BloodUnit.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);

    // Units by blood group
    const bloodGroupBreakdown = await BloodUnit.aggregate([
      { $group: { _id: '$bloodGroup', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    // Units by component type
    const componentBreakdown = await BloodUnit.aggregate([
      { $group: { _id: '$componentType', count: { $sum: 1 } } }
    ]);

    // Verification outcomes
    const verificationOutcomes = await SafetyVerification.aggregate([
      { $group: { _id: '$outcome', count: { $sum: 1 } } }
    ]);

    // Units expiring soon (next 7 days)
    const sevenDaysFromNow = new Date();
    sevenDaysFromNow.setDate(sevenDaysFromNow.getDate() + 7);
    const expiringSoon = await BloodUnit.countDocuments({
      status: 'available',
      expiryDate: { $gte: new Date(), $lte: sevenDaysFromNow }
    });

    // Safety test pass rate
    const unitsWithAllTests = await BloodUnit.countDocuments({
      'safetyTests.hiv.result': { $ne: 'pending' },
      'safetyTests.hepatitisB.result': { $ne: 'pending' },
      'safetyTests.hepatitisC.result': { $ne: 'pending' },
      'safetyTests.syphilis.result': { $ne: 'pending' },
      'safetyTests.malaria.result': { $ne: 'pending' }
    });

    const safetyPassRate = unitsWithAllTests > 0 
      ? Math.round((verifiedSafeUnits / unitsWithAllTests) * 100)
      : 0;

    res.json({
      totalUnits,
      quarantineUnits,
      availableUnits,
      rejectedUnits,
      expiredUnits,
      verifiedSafeUnits,
      totalVerifications,
      expiringSoon,
      safetyPassRate,
      statusBreakdown,
      bloodGroupBreakdown,
      componentBreakdown,
      verificationOutcomes
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── All blood units (admin view) ──────────────────────────────────
router.get('/blood-units', protect, adminOnly, async (req, res) => {
  try {
    const units = await BloodUnit.find()
      .populate('hospital', 'hospitalName')
      .populate('donorId', 'bloodGroup')
      .sort({ createdAt: -1 })
      .limit(100);
    res.json(units);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
