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

  // ── Alert burden tracking (Req B) ──────────────────────────────────
  // Number of alerts sent to this donor (rolling 7-day and 30-day windows)
  alertHistory: {
    totalAlertsReceived: { type: Number, default: 0 },
    alertsLast7Days:     { type: Number, default: 0 },
    alertsLast30Days:    { type: Number, default: 0 },
    // timestamp of most recent alert sent (for cooldown logic)
    lastAlertSentAt: { type: Date },
    // Unanswered alerts: alerts sent where donor did not respond
    unansweredAlertsLast30Days: { type: Number, default: 0 }
  },

  // ── Response-probability supporting data (Req A) ───────────────────
  // Average response time in minutes (when donor did respond)
  avgResponseTimeMinutes: { type: Number, default: null },
  // Count of requests to which this donor was alerted and responded
  totalAlertsResponded: { type: Number, default: 0 },
  // Historical arrival time at hospital in minutes (donor-reported / estimated)
  avgArrivalTimeMinutes: { type: Number, default: null },

  medicalConditions: [{ type: String }],
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

// 2dsphere index for geospatial queries
donorSchema.index({ location: '2dsphere' });
donorSchema.index({ bloodGroup: 1, isAvailable: 1 });
donorSchema.index({ 'alertHistory.lastAlertSentAt': 1 });

// Helper: can donor donate? (must be 90 days since last donation)
donorSchema.methods.canDonate = function () {
  if (!this.lastDonationDate) return true;
  const daysSince = (Date.now() - this.lastDonationDate) / (1000 * 60 * 60 * 24);
  return daysSince >= 90;
};

// Helper: historical response rate as a fraction [0,1]
// Returns null when there is insufficient data (< 3 alerts ever sent)
donorSchema.methods.getHistoricalResponseRate = function () {
  const total = this.alertHistory?.totalAlertsReceived || 0;
  if (total < 3) return null; // insufficient data
  const responded = this.totalAlertsResponded || 0;
  return Math.min(responded / total, 1.0);
};

// Helper: compute burden score [0,1] — higher means more burdened
donorSchema.methods.getBurdenScore = function () {
  const last7  = this.alertHistory?.alertsLast7Days  || 0;
  const last30 = this.alertHistory?.alertsLast30Days || 0;
  // Penalise if more than 3 in last 7 days or more than 8 in last 30 days
  const score7  = Math.min(last7  / 5,  1.0);
  const score30 = Math.min(last30 / 12, 1.0);
  return Math.max(score7, score30);
};

module.exports = mongoose.model('Donor', donorSchema);
