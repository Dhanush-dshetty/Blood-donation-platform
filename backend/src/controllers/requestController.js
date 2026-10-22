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
    let [lng, lat] = hospital.location.coordinates;
    
    // Fallback to city coordinates if hospital coords are [0,0]
    if (lng === 0 && lat === 0) {
      const cityCoords = CITY_COORDS[hospital.city] || CITY_COORDS['Bangalore'];
      [lng, lat] = cityCoords;
    }

    const compatibilityMap = {
      'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'], 'O+': ['O+', 'O-'], 'O-': ['O-']
    };
    const compatibleGroups = compatibilityMap[bloodGroup] || [bloodGroup];

    // Find nearby donors with fallback coordinates
    const allDonors = await Donor.find({
      isAvailable: true,
      bloodGroup: { $in: compatibleGroups }
    }).limit(100);

    // Filter by distance manually (since some donors have [0,0] coords)
    const nearbyDonors = allDonors.filter(donor => {
      let donorCoords = donor.location?.coordinates || [0, 0];
      if (donorCoords[0] === 0 && donorCoords[1] === 0) {
        const cityCoords = CITY_COORDS[donor.area] || CITY_COORDS['Bangalore'];
        donorCoords = cityCoords;
      }
      const distance = calculateDistance([lng, lat], donorCoords);
      return distance <= 20; // 20km radius
    }).slice(0, 30);

    // Emit real-time alert to each nearby donor + send email
    nearbyDonors.forEach(donor => {
      io.to(`donor_${donor._id}`).emit('blood_request_alert', {
        requestId: request._id,
        bloodGroup,
        urgencyLevel,
        hospitalName: hospital.hospitalName,
        hospitalCity: hospital.city,
        unitsRequired,
        patientCondition,
        distanceKm: Math.round(calculateDistance([lng, lat], donor.location?.coordinates || CITY_COORDS[donor.area] || [lng, lat]) * 10) / 10
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

// Helper: Calculate distance between two coordinates (Haversine formula)
const calculateDistance = (coords1, coords2) => {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  
  const R = 6371; // Radius of Earth in km
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
            Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
            Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in km
};

// City coordinates fallback (for donors with [0,0] coordinates)
const CITY_COORDS = {
  'Mangalore': [74.8431, 12.8703], 'Udupi': [74.7421, 13.3409],
  'Bangalore': [77.5946, 12.9716], 'Mysore': [76.6394, 12.2958],
  'Mumbai': [72.8777, 19.0760], 'Pune': [73.8567, 18.5204],
  'Chennai': [80.2707, 13.0827], 'Coimbatore': [76.9558, 11.0168],
  'Hyderabad': [78.4867, 17.3850], 'Kochi': [76.2673, 9.9312],
  'Thiruvananthapuram': [76.9366, 8.5241], 'Kozhikode': [75.7804, 11.2588],
  'Visakhapatnam': [83.2185, 17.6868], 'Ahmedabad': [72.5714, 23.0225],
  'Jaipur': [75.7873, 26.9124], 'Lucknow': [80.9462, 26.8467],
  'Kolkata': [88.3639, 22.5726], 'New Delhi': [77.2090, 28.6139],
  'Delhi': [77.2090, 28.6139], 'Patna': [85.1376, 25.5941],
  'Bhopal': [77.4126, 23.2599], 'Indore': [75.8577, 22.7196],
};

// Reverse compatibility map: what blood groups can donate to this blood type
const getReverseCompatibility = (bloodGroup) => {
  const reverseMap = {
    'A+': ['A+', 'AB+'],
    'A-': ['A+', 'A-', 'AB+', 'AB-'],
    'B+': ['B+', 'AB+'],
    'B-': ['B+', 'B-', 'AB+', 'AB-'],
    'AB+': ['AB+'],
    'AB-': ['AB+', 'AB-'],
    'O+': ['A+', 'B+', 'AB+', 'O+'],
    'O-': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-']
  };
  return reverseMap[bloodGroup] || [bloodGroup];
};

// Get open requests (for donors to see - PERSONALIZED)
const getOpenRequests = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    // Get donor's coordinates (with fallback to city coords)
    let donorCoords = donor.location?.coordinates || [0, 0];
    if (donorCoords[0] === 0 && donorCoords[1] === 0) {
      // Fallback to city coordinates
      const cityCoords = CITY_COORDS[donor.area] || CITY_COORDS['Bangalore'];
      donorCoords = cityCoords;
    }

    // Find blood groups this donor can donate to
    const canDonateTo = getReverseCompatibility(donor.bloodGroup);

    // Get all open requests that match donor's blood group
    const requests = await BloodRequest.find({ 
      status: { $in: ['open', 'partially_fulfilled'] },
      bloodGroup: { $in: canDonateTo }
    })
      .populate('hospital')
      .sort({ aiUrgencyScore: -1, createdAt: -1 });

    // Filter by distance (20km) and add distance info
    const MAX_DISTANCE_KM = 20;
    const matchedRequests = requests
      .map(req => {
        const hospitalCoords = req.hospital?.location?.coordinates || [0, 0];
        
        // Fallback hospital coords if [0,0]
        let coords = hospitalCoords;
        if (coords[0] === 0 && coords[1] === 0) {
          coords = CITY_COORDS[req.hospital?.city] || CITY_COORDS['Bangalore'];
        }

        const distance = calculateDistance(donorCoords, coords);
        return {
          ...req.toObject(),
          distanceKm: Math.round(distance * 10) / 10, // Round to 1 decimal
          isNearby: distance <= MAX_DISTANCE_KM
        };
      })
      .filter(req => req.isNearby) // Only show requests within 20km
      .sort((a, b) => {
        // Sort by urgency first, then by distance
        if (b.aiUrgencyScore !== a.aiUrgencyScore) {
          return b.aiUrgencyScore - a.aiUrgencyScore;
        }
        return a.distanceKm - b.distanceKm;
      })
      .slice(0, 20); // Limit to 20 requests

    res.json({
      totalMatches: matchedRequests.length,
      donorBloodGroup: donor.bloodGroup,
      donorLocation: donor.area,
      requests: matchedRequests
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { createRequest, getHospitalRequests, respondToRequest, getOpenRequests };
