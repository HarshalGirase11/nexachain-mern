import React from 'react';

export default function StatCard({ label, value, green }) {
  return (
    <div className="stat-card">
      <div className="label">{label}</div>
      <div className={`value ${green ? 'green' : ''}`}>{value}</div>
    </div>
  );
}
