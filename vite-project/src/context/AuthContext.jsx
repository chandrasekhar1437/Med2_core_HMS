import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../api/axios';
import { parseJwt } from '../utils/jwt';

const AuthContext = createContext(null);

export const AuthProvider = ({ children }) => {
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [userRole, setUserRole] = useState(localStorage.getItem('role') || '');
  const [currentUserId, setCurrentUserId] = useState(localStorage.getItem('userId') || '');
  const [isDoctorAvailable, setIsDoctorAvailable] = useState(true);

  useEffect(() => {
    if (token) {
      const decoded = parseJwt(token);
      const uid = decoded?.sub || decoded?.id || localStorage.getItem('userId') || '';
      const role = (decoded?.role || localStorage.getItem('role') || 'patient').toLowerCase();
      setCurrentUserId(uid);
      setUserRole(role);
    }
  }, [token]);

  const login = async (email, password) => {
    let res = null;
    try {
      const params = new URLSearchParams();
      params.append('username', email);
      params.append('password', password);

      res = await API.post('/api/auth/login', params, {
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' }
      });
    } catch (err1) {
      if (err1.response?.status === 422) {
        res = await API.post('/api/auth/login', {
          email: email,
          username: email,
          password: password
        });
      } else {
        throw err1;
      }
    }

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
    return role;
  };

  const logout = () => {
    localStorage.clear();
    sessionStorage.clear();
    setToken(null);
    setUserRole('');
    setCurrentUserId('');
  };

  return (
    <AuthContext.Provider value={{
      token,
      userRole,
      currentUserId,
      isDoctorAvailable,
      setIsDoctorAvailable,
      login,
      logout
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);