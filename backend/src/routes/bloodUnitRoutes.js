const express = require('express');
const router = express.Router();
const { protect, hospitalOnly } = require('../middleware/auth');
const {
  createBloodUnit,
  updateSafetyTests,
  verifySafety,
  checkCompatibility,
  getAvailableUnits,
  getAllUnits,
  logTemperature,
  getVerificationHistory
} = require('../controllers/bloodUnitController');

// All routes require authentication
router.use(protect);

// Create new blood unit (hospital only)
router.post('/create', hospitalOnly, createBloodUnit);

// Update safety test results (hospital only)
router.put('/:id/safety-tests', hospitalOnly, updateSafetyTests);

// Run automated safety verification
router.post('/:id/verify', hospitalOnly, verifySafety);

// Check compatibility for transfusion
router.post('/check-compatibility', checkCompatibility);

// Get available safe units for hospital
router.get('/available', hospitalOnly, getAvailableUnits);

// Get all units for hospital
router.get('/all', hospitalOnly, getAllUnits);

// Log temperature
router.post('/:id/temperature', hospitalOnly, logTemperature);

// Get verification history for a unit
router.get('/:id/verification-history', getVerificationHistory);

module.exports = router;
