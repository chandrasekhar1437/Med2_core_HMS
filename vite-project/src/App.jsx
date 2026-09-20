import React, { useState, useEffect } from 'react';
import API from './api/axios';
import './App.css';

import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import StatsBanner from './components/StatsBanner';
import EditAppointmentModal from './components/EditAppointmentModal';
import PrescriptionModal from './components/PrescriptionModal';
import PrintSlipModal from './components/PrintSlipModal';

import AuthPage from './pages/AuthPage';
import AppointmentsTab from './pages/AppointmentsTab';
import PrescriptionsTab from './pages/PrescriptionsTab';
import BillingTab from './pages/BillingTab';
import UsersTab from './pages/UsersTab';
import AnalyticsTab from './pages/AnalyticsTab';

import { LayoutDashboard, Clock, Pill, Receipt, BarChart3, Users } from 'lucide-react';

function DashboardContent() {
  const { token, userRole, currentUserId, setIsDoctorAvailable } = useAuth();

  const [activeTab, setActiveTab] = useState('overview');
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);

  // Modals & Target patient billing
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [activeRecordPatientId, setActiveRecordPatientId] = useState(null);
  const [printRecord, setPrintRecord] = useState(null);
  const [billingPatientId, setBillingPatientId] = useState('');

  const fetchDoctors = async () => {
    try {
      const res = await API.get('/api/users/doctors/list');
      setDoctors(res.data);
      const myDoc = res.data.find(d => d.id === currentUserId);
      if (myDoc && typeof myDoc.is_available === 'boolean') {
        setIsDoctorAvailable(myDoc.is_available);
      }
    } catch (err) {
      console.error('Failed to fetch doctors', err);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await API.get('/api/appointments/');
      setAppointments(res.data);
    } catch (err) {
      console.error('Failed to fetch appointments', err);
    }
  };

  const fetchRecords = async () => {
    try {
      const endpoint = userRole === 'patient' ? '/api/records/my' : '/api/records/';
      const res = await API.get(endpoint);
      setRecords(res.data);
    } catch (err) {
      console.error('Error fetching records:', err);
    }
  };

  const fetchInvoices = async () => {
    try {
      const endpoint = userRole === 'patient' ? '/api/billing/my' : '/api/billing/';
      const res = await API.get(endpoint);
      setBills(res.data);
    } catch (err) {
      console.error('Error fetching bills:', err);
    }
  };

  const fetchAllUsers = async () => {
    try {
      const res = await API.get('/api/users/');
      setAllUsers(res.data);
    } catch (err) {
      console.error('Error fetching users:', err);
    }
  };

  useEffect(() => {
    if (token) {
      fetchDoctors();
      fetchAppointments();
      fetchInvoices();
      fetchRecords();
      if (userRole === 'admin') fetchAllUsers();
    }
  }, [token, userRole]);

  if (!token) {
    return <AuthPage />;
  }

  const unpaidBillsCount = bills.filter(b => b.status === 'pending' || b.status === 'unpaid').length;

  return (
    <div className="app-container">
      <Navbar onRefreshDoctors={fetchDoctors} />

      {/* Nav Tabs */}
      <nav className="nav-container no-print">
        <div className="nav-inner">
          <button 
            className={`nav-tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            <LayoutDashboard size={18} /> Workspace Overview
          </button>

          <button 
            className={`nav-tab ${activeTab === 'appointments' ? 'active' : ''}`}
            onClick={() => setActiveTab('appointments')}
          >
            <Clock size={18} /> Appointments 
            <span className="nav-tab-badge">{appointments.length}</span>
          </button>

          {(userRole === 'doctor' || userRole === 'patient') && (
            <button 
              className={`nav-tab ${activeTab === 'records' ? 'active' : ''}`}
              onClick={() => setActiveTab('records')}
            >
              <Pill size={18} /> {userRole === 'doctor' ? 'Clinical Prescriptions' : 'My Prescriptions'}
              <span className="nav-tab-badge">{records.length}</span>
            </button>
          )}

          {(userRole === 'patient' || userRole === 'admin') && (
            <button 
              className={`nav-tab ${activeTab === 'billing' ? 'active' : ''}`}
              onClick={() => setActiveTab('billing')}
            >
              <Receipt size={18} /> Billing & Invoices
              {unpaidBillsCount > 0 && (
                <span className="nav-tab-badge" style={{ backgroundColor: '#fee2e2', color: '#b91c1c' }}>
                  {unpaidBillsCount}
                </span>
              )}
            </button>
          )}

          {userRole === 'admin' && (
            <>
              <button 
                className={`nav-tab ${activeTab === 'analytics' ? 'active' : ''}`}
                onClick={() => setActiveTab('analytics')}
              >
                <BarChart3 size={18} /> Analytics & Reports
              </button>

              <button 
                className={`nav-tab ${activeTab === 'users' ? 'active' : ''}`}
                onClick={() => { setActiveTab('users'); fetchAllUsers(); }}
              >
                <Users size={18} /> Staff & Users
                <span className="nav-tab-badge">{allUsers.length}</span>
              </button>
            </>
          )}
        </div>
      </nav>

      <StatsBanner
        appointments={appointments}
        records={records}
        bills={bills}
        allUsers={allUsers}
      />

      <main className={`dashboard-grid no-print ${userRole === 'doctor' || activeTab === 'analytics' || activeTab === 'users' ? 'grid-full' : 'grid-sidebar'}`}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: (activeTab === 'records') || (activeTab === 'billing' && userRole === 'patient') || (activeTab === 'analytics') || (activeTab === 'users') ? '1 / -1' : undefined }}>
          
          {(activeTab === 'overview' || activeTab === 'appointments') && (
            <AppointmentsTab
              appointments={appointments}
              doctors={doctors}
              onRefresh={fetchAppointments}
              onOpenEdit={(apt) => setEditingAppointment(apt)}
              onOpenPrescription={(pid) => setActiveRecordPatientId(pid)}
              onSelectPatientToBill={(pid) => { setBillingPatientId(pid); if (userRole === 'admin') setActiveTab('billing'); }}
            />
          )}

          {(activeTab === 'overview' || activeTab === 'records') && (userRole === 'doctor' || userRole === 'patient') && (
            <PrescriptionsTab
              records={records}
              onRefresh={fetchRecords}
              onPrint={(rec) => setPrintRecord(rec)}
            />
          )}

          {(activeTab === 'overview' || activeTab === 'billing') && (userRole === 'patient' || userRole === 'admin') && (
            <BillingTab
              bills={bills}
              initialPatientId={billingPatientId}
              onRefresh={fetchInvoices}
            />
          )}

          {activeTab === 'users' && userRole === 'admin' && (
            <UsersTab
              allUsers={allUsers}
              onRefresh={fetchAllUsers}
              onRefreshDoctors={fetchDoctors}
            />
          )}

          {activeTab === 'analytics' && userRole === 'admin' && (
            <AnalyticsTab
              appointments={appointments}
              bills={bills}
            />
          )}

        </div>
      </main>

      {editingAppointment && (
        <EditAppointmentModal
          appointment={editingAppointment}
          onClose={() => setEditingAppointment(null)}
          onSuccess={fetchAppointments}
        />
      )}

      {activeRecordPatientId && (
        <PrescriptionModal
          patientId={activeRecordPatientId}
          onClose={() => setActiveRecordPatientId(null)}
          onSuccess={() => { fetchRecords(); fetchAppointments(); }}
        />
      )}

      {printRecord && (
        <PrintSlipModal
          record={printRecord}
          onClose={() => setPrintRecord(null)}
        />
      )}
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <DashboardContent />
    </AuthProvider>
  );
}