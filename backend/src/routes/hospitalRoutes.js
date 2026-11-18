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

// ── GET /api/hospitals/nearby-blood ───────────────────────────────────
// Public endpoint: find hospitals near a location that have safe blood
router.get('/nearby-blood', async (req, res) => {
  try {
    const lat = parseFloat(req.query.lat);
    const lng = parseFloat(req.query.lng);
    const bloodGroup = req.query.bloodGroup || 'O+';
    const radiusKm = parseFloat(req.query.radiusKm) || 100;

    if (isNaN(lat) || isNaN(lng)) {
      return res.status(400).json({ message: 'lat and lng query parameters are required.' });
    }

    // Blood group compatibility map (what a patient can receive)
    const COMPAT = {
      'A+':  ['A+', 'A-', 'O+', 'O-'],
      'A-':  ['A-', 'O-'],
      'B+':  ['B+', 'B-', 'O+', 'O-'],
      'B-':  ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'],
      'O+':  ['O+', 'O-'],
      'O-':  ['O-']
    };

    const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    const compatibleGroups = (COMPAT[bloodGroup] || []).filter(g => g !== bloodGroup);

    // 1. Find hospitals within radius using $nearSphere (sorted by proximity)
    const hospitals = await Hospital.find({
      location: {
        $nearSphere: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: radiusKm * 1000
        }
      },
      // Exclude hospitals with no meaningful coordinates
      'location.coordinates.0': { $ne: 0 },
      'location.coordinates.1': { $ne: 0 }
    }).select('hospitalName address city phone operatingHours facilityType location');

    if (hospitals.length === 0) {
      return res.json([]);
    }

    const hospitalIds = hospitals.map(h => h._id);
    const now = new Date();

    // 2. Aggregate BloodInventory: get units per blood group per hospital (safe + not expired)
    const inventoryAgg = await BloodInventory.aggregate([
      {
        $match: {
          hospital: { $in: hospitalIds },
          status: 'safe',
          expiryDate: { $gt: now }
        }
      },
      {
        $group: {
          _id: { hospital: '$hospital', bloodGroup: '$bloodGroup' },
          totalUnits: { $sum: '$units' }
        }
      }
    ]);

    // Build a map: hospitalId -> { bloodGroup -> units }
    const invMap = {};
    inventoryAgg.forEach(item => {
      const hid = item._id.hospital.toString();
      if (!invMap[hid]) invMap[hid] = {};
      invMap[hid][item._id.bloodGroup] = item.totalUnits;
    });

    // Haversine distance formula
    function haversineKm(lat1, lng1, lat2, lng2) {
      const R = 6371;
      const dLat = ((lat2 - lat1) * Math.PI) / 180;
      const dLng = ((lng2 - lng1) * Math.PI) / 180;
      const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos((lat1 * Math.PI) / 180) *
          Math.cos((lat2 * Math.PI) / 180) *
          Math.sin(dLng / 2) *
          Math.sin(dLng / 2);
      return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    }

    // 3. Build enriched results
    const results = hospitals.map(h => {
      const hid = h._id.toString();
      const groupMap = invMap[hid] || {};

      // inventoryByGroup: all 8 blood groups, default 0
      const inventoryByGroup = {};
      ALL_GROUPS.forEach(g => { inventoryByGroup[g] = groupMap[g] || 0; });

      const exactMatchUnits = inventoryByGroup[bloodGroup] || 0;

      // compatibleUnits: compatible groups that are NOT the exact match
      let compatibleUnits = 0;
      const compatibleBreakdown = {};
      compatibleGroups.forEach(g => {
        const units = inventoryByGroup[g] || 0;
        if (units > 0) {
          compatibleBreakdown[g] = units;
          compatibleUnits += units;
        }
      });

      const hLng = h.location.coordinates[0];
      const hLat = h.location.coordinates[1];
      const distanceKm = parseFloat(haversineKm(lat, lng, hLat, hLng).toFixed(1));
      const etaMinutes = Math.round((distanceKm / 30) * 60);

      let stockStatus = 'out_of_stock';
      if (exactMatchUnits > 2) stockStatus = 'in_stock';
      else if (exactMatchUnits >= 1) stockStatus = 'low_stock';

      return {
        _id: h._id,
        hospitalName: h.hospitalName,
        address: h.address,
        city: h.city,
        phone: h.phone,
        operatingHours: h.operatingHours,
        facilityType: h.facilityType,
        location: h.location,
        distanceKm,
        etaMinutes,
        exactMatchUnits,
        compatibleUnits,
        compatibleBreakdown,
        inventoryByGroup,
        stockStatus
      };
    });

    // Sort by distanceKm ascending (closest first)
    results.sort((a, b) => a.distanceKm - b.distanceKm);

    res.json(results);
  } catch (err) {
    console.error('nearby-blood error:', err);
    res.status(500).json({ message: err.message });
  }
});

// ── GET /api/hospitals/:id/inventory ─────────────────────────────────
// Public: full inventory breakdown for a single hospital
router.get('/:id/inventory', async (req, res) => {
  try {
    const { id } = req.params;
    const now = new Date();
    const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

    const hospital = await Hospital.findById(id).select('hospitalName address city phone operatingHours facilityType location');
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const inventoryAgg = await BloodInventory.aggregate([
      {
        $match: {
          hospital: hospital._id,
          status: 'safe',
          expiryDate: { $gt: now }
        }
      },
      {
        $group: {
          _id: '$bloodGroup',
          totalUnits: { $sum: '$units' },
          earliestExpiry: { $min: '$expiryDate' }
        }
      }
    ]);

    const inventoryByGroup = {};
    const expiryByGroup = {};
    ALL_GROUPS.forEach(g => { inventoryByGroup[g] = 0; expiryByGroup[g] = null; });
    inventoryAgg.forEach(item => {
      inventoryByGroup[item._id] = item.totalUnits;
      expiryByGroup[item._id] = item.earliestExpiry;
    });

    const totalSafeUnits = ALL_GROUPS.reduce((sum, g) => sum + inventoryByGroup[g], 0);

    res.json({
      hospital: {
        _id: hospital._id,
        hospitalName: hospital.hospitalName,
        address: hospital.address,
        city: hospital.city,
        phone: hospital.phone,
        operatingHours: hospital.operatingHours,
        facilityType: hospital.facilityType
      },
      inventoryByGroup,
      expiryByGroup,
      totalSafeUnits,
      asOf: now
    });
  } catch (err) {
    console.error('hospital inventory error:', err);
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
