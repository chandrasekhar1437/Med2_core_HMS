import React, { useState } from 'react';
import { Edit3 } from 'lucide-react';
import API from '../api/axios';

export default function EditAppointmentModal({ appointment, onClose, onSuccess }) {
  const [editStatus, setEditStatus] = useState(appointment.status || 'scheduled');
  const [editDate, setEditDate] = useState(
    appointment.appointment_date ? new Date(appointment.appointment_date).toISOString().slice(0, 16) : ''
  );

  const handleSave = async (e) => {
    e.preventDefault();
    try {
      const payload = { status: editStatus };
      if (editDate) payload.appointment_date = new Date(editDate).toISOString();

      await API.patch(`/api/appointments/${appointment.id}`, payload);
      alert('Appointment updated successfully!');
      onSuccess();
      onClose();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update appointment');
    }
  };

  return (
    <div className="modal-overlay no-print">
      <div className="modal-content">
        <h3 className="panel-title" style={{ marginBottom: '0.5rem' }}>
          <Edit3 color="#2563eb" /> Edit & Reschedule Appointment
        </h3>
        <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
          Reference ID: {appointment.id}
        </p>

        <form onSubmit={handleSave}>
          <div className="form-group">
            <label className="form-label">Consultation Reason</label>
            <input
              type="text"
              disabled
              value={appointment.reason || ''}
              className="form-input"
              style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }}
            />
          </div>

          <div className="form-group">
            <label className="form-label">Reschedule Date & Time</label>
            <input
              type="datetime-local"
              required
              value={editDate}
              onChange={(e) => setEditDate(e.target.value)}
              className="form-input"
            />
          </div>

          <div className="form-group">
            <label className="form-label">Status</label>
            <select
              value={editStatus}
              onChange={(e) => setEditStatus(e.target.value)}
              className="form-select"
            >
              <option value="scheduled">Scheduled</option>
              <option value="completed">Completed</option>
              <option value="cancelled">Cancelled</option>
            </select>
          </div>

          <div className="btn-row">
            <button type="button" onClick={onClose} className="btn-secondary">
              Cancel
            </button>
            <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}