const mongoose = require('mongoose');

const donationCampSchema = new mongoose.Schema({
  campName: { type: String, required: true },
  organizer: { type: String, required: true },
  hospital: { type: mongoose.Schema.Types.ObjectId, ref: 'Hospital' },
  date: { type: Date, required: true },
  startTime: { type: String, default: '09:00 AM' },
  endTime: { type: String, default: '05:00 PM' },
  venue: { type: String, required: true },
  address: { type: String },
  city: { type: String, required: true },
  location: {
    type: { type: String, enum: ['Point'], default: 'Point' },
    coordinates: { type: [Number], default: [0, 0] } // [longitude, latitude]
  },
  contactPhone: { type: String },
  targetUnits: { type: Number, default: 50 },
  registeredDonorsCount: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['upcoming', 'ongoing', 'completed', 'cancelled'],
    default: 'upcoming'
  },
  createdAt: { type: Date, default: Date.now }
});

donationCampSchema.index({ location: '2dsphere' });
donationCampSchema.index({ city: 1, date: 1 });

module.exports = mongoose.model('DonationCamp', donationCampSchema);
