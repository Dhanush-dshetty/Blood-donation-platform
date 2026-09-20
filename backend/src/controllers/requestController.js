const BloodRequest = require('../models/BloodRequest');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');
const User = require('../models/User');
const axios = require('axios');
const { sendBloodRequestAlert, sendDonationConfirmation } = require('../utils/emailService');

// Create a new blood request (hospital)
const createRequest = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital profile not found' });

    const { bloodGroup, unitsRequired, urgencyLevel, patientCondition } = req.body;

    // Get AI urgency prediction
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

    const request = await BloodRequest.create({
      hospital: hospital._id,
      bloodGroup, unitsRequired, urgencyLevel, patientCondition,
      aiUrgencyScore
    });

    // Find nearby compatible donors and alert them via socket
    const io = req.app.get('io');
    const [lng, lat] = hospital.location.coordinates;

    const compatibilityMap = {
      'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'], 'O+': ['O+', 'O-'], 'O-': ['O-']
    };
    const compatibleGroups = compatibilityMap[bloodGroup] || [bloodGroup];

    const nearbyDonors = await Donor.find({
      isAvailable: true,
      bloodGroup: { $in: compatibleGroups },
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $maxDistance: 20000 // 20km
        }
      }
    }).limit(30);

    // Emit real-time alert to each nearby donor + send email
    nearbyDonors.forEach(donor => {
      io.to(`donor_${donor._id}`).emit('blood_request_alert', {
        requestId: request._id,
        bloodGroup,
        urgencyLevel,
        hospitalName: hospital.hospitalName,
        unitsRequired,
        patientCondition
      });
    });

    // Send emails to nearby donors (only for critical/high urgency)
    if (urgencyLevel === 'critical' || urgencyLevel === 'high') {
      const donorUsers = await User.find({
        _id: { $in: nearbyDonors.map(d => d.user) }
      });
      const donorUserMap = {};
      donorUsers.forEach(u => { donorUserMap[u._id.toString()] = u; });

      nearbyDonors.forEach(donor => {
        const donorUser = donorUserMap[donor.user.toString()];
        if (donorUser?.email) {
          sendBloodRequestAlert({
            donorEmail: donorUser.email,
            donorName: donorUser.name,
            bloodGroup,
            urgencyLevel,
            hospitalName: hospital.hospitalName,
            hospitalCity: hospital.city,
            unitsRequired,
            patientCondition,
            requestId: request._id
          }).catch(err => console.error('Email error:', err.message));
        }
      });
    }

    // Also alert the hospital's room
    io.to(`hospital_${hospital._id}`).emit('request_created', { request });

    res.status(201).json({ request, alertedDonors: nearbyDonors.length });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all requests for a hospital
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

// Donor responds to a request
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
      donor: donor._id,
      status: 'accepted',
      contactDetails: contactDetails || {}
    });
    request.unitsFulfilled += 1;

    if (request.unitsFulfilled >= request.unitsRequired) {
      request.status = 'fulfilled';
      request.fulfilledAt = new Date();
    } else if (request.unitsFulfilled > 0) {
      request.status = 'partially_fulfilled';
    }

    await request.save();

    // Update donor response rate
    donor.totalDonations += 1;
    await donor.save();

    // Send confirmation email to donor
    const donorUser = await User.findById(donor.user);
    const requestWithHospital = await BloodRequest.findById(request._id).populate('hospital');
    if (donorUser?.email) {
      sendDonationConfirmation({
        donorEmail: donorUser.email,
        donorName: contactDetails?.name || donorUser.name,
        hospitalName: requestWithHospital.hospital?.hospitalName || 'the hospital',
        bloodGroup: request.bloodGroup
      }).catch(err => console.error('Confirmation email error:', err.message));
    }

    // Notify hospital with donor contact details
    const io = req.app.get('io');
    io.to(`hospital_${request.hospital}`).emit('donor_responded', {
      requestId: request._id,
      donorName: contactDetails?.name || 'A donor',
      donorPhone: contactDetails?.phone || '',
      donorEmail: contactDetails?.email || '',
      donorMessage: contactDetails?.message || '',
      unitsFulfilled: request.unitsFulfilled,
      status: request.status
    });

    res.json({ message: 'Response recorded successfully', request });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get open requests (for donors to see)
const getOpenRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    const requests = await BloodRequest.find({ status: { $in: ['open', 'partially_fulfilled'] } })
      .populate('hospital')
      .sort({ aiUrgencyScore: -1, createdAt: -1 })
      .limit(20);

    res.json(requests);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createRequest, getHospitalRequests, respondToRequest, getOpenRequests };
