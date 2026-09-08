const mongoose = require('mongoose');

const bloodRequestSchema = new mongoose.Schema({
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital', required: true },
  bloodGroup: {
    type: String,
    enum: ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
    required: true
  },
  unitsRequired: { type: Number, required: true },
  unitsFulfilled: { type: Number, default: 0 },
  urgencyLevel: { type: String, enum: ['critical', 'high', 'medium', 'low'], default: 'medium' },
  patientCondition: { type: String },
  status: {
    type: String,
    enum: ['open', 'partially_fulfilled', 'fulfilled', 'cancelled'],
    default: 'open'
  },
  // Donors who responded
  respondedDonors: [{
    donor: { type: mongoose.Schema.Types.ObjectId, ref: 'Donor' },
    respondedAt: { type: Date, default: Date.now },
    status: { type: String, enum: ['accepted', 'donated', 'declined'], default: 'accepted' },
    // Contact details submitted by donor
    contactDetails: {
      name: { type: String },
      email: { type: String },
      phone: { type: String },
      message: { type: String }
    }
  }],
  // AI urgency prediction score (0-1)
  aiUrgencyScore: { type: Number, default: 0 },
  createdAt: { type: Date, default: Date.now },
  fulfilledAt: { type: Date }
});

module.exports = mongoose.model('BloodRequest', bloodRequestSchema);
