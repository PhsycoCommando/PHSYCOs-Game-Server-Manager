import React from 'react';
import './Header.css';
import { DONATION_LINKS } from '../config/donation-links';

const Header: React.FC = () => {
  return (
    <header className="app-header">
      <div className="logo">
        <span className="logo-icon">🎮</span>
        <h1>PHSYCO's Game Server Manager</h1>
      </div>
      <div className="header-actions">
        <button 
          className="header-btn feedback-btn"
          onClick={() => {
            // Switch to support tab
            const supportTab = document.querySelector('[data-tab="support"]') as HTMLElement;
            if (supportTab) supportTab.click();
          }}
          title="Send Feedback"
        >
          💬 Feedback
        </button>
        <button 
          className="header-btn donate-btn"
          onClick={() => {
            window.open(DONATION_LINKS.coffee, '_blank');
          }}
          title="Support Development"
        >
          ❤️ Donate
        </button>
      </div>
    </header>
  );
};

export default Header; 