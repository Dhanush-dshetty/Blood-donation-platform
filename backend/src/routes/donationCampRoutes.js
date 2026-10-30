const express = require('express');
const router = express.Router();
const DonationCamp = require('../models/DonationCamp');
const { protect, hospitalOnly, adminOnly } = require('../middleware/auth');

// ── GET all donation camps ───────────────────────────────────────────
// Accessible by any user (authenticated or public for community visibility)
router.get('/', async (req, res) => {
  try {
    const { city, status, search } = req.query;
    const filter = {};

    if (city && city !== 'All') {
      filter.city = new RegExp(`^${city}$`, 'i');
    }

    if (status && status !== 'all') {
      filter.status = status;
    } else {
      // Default to non-cancelled camps
      filter.status = { $ne: 'cancelled' };
    }

    if (search) {
      filter.$or = [
        { campName: new RegExp(search, 'i') },
        { organizer: new RegExp(search, 'i') },
        { venue: new RegExp(search, 'i') },
        { city: new RegExp(search, 'i') }
      ];
    }

    const camps = await DonationCamp.find(filter)
      .populate('hospital', 'hospitalName city phone')
      .sort({ date: 1 });

    res.json(camps);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── GET single camp by ID ────────────────────────────────────────────
router.get('/:id', async (req, res) => {
  try {
    const camp = await DonationCamp.findById(req.params.id)
      .populate('hospital', 'hospitalName city phone address');
    if (!camp) return res.status(404).json({ message: 'Donation camp not found' });
    res.json(camp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST create a donation camp ──────────────────────────────────────
router.post('/', protect, async (req, res) => {
  try {
    if (req.user.role !== 'hospital' && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only hospitals or administrators can organize donation camps' });
    }

    const {
      campName, organizer, hospitalId, date, startTime, endTime,
      venue, address, city, latitude, longitude, contactPhone, targetUnits
    } = req.body;

    const campData = {
      campName,
      organizer,
      date,
      startTime: startTime || '09:00 AM',
      endTime: endTime || '05:00 PM',
      venue,
      address,
      city,
      contactPhone,
      targetUnits: targetUnits ? Number(targetUnits) : 50
    };

    if (hospitalId) {
      campData.hospital = hospitalId;
    }

    if (latitude && longitude) {
      campData.location = {
        type: 'Point',
        coordinates: [parseFloat(longitude), parseFloat(latitude)]
      };
    }

    const camp = await DonationCamp.create(campData);
    res.status(201).json(camp);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── POST register donor for camp ────────────────────────────────────
router.post('/:id/register', protect, async (req, res) => {
  try {
    const camp = await DonationCamp.findById(req.params.id);
    if (!camp) return res.status(404).json({ message: 'Donation camp not found' });

    camp.registeredDonorsCount = (camp.registeredDonorsCount || 0) + 1;
    await camp.save();

    res.json({ message: 'Successfully registered for donation camp!', camp });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

module.exports = router;
