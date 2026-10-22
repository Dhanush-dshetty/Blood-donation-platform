const mongoose = require('mongoose');

const bloodUnitSchema = new mongoose.Schema({
  unitId: { 
    type: String, 
    required: true, 
    unique: true,
    uppercase: true
  },
  donorId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Donor'
  },
  hospital: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'Hospital', 
    required: true 
  },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  componentType: {
    type: String,
    enum: ['whole_blood', 'rbc', 'platelets', 'plasma', 'packed_cells'],
    default: 'whole_blood'
  },
  collectionDate: { 
    type: Date, 
    required: true,
    default: Date.now
  },
  expiryDate: { 
    type: Date, 
    required: true 
  },
  status: {
    type: String,
    enum: ['available', 'reserved', 'used', 'expired', 'rejected', 'quarantine'],
    default: 'quarantine' // Start in quarantine until tests complete
  },
  
  // Safety Tests - All must be NEGATIVE to pass
  safetyTests: {
    hiv: { 
      result: { type: String, enum: ['negative', 'positive', 'pending'], default: 'pending' },
      testDate: Date,
      labId: String
    },
    hepatitisB: { 
      result: { type: String, enum: ['negative', 'positive', 'pending'], default: 'pending' },
      testDate: Date,
      labId: String
    },
    hepatitisC: { 
      result: { type: String, enum: ['negative', 'positive', 'pending'], default: 'pending' },
      testDate: Date,
      labId: String
    },
    syphilis: { 
      result: { type: String, enum: ['negative', 'positive', 'pending'], default: 'pending' },
      testDate: Date,
      labId: String
    },
    malaria: { 
      result: { type: String, enum: ['negative', 'positive', 'pending'], default: 'pending' },
      testDate: Date,
      labId: String
    },
    allTestsPassed: { type: Boolean, default: false },
    testedBy: String,
    completedAt: Date
  },
  
  // Storage Conditions
  storage: {
    currentTemperature: Number,
    temperatureLogs: [{
      temperature: Number,
      timestamp: { type: Date, default: Date.now },
      recordedBy: String
    }],
    location: String,
    refrigeratorId: String,
    bagIntegrity: { type: Boolean, default: true },
    lastChecked: Date
  },
  
  // Cross-Match (if reserved for specific patient)
  crossMatch: {
    patientId: String,
    patientBloodGroup: String,
    compatible: Boolean,
    testDate: Date,
    technicianName: String,
    notes: String
  },
  
  // Verification & Audit
  verifiedSafe: { type: Boolean, default: false },
  verificationDetails: {
    verifiedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    verificationDate: Date,
    autoVerified: { type: Boolean, default: true },
    manualOverride: Boolean,
    notes: String
  },
  
  // Usage tracking
  usageHistory: [{
    action: String, // 'collected', 'tested', 'verified', 'reserved', 'transfused', 'discarded'
    performedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    timestamp: { type: Date, default: Date.now },
    notes: String
  }],
  
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// Pre-save hook to update timestamp
bloodUnitSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Method: Calculate days until expiry
bloodUnitSchema.methods.getDaysUntilExpiry = function() {
  const days = (this.expiryDate - Date.now()) / (1000 * 60 * 60 * 24);
  return Math.floor(days);
};

// Method: Check if expired
bloodUnitSchema.methods.isExpired = function() {
  return this.expiryDate < Date.now();
};

// Method: Check storage temperature compliance
bloodUnitSchema.methods.isTemperatureCompliant = function() {
  if (!this.storage.currentTemperature) return false;
  
  const ranges = {
    'rbc': { min: 1, max: 6 },
    'whole_blood': { min: 1, max: 6 },
    'packed_cells': { min: 1, max: 6 },
    'platelets': { min: 20, max: 24 },
    'plasma': { min: -25, max: -18 }
  };
  
  const range = ranges[this.componentType];
  return this.storage.currentTemperature >= range.min && 
         this.storage.currentTemperature <= range.max;
};

// Static method: Get expiry date based on component type
bloodUnitSchema.statics.calculateExpiryDate = function(componentType, collectionDate) {
  const expiryDays = {
    'whole_blood': 35,
    'rbc': 42,
    'packed_cells': 42,
    'platelets': 5,
    'plasma': 365
  };
  
  const days = expiryDays[componentType] || 35;
  const expiry = new Date(collectionDate);
  expiry.setDate(expiry.getDate() + days);
  return expiry;
};

module.exports = mongoose.model('BloodUnit', bloodUnitSchema);
