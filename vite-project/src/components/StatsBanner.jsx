import React from 'react';
import { User, Activity, ShieldAlert } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function StatsBanner({ appointments, records, bills, allUsers }) {
  const { userRole } = useAuth();

  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const unpaidBillsCount = bills.filter(b => b.status === 'pending' || b.status === 'unpaid').length;
  const totalRevenue = bills
    .filter(b => b.status === 'paid')
    .reduce((acc, curr) => acc + (curr.total_amount || curr.amount || 0), 0);

  return (
    <section className="dashboard-banner no-print">
      <div className="banner-card">
        <div className="banner-info">
          {userRole === 'patient' && (
            <>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <User color="#2563eb" /> Patient Care Portal
              </h1>
              <p>Manage appointments, view clinical prescriptions, and settle hospital bills.</p>
            </>
          )}
          {userRole === 'doctor' && (
            <>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Activity color="#059669" /> Doctor Clinical Workstation
              </h1>
              <p>Review patient queue, issue medical prescriptions (Rx), and track consultations.</p>
            </>
          )}
          {userRole === 'admin' && (
            <>
              <h1 style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <ShieldAlert color="#4f46e5" /> Hospital Administration & Operations
              </h1>
              <p>Hospital master schedule control, financial billing, staff management, and analytics.</p>
            </>
          )}
        </div>

        <div className="stats-grid">
          {userRole === 'doctor' && (
            <>
              <div className="stat-box">
                <div className="stat-label">Queue</div>
                <div className="stat-value">{appointments.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Rx Issued</div>
                <div className="stat-value" style={{ color: '#2563eb' }}>{records.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Completed</div>
                <div className="stat-value" style={{ color: '#059669' }}>{completedCount}</div>
              </div>
            </>
          )}
          {userRole === 'patient' && (
            <>
              <div className="stat-box">
                <div className="stat-label">Appointments</div>
                <div className="stat-value">{appointments.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Prescriptions</div>
                <div className="stat-value">{records.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Pending Bills</div>
                <div className="stat-value" style={{ color: unpaidBillsCount > 0 ? '#dc2626' : '#059669' }}>
                  {unpaidBillsCount}
                </div>
              </div>
            </>
          )}
          {userRole === 'admin' && (
            <>
              <div className="stat-box">
                <div className="stat-label">Total Visits</div>
                <div className="stat-value">{appointments.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Registered Users</div>
                <div className="stat-value">{allUsers.length}</div>
              </div>
              <div className="stat-box">
                <div className="stat-label">Collected</div>
                <div className="stat-value" style={{ color: '#059669' }}>₹{totalRevenue.toFixed(0)}</div>
              </div>
            </>
          )}
        </div>
      </div>
    </section>
  );
}