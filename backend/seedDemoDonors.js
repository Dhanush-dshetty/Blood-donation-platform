const mongoose = require('mongoose');
require('dotenv').config();

const User = require('./src/models/User');
const Donor = require('./src/models/Donor');

const MONGODB_URI = process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/bloodplatform';

const DEMO_DONORS = [
  {
    // ── DONOR 1: HIGH RESPONSE PROBABILITY (Reliable & Well-Rested) ──
    name: 'Priya Sharma (High P_resp)',
    email: 'donor.priya@test.com',
    password: 'donor123',
    phone: '9845011223',
    bloodGroup: 'O+',
    age: 27,
    gender: 'Female',
    area: 'Surathkal',
    city: 'Mangalore',
    state: 'Karnataka',
    address: 'Near NITK Beach Road, Surathkal, Mangalore',
    location: { type: 'Point', coordinates: [74.7930, 13.0110] }, // ~16 km away
    isAvailable: true,
    totalDonations: 7,
    responseRate: 92, // 92% historical response rate
    alertHistory: {
      alertsLast7Days: 0,   // Fresh: No recent alerts
      alertsLast30Days: 1,  // Very low alert burden
      totalAlertsReceived: 12,
      lastAlertSentAt: new Date(Date.now() - 20 * 24 * 3600 * 1000),
      unansweredAlertsLast30Days: 0
    },
    totalAlertsResponded: 11,
    avgArrivalTimeMinutes: 28,
    avgResponseTimeMinutes: 6,
    lastDonationDate: new Date(Date.now() - 140 * 24 * 3600 * 1000) // Cleared 90-day cooldown
  },
  {
    // ── DONOR 2: LOW RESPONSE PROBABILITY (Very Close But Fatigued & Unresponsive) ──
    name: 'Rajesh Kumar (Low P_resp / Fatigued)',
    email: 'donor.rajesh@test.com',
    password: 'donor123',
    phone: '9845022334',
    bloodGroup: 'O+',
    age: 31,
    gender: 'Male',
    area: 'Balmatta',
    city: 'Mangalore',
    state: 'Karnataka',
    address: 'Balmatta Main Road, Opp Petrol Pump, Mangalore',
    location: { type: 'Point', coordinates: [74.8460, 12.8710] }, // ~0.35 km away (right next to hospital!)
    isAvailable: true,
    totalDonations: 8,
    responseRate: 18, // 18% response rate
    alertHistory: {
      alertsLast7Days: 6,   // Heavily spammed in last 7 days!
      alertsLast30Days: 14, // High alert burden
      totalAlertsReceived: 16,
      lastAlertSentAt: new Date(Date.now() - 3 * 3600 * 1000), // Alerted 3 hours ago
      unansweredAlertsLast30Days: 12
    },
    totalAlertsResponded: 3,
    avgArrivalTimeMinutes: 55,
    avgResponseTimeMinutes: 45,
    lastDonationDate: new Date(Date.now() - 100 * 24 * 3600 * 1000)
  },
  {
    // ── DONOR 3: NEW DONOR (Fallback Baseline Prior = 0.65) ──
    name: 'Sneha Patel (Prior Fallback)',
    email: 'donor.sneha@test.com',
    password: 'donor123',
    phone: '9845033445',
    bloodGroup: 'O+',
    age: 22,
    gender: 'Female',
    area: 'Kadri',
    city: 'Mangalore',
    state: 'Karnataka',
    address: 'Near Kadri Temple Road, Mangalore',
    location: { type: 'Point', coordinates: [74.8560, 12.8800] }, // ~1.8 km away
    isAvailable: true,
    totalDonations: 1,
    responseRate: 0,
    alertHistory: {
      alertsLast7Days: 0,
      alertsLast30Days: 0,
      totalAlertsReceived: 1, // Only 1 alert (insufficient data < 3 alerts)
      lastAlertSentAt: null,
      unansweredAlertsLast30Days: 0
    },
    totalAlertsResponded: 1,
    avgArrivalTimeMinutes: null,
    avgResponseTimeMinutes: null,
    lastDonationDate: null
  },
  {
    // ── DONOR 4: UNDERSERVED REGION (Fairness Scarcity Bonus) ──
    name: 'Arun Hegde (Underserved Region)',
    email: 'donor.arun@test.com',
    password: 'donor123',
    phone: '9845044556',
    bloodGroup: 'O+',
    age: 29,
    gender: 'Male',
    area: 'Bantwal', // Sparse area with few donors
    city: 'Mangalore',
    state: 'Karnataka',
    address: 'Bantwal Town Circle, Mangalore Suburb',
    location: { type: 'Point', coordinates: [75.0350, 12.8900] }, // ~20.9 km away
    isAvailable: true,
    totalDonations: 5,
    responseRate: 85,
    alertHistory: {
      alertsLast7Days: 1,
      alertsLast30Days: 2,
      totalAlertsReceived: 5,
      lastAlertSentAt: new Date(Date.now() - 8 * 24 * 3600 * 1000),
      unansweredAlertsLast30Days: 1
    },
    totalAlertsResponded: 4,
    avgArrivalTimeMinutes: 32,
    avgResponseTimeMinutes: 10,
    lastDonationDate: new Date(Date.now() - 110 * 24 * 3600 * 1000)
  }
];

async function seedDemoDonors() {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    for (const data of DEMO_DONORS) {
      // 1. Create or update User
      let user = await User.findOne({ email: data.email });
      if (!user) {
        user = await User.create({
          name: data.name,
          email: data.email,
          password: data.password, // Pre-save hook hashes password
          role: 'donor',
          phone: data.phone
        });
        console.log(`👤 Created User: ${data.name} (${data.email})`);
      } else {
        user.name = data.name;
        user.phone = data.phone;
        await user.save();
        console.log(`👤 Updated User: ${data.name} (${data.email})`);
      }

      // 2. Create or update Donor profile
      const donorData = {
        user: user._id,
        bloodGroup: data.bloodGroup,
        age: data.age,
        gender: data.gender,
        area: data.area,
        city: data.city,
        state: data.state,
        address: data.address,
        location: data.location,
        isAvailable: data.isAvailable,
        totalDonations: data.totalDonations,
        responseRate: data.responseRate,
        alertHistory: data.alertHistory,
        totalAlertsResponded: data.totalAlertsResponded,
        avgArrivalTimeMinutes: data.avgArrivalTimeMinutes,
        avgResponseTimeMinutes: data.avgResponseTimeMinutes,
        lastDonationDate: data.lastDonationDate
      };

      await Donor.findOneAndUpdate(
        { user: user._id },
        { $set: donorData },
        { upsert: true, new: true }
      );

      console.log(`🩸 Seeded Donor: ${data.name} [Area: ${data.area}, HistResponse: ${data.responseRate}%, AlertsLast7Days: ${data.alertHistory.alertsLast7Days}]`);
    }

    console.log('\n🎉 Successfully seeded 4 Demo Donors for Response Probability Demonstration!\n');
  } catch (err) {
    console.error('❌ Error seeding demo donors:', err);
  } finally {
    await mongoose.connection.close();
    console.log('🔌 Disconnected from MongoDB');
  }
}

seedDemoDonors();
