import React, { useState } from 'react';
import { UserPlus, Users, Search, Trash2 } from 'lucide-react';
import API from '../api/axios';

export default function UsersTab({ allUsers, onRefresh, onRefreshDoctors }) {
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('doctor');
  const [staffContact, setStaffContact] = useState('');

  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  const handleCreateStaff = async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/users/staff', {
        full_name: staffName,
        email: staffEmail,
        password: staffPassword,
        role: staffRole,
        contact_number: staffContact
      });
      alert(`${staffRole.toUpperCase()} registered successfully!`);
      setStaffName('');
      setStaffEmail('');
      setStaffPassword('');
      setStaffContact('');
      onRefresh();
      if (staffRole === 'doctor') onRefreshDoctors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register staff');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await API.delete(`/api/users/${userId}`);
      alert('User deleted successfully');
      onRefresh();
      onRefreshDoctors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  const handleToggleAvailability = async (targetUserId) => {
    try {
      await API.patch(`/api/users/${targetUserId}/availability`);
      onRefresh();
      onRefreshDoctors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update availability status');
    }
  };

  const filteredUsers = allUsers.filter((u) => {
    const matchesRole = userRoleFilter === 'all' || u.role?.toLowerCase() === userRoleFilter.toLowerCase();
    const query = userSearch.toLowerCase();
    const matchesQuery =
      u.full_name?.toLowerCase().includes(query) ||
      u.email?.toLowerCase().includes(query) ||
      u.id?.toLowerCase().includes(query) ||
      u.contact_number?.toLowerCase().includes(query);
    return matchesRole && matchesQuery;
  });

  return (
    <div style={{ display: 'grid', gridTemplateColumns: '380px 1fr', gap: '1.5rem' }}>
      <div className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">
            <UserPlus size={20} color="#2563eb" /> Add Medical Staff
          </h2>
        </div>
        <form onSubmit={handleCreateStaff}>
          <div className="form-group">
            <label className="form-label">Full Name</label>
            <input
              type="text"
              required
              placeholder="Dr. Gregory House"
              value={staffName}
              onChange={(e) => setStaffName(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Email</label>
            <input
              type="email"
              required
              placeholder="staff@medcore.com"
              value={staffEmail}
              onChange={(e) => setStaffEmail(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input
              type="password"
              required
              placeholder="••••••••"
              value={staffPassword}
              onChange={(e) => setStaffPassword(e.target.value)}
              className="form-input"
            />
          </div>
          <div className="form-group">
            <label className="form-label">Role</label>
            <select
              value={staffRole}
              onChange={(e) => setStaffRole(e.target.value)}
              className="form-select"
            >
              <option value="doctor">Doctor</option>
              <option value="admin">Administrator</option>
            </select>
          </div>
          <div className="form-group">
            <label className="form-label">Contact Number</label>
            <input
              type="text"
              required
              placeholder="+1 (555) 019-2834"
              value={staffContact}
              onChange={(e) => setStaffContact(e.target.value)}
              className="form-input"
            />
          </div>
          <button type="submit" className="btn-primary">
            Create Account
          </button>
        </form>
      </div>

      <div className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">
            <Users size={20} color="#2563eb" /> Hospital User Directory
          </h2>
          <button onClick={onRefresh} className="refresh-btn">Refresh Directory</button>
        </div>

        <div className="directory-toolbar">
          <div className="directory-search">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Filter by name, email, contact, or ID..."
              value={userSearch}
              onChange={(e) => setUserSearch(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="role-pill-group">
            {['all', 'doctor', 'patient', 'admin'].map((role) => (
              <button
                key={role}
                type="button"
                onClick={() => setUserRoleFilter(role)}
                className={`role-pill ${userRoleFilter === role ? 'active' : ''}`}
              >
                {role === 'all' ? `All (${allUsers.length})` : `${role.charAt(0).toUpperCase() + role.slice(1)}s`}
              </button>
            ))}
          </div>
        </div>

        <div className="user-table-wrapper">
          <table className="user-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Availability</th>
                <th>Action</th>
              </tr>
            </thead>
            <tbody>
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: '#94a3b8' }}>
                    No users found matching the selected criteria.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((u) => (
                  <tr key={u.id}>
                    <td>
                      <strong>{u.full_name || 'N/A'}</strong>
                      <div style={{ fontSize: '0.75rem', color: '#64748b' }}>{u.contact_number || 'No phone'}</div>
                    </td>
                    <td>{u.email}</td>
                    <td>
                      <span className="badge-status" style={{ 
                        backgroundColor: u.role === 'doctor' ? '#e0e7ff' : u.role === 'admin' ? '#fef3c7' : '#ecfdf5',
                        color: u.role === 'doctor' ? '#3730a3' : u.role === 'admin' ? '#92400e' : '#065f46'
                      }}>
                        {u.role}
                      </span>
                    </td>
                    <td>
                      {u.role === 'doctor' ? (
                        <button
                          onClick={() => handleToggleAvailability(u.id)}
                          className={`duty-toggle-btn ${u.is_available !== false ? 'duty-on' : 'duty-off'}`}
                          style={{ padding: '0.2rem 0.5rem', fontSize: '0.7rem' }}
                        >
                          <span className={`duty-dot ${u.is_available !== false ? 'duty-dot-on' : 'duty-dot-off'}`}></span>
                          {u.is_available !== false ? 'On-Duty' : 'Off-Duty'}
                        </button>
                      ) : (
                        <span style={{ color: '#94a3b8', fontSize: '0.75rem' }}>—</span>
                      )}
                    </td>
                    <td>
                      <button
                        onClick={() => handleDeleteUser(u.id)}
                        className="btn-danger-small"
                      >
                        <Trash2 size={12} /> Remove
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}