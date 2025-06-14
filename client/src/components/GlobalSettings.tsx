import { useState, useEffect } from 'react';
import './GlobalSettings.css';

interface GlobalSettingsProps {
  apiUrl: string;
}

interface GlobalSettings {
  serverName: string;
  serverPassword: string;
  adminPassword: string;
  rconPort: number;
  maxPlayers: number;
  enableRcon: boolean;
  allowExternalAccess: boolean;
}

interface ServerResetOptions {
  arksa_server: {
    canResetWorld: boolean;
    canSelectMap: boolean;
    availableMaps: string[];
  };
  arkse_server: {
    canResetWorld: boolean;
    canSelectMap: boolean;
    availableMaps: string[];
  };
  valheim_server: {
    canResetWorld: boolean;
    canSelectSeed: boolean;
    availableMaps?: string[];
  };
  pzserver: {
    canWipeServer: boolean;
    availableMaps?: string[];
  };
  enshrouded_server: {
    canWipeServer: boolean;
    availableMaps?: string[];
  };
}

const GlobalSettings: React.FC<GlobalSettingsProps> = ({ apiUrl }) => {
  const [settings, setSettings] = useState<GlobalSettings>({
    serverName: "PHSYCO's Game Server",
    serverPassword: '',
    adminPassword: '420',
    rconPort: 32330,
    maxPlayers: 10,
    enableRcon: true,
    allowExternalAccess: false
  });
  
  const [loading, setLoading] = useState(false);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [selectedServers, setSelectedServers] = useState<string[]>([]);
  const [resetOptions, setResetOptions] = useState<ServerResetOptions>({
    arksa_server: {
      canResetWorld: true,
      canSelectMap: true,
      availableMaps: ['TheIsland', 'TheCenter', 'Ragnarok', 'Aberration', 'Extinction', 'Genesis', 'Genesis2', 'LostIsland', 'Fjordur', 'Valguero']
    },
    arkse_server: {
      canResetWorld: true,
      canSelectMap: true,
      availableMaps: ['TheIsland', 'TheCenter', 'Ragnarok', 'Aberration', 'Extinction', 'Genesis', 'Valguero', 'CrystalIsles']
    },
    valheim_server: {
      canResetWorld: true,
      canSelectSeed: true
    },
    pzserver: {
      canWipeServer: true
    },
    enshrouded_server: {
      canWipeServer: true
    }
  });

  const [selectedMap, setSelectedMap] = useState<{[key: string]: string}>({
    arksa_server: 'TheIsland',
    arkse_server: 'TheIsland'
  });
  
  const [valheimSeed, setValheimSeed] = useState('');
  const [backups, setBackups] = useState<{[key: string]: string[]}>({});
  const [selectedBackup, setSelectedBackup] = useState<{[key: string]: string}>({});
  const [serverInstallations, setServerInstallations] = useState<{[key: string]: boolean}>({});
  const [installationProgress, setInstallationProgress] = useState<{[key: string]: string}>({});

  const availableServers = [
    { id: 'arksa_server', name: 'ARK: Survival Ascended' },
    { id: 'arkse_server', name: 'ARK: Survival Evolved' },
    { id: 'valheim_server', name: 'Valheim' },
    { id: 'pzserver', name: 'Project Zomboid' },
    { id: 'enshrouded_server', name: 'Enshrouded' }
  ];

  useEffect(() => {
    loadGlobalSettings();
    loadBackups();
    checkServerInstallations();
  }, []);

  const loadGlobalSettings = async () => {
    try {
      const response = await fetch('/api/global-settings');
      if (response.ok) {
        const data = await response.json();
        setSettings(data);
      }
    } catch (error) {
      console.error('Error loading global settings:', error);
    }
  };

  const loadBackups = async () => {
    try {
      const response = await fetch('/api/servers/backups');
      if (response.ok) {
        const data = await response.json();
        setBackups(data);
      }
    } catch (error) {
      console.error('Error loading backups:', error);
    }
  };

  const checkServerInstallations = async () => {
    try {
      const response = await fetch('/api/servers/installations');
      if (response.ok) {
        const data = await response.json();
        setServerInstallations(data);
      }
    } catch (error) {
      console.error('Error checking server installations:', error);
    }
  };

  const handleSettingChange = (key: keyof GlobalSettings, value: string | number | boolean) => {
    setSettings(prev => ({
      ...prev,
      [key]: value
    }));
    setSaveStatus('idle');
  };

  const handleServerToggle = (serverId: string) => {
    setSelectedServers(prev => 
      prev.includes(serverId) 
        ? prev.filter(id => id !== serverId)
        : [...prev, serverId]
    );
  };

  const saveGlobalSettings = async () => {
    setSaveStatus('saving');
    
    try {
      const response = await fetch('/api/global-settings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(settings)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save global settings');
      }
      
      setSaveStatus('saved');
      setTimeout(() => setSaveStatus('idle'), 3000);
    } catch (error) {
      console.error('Error saving global settings:', error);
      setSaveStatus('error');
      alert(`Failed to save global settings: ${error}`);
    }
  };

  const applyToServers = async () => {
    if (selectedServers.length === 0) {
      alert('Please select at least one server to apply settings to.');
      return;
    }

    if (!confirm(`Apply global settings to ${selectedServers.length} selected server(s)?`)) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/global-settings/apply', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          settings: settings,
          servers: selectedServers
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to apply settings');
      }
      
      const result = await response.json();
      alert(`Settings applied successfully to: ${result.appliedTo.join(', ')}`);
      setSelectedServers([]);
    } catch (error) {
      console.error('Error applying settings:', error);
      alert(`Failed to apply settings: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const resetServerWorld = async (serverId: string) => {
    const serverName = availableServers.find(s => s.id === serverId)?.name || serverId;
    
    let confirmMessage = `Reset/wipe ${serverName}? This will delete all save data and cannot be undone.`;
    
    if (serverId === 'arksa_server' || serverId === 'arkse_server') {
      confirmMessage = `Reset ${serverName} world to ${selectedMap[serverId]}? This will delete all save data and cannot be undone.`;
    } else if (serverId === 'valheim_server' && valheimSeed) {
      confirmMessage = `Reset Valheim world with seed "${valheimSeed}"? This will delete all save data and cannot be undone.`;
    }
    
    if (!confirm(confirmMessage)) {
      return;
    }

    setLoading(true);
    
    try {
      const requestBody: any = { serverId };
      
      if (serverId === 'arksa_server' || serverId === 'arkse_server') {
        requestBody.mapName = selectedMap[serverId];
      } else if (serverId === 'valheim_server' && valheimSeed) {
        requestBody.seed = valheimSeed;
      }
      
      const response = await fetch('/api/servers/reset-world', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to reset server');
      }
      
      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error('Error resetting server:', error);
      alert(`Failed to reset server: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const backupWorld = async (serverId: string) => {
    const serverName = availableServers.find(s => s.id === serverId)?.name || serverId;
    const backupName = prompt(`Enter a name for this backup (e.g., "TheIsland_BeforeRagnarok"):`);
    
    if (!backupName) return;
    
    if (!confirm(`Create backup "${backupName}" for ${serverName}?`)) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/servers/backup', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverId, backupName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }
      
      const result = await response.json();
      alert(result.message);
      loadBackups(); // Refresh backup list
    } catch (error) {
      console.error('Error creating backup:', error);
      alert(`Failed to create backup: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const restoreWorld = async (serverId: string) => {
    const serverName = availableServers.find(s => s.id === serverId)?.name || serverId;
    const backupToRestore = selectedBackup[serverId];
    
    if (!backupToRestore) {
      alert('Please select a backup to restore.');
      return;
    }
    
    if (!confirm(`Restore "${backupToRestore}" for ${serverName}? This will overwrite the current world data and cannot be undone.`)) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/servers/restore', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverId, backupName: backupToRestore })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore backup');
      }
      
      const result = await response.json();
      alert(result.message);
    } catch (error) {
      console.error('Error restoring backup:', error);
      alert(`Failed to restore backup: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const deleteBackup = async (serverId: string, backupName: string) => {
    if (!confirm(`Delete backup "${backupName}"? This cannot be undone.`)) {
      return;
    }

    setLoading(true);
    
    try {
      const response = await fetch('/api/servers/backup', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverId, backupName })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete backup');
      }
      
      const result = await response.json();
      alert(result.message);
      loadBackups(); // Refresh backup list
    } catch (error) {
      console.error('Error deleting backup:', error);
      alert(`Failed to delete backup: ${error}`);
    } finally {
      setLoading(false);
    }
  };

  const installServer = async (serverId: string) => {
    const serverName = availableServers.find(s => s.id === serverId)?.name || serverId;
    
    if (!confirm(`Install ${serverName}? This will download and set up the server files.`)) {
      return;
    }

    setLoading(true);
    setInstallationProgress(prev => ({ ...prev, [serverId]: 'Starting installation...' }));
    
    try {
      const response = await fetch('/api/servers/install', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ serverId })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to install server');
      }
      
      // Poll for installation progress
      const pollProgress = async () => {
        try {
          const progressResponse = await fetch(`/api/servers/install-progress/${serverId}`);
          if (progressResponse.ok) {
            const progressData = await progressResponse.json();
            setInstallationProgress(prev => ({ ...prev, [serverId]: progressData.message }));
            
            if (progressData.completed) {
              setInstallationProgress(prev => ({ ...prev, [serverId]: 'Installation completed!' }));
              checkServerInstallations(); // Refresh installation status
              setTimeout(() => {
                setInstallationProgress(prev => ({ ...prev, [serverId]: '' }));
              }, 3000);
            } else {
              setTimeout(pollProgress, 2000); // Poll every 2 seconds
            }
          }
        } catch (error) {
          console.error('Error polling installation progress:', error);
        }
      };
      
      pollProgress();
      
    } catch (error) {
      console.error('Error installing server:', error);
      alert(`Failed to install server: ${error}`);
      setInstallationProgress(prev => ({ ...prev, [serverId]: '' }));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="global-settings">
      <div className="settings-section">
        <h3>Global Server Settings</h3>
        <p>Configure default settings that can be applied to all servers</p>
        
        <div className="settings-grid">
          <div className="setting-group">
            <label>Server Name</label>
            <input
              type="text"
              value={settings.serverName}
              onChange={(e) => handleSettingChange('serverName', e.target.value)}
              placeholder="Enter server name"
            />
            <small>This name will appear in server browsers</small>
          </div>
          
          <div className="setting-group">
            <label>Server Password</label>
            <input
              type="password"
              value={settings.serverPassword}
              onChange={(e) => handleSettingChange('serverPassword', e.target.value)}
              placeholder="Leave empty for no password"
            />
            <small>Players need this password to join</small>
          </div>
          
          <div className="setting-group">
            <label>Admin Password</label>
            <input
              type="password"
              value={settings.adminPassword}
              onChange={(e) => handleSettingChange('adminPassword', e.target.value)}
              placeholder="Admin password"
            />
            <small>Used for admin commands and RCON</small>
          </div>
          
          <div className="setting-group">
            <label>RCON Port</label>
            <input
              type="number"
              value={settings.rconPort}
              onChange={(e) => handleSettingChange('rconPort', parseInt(e.target.value))}
              min="1024"
              max="65535"
            />
            <small>Port for remote console access</small>
          </div>
          
          <div className="setting-group">
            <label>Max Players</label>
            <input
              type="number"
              value={settings.maxPlayers}
              onChange={(e) => handleSettingChange('maxPlayers', parseInt(e.target.value))}
              min="1"
              max="100"
            />
            <small>Maximum number of players</small>
          </div>
          
          <div className="setting-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.enableRcon}
                onChange={(e) => handleSettingChange('enableRcon', e.target.checked)}
              />
              Enable RCON
            </label>
            <small>Allow remote console access</small>
          </div>
          
          <div className="setting-group checkbox-group">
            <label>
              <input
                type="checkbox"
                checked={settings.allowExternalAccess}
                onChange={(e) => handleSettingChange('allowExternalAccess', e.target.checked)}
              />
              Allow External Access
            </label>
            <small>Allow connections from outside your local network (requires port forwarding)</small>
          </div>
        </div>
        
        <div className="settings-actions">
          <button 
            onClick={saveGlobalSettings}
            disabled={saveStatus === 'saving'}
            className="save-button"
          >
            {saveStatus === 'saving' ? 'Saving...' : 'Save Global Settings'}
          </button>
          <span className={`save-status ${saveStatus}`}>
            {saveStatus === 'saved' && 'Settings saved!'}
            {saveStatus === 'error' && 'Error saving!'}
          </span>
        </div>
      </div>

      <div className="apply-section">
        <h3>Apply to Servers</h3>
        <p>Select servers to apply these settings to</p>
        
        <div className="server-selection">
          {availableServers.map(server => (
            <label key={server.id} className="server-checkbox">
              <input
                type="checkbox"
                checked={selectedServers.includes(server.id)}
                onChange={() => handleServerToggle(server.id)}
              />
              {server.name}
            </label>
          ))}
        </div>
        
        <button 
          onClick={applyToServers}
          disabled={loading || selectedServers.length === 0}
          className="apply-button"
        >
          {loading ? 'Applying...' : `Apply to ${selectedServers.length} Server(s)`}
        </button>
      </div>

      <div className="installation-section">
        <h3>Server Installation</h3>
        <p>Install missing game servers automatically</p>
        
        <div className="installation-grid">
          {availableServers.map(server => (
            <div key={server.id} className="installation-card">
              <div className="installation-header">
                <h4>{server.name}</h4>
                <div className={`installation-status ${serverInstallations[server.id] ? 'installed' : 'missing'}`}>
                  {serverInstallations[server.id] ? '✅ Installed' : '❌ Missing'}
                </div>
              </div>
              
              {installationProgress[server.id] && (
                <div className="installation-progress">
                  {installationProgress[server.id]}
                </div>
              )}
              
              {!serverInstallations[server.id] && (
                <button 
                  onClick={() => installServer(server.id)}
                  disabled={loading || !!installationProgress[server.id]}
                  className="install-button"
                >
                  {installationProgress[server.id] ? 'Installing...' : 'Install Server'}
                </button>
              )}
              
              {serverInstallations[server.id] && (
                <div className="installation-actions">
                  <button 
                    onClick={() => checkServerInstallations()}
                    disabled={loading}
                    className="refresh-button"
                  >
                    Refresh Status
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      <div className="reset-section">
        <h3>Server World Management</h3>
        <p>Reset worlds, change maps, or wipe server data</p>
        
        {availableServers.map(server => (
          <div key={server.id} className="server-reset-card">
            <h4>{server.name}</h4>
            
            {(server.id === 'arksa_server' || server.id === 'arkse_server') && (
              <div className="map-selection">
                <label>Select Map:</label>
                <select
                  value={selectedMap[server.id]}
                  onChange={(e) => setSelectedMap(prev => ({
                    ...prev,
                    [server.id]: e.target.value
                  }))}
                >
                  {resetOptions[server.id as keyof ServerResetOptions].availableMaps?.map((map: string) => (
                    <option key={map} value={map}>{map}</option>
                  ))}
                </select>
              </div>
            )}
            
            {server.id === 'valheim_server' && (
              <div className="seed-input">
                <label>World Seed (optional):</label>
                <input
                  type="text"
                  value={valheimSeed}
                  onChange={(e) => setValheimSeed(e.target.value)}
                  placeholder="Leave empty for random seed"
                />
              </div>
            )}
            
            <div className="backup-section">
              <h5>Backup Management</h5>
              <div className="backup-controls">
                <button 
                  onClick={() => backupWorld(server.id)}
                  disabled={loading}
                  className="backup-button"
                >
                  Create Backup
                </button>
                
                {backups[server.id] && backups[server.id].length > 0 && (
                  <div className="restore-controls">
                    <select
                      value={selectedBackup[server.id] || ''}
                      onChange={(e) => setSelectedBackup(prev => ({
                        ...prev,
                        [server.id]: e.target.value
                      }))}
                    >
                      <option value="">Select backup to restore...</option>
                      {backups[server.id].map((backup: string) => (
                        <option key={backup} value={backup}>{backup}</option>
                      ))}
                    </select>
                    <button 
                      onClick={() => restoreWorld(server.id)}
                      disabled={loading || !selectedBackup[server.id]}
                      className="restore-button"
                    >
                      Restore
                    </button>
                    {selectedBackup[server.id] && (
                      <button 
                        onClick={() => deleteBackup(server.id, selectedBackup[server.id])}
                        disabled={loading}
                        className="delete-backup-button"
                      >
                        Delete
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
            
            <div className="reset-section-divider"></div>
            
            <button 
              onClick={() => resetServerWorld(server.id)}
              disabled={loading}
              className="reset-button"
            >
              {server.id === 'arksa_server' || server.id === 'arkse_server' 
                ? `Reset to ${selectedMap[server.id]}`
                : server.id === 'valheim_server'
                ? 'Reset World'
                : 'Wipe Server Data'
              }
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};

export default GlobalSettings; 