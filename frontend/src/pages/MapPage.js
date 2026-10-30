import React, { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import axios from 'axios';
import { MapContainer, TileLayer, Marker, Popup, Circle, Polyline, useMap } from 'react-leaflet';
import L from 'leaflet';
import { useAuth } from '../context/AuthContext';

// Fix broken default Leaflet icons from webpack bundling
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png',
  iconUrl:       'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png',
  shadowUrl:     'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png',
});

const API_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

// Supported cities with center coordinates [lat, lng]
const CITY_COORDS = {
  'Mangalore': [12.8703, 74.8431],
  'Bangalore': [12.9716, 77.5946],
  'Udupi': [13.3409, 74.7421],
  'Mysore': [12.2958, 76.6394],
  'Mumbai': [19.0760, 72.8777],
  'Pune': [18.5204, 73.8567],
  'Chennai': [13.0827, 80.2707],
  'Coimbatore': [11.0168, 76.9558],
  'Hyderabad': [17.3850, 78.4867],
  'Kochi': [9.9312, 76.2673],
  'Thiruvananthapuram': [8.5241, 76.9366],
  'Kozhikode': [11.2588, 75.7804],
  'Visakhapatnam': [17.6868, 83.2185],
  'Ahmedabad': [23.0225, 72.5714],
  'Jaipur': [26.9124, 75.7873],
  'Lucknow': [26.8467, 80.9462],
  'Kolkata': [22.5726, 88.3639],
  'Delhi': [28.6139, 77.2090],
  'New Delhi': [28.6139, 77.2090],
  'Patna': [25.5941, 85.1376],
  'Bhopal': [23.2599, 77.4126],
  'Indore': [22.7196, 75.8577],
  'Hubli': [15.3647, 75.1240],
  'Shimoga': [13.9299, 75.5681],
  'Nagpur': [21.1458, 79.0882],
  'Nashik': [19.9975, 73.7898],
  'Dehradun': [30.3165, 78.0322],
  'Bhubaneswar': [20.2961, 85.8245],
};

const getCoords = (city, area, location) => {
  if (location?.coordinates && Array.isArray(location.coordinates)) {
    const [lng, lat] = location.coordinates;
    if (lat !== 0 && lng !== 0 && Math.abs(lat) <= 90 && Math.abs(lng) <= 180) {
      return [lat, lng];
    }
  }
  if (city && CITY_COORDS[city]) return CITY_COORDS[city];
  if (area && CITY_COORDS[area]) return CITY_COORDS[area];
  return null;
};

// Haversine formula for distance in km
function calculateDistanceKm(c1, c2) {
  if (!c1 || !c2) return 0;
  const [lat1, lon1] = c1;
  const [lat2, lon2] = c2;
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
    Math.cos((lat2 * Math.PI) / 180) *
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return Math.round(R * c * 10) / 10;
}

// Custom modern SVG Pin Icons
const createSvgPin = (bgColor, iconText, borderColor = '#ffffff') => L.divIcon({
  className: '',
  html: `<div style="
    background: ${bgColor};
    width: 32px;
    height: 32px;
    border-radius: 50% 50% 50% 0;
    transform: rotate(-45deg);
    border: 2px solid ${borderColor};
    box-shadow: 0 4px 10px rgba(0,0,0,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
    cursor: pointer;
  ">
    <span style="
      transform: rotate(45deg);
      font-size: 14px;
      line-height: 1;
      display: block;
    ">${iconText}</span>
  </div>`,
  iconSize: [32, 32],
  iconAnchor: [16, 32],
  popupAnchor: [0, -30]
});

const userLocationPin = L.divIcon({
  className: '',
  html: `<div style="
    background: #2563eb;
    width: 22px;
    height: 22px;
    border-radius: 50%;
    border: 3px solid #ffffff;
    box-shadow: 0 0 0 6px rgba(37,99,235,0.35);
    display: flex;
    align-items: center;
    justify-content: center;
  "><div style="width: 6px; height: 6px; background: white; border-radius: 50%;"></div></div>`,
  iconSize: [22, 22],
  iconAnchor: [11, 11],
  popupAnchor: [0, -11]
});

const hospitalIcon   = createSvgPin('#dc2626', '🏥');
const bloodBankIcon  = createSvgPin('#991b1b', '🩸');
const campIcon       = createSvgPin('#d97706', '🎪');
const donorAvailIcon = createSvgPin('#16a34a', '👤');
const donorUnavailIcon = createSvgPin('#64748b', '👤');

const BLOOD_GROUPS = ['All', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-'];
const URGENCY_COLORS = { critical: '#ef4444', high: '#f97316', medium: '#eab308', low: '#22c55e' };

// Component to handle smooth flyTo animations
function MapController({ flyTarget }) {
  const map = useMap();
  useEffect(() => {
    if (flyTarget?.coords) {
      map.flyTo(flyTarget.coords, flyTarget.zoom || 14, { duration: 1.2 });
    }
  }, [flyTarget, map]);
  return null;
}

export default function MapPage() {
  const { user } = useAuth();
  const [hospitals, setHospitals] = useState([]);
  const [camps, setCamps] = useState([]);
  const [donors, setDonors] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filtering state
  const [selectedCity, setSelectedCity] = useState('Mangalore');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('hospitals'); // 'hospitals' | 'camps' | 'requests' | 'donors'
  const [facilitySubFilter, setFacilitySubFilter] = useState('all'); // 'all' | 'hospital' | 'blood_bank'
  const [filterBG, setFilterBG] = useState('All');
  const [showAvailable, setShowAvailable] = useState(true);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [showCamps, setShowCamps] = useState(true);

  // Navigation / Routing state
  const [userLocation, setUserLocation] = useState(null);
  const [activeRoute, setActiveRoute] = useState(null); // { destinationName, startCoords, endCoords, distanceKm, durationMins }
  const [flyTarget, setFlyTarget] = useState({ coords: [12.8703, 74.8431], zoom: 13 });
  const [registrationMsg, setRegistrationMsg] = useState('');

  // Initial user geolocation detection
  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setUserLocation([pos.coords.latitude, pos.coords.longitude]);
        },
        () => {
          // Default to Mangalore center if denied
          setUserLocation([12.8703, 74.8431]);
        },
        { timeout: 8000 }
      );
    } else {
      setUserLocation([12.8703, 74.8431]);
    }
  }, []);

  useEffect(() => {
    fetchMapData();
  }, []);

  const fetchMapData = async () => {
    setLoading(true);
    setError('');
    try {
      const [hospRes, campRes, donorRes, reqRes] = await Promise.all([
        axios.get(`${API_URL}/hospitals`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/camps`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/donors/map`).catch(() => ({ data: [] })),
        axios.get(`${API_URL}/requests/map-active`).catch(() => ({ data: [] }))
      ]);

      setHospitals(hospRes.data || []);
      setCamps(campRes.data || []);
      setDonors(donorRes.data || []);
      setRequests(reqRes.data || []);
    } catch (err) {
      setError('Unable to load map information. Please verify your connection.');
    } finally {
      setLoading(false);
    }
  };

  // City change handler
  const handleCityChange = (cityName) => {
    setSelectedCity(cityName);
    if (cityName !== 'All' && CITY_COORDS[cityName]) {
      setFlyTarget({ coords: CITY_COORDS[cityName], zoom: 13 });
    }
  };

  // Directions generator
  const handleGetDirections = (facilityName, coords) => {
    if (!coords) return;
    const origin = userLocation || (selectedCity !== 'All' ? CITY_COORDS[selectedCity] : [12.8703, 74.8431]);
    const dist = calculateDistanceKm(origin, coords);
    const estTimeMins = Math.max(3, Math.round((dist / 30) * 60)); // Avg 30 km/h driving speed

    setActiveRoute({
      destinationName: facilityName,
      startCoords: origin,
      endCoords: coords,
      distanceKm: dist,
      durationMins: estTimeMins
    });

    // Fly to fit or center destination
    setFlyTarget({ coords, zoom: 14 });
  };

  const handleRegisterCamp = async (campId) => {
    try {
      await axios.post(`${API_URL}/camps/${campId}/register`);
      setRegistrationMsg('Registered successfully! You will receive camp updates.');
      fetchMapData();
      setTimeout(() => setRegistrationMsg(''), 4000);
    } catch (err) {
      setRegistrationMsg(err.response?.data?.message || 'Could not register for this camp.');
      setTimeout(() => setRegistrationMsg(''), 4000);
    }
  };

  // Markers processing
  const hospitalMarkers = useMemo(() => {
    return hospitals
      .map(h => ({
        ...h,
        _coords: getCoords(h.city, h.address, h.location)
      }))
      .filter(h => h._coords !== null)
      .filter(h => {
        if (selectedCity !== 'All' && h.city && h.city.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
        if (facilitySubFilter !== 'all' && h.facilityType !== facilitySubFilter) {
          return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            h.hospitalName.toLowerCase().includes(q) ||
            (h.city && h.city.toLowerCase().includes(q)) ||
            (h.address && h.address.toLowerCase().includes(q))
          );
        }
        return true;
      });
  }, [hospitals, selectedCity, facilitySubFilter, searchQuery]);

  const campMarkers = useMemo(() => {
    return camps
      .map(c => ({
        ...c,
        _coords: getCoords(c.city, c.venue, c.location)
      }))
      .filter(c => c._coords !== null)
      .filter(c => {
        if (selectedCity !== 'All' && c.city && c.city.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
        if (searchQuery) {
          const q = searchQuery.toLowerCase();
          return (
            c.campName.toLowerCase().includes(q) ||
            c.organizer.toLowerCase().includes(q) ||
            c.venue.toLowerCase().includes(q)
          );
        }
        return true;
      });
  }, [camps, selectedCity, searchQuery]);

  const donorMarkers = useMemo(() => {
    return donors
      .map(d => ({
        ...d,
        _coords: getCoords(d.city, d.area, d.location)
      }))
      .filter(d => d._coords !== null)
      .filter(d => {
        if (!showAvailable && d.isAvailable) return false;
        if (!showUnavailable && !d.isAvailable) return false;
        if (filterBG !== 'All' && d.bloodGroup !== filterBG) return false;
        if (selectedCity !== 'All' && d.city && d.city.toLowerCase() !== selectedCity.toLowerCase()) {
          return false;
        }
        return true;
      });
  }, [donors, showAvailable, showUnavailable, filterBG, selectedCity]);

  const filteredRequests = useMemo(() => {
    return requests.filter(r => {
      if (selectedCity !== 'All' && r.hospital?.city && r.hospital.city.toLowerCase() !== selectedCity.toLowerCase()) {
        return false;
      }
      return true;
    });
  }, [requests, selectedCity]);

  const backLink = user?.role === 'hospital' ? '/hospital/dashboard'
    : user?.role === 'admin' ? '/admin' : '/donor/dashboard';

  const defaultCenter = [12.8703, 74.8431];

  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column', background: '#0f172a', fontFamily: 'system-ui, -apple-system, sans-serif' }}>
      
      {/* ── Top Navigation Bar ── */}
      <header style={{
        background: 'linear-gradient(90deg, #991b1b 0%, #dc2626 100%)',
        color: 'white',
        padding: '10px 20px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        boxShadow: '0 2px 10px rgba(0,0,0,0.25)',
        zIndex: 1000,
        flexShrink: 0
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <div style={{ fontSize: '1.8rem', lineHeight: 1 }}>🗺️</div>
          <div>
            <div style={{ fontWeight: 800, fontSize: '1.15rem', letterSpacing: '-0.02em', display: 'flex', alignItems: 'center', gap: 8 }}>
              LifeLine Healthcare Map & Directory
              <span style={{ fontSize: '0.72rem', background: 'rgba(255,255,255,0.25)', padding: '2px 8px', borderRadius: 12, fontWeight: 600 }}>LIVE</span>
            </div>
            <div style={{ fontSize: '0.78rem', opacity: 0.9 }}>
              Hospitals • Blood Banks • Donation Camps • Live Donors • Emergency Routing
            </div>
          </div>
        </div>

        {/* City Filter & Search Bar */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ display: 'flex', alignItems: 'center', background: 'rgba(255,255,255,0.15)', borderRadius: 8, padding: '3px 8px' }}>
            <span style={{ fontSize: '0.85rem', marginRight: 6 }}>📍</span>
            <select
              value={selectedCity}
              onChange={(e) => handleCityChange(e.target.value)}
              style={{
                background: 'transparent',
                color: 'white',
                border: 'none',
                fontWeight: 700,
                fontSize: '0.88rem',
                outline: 'none',
                cursor: 'pointer'
              }}
            >
              <option value="All" style={{ color: '#333' }}>🌍 All Cities</option>
              {Object.keys(CITY_COORDS).sort().map(c => (
                <option key={c} value={c} style={{ color: '#333' }}>{c}</option>
              ))}
            </select>
          </div>

          <Link
            to={backLink}
            style={{
              background: 'white',
              color: '#991b1b',
              padding: '6px 14px',
              borderRadius: 6,
              fontWeight: 700,
              fontSize: '0.85rem',
              textDecoration: 'none',
              boxShadow: '0 2px 5px rgba(0,0,0,0.15)',
              display: 'flex',
              alignItems: 'center',
              gap: 6
            }}
          >
            ← Back to Dashboard
          </Link>
        </div>
      </header>

      {/* ── Route Distance & Navigation Floating Banner ── */}
      {activeRoute && (
        <div style={{
          background: 'linear-gradient(90deg, #1e3a8a 0%, #2563eb 100%)',
          color: 'white',
          padding: '8px 20px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          fontSize: '0.88rem',
          fontWeight: 600,
          boxShadow: '0 3px 12px rgba(0,0,0,0.3)',
          zIndex: 999
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ fontSize: '1.2rem' }}>🚗</span>
            <span>
              Route to <strong style={{ color: '#fef08a' }}>{activeRoute.destinationName}</strong>:
              {' '}<span style={{ background: 'rgba(255,255,255,0.2)', padding: '2px 8px', borderRadius: 4, marginLeft: 6 }}>{activeRoute.distanceKm} km</span>
              {' • '}Approx <strong>{activeRoute.durationMins} mins</strong> driving
            </span>
          </div>

          <div style={{ display: 'flex', gap: 10 }}>
            <a
              href={`https://www.google.com/maps/dir/?api=1&destination=${activeRoute.endCoords[0]},${activeRoute.endCoords[1]}`}
              target="_blank"
              rel="noreferrer"
              style={{
                background: '#fef08a',
                color: '#1e3a8a',
                padding: '4px 12px',
                borderRadius: 4,
                textDecoration: 'none',
                fontWeight: 700,
                fontSize: '0.82rem'
              }}
            >
              Open GPS Navigation ↗
            </a>
            <button
              onClick={() => setActiveRoute(null)}
              style={{
                background: 'rgba(255,255,255,0.2)',
                color: 'white',
                border: 'none',
                padding: '4px 10px',
                borderRadius: 4,
                cursor: 'pointer',
                fontWeight: 700
              }}
            >
              ✕ Clear Route
            </button>
          </div>
        </div>
      )}

      {registrationMsg && (
        <div style={{ background: '#16a34a', color: 'white', padding: '7px 20px', textAlign: 'center', fontWeight: 600, fontSize: '0.85rem' }}>
          ✓ {registrationMsg}
        </div>
      )}

      {error && (
        <div style={{ background: '#dc2626', color: 'white', padding: '6px 20px', textAlign: 'center', fontSize: '0.85rem' }}>
          {error}
        </div>
      )}

      {/* ── Main Layout: Interactive Sidebar + Map ── */}
      <div style={{ display: 'flex', flex: 1, overflow: 'hidden' }}>

        {/* ── Left Interactive Sidebar ── */}
        <aside style={{
          width: 360,
          background: '#ffffff',
          display: 'flex',
          flexDirection: 'column',
          borderRight: '1px solid #e2e8f0',
          boxShadow: '4px 0 16px rgba(0,0,0,0.06)',
          flexShrink: 0,
          zIndex: 500
        }}>

          {/* Search Input Box */}
          <div style={{ padding: '12px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ position: 'relative' }}>
              <input
                type="text"
                placeholder="Search hospitals, blood banks, camps..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  borderRadius: 6,
                  border: '1.5px solid #cbd5e1',
                  fontSize: '0.85rem',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
              <span style={{ position: 'absolute', left: 10, top: 8, color: '#94a3b8', fontSize: '0.88rem' }}>🔍</span>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  style={{ position: 'absolute', right: 8, top: 7, border: 'none', background: 'transparent', cursor: 'pointer', color: '#94a3b8', fontWeight: 700 }}
                >
                  ✕
                </button>
              )}
            </div>
          </div>

          {/* Category Tabs */}
          <div style={{ display: 'flex', background: '#f1f5f9', borderBottom: '1px solid #e2e8f0', padding: 4, gap: 4 }}>
            {[
              { id: 'hospitals', label: '🏥 Hospitals', count: hospitalMarkers.length },
              { id: 'camps', label: '🎪 Camps', count: campMarkers.length },
              { id: 'requests', label: '🚨 Urgent', count: filteredRequests.length },
              { id: 'donors', label: '👤 Donors', count: donorMarkers.length },
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                style={{
                  flex: 1,
                  padding: '7px 4px',
                  borderRadius: 6,
                  border: 'none',
                  fontSize: '0.78rem',
                  fontWeight: activeTab === tab.id ? 700 : 500,
                  background: activeTab === tab.id ? '#ffffff' : 'transparent',
                  color: activeTab === tab.id ? '#991b1b' : '#64748b',
                  boxShadow: activeTab === tab.id ? '0 1px 4px rgba(0,0,0,0.08)' : 'none',
                  cursor: 'pointer',
                  transition: 'all 0.15s ease'
                }}
              >
                {tab.label} ({tab.count})
              </button>
            ))}
          </div>

          {/* Subfilters */}
          {activeTab === 'hospitals' && (
            <div style={{ display: 'flex', padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', gap: 6 }}>
              {[
                { id: 'all', label: 'All Facilities' },
                { id: 'hospital', label: '🏥 Hospitals Only' },
                { id: 'blood_bank', label: '🩸 Blood Banks Only' },
              ].map(sub => (
                <button
                  key={sub.id}
                  onClick={() => setFacilitySubFilter(sub.id)}
                  style={{
                    padding: '4px 8px',
                    borderRadius: 14,
                    border: '1px solid',
                    borderColor: facilitySubFilter === sub.id ? '#991b1b' : '#cbd5e1',
                    background: facilitySubFilter === sub.id ? '#fef2f2' : '#ffffff',
                    color: facilitySubFilter === sub.id ? '#991b1b' : '#475569',
                    fontSize: '0.75rem',
                    fontWeight: facilitySubFilter === sub.id ? 700 : 500,
                    cursor: 'pointer'
                  }}
                >
                  {sub.label}
                </button>
              ))}
            </div>
          )}

          {activeTab === 'donors' && (
            <div style={{ padding: '8px 14px', background: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: 6 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.78rem', fontWeight: 600, color: '#475569' }}>Blood Group:</span>
                <select
                  value={filterBG}
                  onChange={(e) => setFilterBG(e.target.value)}
                  style={{ padding: '3px 8px', borderRadius: 4, border: '1px solid #cbd5e1', fontSize: '0.8rem', fontWeight: 600 }}
                >
                  {BLOOD_GROUPS.map(bg => <option key={bg} value={bg}>{bg}</option>)}
                </select>
              </div>
              <div style={{ display: 'flex', gap: 12, fontSize: '0.78rem' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#16a34a', fontWeight: 600 }}>
                  <input type="checkbox" checked={showAvailable} onChange={e => setShowAvailable(e.target.checked)} />
                  Available
                </label>
                <label style={{ display: 'flex', alignItems: 'center', gap: 4, cursor: 'pointer', color: '#64748b', fontWeight: 600 }}>
                  <input type="checkbox" checked={showUnavailable} onChange={e => setShowUnavailable(e.target.checked)} />
                  Unavailable
                </label>
              </div>
            </div>
          )}

          {/* ── Scrollable Items List ── */}
          <div style={{ flex: 1, overflowY: 'auto', padding: '10px 14px' }}>
            
            {/* 1. Hospitals & Blood Banks List */}
            {activeTab === 'hospitals' && (
              <div>
                {hospitalMarkers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 10px', fontSize: '0.85rem' }}>
                    No hospitals or blood banks match the current filter in {selectedCity}.
                  </div>
                ) : (
                  hospitalMarkers.map(h => (
                    <div
                      key={h._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 8,
                        padding: '12px',
                        marginBottom: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)',
                        transition: 'transform 0.1s ease, border-color 0.1s ease'
                      }}
                    >
                      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 8 }}>
                        <div>
                          <span style={{
                            fontSize: '0.7rem',
                            fontWeight: 700,
                            padding: '2px 7px',
                            borderRadius: 10,
                            background: h.facilityType === 'blood_bank' ? '#fef2f2' : '#eff6ff',
                            color: h.facilityType === 'blood_bank' ? '#991b1b' : '#1e40af',
                            display: 'inline-block',
                            marginBottom: 4
                          }}>
                            {h.facilityType === 'blood_bank' ? '🩸 BLOOD BANK' : '🏥 HOSPITAL'}
                          </span>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a' }}>
                            {h.hospitalName}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                        📍 {h.address || h.city}
                      </div>

                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 8 }}>
                        <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                          🕒 {h.operatingHours || '24/7'}
                        </span>
                        {h.openRequestsCount > 0 && (
                          <span style={{ fontSize: '0.72rem', background: '#fee2e2', color: '#dc2626', fontWeight: 700, padding: '2px 6px', borderRadius: 4 }}>
                            🚨 {h.openRequestsCount} Urgent Need
                          </span>
                        )}
                        {h.inventoryCount > 0 && (
                          <span style={{ fontSize: '0.72rem', background: '#f0fdf4', color: '#16a34a', fontWeight: 600, padding: '2px 6px', borderRadius: 4 }}>
                            🩸 {h.inventoryCount} units stock
                          </span>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => setFlyTarget({ coords: h._coords, zoom: 15 })}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: 5,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            color: '#334155'
                          }}
                        >
                          📍 View on Map
                        </button>
                        <button
                          onClick={() => handleGetDirections(h.hospitalName, h._coords)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: '#dc2626',
                            color: 'white',
                            border: 'none',
                            borderRadius: 5,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🚗 Directions
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 2. Donation Camps List */}
            {activeTab === 'camps' && (
              <div>
                {campMarkers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 10px', fontSize: '0.85rem' }}>
                    No donation camps scheduled in {selectedCity} at this moment.
                  </div>
                ) : (
                  campMarkers.map(c => (
                    <div
                      key={c._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #fde68a',
                        borderRadius: 8,
                        padding: '12px',
                        marginBottom: 10,
                        boxShadow: '0 1px 3px rgba(0,0,0,0.04)'
                      }}
                    >
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                        <div>
                          <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 10, background: '#fef3c7', color: '#92400e' }}>
                            🎪 DONATION CAMP
                          </span>
                          <div style={{ fontWeight: 700, fontSize: '0.92rem', color: '#0f172a', marginTop: 4 }}>
                            {c.campName}
                          </div>
                        </div>
                      </div>

                      <div style={{ fontSize: '0.8rem', color: '#475569', marginTop: 4, fontWeight: 600 }}>
                        🏢 Organized by: {c.organizer}
                      </div>

                      <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 2 }}>
                        📍 Venue: {c.venue}, {c.city}
                      </div>

                      <div style={{ display: 'flex', gap: 10, fontSize: '0.75rem', color: '#475569', marginTop: 6 }}>
                        <span>📅 {new Date(c.date).toLocaleDateString()}</span>
                        <span>🕒 {c.startTime} - {c.endTime}</span>
                      </div>

                      <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                        <span style={{ fontSize: '0.72rem', background: '#f1f5f9', color: '#475569', padding: '2px 6px', borderRadius: 4 }}>
                          🎯 Target: {c.targetUnits} units
                        </span>
                        <span style={{ fontSize: '0.72rem', background: '#ecfdf5', color: '#047857', fontWeight: 600, padding: '2px 6px', borderRadius: 4 }}>
                          👥 {c.registeredDonorsCount || 0} Donors Joined
                        </span>
                      </div>

                      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
                        <button
                          onClick={() => setFlyTarget({ coords: c._coords, zoom: 15 })}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: '#f8fafc',
                            border: '1px solid #cbd5e1',
                            borderRadius: 5,
                            fontSize: '0.78rem',
                            fontWeight: 600,
                            cursor: 'pointer'
                          }}
                        >
                          📍 Map
                        </button>
                        <button
                          onClick={() => handleGetDirections(c.campName, c._coords)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: '#d97706',
                            color: 'white',
                            border: 'none',
                            borderRadius: 5,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          🚗 Route
                        </button>
                        <button
                          onClick={() => handleRegisterCamp(c._id)}
                          style={{
                            flex: 1,
                            padding: '6px',
                            background: '#16a34a',
                            color: 'white',
                            border: 'none',
                            borderRadius: 5,
                            fontSize: '0.78rem',
                            fontWeight: 700,
                            cursor: 'pointer'
                          }}
                        >
                          Join Camp
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            )}

            {/* 3. Emergency Requests List */}
            {activeTab === 'requests' && (
              <div>
                {filteredRequests.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 10px', fontSize: '0.85rem' }}>
                    No active emergency blood requests in {selectedCity}.
                  </div>
                ) : (
                  filteredRequests.map(req => {
                    const hCoords = getCoords(req.hospital?.city, req.hospital?.address, req.hospital?.location);
                    return (
                      <div
                        key={req._id}
                        style={{
                          background: '#fff5f5',
                          border: `1.5px solid ${URGENCY_COLORS[req.urgencyLevel] || '#dc2626'}`,
                          borderRadius: 8,
                          padding: '12px',
                          marginBottom: 10
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontSize: '1.1rem', fontWeight: 800, color: '#dc2626' }}>
                            🩸 {req.bloodGroup} Needed
                          </span>
                          <span style={{
                            fontSize: '0.72rem',
                            fontWeight: 800,
                            textTransform: 'uppercase',
                            background: URGENCY_COLORS[req.urgencyLevel] || '#dc2626',
                            color: 'white',
                            padding: '2px 8px',
                            borderRadius: 10
                          }}>
                            {req.urgencyLevel}
                          </span>
                        </div>

                        <div style={{ fontWeight: 600, fontSize: '0.85rem', color: '#1e293b', marginTop: 6 }}>
                          🏥 {req.hospital?.hospitalName || 'Hospital'}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b' }}>
                          📍 {req.hospital?.city || 'Location unavailable'}
                        </div>
                        <div style={{ fontSize: '0.78rem', color: '#b91c1c', fontWeight: 600, marginTop: 4 }}>
                          Requirement: {req.unitsRequired} unit(s)
                        </div>

                        {hCoords && (
                          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                            <button
                              onClick={() => setFlyTarget({ coords: hCoords, zoom: 15 })}
                              style={{ flex: 1, padding: '5px', background: 'white', border: '1px solid #f87171', borderRadius: 4, fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer', color: '#dc2626' }}
                            >
                              Locate Hospital
                            </button>
                            <button
                              onClick={() => handleGetDirections(req.hospital.hospitalName, hCoords)}
                              style={{ flex: 1, padding: '5px', background: '#dc2626', color: 'white', border: 'none', borderRadius: 4, fontSize: '0.75rem', fontWeight: 700, cursor: 'pointer' }}
                            >
                              🚗 Navigate
                            </button>
                          </div>
                        )}
                      </div>
                    );
                  })
                )}
              </div>
            )}

            {/* 4. Donors List */}
            {activeTab === 'donors' && (
              <div>
                <div style={{ fontSize: '0.78rem', color: '#64748b', marginBottom: 8 }}>
                  Showing {donorMarkers.length} eligible donors in {selectedCity}
                </div>
                {donorMarkers.length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#94a3b8', padding: '30px 10px', fontSize: '0.85rem' }}>
                    No registered donors found matching criteria.
                  </div>
                ) : (
                  donorMarkers.slice(0, 50).map(d => (
                    <div
                      key={d._id}
                      style={{
                        background: '#ffffff',
                        border: '1px solid #e2e8f0',
                        borderRadius: 6,
                        padding: '10px',
                        marginBottom: 8,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between'
                      }}
                    >
                      <div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                          <span style={{ fontWeight: 800, color: '#dc2626', fontSize: '0.95rem' }}>{d.bloodGroup}</span>
                          <span style={{
                            fontSize: '0.68rem',
                            fontWeight: 700,
                            padding: '1px 6px',
                            borderRadius: 8,
                            background: d.isAvailable ? '#ecfdf5' : '#f1f5f9',
                            color: d.isAvailable ? '#16a34a' : '#64748b'
                          }}>
                            {d.isAvailable ? 'AVAILABLE' : 'COOLDOWN'}
                          </span>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: 2 }}>
                          📍 {d.area || d.city || 'Local area'} • {d.totalDonations || 0} donations
                        </div>
                      </div>

                      <button
                        onClick={() => setFlyTarget({ coords: d._coords, zoom: 15 })}
                        style={{
                          padding: '4px 10px',
                          background: '#f8fafc',
                          border: '1px solid #cbd5e1',
                          borderRadius: 4,
                          fontSize: '0.75rem',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        Locate
                      </button>
                    </div>
                  ))
                )}
              </div>
            )}

          </div>

          {/* Quick Refresh Button */}
          <div style={{ padding: '10px 14px', borderTop: '1px solid #e2e8f0', background: '#f8fafc' }}>
            <button
              onClick={fetchMapData}
              style={{
                width: '100%',
                padding: '8px',
                background: '#0f172a',
                color: 'white',
                border: 'none',
                borderRadius: 6,
                fontSize: '0.82rem',
                fontWeight: 700,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6
              }}
            >
              🔄 Refresh Live Map Data
            </button>
          </div>

        </aside>

        {/* ── Right Leaflet Map Container ── */}
        <main style={{ flex: 1, position: 'relative' }}>

          {/* Map Legend Overlay */}
          <div style={{
            position: 'absolute',
            bottom: 24,
            right: 20,
            background: 'rgba(255, 255, 255, 0.95)',
            backdropFilter: 'blur(6px)',
            borderRadius: 8,
            padding: '10px 14px',
            boxShadow: '0 4px 16px rgba(0,0,0,0.15)',
            zIndex: 900,
            fontSize: '0.78rem',
            display: 'flex',
            flexDirection: 'column',
            gap: 6
          }}>
            <div style={{ fontWeight: 700, color: '#0f172a', marginBottom: 2 }}>Map Symbols</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem' }}>🏥</span>
              <span style={{ color: '#334155' }}>Hospital</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem' }}>🩸</span>
              <span style={{ color: '#334155' }}>Blood Bank (Component Storage)</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: '1rem' }}>🎪</span>
              <span style={{ color: '#334155' }}>Donation Camp / Drive</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#16a34a' }}></span>
              <span style={{ color: '#334155' }}>Available Donor</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb' }}></span>
              <span style={{ color: '#334155' }}>Your Location</span>
            </div>
          </div>

          <MapContainer
            center={defaultCenter}
            zoom={12}
            style={{ height: '100%', width: '100%' }}
          >
            <TileLayer
              attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
              url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />

            <MapController flyTarget={flyTarget} />

            {/* User GPS Beacon Marker */}
            {userLocation && (
              <Marker position={userLocation} icon={userLocationPin}>
                <Popup>
                  <div style={{ textAlign: 'center', fontWeight: 700, fontSize: '0.85rem' }}>
                    📍 Your Current Location
                  </div>
                </Popup>
              </Marker>
            )}

            {/* Directions Route Polyline */}
            {activeRoute && (
              <Polyline
                positions={[activeRoute.startCoords, activeRoute.endCoords]}
                pathOptions={{
                  color: '#2563eb',
                  weight: 5,
                  opacity: 0.9,
                  dashArray: '10, 10',
                  lineCap: 'round'
                }}
              />
            )}

            {/* 🏥 Hospitals & Blood Banks Markers */}
            {hospitalMarkers.map(h => (
              <Marker
                key={h._id}
                position={h._coords}
                icon={h.facilityType === 'blood_bank' ? bloodBankIcon : hospitalIcon}
              >
                <Popup>
                  <div style={{ minWidth: 200, padding: 4 }}>
                    <div style={{
                      fontSize: '0.68rem',
                      fontWeight: 700,
                      color: h.facilityType === 'blood_bank' ? '#991b1b' : '#1e40af',
                      textTransform: 'uppercase'
                    }}>
                      {h.facilityType === 'blood_bank' ? '🩸 BLOOD BANK' : '🏥 HOSPITAL'}
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', margin: '2px 0 4px' }}>
                      {h.hospitalName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      📍 {h.address || h.city}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: 4 }}>
                      📞 <strong>{h.phone || '0824-2444590'}</strong>
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>
                      🕒 {h.operatingHours || '24/7 Service'}
                    </div>

                    {h.openRequestsCount > 0 && (
                      <div style={{ marginTop: 6, padding: '3px 6px', background: '#fee2e2', color: '#b91c1c', borderRadius: 4, fontWeight: 700, fontSize: '0.75rem' }}>
                        🚨 {h.openRequestsCount} Active Blood Request(s)
                      </div>
                    )}

                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button
                        onClick={() => handleGetDirections(h.hospitalName, h._coords)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: '#dc2626',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        🚗 Get Directions
                      </button>
                      <a
                        href={`https://www.google.com/maps/dir/?api=1&destination=${h._coords[0]},${h._coords[1]}`}
                        target="_blank"
                        rel="noreferrer"
                        style={{
                          padding: '6px 8px',
                          background: '#2563eb',
                          color: 'white',
                          textDecoration: 'none',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          display: 'flex',
                          alignItems: 'center'
                        }}
                      >
                        GPS ↗
                      </a>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 🎪 Donation Camps Markers */}
            {campMarkers.map(c => (
              <Marker
                key={c._id}
                position={c._coords}
                icon={campIcon}
              >
                <Popup>
                  <div style={{ minWidth: 200, padding: 4 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 700, color: '#92400e', textTransform: 'uppercase' }}>
                      🎪 DONATION CAMP
                    </div>
                    <div style={{ fontWeight: 800, fontSize: '0.98rem', color: '#0f172a', margin: '2px 0 4px' }}>
                      {c.campName}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b' }}>
                      📍 {c.venue}, {c.city}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#475569', marginTop: 4 }}>
                      🏢 Organized by: <strong>{c.organizer}</strong>
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#047857', marginTop: 2, fontWeight: 600 }}>
                      📅 {new Date(c.date).toLocaleDateString()} • {c.startTime}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#334155', marginTop: 2 }}>
                      🎯 Target: {c.targetUnits} units ({c.registeredDonorsCount || 0} joined)
                    </div>

                    <div style={{ display: 'flex', gap: 6, marginTop: 10 }}>
                      <button
                        onClick={() => handleGetDirections(c.campName, c._coords)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: '#d97706',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        🚗 Directions
                      </button>
                      <button
                        onClick={() => handleRegisterCamp(c._id)}
                        style={{
                          flex: 1,
                          padding: '6px 8px',
                          background: '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: 4,
                          fontWeight: 700,
                          fontSize: '0.78rem',
                          cursor: 'pointer'
                        }}
                      >
                        Join Camp
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

            {/* 👤 Live Donors Markers */}
            {donorMarkers.map(d => (
              <Marker
                key={d._id}
                position={d._coords}
                icon={d.isAvailable ? donorAvailIcon : donorUnavailIcon}
              >
                <Popup>
                  <div style={{ padding: 4, textAlign: 'center' }}>
                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#dc2626' }}>
                      🩸 {d.bloodGroup}
                    </div>
                    <div style={{
                      fontSize: '0.72rem',
                      fontWeight: 700,
                      color: d.isAvailable ? '#16a34a' : '#64748b',
                      marginTop: 2
                    }}>
                      {d.isAvailable ? '✓ Ready to Donate' : '⏳ In Cooldown'}
                    </div>
                    <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: 4 }}>
                      📍 {d.area || d.city || 'Local donor'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#475569', marginTop: 2 }}>
                      Completed donations: {d.totalDonations || 0}
                    </div>
                  </div>
                </Popup>
              </Marker>
            ))}

          </MapContainer>
        </main>
      </div>

    </div>
  );
}
