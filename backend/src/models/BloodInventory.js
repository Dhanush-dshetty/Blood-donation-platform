const mongoose = require('mongoose');

const bloodInventorySchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  units: { type: Number, required: true, default: 0 },
  donorId: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
  collectionDate: { type: Date, required: true },
  expiryDate: { type: Date, required: true },
  storageTemperature: { type: Number }, // in Celsius
  // Safety verification fields
  safetyVerification: {
    hivTest: { type: String, enum: ['positive', 'negative', 'pending'], default: 'pending' },
    hepatitisBTest: { type: String, enum: ['positive', 'negative', 'pending'], default: 'pending' },
    hepatitisCTest: { type: String, enum: ['positive', 'negative', 'pending'], default: 'pending' },
    syphilisTest: { type: String, enum: ['positive', 'negative', 'pending'], default: 'pending' },
    hemoglobinLevel: { type: Number }, // g/dL
    bloodPressureSystolic: { type: Number },
    bloodPressureDiastolic: { type: Number },
    verifiedAt: { type: Date },
    verifiedBy: { type: String }
  },
  // AI safety flag
  aiSafetyFlag: {
    isFlagged: { type: Boolean, default: false },
    reason: { type: String },
    confidence: { type: Number }
  },
  // Overall status
  status: {
    type: String,
    enum: ['pending_verification', 'safe', 'flagged', 'expired', 'used'],
    default: 'pending_verification'
  },
  createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('BloodInventory', bloodInventorySchema);
