import React from 'react';
import { Pill, Printer } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function PrescriptionsTab({ records, onRefresh, onPrint }) {
  const { userRole } = useAuth();

  return (
    <div className="panel-card">
      <div className="panel-header">
        <h2 className="panel-title">
          <Pill size={20} color="#2563eb" /> 
          {userRole === 'doctor' ? 'Clinical Prescriptions Registry' : 'My Prescriptions & Regimen'}
        </h2>
        <button onClick={onRefresh} className="refresh-btn">Refresh Prescriptions</button>
      </div>

      {records.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
          No medical prescriptions on file.
        </div>
      ) : (
        <div className="records-list">
          {records.map((rec) => (
            <div key={rec.id} className="record-item">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>
                    Diagnosis: {rec.diagnosis}
                  </h4>
                  {userRole === 'doctor' && (
                    <span style={{ fontSize: '0.75rem', color: '#2563eb', fontWeight: 600 }}>
                      Patient ID: {rec.patient_id}
                    </span>
                  )}
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>
                    {rec.created_at ? new Date(rec.created_at).toLocaleDateString() : 'Recent'}
                  </span>
                  <button onClick={() => onPrint(rec)} className="print-btn">
                    <Printer size={13} /> Print Rx Slip
                  </button>
                </div>
              </div>
              
              {rec.symptoms && rec.symptoms.length > 0 && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.35rem' }}>
                  Reported Symptoms: {rec.symptoms.join(', ')}
                </div>
              )}

              <div className="record-prescription-box">
                <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.25rem' }}>
                  Prescription & Dosage Schedule (Rx)
                </div>
                <p style={{ margin: 0, color: '#1e293b', fontWeight: 600 }}>{rec.prescription}</p>
              </div>

              {rec.notes && (
                <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.5rem' }}>
                  Physician Notes: {rec.notes}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}