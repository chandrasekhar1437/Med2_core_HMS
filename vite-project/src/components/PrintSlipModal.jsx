import React from 'react';
import { Printer } from 'lucide-react';

export default function PrintSlipModal({ record, onClose }) {
  if (!record) return null;

  return (
    <div className="modal-overlay">
      <div className="modal-content printable-slip" style={{ maxWidth: '600px' }}>
        <div className="rx-header">
          <div>
            <h2 style={{ margin: 0, color: '#2563eb', fontSize: '1.25rem', fontWeight: 800 }}>MedCore Hospital & Clinics</h2>
            <div style={{ fontSize: '0.75rem', color: '#64748b' }}>Clinical Consultation & Prescription Slip</div>
          </div>
          <div className="rx-symbol">℞</div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.8rem', marginBottom: '1rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem' }}>
          <div><strong>Patient ID:</strong> {record.patient_id}</div>
          <div><strong>Date:</strong> {new Date(record.created_at).toLocaleDateString()}</div>
          <div><strong>Diagnosis:</strong> {record.diagnosis}</div>
          <div><strong>Symptoms:</strong> {record.symptoms?.join(', ') || 'N/A'}</div>
        </div>

        <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
            Medication Order & Regimen
          </div>
          <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'pre-wrap' }}>
            {record.prescription}
          </div>
        </div>

        {record.notes && (
          <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1.5rem' }}>
            <strong>Doctor's Advice:</strong> {record.notes}
          </div>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
          <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Generated via MedCore Digital Health System</div>
          <div style={{ textAlign: 'right', fontSize: '0.8rem', fontWeight: 700 }}>Authorized Physician Signature</div>
        </div>

        <div className="btn-row no-print" style={{ marginTop: '1.5rem' }}>
          <button onClick={onClose} className="btn-secondary">Close</button>
          <button onClick={() => window.print()} className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
            <Printer size={15} /> Print Slip
          </button>
        </div>
      </div>
    </div>
  );
}