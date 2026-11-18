import React, { useState, useCallback } from 'react';
import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const ALL_GROUPS = ['A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];

const CITY_PRESETS = [
  { label: 'Bangalore (Bengaluru)', lat: 12.9716, lng: 77.5946 },
  { label: 'Mysore (Mysuru)', lat: 12.3129, lng: 76.6543 },
  { label: 'Mangalore (Dakshina Kannada)', lat: 12.8703, lng: 74.8431 },
  { label: 'Udupi / Manipal', lat: 13.3409, lng: 74.7421 },
  { label: 'Hubli - Dharwad', lat: 15.3647, lng: 75.1228 },
  { label: 'Belgaum (Belagavi)', lat: 15.8497, lng: 74.5165 },
  { label: 'Kalaburagi (Gulbarga)', lat: 17.3297, lng: 76.8343 },
  { label: 'Shimoga (Shivamogga)', lat: 13.9299, lng: 75.5681 },
  { label: 'Davanagere', lat: 14.4644, lng: 75.9218 },
  { label: 'Bellary (Ballari)', lat: 15.1394, lng: 76.9248 },
  { label: 'Tumkur (Tumakuru)', lat: 13.3409, lng: 77.1025 },
  { label: 'Hassan', lat: 13.0072, lng: 76.1028 },
  { label: 'Mandya', lat: 12.5242, lng: 76.8951 },
  { label: 'Bidar', lat: 17.9104, lng: 77.5186 },
  { label: 'Raichur', lat: 16.2076, lng: 77.3439 },
  { label: 'Vijayapura (Bijapur)', lat: 16.8302, lng: 75.7145 },
  { label: 'Chitradurga', lat: 14.2251, lng: 76.4014 },
  { label: 'Kolar', lat: 13.1367, lng: 78.1726 },
  { label: 'Chikkamagaluru', lat: 13.3161, lng: 75.7720 },
  { label: 'Bagalkot', lat: 16.1850, lng: 75.6980 },
  { label: 'Gadag', lat: 15.4280, lng: 75.6410 },
  { label: 'Haveri', lat: 14.7950, lng: 75.4050 },
  { label: 'Karwar (Uttara Kannada)', lat: 14.8153, lng: 74.1305 },
  { label: 'Madikeri (Kodagu)', lat: 12.4244, lng: 75.7382 },
  { label: 'Hosapete (Vijayanagara)', lat: 15.2690, lng: 76.3880 },
  { label: 'Chamarajanagar', lat: 11.9261, lng: 76.9420 },
  { label: 'Yadgir', lat: 16.7680, lng: 77.1350 },
  { label: 'Chikkaballapur', lat: 13.4325, lng: 77.7275 },
  { label: 'Ramanagara', lat: 12.7210, lng: 77.2810 },
  { label: 'Koppal', lat: 15.3480, lng: 76.1550 }
];

const RADIUS_OPTIONS = [25, 50, 100];

// ─── Spinner ───────────────────────────────────────────────────────────────
function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '48px 0', gap: 16 }}>
      <div style={{
        width: 48, height: 48, border: '5px solid #fde0de',
        borderTopColor: '#c0392b', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{ color: '#c0392b', fontWeight: 600 }}>Searching nearby hospitals…</div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ─── Stock Badge ────────────────────────────────────────────────────────────
function StockBadge({ status, units }) {
  const cfg = {
    in_stock:    { bg: '#e8f8e8', color: '#27ae60', icon: '🟢', label: `In Stock (${units} units)` },
    low_stock:   { bg: '#fff8e1', color: '#f39c12', icon: '🟡', label: `Low Stock (${units} units)` },
    out_of_stock:{ bg: '#fdecea', color: '#c0392b', icon: '🔴', label: 'Out of Stock' },
  }[status] || { bg: '#f0f0f0', color: '#888', icon: '⚫', label: 'Unknown' };

  return (
    <span style={{ background: cfg.bg, color: cfg.color, padding: '4px 12px', borderRadius: 20, fontWeight: 700, fontSize: '0.82rem', whiteSpace: 'nowrap' }}>
      {cfg.icon} {cfg.label}
    </span>
  );
}

// ─── Hospital Card ──────────────────────────────────────────────────────────
function HospitalCard({ hospital, bloodGroup }) {
  const [expanded, setExpanded] = useState(false);
  const [inventory, setInventory] = useState(null);
  const [loadingInv, setLoadingInv] = useState(false);

  const hLat = hospital.location?.coordinates?.[1];
  const hLng = hospital.location?.coordinates?.[0];
  const mapsUrl = hLat && hLng
    ? `https://www.google.com/maps/dir/?api=1&destination=${hLat},${hLng}&travelmode=driving`
    : `https://www.google.com/maps/search/${encodeURIComponent(hospital.hospitalName)}`;

  const handleExpand = async () => {
    if (!expanded && !inventory) {
      setLoadingInv(true);
      try {
        const res = await axios.get(`${API_URL}/hospitals/${hospital._id}/inventory`);
        setInventory(res.data);
      } catch {
        setInventory({ error: true });
      } finally {
        setLoadingInv(false);
      }
    }
    setExpanded(e => !e);
  };

  const facilityLabel = hospital.facilityType === 'blood_bank' ? 'Blood Bank' : 'Hospital';
  const facilityColor = hospital.facilityType === 'blood_bank' ? '#8e44ad' : '#2980b9';

  return (
    <div style={{
      background: 'white', borderRadius: 14, boxShadow: '0 2px 12px rgba(0,0,0,0.08)',
      marginBottom: 16, overflow: 'hidden',
      border: hospital.stockStatus === 'in_stock' ? '1.5px solid #d5f5e3' :
              hospital.stockStatus === 'low_stock' ? '1.5px solid #fdebd0' : '1.5px solid #fdecea'
    }}>
      {/* Card Header */}
      <div style={{ padding: '18px 20px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <span style={{ fontWeight: 700, fontSize: '1.05rem', color: '#1a1a1a' }}>{hospital.hospitalName}</span>
            <span style={{ background: facilityColor + '1a', color: facilityColor, padding: '2px 8px', borderRadius: 4, fontSize: '0.76rem', fontWeight: 700 }}>
              {facilityLabel}
            </span>
          </div>
          <div style={{ color: '#666', fontSize: '0.86rem', marginBottom: 6 }}>
            {[hospital.address, hospital.city].filter(Boolean).join(', ')}
          </div>
          {hospital.operatingHours && (
            <div style={{ color: '#888', fontSize: '0.8rem' }}>🕐 {hospital.operatingHours}</div>
          )}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ background: '#e8f4f8', color: '#2980b9', padding: '4px 10px', borderRadius: 20, fontWeight: 700, fontSize: '0.82rem' }}>
              📍 {hospital.distanceKm} km
            </span>
            <span style={{ background: '#f0f0f0', color: '#555', padding: '4px 10px', borderRadius: 20, fontWeight: 600, fontSize: '0.82rem' }}>
              ~{hospital.etaMinutes} min drive
            </span>
          </div>
          <StockBadge status={hospital.stockStatus} units={hospital.exactMatchUnits} />
        </div>
      </div>

      {/* Compatible alternatives */}
      {hospital.stockStatus === 'out_of_stock' && hospital.compatibleUnits > 0 && (
        <div style={{ margin: '0 20px 12px', background: '#fffbf0', border: '1px solid #fdebd0', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontWeight: 600, color: '#d68910', fontSize: '0.86rem', marginBottom: 4 }}>
            ⚡ Compatible alternatives available:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(hospital.compatibleBreakdown).map(([grp, units]) => (
              <span key={grp} style={{ background: '#fff3cd', color: '#856404', padding: '3px 10px', borderRadius: 12, fontSize: '0.82rem', fontWeight: 600 }}>
                {grp}: {units} units
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ padding: '0 20px 16px', display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
        {hospital.phone && (
          <a href={`tel:${hospital.phone}`}
            style={{ padding: '8px 16px', background: '#e8f8e8', color: '#27ae60', border: 'none', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem', cursor: 'pointer' }}>
            📞 Call
          </a>
        )}
        <a href={mapsUrl} target="_blank" rel="noopener noreferrer"
          style={{ padding: '8px 16px', background: '#e8f4f8', color: '#2980b9', border: 'none', borderRadius: 8, fontWeight: 700, textDecoration: 'none', fontSize: '0.86rem', cursor: 'pointer' }}>
          🗺️ Directions
        </a>
        <button onClick={handleExpand}
          style={{ padding: '8px 16px', background: '#fdf2f2', color: '#c0392b', border: '1px solid #f5c6c6', borderRadius: 8, fontWeight: 600, fontSize: '0.86rem', cursor: 'pointer', marginLeft: 'auto' }}>
          {expanded ? '▲ Hide Inventory' : 'View Full Inventory →'}
        </button>
      </div>

      {/* Expandable Inventory Table */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f0f0f0', padding: '16px 20px', background: '#fafafa' }}>
          {loadingInv ? (
            <div style={{ textAlign: 'center', color: '#c0392b', padding: '16px 0', fontWeight: 600 }}>Loading inventory…</div>
          ) : inventory?.error ? (
            <div style={{ color: '#c0392b', fontSize: '0.88rem' }}>Could not load inventory.</div>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '0.9rem' }}>📋 Blood Inventory (Safe & Non-Expired)</div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8 }}>
                {ALL_GROUPS.map(grp => {
                  const units = inventory?.inventoryByGroup?.[grp] ?? hospital.inventoryByGroup?.[grp] ?? 0;
                  const isMatch = grp === bloodGroup;
                  const hasStock = units > 0;
                  return (
                    <div key={grp} style={{
                      background: isMatch ? (hasStock ? '#e8f8e8' : '#fdecea') : (hasStock ? '#f0f7ff' : '#f9f9f9'),
                      border: isMatch ? (hasStock ? '1.5px solid #27ae60' : '1.5px solid #e74c3c') : '1px solid #e0e0e0',
                      borderRadius: 8, padding: '10px', textAlign: 'center'
                    }}>
                      <div style={{ fontWeight: 700, color: isMatch ? (hasStock ? '#27ae60' : '#c0392b') : '#333', fontSize: '1rem' }}>{grp}</div>
                      <div style={{ fontWeight: 700, fontSize: '1.1rem', color: hasStock ? '#1a1a1a' : '#bbb' }}>{units}</div>
                      <div style={{ fontSize: '0.72rem', color: '#888' }}>units</div>
                      {isMatch && <div style={{ fontSize: '0.68rem', marginTop: 2, color: isMatch ? (hasStock ? '#27ae60' : '#c0392b') : '#888' }}>★ Requested</div>}
                    </div>
                  );
                })}
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Summary Stats Bar ──────────────────────────────────────────────────────
function SummaryBar({ results, bloodGroup }) {
  const withStock = results.filter(h => h.stockStatus !== 'out_of_stock');
  const totalExact = results.reduce((s, h) => s + h.exactMatchUnits, 0);
  const nearest = withStock[0];

  const stats = [
    { icon: '🏥', label: 'Hospitals Found', value: results.length },
    { icon: '✅', label: 'With Stock', value: withStock.length },
    { icon: '🩸', label: `${bloodGroup} Units`, value: totalExact },
    { icon: '📍', label: 'Nearest with Stock', value: nearest ? `${nearest.distanceKm} km` : '—' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} style={{ background: 'white', borderRadius: 10, padding: '14px 16px', boxShadow: '0 2px 8px rgba(0,0,0,0.06)', textAlign: 'center' }}>
          <div style={{ fontSize: '1.4rem', marginBottom: 4 }}>{s.icon}</div>
          <div style={{ fontWeight: 700, fontSize: '1.3rem', color: '#c0392b' }}>{s.value}</div>
          <div style={{ color: '#888', fontSize: '0.75rem', fontWeight: 600 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

// ─── Main Page ──────────────────────────────────────────────────────────────
export default function BloodFinderPage() {
  const [bloodGroup, setBloodGroup] = useState('O+');
  const [radiusKm, setRadiusKm] = useState(100);
  const [coords, setCoords] = useState(null);
  const [gpsLoading, setGpsLoading] = useState(false);
  const [gpsError, setGpsError] = useState(false);
  const [fallbackCity, setFallbackCity] = useState('');

  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [searched, setSearched] = useState(false);

  const getGPS = useCallback(() => {
    setGpsLoading(true);
    setGpsError(false);
    navigator.geolocation.getCurrentPosition(
      pos => {
        setCoords({ lat: pos.coords.latitude, lng: pos.coords.longitude });
        setGpsLoading(false);
        setGpsError(false);
      },
      () => {
        setGpsLoading(false);
        setGpsError(true);
      },
      { timeout: 10000 }
    );
  }, []);

  const handleFallbackCity = (cityLabel) => {
    const city = CITY_PRESETS.find(c => c.label === cityLabel);
    if (city) {
      setCoords({ lat: city.lat, lng: city.lng });
      setFallbackCity(cityLabel);
    }
  };

  const handleSearch = async () => {
    if (!coords) { setError('Please get your location first.'); return; }
    setLoading(true);
    setError('');
    setResults(null);
    setSearched(true);
    try {
      const res = await axios.get(`${API_URL}/hospitals/nearby-blood`, {
        params: { lat: coords.lat, lng: coords.lng, bloodGroup, radiusKm }
      });
      setResults(res.data);
    } catch (e) {
      setError(e.response?.data?.message || 'Search failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const noStockAnywhere = results && results.length > 0 && results.every(h => h.exactMatchUnits === 0 && h.compatibleUnits === 0);
  const noHospitalsFound = results && results.length === 0;

  return (
    <div style={{ minHeight: '100vh', background: '#fdf2f2', fontFamily: "'Segoe UI', system-ui, sans-serif" }}>

      {/* Header */}
      <div style={{ background: 'linear-gradient(135deg, #c0392b 0%, #96281b 100%)', color: 'white', padding: '28px 32px' }}>
        <h1 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>🩸 Find Blood Near Me</h1>
        <p style={{ margin: '6px 0 0', opacity: 0.85, fontSize: '0.95rem' }}>
          Locate hospitals with available blood matching your type — in real time.
        </p>
      </div>

      <div style={{ maxWidth: 900, margin: '0 auto', padding: '24px 16px' }}>

        {/* Search Controls Card */}
        <div style={{ background: 'white', borderRadius: 14, padding: '24px', boxShadow: '0 2px 12px rgba(0,0,0,0.08)', marginBottom: 24 }}>

          {/* Blood Group Selector */}
          <div style={{ marginBottom: 20 }}>
            <label style={{ display: 'block', fontWeight: 700, color: '#333', marginBottom: 10, fontSize: '0.9rem' }}>
              Select Blood Group
            </label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_GROUPS.map(g => (
                <button key={g} onClick={() => setBloodGroup(g)}
                  style={{
                    padding: '8px 16px', borderRadius: 24, border: 'none', cursor: 'pointer', fontWeight: 700, fontSize: '0.9rem',
                    background: bloodGroup === g ? '#c0392b' : '#fdf2f2',
                    color: bloodGroup === g ? 'white' : '#c0392b',
                    boxShadow: bloodGroup === g ? '0 2px 8px rgba(192,57,43,0.4)' : 'none',
                    transition: 'all 0.15s'
                  }}>
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Location Row */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'center', marginBottom: 20 }}>
            <div style={{ flex: '0 0 auto' }}>
              <label style={{ display: 'block', fontWeight: 700, color: '#333', marginBottom: 8, fontSize: '0.9rem' }}>Location</label>
              <button onClick={getGPS} disabled={gpsLoading}
                style={{
                  padding: '10px 20px', background: gpsLoading ? '#ccc' : '#27ae60',
                  color: 'white', border: 'none', borderRadius: 8, fontWeight: 700, cursor: gpsLoading ? 'default' : 'pointer', fontSize: '0.9rem'
                }}>
                {gpsLoading ? '📡 Getting GPS…' : '📡 Use My GPS'}
              </button>
            </div>

            {/* Fallback: OR manual city */}
            <div style={{ flex: '0 0 auto', display: 'flex', alignItems: 'center', gap: 10 }}>
              <span style={{ color: '#888', fontWeight: 600, marginTop: 24 }}>OR</span>
              <div>
                <label style={{ display: 'block', fontWeight: 700, color: '#333', marginBottom: 8, fontSize: '0.9rem' }}>Select City</label>
                <select value={fallbackCity} onChange={e => handleFallbackCity(e.target.value)}
                  style={{ padding: '10px 14px', borderRadius: 8, border: '1.5px solid #ddd', fontSize: '0.9rem', background: 'white' }}>
                  <option value="">— Choose city —</option>
                  {CITY_PRESETS.map(c => (
                    <option key={c.label} value={c.label}>{c.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {coords && (
              <div style={{ marginTop: 24 }}>
                <span style={{ background: '#e8f8e8', color: '#27ae60', padding: '8px 12px', borderRadius: 8, fontWeight: 600, fontSize: '0.82rem' }}>
                  ✓ {fallbackCity || `${coords.lat.toFixed(4)}, ${coords.lng.toFixed(4)}`}
                </span>
              </div>
            )}
          </div>

          {gpsError && (
            <div style={{ background: '#fff8e1', color: '#856404', padding: '10px 14px', borderRadius: 8, marginBottom: 16, fontSize: '0.86rem', fontWeight: 600 }}>
              ⚠️ GPS access denied. Please select a city above, or enable location in your browser.
            </div>
          )}

          {/* Radius + Search Row */}
          <div style={{ display: 'flex', gap: 16, alignItems: 'flex-end', flexWrap: 'wrap' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, color: '#333', marginBottom: 8, fontSize: '0.9rem' }}>Search Radius</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {RADIUS_OPTIONS.map(r => (
                  <button key={r} onClick={() => setRadiusKm(r)}
                    style={{
                      padding: '8px 18px', border: 'none', borderRadius: 8, cursor: 'pointer', fontWeight: 600, fontSize: '0.88rem',
                      background: radiusKm === r ? '#c0392b' : '#f0f0f0',
                      color: radiusKm === r ? 'white' : '#555'
                    }}>
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            <button onClick={handleSearch} disabled={loading || !coords}
              style={{
                padding: '12px 32px', background: loading || !coords ? '#e0a0a0' : '#c0392b',
                color: 'white', border: 'none', borderRadius: 10, fontWeight: 800, fontSize: '1rem',
                cursor: loading || !coords ? 'default' : 'pointer',
                boxShadow: loading || !coords ? 'none' : '0 4px 16px rgba(192,57,43,0.4)',
                marginLeft: 'auto'
              }}>
              {loading ? '🔍 Searching…' : '🔍 Search'}
            </button>
          </div>

          {error && (
            <div style={{ background: '#fdecea', color: '#c0392b', padding: '10px 14px', borderRadius: 8, marginTop: 14, fontWeight: 600, fontSize: '0.88rem' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Results */}
        {loading && <Spinner />}

        {!loading && searched && results !== null && (
          <>
            {/* Escalation Banner */}
            {noStockAnywhere && (
              <div style={{ background: '#fdecea', border: '2px solid #c0392b', borderRadius: 12, padding: '16px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: '1.6rem' }}>🚨</span>
                <div>
                  <div style={{ fontWeight: 700, color: '#c0392b', marginBottom: 4 }}>No blood available nearby</div>
                  <div style={{ color: '#555', fontSize: '0.9rem' }}>
                    Contact blood banks directly or register as an emergency request. Try expanding your search radius.
                  </div>
                </div>
              </div>
            )}

            {/* No results */}
            {noHospitalsFound ? (
              <div style={{ background: 'white', borderRadius: 14, padding: '48px 32px', textAlign: 'center', boxShadow: '0 2px 12px rgba(0,0,0,0.06)' }}>
                <div style={{ fontSize: '3rem', marginBottom: 12 }}>🏥</div>
                <div style={{ fontWeight: 700, color: '#333', fontSize: '1.1rem', marginBottom: 8 }}>
                  No hospitals found within {radiusKm}km
                </div>
                <div style={{ color: '#888', fontSize: '0.9rem' }}>
                  Try expanding your search radius or selecting a different location.
                </div>
              </div>
            ) : (
              <>
                <SummaryBar results={results} bloodGroup={bloodGroup} />

                <div style={{ fontWeight: 700, color: '#333', marginBottom: 12, fontSize: '0.95rem' }}>
                  {results.length} hospital{results.length !== 1 ? 's' : ''} found within {radiusKm}km
                  {' '}— showing closest first
                </div>

                {results.map(h => (
                  <HospitalCard key={h._id} hospital={h} bloodGroup={bloodGroup} />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
}
