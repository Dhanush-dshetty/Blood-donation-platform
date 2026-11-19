import React, { useState, useCallback } from 'react';
import axios from 'axios';
import Navbar from '../components/Navbar';

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

function Spinner() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '56px 0', gap: 14 }}>
      <div style={{
        width: 44, height: 44, border: '4px solid #fecaca',
        borderTopColor: '#dc2626', borderRadius: '50%',
        animation: 'spin 0.8s linear infinite'
      }} />
      <div style={{ color: '#dc2626', fontWeight: 700, fontSize: '0.95rem' }}>
        Searching nearby hospitals and verified blood banks...
      </div>
      <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

function StockBadge({ status, units }) {
  const cfg = {
    in_stock:    { bg: '#ecfdf5', color: '#059669', border: '#a7f3d0', label: `In Stock (${units} units)` },
    low_stock:   { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: `Low Stock (${units} units)` },
    out_of_stock:{ bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Out of Stock' },
  }[status] || { bg: '#f1f5f9', color: '#64748b', border: '#cbd5e1', label: 'Unknown' };

  return (
    <span style={{
      background: cfg.bg,
      color: cfg.color,
      border: `1px solid ${cfg.border}`,
      padding: '4px 12px',
      borderRadius: 9999,
      fontWeight: 700,
      fontSize: '0.8rem',
      whiteSpace: 'nowrap'
    }}>
      {cfg.label}
    </span>
  );
}

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

  return (
    <div className="modern-card" style={{ marginBottom: 16 }}>
      {/* Card Header */}
      <div style={{ padding: '20px 22px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', marginBottom: 4 }}>
            <h3 style={{ fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', margin: 0 }}>
              {hospital.hospitalName}
            </h3>
            <span className="badge badge-neutral" style={{ textTransform: 'capitalize' }}>
              {facilityLabel}
            </span>
          </div>

          <div style={{ color: '#475569', fontSize: '0.875rem', marginBottom: 4 }}>
            📍 {[hospital.address, hospital.city].filter(Boolean).join(', ')}
          </div>

          {hospital.operatingHours && (
            <div style={{ color: '#64748b', fontSize: '0.8rem' }}>
              🕒 {hospital.operatingHours}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <div style={{ display: 'flex', gap: 6 }}>
            <span style={{ background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', padding: '3px 10px', borderRadius: 9999, fontWeight: 700, fontSize: '0.8rem' }}>
              📏 {hospital.distanceKm} km
            </span>
            <span style={{ background: '#f1f5f9', color: '#475569', padding: '3px 10px', borderRadius: 9999, fontWeight: 600, fontSize: '0.8rem' }}>
              ~{hospital.etaMinutes} min drive
            </span>
          </div>
          <StockBadge status={hospital.stockStatus} units={hospital.exactMatchUnits} />
        </div>
      </div>

      {/* Compatible alternatives note */}
      {hospital.stockStatus === 'out_of_stock' && hospital.compatibleUnits > 0 && (
        <div style={{ margin: '0 22px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 14px' }}>
          <div style={{ fontWeight: 700, color: '#92400e', fontSize: '0.85rem', marginBottom: 4 }}>
            ⚡ Compatible alternatives available in emergency:
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {Object.entries(hospital.compatibleBreakdown).map(([grp, units]) => (
              <span key={grp} style={{ background: '#fef3c7', color: '#78350f', padding: '2px 8px', borderRadius: 6, fontSize: '0.8rem', fontWeight: 700 }}>
                {grp}: {units} units
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Action Buttons */}
      <div style={{ padding: '0 22px 18px', display: 'flex', gap: 10, alignItems: 'center', flexWrap: 'wrap', borderTop: '1px solid #f8fafc', paddingTop: 14 }}>
        {hospital.phone && (
          <a
            href={`tel:${hospital.phone}`}
            className="btn btn-secondary"
            style={{ padding: '8px 16px', fontSize: '0.85rem' }}
          >
            📞 Call Blood Bank
          </a>
        )}
        <a
          href={mapsUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-secondary"
          style={{ padding: '8px 16px', fontSize: '0.85rem' }}
        >
          🗺️ Get Directions
        </a>
        <button
          onClick={handleExpand}
          className="btn btn-outline-primary"
          style={{ padding: '8px 16px', fontSize: '0.85rem', marginLeft: 'auto' }}
        >
          {expanded ? '▲ Hide Inventory Matrix' : 'View Full Blood Reserves →'}
        </button>
      </div>

      {/* Expanded Inventory Matrix */}
      {expanded && (
        <div style={{ borderTop: '1px solid #f1f5f9', padding: '18px 22px', background: '#f8fafc' }}>
          {loadingInv ? (
            <div style={{ textAlign: 'center', color: '#dc2626', padding: '16px 0', fontWeight: 600 }}>Loading inventory…</div>
          ) : inventory?.error ? (
            <div style={{ color: '#dc2626', fontSize: '0.875rem' }}>Could not load hospital inventory breakdown.</div>
          ) : (
            <>
              <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 12, fontSize: '0.9rem' }}>
                Verified Blood Stock Breakdown:
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(75px, 1fr))', gap: 8 }}>
                {ALL_GROUPS.map(grp => {
                  const units = inventory?.inventoryByGroup?.[grp] ?? hospital.inventoryByGroup?.[grp] ?? 0;
                  const isMatch = grp === bloodGroup;
                  const hasStock = units > 0;

                  return (
                    <div
                      key={grp}
                      style={{
                        background: isMatch ? (hasStock ? '#ecfdf5' : '#fef2f2') : (hasStock ? '#ffffff' : '#f1f5f9'),
                        border: isMatch ? (hasStock ? '1.5px solid #059669' : '1.5px solid #dc2626') : '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '8px 6px',
                        textAlign: 'center'
                      }}
                    >
                      <div style={{ fontWeight: 800, color: isMatch ? (hasStock ? '#059669' : '#dc2626') : '#0f172a', fontSize: '0.9rem' }}>
                        {grp}
                      </div>
                      <div style={{ fontWeight: 800, fontSize: '1.1rem', color: hasStock ? '#0f172a' : '#94a3b8' }}>
                        {units}
                      </div>
                      <div style={{ fontSize: '0.65rem', color: '#64748b' }}>units</div>
                      {isMatch && (
                        <div style={{ fontSize: '0.65rem', fontWeight: 700, marginTop: 2, color: isMatch ? (hasStock ? '#059669' : '#dc2626') : '#64748b' }}>
                          ★ Target
                        </div>
                      )}
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

function SummaryBar({ results, bloodGroup }) {
  const withStock = results.filter(h => h.stockStatus !== 'out_of_stock');
  const totalExact = results.reduce((s, h) => s + h.exactMatchUnits, 0);
  const nearest = withStock[0];

  const stats = [
    { label: 'Hospitals Located', value: results.length, color: '#0f172a' },
    { label: 'Facilities with Stock', value: withStock.length, color: '#059669' },
    { label: `${bloodGroup} Units Available`, value: totalExact, color: '#dc2626' },
    { label: 'Nearest Stock Proximity', value: nearest ? `${nearest.distanceKm} km` : 'None', color: '#2563eb' },
  ];

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 14, marginBottom: 20 }}>
      {stats.map(s => (
        <div key={s.label} className="modern-card" style={{ padding: '16px', textAlign: 'center' }}>
          <div style={{ fontWeight: 800, fontSize: '1.5rem', color: s.color }}>{s.value}</div>
          <div style={{ color: '#64748b', fontSize: '0.8rem', fontWeight: 600, marginTop: 2 }}>{s.label}</div>
        </div>
      ))}
    </div>
  );
}

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
    if (!coords) { setError('Please select your location or tap Use GPS.'); return; }
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
    <div className="page-wrapper">
      <Navbar />

      <main className="content-container" style={{ maxWidth: 960 }}>
        {/* Title */}
        <div style={{ marginBottom: 28, textAlign: 'center' }}>
          <div style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: '#dc2626', fontSize: '0.8rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.04em', marginBottom: 6 }}>
            <span>📍</span> Emergency Geo-Inventory Radar
          </div>
          <h1 style={{ fontSize: '2.1rem', fontWeight: 800, color: '#0f172a', letterSpacing: '-0.02em' }}>
            Find Blood Near You
          </h1>
          <p style={{ color: '#64748b', fontSize: '1rem', maxWidth: 560, margin: '6px auto 0' }}>
            Search 102 Karnataka hospitals and blood banks for immediate blood units within up to 100 km.
          </p>
        </div>

        {/* Search Controls Card */}
        <div className="modern-card" style={{ padding: '28px', marginBottom: 24 }}>
          {/* Blood Group Selector */}
          <div style={{ marginBottom: 22 }}>
            <label className="form-label" style={{ fontSize: '0.875rem' }}>Select Required Blood Group</label>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
              {ALL_GROUPS.map(g => (
                <button
                  key={g}
                  type="button"
                  onClick={() => setBloodGroup(g)}
                  style={{
                    padding: '8px 18px',
                    borderRadius: 9999,
                    cursor: 'pointer',
                    fontWeight: 700,
                    fontSize: '0.925rem',
                    backgroundColor: bloodGroup === g ? '#dc2626' : '#ffffff',
                    color: bloodGroup === g ? '#ffffff' : '#334155',
                    border: bloodGroup === g ? '1px solid #dc2626' : '1px solid #cbd5e1',
                    boxShadow: bloodGroup === g ? '0 2px 6px rgba(220, 38, 38, 0.25)' : 'none',
                    transition: 'all 0.15s ease'
                  }}
                >
                  {g}
                </button>
              ))}
            </div>
          </div>

          {/* Location row */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 14, alignItems: 'center', marginBottom: 22 }}>
            <div>
              <label className="form-label">Auto-Detect Geolocation</label>
              <button
                type="button"
                onClick={getGPS}
                disabled={gpsLoading}
                className="btn btn-secondary"
                style={{ width: '100%', padding: '10px' }}
              >
                {gpsLoading ? '📡 Contacting GPS Satellite…' : '📡 Use Current GPS'}
              </button>
            </div>

            <div>
              <label className="form-label">Or Select Karnataka District</label>
              <select
                className="form-control"
                value={fallbackCity}
                onChange={e => handleFallbackCity(e.target.value)}
              >
                <option value="">— Choose a Karnataka City —</option>
                {CITY_PRESETS.map(c => (
                  <option key={c.label} value={c.label}>{c.label}</option>
                ))}
              </select>
            </div>

            {coords && (
              <div style={{ alignSelf: 'flex-end', paddingBottom: 6 }}>
                <span style={{ background: '#ecfdf5', color: '#059669', border: '1px solid #a7f3d0', padding: '8px 12px', borderRadius: 8, fontWeight: 700, fontSize: '0.825rem' }}>
                  ✓ Location: {fallbackCity || `${coords.lat.toFixed(3)}, ${coords.lng.toFixed(3)}`}
                </span>
              </div>
            )}
          </div>

          {gpsError && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', color: '#92400e', padding: '10px 14px', borderRadius: 8, marginBottom: 18, fontSize: '0.85rem' }}>
              ⚠️ Location permission was denied. Please pick your city from the dropdown above.
            </div>
          )}

          {/* Search Radius & Action */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 16 }}>
            <div>
              <label className="form-label">Search Radius</label>
              <div style={{ display: 'flex', gap: 8 }}>
                {RADIUS_OPTIONS.map(r => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setRadiusKm(r)}
                    style={{
                      padding: '8px 18px',
                      borderRadius: 8,
                      fontWeight: 700,
                      fontSize: '0.875rem',
                      cursor: 'pointer',
                      backgroundColor: radiusKm === r ? '#dc2626' : '#ffffff',
                      color: radiusKm === r ? '#ffffff' : '#334155',
                      border: radiusKm === r ? '1px solid #dc2626' : '1px solid #cbd5e1'
                    }}
                  >
                    {r} km
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={handleSearch}
              disabled={loading || !coords}
              className="btn btn-primary"
              style={{ padding: '12px 36px', fontSize: '1rem', fontWeight: 800 }}
            >
              {loading ? 'Searching Hospitals…' : '🔍 Find Blood Now'}
            </button>
          </div>

          {error && (
            <div style={{ background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', padding: '10px 14px', borderRadius: 8, marginTop: 16, fontWeight: 600, fontSize: '0.875rem' }}>
              ⚠️ {error}
            </div>
          )}
        </div>

        {/* Search Results */}
        {loading && <Spinner />}

        {!loading && searched && results !== null && (
          <div>
            {noStockAnywhere && (
              <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 12, padding: '18px 20px', marginBottom: 20, display: 'flex', alignItems: 'center', gap: 14 }}>
                <span style={{ fontSize: '2rem' }}>🚨</span>
                <div>
                  <div style={{ fontWeight: 800, color: '#dc2626', fontSize: '1rem' }}>No Blood Available in Radius</div>
                  <div style={{ color: '#475569', fontSize: '0.875rem', marginTop: 2 }}>
                    No exact or compatible units found. Contact hospitals directly using hotlines or expand search to 100km.
                  </div>
                </div>
              </div>
            )}

            {noHospitalsFound ? (
              <div className="modern-card" style={{ padding: '48px 24px', textAlign: 'center', color: '#64748b' }}>
                <div style={{ fontSize: '3rem', marginBottom: 10 }}>🏥</div>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.15rem' }}>No facilities found in {radiusKm} km</div>
                <p style={{ fontSize: '0.9rem', marginTop: 4 }}>Try selecting a larger search radius.</p>
              </div>
            ) : (
              <>
                <SummaryBar results={results} bloodGroup={bloodGroup} />

                <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 14, fontSize: '0.95rem' }}>
                  {results.length} hospitals located within {radiusKm} km — sorted by driving proximity:
                </div>

                {results.map(h => (
                  <HospitalCard key={h._id} hospital={h} bloodGroup={bloodGroup} />
                ))}
              </>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
