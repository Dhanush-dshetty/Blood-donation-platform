const Donor = require('../models/Donor');

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

// Get donor profile
const getDonorProfile = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id }).populate('user', 'name email phone');
    if (!donor) return res.status(404).json({ message: 'Donor profile not found' });
    res.json(donor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update donor profile / availability
const updateDonorProfile = async (req, res) => {
  try {
    const updates = req.body;
    if (updates.latitude && updates.longitude) {
      updates.location = {
        type: 'Point',
        coordinates: [parseFloat(updates.longitude), parseFloat(updates.latitude)]
      };
      delete updates.latitude;
      delete updates.longitude;
    }
    updates.updatedAt = new Date();

    const donor = await Donor.findOneAndUpdate(
      { user: req.user.id },
      updates,
      { new: true }
    ).populate('user', 'name email phone');

    if (!donor) return res.status(404).json({ message: 'Donor not found' });
    res.json(donor);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Toggle availability
const toggleAvailability = async (req, res) => {
  try {
    const donor = await Donor.findOne({ user: req.user.id });
    if (!donor) return res.status(404).json({ message: 'Donor not found' });

    donor.isAvailable = !donor.isAvailable;
    await donor.save();
    res.json({ isAvailable: donor.isAvailable, message: `You are now ${donor.isAvailable ? 'available' : 'unavailable'} for donation` });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all donors (admin / hospital view)
const getAllDonors = async (req, res) => {
  try {
    const { bloodGroup, hub, available } = req.query;
    const filter = {};
    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (hub) filter.hub = new RegExp(hub, 'i');
    if (available === 'true') filter.isAvailable = true;

    const donors = await Donor.find(filter).populate('user', 'name email phone');
    res.json(donors);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Find nearby donors for a blood request (geospatial query)
const findNearbyDonors = async (req, res) => {
  try {
    const { longitude, latitude, bloodGroup, maxDistanceKm = 20 } = req.query;

    if (!longitude || !latitude) {
      return res.status(400).json({ message: 'Longitude and latitude are required' });
    }

    // Compatible blood groups map
    const compatibilityMap = {
      'A+': ['A+', 'A-', 'O+', 'O-'],
      'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'],
      'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'],
      'O+': ['O+', 'O-'],
      'O-': ['O-']
    };

    const compatibleGroups = bloodGroup ? compatibilityMap[bloodGroup] || [bloodGroup] : null;

    const filter = {
      isAvailable: true
    };

    if (compatibleGroups) filter.bloodGroup = { $in: compatibleGroups };

    // Get all potential donors first
    const allDonors = await Donor.find(filter)
      .populate('user', 'name email phone')
      .limit(200);

    // Filter by distance manually with coordinate fallback
    const nearbyDonors = allDonors
      .map(donor => {
        let donorCoords = donor.location?.coordinates || [0, 0];
        if (donorCoords[0] === 0 && donorCoords[1] === 0) {
          const cityCoords = CITY_COORDS[donor.area] || CITY_COORDS['Bangalore'];
          donorCoords = cityCoords;
        }
        const distance = calculateDistance([parseFloat(longitude), parseFloat(latitude)], donorCoords);
        return { donor, distance };
      })
      .filter(item => item.distance <= parseFloat(maxDistanceKm))
      .sort((a, b) => a.distance - b.distance)
      .slice(0, 50)
      .map(item => ({
        ...item.donor.toObject(),
        distanceKm: Math.round(item.distance * 10) / 10
      }));

    res.json({ count: nearbyDonors.length, donors: nearbyDonors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDonorProfile, updateDonorProfile, toggleAvailability, getAllDonors, findNearbyDonors };
