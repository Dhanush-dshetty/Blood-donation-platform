/**
 * requestController.js
 *
 * Integrates the response-probability-aware donor ranking (Req A) and
 * fairness-aware alert allocation (Req B) into the existing request workflow.
 *
 * Backward-compatible: existing API contracts are preserved.
 */
const BloodRequest = require('../models/BloodRequest');
const Hospital     = require('../models/Hospital');
const Donor        = require('../models/Donor');
const User         = require('../models/User');
const axios        = require('axios');
const { sendBloodRequestAlert, sendDonationConfirmation } = require('../utils/emailService');
const {
  rankAndSelectDonors,
  updateDonorAlertBurden,
  recordDonorResponse,
  computeMobilizationMetrics,
  getEffectiveCoords,
  haversineKm,
  CITY_COORDS,
} = require('../utils/donorRankingService');

// ────────────────────────────────────────────────────────────────
// Helper: city-coord fallback (kept for backward compat in socket emit)
// ────────────────────────────────────────────────────────────────
const calculateDistance = (coords1, coords2) => haversineKm(coords1, coords2);

// ────────────────────────────────────────────────────────────────
// Create a new blood request (hospital)
// ────────────────────────────────────────────────────────────────
const createRequest = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital profile not found' });

    const { bloodGroup, unitsRequired, urgencyLevel, patientCondition } = req.body;

    // ── Step 1: AI urgency prediction ─────────────────────────────
    let aiUrgencyScore = 0;
    try {
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/predict-urgency`,
        { bloodGroup, unitsRequired, urgencyLevel, patientCondition }
      );
      aiUrgencyScore = aiResponse.data.urgency_score || 0;
    } catch (aiErr) {
      console.warn('AI service unavailable, skipping urgency prediction');
    }

    // ── Step 2: Create the request record ─────────────────────────
    const request = await BloodRequest.create({
      hospital: hospital._id,
      bloodGroup,
      unitsRequired,
      urgencyLevel,
      patientCondition,
      aiUrgencyScore,
      rankingAlgorithm: 'v2_fairness',
    });

    // ── Step 3: Resolve hospital coordinates ──────────────────────
    let [lng, lat] = hospital.location.coordinates;
    if (lng === 0 && lat === 0) {
      const cityCoords = CITY_COORDS[hospital.city] || CITY_COORDS['Bangalore'];
      [lng, lat] = cityCoords;
    }
    const hospitalCoords = [lng, lat];

    // ── Step 4: Load candidate donors ─────────────────────────────
    // Pull blood-compatible, geographically broad set; ranking handles fine filtering
    const compatibilityMap = {
      'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'], 'O+': ['O+', 'O-'], 'O-': ['O-'],
    };
    const compatibleGroups = compatibilityMap[bloodGroup] || [bloodGroup];

    const allDonors = await Donor.find({
      bloodGroup: { $in: compatibleGroups },
    }).limit(200);

    // ── Step 5: Run the ranking + fairness pipeline (Req A + Req B) ──
    const { alertCandidates, coverageReport } = rankAndSelectDonors(
      allDonors,
      bloodGroup,
      hospitalCoords,
      urgencyLevel,
      aiUrgencyScore,
      30 // alert up to 30 donors
    );

    // ── Step 6: Record mobilization metadata on the request ────────
    const alertedAreas = [...new Set(alertCandidates.map(c => c.area).filter(Boolean))];
    request.mobilization = {
      alertsSent:           alertCandidates.length,
      alertedAreas,
      lowDonorAvailability: coverageReport.lowDonorAvailability,
    };
    await request.save();

    // ── Step 7: Emit real-time alerts and update donor burden ─────
    const io = req.app.get('io');

    for (const candidate of alertCandidates) {
      const { donor, distanceKm } = candidate;

      // Socket alert
      io.to(`donor_${donor._id}`).emit('blood_request_alert', {
        requestId:     request._id,
        bloodGroup,
        urgencyLevel,
        hospitalName:  hospital.hospitalName,
        hospitalCity:  hospital.city,
        unitsRequired,
        patientCondition,
        distanceKm,
        // Expose scoring info so donor UI can show context (non-PII)
        estimatedTravelMinutes: candidate.estimatedTravelMinutes,
        mobilizationScore:      candidate.mobilizationScore,
      });

      // Update alert burden on each donor (Req B tracking)
      try {
        await updateDonorAlertBurden(donor);
      } catch (e) {
        console.warn('Could not update alert burden for donor', donor._id, e.message);
      }
    }

    // ── Step 8: Email alerts (critical/high only) ──────────────────
    if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
      const donorUserIds = alertCandidates.map(c => c.donor.user);
      const donorUsers   = await User.find({ _id: { $in: donorUserIds } });
      const userMap      = {};
      donorUsers.forEach(u => { userMap[u._id.toString()] = u; });

      alertCandidates.forEach(({ donor, distanceKm }) => {
        const donorUser = userMap[donor.user?.toString()];
        if (donorUser?.email) {
          sendBloodRequestAlert({
            donorEmail:   donorUser.email,
            donorName:    donorUser.name,
            bloodGroup,
            urgencyLevel,
            hospitalName: hospital.hospitalName,
            hospitalCity: hospital.city,
            unitsRequired,
            patientCondition,
            requestId:    request._id,
          }).catch(err => console.error('Email error:', err.message));
        }
      });
    }

    // Alert the hospital room
    io.to(`hospital_${hospital._id}`).emit('request_created', { request });

    res.status(201).json({
      request,
      alertedDonors:   alertCandidates.length,
      coverageReport,  // Req B: geographic coverage details returned to caller
    });
  } catch (err) {
    console.error('createRequest error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────
// Get all requests for a hospital
// ────────────────────────────────────────────────────────────────
const getHospitalRequests = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const requests = await BloodRequest.find({ hospital: hospital._id })
      .populate('respondedDonors.donor')
      .sort({ createdAt: -1 });

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────
// Donor responds to a request
// ────────────────────────────────────────────────────────────────
const respondToRequest = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });
    if (request.status === 'fulfilled' || request.status === 'cancelled') {
      return res.status(400).json({ message: 'This request is no longer active' });
    }

    // Check if already responded
    const alreadyResponded = request.respondedDonors.find(
      r => r.donor.toString() === donor._id.toString()
    );
    if (alreadyResponded) {
      return res.status(400).json({ message: 'You have already responded to this request' });
    }

    const { contactDetails } = req.body;
    request.respondedDonors.push({
      donor:          donor._id,
      status:         'accepted',
      contactDetails: contactDetails || {},
      respondedAt:    new Date(),
    });
    request.unitsFulfilled += 1;

    // ── Record time-to-first-confirmed (Req A metric) ─────────────
    if (!request.mobilization) request.mobilization = {};
    if (!request.mobilization.firstConfirmedAt) {
      request.mobilization.firstConfirmedAt     = new Date();
      request.mobilization.minutesToFirstConfirmed =
        Math.round((Date.now() - new Date(request.createdAt)) / 60000);
    }

    if (request.unitsFulfilled >= request.unitsRequired) {
      request.status      = 'fulfilled';
      request.fulfilledAt = new Date();
    } else if (request.unitsFulfilled > 0) {
      request.status = 'partially_fulfilled';
    }

    await request.save();

    // ── Update donor stats (Req A) ────────────────────────────────
    // Determine when alert was sent (approximated by request.createdAt)
    await recordDonorResponse(donor, request.createdAt);

    // Backward compat: increment totalDonations for profile display
    donor.totalDonations += 1;
    await donor.save();

    // Send confirmation email to donor
    const donorUser            = await User.findById(donor.user);
    const requestWithHospital  = await BloodRequest.findById(request._id).populate('hospital');
    if (donorUser?.email) {
      sendDonationConfirmation({
        donorEmail:   donorUser.email,
        donorName:    contactDetails?.name || donorUser.name,
        hospitalName: requestWithHospital.hospital?.hospitalName || 'the hospital',
        bloodGroup:   request.bloodGroup,
      }).catch(err => console.error('Confirmation email error:', err.message));
    }

    // Notify hospital with donor contact details
    const io = req.app.get('io');
    io.to(`hospital_${request.hospital}`).emit('donor_responded', {
      requestId:      request._id,
      donorName:      contactDetails?.name  || 'A donor',
      donorPhone:     contactDetails?.phone || '',
      donorEmail:     contactDetails?.email || '',
      donorMessage:   contactDetails?.message || '',
      unitsFulfilled: request.unitsFulfilled,
      status:         request.status,
    });

    res.json({ message: 'Response recorded successfully', request });
  } catch (err) {
    console.error('respondToRequest error:', err);
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────
// Reverse compatibility map: blood groups that CAN donate to a given type
// ────────────────────────────────────────────────────────────────
const getReverseCompatibility = (bloodGroup) => {
  const reverseMap = {
    'A+':  ['A+', 'AB+'],
    'A-':  ['A+', 'A-', 'AB+', 'AB-'],
    'B+':  ['B+', 'AB+'],
    'B-':  ['B+', 'B-', 'AB+', 'AB-'],
    'AB+': ['AB+'],
    'AB-': ['AB+', 'AB-'],
    'O+':  ['A+', 'B+', 'AB+', 'O+'],
    'O-':  ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  };
  return reverseMap[bloodGroup] || [bloodGroup];
};

// ────────────────────────────────────────────────────────────────
// Get open requests (for donors to see — PERSONALIZED + ranked)
// ────────────────────────────────────────────────────────────────
const getOpenRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    // Get donor's coordinates (with fallback to city coords)
    const donorCoords = getEffectiveCoords(donor);

    // Find blood groups this donor can donate to
    const canDonateTo = getReverseCompatibility(donor.bloodGroup);

    // Get all open requests that match donor's blood group
    const requests = await BloodRequest.find({
      status:     { $in: ['open', 'partially_fulfilled'] },
      bloodGroup: { $in: canDonateTo },
    })
      .populate('hospital')
      .sort({ aiUrgencyScore: -1, createdAt: -1 });

    const MAX_DISTANCE_KM = 20;
    const matchedRequests = requests
      .map(r => {
        const hospitalCoords = r.hospital?.location?.coordinates || [0, 0];
        let coords = hospitalCoords;
        if (coords[0] === 0 && coords[1] === 0) {
          coords = CITY_COORDS[r.hospital?.city] || CITY_COORDS['Bangalore'];
        }
        const distance = calculateDistance(donorCoords, coords);
        return {
          ...r.toObject(),
          distanceKm: Math.round(distance * 10) / 10,
          isNearby:   distance <= MAX_DISTANCE_KM,
        };
      })
      .filter(r => r.isNearby)
      .sort((a, b) => {
        if (b.aiUrgencyScore !== a.aiUrgencyScore) return b.aiUrgencyScore - a.aiUrgencyScore;
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, 20);

    res.json({
      totalMatches:     matchedRequests.length,
      donorBloodGroup:  donor.bloodGroup,
      donorLocation:    donor.area,
      requests:         matchedRequests,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────
// GET /api/requests/:id/metrics  — mobilization metrics for a request
// ────────────────────────────────────────────────────────────────
const getRequestMetrics = async (req, res) => {
  try {
    const request = await BloodRequest.findById(req.params.id);
    if (!request) return res.status(404).json({ message: 'Request not found' });

    // Only the hospital that owns it (or admin) can see metrics
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (hospital && request.hospital.toString() !== hospital._id.toString()) {
      return res.status(403).json({ message: 'Not authorised' });
    }

    const metrics = computeMobilizationMetrics(request);
    res.json(metrics);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// ────────────────────────────────────────────────────────────────
// GET /api/requests/metrics/summary — aggregate metrics across requests
// (Req A evaluation: mobilization rate, time-to-first, etc.)
// ────────────────────────────────────────────────────────────────
const getMetricsSummary = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const since = new Date();
    since.setDate(since.getDate() - 30);

    const requests = await BloodRequest.find({
      hospital:  hospital._id,
      createdAt: { $gte: since },
    });

    const total     = requests.length;
    const fulfilled = requests.filter(r => r.status === 'fulfilled').length;

    const alertsPerRequest = requests
      .filter(r => (r.mobilization?.alertsSent || 0) > 0)
      .map(r => r.mobilization.alertsSent);

    const timesToFirst = requests
      .filter(r => r.mobilization?.minutesToFirstConfirmed != null)
      .map(r => r.mobilization.minutesToFirstConfirmed);

    const avg = arr => arr.length ? Math.round(arr.reduce((s, v) => s + v, 0) / arr.length) : null;

    // Per-region fulfillment (Req B evaluation)
    const regionStats = {};
    for (const r of requests) {
      for (const area of (r.mobilization?.alertedAreas || [])) {
        if (!regionStats[area]) regionStats[area] = { total: 0, fulfilled: 0 };
        regionStats[area].total++;
        if (r.status === 'fulfilled') regionStats[area].fulfilled++;
      }
    }

    const regionFulfillment = Object.entries(regionStats).map(([area, s]) => ({
      area,
      total:           s.total,
      fulfilled:       s.fulfilled,
      fulfillmentRate: s.total > 0 ? Math.round((s.fulfilled / s.total) * 100) : 0,
    }));

    res.json({
      period:                '30 days',
      totalRequests:          total,
      fulfilledRequests:      fulfilled,
      fulfillmentRate:        total > 0 ? Math.round((fulfilled / total) * 100) : 0,
      avgAlertsPerRequest:    avg(alertsPerRequest),
      avgMinutesToFirstConfirmed: avg(timesToFirst),
      lowDonorScenarios:      requests.filter(r => r.mobilization?.lowDonorAvailability).length,
      regionFulfillment,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createRequest,
  getHospitalRequests,
  respondToRequest,
  getOpenRequests,
  getRequestMetrics,
  getMetricsSummary,
};
