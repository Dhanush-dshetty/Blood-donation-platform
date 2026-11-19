import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';
import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HospitalDashboard from './pages/HospitalDashboard';
import InventoryPage from './pages/InventoryPage';
import RequestsPage from './pages/RequestsPage';
import DonorDashboard from './pages/DonorDashboard';
import ChatbotPage from './pages/ChatbotPage';
import DonorHistoryPage from './pages/DonorHistoryPage';
import MapPage from './pages/MapPage';
import AnalyticsPage from './pages/AnalyticsPage';
import AdminPanel from './pages/AdminPanel';
import BloodSafetyPage from './pages/BloodSafetyPage';
import BloodFinderPage from './pages/BloodFinderPage';
import HospitalNetworkPage from './pages/HospitalNetworkPage';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
      <div style={{ textAlign: 'center' }}>
        <div style={{ width: 44, height: 44, border: '4px solid #fecaca', borderTopColor: '#dc2626', borderRadius: '50%', margin: '0 auto 16px', animation: 'spin 0.8s linear infinite' }} />
        <div style={{ fontWeight: 700, color: '#0f172a', fontSize: '1rem' }}>Verifying Session Credentials...</div>
        <div style={{ fontSize: '0.825rem', color: '#64748b', marginTop: 4 }}>Accessing BloodPlatform Clinical Gateway</div>
        <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
      </div>
    </div>
  );
  if (!user) return <Navigate to="/login" />;
  if (role && !role.split(',').includes(user.role)) return <Navigate to="/" />;
  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/"            element={<LandingPage />} />
        <Route path="/login"       element={<LoginPage />} />
        <Route path="/register"    element={<RegisterPage />} />
        <Route path="/find-blood"  element={<BloodFinderPage />} />

        {/* Hospital */}
        <Route path="/hospital/dashboard"    element={<PrivateRoute role="hospital"><HospitalDashboard /></PrivateRoute>} />
        <Route path="/hospital/network"      element={<PrivateRoute role="hospital"><HospitalNetworkPage /></PrivateRoute>} />
        <Route path="/hospital/inventory"    element={<PrivateRoute role="hospital"><InventoryPage /></PrivateRoute>} />
        <Route path="/hospital/requests"     element={<PrivateRoute role="hospital"><RequestsPage /></PrivateRoute>} />
        <Route path="/hospital/blood-safety" element={<PrivateRoute role="hospital"><BloodSafetyPage /></PrivateRoute>} />
        <Route path="/hospital/map"          element={<PrivateRoute role="hospital,admin"><MapPage /></PrivateRoute>} />
        <Route path="/hospital/analytics"    element={<PrivateRoute role="hospital,admin"><AnalyticsPage /></PrivateRoute>} />

        {/* Donor */}
        <Route path="/donor/dashboard"  element={<PrivateRoute role="donor"><DonorDashboard /></PrivateRoute>} />
        <Route path="/donor/find-blood" element={<PrivateRoute role="donor"><BloodFinderPage /></PrivateRoute>} />
        <Route path="/donor/history"    element={<PrivateRoute role="donor"><DonorHistoryPage /></PrivateRoute>} />
        <Route path="/donor/chat"       element={<PrivateRoute role="donor"><ChatbotPage /></PrivateRoute>} />
        <Route path="/donor/map"        element={<PrivateRoute role="donor"><MapPage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin"           element={<PrivateRoute role="admin"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/analytics" element={<PrivateRoute role="admin"><AnalyticsPage /></PrivateRoute>} />
        <Route path="/admin/map"       element={<PrivateRoute role="admin"><MapPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}
