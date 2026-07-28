import React from 'react';

function formatCurrency(n) {
  return `₹${Number(n || 0).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
}

export default function ReferralTreeNode({ node }) {
  return (
    <div className="tree-node">
      <div className="node-label">
        <strong>{node.fullName}</strong>{' '}
        <span className="muted">
          ({node.email}) · Wallet: {formatCurrency(node.walletBalance)}
        </span>
      </div>
      {node.children?.map((child) => (
        <ReferralTreeNode key={child._id} node={child} />
      ))}
    </div>
  );
}
