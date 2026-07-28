import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';

export default function Layout({ children }) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="layout">
      <aside className="sidebar">
        <h2>NexaChain AI</h2>
        <nav>
          <NavLink to="/" end>
            Dashboard
          </NavLink>
          <NavLink to="/investments">Investments</NavLink>
          <NavLink to="/referrals">Referral Tree</NavLink>
        </nav>
        <button className="logout-btn" onClick={handleLogout}>
          Logout ({user?.fullName?.split(' ')[0]})
        </button>
      </aside>
      <main className="main-content">{children}</main>
    </div>
  );
}
