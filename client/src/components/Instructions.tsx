import React, { useState } from 'react';
import './Instructions.css';

const Instructions: React.FC = () => {
  const [completedSteps, setCompletedSteps] = useState<{[key: string]: boolean}>({});

  const toggleStep = (stepId: string) => {
    setCompletedSteps(prev => ({
      ...prev,
      [stepId]: !prev[stepId]
    }));
  };

  const ChecklistItem: React.FC<{id: string, children: React.ReactNode}> = ({ id, children }) => (
    <div className={`checklist-item ${completedSteps[id] ? 'completed' : ''}`}>
      <input
        type="checkbox"
        id={id}
        checked={completedSteps[id] || false}
        onChange={() => toggleStep(id)}
      />
      <label htmlFor={id}>{children}</label>
    </div>
  );

  return (
    <div className="instructions">
      <div className="instructions-header">
        <h1>📋 Setup Instructions & Guides</h1>
        <p>Complete these steps to get your game server manager fully operational</p>
      </div>

      <div className="instructions-content">
        
        {/* Initial Setup Checklist */}
        <section className="instruction-section">
          <h2>🚀 Initial Setup Checklist</h2>
          <div className="checklist">
            <ChecklistItem id="step1">
              Verify all game server folders exist in <code>C:\GameServers\</code>
            </ChecklistItem>
            <ChecklistItem id="step2">
              Install missing game servers using the installation feature
            </ChecklistItem>
            <ChecklistItem id="step3">
              Configure Global Settings (server names, passwords, RCON ports)
            </ChecklistItem>
            <ChecklistItem id="step4">
              Test server start/stop functionality for each game
            </ChecklistItem>
            <ChecklistItem id="step5">
              Create initial world backups before making any changes
            </ChecklistItem>
            <ChecklistItem id="step6">
              Configure Windows Firewall rules (handled automatically by port manager)
            </ChecklistItem>
            <ChecklistItem id="step7">
              Set up router port forwarding for external access (see guide below)
            </ChecklistItem>
          </div>
        </section>

        {/* Port Forwarding Guide */}
        <section className="instruction-section">
          <h2>🌐 Port Forwarding Setup Guide</h2>
          
          <div className="port-info">
            <h3>Required Ports by Game:</h3>
            <div className="port-grid">
              <div className="port-card">
                <h4>ARK: Survival Ascended</h4>
                <ul>
                  <li><strong>Game Port:</strong> 7777 (UDP)</li>
                  <li><strong>Query Port:</strong> 27015 (UDP)</li>
                  <li><strong>RCON Port:</strong> 32330 (TCP)</li>
                </ul>
              </div>
              <div className="port-card">
                <h4>ARK: Survival Evolved</h4>
                <ul>
                  <li><strong>Game Port:</strong> 7778 (UDP)</li>
                  <li><strong>Query Port:</strong> 27016 (UDP)</li>
                  <li><strong>RCON Port:</strong> 32331 (TCP)</li>
                </ul>
              </div>
              <div className="port-card">
                <h4>Valheim</h4>
                <ul>
                  <li><strong>Game Port:</strong> 2456-2458 (UDP)</li>
                </ul>
              </div>
              <div className="port-card">
                <h4>Project Zomboid</h4>
                <ul>
                  <li><strong>Game Port:</strong> 16261 (UDP)</li>
                  <li><strong>Steam Query:</strong> 16262 (UDP)</li>
                </ul>
              </div>
              <div className="port-card">
                <h4>Enshrouded</h4>
                <ul>
                  <li><strong>Game Port:</strong> 15636 (UDP)</li>
                  <li><strong>Query Port:</strong> 15637 (UDP)</li>
                </ul>
              </div>
            </div>
          </div>

          <div className="router-guides">
            <h3>Router-Specific Guides:</h3>
            
            <div className="router-guide">
              <h4>🔧 General Steps (Most Routers):</h4>
              <ol>
                <li>Find your router's IP address (usually 192.168.1.1 or 192.168.0.1)</li>
                <li>Open a web browser and navigate to your router's IP</li>
                <li>Log in with admin credentials (often on router label)</li>
                <li>Look for "Port Forwarding", "Virtual Server", or "NAT" settings</li>
                <li>Add rules for each game's required ports</li>
                <li>Set the internal IP to your server computer's IP</li>
                <li>Save settings and restart router if required</li>
              </ol>
            </div>

            <div className="router-brands">
              <div className="brand-card">
                <h4>Netgear Routers</h4>
                <p><strong>Path:</strong> Advanced → Dynamic DNS/Port Forwarding → Port Forwarding</p>
                <p><strong>Tip:</strong> Use "Add Custom Service" for game-specific ports</p>
              </div>
              
              <div className="brand-card">
                <h4>Linksys Routers</h4>
                <p><strong>Path:</strong> Smart Wi-Fi Tools → Port Range Forwarding</p>
                <p><strong>Tip:</strong> Enable "Gaming Accelerator" for better performance</p>
              </div>
              
              <div className="brand-card">
                <h4>ASUS Routers</h4>
                <p><strong>Path:</strong> WAN → Virtual Server/Port Forwarding</p>
                <p><strong>Tip:</strong> Use "Gaming Mode" and "Adaptive QoS"</p>
              </div>
              
              <div className="brand-card">
                <h4>TP-Link Routers</h4>
                <p><strong>Path:</strong> Advanced → NAT Forwarding → Virtual Servers</p>
                <p><strong>Tip:</strong> Enable "Game Accelerator" if available</p>
              </div>
            </div>
          </div>
        </section>

        {/* Server Installation Guide */}
        <section className="instruction-section">
          <h2>💿 Server Installation Guide</h2>
          
          <div className="installation-info">
            <div className="install-card">
              <h3>🎯 Automatic Installation</h3>
              <p>The server manager can automatically install missing game servers:</p>
              <ol>
                <li>Go to Global Settings tab</li>
                <li>Look for "Server Installation" section</li>
                <li>Click "Install" next to any missing server</li>
                <li>Wait for download and installation to complete</li>
                <li>Server will appear in the sidebar when ready</li>
              </ol>
            </div>
            
            <div className="install-card">
              <h3>📁 Manual Installation</h3>
              <p>If automatic installation fails, you can install manually:</p>
              <ol>
                <li>Download server files from official sources</li>
                <li>Extract to appropriate folder in <code>C:\GameServers\</code></li>
                <li>Ensure folder names match expected structure</li>
                <li>Restart the server manager</li>
                <li>Configure server settings as needed</li>
              </ol>
            </div>
          </div>

          <div className="folder-structure">
            <h3>📂 Expected Folder Structure:</h3>
            <div className="folder-tree">
              <div className="folder-item">📁 C:\GameServers\</div>
              <div className="folder-item indent1">📁 arksa_server\</div>
              <div className="folder-item indent2">📁 ShooterGame\</div>
              <div className="folder-item indent3">📁 Saved\</div>
              <div className="folder-item indent1">📁 arkse_server\</div>
              <div className="folder-item indent2">📁 ShooterGame\</div>
              <div className="folder-item indent1">📁 valheim_server\</div>
              <div className="folder-item indent2">📄 valheim_server.exe</div>
              <div className="folder-item indent1">📁 pz_server\</div>
              <div className="folder-item indent2">📁 Zomboid\</div>
              <div className="folder-item indent1">📁 enshrouded_server\</div>
              <div className="folder-item indent2">📄 enshrouded_server.exe</div>
              <div className="folder-item indent1">📁 GameServerManager\</div>
              <div className="folder-item indent2">📁 backups\</div>
            </div>
          </div>
        </section>

        {/* Troubleshooting */}
        <section className="instruction-section">
          <h2>🔧 Troubleshooting Common Issues</h2>
          
          <div className="troubleshooting">
            <div className="issue-card">
              <h3>❌ Server Won't Start</h3>
              <ul>
                <li>Check if server files are properly installed</li>
                <li>Verify ports aren't already in use</li>
                <li>Run as Administrator if needed</li>
                <li>Check Windows Firewall settings</li>
                <li>Review server console output for errors</li>
              </ul>
            </div>
            
            <div className="issue-card">
              <h3>🌐 Can't Connect Externally</h3>
              <ul>
                <li>Verify port forwarding is configured correctly</li>
                <li>Check if "Allow External Access" is enabled</li>
                <li>Confirm your public IP address</li>
                <li>Test with online port checker tools</li>
                <li>Ensure Windows Firewall allows the ports</li>
              </ul>
            </div>
            
            <div className="issue-card">
              <h3>💾 Backup/Restore Issues</h3>
              <ul>
                <li>Ensure sufficient disk space for backups</li>
                <li>Stop server before restoring backups</li>
                <li>Check file permissions in server directories</li>
                <li>Verify backup integrity before restoring</li>
                <li>Use descriptive backup names for organization</li>
              </ul>
            </div>
            
            <div className="issue-card">
              <h3>⚙️ Configuration Problems</h3>
              <ul>
                <li>Always backup before making config changes</li>
                <li>Use the built-in config editor when possible</li>
                <li>Restart server after configuration changes</li>
                <li>Check syntax for INI and JSON files</li>
                <li>Refer to game-specific documentation</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Security Best Practices */}
        <section className="instruction-section">
          <h2>🔒 Security Best Practices</h2>
          
          <div className="security-tips">
            <div className="security-card">
              <h3>🛡️ Server Security</h3>
              <ul>
                <li>Use strong, unique passwords for each server</li>
                <li>Change default RCON passwords immediately</li>
                <li>Only open necessary ports to the internet</li>
                <li>Regularly update server software</li>
                <li>Monitor server logs for suspicious activity</li>
                <li>Use whitelist/allowlist when possible</li>
              </ul>
            </div>
            
            <div className="security-card">
              <h3>🔐 Network Security</h3>
              <ul>
                <li>Keep router firmware updated</li>
                <li>Use WPA3 encryption for Wi-Fi</li>
                <li>Disable WPS and unnecessary services</li>
                <li>Consider using a VPN for admin access</li>
                <li>Regularly check for unauthorized devices</li>
                <li>Enable router logging and monitoring</li>
              </ul>
            </div>
          </div>
        </section>

      </div>
    </div>
  );
};

export default Instructions; 