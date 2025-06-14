import { useState, useEffect } from 'react';
// Import axios only when we actually use it for API calls
// import axios from 'axios';
import './ConfigEditor.css';

interface ConfigEditorProps {
  serverName: string;
  apiUrl: string;
}

interface ConfigFile {
  name: string;
  path: string;
  relativePath: string;
  content: string;
}

interface Backup {
  name: string;
  path: string;
  created: string;
  size: number;
}

interface ConfigPreset {
  name: string;
  description: string;
  created: string;
  files: { [fileName: string]: string };
}

// Mock config files for development
const getMockConfigFiles = (serverName: string): ConfigFile[] => {
  switch (serverName) {
    case 'arksa_server':
      return [
        {
          name: 'GameUserSettings.ini',
          path: '/arksa_server/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini',
          relativePath: '/arksa_server/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini',
          content: `[ServerSettings]
ServerName=PHSYCO's ARK Server
ServerPassword=
ServerAdminPassword=420
RCONEnabled=True
RCONPort=32330
DifficultyOffset=0.5
MaxPlayers=10

[/Script/ShooterGame.ShooterGameUserSettings]
MasterAudioVolume=1.000000
MusicAudioVolume=1.000000
SFXAudioVolume=1.000000
CameraShakeScale=1.000000
bFirstPersonRiding=False
bThirdPersonPlayer=True
bShowStatusNotificationMessages=True
bCraftablesShowAllItems=True
bLocalInventoryShowAllItems=False
bRemoteInventoryShowAllItems=False
bAutoUnlockEngrams=False`
        },
        {
          name: 'Game.ini',
          path: '/arksa_server/ShooterGame/Saved/Config/WindowsServer/Game.ini',
          relativePath: '/arksa_server/ShooterGame/Saved/Config/WindowsServer/Game.ini',
          content: `[/Script/ShooterGame.ShooterGameMode]
bAllowFlyerCarryPvE=True
XPMultiplier=2.0
TamingSpeedMultiplier=3.0
HarvestAmountMultiplier=2.0
ResourcesRespawnPeriodMultiplier=0.5
MatingIntervalMultiplier=0.5
BabyMatureSpeedMultiplier=5.0
EggHatchSpeedMultiplier=5.0
BabyCuddleIntervalMultiplier=0.5
BabyImprintAmountMultiplier=2.0
BabyCuddleGracePeriodMultiplier=2.0`
        }
      ];
    case 'arkse_server':
      return [
        {
          name: 'GameUserSettings.ini',
          path: '/arkse_server/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini',
          relativePath: '/arkse_server/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini',
          content: `[ServerSettings]
ServerName=PHSYCO's ARK SE Server
ServerPassword=
ServerAdminPassword=420
RCONEnabled=True
RCONPort=32330
DifficultyOffset=0.5
MaxPlayers=10`
        }
      ];
    case 'valheim_server':
      return [
        {
          name: 'start_server.bat',
          path: '/valheim_server/start_server.bat',
          relativePath: '/valheim_server/start_server.bat',
          content: `@echo off
set SteamAppId=892970
echo "Starting server PRESS CTRL-C to exit"
valheim_server.exe -name "PHSYCO's Valheim" -port 2456 -world "MyValheimWorld" -password "viking" -public 0`
        }
      ];
    case 'pzserver':
      return [
        {
          name: 'server.ini',
          path: '/pz_server/server.ini',
          relativePath: '/pz_server/server.ini',
          content: `# Project Zomboid Server Configuration

# Server name
PublicName=PHSYCO's PZ Server

# Server password (leave empty for no password)
Password=

# Max players
MaxPlayers=16

# PVP
PVP=false

# Mods
Mods=`
        }
      ];
    case 'enshrouded_server':
      return [
        {
          name: 'enshrouded_server.json',
          path: '/enshrouded_server/enshrouded_server.json',
          relativePath: '/enshrouded_server/enshrouded_server.json',
          content: `{
  "name": "PHSYCO's Enshrouded Server",
  "password": "",
  "saveDirectory": "./savegame",
  "logDirectory": "./logs",
  "ip": "0.0.0.0",
  "gamePort": 15636,
  "queryPort": 15637,
  "slotCount": 16
}`
        }
      ];
    default:
      return [];
  }
};

const ConfigEditor: React.FC<ConfigEditorProps> = ({ serverName, apiUrl }) => {
  const [configFiles, setConfigFiles] = useState<ConfigFile[]>([]);
  const [selectedFile, setSelectedFile] = useState<ConfigFile | null>(null);
  const [editedContent, setEditedContent] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  const [backups, setBackups] = useState<Backup[]>([]);
  const [showBackups, setShowBackups] = useState(false);
  const [backupName, setBackupName] = useState('');
  
  // Configuration preset states
  const [presets, setPresets] = useState<ConfigPreset[]>([]);
  const [showPresets, setShowPresets] = useState(false);
  const [presetName, setPresetName] = useState('');
  const [presetDescription, setPresetDescription] = useState('');

  // Load config files when serverName changes
  useEffect(() => {
    fetchConfigFiles();
    fetchBackups();
    fetchPresets();
  }, [serverName]);

  const fetchConfigFiles = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/servers/${serverName}/config/files`);
      
      if (!response.ok) {
        throw new Error(`Failed to fetch config files: ${response.statusText}`);
      }
      
      const files = await response.json();
      setConfigFiles(files);
      
      // Select the first file by default
      if (files.length > 0) {
        setSelectedFile(files[0]);
        setEditedContent(files[0].content);
      } else {
        setSelectedFile(null);
        setEditedContent('');
      }
      
      setLoading(false);
    } catch (err) {
      console.error('Error fetching config files:', err);
      setError(`Failed to load configuration files: ${err}`);
      setLoading(false);
    }
  };

  const fetchBackups = async () => {
    try {
      const response = await fetch(`/api/servers/${serverName}/config/backups`);
      if (response.ok) {
        const backupList = await response.json();
        setBackups(backupList);
      }
    } catch (err) {
      console.error('Error fetching backups:', err);
    }
  };

  const fetchPresets = async () => {
    try {
      const response = await fetch(`/api/servers/${serverName}/config/presets`);
      if (response.ok) {
        const presetList = await response.json();
        setPresets(presetList);
      }
    } catch (err) {
      console.error('Error fetching presets:', err);
    }
  };

  const handleFileSelect = (file: ConfigFile) => {
    setSelectedFile(file);
    setEditedContent(file.content);
    setSaveStatus('idle');
  };

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setEditedContent(e.target.value);
    setSaveStatus('idle');
  };

  const handleSave = async () => {
    if (!selectedFile) return;
    
    setSaveStatus('saving');
    
    try {
      const response = await fetch(`/api/servers/${serverName}/config/save`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          filePath: selectedFile.path,
          content: editedContent
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save file');
      }
      
      // Update the file content in our state
      const updatedFiles = configFiles.map(file => 
        file.path === selectedFile.path 
          ? { ...file, content: editedContent } 
          : file
      );
      
      setConfigFiles(updatedFiles);
      setSelectedFile({ ...selectedFile, content: editedContent });
      setSaveStatus('saved');
      
      // Reset save status after 3 seconds
      setTimeout(() => {
        setSaveStatus('idle');
      }, 3000);
    } catch (err) {
      console.error('Error saving config file:', err);
      setSaveStatus('error');
      alert(`Failed to save file: ${err}`);
    }
  };

  const handleOpenLocalFiles = async () => {
    try {
      const response = await fetch(`/api/servers/${serverName}/open-config`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        throw new Error(`Failed to open config folder`);
      }
      
      const result = await response.json();
      console.log(result.message);
    } catch (error) {
      console.error(`Error opening config folder:`, error);
      alert(`Failed to open config folder: ${error}`);
    }
  };

  const handleCreateDefault = async () => {
    if (!confirm('This will create default configuration files. Any existing files will be overwritten. Continue?')) {
      return;
    }
    
    try {
      const response = await fetch(`/api/servers/${serverName}/config/create-default`, {
        method: 'POST',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create default config');
      }
      
      const result = await response.json();
      alert(`Default config files created: ${result.files.join(', ')}`);
      
      // Refresh the config files list
      await fetchConfigFiles();
    } catch (err) {
      console.error('Error creating default config:', err);
      alert(`Failed to create default config: ${err}`);
    }
  };

  const handleBackup = async () => {
    if (!backupName.trim()) {
      alert('Please enter a backup name');
      return;
    }
    
    try {
      const response = await fetch(`/api/servers/${serverName}/config/backup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backupName: backupName.trim()
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to create backup');
      }
      
      const result = await response.json();
      alert(result.message);
      setBackupName('');
      
      // Refresh backups list
      await fetchBackups();
    } catch (err) {
      console.error('Error creating backup:', err);
      alert(`Failed to create backup: ${err}`);
    }
  };

  const handleRestore = async (backup: Backup) => {
    if (!confirm(`This will restore the configuration from backup "${backup.name}". Current config will be overwritten. Continue?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/servers/${serverName}/config/restore`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          backupName: backup.name
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to restore backup');
      }
      
      const result = await response.json();
      alert(result.message);
      
      // Refresh the config files list
      await fetchConfigFiles();
    } catch (err) {
      console.error('Error restoring backup:', err);
      alert(`Failed to restore backup: ${err}`);
    }
  };

  const handleSavePreset = async () => {
    if (!presetName.trim()) {
      alert('Please enter a preset name');
      return;
    }
    
    try {
      // Create preset object with current config file contents
      const presetFiles: { [fileName: string]: string } = {};
      configFiles.forEach(file => {
        presetFiles[file.name] = file.content;
      });
      
      const response = await fetch(`/api/servers/${serverName}/config/presets`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: presetName.trim(),
          description: presetDescription.trim() || 'No description',
          files: presetFiles
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to save preset');
      }
      
      const result = await response.json();
      alert(result.message);
      setPresetName('');
      setPresetDescription('');
      
      // Refresh presets list
      await fetchPresets();
    } catch (err) {
      console.error('Error saving preset:', err);
      alert(`Failed to save preset: ${err}`);
    }
  };

  const handleLoadPreset = async (preset: ConfigPreset) => {
    if (!confirm(`This will load the "${preset.name}" configuration preset. Current unsaved changes will be lost. Continue?`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/servers/${serverName}/config/presets/load`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presetName: preset.name
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to load preset');
      }
      
      const result = await response.json();
      alert(result.message);
      
      // Refresh the config files list
      await fetchConfigFiles();
    } catch (err) {
      console.error('Error loading preset:', err);
      alert(`Failed to load preset: ${err}`);
    }
  };

  const handleDeletePreset = async (preset: ConfigPreset) => {
    if (!confirm(`Are you sure you want to delete the "${preset.name}" preset? This cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await fetch(`/api/servers/${serverName}/config/presets`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          presetName: preset.name
        })
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to delete preset');
      }
      
      const result = await response.json();
      alert(result.message);
      
      // Refresh presets list
      await fetchPresets();
    } catch (err) {
      console.error('Error deleting preset:', err);
      alert(`Failed to delete preset: ${err}`);
    }
  };

  if (loading) {
    return <div className="config-editor-loading">Loading configuration files...</div>;
  }

  if (error) {
    return (
      <div className="config-editor-error">
        <p>{error}</p>
        <button onClick={handleCreateDefault} className="save-button">
          Create Default Config Files
        </button>
      </div>
    );
  }

  if (configFiles.length === 0) {
    return (
      <div className="config-editor-empty">
        <p>No configuration files found for {serverName}.</p>
        <button onClick={handleCreateDefault} className="save-button">
          Create Default Config Files
        </button>
      </div>
    );
  }

  return (
    <div className="config-editor">
      <div className="file-selector">
        <h3>Configuration Files</h3>
        <ul className="file-list">
          {configFiles.map((file) => (
            <li 
              key={file.path}
              className={selectedFile?.path === file.path ? 'selected' : ''}
              onClick={() => handleFileSelect(file)}
            >
              {file.name}
            </li>
          ))}
        </ul>
        
        <div className="config-actions">
          <button onClick={handleCreateDefault} className="action-button">
            Create Default
          </button>
          <button onClick={() => setShowPresets(!showPresets)} className="action-button">
            {showPresets ? 'Hide' : 'Show'} Presets
          </button>
          <button onClick={() => setShowBackups(!showBackups)} className="action-button">
            {showBackups ? 'Hide' : 'Show'} Backups
          </button>
        </div>
        
        {showPresets && (
          <div className="preset-section">
            <h4>Save Configuration Preset</h4>
            <div className="preset-create">
              <input
                type="text"
                placeholder="Preset name (e.g., '10x Boosted XP')"
                value={presetName}
                onChange={(e) => setPresetName(e.target.value)}
                className="preset-input"
              />
              <input
                type="text"
                placeholder="Description (optional)"
                value={presetDescription}
                onChange={(e) => setPresetDescription(e.target.value)}
                className="preset-input"
              />
              <button onClick={handleSavePreset} className="action-button">
                Save Preset
              </button>
            </div>
            
            <h4>Load Configuration Preset</h4>
            <div className="preset-list">
              {presets.length === 0 ? (
                <p>No presets found</p>
              ) : (
                presets.map((preset) => (
                  <div key={preset.name} className="preset-item">
                    <div className="preset-info">
                      <span className="preset-name">{preset.name}</span>
                      <span className="preset-description">{preset.description}</span>
                      <span className="preset-date">
                        {new Date(preset.created).toLocaleString()}
                      </span>
                    </div>
                    <div className="preset-actions">
                      <button 
                        onClick={() => handleLoadPreset(preset)}
                        className="load-button"
                      >
                        Load
                      </button>
                      <button 
                        onClick={() => handleDeletePreset(preset)}
                        className="delete-button"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
        
        {showBackups && (
          <div className="backup-section">
            <h4>Create Backup</h4>
            <div className="backup-create">
              <input
                type="text"
                placeholder="Backup name"
                value={backupName}
                onChange={(e) => setBackupName(e.target.value)}
                className="backup-input"
              />
              <button onClick={handleBackup} className="action-button">
                Backup
              </button>
            </div>
            
            <h4>Restore from Backup</h4>
            <div className="backup-list">
              {backups.length === 0 ? (
                <p>No backups found</p>
              ) : (
                backups.map((backup) => (
                  <div key={backup.name} className="backup-item">
                    <span className="backup-name">{backup.name}</span>
                    <span className="backup-date">
                      {new Date(backup.created).toLocaleString()}
                    </span>
                    <button 
                      onClick={() => handleRestore(backup)}
                      className="restore-button"
                    >
                      Restore
                    </button>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </div>
      
      <div className="editor-container">
        {selectedFile ? (
          <>
            <div className="editor-header">
              <h3>{selectedFile.name}</h3>
              <div className="editor-actions">
                <span className={`save-status ${saveStatus}`}>
                  {saveStatus === 'saving' && 'Saving...'}
                  {saveStatus === 'saved' && 'Saved!'}
                  {saveStatus === 'error' && 'Error saving!'}
                </span>
                <button 
                  className="save-button"
                  onClick={handleSave}
                  disabled={saveStatus === 'saving'}
                >
                  {saveStatus === 'saving' ? 'Saving...' : 'Save Changes'}
                </button>
                <button 
                  className="open-files-button"
                  onClick={handleOpenLocalFiles}
                >
                  Open Local Files
                </button>
              </div>
            </div>
            
            <textarea
              className="config-textarea"
              value={editedContent}
              onChange={handleContentChange}
              spellCheck={false}
            />
            
            <div className="editor-footer">
              <span className="file-path">{selectedFile.relativePath}</span>
            </div>
          </>
        ) : (
          <div className="no-file-selected">
            Select a configuration file to edit.
          </div>
        )}
      </div>
    </div>
  );
};

export default ConfigEditor; 