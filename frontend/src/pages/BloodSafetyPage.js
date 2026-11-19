import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const COMPONENT_TYPES = {
  whole_blood: 'Whole Blood',
  rbc: 'Red Blood Cells (RBC)',
  platelets: 'Platelets',
  plasma: 'Plasma',
  packed_cells: 'Packed Cells'
};

const STATUS_CONFIG = {
  available:  { label: 'Available (Safe)', color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  quarantine: { label: 'Quarantine',       color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  rejected:   { label: 'Rejected',         color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  expired:    { label: 'Expired',          color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  reserved:   { label: 'Reserved',         color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  used:       { label: 'Used',             color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' }
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

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container">
        {/* Title */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 28, flexWrap: 'wrap', gap: 16 }}>
          <div>
            <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
              Laboratory Blood Safety & Quality Assurance
            </h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
              Automated serological test verification, component compatibility checking & cold-chain compliance
            </p>
          </div>

          <button
            onClick={() => setShowCreateModal(true)}
            className="btn btn-primary"
            style={{ padding: '12px 20px', fontSize: '0.95rem' }}
          >
            <span>+ Register Blood Unit</span>
          </button>
        </div>

        {/* Statistics Cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 16, marginBottom: 28 }}>
          {[
            { label: 'Total Tracked Units', value: stats.total || 0, color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
            { label: 'Available (Safe)', value: stats.available || 0, color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
            { label: 'In Quarantine', value: stats.quarantine || 0, color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
            { label: 'Rejected / Flagged', value: stats.rejected || 0, color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
            { label: 'Expired Units', value: stats.expired || 0, color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' }
          ].map(stat => (
            <div key={stat.label} className="modern-card" style={{ padding: '18px 20px' }}>
              <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#64748b' }}>{stat.label}</div>
              <div style={{ fontSize: '1.9rem', fontWeight: 800, color: stat.color, marginTop: 4, lineHeight: 1.1 }}>
                {stat.value}
              </div>
            </div>
          ))}
        </div>

        {/* Blood Units Table */}
        <div className="modern-card" style={{ padding: '24px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18 }}>
            <div>
              <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a' }}>
                Blood Units Inventory
              </h2>
              <p style={{ color: '#64748b', fontSize: '0.825rem', marginTop: 2 }}>
                Individual blood bags, test statuses, days to expiration and cold-chain compliance
              </p>
            </div>
          </div>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '48px 0', color: '#64748b' }}>
              <div style={{ width: 40, height: 40, border: '4px solid #fecaca', borderTopColor: '#dc2626', borderRadius: '50%', margin: '0 auto 12px', animation: 'spin 0.8s linear infinite' }} />
              <div>Loading laboratory records...</div>
            </div>
          ) : units.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#64748b' }}>
              <div style={{ fontSize: '3rem', marginBottom: 10 }}>📦</div>
              <div style={{ fontWeight: 700, color: '#0f172a' }}>No blood units registered yet</div>
              <p style={{ fontSize: '0.875rem', marginTop: 4 }}>
                Click "+ Register Blood Unit" above to add laboratory records.
              </p>
            </div>
          ) : (
            <div className="table-responsive">
              <table className="table-modern">
                <thead>
                  <tr>
                    <th>Unit Barcode ID</th>
                    <th>Blood Group</th>
                    <th>Component Type</th>
                    <th>Safety Status</th>
                    <th>Infectious Screenings</th>
                    <th>Days to Expiry</th>
                    <th>Storage Temp</th>
                    <th>Lab Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {units.map(unit => {
                    const scfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.quarantine;
                    const isAllPassed = unit.safetyTests?.allTestsPassed;

                    return (
                      <tr key={unit._id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#2563eb', fontWeight: 700 }}>
                          {unit.unitId}
                        </td>
                        <td>
                          <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.05rem' }}>
                            {unit.bloodGroup}
                          </span>
                        </td>
                        <td style={{ color: '#334155', fontSize: '0.875rem' }}>
                          {COMPONENT_TYPES[unit.componentType] || unit.componentType}
                        </td>
                        <td>
                          <span style={{
                            display: 'inline-flex',
                            padding: '3px 10px',
                            borderRadius: 9999,
                            fontSize: '0.75rem',
                            fontWeight: 700,
                            color: scfg.color,
                            backgroundColor: scfg.bg,
                            border: `1px solid ${scfg.border}`
                          }}>
                            {scfg.label}
                          </span>
                        </td>
                        <td>
                          {isAllPassed ? (
                            <span style={{ color: '#059669', fontWeight: 700, fontSize: '0.85rem' }}>✓ All Screenings Passed</span>
                          ) : (
                            <span style={{ color: '#dc2626', fontWeight: 600, fontSize: '0.85rem' }}>
                              {unit.safetyTests?.hiv?.result === 'pending' ? '⏳ Pending Lab Tests' : '❌ Failed Screenings'}
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.875rem' }}>
                          {unit.daysUntilExpiry < 0 ? (
                            <span style={{ color: '#dc2626', fontWeight: 700 }}>Expired</span>
                          ) : (
                            <span style={{ color: unit.daysUntilExpiry <= 3 ? '#ea580c' : '#059669', fontWeight: 600 }}>
                              {unit.daysUntilExpiry} days remaining
                            </span>
                          )}
                        </td>
                        <td style={{ fontSize: '0.85rem', fontWeight: 600 }}>
                          {unit.storage?.currentTemperature ? (
                            <span style={{ color: unit.isTemperatureCompliant ? '#059669' : '#dc2626' }}>
                              {unit.storage.currentTemperature}°C {unit.isTemperatureCompliant ? '✓' : '⚠️'}
                            </span>
                          ) : (
                            <span style={{ color: '#94a3b8' }}>N/A</span>
                          )}
                        </td>
                        <td>
                          <div style={{ display: 'flex', gap: 6 }}>
                            <button
                              onClick={() => { setSelectedUnit(unit); setShowTestModal(true); }}
                              className="btn btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Update Lab Tests"
                            >
                              Tests
                            </button>
                            <button
                              onClick={() => handleVerify(unit._id)}
                              className="btn btn-outline-primary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Verify Quality Standards"
                            >
                              Verify
                            </button>
                            <button
                              onClick={() => { setSelectedUnit(unit); setShowCompatModal(true); }}
                              className="btn btn-secondary"
                              style={{ padding: '5px 10px', fontSize: '0.75rem' }}
                              title="Cross-match compatibility"
                            >
                              Cross-Match
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </main>

      {/* Create Unit Modal */}
      {showCreateModal && <CreateUnitModal onClose={() => setShowCreateModal(false)} onCreate={handleCreateUnit} />}

      {/* Safety Test Results Modal */}
      {showTestModal && selectedUnit && (
        <TestResultsModal unit={selectedUnit} onClose={() => { setShowTestModal(false); setSelectedUnit(null); }} onUpdate={fetchAllUnits} />
      )}

      {/* Verification Result Modal */}
      {showVerifyModal && verificationResult && (
        <VerificationModal result={verificationResult} onClose={() => { setShowVerifyModal(false); setVerificationResult(null); }} />
      )}

      {/* Compatibility Check Modal */}
      {showCompatModal && !compatResult && selectedUnit && (
        <CompatibilityCheckModal unit={selectedUnit} onClose={() => { setShowCompatModal(false); setSelectedUnit(null); }} onCheck={handleCheckCompatibility} />
      )}

      {/* Compatibility Result Modal */}
      {showCompatModal && compatResult && (
        <CompatibilityResultModal result={compatResult} onClose={() => { setShowCompatModal(false); setCompatResult(null); setSelectedUnit(null); }} />
      )}
    </div>
  );
}

// ── Modals Redesigned with Unified Design System ─────────────────────────

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div className="modern-card" style={{ width: '100%', maxWidth: 480, padding: '32px', borderRadius: 16 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Register New Blood Unit</h2>
          <button onClick={onClose} style={{ color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Blood Group *</label>
            <select required className="form-control" value={form.bloodGroup} onChange={e => setForm({...form, bloodGroup: e.target.value})}>
              <option value="">Select Blood Group</option>
              {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Component Type *</label>
            <select required className="form-control" value={form.componentType} onChange={e => setForm({...form, componentType: e.target.value})}>
              {Object.entries(COMPONENT_TYPES).map(([key, label]) => (
                <option key={key} value={key}>{label}</option>
              ))}
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Collection Date *</label>
            <input className="form-control" type="date" required value={form.collectionDate} onChange={e => setForm({...form, collectionDate: e.target.value})} />
          </div>

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
              Save Blood Unit
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '12px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function TestResultsModal({ unit, onClose, onUpdate }) {
  const [tests, setTests] = useState({
    hiv: unit.safetyTests?.hiv?.result || 'pending',
    hepatitisB: unit.safetyTests?.hepatitisB?.result || 'pending',
    hepatitisC: unit.safetyTests?.hepatitisC?.result || 'pending',
    syphilis: unit.safetyTests?.syphilis?.result || 'pending',
    malaria: unit.safetyTests?.malaria?.result || 'pending',
    labId: 'LAB-' + Math.random().toString(36).substr(2, 6).toUpperCase(),
    testedBy: 'Clinical Pathologist'
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await axios.put(`${API_URL}/blood-units/${unit._id}/safety-tests`, tests);
      onUpdate();
      onClose();
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to update tests');
    }
  };

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div className="modern-card" style={{ width: '100%', maxWidth: 540, padding: '32px', borderRadius: 16, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <div>
            <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a' }}>Laboratory Serological Results</h2>
            <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Unit Barcode: <strong style={{ color: '#2563eb' }}>{unit.unitId}</strong></div>
          </div>
          <button onClick={onClose} style={{ color: '#64748b', fontSize: '1.2rem', cursor: 'pointer' }}>✕</button>
        </div>

        <div style={{ background: '#fffbeb', border: '1px solid #fde68a', padding: '12px 14px', borderRadius: 8, marginBottom: 20, fontSize: '0.825rem', color: '#92400e' }}>
          ⚠️ All infectious markers must be confirmed NEGATIVE before a unit transitions from Quarantine to Safe.
        </div>

        <form onSubmit={handleSubmit}>
          {['hiv', 'hepatitisB', 'hepatitisC', 'syphilis', 'malaria'].map(test => (
            <div key={test} className="form-group">
              <label className="form-label" style={{ textTransform: 'capitalize' }}>
                {test === 'hiv' ? 'HIV 1 & 2 Antibody' : test.replace(/([A-Z])/g, ' $1')} Screen *
              </label>
              <select className="form-control" required value={tests[test]} onChange={e => setTests({...tests, [test]: e.target.value})}>
                <option value="pending">Pending Screening ⏳</option>
                <option value="negative">Negative (Clinically Safe) ✅</option>
                <option value="positive">Positive (Infection Detected - Reject) ❌</option>
              </select>
            </div>
          ))}

          <div style={{ display: 'flex', gap: 12, marginTop: 24 }}>
            <button type="submit" className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
              Save & Auto-Evaluate
            </button>
            <button type="button" onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '12px' }}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function VerificationModal({ result, onClose }) {
  const isPassed = result.verification?.passed;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div className="modern-card" style={{ width: '100%', maxWidth: 600, padding: '32px', borderRadius: 16, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{isPassed ? '✅' : '❌'}</div>
          <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: isPassed ? '#059669' : '#dc2626' }}>
            {result.message}
          </h2>
          <div style={{ marginTop: 8 }}>
            <span className={`badge ${isPassed ? 'badge-success' : 'badge-danger'}`}>
              Outcome: {result.verification?.outcome?.toUpperCase()}
            </span>
          </div>
        </div>

        <h3 style={{ fontSize: '0.95rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
          Verification Checklist:
        </h3>
        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0', marginBottom: 20 }}>
          {result.verification?.checks?.map((check, i) => (
            <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '8px 0', borderBottom: i < result.verification.checks.length - 1 ? '1px solid #f1f5f9' : 'none' }}>
              <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#334155' }}>{check.checkName}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 700, color: check.passed ? '#059669' : '#dc2626' }}>
                {check.passed ? '✓' : '✗'} {check.result}
              </span>
            </div>
          ))}
        </div>

        {result.verification?.failures?.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: 14, marginBottom: 20 }}>
            <div style={{ fontWeight: 700, color: '#dc2626', fontSize: '0.9rem', marginBottom: 6 }}>Quality Violations:</div>
            <ul style={{ margin: 0, paddingLeft: 18, color: '#991b1b', fontSize: '0.85rem' }}>
              {result.verification.failures.map((failure, i) => (
                <li key={i}>{failure}</li>
              ))}
            </ul>
          </div>
        )}

        <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}>
          Dismiss Inspection
        </button>
      </div>
    </div>
  );
}

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
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div className="modern-card" style={{ width: '100%', maxWidth: 480, padding: '32px', borderRadius: 16 }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#0f172a', marginBottom: 16 }}>
          Transfusion Cross-Match Check
        </h2>

        <div style={{ background: '#f8fafc', borderRadius: 10, padding: 14, border: '1px solid #e2e8f0', marginBottom: 18 }}>
          <div style={{ fontSize: '0.85rem', color: '#64748b' }}>Unit Barcode: <strong style={{ color: '#0f172a' }}>{unit.unitId}</strong></div>
          <div style={{ fontSize: '0.85rem', color: '#64748b', marginTop: 4 }}>
            Donor Group: <strong style={{ color: '#dc2626' }}>{unit.bloodGroup}</strong> ({COMPONENT_TYPES[unit.componentType]})
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Recipient Patient Blood Group *</label>
          <select className="form-control" value={recipientBloodGroup} onChange={e => setRecipientBloodGroup(e.target.value)}>
            <option value="">Select Recipient Blood Group</option>
            {['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'].map(bg => <option key={bg} value={bg}>{bg}</option>)}
          </select>
        </div>

        <div style={{ display: 'flex', gap: 12, marginTop: 22 }}>
          <button onClick={handleCheck} className="btn btn-primary" style={{ flex: 1, padding: '12px' }}>
            Check Compatibility
          </button>
          <button onClick={onClose} className="btn btn-secondary" style={{ flex: 1, padding: '12px' }}>
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

function CompatibilityResultModal({ result, onClose }) {
  const isCompatible = result.canTransfuse;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2000, padding: 20 }}>
      <div className="modern-card" style={{ width: '100%', maxWidth: 580, padding: '32px', borderRadius: 16, maxHeight: '90vh', overflowY: 'auto' }}>
        <div style={{ textAlign: 'center', marginBottom: 20 }}>
          <div style={{ fontSize: '3.5rem', marginBottom: 8 }}>{isCompatible ? '✅' : '⛔'}</div>
          <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: isCompatible ? '#059669' : '#dc2626' }}>
            {result.recommendation}
          </h2>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 20 }}>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Donor Blood Group</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#dc2626', marginTop: 2 }}>{result.bloodUnit?.bloodGroup}</div>
          </div>
          <div style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 10, padding: 14, textAlign: 'center' }}>
            <div style={{ fontSize: '0.8rem', color: '#64748b' }}>Recipient Patient</div>
            <div style={{ fontSize: '1.5rem', fontWeight: 800, color: '#2563eb', marginTop: 2 }}>{result.recipient?.bloodGroup}</div>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: result.compatible ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${result.compatible ? '#a7f3d0' : '#fecaca'}`,
            color: result.compatible ? '#065f46' : '#991b1b',
            fontSize: '0.875rem',
            fontWeight: 700,
            textAlign: 'center'
          }}>
            ABO/Rh: {result.compatible ? '✓ Compatible' : '✗ Incompatible'}
          </div>
          <div style={{
            padding: 12,
            borderRadius: 8,
            background: result.safetyPassed ? '#ecfdf5' : '#fef2f2',
            border: `1px solid ${result.safetyPassed ? '#a7f3d0' : '#fecaca'}`,
            color: result.safetyPassed ? '#065f46' : '#991b1b',
            fontSize: '0.875rem',
            fontWeight: 700,
            textAlign: 'center'
          }}>
            Safety Screenings: {result.safetyPassed ? '✓ Passed' : '✗ Failed'}
          </div>
        </div>

        <button onClick={onClose} className="btn btn-secondary" style={{ width: '100%', padding: '12px' }}>
          Close Result
        </button>
      </div>
    </div>
  );
}
