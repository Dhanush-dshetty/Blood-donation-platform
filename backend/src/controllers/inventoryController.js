const BloodInventory = require('../models/BloodInventory');
const Hospital = require('../models/Hospital');
const axios = require('axios');

// Add blood unit to inventory
const addBloodUnit = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const {
      bloodGroup, units, donorId, collectionDate,
      hivTest, hepatitisBTest, hepatitisCTest, syphilisTest,
      hemoglobinLevel, bloodPressureSystolic, bloodPressureDiastolic,
      storageTemperature
    } = req.body;

    const collection = new Date(collectionDate);
    const expiry = new Date(collection);
    expiry.setDate(expiry.getDate() + 42); // Red blood cells last 42 days

    const safetyData = {
      hivTest, hepatitisBTest, hepatitisCTest, syphilisTest,
      hemoglobinLevel, bloodPressureSystolic, bloodPressureDiastolic
    };

    // Rule-based safety check
    const ruleCheck = performRuleBasedSafetyCheck(safetyData, expiry);

    // AI safety check
    let aiSafetyFlag = { isFlagged: false };
    try {
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/verify-safety`,
        { ...safetyData, bloodGroup, storageTemperature }
      );
      aiSafetyFlag = aiResponse.data;
    } catch (aiErr) {
      console.warn('AI service unavailable, using rule-based check only');
    }

    const isSafe = ruleCheck.isSafe && !aiSafetyFlag.isFlagged;

    const inventory = await BloodInventory.create({
      hospital: hospital._id,
      bloodGroup, units, donorId,
      collectionDate: collection,
      expiryDate: expiry,
      storageTemperature,
      safetyVerification: {
        ...safetyData,
        verifiedAt: new Date(),
        verifiedBy: req.user.id
      },
      aiSafetyFlag,
      status: isSafe ? 'safe' : 'flagged'
    });

    res.status(201).json({
      inventory,
      safetyResult: {
        isSafe,
        ruleCheckDetails: ruleCheck.issues,
        aiFlag: aiSafetyFlag
      }
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Rule-based safety verification engine
const performRuleBasedSafetyCheck = (data, expiryDate) => {
  const issues = [];

  if (data.hivTest === 'positive') issues.push('HIV test positive');
  if (data.hepatitisBTest === 'positive') issues.push('Hepatitis B test positive');
  if (data.hepatitisCTest === 'positive') issues.push('Hepatitis C test positive');
  if (data.syphilisTest === 'positive') issues.push('Syphilis test positive');

  if (data.hemoglobinLevel && data.hemoglobinLevel < 12.5) {
    issues.push(`Low hemoglobin: ${data.hemoglobinLevel} g/dL (min: 12.5)`);
  }
  if (data.bloodPressureSystolic && (data.bloodPressureSystolic > 180 || data.bloodPressureSystolic < 90)) {
    issues.push(`Abnormal systolic BP: ${data.bloodPressureSystolic} mmHg`);
  }
  if (new Date() > expiryDate) {
    issues.push('Blood unit has expired');
  }

  return { isSafe: issues.length === 0, issues };
};

// Get hospital inventory
const getInventory = async (req, res) => {
  try {
    const hospital = await Hospital.findOne({ user: req.user.id });
    if (!hospital) return res.status(404).json({ message: 'Hospital not found' });

    const inventory = await BloodInventory.find({ hospital: hospital._id })
      .sort({ createdAt: -1 });

    // Auto-mark expired units
    const now = new Date();
    for (const unit of inventory) {
      if (unit.status === 'safe' && unit.expiryDate < now) {
        unit.status = 'expired';
        await unit.save();
      }
    }

    // Summary stats
    const summary = {};
    const bloodGroups = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
    for (const bg of bloodGroups) {
      const safeUnits = inventory.filter(u => u.bloodGroup === bg && u.status === 'safe');
      summary[bg] = safeUnits.reduce((sum, u) => sum + u.units, 0);
    }

    res.json({ inventory, summary });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

// Verify a specific blood unit before transfusion
const verifyBeforeTransfusion = async (req, res) => {
  try {
    const { unitId, patientBloodGroup } = req.body;

    const unit = await BloodInventory.findById(unitId);
    if (!unit) return res.status(404).json({ message: 'Blood unit not found' });

    const issues = [];

    // 1. Expiry check
    if (new Date() > unit.expiryDate) issues.push('CRITICAL: Blood unit has expired');

    // 2. Safety status check
    if (unit.status === 'flagged') issues.push('CRITICAL: Unit has failed safety verification');
    if (unit.status === 'used') issues.push('Unit has already been used');

    // 3. Blood group compatibility
    const compatibilityMap = {
      'A+': ['A+', 'A-', 'O+', 'O-'], 'A-': ['A-', 'O-'],
      'B+': ['B+', 'B-', 'O+', 'O-'], 'B-': ['B-', 'O-'],
      'AB+': ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'],
      'AB-': ['A-', 'B-', 'AB-', 'O-'], 'O+': ['O+', 'O-'], 'O-': ['O-']
    };
    const compatible = compatibilityMap[patientBloodGroup] || [];
    if (!compatible.includes(unit.bloodGroup)) {
      issues.push(`CRITICAL: Blood group mismatch — Unit is ${unit.bloodGroup}, Patient is ${patientBloodGroup}`);
    }

    // 4. AI double-check
    let aiVerification = { approved: true };
    try {
      const aiResponse = await axios.post(
        `${process.env.AI_SERVICE_URL || 'http://localhost:8000'}/verify-transfusion`,
        {
          unitBloodGroup: unit.bloodGroup,
          patientBloodGroup,
          expiryDate: unit.expiryDate,
          safetyVerification: unit.safetyVerification
        }
      );
      aiVerification = aiResponse.data;
    } catch (aiErr) {
      console.warn('AI service unavailable');
    }

    const approved = issues.length === 0 && aiVerification.approved;

    if (approved) {
      unit.status = 'used';
      await unit.save();
    }

    res.json({ approved, issues, aiVerification, unit });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
};

module.exports = { addBloodUnit, getInventory, verifyBeforeTransfusion };
