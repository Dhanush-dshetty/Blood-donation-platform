/**
 * donorRankingService.js
 * ──────────────────────
 * Response-Probability-Aware Donor Ranking + Fairness-Aware Alert Allocation
 *
 * Mentor Requirement A  – probabilistic ranking of eligible donors
 * Mentor Requirement B  – fair geographic/burden-aware alert selection
 *
 * Design principles
 * ─────────────────
 * 1. Hard eligibility gates are applied BEFORE any scoring. A score can never
 *    override blood compatibility, the 90-day donation cooldown, or
 *    isAvailable === false.
 * 2. Where historical data is insufficient (< 3 prior alerts), the service
 *    falls back to a documented prior estimate rather than fabricating a
 *    trained-model prediction.
 * 3. All scoring weights are configurable via the WEIGHTS constant.
 * 4. Fairness adjustments never override eligibility or clinical safety.
 */

'use strict';

// ──────────────────────────────────────────────────────────────────────────────
// CONFIGURABLE WEIGHTS
// Change these values to tune the algorithm without touching logic.
// ──────────────────────────────────────────────────────────────────────────────
const WEIGHTS = {
  // Req A – response-probability component weights (must sum to 1.0)
  responseProbability: {
    historicalResponseRate:  0.40, // fraction of past alerts the donor answered
    availabilityReadiness:   0.25, // current isAvailable + donation cooldown status
    donationHistory:         0.15, // normalised totalDonations (experience proxy)
    recentAlertBurden:       0.20, // inverse of alert burden (less burdened = higher prob)
  },

  // Req A – on-time arrival probability weights (must sum to 1.0)
  arrivalProbability: {
    distanceScore:           0.55, // closer = better
    urgencyTimeBonus:        0.25, // urgent requests favour close donors
    historicalArrivalPerf:   0.20, // prior avg arrival time where available
  },

  // Req A – mobilization score combination
  mobilizationCombination: {
    responseProbabilityWeight: 0.50,
    arrivalProbabilityWeight:  0.50,
  },

  // Req B – fairness penalty and bonus factors (applied after raw scoring)
  fairness: {
    burdenPenaltyMax:        0.30, // max fractional reduction for over-burdened donors
    underservedAreaBonus:    0.10, // bonus for donors in areas with few registered donors
    urgencyOverrideFactor:   0.70, // at this urgency score, fairness weight is halved
  }
};

// Urgency multipliers – applied to the combined mobilization score
const URGENCY_MULTIPLIER = {
  critical: 1.40,
  high:     1.15,
  medium:   1.00,
  low:      0.85,
};

// Maximum distances by urgency level (km)
const MAX_DISTANCE_KM = {
  critical: 30,
  high:     25,
  medium:   20,
  low:      15,
};

// Assumed average driving speed (km/h) for travel-time estimates
const AVG_SPEED_KMH = 30;

// Blood-group compatibility (recipient → compatible donor groups)
const COMPATIBILITY_MAP = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-'],
};

// Haversine formula — returns distance in km
function haversineKm(coords1, coords2) {
  const [lon1, lat1] = coords1;
  const [lon2, lat2] = coords2;
  const R    = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

// Estimated travel time in minutes given distance
function estimateTravelMinutes(distanceKm) {
  return (distanceKm / AVG_SPEED_KMH) * 60;
}

// ──────────────────────────────────────────────────────────────────────────────
// HARD ELIGIBILITY CHECKS  (gate 1 — never bypassed by score)
// ──────────────────────────────────────────────────────────────────────────────
/**
 * Returns { eligible: true } or { eligible: false, reason: '...' }
 */
function checkHardEligibility(donor, requestedBloodGroup, hospitalCoords, urgencyLevel) {
  // 1. Availability
  if (!donor.isAvailable) {
    return { eligible: false, reason: 'donor_unavailable' };
  }

  // 2. 90-day donation cooldown
  if (donor.lastDonationDate) {
    const daysSince =
      (Date.now() - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24);
    if (daysSince < 90) {
      return { eligible: false, reason: 'donation_cooldown', daysSince: Math.floor(daysSince) };
    }
  }

  // 3. Blood-group compatibility
  const compatibleGroups = COMPATIBILITY_MAP[requestedBloodGroup] || [requestedBloodGroup];
  if (!compatibleGroups.includes(donor.bloodGroup)) {
    return { eligible: false, reason: 'blood_group_incompatible' };
  }

  // 4. Realistic arrival window — donor must be reachable within urgency horizon
  const donorCoords = getEffectiveCoords(donor);
  const distKm      = haversineKm(hospitalCoords, donorCoords);
  const maxDist     = MAX_DISTANCE_KM[urgencyLevel] || MAX_DISTANCE_KM.medium;
  if (distKm > maxDist) {
    return { eligible: false, reason: 'too_far', distanceKm: distKm, maxDistanceKm: maxDist };
  }

  return { eligible: true };
}

// ──────────────────────────────────────────────────────────────────────────────
// COORDINATE HELPERS
// ──────────────────────────────────────────────────────────────────────────────
const CITY_COORDS = {
  Mangalore: [74.8431, 12.8703], Udupi: [74.7421, 13.3409],
  Bangalore: [77.5946, 12.9716], Mysore: [76.6394, 12.2958],
  Mumbai: [72.8777, 19.076],     Pune: [73.8567, 18.5204],
  Chennai: [80.2707, 13.0827],   Coimbatore: [76.9558, 11.0168],
  Hyderabad: [78.4867, 17.385],  Kochi: [76.2673, 9.9312],
  Thiruvananthapuram: [76.9366, 8.5241], Kozhikode: [75.7804, 11.2588],
  Visakhapatnam: [83.2185, 17.6868], Ahmedabad: [72.5714, 23.0225],
  Jaipur: [75.7873, 26.9124],    Lucknow: [80.9462, 26.8467],
  Kolkata: [88.3639, 22.5726],   'New Delhi': [77.209, 28.6139],
  Delhi: [77.209, 28.6139],      Patna: [85.1376, 25.5941],
  Bhopal: [77.4126, 23.2599],    Indore: [75.8577, 22.7196],
};

function getEffectiveCoords(donor) {
  const c = donor.location?.coordinates || [0, 0];
  if (c[0] !== 0 || c[1] !== 0) return c;
  return CITY_COORDS[donor.area] || CITY_COORDS['Bangalore'];
}

// ──────────────────────────────────────────────────────────────────────────────
// REQ A — RESPONSE-PROBABILITY COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
/**
 * Estimates probability that a donor will respond to an alert.
 * Range: [0, 1]
 *
 * FALLBACK: when totalAlertsReceived < 3, we use a documented prior of 0.65
 * (typical volunteer response rates in community health literature) rather
 * than claiming a trained model.
 */
function estimateResponseProbability(donor) {
  const w = WEIGHTS.responseProbability;

  // (a) Historical response rate
  let histRate;
  const totalAlerts = donor.alertHistory?.totalAlertsReceived || 0;
  if (totalAlerts >= 3) {
    const responded  = donor.totalAlertsResponded || 0;
    histRate         = Math.min(responded / totalAlerts, 1.0);
  } else {
    // Insufficient data — use documented prior
    histRate = 0.65;
  }

  // (b) Availability & readiness
  const isAvail        = donor.isAvailable ? 1.0 : 0.0;
  let donationReady    = 1.0;
  if (donor.lastDonationDate) {
    const days = (Date.now() - new Date(donor.lastDonationDate)) / (1000 * 60 * 60 * 24);
    donationReady = days >= 90 ? 1.0 : 0.0; // Hard gate already checked, but keep 0 here
  }
  const availScore = isAvail * donationReady;

  // (c) Donation experience (normalised to [0,1], cap at 20 donations)
  const experienceScore = Math.min((donor.totalDonations || 0) / 20, 1.0);

  // (d) Alert burden (inverse — less burdened = more likely to respond)
  const burdenScore   = typeof donor.getBurdenScore === 'function'
    ? donor.getBurdenScore()
    : computeBurdenScore(donor);
  const burdenInverse = 1.0 - burdenScore;

  const prob =
    w.historicalResponseRate * histRate +
    w.availabilityReadiness  * availScore +
    w.donationHistory        * experienceScore +
    w.recentAlertBurden      * burdenInverse;

  return Math.max(0, Math.min(prob, 1.0));
}

// Standalone burden score computation (used when Mongoose method is unavailable)
function computeBurdenScore(donor) {
  const last7  = donor.alertHistory?.alertsLast7Days  || 0;
  const last30 = donor.alertHistory?.alertsLast30Days || 0;
  return Math.max(Math.min(last7 / 5, 1.0), Math.min(last30 / 12, 1.0));
}

// ──────────────────────────────────────────────────────────────────────────────
// REQ A — ON-TIME ARRIVAL-PROBABILITY COMPONENT
// ──────────────────────────────────────────────────────────────────────────────
/**
 * Estimates probability that the donor can arrive within the urgency-defined
 * time horizon.
 * Range: [0, 1]
 */
function estimateArrivalProbability(donor, hospitalCoords, urgencyLevel) {
  const w = WEIGHTS.arrivalProbability;

  const donorCoords = getEffectiveCoords(donor);
  const distKm      = haversineKm(hospitalCoords, donorCoords);
  const maxDist     = MAX_DISTANCE_KM[urgencyLevel] || MAX_DISTANCE_KM.medium;

  // (a) Distance score — linear decay to 0 at maxDist
  const distScore = Math.max(0, 1 - distKm / maxDist);

  // (b) Urgency-time bonus — critical urgency rewards closer donors more
  const urgencyMultiplier = { critical: 1.5, high: 1.2, medium: 1.0, low: 0.8 };
  const urgencyBonus = Math.min(
    distScore * (urgencyMultiplier[urgencyLevel] || 1.0) * 0.2,
    0.2
  );

  // (c) Historical arrival performance
  let arrivalPerf = 0.6; // documented prior when data is unavailable
  if (donor.avgArrivalTimeMinutes != null) {
    const estimatedTravelMins = estimateTravelMinutes(distKm);
    // If avg arrival ≤ estimated travel * 1.5, donor historically arrives on time
    arrivalPerf = donor.avgArrivalTimeMinutes <= estimatedTravelMins * 1.5 ? 0.9 : 0.4;
  }

  const prob =
    w.distanceScore         * distScore +
    w.urgencyTimeBonus      * (urgencyBonus / 0.2) + // normalised to [0,1]
    w.historicalArrivalPerf * arrivalPerf;

  return Math.max(0, Math.min(prob, 1.0));
}

// ──────────────────────────────────────────────────────────────────────────────
// REQ A — COMBINED MOBILIZATION SCORE
// ──────────────────────────────────────────────────────────────────────────────
function computeMobilizationScore(donor, hospitalCoords, urgencyLevel) {
  const respProb    = estimateResponseProbability(donor);
  const arrivalProb = estimateArrivalProbability(donor, hospitalCoords, urgencyLevel);

  const { responseProbabilityWeight, arrivalProbabilityWeight } =
    WEIGHTS.mobilizationCombination;

  const rawScore =
    responseProbabilityWeight * respProb +
    arrivalProbabilityWeight  * arrivalProb;

  const urgMult = URGENCY_MULTIPLIER[urgencyLevel] || 1.0;
  return {
    mobilizationScore:   Math.min(rawScore * urgMult, 1.0),
    responseProbability: respProb,
    arrivalProbability:  arrivalProb,
    dataSource:
      (donor.alertHistory?.totalAlertsReceived || 0) >= 3
        ? 'historical'
        : 'prior_estimate',
  };
}

// ──────────────────────────────────────────────────────────────────────────────
// REQ B — FAIRNESS ADJUSTMENTS
// ──────────────────────────────────────────────────────────────────────────────
/**
 * Computes the geographic underserved bonus.
 * Donors in areas with fewer registered donors get a small positive bonus so
 * that sparse regions stay accessible.
 *
 * @param {string} area           - Donor's area string
 * @param {Map}    areaDonorCount - Map<area, count> of available donors per area
 * @returns {number} bonus in [0, underservedAreaBonus]
 */
function computeUnderservedBonus(area, areaDonorCount) {
  if (!area || !areaDonorCount) return 0;
  const count      = areaDonorCount.get(area) || 1;
  const maxCount   = Math.max(...areaDonorCount.values(), 1);
  // Areas with fewer donors than 25% of max are "underserved"
  const scarcity   = Math.max(0, 1 - count / maxCount);
  return WEIGHTS.fairness.underservedAreaBonus * scarcity;
}

/**
 * Applies fairness penalties and bonuses to the raw mobilization score.
 *
 * Fairness adjustments are:
 *  - Alert-burden penalty (reduces score for over-burdened donors)
 *  - Underserved-area bonus (small boost for donors in sparse regions)
 *
 * At very high urgency (aiUrgencyScore >= urgencyOverrideFactor),
 * fairness weight is halved so that urgent requests are not significantly
 * delayed by fairness constraints.
 *
 * INVARIANT: fairness adjustments never make an ineligible donor eligible.
 */
function applyFairness(rawScore, donor, areaDonorCount, aiUrgencyScore) {
  const fw = WEIGHTS.fairness;

  // Scale fairness strength based on urgency (less fairness weight when critical)
  const urgencyFactor = aiUrgencyScore >= fw.urgencyOverrideFactor ? 0.5 : 1.0;

  // Burden penalty
  const burdenScore   = computeBurdenScore(donor);
  const burdenPenalty = fw.burdenPenaltyMax * burdenScore * urgencyFactor;

  // Underserved bonus
  const underservedBonus =
    computeUnderservedBonus(donor.area, areaDonorCount) * urgencyFactor;

  const adjusted = rawScore - burdenPenalty + underservedBonus;
  return Math.max(0, Math.min(adjusted, 1.0));
}

// ──────────────────────────────────────────────────────────────────────────────
// PUBLIC API
// ──────────────────────────────────────────────────────────────────────────────

/**
 * rankAndSelectDonors
 * ───────────────────
 * Full pipeline: eligibility gate → scoring → fairness → ranking → selection
 *
 * @param {Array}  donors          - Mongoose Donor documents (populated with .user)
 * @param {string} requestedBG     - Blood group of the request (e.g. 'O+')
 * @param {Array}  hospitalCoords  - [lng, lat] of hospital
 * @param {string} urgencyLevel    - 'critical'|'high'|'medium'|'low'
 * @param {number} aiUrgencyScore  - AI urgency score [0,1]
 * @param {number} alertLimit      - Max number of donors to alert (default 20)
 *
 * @returns {Object} { eligible, ineligible, alertCandidates, coverageReport }
 */
function rankAndSelectDonors(
  donors,
  requestedBG,
  hospitalCoords,
  urgencyLevel     = 'medium',
  aiUrgencyScore   = 0.5,
  alertLimit       = 20
) {
  const eligible   = [];
  const ineligible = [];

  // Build area → donor count map for underserved computation (Req B)
  const areaDonorCount = new Map();
  for (const donor of donors) {
    if (donor.area) {
      areaDonorCount.set(donor.area, (areaDonorCount.get(donor.area) || 0) + 1);
    }
  }

  for (const donor of donors) {
    // ── Gate 1: hard eligibility ─────────────────────────────────────
    const eligResult = checkHardEligibility(
      donor, requestedBG, hospitalCoords, urgencyLevel
    );
    if (!eligResult.eligible) {
      ineligible.push({ donor, reason: eligResult.reason });
      continue;
    }

    // ── Score: mobilization probability ─────────────────────────────
    const scores = computeMobilizationScore(donor, hospitalCoords, urgencyLevel);

    // ── Req B: fairness adjustment ───────────────────────────────────
    const fairScore = applyFairness(
      scores.mobilizationScore, donor, areaDonorCount, aiUrgencyScore
    );

    // Distance for reporting
    const donorCoords = getEffectiveCoords(donor);
    const distanceKm  = Math.round(haversineKm(hospitalCoords, donorCoords) * 10) / 10;
    const travelMins  = Math.round(estimateTravelMinutes(distanceKm));

    eligible.push({
      donor,
      distanceKm,
      estimatedTravelMinutes:   travelMins,
      responseProbability:      Math.round(scores.responseProbability * 100) / 100,
      arrivalProbability:       Math.round(scores.arrivalProbability  * 100) / 100,
      mobilizationScore:        Math.round(scores.mobilizationScore   * 100) / 100,
      fairnessAdjustedScore:    Math.round(fairScore * 100) / 100,
      dataSource:               scores.dataSource,
      area:                     donor.area || 'unknown',
      burdenScore:              Math.round(computeBurdenScore(donor) * 100) / 100,
    });
  }

  // Sort by fairness-adjusted mobilization score descending
  eligible.sort((a, b) => b.fairnessAdjustedScore - a.fairnessAdjustedScore);

  // Select top N for alerting (Req B: alertLimit)
  const alertCandidates = eligible.slice(0, alertLimit);

  // ── Req B: geographic coverage report ────────────────────────────
  const alertedAreas = [...new Set(alertCandidates.map(e => e.area))];
  const totalAreas   = [...new Set(eligible.map(e => e.area))];
  const coverageReport = {
    totalEligible:      eligible.length,
    totalIneligible:    ineligible.length,
    alertsSent:         alertCandidates.length,
    areasWithEligible:  totalAreas,
    areasAlerted:       alertedAreas,
    coverageFraction:
      totalAreas.length > 0
        ? Math.round((alertedAreas.length / totalAreas.length) * 100) / 100
        : 0,
    lowDonorAvailability: eligible.length < 3,
    ineligibleReasons: summariseIneligibleReasons(ineligible),
  };

  return { eligible, ineligible, alertCandidates, coverageReport };
}

function summariseIneligibleReasons(ineligible) {
  const counts = {};
  for (const { reason } of ineligible) {
    counts[reason] = (counts[reason] || 0) + 1;
  }
  return counts;
}

/**
 * rankDonorsForAIService
 * ──────────────────────
 * Lightweight version for the /rank-donors Flask endpoint (called from
 * aiRoutes.js with plain donor objects, not Mongoose documents).
 * Returns the same shape as the original rank_donors_ml() so existing
 * callers are unaffected.
 */
function rankDonorsForAIService(donors, urgencyLevel, bloodGroup) {
  if (!donors || donors.length === 0) return [];

  const urgMult = URGENCY_MULTIPLIER[urgencyLevel] || 1.0;

  return donors
    .map(donor => {
      const responseRate  = (donor.responseRate || 80) / 100;
      const totalDons     = Math.min(donor.totalDonations || 0, 20) / 20;
      let donationReady   = 1.0;
      if (donor.lastDonationDate) {
        try {
          const dt   = new Date(donor.lastDonationDate);
          const days = (Date.now() - dt) / (1000 * 60 * 60 * 24);
          donationReady = Math.min(days / 90, 1.0);
        } catch (_) { /* ignore */ }
      }
      const distScore  = Math.max(0, 1 - (donor.distanceKm || 10) / 20);
      const burdenInv  = 1.0 - computeBurdenScore(donor);

      const aiScore = urgMult * (
        WEIGHTS.responseProbability.historicalResponseRate * responseRate +
        WEIGHTS.responseProbability.donationHistory        * totalDons +
        WEIGHTS.responseProbability.availabilityReadiness  * donationReady +
        WEIGHTS.arrivalProbability.distanceScore           * distScore * 0.5 +
        WEIGHTS.responseProbability.recentAlertBurden      * burdenInv * 0.5
      );

      return { ...donor, aiScore: Math.round(aiScore * 10000) / 10000 };
    })
    .sort((a, b) => b.aiScore - a.aiScore);
}

/**
 * updateDonorAlertBurden
 * ──────────────────────
 * Updates the alertHistory fields on a Donor Mongoose document after an alert
 * has been sent. Call this after each alert is dispatched.
 *
 * @param {Object} donor  - Mongoose Donor document (will be mutated + saved)
 */
async function updateDonorAlertBurden(donor) {
  if (!donor.alertHistory) {
    donor.alertHistory = {
      totalAlertsReceived: 0,
      alertsLast7Days:     0,
      alertsLast30Days:    0,
      lastAlertSentAt:     null,
      unansweredAlertsLast30Days: 0,
    };
  }
  donor.alertHistory.totalAlertsReceived  += 1;
  donor.alertHistory.alertsLast7Days      += 1;
  donor.alertHistory.alertsLast30Days     += 1;
  donor.alertHistory.lastAlertSentAt       = new Date();
  // Mark as unanswered initially; will be corrected in respondToRequest
  donor.alertHistory.unansweredAlertsLast30Days += 1;
  await donor.save();
}

/**
 * recordDonorResponse
 * ───────────────────
 * Called when a donor responds positively to a request.
 * Updates response statistics used by the ranking algorithm.
 *
 * @param {Object} donor          - Mongoose Donor document
 * @param {Date}   alertSentAt    - When the alert was originally sent
 */
async function recordDonorResponse(donor, alertSentAt) {
  donor.totalAlertsResponded = (donor.totalAlertsResponded || 0) + 1;

  // Reduce unanswered count since this donor responded
  if (donor.alertHistory?.unansweredAlertsLast30Days > 0) {
    donor.alertHistory.unansweredAlertsLast30Days -= 1;
  }

  // Compute response time if alertSentAt is provided
  if (alertSentAt) {
    const responseMinutes = (Date.now() - new Date(alertSentAt)) / 60000;
    const prev            = donor.avgResponseTimeMinutes;
    const n               = donor.totalAlertsResponded;
    donor.avgResponseTimeMinutes =
      prev == null ? responseMinutes : prev + (responseMinutes - prev) / n;
  }

  // Recompute response rate for backward compatibility
  const total = donor.alertHistory?.totalAlertsReceived || 1;
  donor.responseRate = Math.round((donor.totalAlertsResponded / total) * 100);

  await donor.save();
}

/**
 * computeMobilizationMetrics
 * ──────────────────────────
 * Computes the evaluation metrics described in Req A.
 * Call this at request fulfillment time.
 *
 * @param {Object} request - Mongoose BloodRequest document
 * @returns {Object} metrics object
 */
function computeMobilizationMetrics(request) {
  const alertsSent     = request.mobilization?.alertsSent || 0;
  const respondedCount = request.respondedDonors?.length  || 0;
  const fulfilled      = request.status === 'fulfilled';

  const minutesToFirst = request.mobilization?.minutesToFirstConfirmed || null;

  return {
    requestId:                    request._id,
    status:                       request.status,
    alertsSentPerRequest:         alertsSent,
    respondedDonors:              respondedCount,
    // Donor confirmed participation (respondedDonors.status === 'accepted')
    confirmedDonors:              request.respondedDonors?.filter(d => d.status === 'accepted').length || 0,
    // Donor actually donated (respondedDonors.status === 'donated')
    actualDonors:                 request.respondedDonors?.filter(d => d.status === 'donated').length  || 0,
    mobilizationRate:             alertsSent > 0 ? Math.round((respondedCount / alertsSent) * 100) : null,
    minutesToFirstConfirmed:      minutesToFirst,
    fulfilled,
    areasAlerted:                 request.mobilization?.alertedAreas || [],
    lowDonorAvailability:         request.mobilization?.lowDonorAvailability || false,
  };
}

module.exports = {
  rankAndSelectDonors,
  rankDonorsForAIService,
  updateDonorAlertBurden,
  recordDonorResponse,
  computeMobilizationMetrics,
  checkHardEligibility,
  estimateResponseProbability,
  estimateArrivalProbability,
  computeMobilizationScore,
  applyFairness,
  haversineKm,
  getEffectiveCoords,
  WEIGHTS,
  COMPATIBILITY_MAP,
  MAX_DISTANCE_KM,
  CITY_COORDS,
};
