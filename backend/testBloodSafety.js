const axios = require('axios');

const API_URL = 'http://localhost:5000/api';
const HOSPITAL_EMAIL = 'hospital@test.com';
const HOSPITAL_PASSWORD = 'hospital123';

let hospitalToken = null;
let testBloodUnitId = null;
let testBloodUnitUnitId = null; // The unitId string

async function login() {
  console.log('🔐 Logging in as hospital...');
  try {
    const res = await axios.post(`${API_URL}/auth/login`, {
      email: HOSPITAL_EMAIL,
      password: HOSPITAL_PASSWORD
    });
    hospitalToken = res.data.token;
    console.log('✅ Hospital logged in successfully');
    console.log('   Token:', hospitalToken.substring(0, 30) + '...\n');
    return true;
  } catch (err) {
    console.error('❌ Login failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function createBloodUnit() {
  console.log('🩸 Creating blood unit...');
  try {
    const res = await axios.post(`${API_URL}/blood-units/create`, {
      bloodGroup: 'A+',
      componentType: 'whole_blood',
      donorId: '6ab160c5a81ec068060599e0', // Test donor ID
      collectionDate: new Date().toISOString()
    }, {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    });
    
    testBloodUnitId = res.data.bloodUnit._id;
    testBloodUnitUnitId = res.data.bloodUnit.unitId; // Store the unitId string
    console.log('✅ Blood unit created successfully');
    console.log('   Unit ID:', res.data.bloodUnit.unitId);
    console.log('   Blood Group:', res.data.bloodUnit.bloodGroup);
    console.log('   Component:', res.data.bloodUnit.componentType);
    console.log('   Status:', res.data.bloodUnit.status);
    console.log('   Expiry Date:', new Date(res.data.bloodUnit.expiryDate).toLocaleDateString());
    console.log('   MongoDB ID:', testBloodUnitId, '\n');
    return true;
  } catch (err) {
    console.error('❌ Create blood unit failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function updateSafetyTests() {
  console.log('🧪 Updating safety test results...');
  try {
    const res = await axios.put(`${API_URL}/blood-units/${testBloodUnitId}/safety-tests`, {
      hiv: 'negative',
      hepatitisB: 'negative',
      hepatitisC: 'negative',
      syphilis: 'negative',
      malaria: 'negative',
      labId: 'LAB-001',
      testedBy: 'Test Lab Technician'
    }, {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    });
    
    console.log('✅ Safety tests updated successfully');
    console.log('   Status:', res.data.bloodUnit.status);
    console.log('   Verified Safe:', res.data.bloodUnit.verifiedSafe);
    console.log('   All Tests Negative:', Object.keys(res.data.bloodUnit.safetyTests).every(t => 
      res.data.bloodUnit.safetyTests[t].result === 'negative'
    ));
    
    if (res.data.verification) {
      console.log('   🔍 Auto-Verification Triggered:');
      console.log('      Type:', res.data.verification.verificationType || 'auto');
      console.log('      Outcome:', res.data.verification.outcome);
      console.log('      Checks Passed:', res.data.verification.passed);
    }
    console.log();
    return true;
  } catch (err) {
    console.error('❌ Update safety tests failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function manualVerification() {
  console.log('🔍 Running manual verification...');
  try {
    const res = await axios.post(`${API_URL}/blood-units/${testBloodUnitId}/verify`, {}, {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    });
    
    console.log('✅ Manual verification completed');
    console.log('   Type:', res.data.verification?.verificationType || 'manual');
    console.log('   Outcome:', res.data.verification?.outcome || 'unknown');
    console.log('   Checks Passed:', res.data.verification?.passed || false);
    console.log('   Blood Unit Status:', res.data.bloodUnit?.status || 'unknown');
    console.log('   Verified Safe:', res.data.bloodUnit?.verifiedSafe || false, '\n');
    return true;
  } catch (err) {
    console.error('❌ Manual verification failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function checkCompatibility() {
  console.log('🔬 Checking blood compatibility...');
  try {
    const res = await axios.post(`${API_URL}/blood-units/check-compatibility`, {
      unitId: testBloodUnitUnitId, // Use the unitId string, not MongoDB _id
      recipientBloodGroup: 'A+',
      recipientDetails: {
        name: 'Test Patient',
        age: 35,
        weight: 70
      }
    }, {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    });
    
    console.log('✅ Compatibility check completed');
    console.log('   Compatible:', res.data.compatible ? '✅ YES' : '❌ NO');
    console.log('   Blood Unit Group:', res.data.bloodUnit.bloodGroup);
    console.log('   Recipient Group:', res.data.recipient.bloodGroup);
    console.log('   Safety Passed:', res.data.safetyPassed ? '✅ YES' : '❌ NO');
    console.log('   Can Transfuse:', res.data.canTransfuse ? '✅ YES' : '❌ NO');
    console.log('   Recommendation:', res.data.recommendation);
    
    if (res.data.issues && res.data.issues.length > 0) {
      console.log('   ⚠️ Issues:', res.data.issues.join(', '));
    }
    console.log();
    return true;
  } catch (err) {
    console.error('❌ Compatibility check failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function getAvailableUnits() {
  console.log('📋 Fetching available blood units...');
  try {
    const res = await axios.get(`${API_URL}/blood-units/available`, {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    });
    
    console.log('✅ Available units fetched successfully');
    console.log('   Total Available Units:', res.data.bloodUnits?.length || 0);
    console.log('   Summary by Blood Group:', JSON.stringify(res.data.summary || {}, null, 2));
    console.log();
    return true;
  } catch (err) {
    console.error('❌ Get available units failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function getAllUnits() {
  console.log('📊 Fetching all blood units with stats...');
  try {
    const res = await axios.get(`${API_URL}/blood-units/all`, {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    });
    
    console.log('✅ All units fetched successfully');
    console.log('   Total Units:', res.data.bloodUnits?.length || 0);
    console.log('   Stats:', JSON.stringify(res.data.stats || {}, null, 2));
    console.log();
    return true;
  } catch (err) {
    console.error('❌ Get all units failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function logTemperature() {
  console.log('🌡️ Logging temperature reading...');
  try {
    const res = await axios.post(`${API_URL}/blood-units/${testBloodUnitId}/temperature`, {
      temperature: 4.5,
      recordedBy: 'Automated System'
    }, {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    });
    
    console.log('✅ Temperature logged successfully');
    console.log('   Temperature:', res.data.log?.temperature || 'N/A', '°C');
    console.log('   Compliant:', res.data.log?.compliant ? '✅ YES' : '❌ NO');
    console.log('   Total Logs:', res.data.bloodUnit?.storage?.temperatureLogs?.length || 0);
    console.log();
    return true;
  } catch (err) {
    console.error('❌ Log temperature failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function getVerificationHistory() {
  console.log('📜 Fetching verification history...');
  try {
    const res = await axios.get(`${API_URL}/blood-units/${testBloodUnitId}/verification-history`, {
      headers: { Authorization: `Bearer ${hospitalToken}` }
    });
    
    console.log('✅ Verification history fetched successfully');
    console.log('   Total Verifications:', res.data.verifications?.length || 0);
    (res.data.verifications || []).forEach((v, i) => {
      console.log(`\n   Verification ${i + 1}:`);
      console.log('      Type:', v.verificationType || 'unknown');
      console.log('      Outcome:', v.outcome || 'unknown');
      console.log('      Date:', new Date(v.createdAt).toLocaleString());
    });
    console.log();
    return true;
  } catch (err) {
    console.error('❌ Get verification history failed:', err.response?.data?.message || err.message);
    return false;
  }
}

async function runAllTests() {
  console.log('🚀 Starting Blood Safety API Test Suite\n');
  console.log('='.repeat(60), '\n');
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0
  };
  
  const tests = [
    { name: 'Login', fn: login },
    { name: 'Create Blood Unit', fn: createBloodUnit },
    { name: 'Update Safety Tests', fn: updateSafetyTests },
    { name: 'Manual Verification', fn: manualVerification },
    { name: 'Check Compatibility', fn: checkCompatibility },
    { name: 'Get Available Units', fn: getAvailableUnits },
    { name: 'Get All Units', fn: getAllUnits },
    { name: 'Log Temperature', fn: logTemperature },
    { name: 'Get Verification History', fn: getVerificationHistory }
  ];
  
  for (const test of tests) {
    results.total++;
    const success = await test.fn();
    if (success) {
      results.passed++;
    } else {
      results.failed++;
    }
    console.log('='.repeat(60), '\n');
  }
  
  console.log('📊 TEST SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total Tests: ${results.total}`);
  console.log(`✅ Passed: ${results.passed}`);
  console.log(`❌ Failed: ${results.failed}`);
  console.log(`Success Rate: ${((results.passed / results.total) * 100).toFixed(1)}%`);
  console.log('='.repeat(60));
  
  process.exit(results.failed > 0 ? 1 : 0);
}

runAllTests();
