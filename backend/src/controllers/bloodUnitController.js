const BloodUnit = require('../models/BloodUnit');
const SafetyVerification = require('../models/SafetyVerification');
const Hospital = require('../models/Hospital');
const Donor = require('../models/Donor');

// Generate unique Unit ID
const generateUnitId = () => {
  const prefix = 'BU';
  const timestamp = Date.now().toString().slice(-6);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}-${timestamp}-${random}`;
};

// Blood Group Compatibility Matrix
const COMPATIBILITY_MATRIX = {
  'A+':  ['A+', 'A-', 'O+', 'O-'],
  'A-':  ['A-', 'O-'],
  'B+':  ['B+', 'B-', 'O+', 'O-'],
  'B-':  ['B-', 'O-'],
  'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'], // Universal recipient
  'AB-': ['A-', 'B-', 'AB-', 'O-'],
  'O+':  ['O+', 'O-'],
  'O-':  ['O-']
};

// CORE FUNCTION: Automated Safety Verification
const performSafetyVerification = async (bloodUnit) => {
  const checks = [];
  const failures = [];
  let overallPass = true;

  // Check 1: Infectious Disease Tests (ALL must be negative)
  const testResults = {
    hiv: bloodUnit.safetyTests.hiv.result,
    hepatitisB: bloodUnit.safetyTests.hepatitisB.result,
    hepatitisC: bloodUnit.safetyTests.hepatitisC.result,
    syphilis: bloodUnit.safetyTests.syphilis.result,
    malaria: bloodUnit.safetyTests.malaria.result
  };

  let allTestsNegative = true;
  Object.entries(testResults).forEach(([test, result]) => {
    const passed = result === 'negative';
    checks.push({
      checkName: `${test.toUpperCase()} Test`,
      result: result,
      passed: passed
    });
    
    if (!passed) {
      allTestsNegative = false;
      if (result === 'positive') {
        failures.push(`${test.toUpperCase()} test is POSITIVE - Unit REJECTED`);
        overallPass = false;
      } else if (result === 'pending') {
        failures.push(`${test.toUpperCase()} test still PENDING`);
        overallPass = false;
      }
    }
  });

  bloodUnit.safetyTests.allTestsPassed = allTestsNegative;

  // Check 2: Expiry Status
  const daysUntilExpiry = bloodUnit.getDaysUntilExpiry();
  const isExpired = bloodUnit.isExpired();
  
  checks.push({
    checkName: 'Expiry Check',
    result: isExpired ? 'EXPIRED' : `${daysUntilExpiry} days remaining`,
    passed: !isExpired
  });

  if (isExpired) {
    failures.push('Blood unit has EXPIRED');
    overallPass = false;
    bloodUnit.status = 'expired';
  } else if (daysUntilExpiry <= 2 && daysUntilExpiry > 0) {
    failures.push(`WARNING: Expires in ${daysUntilExpiry} days - use urgently`);
  }

  // Check 3: Storage Temperature
  const tempCompliant = bloodUnit.isTemperatureCompliant();
  const currentTemp = bloodUnit.storage.currentTemperature;
  
  checks.push({
    checkName: 'Storage Temperature',
    result: tempCompliant ? `${currentTemp}°C - Compliant` : `${currentTemp}°C - OUT OF RANGE`,
    passed: tempCompliant
  });

  if (!tempCompliant && currentTemp !== undefined) {
    failures.push(`Storage temperature ${currentTemp}°C is out of acceptable range`);
    overallPass = false;
  }

  // Check 4: Bag Integrity
  const bagIntegrity = bloodUnit.storage.bagIntegrity;
  checks.push({
    checkName: 'Bag Integrity',
    result: bagIntegrity ? 'Intact' : 'Compromised',
    passed: bagIntegrity
  });

  if (!bagIntegrity) {
    failures.push('Blood bag integrity is compromised');
    overallPass = false;
  }

  // Determine final status
  let outcome;
  if (overallPass && allTestsNegative && !isExpired && tempCompliant && bagIntegrity) {
    bloodUnit.status = 'available';
    bloodUnit.verifiedSafe = true;
    outcome = 'approved';
  } else if (isExpired || !allTestsNegative) {
    bloodUnit.status = 'rejected';
    bloodUnit.verifiedSafe = false;
    outcome = 'rejected';
  } else {
    bloodUnit.status = 'quarantine';
    bloodUnit.verifiedSafe = false;
    outcome = 'review_required';
  }

  return {
    passed: overallPass,
    checks,
    failures,
    outcome,
    testResults,
    storageCompliance: {
      temperatureInRange: tempCompliant,
      currentTemperature: currentTemp,
      bagIntegrity
    },
    expiryStatus: {
      isExpired,
      daysUntilExpiry,
      expiryDate: bloodUnit.expiryDate
    }
  };
};

// Create new blood unit
const createBloodUnit = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const { donorId, bloodGroup, componentType, collectionDate } = req.body;
    
    const unitId = generateUnitId();
    const collDate = collectionDate ? new Date(collectionDate) : new Date();
    const expiryDate = BloodUnit.calculateExpiryDate(componentType || 'whole_blood', collDate);

    const bloodUnit = await BloodUnit.create({
      unitId,
      donorId,
      hospital: hospital._id,
      bloodGroup,
      componentType: componentType || 'whole_blood',
      collectionDate: collDate,
      expiryDate,
      status: 'quarantine',
      usageHistory: [{
        action: 'collected',
        performedBy: req.user.id,
        timestamp: new Date(),
        notes: 'Blood unit collected and registered'
      }]
    });

    res.status(201).json({ 
      message: 'Blood unit created successfully. Please complete safety tests.',
      bloodUnit 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update safety test results
const updateSafetyTests = async (req, res) => {
  try {
    const { id } = req.params;
    const { hiv, hepatitisB, hepatitisC, syphilis, malaria, labId, testedBy } = req.body;

    const bloodUnit = await BloodUnit.findById(id);
    if (!bloodUnit) return res.status(404).json({ message: 'Blood unit not found' });

    const testDate = new Date();

    if (hiv) bloodUnit.safetyTests.hiv = { result: hiv, testDate, labId };
    if (hepatitisB) bloodUnit.safetyTests.hepatitisB = { result: hepatitisB, testDate, labId };
    if (hepatitisC) bloodUnit.safetyTests.hepatitisC = { result: hepatitisC, testDate, labId };
    if (syphilis) bloodUnit.safetyTests.syphilis = { result: syphilis, testDate, labId };
    if (malaria) bloodUnit.safetyTests.malaria = { result: malaria, testDate, labId };

    if (testedBy) bloodUnit.safetyTests.testedBy = testedBy;

    // Check if all tests are complete
    const allComplete = 
      bloodUnit.safetyTests.hiv.result !== 'pending' &&
      bloodUnit.safetyTests.hepatitisB.result !== 'pending' &&
      bloodUnit.safetyTests.hepatitisC.result !== 'pending' &&
      bloodUnit.safetyTests.syphilis.result !== 'pending' &&
      bloodUnit.safetyTests.malaria.result !== 'pending';

    if (allComplete) {
      bloodUnit.safetyTests.completedAt = new Date();
    }

    bloodUnit.usageHistory.push({
      action: 'tested',
      performedBy: req.user.id,
      timestamp: new Date(),
      notes: 'Safety test results updated'
    });

    await bloodUnit.save();

    // Automatically verify if all tests complete
    if (allComplete) {
      const verificationResult = await performSafetyVerification(bloodUnit);
      
      bloodUnit.verifiedSafe = verificationResult.passed;
      bloodUnit.verificationDetails = {
        verifiedBy: req.user.id,
        verificationDate: new Date(),
        autoVerified: true
      };
      await bloodUnit.save();

      // Create audit record
      await SafetyVerification.create({
        bloodUnit: bloodUnit._id,
        verificationType: 'safety_tests',
        checksPassed: verificationResult.passed,
        checksPerformed: verificationResult.checks,
        failureReasons: verificationResult.failures,
        testResults: verificationResult.testResults,
        storageCompliance: verificationResult.storageCompliance,
        expiryStatus: verificationResult.expiryStatus,
        automatedCheck: true,
        verifiedBy: req.user.id,
        outcome: verificationResult.outcome
      });

      return res.json({
        message: 'Safety tests updated and unit auto-verified',
        bloodUnit,
        verification: verificationResult
      });
    }

    res.json({ message: 'Safety tests updated', bloodUnit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Run automated safety verification
const verifySafety = async (req, res) => {
  try {
    const { id } = req.params;
    const bloodUnit = await BloodUnit.findById(id);
    
    if (!bloodUnit) return res.status(404).json({ message: 'Blood unit not found' });

    const verificationResult = await performSafetyVerification(bloodUnit);

    bloodUnit.verifiedSafe = verificationResult.passed;
    bloodUnit.verificationDetails = {
      verifiedBy: req.user.id,
      verificationDate: new Date(),
      autoVerified: true
    };
    
    bloodUnit.usageHistory.push({
      action: 'verified',
      performedBy: req.user.id,
      timestamp: new Date(),
      notes: verificationResult.passed ? 'Safety verification PASSED' : 'Safety verification FAILED'
    });

    await bloodUnit.save();

    // Create audit record
    await SafetyVerification.create({
      bloodUnit: bloodUnit._id,
      verificationType: 'comprehensive',
      checksPassed: verificationResult.passed,
      checksPerformed: verificationResult.checks,
      failureReasons: verificationResult.failures,
      testResults: verificationResult.testResults,
      storageCompliance: verificationResult.storageCompliance,
      expiryStatus: verificationResult.expiryStatus,
      automatedCheck: true,
      verifiedBy: req.user.id,
      outcome: verificationResult.outcome
    });

    res.json({
      message: verificationResult.passed ? 'Unit is SAFE for transfusion' : 'Unit FAILED safety checks',
      verification: verificationResult,
      bloodUnit
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Check compatibility for transfusion
const checkCompatibility = async (req, res) => {
  try {
    const { unitId, recipientBloodGroup } = req.body;

    if (!unitId || !recipientBloodGroup) {
      return res.status(400).json({ message: 'Unit ID and recipient blood group required' });
    }

    const bloodUnit = await BloodUnit.findOne({ unitId }).populate('hospital');
    if (!bloodUnit) return res.status(404).json({ message: 'Blood unit not found' });

    // Check blood group compatibility
    const compatibleDonorGroups = COMPATIBILITY_MATRIX[recipientBloodGroup] || [];
    const isCompatible = compatibleDonorGroups.includes(bloodUnit.bloodGroup);

    // Run safety verification
    const safetyResult = await performSafetyVerification(bloodUnit);

    const canTransfuse = isCompatible && safetyResult.passed;

    const issues = [];
    if (!isCompatible) {
      issues.push(`Blood group incompatible: ${bloodUnit.bloodGroup} cannot be given to ${recipientBloodGroup}`);
    }
    issues.push(...safetyResult.failures);

    res.json({
      canTransfuse,
      compatible: isCompatible,
      safetyPassed: safetyResult.passed,
      bloodUnit: {
        unitId: bloodUnit.unitId,
        bloodGroup: bloodUnit.bloodGroup,
        componentType: bloodUnit.componentType,
        status: bloodUnit.status
      },
      recipient: {
        bloodGroup: recipientBloodGroup
      },
      safetyChecks: safetyResult.checks,
      issues,
      recommendation: canTransfuse 
        ? '✅ SAFE TO TRANSFUSE - All checks passed' 
        : '❌ DO NOT TRANSFUSE - See issues above'
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get available safe units for a hospital
const getAvailableUnits = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const { bloodGroup, componentType } = req.query;

    const filter = {
      hospital: hospital._id,
      status: 'available',
      verifiedSafe: true
    };

    if (bloodGroup) filter.bloodGroup = bloodGroup;
    if (componentType) filter.componentType = componentType;

    const units = await BloodUnit.find(filter)
      .populate('donorId', 'bloodGroup')
      .sort({ expiryDate: 1 }); // Closest to expiry first (FIFO)

    const unitsWithDetails = units.map(unit => ({
      ...unit.toObject(),
      daysUntilExpiry: unit.getDaysUntilExpiry(),
      isTemperatureCompliant: unit.isTemperatureCompliant()
    }));

    res.json({
      count: units.length,
      units: unitsWithDetails
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get all units for hospital (including quarantine, rejected)
const getAllUnits = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const units = await BloodUnit.find({ hospital: hospital._id })
      .populate('donorId', 'bloodGroup')
      .sort({ createdAt: -1 });

    const unitsWithDetails = units.map(unit => ({
      ...unit.toObject(),
      daysUntilExpiry: unit.getDaysUntilExpiry(),
      isTemperatureCompliant: unit.isTemperatureCompliant()
    }));

    res.json({
      total: units.length,
      available: units.filter(u => u.status === 'available').length,
      quarantine: units.filter(u => u.status === 'quarantine').length,
      rejected: units.filter(u => u.status === 'rejected').length,
      expired: units.filter(u => u.status === 'expired').length,
      units: unitsWithDetails
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Update temperature log
const logTemperature = async (req, res) => {
  try {
    const { id } = req.params;
    const { temperature, refrigeratorId } = req.body;

    const bloodUnit = await BloodUnit.findById(id);
    if (!bloodUnit) return res.status(404).json({ message: 'Blood unit not found' });

    bloodUnit.storage.currentTemperature = temperature;
    bloodUnit.storage.temperatureLogs.push({
      temperature,
      timestamp: new Date(),
      recordedBy: req.user.name || req.user.id
    });
    
    if (refrigeratorId) bloodUnit.storage.refrigeratorId = refrigeratorId;
    bloodUnit.storage.lastChecked = new Date();

    await bloodUnit.save();

    res.json({ 
      message: 'Temperature logged',
      compliant: bloodUnit.isTemperatureCompliant()
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Get safety verification history
const getVerificationHistory = async (req, res) => {
  try {
    const { id } = req.params;
    
    const history = await SafetyVerification.find({ bloodUnit: id })
      .populate('verifiedBy', 'name email')
      .sort({ verificationTimestamp: -1 });

    res.json({ count: history.length, history });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = {
  createBloodUnit,
  updateSafetyTests,
  verifySafety,
  checkCompatibility,
  getAvailableUnits,
  getAllUnits,
  logTemperature,
  getVerificationHistory
};
