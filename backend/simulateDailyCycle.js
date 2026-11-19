/**
 * simulateDailyCycle.js
 * BloodPlatform — AI Daily Lifecycle Simulator
 *
 * Simulates one "day" of blood bank operations:
 *   1. Expire blood units past their 42-day shelf life
 *   2. Simulate daily outflow (transfusions) via Poisson sampling
 *   3. Add new inflow (walk-in donations) for each hospital
 *   4. Restore donor eligibility after 90-day cooldown
 *   5. Add synthetic new donors to grow dataset
 *
 * Run standalone: node simulateDailyCycle.js
 * Or imported as a module: const { runDailyCycle } = require('./simulateDailyCycle');
 */

require('dotenv').config();
const mongoose = require('mongoose');

// --- Models ---
const BloodInventory = require('./src/models/BloodInventory');
const Hospital       = require('./src/models/Hospital');
const Donor          = require('./src/models/Donor');
const User           = require('./src/models/User');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/bloodplatform';
const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

// Blood group natural prevalence (India population distribution)
const GROUP_PREVALENCE = { 'B+': 0.38, 'O+': 0.32, 'A+': 0.19, 'AB+': 0.06, 'B-': 0.02, 'O-': 0.01, 'A-': 0.01, 'AB-': 0.01 };

// Karnataka cities with coords for synthetic donor generation
const KA_CITIES = [
  { city: 'Bangalore', state: 'Karnataka', lat: 12.9716, lng: 77.5946 },
  { city: 'Mysore', state: 'Karnataka', lat: 12.2958, lng: 76.6394 },
  { city: 'Mangalore', state: 'Karnataka', lat: 12.8703, lng: 74.8431 },
  { city: 'Hubli', state: 'Karnataka', lat: 15.3647, lng: 75.1228 },
  { city: 'Belgaum', state: 'Karnataka', lat: 15.8497, lng: 74.5165 },
  { city: 'Davangere', state: 'Karnataka', lat: 14.4644, lng: 75.9218 },
  { city: 'Bellary', state: 'Karnataka', lat: 15.1394, lng: 76.9214 },
  { city: 'Bijapur', state: 'Karnataka', lat: 16.8302, lng: 75.7100 },
  { city: 'Shimoga', state: 'Karnataka', lat: 13.9299, lng: 75.5681 },
  { city: 'Tumkur', state: 'Karnataka', lat: 13.3379, lng: 77.1173 },
  { city: 'Raichur', state: 'Karnataka', lat: 16.2120, lng: 77.3439 },
  { city: 'Bidar', state: 'Karnataka', lat: 17.9104, lng: 77.5199 },
  { city: 'Gulbarga', state: 'Karnataka', lat: 17.3297, lng: 76.8343 },
  { city: 'Hassan', state: 'Karnataka', lat: 13.0068, lng: 76.1004 },
  { city: 'Udupi', state: 'Karnataka', lat: 13.3409, lng: 74.7421 },
];

// Poisson random variate (simple approximation)
function poisson(lambda) {
  let L = Math.exp(-lambda), k = 0, p = 1;
  do { k++; p *= Math.random(); } while (p > L);
  return k - 1;
}

// Random element from array
function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

// Random Indian name generator (simple)
const FIRST_NAMES = ['Rahul','Priya','Suresh','Kavitha','Ramesh','Anjali','Vijay','Deepa','Anil','Sunita','Ravi','Meena','Kiran','Pooja','Vinod','Lakshmi','Arun','Uma','Ganesh','Nandini'];
const LAST_NAMES = ['Kumar','Sharma','Reddy','Naidu','Rao','Patel','Singh','Joshi','Nair','Pillai','Gowda','Hegde','Shetty','Bhat','Verma'];

function randomName() {
  return `${pick(FIRST_NAMES)} ${pick(LAST_NAMES)}`;
}

function randomPhone() {
  return `9${Math.floor(Math.random() * 900000000 + 100000000)}`;
}

function weightedRandomGroup() {
  const r = Math.random();
  let cum = 0;
  for (const [g, p] of Object.entries(GROUP_PREVALENCE)) {
    cum += p;
    if (r <= cum) return g;
  }
  return 'O+';
}

/**
 * Main simulation function. Simulates one day.
 * @param {Date} targetDate - The simulation date (defaults to now)
 * @param {Object} options
 * @param {boolean} options.verbose - Log details to console
 */
async function runDailyCycle(targetDate = new Date(), options = { verbose: true }) {
  const log = options.verbose ? console.log : () => {};
  log(`\n🔄 [DailyCycle] Starting simulation for: ${targetDate.toDateString()}`);

  const stats = {
    expired: 0,
    outflowBatches: 0,
    unitsConsumed: 0,
    inflowBatches: 0,
    unitsAdded: 0,
    donorsRestored: 0,
    newDonorsCreated: 0
  };

  // ── 1. EXPIRE BLOOD UNITS ─────────────────────────────────────────────
  log('  ⏳ Step 1: Expiring old blood units...');
  const expireResult = await BloodInventory.updateMany(
    { expiryDate: { $lte: targetDate }, status: 'safe' },
    { $set: { status: 'expired' } }
  );
  stats.expired = expireResult.modifiedCount;
  log(`     → ${stats.expired} inventory batches marked expired`);

  // ── 2. SIMULATE DAILY OUTFLOW (TRANSFUSIONS) ──────────────────────────
  log('  🩸 Step 2: Simulating daily transfusions (outflow)...');
  const hospitals = await Hospital.find({}).select('_id hospitalName city');
  const hospitalIds = hospitals.map(h => h._id);

  // Determine city-tier lambda for outflow
  function getLambda(city) {
    const bigCities = ['Bangalore', 'Mysore', 'Mangalore', 'Hubli', 'Belgaum', 'Davangere'];
    return bigCities.includes(city) ? 6 : 3;
  }

  for (const hospital of hospitals) {
    const lambda = getLambda(hospital.city);
    // Find safe inventory batches for this hospital
    const batches = await BloodInventory.find({ hospital: hospital._id, status: 'safe', units: { $gt: 0 } }).select('_id units bloodGroup');
    if (batches.length === 0) continue;

    // Simulate outflow for each blood group
    for (const bloodGroup of ALL_GROUPS) {
      const groupBatches = batches.filter(b => b.bloodGroup === bloodGroup);
      if (groupBatches.length === 0) continue;
      const totalUnits = groupBatches.reduce((s, b) => s + b.units, 0);
      if (totalUnits === 0) continue;

      // Units to consume (Poisson, capped at 50% of stock to avoid draining)
      const consume = Math.min(poisson(lambda / ALL_GROUPS.length * 2), Math.floor(totalUnits * 0.5));
      if (consume <= 0) continue;

      // Distribute consumption across batches (FIFO-ish: drain oldest/smallest first)
      let remaining = consume;
      for (const batch of groupBatches) {
        if (remaining <= 0) break;
        const take = Math.min(remaining, batch.units);
        await BloodInventory.findByIdAndUpdate(batch._id, { $inc: { units: -take } });
        remaining -= take;
        stats.unitsConsumed += take;
      }
      stats.outflowBatches++;
    }
  }
  log(`     → ${stats.unitsConsumed} units consumed across ${stats.outflowBatches} blood group batches`);

  // ── 3. SIMULATE DAILY INFLOW (NEW DONATIONS / WALK-INS) ──────────────
  log('  🩸 Step 3: Adding daily walk-in donation inflow...');
  const today = new Date(targetDate);
  today.setHours(0, 0, 0, 0);
  const shelfLifeDays = 42;

  for (const hospital of hospitals) {
    const lambda = getLambda(hospital.city);
    // Number of new donation batches today (1–4 blood groups receive donations)
    const numGroups = Math.min(poisson(lambda / 3) + 1, 4);
    const groupsToday = [...ALL_GROUPS].sort(() => Math.random() - 0.5).slice(0, numGroups);

    for (const bloodGroup of groupsToday) {
      const units = poisson(lambda / 2) + 1;
      if (units <= 0) continue;

      const collectionDate = new Date(today);
      const expiryDate = new Date(today);
      expiryDate.setDate(expiryDate.getDate() + shelfLifeDays);

      await BloodInventory.create({
        hospital: hospital._id,
        bloodGroup,
        units,
        collectionDate,
        expiryDate,
        storageTemperature: 4,
        safetyVerification: {
          hivTest: 'negative',
          hepatitisBTest: 'negative',
          hepatitisCTest: 'negative',
          syphilisTest: 'negative',
          hemoglobinLevel: parseFloat((12 + Math.random() * 4).toFixed(1))
        },
        aiSafetyFlag: false,
        status: 'safe'
      });

      stats.inflowBatches++;
      stats.unitsAdded += units;
    }
  }
  log(`     → ${stats.unitsAdded} units added in ${stats.inflowBatches} new batches`);

  // ── 4. RESTORE DONOR ELIGIBILITY (90-DAY COOLDOWN) ───────────────────
  log('  👤 Step 4: Restoring donors after 90-day cooldown...');
  const ninetyDaysAgo = new Date(targetDate);
  ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

  const restoreResult = await Donor.updateMany(
    { lastDonationDate: { $lte: ninetyDaysAgo }, isAvailable: false },
    { $set: { isAvailable: true } }
  );
  stats.donorsRestored = restoreResult.modifiedCount;
  log(`     → ${stats.donorsRestored} donors restored to available`);

  // ── 5. ADD SYNTHETIC DONORS ───────────────────────────────────────────
  log('  👥 Step 5: Adding synthetic donors...');
  const numNewDonors = Math.floor(Math.random() * 10) + 5; // 5–14 new donors per day
  const bcrypt = require('bcryptjs');

  for (let i = 0; i < numNewDonors; i++) {
    try {
      const name = randomName();
      const city = pick(KA_CITIES);
      const bloodGroup = weightedRandomGroup();
      const phone = randomPhone();
      const emailSuffix = Math.random().toString(36).substring(2, 8);
      const email = `donor_${emailSuffix}@bloodplatform.sim`;

      // Create User
      const hashedPw = await bcrypt.hash('SimDonor@2024', 10);
      const user = await User.create({
        name,
        email,
        password: hashedPw,
        phone,
        role: 'donor'
      });

      // Create Donor profile
      const lastDonationDate = new Date(targetDate);
      lastDonationDate.setDate(lastDonationDate.getDate() - Math.floor(Math.random() * 180)); // 0–180 days ago
      const isAvailable = (new Date(targetDate) - lastDonationDate) > (90 * 86400000);

      await Donor.create({
        user: user._id,
        bloodGroup,
        age: 20 + Math.floor(Math.random() * 35),
        weight: 50 + Math.floor(Math.random() * 40),
        gender: Math.random() > 0.4 ? 'male' : 'female',
        location: {
          type: 'Point',
          coordinates: [
            city.lng + (Math.random() - 0.5) * 0.2,
            city.lat + (Math.random() - 0.5) * 0.2
          ]
        },
        area: city.city,
        state: city.state,
        hub: city.city,
        isAvailable,
        lastDonationDate,
        totalDonations: Math.floor(Math.random() * 8),
        responseRate: 0.5 + Math.random() * 0.5
      });

      stats.newDonorsCreated++;
    } catch (err) {
      // Skip duplicates silently
    }
  }
  log(`     → ${stats.newDonorsCreated} new synthetic donors created`);

  // ── SUMMARY ───────────────────────────────────────────────────────────
  log('\n✅ [DailyCycle] Complete!');
  log(`   📊 Summary: expired=${stats.expired}, consumed=${stats.unitsConsumed}, added=${stats.unitsAdded}, donorsRestored=${stats.donorsRestored}, newDonors=${stats.newDonorsCreated}`);

  return stats;
}

// ── STANDALONE EXECUTION ───────────────────────────────────────────────
async function main() {
  await mongoose.connect(MONGO_URI);
  console.log('MongoDB connected');
  try {
    await runDailyCycle(new Date(), { verbose: true });
  } finally {
    await mongoose.disconnect();
    console.log('MongoDB disconnected');
  }
}

// If run directly (not imported)
if (require.main === module) {
  main().catch(err => { console.error(err); process.exit(1); });
}

module.exports = { runDailyCycle };
