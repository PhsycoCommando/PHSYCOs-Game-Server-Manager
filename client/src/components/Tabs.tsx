import React from 'react';
import './Tabs.css';

interface TabsProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const Tabs: React.FC<TabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="tabs">
      <button 
        className={`tab-button ${activeTab === 'welcome' ? 'active' : ''}`}
        onClick={() => onTabChange('welcome')}
      >
        Welcome
      </button>
      <button 
        className={`tab-button ${activeTab === 'instructions' ? 'active' : ''}`}
        onClick={() => onTabChange('instructions')}
      >
        Instructions
      </button>
      <button 
        className={`tab-button ${activeTab === 'console' ? 'active' : ''}`}
        onClick={() => onTabChange('console')}
      >
        Server Console
      </button>
      <button 
        className={`tab-button ${activeTab === 'rcon' ? 'active' : ''}`}
        onClick={() => onTabChange('rcon')}
      >
        RCON Commands
      </button>
      <button 
        className={`tab-button ${activeTab === 'config' ? 'active' : ''}`}
        onClick={() => onTabChange('config')}
      >
        Config Editor
      </button>
      <button 
        className={`tab-button ${activeTab === 'ports' ? 'active' : ''}`}
        onClick={() => onTabChange('ports')}
      >
        Port Forwarding
      </button>
      <button 
        className={`tab-button ${activeTab === 'settings' ? 'active' : ''}`}
        onClick={() => onTabChange('settings')}
      >
        Global Settings
      </button>
      <button 
        className={`tab-button ${activeTab === 'support' ? 'active' : ''}`}
        onClick={() => onTabChange('support')}
      >
        Support & Feedback
      </button>
    </div>
  );
};

export default Tabs; 