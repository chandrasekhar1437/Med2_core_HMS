import React, { useState } from 'react';
import { FileText } from 'lucide-react';
import API from '../api/axios';

export default function PrescriptionModal({ patientId, onClose, onSuccess }) {
  const [diagnosis, setDiagnosis] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('Routine Consultation');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/records/', {
        patient_id: patientId,
        diagnosis,
        symptoms: symptomsInput.split(',').map((s) => s.trim()).filter(Boolean),
        prescription,
        notes: notes || 'Clinical consultation visit'
      });
      alert('Prescription created and sent to patient email!');
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save record');
    }
  };

  return (
    <div className="modal-overlay no-print">
      <div className="modal-content">
        <h3 className="panel-title" style={{ marginBottom: '0.5rem' }}>
          <FileText color="#2563eb" /> Issue Doctor Prescription
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
          Patient Reference: {patientId}
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Clinical Diagnosis</label>
            <input
              type="text"
              required
              placeholder="e.g. Mild Hypertension, Sinus Tachycardia"
              value={diagnosis}
              onChange={(e) => setDiagnosis(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Symptoms (Comma Separated)</label>
            <input
              type="text"
              placeholder="e.g. Dizziness, Elevated BP, Fatigue"
              value={symptomsInput}
              onChange={(e) => setSymptomsInput(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Prescription (Medications & Dosage)</label>
            <textarea
              required
              rows={3}
              placeholder="e.g. Amlodipine 5mg - 1 tab daily morning after breakfast for 30 days."
              value={prescription}
              onChange={(e) => setPrescription(e.target.value)}
              className="form-textarea"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Clinical / Lifestyle Notes</label>
            <input
              type="text"
              placeholder="e.g. Low sodium diet; recheck blood pressure in 30 days."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="btn-row">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
              Save & Issue Prescription
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}