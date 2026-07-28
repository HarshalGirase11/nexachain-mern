import React, { useEffect, useState } from 'react';
import api from '../api/api';

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function Investments() {
  const [investments, setInvestments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [form, setForm] = useState({
    amount: '',
    planName: 'Gold',
    durationInDays: 100,
    dailyRoiPercentage: 1.5,
  });

  const loadInvestments = async () => {
    setLoading(true);
    try {
      const res = await api.get('/investments?limit=50');
      setInvestments(res.data.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load investments');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInvestments();
  }, []);

  const handleCreate = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setError('');
    try {
      await api.post('/investments', form);
      setForm({ ...form, amount: '' });
      await loadInvestments();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to create investment');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="topbar">
        <h1>Investments</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <h3>New Investment</h3>
        <form className="form-inline" onSubmit={handleCreate}>
          <div className="form-group">
            <label>Amount (₹)</label>
            <input
              type="number"
              min="1"
              required
              value={form.amount}
              onChange={(e) => setForm({ ...form, amount: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Plan Name</label>
            <input
              required
              value={form.planName}
              onChange={(e) => setForm({ ...form, planName: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Duration (days)</label>
            <input
              type="number"
              min="1"
              required
              value={form.durationInDays}
              onChange={(e) => setForm({ ...form, durationInDays: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Daily ROI (%)</label>
            <input
              type="number"
              step="0.01"
              min="0"
              required
              value={form.dailyRoiPercentage}
              onChange={(e) => setForm({ ...form, dailyRoiPercentage: e.target.value })}
            />
          </div>
          <button className="btn-primary" disabled={submitting}>
            {submitting ? 'Investing...' : 'Invest Now'}
          </button>
        </form>
      </div>

      <div className="panel">
        <h3>Investment History</h3>
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : investments.length === 0 ? (
          <div className="empty-state">No investments yet. Create your first one above.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>Plan</th>
                <th>Amount</th>
                <th>Daily ROI %</th>
                <th>Start Date</th>
                <th>End Date</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {investments.map((inv) => (
                <tr key={inv._id}>
                  <td>{inv.plan?.name}</td>
                  <td>{formatCurrency(inv.amount)}</td>
                  <td>{inv.dailyRoiPercentage}%</td>
                  <td>{new Date(inv.startDate).toLocaleDateString('en-IN')}</td>
                  <td>{new Date(inv.endDate).toLocaleDateString('en-IN')}</td>
                  <td>
                    <span className={`badge ${inv.status}`}>{inv.status}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
