import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';

// Hospital pages
import HospitalDashboard from './pages/HospitalDashboard';
import InventoryPage from './pages/InventoryPage';
import RequestsPage from './pages/RequestsPage';

// Donor pages
import DonorDashboard from './pages/DonorDashboard';
import ChatbotPage from './pages/ChatbotPage';
import DonorHistoryPage from './pages/DonorHistoryPage';

// Shared pages
import MapPage from './pages/MapPage';
import AnalyticsPage from './pages/AnalyticsPage';

// Admin
import AdminPanel from './pages/AdminPanel';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && !role.split(',').includes(user.role)) return <Navigate to="/" />;
  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        {/* Public */}
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        {/* Hospital */}
        <Route path="/hospital/dashboard" element={<PrivateRoute role="hospital"><HospitalDashboard /></PrivateRoute>} />
        <Route path="/hospital/inventory" element={<PrivateRoute role="hospital"><InventoryPage /></PrivateRoute>} />
        <Route path="/hospital/requests" element={<PrivateRoute role="hospital"><RequestsPage /></PrivateRoute>} />
        <Route path="/hospital/map" element={<PrivateRoute role="hospital,admin"><MapPage /></PrivateRoute>} />
        <Route path="/hospital/analytics" element={<PrivateRoute role="hospital,admin"><AnalyticsPage /></PrivateRoute>} />

        {/* Donor */}
        <Route path="/donor/dashboard" element={<PrivateRoute role="donor"><DonorDashboard /></PrivateRoute>} />
        <Route path="/donor/chat" element={<PrivateRoute role="donor"><ChatbotPage /></PrivateRoute>} />
        <Route path="/donor/history" element={<PrivateRoute role="donor"><DonorHistoryPage /></PrivateRoute>} />
        <Route path="/donor/map" element={<PrivateRoute role="donor"><MapPage /></PrivateRoute>} />

        {/* Admin */}
        <Route path="/admin" element={<PrivateRoute role="admin"><AdminPanel /></PrivateRoute>} />
        <Route path="/admin/analytics" element={<PrivateRoute role="admin"><AnalyticsPage /></PrivateRoute>} />
        <Route path="/admin/map" element={<PrivateRoute role="admin"><MapPage /></PrivateRoute>} />
      </Routes>
    </Router>
  );
}
