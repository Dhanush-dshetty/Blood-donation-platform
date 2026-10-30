const express = require('express');
const router  = express.Router();
const { protect, hospitalOnly } = require('../middleware/auth');
const axios    = require('axios');
const BloodRequest = require('../models/BloodRequest');
const Hospital     = require('../models/Hospital');
const Donor        = require('../models/Donor');
const {
  rankDonorsForAIService,
  getEffectiveCoords,
} = require('../utils/donorRankingService');

const AI_URL = () => process.env.AI_SERVICE_URL || 'http://localhost:8000';

// ── Existing: donor match rankings (v1 — backward compatible) ──────
router.post('/match-donors', protect, hospitalOnly, async (req, res) => {
  try {
    const { donors, bloodGroup, urgencyLevel } = req.body;
    const response = await axios.post(`${AI_URL()}/rank-donors`, { donors, bloodGroup, urgencyLevel });
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ message: 'AI service unavailable', error: err.message });
  }
});

// ── NEW: probabilistic donor ranking v2 (Req A + Req B) ───────────
// POST /api/ai/match-donors-v2
// Fetches donors from DB, runs the full ranking pipeline via AI service,
// and returns ranked results with mobilization scores and coverage report.
router.post('/match-donors-v2', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const { bloodGroup, urgencyLevel = 'medium', aiUrgencyScore = 0.5 } = req.body;

    // Resolve hospital coordinates
    let [lng, lat] = hospital.location.coordinates;
    if (lng === 0 && lat === 0) {
      const { CITY_COORDS } = require('../utils/donorRankingService');
      const cityCoords = CITY_COORDS[hospital.city] || CITY_COORDS['Bangalore'];
      [lng, lat] = cityCoords;
    }
    const hospitalCoords = [lng, lat];

    // Load blood-compatible donors
    const compatMap = {
      'A+': ['A+','A-','O+','O-'], 'A-': ['A-','O-'],
      'B+': ['B+','B-','O+','O-'], 'B-': ['B-','O-'],
      'AB+': ['A+','A-','B+','B-','AB+','AB-','O+','O-'], 'AB-': ['A-','B-','AB-','O-'],
      'O+': ['O+','O-'], 'O-': ['O-'],
    };
    const compatGroups = compatMap[bloodGroup] || [bloodGroup];
    const donors = await Donor.find({ bloodGroup: { $in: compatGroups } })
      .populate('user', 'name').limit(150);

    // Enrich with distance and coords for AI service
    const donorPayload = donors.map(d => {
      const coords = getEffectiveCoords(d);
      const distKm = require('../utils/donorRankingService').haversineKm(hospitalCoords, coords);
      return {
        _id:                    d._id,
        bloodGroup:             d.bloodGroup,
        isAvailable:            d.isAvailable,
        totalDonations:         d.totalDonations,
        responseRate:           d.responseRate,
        lastDonationDate:       d.lastDonationDate,
        alertHistory:           d.alertHistory || {},
        totalAlertsResponded:   d.totalAlertsResponded || 0,
        avgArrivalTimeMinutes:  d.avgArrivalTimeMinutes,
        area:                   d.area,
        distanceKm:             Math.round(distKm * 10) / 10,
        coords,
      };
    });

    // Call AI service v2
    const response = await axios.post(`${AI_URL()}/rank-donors-v2`, {
      donors:       donorPayload,
      bloodGroup,
      urgencyLevel,
      hospitalCoords,
      aiUrgencyScore,
    });

    res.json(response.data);
  } catch (err) {
    // Graceful fallback to v1 via local ranking service
    console.warn('AI v2 unavailable, using local fallback:', err.message);
    try {
      const { bloodGroup, urgencyLevel } = req.body;
      const hospital = await Hospital.findOne({ user: req.user.id });
      const compatMap = {
        'A+': ['A+','A-','O+','O-'], 'A-': ['A-','O-'],
        'B+': ['B+','B-','O+','O-'], 'B-': ['B-','O-'],
        'AB+': ['A+','A-','B+','B-','AB+','AB-','O+','O-'], 'AB-': ['A-','B-','AB-','O-'],
        'O+': ['O+','O-'], 'O-': ['O-'],
      };
      const compatGroups = compatMap[bloodGroup] || [bloodGroup];
      const donors = await Donor.find({ bloodGroup: { $in: compatGroups } }).limit(50);
      const ranked = rankDonorsForAIService(donors.map(d => d.toObject()), urgencyLevel, bloodGroup);
      res.json({ rankedDonors: ranked, count: ranked.length, fallback: true });
    } catch (fallbackErr) {
      res.status(503).json({ message: 'AI service unavailable', error: err.message });
    }
  }
});

// ── NEW: Fairness report (Req B) ─────────────────────────────────
// GET /api/ai/fairness-report
router.get('/fairness-report', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const [requestHistory, donors] = await Promise.all([
      BloodRequest.find({ hospital: hospital._id, createdAt: { $gte: since } })
        .select('status urgencyLevel mobilization'),
      Donor.find({ isAvailable: true }).select('area alertHistory responseRate'),
    ]);

    const reqPayload = requestHistory.map(r => ({
      status:       r.status,
      urgencyLevel: r.urgencyLevel,
      alertedAreas: r.mobilization?.alertedAreas || [],
    }));
    const donorPayload = donors.map(d => ({
      _id:         d._id,
      area:        d.area,
      alertHistory: d.alertHistory || {},
      responseRate: d.responseRate,
    }));

    const response = await axios.post(`${AI_URL()}/fairness-report`, {
      donors:         donorPayload,
      requestHistory: reqPayload,
    });
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ message: 'AI service unavailable', error: err.message });
  }
});

// ── Existing: demand forecast ────────────────────────────────────
router.get('/forecast', protect, hospitalOnly, async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    const since = new Date();
    since.setDate(since.getDate() - 90);
    const history = await BloodRequest.find({ hospital: hospital._id, createdAt: { $gte: since } });
    const response = await axios.post(`${AI_URL()}/forecast-demand`, { history });
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ message: 'AI service unavailable', error: err.message });
  }
});

// ── Existing: donor chatbot ─────────────────────────────────────
router.post('/chat', protect, async (req, res) => {
  try {
    const { message } = req.body;
    const response = await axios.post(`${AI_URL()}/chat`, { message });
    res.json(response.data);
  } catch (err) {
    res.status(503).json({ message: 'AI service unavailable', error: err.message });
  }
});

module.exports = router;
