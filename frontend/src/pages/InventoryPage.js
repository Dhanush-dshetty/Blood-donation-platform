import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';
const BLOOD_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const styles = {
  page: { minHeight: '100vh', background: '#f8f9fa' },
  header: { background: '#c0392b', color: 'white', padding: '16px 32px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
  body: { padding: '32px', maxWidth: 1100, margin: '0 auto' },
  card: { background: 'white', borderRadius: 12, padding: 24, boxShadow: '0 2px 8px rgba(0,0,0,0.06)', marginBottom: 24 },
  label: { display: 'block', marginBottom: 6, fontWeight: 600, color: '#444', fontSize: '0.9rem' },
  input: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '0.95rem', marginBottom: 12 },
  select: { width: '100%', padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '0.95rem', marginBottom: 12 },
  btn: { padding: '12px 24px', background: '#c0392b', color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: 'pointer' },
};

export default function InventoryPage() {
  const [inventory, setInventory] = useState([]);
  const [summary, setSummary] = useState({});
  const [form, setForm] = useState({ bloodGroup: 'O+', units: 1, collectionDate: '', hivTest: 'negative', hepatitisBTest: 'negative', hepatitisCTest: 'negative', syphilisTest: 'negative', hemoglobinLevel: '', bloodPressureSystolic: '', bloodPressureDiastolic: '', storageTemperature: 4 });
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

  const STATUS_COLORS = { safe: '#27ae60', flagged: '#e74c3c', pending_verification: '#f39c12', expired: '#888', used: '#aaa' };

  return (
    <div style={styles.page}>
      <div style={styles.header}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <span style={{ fontSize: '1.8rem' }}>🩸</span>
          <strong style={{ fontSize: '1.1rem' }}>Blood Inventory Management</strong>
        </div>
        <Link to="/hospital/dashboard" style={{ color: 'white', fontWeight: 600 }}>← Dashboard</Link>
      </div>

      <div style={styles.body}>
        {/* Stock Summary */}
        <div style={styles.card}>
          <h3 style={{ marginBottom: 16 }}>Current Blood Stock</h3>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)', gap: 12 }}>
            {BLOOD_GROUPS.map(bg => (
              <div key={bg} style={{ textAlign: 'center', background: summary[bg] > 0 ? '#fff5f5' : '#f0f0f0', borderRadius: 8, padding: 12 }}>
                <div style={{ fontWeight: 700, color: '#c0392b', fontSize: '1.1rem' }}>{bg}</div>
                <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{summary[bg] || 0}</div>
                <div style={{ fontSize: '0.75rem', color: '#888' }}>units</div>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 24 }}>
          {/* Add Unit Form */}
          <div style={styles.card}>
            <h3 style={{ marginBottom: 16 }}>➕ Add Blood Unit</h3>
            <form onSubmit={submitUnit}>
              <label style={styles.label}>Blood Group</label>
              <select style={styles.select} value={form.bloodGroup} onChange={e => set('bloodGroup', e.target.value)}>
                {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
              </select>
              <label style={styles.label}>Units</label>
              <input style={styles.input} type="number" min="1" value={form.units} onChange={e => set('units', e.target.value)} />
              <label style={styles.label}>Collection Date</label>
              <input style={styles.input} type="date" required value={form.collectionDate} onChange={e => set('collectionDate', e.target.value)} />
              <label style={styles.label}>Storage Temp (°C)</label>
              <input style={styles.input} type="number" value={form.storageTemperature} onChange={e => set('storageTemperature', e.target.value)} />
              <label style={styles.label}>Hemoglobin (g/dL)</label>
              <input style={styles.input} type="number" step="0.1" placeholder="e.g. 13.5" value={form.hemoglobinLevel} onChange={e => set('hemoglobinLevel', e.target.value)} />

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                {['hivTest', 'hepatitisBTest', 'hepatitisCTest', 'syphilisTest'].map(test => (
                  <div key={test}>
                    <label style={styles.label}>{test.replace('Test', '').replace(/([A-Z])/g, ' $1').trim()}</label>
                    <select style={styles.select} value={form[test]} onChange={e => set(test, e.target.value)}>
                      <option value="negative">Negative ✅</option>
                      <option value="positive">Positive ❌</option>
                      <option value="pending">Pending</option>
                    </select>
                  </div>
                ))}
              </div>

              <button style={styles.btn} type="submit" disabled={loading}>
                {loading ? 'Processing...' : 'Add and Verify Unit'}
              </button>
            </form>

            {result && !result.error && (
              <div style={{ marginTop: 16, background: result.isSafe ? '#e8f8e8' : '#fdecea', borderRadius: 8, padding: 14 }}>
                <strong>{result.isSafe ? '✅ Unit is SAFE for storage' : '❌ Unit FLAGGED — Do not use'}</strong>
                {result.ruleCheckDetails?.length > 0 && (
                  <ul style={{ marginTop: 8 }}>{result.ruleCheckDetails.map((i, x) => <li key={x}>{i}</li>)}</ul>
                )}
                {result.aiFlag?.isFlagged && <div style={{ marginTop: 6 }}>🤖 AI Flag: {result.aiFlag.reason}</div>}
              </div>
            )}
          </div>

          {/* Pre-Transfusion Verification */}
          <div style={styles.card}>
            <h3 style={{ marginBottom: 16 }}>🛡️ Pre-Transfusion Verification</h3>
            <p style={{ color: '#666', marginBottom: 16, fontSize: '0.9rem' }}>
              Run this check before every transfusion. The system will verify blood group compatibility, expiry, and safety status.
            </p>
            <form onSubmit={submitVerify}>
              <label style={styles.label}>Blood Unit ID</label>
              <input style={styles.input} required value={verifyForm.unitId} onChange={e => setVerifyForm(f => ({ ...f, unitId: e.target.value }))} placeholder="Paste unit ID from inventory" />
              <label style={styles.label}>Patient Blood Group</label>
              <select style={styles.select} value={verifyForm.patientBloodGroup} onChange={e => setVerifyForm(f => ({ ...f, patientBloodGroup: e.target.value }))}>
                {BLOOD_GROUPS.map(bg => <option key={bg}>{bg}</option>)}
              </select>
              <button style={styles.btn} type="submit">Run Safety Check</button>
            </form>

            {verifyResult && !verifyResult.error && (
              <div style={{ marginTop: 16, background: verifyResult.approved ? '#e8f8e8' : '#fdecea', borderRadius: 8, padding: 14 }}>
                <strong style={{ fontSize: '1.1rem' }}>{verifyResult.approved ? '✅ APPROVED for transfusion' : '🚫 BLOCKED — Do not transfuse'}</strong>
                {verifyResult.issues?.map((i, x) => <div key={x} style={{ marginTop: 6, color: '#c0392b' }}>⚠️ {i}</div>)}
              </div>
            )}
          </div>
        </div>

        {/* Inventory Table */}
        <div style={styles.card}>
          <h3 style={{ marginBottom: 16 }}>All Blood Units</h3>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #eee', textAlign: 'left' }}>
                {['ID', 'Blood Group', 'Units', 'Collection', 'Expiry', 'Status', 'AI Flag'].map(h => (
                  <th key={h} style={{ padding: '8px 12px', color: '#888', fontWeight: 600, fontSize: '0.85rem' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {inventory.map(unit => (
                <tr key={unit._id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                  <td style={{ padding: '8px 12px', fontFamily: 'monospace', fontSize: '0.75rem', color: '#888' }}>{unit._id.slice(-8)}</td>
                  <td style={{ padding: '8px 12px', fontWeight: 700, color: '#c0392b' }}>{unit.bloodGroup}</td>
                  <td style={{ padding: '8px 12px' }}>{unit.units}</td>
                  <td style={{ padding: '8px 12px', fontSize: '0.85rem' }}>{new Date(unit.collectionDate).toLocaleDateString()}</td>
                  <td style={{ padding: '8px 12px', fontSize: '0.85rem' }}>{new Date(unit.expiryDate).toLocaleDateString()}</td>
                  <td style={{ padding: '8px 12px' }}>
                    <span style={{ background: STATUS_COLORS[unit.status] + '22', color: STATUS_COLORS[unit.status], padding: '2px 8px', borderRadius: 4, fontSize: '0.8rem', fontWeight: 600 }}>
                      {unit.status.replace('_', ' ')}
                    </span>
                  </td>
                  <td style={{ padding: '8px 12px', fontSize: '0.85rem' }}>
                    {unit.aiSafetyFlag?.isFlagged ? <span style={{ color: '#e74c3c' }}>⚠️ {unit.aiSafetyFlag.reason?.substring(0, 30)}</span> : '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
