const mongoose = require('mongoose');

const hospitalSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  hospitalName: { type: String, required: true },
  registrationNumber: { type: String, required: true, unique: true },
  facilityType: {
    type: String,
    enum: ['hospital', 'blood_bank'],
    default: 'hospital'
  },
  operatingHours: { type: String, default: '24/7' },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] }
  },
  address: { type: String },
  city: { type: String },
  contactPerson: { type: String },
  phone: { type: String },
  createdAt: { type: Date, default: Date.now }
});

hospitalSchema.index({ location: '2dsphere' });

module.exports = mongoose.model('Hospital', hospitalSchema);
