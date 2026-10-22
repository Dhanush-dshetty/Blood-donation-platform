const mongoose = require('mongoose');

const safetyVerificationSchema = new mongoose.Schema({
  bloodUnit: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'BloodUnit', 
    required: true 
  },
  verificationType: {
    type: String,
    enum: ['initial_screening', 'safety_tests', 'expiry_check', 'storage_audit', 'cross_match', 'pre_transfusion', 'comprehensive'],
    required: true
  },
  checksPassed: { 
    type: Boolean, 
    required: true 
  },
  checksPerformed: [{
    checkName: String,
    result: String,
    passed: Boolean
  }],
  failureReasons: [String],
  
  // Test Results Summary
  testResults: {
    hiv: String,
    hepatitisB: String,
    hepatitisC: String,
    syphilis: String,
    malaria: String
  },
  
  // Storage Compliance
  storageCompliance: {
    temperatureInRange: Boolean,
    currentTemperature: Number,
    bagIntegrity: Boolean
  },
  
  // Expiry Status
  expiryStatus: {
    isExpired: Boolean,
    daysUntilExpiry: Number,
    expiryDate: Date
  },
  
  // Verification Details
  automatedCheck: { 
    type: Boolean, 
    default: true 
  },
  verifiedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  verifierRole: String,
  verificationTimestamp: { 
    type: Date, 
    default: Date.now 
  },
  
  // Outcome
  outcome: {
    type: String,
    enum: ['approved', 'rejected', 'quarantine', 'review_required'],
    required: true
  },
  recommendations: String,
  
  // Audit Trail
  ipAddress: String,
  systemInfo: String
});

// Index for quick lookups
safetyVerificationSchema.index({ bloodUnit: 1, verificationTimestamp: -1 });
safetyVerificationSchema.index({ outcome: 1 });

module.exports = mongoose.model('SafetyVerification', safetyVerificationSchema);
