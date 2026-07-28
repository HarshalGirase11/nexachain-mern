import React, { useEffect, useState } from 'react';
import api from '../api/api';
import ReferralTreeNode from '../components/ReferralTreeNode.jsx';
import { useAuth } from '../context/AuthContext.jsx';

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function Referrals() {
  const { user } = useAuth();
  const [tree, setTree] = useState([]);
  const [incomeHistory, setIncomeHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      try {
        const [treeRes, historyRes] = await Promise.all([
          api.get('/referrals/tree'),
          api.get('/dashboard/referral-income-history?limit=30'),
        ]);
        setTree(treeRes.data.data);
        setIncomeHistory(historyRes.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to load referral data');
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const referralLink = `${window.location.origin}/register?ref=${user?.referralCode}`;

  const handleCopy = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div>
      <div className="topbar">
        <h1>Referral Network</h1>
      </div>

      {error && <div className="error-banner">{error}</div>}

      <div className="panel">
        <h3>Your Referral Link</h3>
        <div className="form-inline">
          <div className="form-group" style={{ gridColumn: 'span 3' }}>
            <input readOnly value={referralLink} />
          </div>
          <button className="btn-primary" onClick={handleCopy}>
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      <div className="panel">
        <h3>Referral Tree</h3>
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : tree.length === 0 ? (
          <div className="empty-state">You haven't referred anyone yet. Share your link above!</div>
        ) : (
          <div>
            {tree.map((node) => (
              <ReferralTreeNode key={node._id} node={node} />
            ))}
          </div>
        )}
      </div>

      <div className="panel">
        <h3>Referral Income History</h3>
        {loading ? (
          <div className="loading-spinner">Loading...</div>
        ) : incomeHistory.length === 0 ? (
          <div className="empty-state">No referral income yet.</div>
        ) : (
          <table>
            <thead>
              <tr>
                <th>From</th>
                <th>Level</th>
                <th>Amount</th>
                <th>Date</th>
              </tr>
            </thead>
            <tbody>
              {incomeHistory.map((r) => (
                <tr key={r._id}>
                  <td>{r.sourceUser?.fullName || '—'}</td>
                  <td>Level {r.level}</td>
                  <td>{formatCurrency(r.incomeAmount)}</td>
                  <td>{new Date(r.date).toLocaleDateString('en-IN')}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
