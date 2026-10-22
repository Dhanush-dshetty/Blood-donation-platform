import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const COMPONENT_TYPES = {
  whole_blood: 'Whole Blood',
  rbc: 'Red Blood Cells (RBC)',
  platelets: 'Platelets',
  plasma: 'Plasma',
  packed_cells: 'Packed Cells'
};

const STATUS_COLORS = {
  available: '#27ae60',
  quarantine: '#f39c12',
  rejected: '#e74c3c',
  expired: '#95a5a6',
  reserved: '#3498db',
  used: '#7f8c8d'
};

export default function BloodSafetyPage() {
  const [units, setUnits] = useState([]);
  const [stats, setStats] = useState({});
  const [loading, setLoading] = useState(true);
  const [selectedUnit, setSelectedUnit] = useState(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showVerifyModal, setShowVerifyModal] = useState(false);
  const [showTestModal, setShowTestModal] = useState(false);
  const [showCompatModal, setShowCompatModal] = useState(false);
  const [verificationResult, setVerificationResult] = useState(null);
  const [compatResult, setCompatResult] = useState(null);

  useEffect(() => {
    fetchAllUnits();
  }, []);

  const fetchAllUnits = async () => {
    try {
      setLoading(true);
      const res = await axios.get(`${API_URL}/blood-units/all`);
      setUnits(res.data.units || []);
      setStats({
        total: res.data.total,
        available: res.data.available,
        quarantine: res.data.quarantine,
        rejected: res.data.rejected,
        expired: res.data.expired
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUnit = async (formData) => {
    try {
      await axios.post(`${API_URL}/blood-units/create`, formData);
      alert('Blood unit created successfully!');
      setShowCreateModal(false);
      fetchAllUnits();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to create unit');
    }
  };

  const handleVerify = async (unitId) => {
    try {
      const res = await axios.post(`${API_URL}/blood-units/${unitId}/verify`);
      setVerificationResult(res.data);
      setShowVerifyModal(true);
      fetchAllUnits();
    } catch (err) {
      alert(err.response?.data?.message || 'Verification failed');
    }
  };

  const handleCheckCompatibility = async (unitId, recipientBloodGroup) => {
    try {
      const unit = units.find(u => u._id === unitId);
      const res = await axios.post(`${API_URL}/blood-units/check-compatibility`, {
        unitId: unit.unitId,
        recipientBloodGroup
      });
      setCompatResult(res.data);
      setShowCompatModal(true);
    } catch (err) {
      alert(err.response?.data?.message || 'Compatibility check failed');
    }
  };

  if (loading) {
    return <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <div>Loading blood units...</div>
    </div>;
  }

  return (
    <div style={{ minHeight: '100vh', background: '#f8f9fa' }}>
      {/* Header */}
      <div style={{ background: '#c0392b', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div>
          <h2 style={{ margin: 0 }}>🩸 Blood Safety & Verification</h2>
          <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>Automated Compatibility & Safety Checks</div>
        </div>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <Link to="/hospital/dashboard" style={{ color: 'white', fontWeight: 600 }}>← Dashboard</Link>
          <button onClick={() => setShowCreateModal(true)}
            style={{ background: 'white', color: '#c0392b', border: 'none', padding: '8px 16px', borderRadius: 6, fontWeight: 600, cursor: 'pointer' }}>
            + Register Blood Unit
          </button>
        </div>
      </div>

      <div style={{ padding: '32px', maxWidth: 1400, margin: '0 auto' }}>
        {/* Statistics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(5, 1fr)', gap: 20, marginBottom: 30 }}>
          {[
            { label: 'Total Units', value: stats.total || 0, color: '#3498db' },
            { label: 'Available (Safe)', value: stats.available || 0, color: '#27ae60' },
            { label: 'In Quarantine', value: stats.quarantine || 0, color: '#f39c12' },
            { label: 'Rejected', value: stats.rejected || 0, color: '#e74c3c' },
            { label: 'Expired', value: stats.expired || 0, color: '#95a5a6' }
          ].map(stat => (
            <div key={stat.label} style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', borderTop: `4px solid ${stat.color}` }}>
              <div style={{ fontSize: '2rem', fontWeight: 700, color: stat.color }}>{stat.value}</div>
              <div style={{ color: '#666', fontSize: '0.9rem', marginTop: 4 }}>{stat.label}</div>
            </div>
          ))}
        </div>

        {/* Blood Units Table */}
        <div style={{ background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}>
          <h3 style={{ marginBottom: 20 }}>Blood Units Inventory</h3>
          
          {units.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '40px 0', color: '#aaa' }}>
              <div style={{ fontSize: '3rem', marginBottom: 12 }}>📦</div>
              <div>No blood units registered yet</div>
              <button onClick={() => setShowCreateModal(true)}
                style={{ marginTop: 16, padding: '10px 20px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
                Register First Unit
              </button>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f8f9fa', borderBottom: '2px solid #eee' }}>
                    {['Unit ID', 'Blood Group', 'Component', 'Status', 'Safety Tests', 'Expiry', 'Temp', 'Actions'].map(h => (
                      <th key={h} style={{ padding: '12px', textAlign: 'left', fontWeight: 600, fontSize: '0.85rem', color: '#666' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {units.map(unit => (
                    <tr key={unit._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                      <td style={{ padding: '12px', fontFamily: 'monospace', fontWeight: 600, color: '#2980b9' }}>
                        {unit.unitId}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ background: '#fff0f0', color: '#c0392b', padding: '4px 10px', borderRadius: 4, fontWeight: 700 }}>
                          {unit.bloodGroup}
                        </span>
                      </td>
                      <td style={{ padding: '12px', fontSize: '0.9rem' }}>
                        {COMPONENT_TYPES[unit.componentType]}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{ 
                          background: `${STATUS_COLORS[unit.status]}22`, 
                          color: STATUS_COLORS[unit.status], 
                          padding: '4px 10px', 
                          borderRadius: 12, 
                          fontSize: '0.8rem', 
                          fontWeight: 600 
                        }}>
                          {unit.status.toUpperCase()}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {unit.safetyTests.allTestsPassed ? (
                          <span style={{ color: '#27ae60', fontWeight: 600 }}>✅ Passed</span>
                        ) : (
                          <span style={{ color: '#e74c3c', fontWeight: 600 }}>
                            {unit.safetyTests.hiv.result === 'pending' ? '⏳ Pending' : '❌ Failed'}
                          </span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ fontSize: '0.85rem' }}>
                          {unit.daysUntilExpiry < 0 ? (
                            <span style={{ color: '#e74c3c', fontWeight: 600 }}>Expired</span>
                          ) : (
                            <span style={{ color: unit.daysUntilExpiry <= 2 ? '#e67e22' : '#27ae60' }}>
                              {unit.daysUntilExpiry} days
                            </span>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        {unit.storage.currentTemperature ? (
                          <span style={{ color: unit.isTemperatureCompliant ? '#27ae60' : '#e74c3c', fontSize: '0.85rem', fontWeight: 600 }}>
                            {unit.storage.currentTemperature}°C {unit.isTemperatureCompliant ? '✓' : '⚠️'}
                          </span>
                        ) : (
                          <span style={{ color: '#aaa', fontSize: '0.85rem' }}>N/A</span>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          <button onClick={() => { setSelectedUnit(unit); setShowTestModal(true); }}
                            style={{ padding: '4px 10px', background: '#3498db', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer' }}>
                            Tests
                          </button>
                          <button onClick={() => handleVerify(unit._id)}
                            style={{ padding: '4px 10px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer' }}>
                            Verify
                          </button>
                          <button onClick={() => { setSelectedUnit(unit); setShowCompatModal(true); }}
                            style={{ padding: '4px 10px', background: '#9b59b6', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', cursor: 'pointer' }}>
                            Check
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Modals */}
      {showCreateModal && <CreateUnitModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateUnit} />}
      {showTestModal && selectedUnit && <TestResultsModal unit={selectedUnit} onClose={() => { setShowTestModal(false); setSelectedUnit(null); }} onUpdate={fetchAllUnits} />}
      {showVerifyModal && verificationResult && <VerificationModal result={verificationResult} onClose={() => { setShowVerifyModal(false); setVerificationResult(null); }} />}
      {showCompatModal && !compatResult && selectedUnit && <CompatibilityCheckModal unit={selectedUnit} onClose={() => { setShowCompatModal(false); setSelectedUnit(null); }} onCheck={handleCheckCompatibility} />}
      {showCompatModal && compatResult && <CompatibilityResultModal result={compatResult} onClose={() => { setShowCompatModal(false); setCompatResult(null); setSelectedUnit(null); }} />}
    </div>
  );
}

// Create Unit Modal
function CreateUnitModal({ onClose, onCreate }) {
  const [form, setForm] = useState({
    bloodGroup: '',
    componentType: 'whole_blood',
    collectionDate: new Date().toISOString().split('T')[0]
  });

  const handleSubmit = (e) => {
    e.preventDefault();
    onCreate(form);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginBottom: 20 }}>Register New Blood Unit</h2>
        <form onSubmit={handleSubmit}>
          <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Blood Group *</label>
          <select required value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 16 }}>
            <option value="">Select Blood Group</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>

          <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Component Type *</label>
          <select required value={form.componentType} onChange={e => setForm({...form, componentType: e.target.value})}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 16 }}>
            {Object.entries(COMPONENT_TYPES).map(([key, label]) => (
              <option key={key} value={key}>{label}</option>
            ))}
          </select>

          <label style={{ display: 'block', marginBottom: 5, fontWeight: 600 }}>Collection Date *</label>
          <input type="date" required value={form.collectionDate} onChange={e => setForm({...form, collectionDate: e.target.value})}
            style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 20 }} />

          <div style={{ display: 'flex', gap: 10 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit"
              style={{ flex: 2, padding: '12px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Create Unit
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Test Results Modal
function TestResultsModal({ unit, onClose, onUpdate }) {
  const [tests, setTests] = useState({
    hiv: unit.safetyTests.hiv.result,
    hepatitisB: unit.safetyTests.hepatitisB.result,
    hepatitisC: unit.safetyTests.hepatitisC.result,
    syphilis: unit.safetyTests.syphilis.result,
    malaria: unit.safetyTests.malaria.result,
    labId: 'LAB-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    testedBy: 'Lab Technician'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/blood-units/${unit._id}/safety-tests`, tests);
      alert('Test results updated successfully!');
      onUpdate();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tests');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 600, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <h2 style={{ marginBottom: 10 }}>Safety Test Results</h2>
        <div style={{ fontSize: '0.9rem', color: '#666', marginBottom: 20 }}>Unit ID: <strong>{unit.unitId}</strong></div>
        
        <form onSubmit={handleSubmit}>
          <div style={{ background: '#fff9e6', padding: 16, borderRadius: 8, marginBottom: 20, fontSize: '0.85rem', color: '#856404' }}>
            ⚠️ All tests must be NEGATIVE for the unit to be marked as safe
          </div>

          {['hiv', 'hepatitisB', 'hepatitisC', 'syphilis', 'malaria'].map(test => (
            <div key={test} style={{ marginBottom: 16 }}>
              <label style={{ display: 'block', marginBottom: 5, fontWeight: 600, textTransform: 'capitalize' }}>
                {test === 'hiv' ? 'HIV' : test.replace(/([A-Z])/g, ' $1')} *
              </label>
              <select required value={tests[test]} onChange={e => setTests({...tests, [test]: e.target.value})}
                style={{ width: '100%', padding: '10px', borderRadius: 8, border: '1px solid #ddd' }}>
                <option value="pending">Pending</option>
                <option value="negative">Negative (Safe)</option>
                <option value="positive">Positive (Reject)</option>
              </select>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
            <button type="button" onClick={onClose}
              style={{ flex: 1, padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
              Cancel
            </button>
            <button type="submit"
              style={{ flex: 2, padding: '12px', background: '#27ae60', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
              Update & Auto-Verify
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Verification Result Modal
function VerificationModal({ result, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 700, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '4rem', marginBottom: 10 }}>
            {result.verification.passed ? '✅' : '❌'}
          </div>
          <h2 style={{ color: result.verification.passed ? '#27ae60' : '#e74c3c', marginBottom: 8 }}>
            {result.message}
          </h2>
          <div style={{ 
            background: result.verification.passed ? '#e8f8e8' : '#fdecea', 
            color: result.verification.passed ? '#27ae60' : '#c0392b',
            padding: '8px 16px',
            borderRadius: 8,
            fontWeight: 600,
            display: 'inline-block'
          }}>
            {result.verification.outcome.toUpperCase()}
          </div>
        </div>

        <h3 style={{ marginBottom: 12 }}>Safety Checks Performed:</h3>
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          {result.verification.checks.map((check, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < result.verification.checks.length - 1 ? '1px solid #eee' : 'none' }}>
              <span style={{ fontWeight: 600 }}>{check.checkName}</span>
              <span style={{ color: check.passed ? '#27ae60' : '#e74c3c' }}>
                {check.passed ? '✓' : '✗'} {check.result}
              </span>
            </div>
          ))}
        </div>

        {result.verification.failures.length > 0 && (
          <>
            <h3 style={{ marginBottom: 12, color: '#e74c3c' }}>Issues Found:</h3>
            <div style={{ background: '#fdecea', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.verification.failures.map((failure, i) => (
                  <li key={i} style={{ color: '#c0392b', marginBottom: 8 }}>{failure}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        <button onClick={onClose}
          style={{ width: '100%', padding: '12px', background: '#3498db', color: 'white', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  );
}

// Compatibility Check Modal (Input)
function CompatibilityCheckModal({ unit, onClose, onCheck }) {
  const [recipientBloodGroup, setRecipientBloodGroup] = useState('');

  const handleCheck = () => {
    if (!recipientBloodGroup) {
      alert('Please select recipient blood group');
      return;
    }
    onCheck(unit._id, recipientBloodGroup);
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 500, boxShadow: '0 8px 40px rgba(0,0,0,0.2)' }}>
        <h2 style={{ marginBottom: 20 }}>Transfusion Compatibility Check</h2>
        
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          <div style={{ marginBottom: 8 }}>
            <strong>Unit ID:</strong> {unit.unitId}
          </div>
          <div style={{ marginBottom: 8 }}>
            <strong>Donor Blood Group:</strong> <span style={{ color: '#c0392b', fontWeight: 700 }}>{unit.bloodGroup}</span>
          </div>
          <div>
            <strong>Component:</strong> {COMPONENT_TYPES[unit.componentType]}
          </div>
        </div>

        <label style={{ display: 'block', marginBottom: 8, fontWeight: 600 }}>Recipient Blood Group *</label>
        <select value={recipientBloodGroup} onChange={e => setRecipientBloodGroup(e.target.value)}
          style={{ width: '100%', padding: '12px', borderRadius: 8, border: '1px solid #ddd', marginBottom: 24, fontSize: '1rem' }}>
          <option value="">Select Recipient Blood Group</option>
          {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => (
            <option key={bg} value={bg}>{bg}</option>
          ))}
        </select>

        <div style={{ display: 'flex', gap: 10 }}>
          <button onClick={onClose}
            style={{ flex: 1, padding: '12px', background: '#f0f0f0', border: 'none', borderRadius: 8, fontWeight: 600, cursor: 'pointer' }}>
            Cancel
          </button>
          <button onClick={handleCheck}
            style={{ flex: 2, padding: '12px', background: '#9b59b6', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
            Check Compatibility
          </button>
        </div>
      </div>
    </div>
  );
}

// Compatibility Result Modal
function CompatibilityResultModal({ result, onClose }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 32, width: '100%', maxWidth: 700, boxShadow: '0 8px 40px rgba(0,0,0,0.2)', maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '4rem', marginBottom: 10 }}>
            {result.canTransfuse ? '✅' : '⛔'}
          </div>
          <h2 style={{ color: result.canTransfuse ? '#27ae60' : '#e74c3c', marginBottom: 8 }}>
            {result.recommendation}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 24 }}>
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 4 }}>Donor Blood Group</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#c0392b' }}>{result.bloodUnit.bloodGroup}</div>
          </div>
          <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16 }}>
            <div style={{ fontSize: '0.85rem', color: '#888', marginBottom: 4 }}>Recipient Blood Group</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#2980b9' }}>{result.recipient.bloodGroup}</div>
          </div>
        </div>

        <div style={{ marginBottom: 20 }}>
          <h3 style={{ marginBottom: 12 }}>Compatibility Status:</h3>
          <div style={{ display: 'flex', gap: 16 }}>
            <div style={{ flex: 1, background: result.compatible ? '#e8f8e8' : '#fdecea', padding: 16, borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Blood Group</div>
              <div style={{ color: result.compatible ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                {result.compatible ? '✓ Compatible' : '✗ Incompatible'}
              </div>
            </div>
            <div style={{ flex: 1, background: result.safetyPassed ? '#e8f8e8' : '#fdecea', padding: 16, borderRadius: 8 }}>
              <div style={{ fontWeight: 600, marginBottom: 4 }}>Safety Tests</div>
              <div style={{ color: result.safetyPassed ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                {result.safetyPassed ? '✓ All Passed' : '✗ Failed'}
              </div>
            </div>
          </div>
        </div>

        <h3 style={{ marginBottom: 12 }}>Detailed Checks:</h3>
        <div style={{ background: '#f8f9fa', borderRadius: 8, padding: 16, marginBottom: 20 }}>
          {result.safetyChecks.map((check, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < result.safetyChecks.length - 1 ? '1px solid #eee' : 'none' }}>
              <span>{check.checkName}</span>
              <span style={{ color: check.passed ? '#27ae60' : '#e74c3c', fontWeight: 600 }}>
                {check.passed ? '✓' : '✗'} {check.result}
              </span>
            </div>
          ))}
        </div>

        {result.issues.length > 0 && (
          <>
            <h3 style={{ marginBottom: 12, color: '#e74c3c' }}>⚠️ Issues:</h3>
            <div style={{ background: '#fdecea', borderRadius: 8, padding: 16, marginBottom: 20 }}>
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                {result.issues.map((issue, i) => (
                  <li key={i} style={{ color: '#c0392b', marginBottom: 8 }}>{issue}</li>
                ))}
              </ul>
            </div>
          </>
        )}

        <button onClick={onClose}
          style={{ width: '100%', padding: '12px', background: result.canTransfuse ? '#27ae60' : '#e74c3c', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' }}>
          Close
        </button>
      </div>
    </div>
  );
}
