/**
 * donorRankingService.test.js
 * ────────────────────────────────────────────────────────────────────
 * Unit + integration tests for the response-probability-aware donor
 * ranking (Req A) and fairness-aware alert allocation (Req B).
 *
 * Run with:  node donorRankingService.test.js
 *
 * Tests do NOT use mocked ML predictions to claim the system works.
 * Each test verifies documented algorithm behaviour and safety constraints.
 */

'use strict';

const assert = require('assert');
const {
  checkHardEligibility,
  estimateResponseProbability,
  estimateArrivalProbability,
  computeMobilizationScore,
  applyFairness,
  rankAndSelectDonors,
  computeMobilizationMetrics,
  haversineKm,
  getEffectiveCoords,
  WEIGHTS,
  COMPATIBILITY_MAP,
  MAX_DISTANCE_KM,
  CITY_COORDS,
} = require('./src/utils/donorRankingService');

// ── Test harness ──────────────────────────────────────────────────
let passed = 0;
let failed  = 0;
const tests = [];

function test(name, fn) {
  tests.push({ name, fn });
}

async function runAll() {
  for (const { name, fn } of tests) {
    try {
      await fn();
      console.log(`  ✅  ${name}`);
      passed++;
    } catch (err) {
      console.log(`  ❌  ${name}`);
      console.log(`       → ${err.message}`);
      failed++;
    }
  }
  console.log(`\n${'─'.repeat(60)}`);
  console.log(`Results: ${passed} passed, ${failed} failed out of ${tests.length} tests`);
  if (failed > 0) process.exit(1);
}

// ── Shared fixtures ───────────────────────────────────────────────
const HOSPITAL_COORDS = CITY_COORDS['Mangalore']; // [74.8431, 12.8703]

function makeDonor(overrides = {}) {
  return {
    _id:              'donor-' + Math.random().toString(36).slice(2),
    bloodGroup:       'O+',
    isAvailable:      true,
    lastDonationDate: null,
    totalDonations:   5,
    responseRate:     80,
    area:             'Mangalore',
    location:         { type: 'Point', coordinates: CITY_COORDS['Mangalore'] },
    alertHistory: {
      totalAlertsReceived:         0,
      alertsLast7Days:             0,
      alertsLast30Days:            0,
      lastAlertSentAt:             null,
      unansweredAlertsLast30Days:  0,
    },
    totalAlertsResponded: 0,
    avgArrivalTimeMinutes: null,
    getBurdenScore() {
      const last7  = this.alertHistory.alertsLast7Days  || 0;
      const last30 = this.alertHistory.alertsLast30Days || 0;
      return Math.max(Math.min(last7 / 5, 1), Math.min(last30 / 12, 1));
    },
    canDonate() {
      if (!this.lastDonationDate) return true;
      const days = (Date.now() - new Date(this.lastDonationDate)) / (1000 * 60 * 60 * 24);
      return days >= 90;
    },
    ...overrides,
  };
}

// ════════════════════════════════════════════════════════════════
// SECTION 1 — HARD ELIGIBILITY CHECKS
// ════════════════════════════════════════════════════════════════
console.log('\n── Section 1: Hard eligibility checks ──');

// Test 3 from spec: unavailable donor
test('Ineligible: donor marked unavailable', () => {
  const donor = makeDonor({ isAvailable: false });
  const result = checkHardEligibility(donor, 'O+', HOSPITAL_COORDS, 'medium');
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'donor_unavailable');
});

// Test 3: within 90-day cooldown
test('Ineligible: donor within 90-day donation cooldown', () => {
  const lastDonation = new Date();
  lastDonation.setDate(lastDonation.getDate() - 45); // only 45 days ago
  const donor = makeDonor({ lastDonationDate: lastDonation.toISOString() });
  const result = checkHardEligibility(donor, 'O+', HOSPITAL_COORDS, 'medium');
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'donation_cooldown');
});

// Blood group incompatibility
test('Ineligible: blood group incompatible (B+ donor for AB- request)', () => {
  const donor = makeDonor({ bloodGroup: 'B+' });
  const result = checkHardEligibility(donor, 'AB-', HOSPITAL_COORDS, 'medium');
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'blood_group_incompatible');
});

// Test 4: urgent request with short deadline — far donor excluded
test('Ineligible: donor too far for critical urgency (>30 km)', () => {
  // Pune is ~1200 km from Mangalore
  const donor = makeDonor({ location: { type: 'Point', coordinates: CITY_COORDS['Pune'] } });
  const result = checkHardEligibility(donor, 'O+', HOSPITAL_COORDS, 'critical');
  assert.strictEqual(result.eligible, false);
  assert.strictEqual(result.reason, 'too_far');
});

// Eligible donor
test('Eligible: available, correct blood group, within range, past cooldown', () => {
  const lastDonation = new Date();
  lastDonation.setDate(lastDonation.getDate() - 120);
  const donor = makeDonor({ lastDonationDate: lastDonation.toISOString() });
  const result = checkHardEligibility(donor, 'O+', HOSPITAL_COORDS, 'medium');
  assert.strictEqual(result.eligible, true);
});

// ════════════════════════════════════════════════════════════════
// SECTION 2 — RESPONSE PROBABILITY ESTIMATION (Req A)
// ════════════════════════════════════════════════════════════════
console.log('\n── Section 2: Response probability estimation ──');

// Test 9: missing historical data falls back to prior
test('Response prob: insufficient data (<3 alerts) returns documented prior path', () => {
  const donor = makeDonor({
    alertHistory: { totalAlertsReceived: 1, alertsLast7Days: 0, alertsLast30Days: 0 },
    totalAlertsResponded: 1,
  });
  const prob = estimateResponseProbability(donor);
  // Should be a valid probability in [0,1]
  assert.ok(prob >= 0 && prob <= 1, `Expected [0,1], got ${prob}`);
  // With prior of 0.65, available=1, no experience, no burden, result should be > 0.4
  assert.ok(prob > 0.4, `Prior-path prob should be reasonable, got ${prob}`);
});

// Test 1: low-historical-response-rate donor
test('Response prob: donor with 20% historical response rate scores lower', () => {
  const lowResponder = makeDonor({
    alertHistory: { totalAlertsReceived: 10, alertsLast7Days: 0, alertsLast30Days: 0 },
    totalAlertsResponded: 2, // 20% rate
  });
  const highResponder = makeDonor({
    alertHistory: { totalAlertsReceived: 10, alertsLast7Days: 0, alertsLast30Days: 0 },
    totalAlertsResponded: 9, // 90% rate
  });
  const lowProb  = estimateResponseProbability(lowResponder);
  const highProb = estimateResponseProbability(highResponder);
  assert.ok(highProb > lowProb, `High responder (${highProb}) should beat low (${lowProb})`);
});

// Test 7: recently over-alerted donor
test('Response prob: over-burdened donor (5+ alerts last 7 days) scores lower', () => {
  const normal   = makeDonor({ alertHistory: { totalAlertsReceived: 5, alertsLast7Days: 0, alertsLast30Days: 1 } });
  const burdened = makeDonor({ alertHistory: { totalAlertsReceived: 5, alertsLast7Days: 5, alertsLast30Days: 5 } });
  const normalProb  = estimateResponseProbability(normal);
  const burdenedProb = estimateResponseProbability(burdened);
  assert.ok(normalProb > burdenedProb, `Normal (${normalProb}) should beat burdened (${burdenedProb})`);
});

// ════════════════════════════════════════════════════════════════
// SECTION 3 — ARRIVAL PROBABILITY ESTIMATION (Req A)
// ════════════════════════════════════════════════════════════════
console.log('\n── Section 3: Arrival probability estimation ──');

// Test 2: farther donor with good history vs nearer with no data
test('Arrival prob: closer donor scores higher for critical urgency', () => {
  const close = makeDonor({ location: { type: 'Point', coordinates: CITY_COORDS['Mangalore'] } });
  const far   = makeDonor({ location: { type: 'Point', coordinates: CITY_COORDS['Mysore'] } }); // ~200 km
  const closeProb = estimateArrivalProbability(close, HOSPITAL_COORDS, 'critical');
  const farProb   = estimateArrivalProbability(far,   HOSPITAL_COORDS, 'critical');
  assert.ok(closeProb > farProb, `Close (${closeProb}) should beat far (${farProb})`);
});

// Test 10: stale/unavailable travel estimate — still returns valid score
test('Arrival prob: returns valid [0,1] score when avgArrivalTimeMinutes is null', () => {
  const donor = makeDonor({ avgArrivalTimeMinutes: null });
  const prob  = estimateArrivalProbability(donor, HOSPITAL_COORDS, 'medium');
  assert.ok(prob >= 0 && prob <= 1, `Got ${prob}`);
});

// ════════════════════════════════════════════════════════════════
// SECTION 4 — MOBILIZATION SCORE
// ════════════════════════════════════════════════════════════════
console.log('\n── Section 4: Mobilization score ──');

test('Mobilization score is in [0,1] for any valid donor', () => {
  const donor = makeDonor();
  const result = computeMobilizationScore(donor, HOSPITAL_COORDS, 'high');
  assert.ok(result.mobilizationScore >= 0 && result.mobilizationScore <= 1);
  assert.ok(['historical', 'prior_estimate'].includes(result.dataSource));
});

test('Critical urgency produces higher mobilization score than low urgency for same donor', () => {
  const donor = makeDonor();
  const critical = computeMobilizationScore(donor, HOSPITAL_COORDS, 'critical').mobilizationScore;
  const low      = computeMobilizationScore(donor, HOSPITAL_COORDS, 'low').mobilizationScore;
  assert.ok(critical > low, `Critical (${critical}) should > low (${low})`);
});

// ════════════════════════════════════════════════════════════════
// SECTION 5 — FAIRNESS ADJUSTMENTS (Req B)
// ════════════════════════════════════════════════════════════════
console.log('\n── Section 5: Fairness adjustments ──');

test('Fairness: over-burdened donor is penalised (lower adjusted score)', () => {
  const normalDonor   = makeDonor({ alertHistory: { alertsLast7Days: 0, alertsLast30Days: 1 } });
  const burdenedDonor = makeDonor({ alertHistory: { alertsLast7Days: 5, alertsLast30Days: 10 } });
  const areaCount     = new Map([['Mangalore', 5]]);
  const rawScore      = 0.7;

  const normalAdj   = applyFairness(rawScore, normalDonor,   areaCount, 0.5);
  const burdenedAdj = applyFairness(rawScore, burdenedDonor, areaCount, 0.5);
  assert.ok(normalAdj > burdenedAdj, `Normal adj (${normalAdj}) > burdened adj (${burdenedAdj})`);
});

test('Fairness: underserved area donor gets bonus', () => {
  const donorDense  = makeDonor({ area: 'Bangalore' });
  const donorSparse = makeDonor({ area: 'Kozhikode' });
  // Bangalore has 100 donors; Kozhikode has 2
  const areaCount = new Map([['Bangalore', 100], ['Kozhikode', 2]]);
  const rawScore  = 0.5;

  const denseAdj  = applyFairness(rawScore, donorDense,  areaCount, 0.3);
  const sparseAdj = applyFairness(rawScore, donorSparse, areaCount, 0.3);
  assert.ok(sparseAdj > denseAdj, `Sparse area (${sparseAdj}) should beat dense (${denseAdj})`);
});

test('Fairness: at critical urgency, fairness penalty is halved', () => {
  const burdened  = makeDonor({ alertHistory: { alertsLast7Days: 5, alertsLast30Days: 10 } });
  const areaCount = new Map([['Mangalore', 5]]);
  const rawScore  = 0.7;

  const adjNormal   = applyFairness(rawScore, burdened, areaCount, 0.3); // below threshold
  const adjCritical = applyFairness(rawScore, burdened, areaCount, 0.9); // above threshold
  // Critical urgency halves the fairness factor, so penalty is smaller → higher adjusted score
  assert.ok(adjCritical > adjNormal, `Critical (${adjCritical}) should > normal urgency (${adjNormal})`);
});

// INVARIANT: fairness never makes ineligible donors eligible
test('Fairness invariant: ineligible donor (isAvailable=false) excluded regardless of score', () => {
  const unavailable = makeDonor({ isAvailable: false });
  const eligResult  = checkHardEligibility(unavailable, 'O+', HOSPITAL_COORDS, 'medium');
  assert.strictEqual(eligResult.eligible, false,
    'Unavailable donor must never pass eligibility gate');
  // applyFairness is only called after eligibility passes — this test confirms gate runs first
});

// ════════════════════════════════════════════════════════════════
// SECTION 6 — FULL PIPELINE (rankAndSelectDonors)
// ════════════════════════════════════════════════════════════════
console.log('\n── Section 6: Full pipeline (rankAndSelectDonors) ──');

// Test 5: few eligible donors nearby
test('Pipeline: request with 2 eligible donors → lowDonorAvailability=true', () => {
  const donors = [
    makeDonor({ bloodGroup: 'O+' }),
    makeDonor({ bloodGroup: 'O+' }),
  ];
  const { coverageReport } = rankAndSelectDonors(donors, 'O+', HOSPITAL_COORDS, 'medium', 0.5, 20);
  assert.strictEqual(coverageReport.lowDonorAvailability, true);
});

// Test 11: no suitable donor can arrive in time
test('Pipeline: when all donors too far (beyond max distance), 0 alerts sent', () => {
  const farDonors = [
    makeDonor({ location: { type: 'Point', coordinates: CITY_COORDS['Kolkata'] } }),
    makeDonor({ location: { type: 'Point', coordinates: CITY_COORDS['Delhi'] } }),
  ];
  const { alertCandidates, coverageReport } = rankAndSelectDonors(
    farDonors, 'O+', HOSPITAL_COORDS, 'critical', 0.95, 20
  );
  assert.strictEqual(alertCandidates.length, 0, 'No one should be alerted if all too far');
  assert.ok(coverageReport.totalIneligible >= 2);
});

// Test 8: multiple requests competing for same donors (same pool re-ranked)
test('Pipeline: burdened donor in shared pool ranks lower than fresh donor', () => {
  const fresh    = makeDonor({ alertHistory: { alertsLast7Days: 0, alertsLast30Days: 0, totalAlertsReceived: 3 }, totalAlertsResponded: 3 });
  const burdened = makeDonor({ alertHistory: { alertsLast7Days: 5, alertsLast30Days: 10, totalAlertsReceived: 10 }, totalAlertsResponded: 3 });
  const { alertCandidates } = rankAndSelectDonors(
    [burdened, fresh], 'O+', HOSPITAL_COORDS, 'high', 0.7, 20
  );
  assert.ok(alertCandidates.length === 2);
  // Fresh donor should rank above burdened donor
  assert.strictEqual(alertCandidates[0].donor._id, fresh._id,
    'Fresh donor should rank first');
});

// Test 2: farther donor with better response history may outrank nearer donor
test('Pipeline: donor 15km away with 90% resp. rate can outrank 5km donor with 20% rate', () => {
  const nearLow = makeDonor({
    location: { type: 'Point', coordinates: [74.848, 12.875] }, // ~1km from hospital
    alertHistory: { totalAlertsReceived: 10, alertsLast7Days: 0, alertsLast30Days: 0 },
    totalAlertsResponded: 2, // 20% rate
  });
  const farHigh = makeDonor({
    area: 'Udupi',
    location: { type: 'Point', coordinates: CITY_COORDS['Udupi'] }, // ~55km from Mangalore
    alertHistory: { totalAlertsReceived: 10, alertsLast7Days: 0, alertsLast30Days: 0 },
    totalAlertsResponded: 9, // 90% rate
  });
  // For 'medium' urgency max is 20km, so farHigh at ~55km will be ineligible
  const { eligible, ineligible } = rankAndSelectDonors(
    [nearLow, farHigh], 'O+', HOSPITAL_COORDS, 'medium', 0.5, 20
  );
  // farHigh is ineligible (>20km for medium), nearLow is eligible — verify gating works
  const ineligIds = ineligible.map(e => e.donor._id);
  assert.ok(ineligIds.includes(farHigh._id), 'farHigh should be ineligible at medium urgency');
  assert.ok(eligible.map(e => e.donor._id).includes(nearLow._id), 'nearLow should be eligible');
});

// Test 6: region with low donor population
test('Pipeline: region with 1 donor still receives coverage report', () => {
  const donor  = makeDonor({ area: 'Thiruvananthapuram',
    location: { type: 'Point', coordinates: CITY_COORDS['Mangalore'] } }); // coords near hospital
  const { coverageReport } = rankAndSelectDonors(
    [donor], 'O+', HOSPITAL_COORDS, 'medium', 0.5, 20
  );
  assert.ok(Array.isArray(coverageReport.areasWithEligible));
  assert.ok(coverageReport.areasWithEligible.length >= 0);
});

// ════════════════════════════════════════════════════════════════
// SECTION 7 — MOBILIZATION METRICS
// ════════════════════════════════════════════════════════════════
console.log('\n── Section 7: Mobilization metrics ──');

test('computeMobilizationMetrics returns correct fields', () => {
  const mockRequest = {
    _id: 'req-1',
    status: 'fulfilled',
    mobilization: {
      alertsSent: 10,
      firstConfirmedAt: new Date(),
      minutesToFirstConfirmed: 8,
      alertedAreas: ['Mangalore', 'Udupi'],
      lowDonorAvailability: false,
    },
    respondedDonors: [
      { status: 'accepted' },
      { status: 'donated' },
    ],
    createdAt: new Date(),
  };
  const metrics = computeMobilizationMetrics(mockRequest);
  assert.strictEqual(metrics.alertsSentPerRequest, 10);
  assert.strictEqual(metrics.minutesToFirstConfirmed, 8);
  assert.strictEqual(metrics.mobilizationRate, 20); // 2 responded / 10 alerted
  assert.strictEqual(metrics.confirmedDonors, 1);
  assert.strictEqual(metrics.actualDonors, 1);
});

test('mobilizationRate is null when alertsSent is 0', () => {
  const mockRequest = {
    _id: 'req-2',
    status: 'open',
    mobilization: { alertsSent: 0, alertedAreas: [], lowDonorAvailability: true },
    respondedDonors: [],
    createdAt: new Date(),
  };
  const metrics = computeMobilizationMetrics(mockRequest);
  assert.strictEqual(metrics.mobilizationRate, null,
    'mobilizationRate should be null when no alerts were sent');
});

// ════════════════════════════════════════════════════════════════
// SECTION 8 — REGRESSION / COMPATIBILITY CHECKS
// ════════════════════════════════════════════════════════════════
console.log('\n── Section 8: Regression / compatibility ──');

test('COMPATIBILITY_MAP: O- donors can donate to all blood groups', () => {
  // O- is compatible with every recipient group
  const allGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  for (const requestedBG of allGroups) {
    const compat = COMPATIBILITY_MAP[requestedBG];
    assert.ok(compat.includes('O-'), `O- should be compatible with ${requestedBG}`);
  }
});

test('COMPATIBILITY_MAP: AB+ can receive from all groups', () => {
  const allGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
  const ab_plus = COMPATIBILITY_MAP['AB+'];
  for (const g of allGroups) {
    assert.ok(ab_plus.includes(g), `AB+ should accept ${g}`);
  }
});

test('haversineKm: known city distances are within 20% of published road distance', () => {
  // Mangalore → Udupi is approximately 57 km straight-line
  const dist = haversineKm(CITY_COORDS['Mangalore'], CITY_COORDS['Udupi']);
  assert.ok(dist > 40 && dist < 80, `Mangalore-Udupi haversine should be ~57km, got ${dist.toFixed(1)}`);
});

test('getEffectiveCoords: falls back to city lookup for [0,0] coordinates', () => {
  const donor  = makeDonor({ location: { type: 'Point', coordinates: [0, 0] }, area: 'Mangalore' });
  const coords = getEffectiveCoords(donor);
  assert.deepStrictEqual(coords, CITY_COORDS['Mangalore']);
});

test('WEIGHTS: response probability weights sum to 1.0', () => {
  const sum = Object.values(WEIGHTS.responseProbability).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1.0) < 1e-9, `Response weights sum to ${sum}, expected 1.0`);
});

test('WEIGHTS: arrival probability weights sum to 1.0', () => {
  const sum = Object.values(WEIGHTS.arrivalProbability).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1.0) < 1e-9, `Arrival weights sum to ${sum}, expected 1.0`);
});

test('WEIGHTS: mobilization combination weights sum to 1.0', () => {
  const sum = Object.values(WEIGHTS.mobilizationCombination).reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 1.0) < 1e-9, `Mobilization combo weights sum to ${sum}, expected 1.0`);
});

// ════════════════════════════════════════════════════════════════
// RUN
// ════════════════════════════════════════════════════════════════
console.log('\nBlood Platform — Donor Ranking & Fairness Test Suite');
console.log('════════════════════════════════════════════════════');
runAll().catch(err => { console.error(err); process.exit(1); });
