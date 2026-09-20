const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Donor = require('../models/Donor');
const Hospital = require('../models/Hospital');

const generateToken = (id, role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET || 'secret', { expiresIn: '7d' });
};

// Register admin (protected — only existing admin or via seed)
const registerAdmin = async (req, res) => {
  try {
    const { name, email, password, adminSecret } = req.body;
    // Simple secret key check to prevent unauthorized admin creation
    if (adminSecret !== (process.env.ADMIN_SECRET || 'bloodadmin2026')) {
      return res.status(403).json({ message: 'Invalid admin secret key' });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: 'admin' });
    res.status(201).json({
      token: generateToken(user._id, user.role),
      user: { id: user._id, name: user.name, email: user.email, role: user.role }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Register donor
const registerDonor = async (req, res) => {
  try {
    const { name, email, password, phone, bloodGroup, age, weight, gender,
            latitude, longitude, address, hub, hubType, area, state } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'donor', phone });

    const donor = await Donor.create({
      user: user._id,
      bloodGroup, age, weight, gender,
      location: { type: 'Point', coordinates: [parseFloat(longitude) || 0, parseFloat(latitude) || 0] },
      address, hub, hubType, area, state
    });

    res.status(201).json({
      token: generateToken(user._id, user.role),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      donor: { id: donor._id, bloodGroup: donor.bloodGroup }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Register hospital
const registerHospital = async (req, res) => {
  try {
    const { name, email, password, phone, hospitalName, registrationNumber,
            latitude, longitude, address, city, contactPerson, state } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) return res.status(400).json({ message: 'Email already registered' });

    const user = await User.create({ name, email, password, role: 'hospital', phone });

    const hospital = await Hospital.create({
      user: user._id,
      hospitalName, registrationNumber,
      location: { type: 'Point', coordinates: [parseFloat(longitude) || 0, parseFloat(latitude) || 0] },
      address: address || `${city || ''}, ${state || ''}`.trim(),
      city: city || '', contactPerson,
      phone
    });

    res.status(201).json({
      token: generateToken(user._id, user.role),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      hospital: { id: hospital._id, hospitalName: hospital.hospitalName }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Login (shared for donor and hospital)
const login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const isMatch = await user.matchPassword(password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid credentials' });

    // Get profile based on role
    let profile = null;
    if (user.role === 'donor') {
      profile = await Donor.findOne({ user: user._id });
    } else if (user.role === 'hospital') {
      profile = await Hospital.findOne({ user: user._id });
    }

    res.json({
      token: generateToken(user._id, user.role),
      user: { id: user._id, name: user.name, email: user.email, role: user.role },
      profile
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { registerDonor, registerHospital, login, registerAdmin };
