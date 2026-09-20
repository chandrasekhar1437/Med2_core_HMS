import React, { useState } from 'react';
import { DollarSign, CreditCard } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import API from '../api/axios';

export default function BillingTab({ bills, initialPatientId, onRefresh }) {
  const { userRole } = useAuth();

  const [billingPatientId, setBillingPatientId] = useState(initialPatientId || '');
  const [billAmount, setBillAmount] = useState('');
  const [billDescription, setBillDescription] = useState('Cardiology Consultation & ECG');

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
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Failed to create bill');
    }
  };

  const handlePayBill = async (billId) => {
    try {
      await API.patch(`/api/billing/${billId}/pay`);
      alert('Payment processed successfully! Digital receipt sent to email.');
      onRefresh();
    } catch (err) {
      alert(err.response?.data?.detail || 'Payment failed');
    }
  };

  return (
    <>
      {userRole === 'admin' && (
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

      <div className="panel-card">
        <div className="panel-header">
          <h2 className="panel-title">
            <CreditCard size={20} color="#2563eb" />
            {userRole === 'admin' ? 'Hospital Invoices Ledger' : 'My Medical Bills'}
          </h2>
          <button onClick={onRefresh} className="refresh-btn">Refresh Bills</button>
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
    </>
  );
}