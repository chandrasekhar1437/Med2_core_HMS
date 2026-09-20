import React, { useState } from 'react';
import { Stethoscope, AlertCircle, Check, Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function AuthPage() {
  const { login } = useAuth();
  const [authMode, setAuthMode] = useState('login'); // 'login', 'register', 'forgot_otp', 'forgot_reset'

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regContact, setRegContact] = useState('');
  const [authMessage, setAuthMessage] = useState('');
  const [authError, setAuthError] = useState('');

  const [forgotEmail, setForgotEmail] = useState('');
  const [otpCode, setOtpCode] = useState('');
  const [newPassword, setNewPassword] = useState('');

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setAuthError('');
    setAuthMessage('');
    try {
      await login(email, password);
    } catch (err) {
      const detail = err.response?.data?.detail;
      setAuthError(
        typeof detail === 'string'
          ? detail
          : Array.isArray(detail)
            ? detail.map(d => d.msg).join(', ')
            : 'Invalid email or password'
      );
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
        role: 'patient',
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

        {authMode === 'login' && (
          <form onSubmit={handleLoginSubmit}>
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