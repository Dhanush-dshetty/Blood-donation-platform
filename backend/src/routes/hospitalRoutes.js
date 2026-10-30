const express = require('express');
const router = express.Router();
const { protect, hospitalOnly } = require('../middleware/auth');
const Hospital = require('../models/Hospital');
const BloodRequest = require('../models/BloodRequest');
const BloodInventory = require('../models/BloodInventory');

// ── GET all hospitals and blood banks (public/map accessible) ─────────
router.get('/', async (req, res) => {
  try {
    const { city, facilityType, search } = req.query;
    const filter = {};

    if (facilityType && facilityType !== 'all') {
      filter.facilityType = facilityType;
    }

    if (city && city !== 'All') {
      filter.city = new RegExp(`^${city}$`, 'i');
    }

    if (search) {
      filter.$or = [
        { hospitalName: new RegExp(search, 'i') },
        { address: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') }
      ];
    }

    const hospitals = await Hospital.find(filter)
      .populate('user', 'name email phone')
      .sort({ hospitalName: 1 });

    const hospitalIds = hospitals.map(h => h._id);

    // Get active open request counts and blood inventory counts
    const [requestCounts, inventoryCounts] = await Promise.all([
      BloodRequest.aggregate([
        { $match: { hospital: { $in: hospitalIds }, status: { $in: ['open', 'partially_fulfilled'] } } },
        { $group: { _id: '$hospital', count: { $sum: 1 } } }
      ]),
      BloodInventory.aggregate([
        { $match: { hospital: { $in: hospitalIds }, status: 'safe' } },
        { $group: { _id: '$hospital', totalUnits: { $sum: '$units' } } }
      ])
    ]);

    const reqMap = {};
    requestCounts.forEach(r => { reqMap[r._id.toString()] = r.count; });
    const invMap = {};
    inventoryCounts.forEach(i => { invMap[i._id.toString()] = i.totalUnits; });

    const enriched = hospitals.map(h => {
      const obj = h.toObject();
      obj.openRequestsCount = reqMap[h._id.toString()] || 0;
      obj.inventoryCount = invMap[h._id.toString()] || 0;
      return obj;
    });

    res.json(enriched);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET list of active cities ─────────────────────────────────────────
router.get('/cities', async (req, res) => {
  try {
    const cities = await Hospital.distinct('city');
    const cleaned = cities.filter(Boolean).sort();
    res.json(cleaned);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Get hospital profile ──────────────────────────────────────────────
router.get('/profile', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id }).populate('user', 'name email phone');
    if (!hospital) return res.status(404).json({ message: 'Hospital profile not found' });
    res.json(hospital);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── Update hospital profile ───────────────────────────────────────────
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
