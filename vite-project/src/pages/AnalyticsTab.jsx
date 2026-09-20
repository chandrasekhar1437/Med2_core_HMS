import React from 'react';
import { BarChart3 } from 'lucide-react';

export default function AnalyticsTab({ appointments, bills }) {
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const totalRevenue = bills
    .filter(b => b.status === 'paid')
    .reduce((acc, curr) => acc + (curr.total_amount || curr.amount || 0), 0);

  const totalBilled = bills.reduce((acc, curr) => acc + (curr.total_amount || curr.amount || 0), 0);
  const collectionRate = totalBilled > 0 ? ((totalRevenue / totalBilled) * 100).toFixed(1) : 0;

  const departmentCounts = appointments.reduce((acc, apt) => {
    const dept = apt.department || 'General';
    acc[dept] = (acc[dept] || 0) + 1;
    return acc;
  }, {});

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2 className="panel-title">
          <BarChart3 size={20} color="#2563eb" /> Executive Hospital Analytics & Reports
        </h2>
      </div>

      <div className="analytics-grid">
        <div className="metric-card">
          <div>
            <div className="metric-header">Revenue Collection Rate</div>
            <div className="metric-body">
              <span className="metric-main">{collectionRate}%</span>
              <span className="metric-sub">(₹{totalRevenue.toFixed(0)} of ₹{totalBilled.toFixed(0)})</span>
            </div>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ width: `${collectionRate}%`, backgroundColor: '#059669' }} 
            />
          </div>
        </div>

        <div className="metric-card">
          <div>
            <div className="metric-header">Appointment Completion Rate</div>
            <div className="metric-body">
              <span className="metric-main">
                {appointments.length > 0 ? ((completedCount / appointments.length) * 100).toFixed(1) : 0}%
              </span>
              <span className="metric-sub">({completedCount} of {appointments.length} completed)</span>
            </div>
          </div>
          <div className="progress-bar-bg">
            <div 
              className="progress-bar-fill" 
              style={{ 
                width: `${appointments.length > 0 ? (completedCount / appointments.length) * 100 : 0}%`, 
                backgroundColor: '#2563eb' 
              }} 
            />
          </div>
        </div>

        <div className="metric-card">
          <div className="metric-header">Consultations by Department</div>
          <div className="department-list">
            {Object.entries(departmentCounts).length === 0 ? (
              <span style={{ fontSize: '0.85rem', color: '#94a3b8' }}>No consultation records</span>
            ) : (
              Object.entries(departmentCounts).map(([dept, count]) => (
                <div key={dept} className="department-row">
                  <span className="dept-name">{dept}</span>
                  <span className="dept-count">{count} visit{count > 1 ? 's' : ''}</span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}