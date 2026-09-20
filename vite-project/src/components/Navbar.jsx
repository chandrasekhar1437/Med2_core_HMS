import React from 'react';
import { Stethoscope, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function Navbar({ onRefreshDoctors }) {
  const { userRole, currentUserId, isDoctorAvailable, setIsDoctorAvailable, logout } = useAuth();

  const handleToggleAvailability = async () => {
    if (!currentUserId) return;
    try {
      const res = await API.patch(`/api/users/${currentUserId}/availability`);
      setIsDoctorAvailable(res.data.is_available);
      if (onRefreshDoctors) onRefreshDoctors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update availability status');
    }
  };

  return (
    <header className="app-header no-print">
      <div className="brand">
        <Stethoscope size={24} /> MedCore HMS
      </div>
      <div className="header-actions">
        {userRole === 'doctor' && (
          <button
            onClick={handleToggleAvailability}
            className={`duty-toggle-btn ${isDoctorAvailable ? 'duty-on' : 'duty-off'}`}
            title="Click to toggle availability status"
          >
            <span className={`duty-dot ${isDoctorAvailable ? 'duty-dot-on' : 'duty-dot-off'}`}></span>
            {isDoctorAvailable ? 'Available / On-Duty' : 'Off-Duty / Away'}
          </button>
        )}
        <span className="role-badge">ROLE: {userRole.toUpperCase()}</span>
        <button onClick={logout} className="logout-btn">
          <LogOut size={16} /> Sign Out
        </button>
      </div>
    </header>
  );
}