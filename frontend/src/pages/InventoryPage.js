import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const STATUS_CONFIG = {
  safe:                 { label: 'Safe',    color: '#059669', bg: '#ecfdf5', border: '#a7f3d0' },
  flagged:              { label: 'Flagged', color: '#dc2626', bg: '#fef2f2', border: '#fecaca' },
  pending_verification: { label: 'Pending', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  expired:              { label: 'Expired', color: '#64748b', bg: '#f1f5f9', border: '#cbd5e1' },
  used:                 { label: 'Used',    color: '#94a3b8', bg: '#f8fafc', border: '#e2e8f0' }
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [form, setForm] = useState({
    bloodGroup: 'O+',
    units: 1,
    collectionDate: '',
    hivTest: 'negative',
    hepatitisBTest: 'negative',
    hepatitisCTest: 'negative',
    syphilisTest: 'negative',
    hemoglobinLevel: '',
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    storageTemperature: 4
  });
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [verifyForm, setVerifyForm] = useState({ unitId: '', patientBloodGroup: 'O+' });
  const [verifyResult, setVerifyResult] = useState(null);

  useEffect(() => { fetchInventory(); }, []);

  const fetchInventory = async () => {
    try {
      const res = await axios.get(`${API_URL}/inventory`);
      setInventory(res.data.inventory || []);
      setSummary(res.data.summary || {});
    } catch (e) {}
  };

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const submitUnit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setResult(null);
    try {
      const res = await axios.post(`${API_URL}/inventory`, form);
      setResult(res.data.safetyResult);
      fetchInventory();
    } catch (err) {
      setResult({ error: err.response?.data?.message || 'Failed' });
    } finally {
      setLoading(false);
    }
  };

  const submitVerify = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post(`${API_URL}/inventory/verify-transfusion`, verifyForm);
      setVerifyResult(res.data);
    } catch (err) {
      setVerifyResult({ error: err.response?.data?.message });
    }
  };

  return (
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container">
        {/* Title */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Blood Inventory & Quality Control
          </h1>
          <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: 4 }}>
            Digital inventory tracking, biological marker recording & pre-transfusion safety verification
          </p>
        </div>

        {/* Stock Matrix Summary */}
        <div className="modern-card" style={{ padding: '24px', marginBottom: 28 }}>
          <h2 style={{ fontSize: '1.05rem', fontWeight: 700, color: '#0f172a', marginBottom: 16 }}>
            Verified In-Stock Summary
          </h2>

          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(110px, 1fr))',
            gap: 12
          }}>
            {BLOOD_GROUPS.map(bg => {
              const count = summary[bg] || 0;
              const hasUnits = count > 0;
              return (
                <div key={bg} style={{
                  textAlign: 'center',
                  background: hasUnits ? '#fef2f2' : '#f8fafc',
                  border: `1px solid ${hasUnits ? '#fecaca' : '#e2e8f0'}`,
                  borderRadius: 10,
                  padding: '14px 10px'
                }}>
                  <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.1rem' }}>{bg}</div>
                  <div style={{ fontSize: '1.6rem', fontWeight: 800, color: '#0f172a', margin: '4px 0' }}>{count}</div>
                  <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#64748b' }}>safe units</div>
                </div>
              );
            })}
          </div>
        </div>

        {/* 2-Column Section: Add Unit Form & Pre-Transfusion Verifier */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }} className="inventory-grid">
          {/* Add Blood Unit */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              ➕ Register Blood Batch
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 18 }}>
              Record collection details and automated laboratory infectious marker screenings
            </p>

            <form onSubmit={submitUnit}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Blood Group *</label>
                  <select className="form-control" value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                    {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Units (Bags) *</label>
                  <input className="form-control" type="number" min="1" value={form.units} onChange={e => set('units', e.target.value)} required />
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14 }}>
                <div className="form-group">
                  <label className="form-label">Collection Date *</label>
                  <input className="form-control" type="date" required value={form.collectionDate} onChange={e => set('collectionDate', e.target.value)} />
                </div>
                <div className="form-group">
                  <label className="form-label">Storage Temp (°C)</label>
                  <input className="form-control" type="number" value={form.storageTemperature} onChange={e => set('storageTemperature', e.target.value)} />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Hemoglobin Level (g/dL)</label>
                <input className="form-control" type="number" step="0.1" placeholder="e.g. 13.5 (standard 12–16 g/dL)" value={form.hemoglobinLevel} onChange={e => set('hemoglobinLevel', e.target.value)} />
              </div>

              {/* Lab infectious disease tests */}
              <div style={{ padding: 14, background: '#f8fafc', borderRadius: 10, border: '1px solid #e2e8f0', marginBottom: 18 }}>
                <div style={{ fontSize: '0.825rem', fontWeight: 700, color: '#0f172a', marginBottom: 10 }}>
                  🔬 Infectious Disease Screenings
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  {[
                    { key: 'hivTest', label: 'HIV Antibody' },
                    { key: 'hepatitisBTest', label: 'Hepatitis B (HBsAg)' },
                    { key: 'hepatitisCTest', label: 'Hepatitis C (HCV)' },
                    { key: 'syphilisTest', label: 'Syphilis (VDRL)' }
                  ].map(test => (
                    <div key={test.key}>
                      <label className="form-label" style={{ fontSize: '0.75rem', marginBottom: 4 }}>{test.label}</label>
                      <select className="form-control" style={{ padding: '8px 10px', fontSize: '0.85rem' }} value={form[test.key]} onChange={e => set(test.key, e.target.value)}>
                        <option value="negative">Negative ✅</option>
                        <option value="positive">Positive ❌</option>
                        <option value="pending">Pending ⏳</option>
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              <button type="submit" disabled={loading} className="btn btn-primary" style={{ width: '100%', padding: '12px' }}>
                {loading ? 'Processing Unit...' : 'Verify & Add to Inventory'}
              </button>
            </form>

            {result && !result.error && (
              <div style={{
                marginTop: 18,
                borderRadius: 10,
                padding: 14,
                background: result.isSafe ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${result.isSafe ? '#a7f3d0' : '#fecaca'}`,
                color: result.isSafe ? '#065f46' : '#991b1b'
              }}>
                <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>
                  {result.isSafe ? '✅ Batch Verified SAFE for clinical storage' : '❌ Unit FLAGGED — Unsafe for transfusion'}
                </div>
                {result.ruleCheckDetails?.length > 0 && (
                  <ul style={{ marginTop: 8, paddingLeft: 20, fontSize: '0.85rem' }}>
                    {result.ruleCheckDetails.map((i, x) => <li key={x}>{i}</li>)}
                  </ul>
                )}
                {result.aiFlag?.isFlagged && (
                  <div style={{ marginTop: 8, fontSize: '0.85rem', fontWeight: 600 }}>
                    🤖 AI Anomaly Warning: {result.aiFlag.reason}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Pre-Transfusion Verification */}
          <div className="modern-card" style={{ padding: '24px' }}>
            <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 6 }}>
              🛡️ Pre-Transfusion Match Safety
            </h2>
            <p style={{ color: '#64748b', fontSize: '0.85rem', marginBottom: 18 }}>
              Mandatory digital safety check before issuing blood: validates unit biological viability, ABO/Rh compatibility & expiry.
            </p>

            <form onSubmit={submitVerify}>
              <div className="form-group">
                <label className="form-label">Blood Unit ID (From Inventory List) *</label>
                <input
                  className="form-control"
                  required
                  value={verifyForm.unitId}
                  onChange={e => setVerifyForm(f => ({ ...f, unitId: e.target.value }))}
                  placeholder="Paste 24-character Unit ID"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Recipient Patient Blood Group *</label>
                <select
                  className="form-control"
                  value={verifyForm.patientBloodGroup}
                  onChange={e => setVerifyForm(f => ({ ...f, patientBloodGroup: e.target.value }))}
                >
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>

              <button type="submit" className="btn btn-secondary" style={{ width: '100%', padding: '12px', fontWeight: 700 }}>
                Run Immediate Verification
              </button>
            </form>

            {verifyResult && !verifyResult.error && (
              <div style={{
                marginTop: 20,
                borderRadius: 10,
                padding: 16,
                background: verifyResult.approved ? '#ecfdf5' : '#fef2f2',
                border: `1px solid ${verifyResult.approved ? '#a7f3d0' : '#fecaca'}`,
                color: verifyResult.approved ? '#065f46' : '#991b1b'
              }}>
                <div style={{ fontWeight: 800, fontSize: '1.05rem' }}>
                  {verifyResult.approved ? '✅ APPROVED: Transfusion Compatible' : '🚫 BLOCKED: Mismatch / Quality Failure'}
                </div>
                {verifyResult.issues?.map((issue, x) => (
                  <div key={x} style={{ marginTop: 6, fontSize: '0.875rem' }}>
                    ⚠️ {issue}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* All Blood Units Table */}
        <div className="modern-card" style={{ padding: '24px' }}>
          <h2 style={{ fontSize: '1.15rem', fontWeight: 700, color: '#0f172a', marginBottom: 4 }}>
            All Tracked Inventory Batches
          </h2>
          <p style={{ color: '#64748b', fontSize: '0.825rem', marginBottom: 18 }}>
            Complete audit trail of all blood units stored at this facility
          </p>

          <div className="table-responsive">
            <table className="table-modern">
              <thead>
                <tr>
                  <th>Batch Unit ID</th>
                  <th>Blood Group</th>
                  <th>Units</th>
                  <th>Collection Date</th>
                  <th>Expiry Date</th>
                  <th>Status</th>
                  <th>AI Quality Flag</th>
                </tr>
              </thead>
              <tbody>
                {inventory.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', padding: '36px', color: '#64748b' }}>
                      No inventory records found. Add your first unit using the form above.
                    </td>
                  </tr>
                ) : (
                  inventory.map(unit => {
                    const scfg = STATUS_CONFIG[unit.status] || STATUS_CONFIG.pending_verification;
                    return (
                      <tr key={unit._id}>
                        <td style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem', color: '#64748b' }}>
                          <span title={unit._id} style={{ background: '#f1f5f9', padding: '3px 6px', borderRadius: 4 }}>
                            {unit._id.slice(-8)}
                          </span>
                        </td>
                        <td style={{ fontWeight: 800, color: '#dc2626', fontSize: '1.05rem' }}>
                          {unit.bloodGroup}
                        </td>
                        <td style={{ fontWeight: 700, color: '#0f172a' }}>
                          {unit.units}
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                          {new Date(unit.collectionDate).toLocaleDateString()}
                        </td>
                        <td style={{ color: '#475569', fontSize: '0.85rem' }}>
                          {new Date(unit.expiryDate).toLocaleDateString()}
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
                        <td style={{ fontSize: '0.85rem' }}>
                          {unit.aiSafetyFlag?.isFlagged ? (
                            <span style={{ color: '#dc2626', fontWeight: 600 }}>⚠️ {unit.aiSafetyFlag.reason?.substring(0, 32)}</span>
                          ) : (
                            <span style={{ color: '#059669', fontWeight: 600 }}>✓ Verified</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>

      {/* Responsive layout styles */}
      <style>{`
        @media (max-width: 900px) {
          .inventory-grid {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </div>
  );
}
