import React, { useState, useEffect } from 'react';
import API from './api/axios';
import './App.css';
import { 
  Calendar, Clock, LogOut, Stethoscope, AlertCircle, 
  FileText, Check, DollarSign, Pill, CreditCard, Activity, 
  ShieldAlert, User, LayoutDashboard, Receipt, Search, Printer, 
  BarChart3, Users, UserPlus, Trash2, Edit3, KeyRound, Mail, ArrowLeft
} from 'lucide-react';

const parseJwt = (token) => {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      window.atob(base64).split('').map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)).join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
};

export default function App() {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || '');
  const [currentUserId, setCurrentUserId] = useState(localStorage.getItem('userId') || '');
  
  // Auth Screen Flow: 'login', 'register', 'forgot_otp', 'forgot_reset'
  const [authMode, setAuthMode] = useState('login');

  // Navigation Tab State
  const [activeTab, setActiveTab] = useState('overview');

  // Search & Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [userSearch, setUserSearch] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('all');

  // Doctor Availability State
  const [isDoctorAvailable, setIsDoctorAvailable] = useState(true);

  // Authentication Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regContact, setRegContact] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');

  // Forgot Password / OTP Fields
  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  // Dashboard Data
  const [appointments, setAppointments] = useState([]);
  const [records, setRecords] = useState([]);
  const [bills, setBills] = useState([]);
  const [doctors, setDoctors] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  // Patient Booking Form
  const [doctorId, setDoctorId] = useState('');
  const [date, setDate] = useState('');
  const [department, setDepartment] = useState('Cardiology');
  const [reason, setReason] = useState('');
  const [statusMessage, setStatusMessage] = useState('');
  const [isError, setIsError] = useState(false);

  // Edit Appointment Modal State
  const [editingAppointment, setEditingAppointment] = useState(null);
  const [editDate, setEditDate] = useState('');
  const [editStatus, setEditStatus] = useState('scheduled');

  // Doctor Prescription Action
  const [activeRecordPatientId, setActiveRecordPatientId] = useState(null);
  const [diagnosis, setDiagnosis] = useState('');
  const [symptomsInput, setSymptomsInput] = useState('Routine Consultation');
  const [prescription, setPrescription] = useState('');
  const [notes, setNotes] = useState('');

  // Print Slip State
  const [printRecord, setPrintRecord] = useState(null);

  // Admin Billing Action
  const [billingPatientId, setBillingPatientId] = useState('');
  const [billAmount, setBillAmount] = useState('');
  const [billDescription, setBillDescription] = useState('Cardiology Consultation & ECG');

  // Admin Staff Creation Action
  const [staffName, setStaffName] = useState('');
  const [staffEmail, setStaffEmail] = useState('');
  const [staffPassword, setStaffPassword] = useState('');
  const [staffRole, setStaffRole] = useState('doctor');
  const [staffContact, setStaffContact] = useState('');

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      const uid = decoded?.sub || decoded?.id || localStorage.getItem('userId') || '';
      setCurrentUserId(uid);

      fetchDoctors();
      fetchAppointments();
      fetchInvoices();
      fetchRecords();
      if (userRole === 'admin') {
        fetchAllUsers();
      }
    }
  }, [token, userRole]);

  // Auth Operations
  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      const res = await API.post('/api/auth/login', { email, password });
      const jwt = res.data.access_token;
      
      const decoded = parseJwt(jwt);
      const role = (decoded?.role || res.data.role || res.data.user?.role || 'patient').toLowerCase();
      const uid = decoded?.sub || decoded?.id || res.data.user?.id || '';

      localStorage.setItem('token', jwt);
      localStorage.setItem('role', role);
      localStorage.setItem('userId', uid);
      setToken(jwt);
      setUserRole(role);
      setCurrentUserId(uid);
      setActiveTab('overview');
    } catch (err) {
      setAuthError(err.response?.data?.detail || 'Invalid email or password');
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      const res = await API.post('/api/auth/register', {
        full_name: regFullName,
        email,
        password,
        contact_number: regContact
      });
      setAuthMessage(res.data.message || 'Registration successful! You may now sign in.');
      setAuthMode('login');
      setPassword('');
    } catch (err) {
      setAuthError(err.response?.data?.detail || 'Registration failed');
    }
  };

  const handleSendOtp = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      const res = await API.post('/api/auth/forgot-password/send-otp', { email: forgotEmail });
      setAuthMessage(res.data.message || 'Verification code sent to your email.');
      setAuthMode('forgot_reset');
    } catch (err) {
      setAuthError(err.response?.data?.detail || 'Failed to send verification code');
    }
  };

  const handleResetPassword = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      const res = await API.post('/api/auth/forgot-password/reset', {
        email: forgotEmail,
        otp: otpCode,
        new_password: newPassword
      });
      setAuthMessage(res.data.message || 'Password reset successfully! Please sign in.');
      setAuthMode('login');
      setEmail(forgotEmail);
      setPassword('');
      setOtpCode('');
      setNewPassword('');
    } catch (err) {
      setAuthError(err.response?.data?.detail || 'Password reset failed');
    }
  };

  const handleLogout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setToken(null);
    setUserRole('');
    setCurrentUserId('');
    setAppointments([]);
    setRecords([]);
    setBills([]);
    setAllUsers([]);
    setActiveTab('overview');
    setAuthMode('login');
  };

  // Data Fetching
  const fetchDoctors = async () => {
    try {
      const res = await API.get('/api/users/doctors/list');
      setDoctors(res.data);
      if (res.data.length > 0) {
        setDoctorId(res.data[0].id);
        const myDoc = res.data.find(d => d.id === currentUserId);
        if (myDoc && typeof myDoc.is_available === 'boolean') {
          setIsDoctorAvailable(myDoc.is_available);
        }
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

  const handleToggleAvailability = async (targetUserId) => {
    const idToToggle = targetUserId || currentUserId;
    if (!idToToggle) return;

    try {
      const res = await API.patch(`/api/users/${idToToggle}/availability`);
      if (idToToggle === currentUserId) setIsDoctorAvailable(res.data.is_available);
      fetchDoctors();
      if (userRole === 'admin') fetchAllUsers();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update availability status');
    }
  };

  const handleBook = async (e) => {
    e.preventDefault();
    setStatusMessage('');
    setIsError(false);
    try {
      await API.post('/api/appointments/', {
        doctor_id: doctorId,
        appointment_date: new Date(date).toISOString(),
        department,
        reason,
      });
      setStatusMessage('Appointment booked successfully!');
      setDate('');
      setReason('');
      fetchAppointments();
    } catch (err) {
      setIsError(true);
      setStatusMessage(err.response?.data?.detail || 'Booking failed');
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      await API.patch(`/api/appointments/${appointmentId}`, { status: newStatus });
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update status');
    }
  };

  const handleOpenEditModal = (apt) => {
    setEditingAppointment(apt);
    setEditStatus(apt.status || 'scheduled');
    if (apt.appointment_date) {
      try {
        const d = new Date(apt.appointment_date);
        setEditDate(d.toISOString().slice(0, 16));
      } catch (err) {
        setEditDate('');
      }
    }
  };

  const handleSaveEditAppointment = async (e) => {
    e.preventDefault();
    if (!editingAppointment) return;

    try {
      const payload = { status: editStatus };
      if (editDate) payload.appointment_date = new Date(editDate).toISOString();

      await API.patch(`/api/appointments/${editingAppointment.id}`, payload);
      alert('Appointment updated successfully!');
      setEditingAppointment(null);
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to update appointment');
    }
  };

  const handleDeleteAppointment = async (appointmentId) => {
    if (!window.confirm('Are you sure you want to permanently delete this appointment?')) return;
    try {
      await API.delete(`/api/appointments/${appointmentId}`);
      alert('Appointment deleted successfully!');
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete appointment');
    }
  };

  const handleCreateRecord = async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/records/', {
        patient_id: activeRecordPatientId,
        diagnosis,
        symptoms: symptomsInput.split(',').map((s) => s.trim()).filter(Boolean),
        prescription,
        notes: notes || 'Clinical consultation visit'
      });
      alert('Prescription created and sent to patient email!');
      setActiveRecordPatientId(null);
      setDiagnosis('');
      setPrescription('');
      setNotes('');
      fetchRecords();
      fetchAppointments();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to save record');
    }
  };

  const handleCreateBill = async (e) => {
    e.preventDefault();
    try {
      await API.post('/api/billing/', {
        patient_id: billingPatientId,
        items: [
          {
            description: billDescription || 'General Medical Consultation',
            amount: parseFloat(billAmount)
          }
        ],
        notes: 'Hospital medical charges'
      });
      alert('Invoice generated successfully!');
      setBillAmount('');
      setBillingPatientId('');
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create bill');
    }
  };

  const handlePayBill = async (billId) => {
    try {
      await API.patch(`/api/billing/${billId}/pay`);
      alert('Payment processed successfully! Digital receipt sent to email.');
      fetchInvoices();
    } catch (err) {
      alert(err.response?.data?.detail || 'Payment failed');
    }
  };

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
      fetchAllUsers();
      if (staffRole === 'doctor') fetchDoctors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to register staff');
    }
  };

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await API.delete(`/api/users/${userId}`);
      alert('User deleted successfully');
      fetchAllUsers();
      fetchDoctors();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to delete user');
    }
  };

  // Unauthenticated Authentication Screens
  if (!token) {
    return (
      <div className="auth-wrapper">
        <div className="auth-card">
          <div className="auth-header-icon">
            <Stethoscope size={44} />
          </div>
          <h1 className="auth-title">
            {authMode === 'login' && 'MedCore HMS Portal'}
            {authMode === 'register' && 'Patient Registration'}
            {authMode === 'forgot_otp' && 'Reset Password'}
            {authMode === 'forgot_reset' && 'Enter Verification Code'}
          </h1>
          
          {authError && (
            <div className="auth-error">
              <AlertCircle size={18} /> {authError}
            </div>
          )}

          {authMessage && (
            <div className="alert-box alert-success" style={{ marginBottom: '1rem', fontSize: '0.85rem' }}>
              <Check size={16} /> {authMessage}
            </div>
          )}

          {/* 1. Sign In Form */}
          {authMode === 'login' && (
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="user@medcore.com"
                />
              </div>
              <div className="form-group">
                <label className="form-label">Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>

              <div className="auth-links">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('forgot_otp'); setForgotEmail(email); setAuthError(''); setAuthMessage(''); }} 
                  className="auth-link-btn"
                >
                  Forgot password?
                </button>
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                Sign In
              </button>

              <div className="auth-switch-text">
                New patient?{' '}
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('register'); setAuthError(''); setAuthMessage(''); }} 
                  className="auth-link-btn"
                >
                  Create an account
                </button>
              </div>
            </form>
          )}

          {/* 2. Registration Form */}
          {authMode === 'register' && (
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <input
                  type="text"
                  required
                  value={regFullName}
                  onChange={(e) => setRegFullName(e.target.value)}
                  className="form-input"
                  placeholder="John Doe"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="form-input"
                  placeholder="john@example.com"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Phone Number</label>
                <input
                  type="text"
                  required
                  value={regContact}
                  onChange={(e) => setRegContact(e.target.value)}
                  className="form-input"
                  placeholder="+1 (555) 019-2834"
                />
              </div>

              <div className="form-group">
                <label className="form-label">Choose Password</label>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '1rem' }}>
                Register Account
              </button>

              <div className="auth-switch-text">
                Already registered?{' '}
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthMessage(''); }} 
                  className="auth-link-btn"
                >
                  Sign In
                </button>
              </div>
            </form>
          )}

          {/* 3. Request OTP Form */}
          {authMode === 'forgot_otp' && (
            <form onSubmit={handleSendOtp}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Enter your registered email address. We will send a 6-digit verification code to reset your password.
              </p>

              <div className="form-group">
                <label className="form-label">Registered Email</label>
                <input
                  type="email"
                  required
                  value={forgotEmail}
                  onChange={(e) => setForgotEmail(e.target.value)}
                  className="form-input"
                  placeholder="user@medcore.com"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <Mail size={16} /> Send Verification Code
              </button>

              <div className="auth-switch-text">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthMessage(''); }} 
                  className="auth-link-btn"
                  style={{ display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}
                >
                  <ArrowLeft size={14} /> Back to Sign In
                </button>
              </div>
            </form>
          )}

          {/* 4. Verify OTP & Reset Password Form */}
          {authMode === 'forgot_reset' && (
            <form onSubmit={handleResetPassword}>
              <p style={{ fontSize: '0.85rem', color: '#64748b', marginBottom: '1.25rem' }}>
                Code sent to <strong>{forgotEmail}</strong>. Check your inbox.
              </p>

              <div className="form-group">
                <label className="form-label">6-Digit Code (OTP)</label>
                <input
                  type="text"
                  required
                  maxLength={6}
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  className="form-input otp-box"
                  placeholder="123456"
                />
              </div>

              <div className="form-group">
                <label className="form-label">New Password</label>
                <input
                  type="password"
                  required
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="form-input"
                  placeholder="••••••••"
                />
              </div>

              <button type="submit" className="btn-primary" style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}>
                <KeyRound size={16} /> Update Password
              </button>

              <div className="auth-switch-text">
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('forgot_otp'); setAuthError(''); setAuthMessage(''); }} 
                  className="auth-link-btn"
                >
                  Resend Code
                </button>
                {' • '}
                <button 
                  type="button" 
                  onClick={() => { setAuthMode('login'); setAuthError(''); setAuthMessage(''); }} 
                  className="auth-link-btn"
                >
                  Back to Sign In
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    );
  }

  // Dashboard Aggregations
  const scheduledCount = appointments.filter(a => a.status === 'scheduled').length;
  const completedCount = appointments.filter(a => a.status === 'completed').length;
  const unpaidBillsCount = bills.filter(b => b.status === 'pending' || b.status === 'unpaid').length;
  
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

  const filteredAppointments = appointments.filter((apt) => {
    const matchesStatus = statusFilter === 'all' || apt.status === statusFilter;
    const query = searchQuery.toLowerCase();
    const matchesSearch = 
      apt.reason?.toLowerCase().includes(query) ||
      apt.department?.toLowerCase().includes(query) ||
      apt.patient_id?.toLowerCase().includes(query);
    return matchesStatus && matchesSearch;
  });

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
    <div className="app-container">
      {/* Top Navbar */}
      <header className="app-header no-print">
        <div className="brand">
          <Stethoscope size={24} /> MedCore HMS
        </div>
        <div className="header-actions">
          {userRole === 'doctor' && (
            <button
              onClick={() => handleToggleAvailability(currentUserId)}
              className={`duty-toggle-btn ${isDoctorAvailable ? 'duty-on' : 'duty-off'}`}
              title="Click to toggle availability status"
            >
              <span className={`duty-dot ${isDoctorAvailable ? 'duty-dot-on' : 'duty-dot-off'}`}></span>
              {isDoctorAvailable ? 'Available / On-Duty' : 'Off-Duty / Away'}
            </button>
          )}

          <span className="role-badge">ROLE: {userRole.toUpperCase()}</span>
          <button onClick={handleLogout} className="logout-btn">
            <LogOut size={16} /> Sign Out
          </button>
        </div>
      </header>

      {/* Navigation Tabs */}
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

      {/* Role Banner */}
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

      {/* Main Workspace */}
      <main className={`dashboard-grid no-print ${userRole === 'doctor' || activeTab === 'analytics' || activeTab === 'users' ? 'grid-full' : 'grid-sidebar'}`}>
        
        {/* Booking Form (Patient) */}
        {(activeTab === 'overview' || activeTab === 'appointments') && userRole === 'patient' && (
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
                  <select value={doctorId} onChange={(e) => setDoctorId(e.target.value)} className="form-select">
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
                <input type="text" required value={department} onChange={(e) => setDepartment(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Date & Time</label>
                <input type="datetime-local" required value={date} onChange={(e) => setDate(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Reason</label>
                <textarea required rows={3} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Describe symptoms..." className="form-textarea" />
              </div>
              <button type="submit" className="btn-primary" disabled={doctors.length === 0}>
                Confirm Appointment
              </button>
            </form>
          </div>
        )}

        {/* Issue Hospital Bill Form (Admin) */}
        {(activeTab === 'overview' || activeTab === 'billing') && userRole === 'admin' && (
          <div className="panel-card">
            <div className="panel-header">
              <h2 className="panel-title"><DollarSign size={20} color="#2563eb" /> Issue Hospital Bill</h2>
            </div>
            <form onSubmit={handleCreateBill}>
              <div className="form-group">
                <label className="form-label">Patient ID</label>
                <input type="text" required placeholder="Paste Patient ID" value={billingPatientId} onChange={(e) => setBillingPatientId(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Amount (₹)</label>
                <input type="number" required placeholder="500.00" value={billAmount} onChange={(e) => setBillAmount(e.target.value)} className="form-input" />
              </div>
              <div className="form-group">
                <label className="form-label">Description</label>
                <input type="text" required value={billDescription} onChange={(e) => setBillDescription(e.target.value)} className="form-input" />
              </div>
              <button type="submit" className="btn-success" style={{ width: '100%' }}>Generate Invoice</button>
            </form>
          </div>
        )}

        {/* Content Column */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', gridColumn: (activeTab === 'records') || (activeTab === 'billing' && userRole === 'patient') || (activeTab === 'analytics') || (activeTab === 'users') ? '1 / -1' : undefined }}>
          
          {/* Appointment Queue */}
          {(activeTab === 'overview' || activeTab === 'appointments') && (
            <div className="panel-card">
              <div className="panel-header">
                <h2 className="panel-title">
                  <Clock size={20} color="#2563eb" />
                  {userRole === 'doctor' ? 'Assigned Patient Consultations' : userRole === 'admin' ? 'Hospital Master Schedule' : 'My Appointments'}
                </h2>
                <button onClick={fetchAppointments} className="refresh-btn">Refresh</button>
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
                  {filteredAppointments.map((apt) => (
                    <div key={apt.id} className="appointment-item">
                      <div>
                        <h3 className="apt-reason">{apt.reason}</h3>
                        <div className="apt-meta">
                          Department: <strong style={{ color: '#334155' }}>{apt.department}</strong> • Date: <strong style={{ color: '#334155' }}>{new Date(apt.appointment_date).toLocaleString()}</strong>
                        </div>
                        {apt.patient_id && (
                          <div 
                            className="apt-patient-id" 
                            onClick={() => { setBillingPatientId(apt.patient_id); if (userRole === 'admin') setActiveTab('billing'); }}
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
                            {apt.status === 'scheduled' && (
                              <button
                                onClick={() => updateAppointmentStatus(apt.id, 'completed')}
                                className="btn-action-small"
                                style={{ backgroundColor: '#059669', color: '#ffffff' }}
                              >
                                <Check size={14} /> Complete
                              </button>
                            )}
                            <button
                              onClick={() => setActiveRecordPatientId(apt.patient_id)}
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

                        {userRole === 'admin' && (
                          <button
                            onClick={() => handleDeleteAppointment(apt.id)}
                            className="btn-delete-small"
                            title="Delete Appointment"
                          >
                            <Trash2 size={13} /> Delete
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Staff & Users Directory Tab (Admin Only) */}
          {activeTab === 'users' && userRole === 'admin' && (
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
                  <button onClick={fetchAllUsers} className="refresh-btn">Refresh Directory</button>
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
          )}

          {/* Analytics Section (Admin Only) */}
          {activeTab === 'analytics' && userRole === 'admin' && (
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
          )}

          {/* Prescriptions Tab */}
          {(activeTab === 'overview' || activeTab === 'records') && (userRole === 'doctor' || userRole === 'patient') && (
            <div className="panel-card">
              <div className="panel-header">
                <h2 className="panel-title">
                  <Pill size={20} color="#2563eb" /> 
                  {userRole === 'doctor' ? 'Clinical Prescriptions Registry' : 'My Prescriptions & Regimen'}
                </h2>
                <button onClick={fetchRecords} className="refresh-btn">Refresh Prescriptions</button>
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
                          <button
                            onClick={() => setPrintRecord(rec)}
                            className="print-btn"
                          >
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
          )}

          {/* Billing Tab */}
          {(activeTab === 'overview' || activeTab === 'billing') && (userRole === 'patient' || userRole === 'admin') && (
            <div className="panel-card">
              <div className="panel-header">
                <h2 className="panel-title">
                  <CreditCard size={20} color="#2563eb" />
                  {userRole === 'admin' ? 'Hospital Invoices Ledger' : 'My Medical Bills'}
                </h2>
                <button onClick={fetchInvoices} className="refresh-btn">Refresh Bills</button>
              </div>

              {bills.length === 0 ? (
                <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                  No billing invoices on record.
                </div>
              ) : (
                <div className="invoices-list">
                  {bills.map((bill) => (
                    <div key={bill.id} className="invoice-item">
                      <div>
                        <h4 className="invoice-desc">
                          {bill.items?.map(i => i.description).join(', ') || bill.description || 'General Medical Care'}
                        </h4>
                        <div className="apt-meta">
                          {userRole === 'admin' && <span>Patient ID: {bill.patient_id} • </span>}
                          Date: {new Date(bill.created_at).toLocaleDateString()}
                        </div>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                        <span className="invoice-amount">₹{(bill.total_amount || bill.amount || 0).toFixed(2)}</span>
                        <span className={`badge-status ${bill.status === 'paid' ? 'status-paid' : 'status-unpaid'}`}>
                          {bill.status}
                        </span>

                        {userRole === 'patient' && (bill.status === 'pending' || bill.status === 'unpaid') && (
                          <button
                            onClick={() => handlePayBill(bill.id)}
                            className="btn-action-small"
                            style={{ backgroundColor: '#059669', color: '#ffffff', padding: '0.4rem 0.8rem' }}
                          >
                            Pay Now
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

        </div>
      </main>

      {/* Edit / Reschedule Modal */}
      {editingAppointment && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="panel-title" style={{ marginBottom: '0.5rem' }}>
              <Edit3 color="#2563eb" /> Edit & Reschedule Appointment
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Reference ID: {editingAppointment.id}
            </p>

            <form onSubmit={handleSaveEditAppointment}>
              <div className="form-group">
                <label className="form-label">Consultation Reason</label>
                <input
                  type="text"
                  disabled
                  value={editingAppointment.reason || ''}
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
                <button
                  type="button"
                  onClick={() => setEditingAppointment(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Prescription Modal */}
      {activeRecordPatientId && (
        <div className="modal-overlay no-print">
          <div className="modal-content">
            <h3 className="panel-title" style={{ marginBottom: '0.5rem' }}>
              <FileText color="#2563eb" /> Issue Doctor Prescription
            </h3>
            <p style={{ fontSize: '0.75rem', color: '#64748b', marginBottom: '1rem' }}>
              Patient Reference: {activeRecordPatientId}
            </p>

            <form onSubmit={handleCreateRecord}>
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
                <button
                  type="button"
                  onClick={() => setActiveRecordPatientId(null)}
                  className="btn-secondary"
                >
                  Cancel
                </button>
                <button type="submit" className="btn-primary" style={{ width: 'auto' }}>
                  Save & Issue Prescription
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Printable Rx Slip Modal */}
      {printRecord && (
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
              <div><strong>Patient ID:</strong> {printRecord.patient_id}</div>
              <div><strong>Date:</strong> {new Date(printRecord.created_at).toLocaleDateString()}</div>
              <div><strong>Diagnosis:</strong> {printRecord.diagnosis}</div>
              <div><strong>Symptoms:</strong> {printRecord.symptoms?.join(', ') || 'N/A'}</div>
            </div>

            <div style={{ backgroundColor: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '0.5rem', padding: '1rem', marginBottom: '1rem' }}>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#475569', textTransform: 'uppercase', marginBottom: '0.5rem' }}>
                Medication Order & Regimen
              </div>
              <div style={{ fontSize: '1rem', fontWeight: 700, color: '#0f172a', whiteSpace: 'pre-wrap' }}>
                {printRecord.prescription}
              </div>
            </div>

            {printRecord.notes && (
              <div style={{ fontSize: '0.8rem', color: '#475569', marginBottom: '1.5rem' }}>
                <strong>Doctor's Advice:</strong> {printRecord.notes}
              </div>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '2rem', paddingTop: '1rem', borderTop: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '0.7rem', color: '#94a3b8' }}>Generated via MedCore Digital Health System</div>
              <div style={{ textAlign: 'right', fontSize: '0.8rem', fontWeight: 700 }}>Authorized Physician Signature</div>
            </div>

            <div className="btn-row no-print" style={{ marginTop: '1.5rem' }}>
              <button onClick={() => setPrintRecord(null)} className="btn-secondary">Close</button>
              <button onClick={() => window.print()} className="btn-primary" style={{ width: 'auto', display: 'flex', alignItems: 'center', gap: '0.35rem' }}>
                <Printer size={15} /> Print Slip
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}