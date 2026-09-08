const Donor = require('../models/Donor');

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
      isAvailable: true,
      location: {
        $near: {
          $geometry: { type: 'Point', coordinates: [parseFloat(longitude), parseFloat(latitude)] },
          $maxDistance: parseFloat(maxDistanceKm) * 1000
        }
      }
    };

    if (compatibleGroups) filter.bloodGroup = { $in: compatibleGroups };

    const donors = await Donor.find(filter)
      .populate('user', 'name email phone')
      .limit(50);

    res.json({ count: donors.length, donors });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { getDonorProfile, updateDonorProfile, toggleAvailability, getAllDonors, findNearbyDonors };
