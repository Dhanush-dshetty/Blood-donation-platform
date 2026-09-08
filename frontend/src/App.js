import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { useAuth } from './context/AuthContext';

import LandingPage from './pages/LandingPage';
import LoginPage from './pages/LoginPage';
import RegisterPage from './pages/RegisterPage';
import HospitalDashboard from './pages/HospitalDashboard';
import DonorDashboard from './pages/DonorDashboard';
import InventoryPage from './pages/InventoryPage';
import RequestsPage from './pages/RequestsPage';
import ChatbotPage from './pages/ChatbotPage';

const PrivateRoute = ({ children, role }) => {
  const { user, loading } = useAuth();
  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading...</div>;
  if (!user) return <Navigate to="/login" />;
  if (role && user.role !== role) return <Navigate to="/" />;
  return children;
};

export default function App() {
  return (
    <Router>
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
        <Route path="/hospital/dashboard" element={
          <PrivateRoute role="hospital"><HospitalDashboard /></PrivateRoute>
        } />
        <Route path="/hospital/inventory" element={
          <PrivateRoute role="hospital"><InventoryPage /></PrivateRoute>
        } />
        <Route path="/hospital/requests" element={
          <PrivateRoute role="hospital"><RequestsPage /></PrivateRoute>
        } />
        <Route path="/donor/dashboard" element={
          <PrivateRoute role="donor"><DonorDashboard /></PrivateRoute>
        } />
        <Route path="/donor/chat" element={
          <PrivateRoute role="donor"><ChatbotPage /></PrivateRoute>
        } />
      </Routes>
    </Router>
  );
}
