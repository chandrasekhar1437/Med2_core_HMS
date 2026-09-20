import React, { useState } from 'react';
import { Calendar, Clock, Search, Check, FileText, Edit3, Trash2, X } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function AppointmentsTab({
  appointments,
  doctors,
  onRefresh,
  onOpenPrescription,
  onSelectPatientToBill
}) {
  const { userRole } = useAuth();

  // Booking Form State
  const [doctorId, setDoctorId] = useState(doctors.length > 0 ? doctors[0].id : '');
  const [date, setDate] = useState('');
  const [department, setDepartment] = useState('Cardiology');
  const [reason, setReason] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  // Edit Modal State
  const [editingApt, setEditingApt] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('scheduled');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  const handleBook = async (e) => {
    e.preventDefault();
    if (isSubmitting) return;

    setIsSubmitting(true);
    setStatusMessage('');
    setIsError(false);

    try {
      await API.post('/api/appointments/', {
        doctor_id: doctorId || (doctors[0] && doctors[0].id),
        appointment_date: new Date(date).toISOString(),
        department,
        reason,
      });
      setStatusMessage('Appointment booked successfully!');
      setDate('');
      setReason('');
      onRefresh();
    } catch (err) {
      setIsError(true);
      setStatusMessage(err.response?.data?.detail || 'Booking failed');
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateStatus = async (appointmentId, newStatus) => {
    try {
      await API.patch(`/api/appointments/${appointmentId}`, { status: newStatus });
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleDelete = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to delete this scheduled appointment?')) return;
    try {
      await API.delete(`/api/appointments/${appointmentId}`);
      alert('Appointment deleted successfully!');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete appointment');
    }
  };

  const handleOpenEditModal = (apt) => {
    setEditingApt(apt);
    setEditStatus(apt.status || 'scheduled');
    // Format to yyyy-MM-ddThh:mm for datetime-local
    if (apt.appointment_date) {
      const d = new Date(apt.appointment_date);
      d.setMinutes(d.getMinutes() - d.getTimezoneOffset());
      setEditDate(d.toISOString().slice(0, 16));
    } else {
      setEditDate('');
    }
  };

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editingApt || isSavingEdit) return;

    setIsSavingEdit(true);
    try {
      const payload = { status: editStatus };
      if (editDate) {
        payload.appointment_date = new Date(editDate).toISOString();
      }
      await API.patch(`/api/appointments/${editingApt.id}`, payload);
      setEditingApt(null);
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update appointment');
    } finally {
      setIsSavingEdit(false);
    }
  };

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch =
      apt.reason?.toLowerCase().includes(query) ||
      apt.department?.toLowerCase().includes(query) ||
      apt.patient_id?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

  return (
    <>
      {userRole === 'patient' && (
        <div className="panel-card">
          <div className="panel-header">
            <h2 className="panel-title">
              <Calendar size={20} color="#2563eb" /> Book Appointment
            </h2>
          </div>

          {statusMessage && (
            <div className={`alert-box ${isError ? 'alert-danger' : 'alert-success'}`}>
              {statusMessage}
            </div>
          )}

          <form onSubmit={handleBook}>
            <div className="form-group">
              <label className="form-label">Available Doctors</label>
              {doctors.length === 0 ? (
                <div style={{ fontSize: '0.85rem', color: '#b91c1c', padding: '0.5rem 0' }}>
                  No doctors currently available. Please check back later.
                </div>
              ) : (
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="form-select"
                  disabled={isSubmitting}
                >
                  {doctors.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.full_name} ({d.department || 'General Medicine'})
                    </option>
                  ))}
                </select>
              )}
            </div>

            <div className="form-group">
              <label className="form-label">Department</label>
              <input
                type="text"
                required
                value={department}
                onChange={(e) => setDepartment(e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Date & Time</label>
              <input
                type="datetime-local"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="form-input"
                disabled={isSubmitting}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Reason</label>
              <textarea
                required
                rows={3}
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="Describe symptoms..."
                className="form-textarea"
                disabled={isSubmitting}
              />
            </div>

            <button
              type="submit"
              className="btn-primary"
              disabled={doctors.length === 0 || isSubmitting}
            >
              {isSubmitting ? 'Booking...' : 'Confirm Appointment'}
            </button>
          </form>
        </div>
      )}

      <div className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">
            <Clock size={20} color="#2563eb" />
            {userRole === 'doctor' ? 'Assigned Patient Consultations' : userRole === 'admin' ? 'Hospital Master Schedule' : 'My Appointments'}
          </h2>
          <button onClick={onRefresh} className="refresh-btn">Refresh</button>
        </div>

        <div className="filter-bar">
          <div className="search-input-wrapper">
            <Search size={16} className="search-icon" />
            <input
              type="text"
              placeholder="Search by reason, department, or Patient ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="form-input"
            />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
            <option value="all">All Statuses</option>
            <option value="scheduled">Scheduled</option>
            <option value="completed">Completed</option>
            <option value="cancelled">Cancelled</option>
          </select>
        </div>

        {filteredAppointments.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
            No appointments found matching your search.
          </div>
        ) : (
          <div className="appointment-list">
            {filteredAppointments.map((apt) => {
              const isScheduled = apt.status?.toLowerCase() === 'scheduled';

              return (
                <div key={apt.id} className="appointment-item">
                  <div>
                    <h3 className="apt-reason">{apt.reason}</h3>
                    <div className="apt-meta">
                      Department: <strong style={{ color: '#334155' }}>{apt.department}</strong> • Date: <strong style={{ color: '#334155' }}>{new Date(apt.appointment_date).toLocaleString()}</strong>
                    </div>
                    {apt.patient_id && (
                      <div
                        className="apt-patient-id"
                        onClick={() => onSelectPatientToBill && onSelectPatientToBill(apt.patient_id)}
                        style={{ cursor: 'pointer' }}
                        title="Click to bill this patient"
                      >
                        Patient ID: <u>{apt.patient_id}</u>
                      </div>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flexWrap: 'wrap' }}>
                    <span className={`badge-status ${
                      apt.status === 'completed' ? 'status-completed' :
                      apt.status === 'cancelled' ? 'status-cancelled' : 'status-scheduled'
                    }`}>
                      {apt.status}
                    </span>

                    {userRole === 'doctor' && (
                      <>
                        {isScheduled && (
                          <button
                            onClick={() => updateStatus(apt.id, 'completed')}
                            className="btn-action-small"
                            style={{ backgroundColor: '#059669', color: '#ffffff' }}
                          >
                            <Check size={14} /> Complete
                          </button>
                        )}
                        <button
                          onClick={() => onOpenPrescription(apt.patient_id)}
                          className="btn-action-small"
                          style={{ backgroundColor: '#2563eb', color: '#ffffff' }}
                        >
                          <FileText size={14} /> Add Prescription (Rx)
                        </button>
                      </>
                    )}

                    <button
                      onClick={() => handleOpenEditModal(apt)}
                      className="btn-edit-small"
                      title="Edit or Reschedule"
                    >
                      <Edit3 size={13} /> Edit
                    </button>

                    {/* Delete is visible only when appointment is scheduled, or for Admins */}
                    {(userRole === 'admin' || isScheduled) && (
                      <button
                        onClick={() => handleDelete(apt.id)}
                        className="btn-delete-small"
                        title="Delete Scheduled Appointment"
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Edit & Reschedule Modal */}
      {editingApt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(15, 23, 42, 0.45)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 50,
          backdropFilter: 'blur(2px)'
        }}>
          <div style={{
            backgroundColor: '#ffffff',
            borderRadius: '16px',
            padding: '1.75rem',
            width: '100%',
            maxWidth: '460px',
            boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
            position: 'relative'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
              <h3 style={{ fontSize: '1.15rem', fontWeight: '700', color: '#1e293b', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="#2563eb" /> Edit & Reschedule Appointment
              </h3>
              <button
                onClick={() => setEditingApt(null)}
                style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}
              >
                <X size={20} />
              </button>
            </div>

            <form onSubmit={handleSaveEdit}>
              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>CONSULTATION REASON</label>
                <div style={{ fontSize: '0.95rem', fontWeight: 500, color: '#1e293b', padding: '0.25rem 0' }}>
                  {editingApt.reason}
                </div>
              </div>

              <div className="form-group" style={{ marginBottom: '1rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>RESCHEDULE DATE & TIME</label>
                <input
                  type="datetime-local"
                  value={editDate}
                  onChange={(e) => setEditDate(e.target.value)}
                  className="form-input"
                  style={{ width: '100%' }}
                />
              </div>

              <div className="form-group" style={{ marginBottom: '1.5rem' }}>
                <label className="form-label" style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>STATUS</label>
                <select
                  value={editStatus}
                  onChange={(e) => setEditStatus(e.target.value)}
                  className="form-select"
                  style={{ width: '100%' }}
                >
                  <option value="scheduled">Scheduled</option>
                  <option value="cancelled">Cancelled</option>
                  
                  {/* COMPLETED OPTION REMOVED FOR PATIENTS: ONLY SHOWN TO DOCTORS AND ADMINS */}
                  {(userRole === 'doctor' || userRole === 'admin') && (
                    <option value="completed">Completed</option>
                  )}
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem' }}>
                <button
                  type="button"
                  onClick={() => setEditingApt(null)}
                  style={{
                    padding: '0.5rem 1rem',
                    borderRadius: '8px',
                    border: '1px solid #cbd5e1',
                    backgroundColor: '#ffffff',
                    color: '#475569',
                    fontSize: '0.875rem',
                    fontWeight: 600,
                    cursor: 'pointer'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingEdit}
                  className="btn-primary"
                  style={{ margin: 0, padding: '0.5rem 1.25rem' }}
                >
                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}