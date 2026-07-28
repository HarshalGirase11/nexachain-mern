import React, { useEffect, useState } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import api from '../api/api';
import StatCard from '../components/StatCard.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function Dashboard() {
  const { user } = useAuth();
  const [summary, setSummary] = useState(null);
  const [roiHistory, setRoiHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError('');
      try {
        const [summaryRes, roiRes] = await Promise.all([
          api.get('/dashboard/summary'),
          api.get('/dashboard/roi-history?limit=30'),
        ]);
        setSummary(summaryRes.data.data);
        setRoiHistory(roiRes.data.data.reverse());
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load dashboard');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const chartData = roiHistory.map((r) => ({
    date: new Date(r.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' }),
    roi: r.roiAmount,
  }));

  return (
    <div>
      <div className="topbar">
        <h1>Dashboard</h1>
        <div className="welcome">Welcome, {user?.fullName}</div>
      </div>

      {error && <div className="error-banner">{error}</div>}
      {loading && <div className="loading-spinner">Loading dashboard...</div>}

      {!loading && summary && (
        <>
          <div className="cards-grid">
            <StatCard label="Total Investments" value={formatCurrency(summary.totalInvestments)} />
            <StatCard label="Today's ROI" value={formatCurrency(summary.dailyRoi)} green />
            <StatCard label="Total Level Income" value={formatCurrency(summary.totalLevelIncomeEarned)} />
            <StatCard label="Wallet Balance" value={formatCurrency(summary.walletBalance)} green />
          </div>

          <div className="panel">
            <h3>ROI Earnings (last 30 records)</h3>
            {chartData.length === 0 ? (
              <div className="empty-state">No ROI history yet. It appears once your investment starts earning.</div>
            ) : (
              <ResponsiveContainer width="100%" height={260}>
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#eee" />
                  <XAxis dataKey="date" fontSize={12} />
                  <YAxis fontSize={12} />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="roi" stroke="#1652f0" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </>
      )}
    </div>
  );
}
