import React from 'react';
import './Welcome.css';

const Welcome: React.FC = () => {
  return (
    <div className="welcome">
      <div className="welcome-header">
        <h1>🎮 Welcome to PHSYCO's Game Server Manager</h1>
        <p className="welcome-subtitle">Your all-in-one solution for managing game servers with ease</p>
      </div>

      <div className="welcome-content">
        <div className="feature-grid">
          <div className="feature-card">
            <div className="feature-icon">🖥️</div>
            <h3>Server Management</h3>
            <p>Start, stop, and monitor multiple game servers from one unified interface. Support for ARK, Valheim, Project Zomboid, and Enshrouded.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">💾</div>
            <h3>World Backup & Restore</h3>
            <p>Create named backups of your worlds before making changes. Switch between maps or experiment safely knowing you can always restore.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">⚙️</div>
            <h3>Configuration Editor</h3>
            <p>Edit server configuration files directly in your browser. No need to navigate complex folder structures or use external editors.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🌐</div>
            <h3>Port Management</h3>
            <p>Manage port forwarding rules with automatic firewall configuration. Enable/disable external access with one click.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">🎯</div>
            <h3>RCON Console</h3>
            <p>Execute server commands remotely through RCON. Manage players, spawn items, and control your servers without joining the game.</p>
          </div>

          <div className="feature-card">
            <div className="feature-icon">📊</div>
            <h3>Live Monitoring</h3>
            <p>Real-time server console output, status monitoring, and performance tracking. Know exactly what's happening with your servers.</p>
          </div>
        </div>

        <div className="quick-start">
          <h2>🚀 Quick Start Guide</h2>
          <div className="quick-start-steps">
            <div className="step">
              <span className="step-number">1</span>
              <div className="step-content">
                <h4>Check Instructions Tab</h4>
                <p>Review the setup checklist and port forwarding guide</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">2</span>
              <div className="step-content">
                <h4>Install Missing Servers</h4>
                <p>Use the server installation feature for any missing game servers</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">3</span>
              <div className="step-content">
                <h4>Configure Global Settings</h4>
                <p>Set default server names, passwords, and external access preferences</p>
              </div>
            </div>
            <div className="step">
              <span className="step-number">4</span>
              <div className="step-content">
                <h4>Start Your Servers</h4>
                <p>Select a server from the sidebar and click Start to begin hosting</p>
              </div>
            </div>
            <div className="step step-wide">
              <span className="step-number">5</span>
              <div className="step-content">
                <h4>Unleash Digital Chaos</h4>
                <div className="chaos-list">
                  <ul>
                    <li>🦕 <strong>ARK:</strong> Tame prehistoric beasts on mysterious floating islands</li>
                    <li>⚔️ <strong>Valheim:</strong> Embrace the Viking lifestyle surviving brutal wilderness</li>
                    <li>🧟 <strong>Project Zomboid:</strong> Fight through zombie-infested wastelands</li>
                    <li>🏰 <strong>Enshrouded:</strong> Build and survive in a mystical shrouded realm</li>
                    <li>🔥 <strong>More Savage Digital Mayhem:</strong> Additional epic adventures await!</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="welcome-footer">
          <div className="system-info">
            <h3>📋 System Information</h3>
            <div className="info-grid">
              <div className="info-item">
                <strong>Manager Port:</strong> 54321
              </div>
              <div className="info-item">
                <strong>Web Interface:</strong> http://localhost:5173
              </div>
              <div className="info-item">
                <strong>Backup Location:</strong> GameServerManager/backups/
              </div>
              <div className="info-item">
                <strong>Config Location:</strong> Each server's respective folder
              </div>
            </div>
          </div>

          <div className="tips">
            <h3>💡 Pro Tips</h3>
            <ul>
              <li>Always create a backup before changing maps or major settings</li>
              <li>Use descriptive backup names like "TheIsland_Level85_BeforeRagnarok"</li>
              <li>Check the Instructions tab for router-specific port forwarding guides</li>
              <li>Monitor server console output to troubleshoot issues</li>
              <li>Use Global Settings to apply configurations to multiple servers at once</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Welcome; 