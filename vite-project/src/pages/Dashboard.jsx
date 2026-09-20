import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';
import { Calendar, User, LogOut } from 'lucide-react';

export default function Dashboard() {
  const { user, logout } = useAuth();
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchAppointments = async () => {
      try {
        const res = await API.get('/api/appointments/');
        setAppointments(res.data);
      } catch (err) {
        console.error('Error fetching appointments:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchAppointments();
  }, []);

  return (
    <div className="min-h-screen bg-gray-100">
      <nav className="bg-white shadow px-6 py-4 flex justify-between items-center">
        <div className="flex items-center space-x-2">
          <Calendar className="text-blue-600 w-6 h-6" />
          <span className="font-bold text-xl text-gray-800">MedCore Dashboard</span>
        </div>
        <div className="flex items-center space-x-4">
          <span className="text-sm bg-blue-100 text-blue-800 px-3 py-1 rounded-full uppercase font-medium">
            {user?.role}
          </span>
          <button
            onClick={logout}
            className="flex items-center space-x-1 text-sm text-red-600 hover:text-red-800"
          >
            <LogOut className="w-4 h-4" />
            <span>Logout</span>
          </button>
        </div>
      </nav>

      <main className="max-w-6xl mx-auto p-6">
        <h2 className="text-2xl font-bold text-gray-800 mb-4">Your Appointments</h2>
        {loading ? (
          <p className="text-gray-500">Loading appointments...</p>
        ) : appointments.length === 0 ? (
          <div className="bg-white p-6 rounded-lg shadow text-center text-gray-500">
            No appointments found.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {appointments.map((item) => (
              <div key={item.id} className="bg-white p-5 rounded-lg shadow border-l-4 border-blue-500">
                <div className="flex justify-between items-start">
                  <h3 className="text-lg font-semibold text-gray-800">{item.department || 'Consultation'}</h3>
                  <span className="text-xs font-semibold px-2 py-1 bg-green-100 text-green-700 rounded">
                    {item.status || 'Scheduled'}
                  </span>
                </div>
                <p className="text-sm text-gray-600 mt-2">Reason: {item.reason}</p>
                <p className="text-xs text-gray-400 mt-4">
                  Date: {new Date(item.appointment_date).toLocaleString()}
                </p>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}