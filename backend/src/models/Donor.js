const mongoose = require('mongoose');

const donorSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  age: { type: Number, required: true },
  weight: { type: Number }, // in kg
  gender: { type: String, enum: ['Male', 'Female', 'Other'] },
  // Location as GeoJSON for geospatial queries
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  address: { type: String },
  area: { type: String },   // city/area name e.g. "Mangalore"
  state: { type: String },  // state name e.g. "Karnataka"
  hub: { type: String }, // e.g. "NNM College", "Infosys Campus"
  hubType: { type: String, enum: ['college', 'office', 'residential', 'other'] },
  isAvailable: { type: Boolean, default: true },
  lastDonationDate: { type: Date },
  totalDonations: { type: Number, default: 0 },
  responseRate: { type: Number, default: 100 }, // AI uses this for ranking
  medicalConditions: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 2dsphere index for geospatial queries
donorSchema.index({ location: '2dsphere' });

// Helper: can donor donate? (must be 90 days since last donation)
donorSchema.methods.canDonate = function () {
  if (!this.lastDonationDate) return true;
  const daysSince = (Date.now() - this.lastDonationDate) / (1000 * 60 * 60 * 24);
  return daysSince >= 90;
};

module.exports = mongoose.model('Donor', donorSchema);
