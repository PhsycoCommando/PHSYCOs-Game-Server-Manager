const express = require('express');
const router = express.Router();
const path = require('path');
const { exec } = require('child_process');
const serverManager = require('../utils/serverProcessManager');

// Helper function to get the correct folder name for each server
function getServerFolderName(serverId) {
  const serverFolderMap = {
    'arksa_server': 'arksa_server',
    'arkse_server': 'arkse_server', 
    'valheim_server': 'valheim_server',
    'pzserver': 'pz_server',
    'enshrouded_server': 'enshrouded_server'
  };
  return serverFolderMap[serverId] || serverId;
}

// Helper function to find the root deployment directory
function findRootDeploymentDir() {
  const fs = require('fs');
  let currentDir = process.cwd(); // Start from GameServerManager directory
  
  // Go up directories until we find one that contains server folders
  while (currentDir !== path.dirname(currentDir)) { // Stop at filesystem root
    const parentDir = path.dirname(currentDir);
    
    // Check if this directory contains server folders
    const serverFolders = ['arksa_server', 'arkse_server', 'valheim_server', 'pz_server', 'enshrouded_server'];
    const foundServers = serverFolders.filter(folder => {
      return fs.existsSync(path.join(parentDir, folder));
    });
    
    // If we found at least one server folder, this is likely our root
    if (foundServers.length > 0) {
      console.log(`Detected deployment root: ${parentDir}`);
      console.log(`Found server folders: ${foundServers.join(', ')}`);
      return parentDir;
    }
    
    currentDir = parentDir;
  }
  
  // Fallback: assume we're in the standard structure
  console.log('Could not auto-detect deployment root, using fallback');
  return path.resolve(process.cwd(), '..', '..');
}

// Helper function to get server path
function getServerPath(serverId) {
  const rootDir = findRootDeploymentDir();
  const folderName = getServerFolderName(serverId);
  return path.join(rootDir, folderName);
}

// Helper function to get GameServerManager path
function getGameServerManagerPath() {
  const rootDir = findRootDeploymentDir();
  return path.join(rootDir, 'GameServerManager');
}

// Get all servers and their status
router.get('/', (req, res) => {
  try {
    const servers = serverManager.getServerStatuses();
    res.json(servers);
  } catch (error) {
    console.error('Error getting server statuses:', error);
    res.status(500).json({ error: 'Failed to get server statuses' });
  }
});

// Start a server
router.post('/:id/start', (req, res) => {
  const { id } = req.params;
  
  try {
    const result = serverManager.startServer(id);
    
    if (result.success) {
      res.json({ message: result.message, pid: result.pid });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error(`Error starting server ${id}:`, error);
    res.status(500).json({ error: `Failed to start server: ${error.message}` });
  }
});

// Stop a server
router.post('/:id/stop', (req, res) => {
  const { id } = req.params;
  
  try {
    const result = serverManager.stopServer(id);
    
    if (result.success) {
      res.json({ message: result.message });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error(`Error stopping server ${id}:`, error);
    res.status(500).json({ error: `Failed to stop server: ${error.message}` });
  }
});

// Open config folder for a server
router.post('/:id/open-config', (req, res) => {
  const { id } = req.params;
  const serverPath = getServerPath(id);
  
  let configPath;
  
  switch (id) {
    case 'arksa_server':
    case 'arkse_server':
      configPath = path.join(serverPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
      break;
    case 'valheim_server':
      configPath = serverPath;
      break;
    case 'pzserver':
      configPath = path.join(serverPath, 'Zomboid', 'Server');
      break;
    case 'enshrouded_server':
      configPath = serverPath;
      break;
    default:
      return res.status(400).json({ error: `Unknown server ID: ${id}` });
  }
  
  // Open the folder in Windows Explorer
  exec(`explorer "${configPath}"`, (error) => {
    if (error) {
      console.error(`Error opening config folder for ${id}:`, error);
      return res.status(500).json({ error: `Failed to open config folder: ${error.message}` });
    }
    
    res.json({ message: `Config folder opened for ${id}` });
  });
});

// Get console output for a server
router.get('/:id/console', (req, res) => {
  const { id } = req.params;
  
  try {
    const consoleOutput = serverManager.getConsoleOutput(id);
    res.json({ lines: consoleOutput });
  } catch (error) {
    console.error(`Error getting console output for ${id}:`, error);
    res.status(500).json({ error: `Failed to get console output: ${error.message}` });
  }
});

// Clear console output for a server
router.post('/:id/console/clear', (req, res) => {
  const { id } = req.params;
  
  try {
    const result = serverManager.clearConsoleOutput(id);
    
    if (result.success) {
      res.json({ message: `Console cleared for ${id}` });
    } else {
      res.status(400).json({ error: result.message });
    }
  } catch (error) {
    console.error(`Error clearing console output for ${id}:`, error);
    res.status(500).json({ error: `Failed to clear console output: ${error.message}` });
  }
});

// Get config files for a server
router.get('/:id/config/files', (req, res) => {
  const { id } = req.params;
  const rootDir = findRootDeploymentDir();
  const serverPath = getServerPath(id);
  
  let configPath;
  let configFiles = [];
  
  switch (id) {
    case 'arksa_server':
    case 'arkse_server':
      configPath = path.join(serverPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
      configFiles = [
        { name: 'GameUserSettings.ini', path: path.join(configPath, 'GameUserSettings.ini') },
        { name: 'Game.ini', path: path.join(configPath, 'Game.ini') }
      ];
      break;
    case 'valheim_server':
      configPath = serverPath;
      configFiles = [
        { name: 'start_server.bat', path: path.join(configPath, 'start_server.bat') }
      ];
      break;
    case 'pzserver':
      configPath = path.join(serverPath, 'Zomboid', 'Server');
      configFiles = [
        { name: 'server.ini', path: path.join(configPath, 'server.ini') }
      ];
      break;
    case 'enshrouded_server':
      configPath = serverPath;
      configFiles = [
        { name: 'enshrouded_server.json', path: path.join(configPath, 'enshrouded_server.json') }
      ];
      break;
    default:
      return res.status(400).json({ error: `Unknown server ID: ${id}` });
  }
  
  // Check which files actually exist and read their content
  const fs = require('fs');
  const existingFiles = [];
  
  configFiles.forEach(file => {
    try {
      if (fs.existsSync(file.path)) {
        const content = fs.readFileSync(file.path, 'utf-8');
        existingFiles.push({
          name: file.name,
          path: file.path,
          relativePath: path.relative(rootDir, file.path),
          content: content
        });
      }
    } catch (error) {
      console.error(`Error reading config file ${file.path}:`, error);
    }
  });
  
  res.json(existingFiles);
});

// Save a config file
router.post('/:id/config/save', (req, res) => {
  const { id } = req.params;
  const { filePath, content } = req.body;
  
  if (!filePath || content === undefined) {
    return res.status(400).json({ error: 'File path and content are required' });
  }
  
  const fs = require('fs');
  
  try {
    // Security check - ensure the file path is within our server directories
    const rootDir = findRootDeploymentDir();
    const absolutePath = path.resolve(filePath);
    if (!absolutePath.startsWith(rootDir)) {
      return res.status(403).json({ error: 'Access denied - invalid file path' });
    }
    
    // Ensure directory exists
    const dir = path.dirname(absolutePath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    
    // Write the file
    fs.writeFileSync(absolutePath, content, 'utf-8');
    
    res.json({ message: 'Config file saved successfully' });
  } catch (error) {
    console.error(`Error saving config file:`, error);
    res.status(500).json({ error: `Failed to save config file: ${error.message}` });
  }
});

// Create default config files for a server
router.post('/:id/config/create-default', (req, res) => {
  const { id } = req.params;
  const rootDir = findRootDeploymentDir();
  const fs = require('fs');
  
  let configPath;
  let defaultConfigs = [];
  
  switch (id) {
    case 'arksa_server':
      configPath = path.join(getServerPath('arksa_server'), 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
      defaultConfigs = [
        {
          name: 'GameUserSettings.ini',
          path: path.join(configPath, 'GameUserSettings.ini'),
          content: `[ServerSettings]
ServerName=PHSYCO's ARK Server
ServerPassword=
ServerAdminPassword=420
RCONEnabled=True
RCONPort=32330
DifficultyOffset=0.5
MaxPlayers=10
PvPEnabled=False
ShowMapPlayerLocation=True
AllowThirdPersonPlayer=True
AlwaysNotifyPlayerLeft=True
DontAlwaysNotifyPlayerJoined=False
ServerHardcore=False
GlobalVoiceChat=False
ProximityChat=False
NoTributeDownloads=False
AllowDownloadSurvivors=False
AllowDownloadItems=False
AllowDownloadDinos=False

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
          path: path.join(configPath, 'Game.ini'),
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
BabyCuddleGracePeriodMultiplier=2.0
bUseSingleplayerSettings=False
bDisableStructureDecayPvE=True
bAllowUnlimitedRespecs=True
bAllowPlatformSaddleMultiFloors=True
MaxStructuresInRange=10500.0`
        }
      ];
      break;
    case 'arkse_server':
      configPath = path.join(getServerPath('arkse_server'), 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
      defaultConfigs = [
        {
          name: 'GameUserSettings.ini',
          path: path.join(configPath, 'GameUserSettings.ini'),
          content: `[ServerSettings]
ServerName=PHSYCO's ARK SE Server
ServerPassword=
ServerAdminPassword=420
RCONEnabled=True
RCONPort=32330
DifficultyOffset=0.5
MaxPlayers=10
PvPEnabled=False
ShowMapPlayerLocation=True
AllowThirdPersonPlayer=True`
        }
      ];
      break;
    case 'valheim_server':
      configPath = getServerPath('valheim_server');
      defaultConfigs = [
        {
          name: 'start_server.bat',
          path: path.join(configPath, 'start_server.bat'),
          content: `@echo off
set SteamAppId=892970
echo "Starting server PRESS CTRL-C to exit"
valheim_server.exe -name "PHSYCO's Valheim" -port 2456 -world "MyValheimWorld" -password "viking" -public 0`
        }
      ];
      break;
    case 'pzserver':
      configPath = path.join(getServerPath('pzserver'), 'Zomboid', 'Server');
      defaultConfigs = [
        {
          name: 'server.ini',
          path: path.join(configPath, 'server.ini'),
          content: `# Project Zomboid Server Configuration

# Server name
PublicName=PHSYCO's PZ Server

# Server password (leave empty for no password)
Password=

# Max players
MaxPlayers=16

# PVP
PVP=false

# Pause when empty
PauseEmpty=true

# Mods
Mods=
WorkshopItems=`
        }
      ];
      break;
    case 'enshrouded_server':
      configPath = getServerPath('enshrouded_server');
      defaultConfigs = [
        {
          name: 'enshrouded_server.json',
          path: path.join(configPath, 'enshrouded_server.json'),
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
      break;
    default:
      return res.status(400).json({ error: `Unknown server ID: ${id}` });
  }
  
  try {
    // Ensure directory exists
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }
    
    // Create default config files
    const createdFiles = [];
    for (const config of defaultConfigs) {
      fs.writeFileSync(config.path, config.content, 'utf-8');
      createdFiles.push(config.name);
    }
    
    res.json({ 
      message: `Default config files created for ${id}`,
      files: createdFiles
    });
  } catch (error) {
    console.error(`Error creating default config files:`, error);
    res.status(500).json({ error: `Failed to create default config files: ${error.message}` });
  }
});

// Backup config files
router.post('/:id/config/backup', (req, res) => {
  const { id } = req.params;
  const { backupName } = req.body;
  const rootDir = findRootDeploymentDir();
  const fs = require('fs');
  
  if (!backupName) {
    return res.status(400).json({ error: 'Backup name is required' });
  }
  
  const serverPath = getServerPath(id);
  let configPath;
  
  switch (id) {
    case 'arksa_server':
    case 'arkse_server':
      configPath = path.join(serverPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
      break;
    case 'valheim_server':
      configPath = serverPath;
      break;
    case 'pzserver':
      configPath = path.join(serverPath, 'Zomboid', 'Server');
      break;
    case 'enshrouded_server':
      configPath = serverPath;
      break;
    default:
      return res.status(400).json({ error: `Unknown server ID: ${id}` });
  }
  
      try {
      const backupDir = path.join(getGameServerManagerPath(), 'backups', id);
      const backupPath = path.join(backupDir, `${backupName}_${Date.now()}`);
    
    // Ensure backup directory exists
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copy config directory to backup location
    const copyRecursiveSync = (src, dest) => {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      
      if (isDirectory) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(childItemName => {
          copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursiveSync(configPath, backupPath);
    
    res.json({ 
      message: `Config backup created successfully`,
      backupPath: backupPath
    });
  } catch (error) {
    console.error(`Error creating config backup:`, error);
    res.status(500).json({ error: `Failed to create config backup: ${error.message}` });
  }
});

// List config backups
router.get('/:id/config/backups', (req, res) => {
  const { id } = req.params;
  const fs = require('fs');
  
  try {
    const backupDir = path.join(getGameServerManagerPath(), 'backups', id);
    
    if (!fs.existsSync(backupDir)) {
      return res.json([]);
    }
    
    const backups = fs.readdirSync(backupDir)
      .map(name => {
        const backupPath = path.join(backupDir, name);
        const stats = fs.statSync(backupPath);
        return {
          name: name,
          path: backupPath,
          created: stats.mtime,
          size: stats.size
        };
      })
      .sort((a, b) => b.created.getTime() - a.created.getTime());
    
    res.json(backups);
  } catch (error) {
    console.error(`Error listing config backups:`, error);
    res.status(500).json({ error: `Failed to list config backups: ${error.message}` });
  }
});

// Restore config from backup
router.post('/:id/config/restore', (req, res) => {
  const { id } = req.params;
  const { backupName } = req.body;
  const fs = require('fs');
  
  if (!backupName) {
    return res.status(400).json({ error: 'Backup name is required' });
  }
  
  const serverPath = getServerPath(id);
  let configPath;
  
  switch (id) {
    case 'arksa_server':
    case 'arkse_server':
      configPath = path.join(serverPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
      break;
    case 'valheim_server':
      configPath = serverPath;
      break;
    case 'pzserver':
      configPath = path.join(serverPath, 'Zomboid', 'Server');
      break;
    case 'enshrouded_server':
      configPath = serverPath;
      break;
    default:
      return res.status(400).json({ error: `Unknown server ID: ${id}` });
  }
  
  try {
    const backupDir = path.join(getGameServerManagerPath(), 'backups', id);
    const backupPath = path.join(backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    // Remove current config directory
    if (fs.existsSync(configPath)) {
      fs.rmSync(configPath, { recursive: true, force: true });
    }
    
    // Copy backup to config location
    const copyRecursiveSync = (src, dest) => {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      
      if (isDirectory) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(childItemName => {
          copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursiveSync(backupPath, configPath);
    
    res.json({ 
      message: `Config restored from backup successfully`
    });
  } catch (error) {
    console.error(`Error restoring config from backup:`, error);
    res.status(500).json({ error: `Failed to restore config from backup: ${error.message}` });
  }
});

// Reset/wipe server world data
router.post('/reset-world', (req, res) => {
  const { serverId, mapName, seed } = req.body;
  const fs = require('fs');
  
  if (!serverId) {
    return res.status(400).json({ error: 'Server ID is required' });
  }
  
  try {
    let worldPath;
    let configPath;
    
    switch (serverId) {
      case 'arksa_server':
      case 'arkse_server':
        const arkServerPath = getServerPath(serverId);
        worldPath = path.join(arkServerPath, 'ShooterGame', 'Saved', 'SavedArks');
        configPath = path.join(arkServerPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
        
        // Remove all save files
        if (fs.existsSync(worldPath)) {
          fs.rmSync(worldPath, { recursive: true, force: true });
        }
        
        // Update map in config if specified
        if (mapName) {
          const gameIniPath = path.join(configPath, 'Game.ini');
          let gameIniContent = '';
          
          if (fs.existsSync(gameIniPath)) {
            gameIniContent = fs.readFileSync(gameIniPath, 'utf-8');
          }
          
          // Add or update map setting
          const lines = gameIniContent.split('\n');
          const updatedLines = [];
          let inShooterGameMode = false;
          let foundMapName = false;
          
          for (let line of lines) {
            if (line.trim() === '[/Script/ShooterGame.ShooterGameMode]') {
              inShooterGameMode = true;
              updatedLines.push(line);
              continue;
            }
            
            if (line.trim().startsWith('[') && line.trim() !== '[/Script/ShooterGame.ShooterGameMode]') {
              inShooterGameMode = false;
            }
            
            if (inShooterGameMode && line.startsWith('ServerMap=')) {
              updatedLines.push(`ServerMap=${mapName}`);
              foundMapName = true;
            } else {
              updatedLines.push(line);
            }
          }
          
          // Add map setting if not found
          if (!foundMapName) {
            if (!gameIniContent.includes('[/Script/ShooterGame.ShooterGameMode]')) {
              updatedLines.push('[/Script/ShooterGame.ShooterGameMode]');
            }
            updatedLines.push(`ServerMap=${mapName}`);
          }
          
          // Ensure directory exists
          if (!fs.existsSync(configPath)) {
            fs.mkdirSync(configPath, { recursive: true });
          }
          
          fs.writeFileSync(gameIniPath, updatedLines.join('\n'));
        }
        
        res.json({ 
          message: `${serverId} world reset successfully${mapName ? ` to ${mapName}` : ''}` 
        });
        break;
        
      case 'valheim_server':
        const valheimServerPath = getServerPath('valheim_server');
        worldPath = path.join(valheimServerPath, 'worlds');
        
        // Remove world files
        if (fs.existsSync(worldPath)) {
          fs.rmSync(worldPath, { recursive: true, force: true });
        }
        
        // Update start script with new seed if provided
        if (seed) {
          const startScriptPath = path.join(valheimServerPath, 'start_server.bat');
          const content = `@echo off
set SteamAppId=892970
echo "Starting server PRESS CTRL-C to exit"
valheim_server.exe -name "PHSYCO's Valheim" -port 2456 -world "MyValheimWorld" -password "viking" -seed "${seed}" -public 0`;
          
          fs.writeFileSync(startScriptPath, content);
        }
        
        res.json({ 
          message: `Valheim world reset successfully${seed ? ` with seed: ${seed}` : ''}` 
        });
        break;
        
      case 'pzserver':
        const pzServerPath = getServerPath('pzserver');
        worldPath = path.join(pzServerPath, 'Zomboid', 'Saves');
        
        // Remove save files
        if (fs.existsSync(worldPath)) {
          fs.rmSync(worldPath, { recursive: true, force: true });
        }
        
        res.json({ message: 'Project Zomboid server data wiped successfully' });
        break;
        
      case 'enshrouded_server':
        const enshroudedServerPath = getServerPath('enshrouded_server');
        worldPath = path.join(enshroudedServerPath, 'savegame');
        
        // Remove save files
        if (fs.existsSync(worldPath)) {
          fs.rmSync(worldPath, { recursive: true, force: true });
        }
        
        res.json({ message: 'Enshrouded server data wiped successfully' });
        break;
        
      default:
        return res.status(400).json({ error: `Unknown server ID: ${serverId}` });
    }
  } catch (error) {
    console.error(`Error resetting world for ${serverId}:`, error);
    res.status(500).json({ error: `Failed to reset world: ${error.message}` });
  }
});

// Get all backups for all servers
router.get('/backups', (req, res) => {
  const fs = require('fs');
  const backupsDir = path.join(getGameServerManagerPath(), 'backups');
  
  try {
    const backups = {};
    const serverIds = ['arksa_server', 'arkse_server', 'valheim_server', 'pzserver', 'enshrouded_server'];
    
    serverIds.forEach(serverId => {
      const serverBackupDir = path.join(backupsDir, serverId);
      backups[serverId] = [];
      
      if (fs.existsSync(serverBackupDir)) {
        const backupFolders = fs.readdirSync(serverBackupDir, { withFileTypes: true })
          .filter(dirent => dirent.isDirectory())
          .map(dirent => dirent.name)
          .sort((a, b) => {
            // Sort by creation time (newest first)
            const aPath = path.join(serverBackupDir, a);
            const bPath = path.join(serverBackupDir, b);
            const aStat = fs.statSync(aPath);
            const bStat = fs.statSync(bPath);
            return bStat.ctime - aStat.ctime;
          });
        
        backups[serverId] = backupFolders;
      }
    });
    
    res.json(backups);
  } catch (error) {
    console.error('Error getting backups:', error);
    res.status(500).json({ error: `Failed to get backups: ${error.message}` });
  }
});

// Create a backup
router.post('/backup', (req, res) => {
  const { serverId, backupName } = req.body;
  const fs = require('fs');
  
  if (!serverId || !backupName) {
    return res.status(400).json({ error: 'Server ID and backup name are required' });
  }
  
  // Sanitize backup name
  const sanitizedBackupName = backupName.replace(/[<>:"/\\|?*]/g, '_');
  
  let sourcePath;
  
  switch (serverId) {
    case 'arksa_server':
    case 'arkse_server':
      const arkPath = getServerPath(serverId);
      sourcePath = path.join(arkPath, 'ShooterGame', 'Saved');
      break;
    case 'valheim_server':
      const valheimPath = getServerPath('valheim_server');
      sourcePath = path.join(valheimPath, 'worlds');
      break;
    case 'pzserver':
      const pzPath = getServerPath('pzserver');
      sourcePath = path.join(pzPath, 'Zomboid', 'Saves');
      break;
    case 'enshrouded_server':
      const enshroudedPath = getServerPath('enshrouded_server');
      sourcePath = path.join(enshroudedPath, 'savegame');
      break;
    default:
      return res.status(400).json({ error: `Unknown server ID: ${serverId}` });
  }
  
  try {
    const backupDir = path.join(getGameServerManagerPath(), 'backups', serverId);
    const backupPath = path.join(backupDir, sanitizedBackupName);
    
    // Check if backup already exists
    if (fs.existsSync(backupPath)) {
      return res.status(400).json({ error: 'Backup with this name already exists' });
    }
    
    // Check if source exists
    if (!fs.existsSync(sourcePath)) {
      return res.status(400).json({ error: 'No world data found to backup' });
    }
    
    // Create backup directory
    if (!fs.existsSync(backupDir)) {
      fs.mkdirSync(backupDir, { recursive: true });
    }
    
    // Copy files recursively
    const copyRecursiveSync = (src, dest) => {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      
      if (isDirectory) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest);
        }
        fs.readdirSync(src).forEach(childItemName => {
          copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
      } else {
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursiveSync(sourcePath, backupPath);
    
    res.json({ 
      message: `Backup "${sanitizedBackupName}" created successfully for ${serverId}` 
    });
  } catch (error) {
    console.error(`Error creating backup for ${serverId}:`, error);
    res.status(500).json({ error: `Failed to create backup: ${error.message}` });
  }
});

// Restore from backup
router.post('/restore', (req, res) => {
  const { serverId, backupName } = req.body;
  const fs = require('fs');
  
  if (!serverId || !backupName) {
    return res.status(400).json({ error: 'Server ID and backup name are required' });
  }
  
  let targetPath;
  
  switch (serverId) {
    case 'arksa_server':
    case 'arkse_server':
      const arkRestorePath = getServerPath(serverId);
      targetPath = path.join(arkRestorePath, 'ShooterGame', 'Saved');
      break;
    case 'valheim_server':
      const valheimRestorePath = getServerPath('valheim_server');
      targetPath = path.join(valheimRestorePath, 'worlds');
      break;
    case 'pzserver':
      const pzRestorePath = getServerPath('pzserver');
      targetPath = path.join(pzRestorePath, 'Zomboid', 'Saves');
      break;
    case 'enshrouded_server':
      const enshroudedRestorePath = getServerPath('enshrouded_server');
      targetPath = path.join(enshroudedRestorePath, 'savegame');
      break;
    default:
      return res.status(400).json({ error: `Unknown server ID: ${serverId}` });
  }
  
  try {
    const backupDir = path.join(getGameServerManagerPath(), 'backups', serverId);
    const backupPath = path.join(backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    // Remove current world data
    if (fs.existsSync(targetPath)) {
      fs.rmSync(targetPath, { recursive: true, force: true });
    }
    
    // Copy backup to target location
    const copyRecursiveSync = (src, dest) => {
      const exists = fs.existsSync(src);
      const stats = exists && fs.statSync(src);
      const isDirectory = exists && stats.isDirectory();
      
      if (isDirectory) {
        if (!fs.existsSync(dest)) {
          fs.mkdirSync(dest, { recursive: true });
        }
        fs.readdirSync(src).forEach(childItemName => {
          copyRecursiveSync(path.join(src, childItemName), path.join(dest, childItemName));
        });
      } else {
        // Ensure parent directory exists
        const parentDir = path.dirname(dest);
        if (!fs.existsSync(parentDir)) {
          fs.mkdirSync(parentDir, { recursive: true });
        }
        fs.copyFileSync(src, dest);
      }
    };
    
    copyRecursiveSync(backupPath, targetPath);
    
    res.json({ 
      message: `World restored from backup "${backupName}" successfully for ${serverId}` 
    });
  } catch (error) {
    console.error(`Error restoring backup for ${serverId}:`, error);
    res.status(500).json({ error: `Failed to restore backup: ${error.message}` });
  }
});

// Delete a backup
router.delete('/backup', (req, res) => {
  const { serverId, backupName } = req.body;
  const fs = require('fs');
  
  if (!serverId || !backupName) {
    return res.status(400).json({ error: 'Server ID and backup name are required' });
  }
  
  try {
    const backupDir = path.join(getGameServerManagerPath(), 'backups', serverId);
    const backupPath = path.join(backupDir, backupName);
    
    if (!fs.existsSync(backupPath)) {
      return res.status(404).json({ error: 'Backup not found' });
    }
    
    // Remove backup directory
    fs.rmSync(backupPath, { recursive: true, force: true });
    
    res.json({ 
      message: `Backup "${backupName}" deleted successfully` 
    });
  } catch (error) {
    console.error(`Error deleting backup:`, error);
    res.status(500).json({ error: `Failed to delete backup: ${error.message}` });
  }
});

// Check server installations
router.get('/installations', (req, res) => {
  const rootDir = findRootDeploymentDir();
  const fs = require('fs');
  
  try {
    const installations = {};
    
    // Map server IDs to actual folder names
    const serverFolderMap = {
      'arksa_server': 'arksa_server',
      'arkse_server': 'arkse_server', 
      'valheim_server': 'valheim_server',
      'pzserver': 'pz_server',
      'enshrouded_server': 'enshrouded_server'
    };
    
    Object.keys(serverFolderMap).forEach(serverId => {
      const folderName = serverFolderMap[serverId];
      const serverPath = path.join(rootDir, folderName);
      installations[serverId] = fs.existsSync(serverPath);
    });
    
    res.json(installations);
  } catch (error) {
    console.error('Error checking server installations:', error);
    res.status(500).json({ error: `Failed to check server installations: ${error.message}` });
  }
});

// Install a server
const installationProgress = {};

router.post('/install', (req, res) => {
  const { serverId } = req.body;
  const fs = require('fs');
  
  if (!serverId) {
    return res.status(400).json({ error: 'Server ID is required' });
  }
  
  const serverPath = getServerPath(serverId);
  
  // Check if server is already installed
  if (fs.existsSync(serverPath)) {
    return res.status(400).json({ error: 'Server is already installed' });
  }
  
  // Initialize installation progress
  installationProgress[serverId] = {
    message: 'Starting installation...',
    completed: false
  };
  
  // Start installation process (simplified for demo)
  setTimeout(() => {
    try {
      installationProgress[serverId].message = 'Creating server directory...';
      
      // Create server directory
      fs.mkdirSync(serverPath, { recursive: true });
      
      setTimeout(() => {
        installationProgress[serverId].message = 'Setting up server files...';
        
        // Create basic server structure based on server type
        switch (serverId) {
          case 'arksa_server':
          case 'arkse_server':
            const shooterGamePath = path.join(serverPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
            fs.mkdirSync(shooterGamePath, { recursive: true });
            
            // Create basic config files
            const gameUserSettings = `[ServerSettings]
ServerName=PHSYCO's ${serverId === 'arksa_server' ? 'ASA' : 'ASE'} Server
ServerPassword=
ServerAdminPassword=420
MaxPlayers=10
RCONEnabled=true
RCONPort=${serverId === 'arksa_server' ? '32330' : '32331'}
MultiHome=127.0.0.1`;
            
            fs.writeFileSync(path.join(shooterGamePath, 'GameUserSettings.ini'), gameUserSettings);
            
            // Create start script
            const startScript = `@echo off
echo Starting ${serverId === 'arksa_server' ? 'ARK: Survival Ascended' : 'ARK: Survival Evolved'} Server...
echo This is a demo installation. Replace with actual server executable.
pause`;
            fs.writeFileSync(path.join(serverPath, 'start_server.bat'), startScript);
            break;
            
          case 'valheim_server':
            // Create basic Valheim structure
            const valheimStartScript = `@echo off
set SteamAppId=892970
echo Starting Valheim Server...
echo This is a demo installation. Replace with actual server executable.
pause`;
            fs.writeFileSync(path.join(serverPath, 'start_server.bat'), valheimStartScript);
            break;
            
          case 'pzserver':
            // Create basic Project Zomboid structure
            const pzPath = path.join(serverPath, 'Zomboid', 'Server');
            fs.mkdirSync(pzPath, { recursive: true });
            
            const pzConfig = `PublicName=PHSYCO's PZ Server
Password=
MaxPlayers=10
Open=false`;
            fs.writeFileSync(path.join(pzPath, 'server.ini'), pzConfig);
            
            const pzStartScript = `@echo off
echo Starting Project Zomboid Server...
echo This is a demo installation. Replace with actual server executable.
pause`;
            fs.writeFileSync(path.join(serverPath, 'start_server.bat'), pzStartScript);
            break;
            
          case 'enshrouded_server':
            // Create basic Enshrouded structure
            const enshroudedConfig = {
              name: "PHSYCO's Enshrouded Server",
              password: "",
              saveDirectory: "./savegame",
              logDirectory: "./logs",
              ip: "127.0.0.1",
              gamePort: 15636,
              queryPort: 15637,
              slotCount: 10
            };
            fs.writeFileSync(path.join(serverPath, 'enshrouded_server.json'), JSON.stringify(enshroudedConfig, null, 2));
            
            const enshroudedStartScript = `@echo off
echo Starting Enshrouded Server...
echo This is a demo installation. Replace with actual server executable.
pause`;
            fs.writeFileSync(path.join(serverPath, 'start_server.bat'), enshroudedStartScript);
            break;
        }
        
        setTimeout(() => {
          installationProgress[serverId].message = 'Installation completed successfully!';
          installationProgress[serverId].completed = true;
          
          // Clean up progress after 30 seconds
          setTimeout(() => {
            delete installationProgress[serverId];
          }, 30000);
        }, 2000);
      }, 3000);
    } catch (error) {
      console.error(`Error installing ${serverId}:`, error);
      installationProgress[serverId].message = `Installation failed: ${error.message}`;
      installationProgress[serverId].completed = true;
    }
  }, 1000);
  
  res.json({ message: 'Installation started' });
});

// Get installation progress
router.get('/install-progress/:serverId', (req, res) => {
  const { serverId } = req.params;
  
  const progress = installationProgress[serverId] || {
    message: 'No installation in progress',
    completed: true
  };
  
  res.json(progress);
});

// Configuration Preset Routes

// Get configuration presets for a server
router.get('/:id/config/presets', (req, res) => {
  const { id } = req.params;
  const fs = require('fs');
  
  try {
    const presetsDir = path.join(getGameServerManagerPath(), 'presets', id);
    
    if (!fs.existsSync(presetsDir)) {
      return res.json([]);
    }
    
    const presets = [];
    const presetFiles = fs.readdirSync(presetsDir).filter(file => file.endsWith('.json'));
    
    presetFiles.forEach(file => {
      try {
        const presetPath = path.join(presetsDir, file);
        const presetData = JSON.parse(fs.readFileSync(presetPath, 'utf-8'));
        presets.push(presetData);
      } catch (error) {
        console.error(`Error reading preset file ${file}:`, error);
      }
    });
    
    // Sort by creation date (newest first)
    presets.sort((a, b) => new Date(b.created).getTime() - new Date(a.created).getTime());
    
    res.json(presets);
  } catch (error) {
    console.error(`Error getting presets for ${id}:`, error);
    res.status(500).json({ error: `Failed to get presets: ${error.message}` });
  }
});

// Save a configuration preset
router.post('/:id/config/presets', (req, res) => {
  const { id } = req.params;
  const { name, description, files } = req.body;
  const fs = require('fs');
  
  if (!name || !files) {
    return res.status(400).json({ error: 'Preset name and files are required' });
  }
  
  try {
    const presetsDir = path.join(getGameServerManagerPath(), 'presets', id);
    
    // Create presets directory if it doesn't exist
    if (!fs.existsSync(presetsDir)) {
      fs.mkdirSync(presetsDir, { recursive: true });
    }
    
    // Sanitize preset name for filename
    const sanitizedName = name.replace(/[<>:"/\\|?*]/g, '_');
    const presetPath = path.join(presetsDir, `${sanitizedName}.json`);
    
    // Check if preset already exists
    if (fs.existsSync(presetPath)) {
      return res.status(400).json({ error: 'A preset with this name already exists' });
    }
    
    const presetData = {
      name: name,
      description: description || 'No description',
      created: new Date().toISOString(),
      files: files
    };
    
    fs.writeFileSync(presetPath, JSON.stringify(presetData, null, 2));
    
    res.json({ 
      message: `Configuration preset "${name}" saved successfully` 
    });
  } catch (error) {
    console.error(`Error saving preset for ${id}:`, error);
    res.status(500).json({ error: `Failed to save preset: ${error.message}` });
  }
});

// Load a configuration preset
router.post('/:id/config/presets/load', (req, res) => {
  const { id } = req.params;
  const { presetName } = req.body;
  const fs = require('fs');
  
  if (!presetName) {
    return res.status(400).json({ error: 'Preset name is required' });
  }
  
  try {
    const presetsDir = path.join(getGameServerManagerPath(), 'presets', id);
    const sanitizedName = presetName.replace(/[<>:"/\\|?*]/g, '_');
    const presetPath = path.join(presetsDir, `${sanitizedName}.json`);
    
    if (!fs.existsSync(presetPath)) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    const presetData = JSON.parse(fs.readFileSync(presetPath, 'utf-8'));
    const serverPath = getServerPath(id);
    
    // Apply preset files to server configuration
    let configPath;
    
    switch (id) {
      case 'arksa_server':
      case 'arkse_server':
        configPath = path.join(serverPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
        break;
      case 'valheim_server':
        configPath = serverPath;
        break;
      case 'pzserver':
        configPath = path.join(serverPath, 'Zomboid', 'Server');
        break;
      case 'enshrouded_server':
        configPath = serverPath;
        break;
      default:
        return res.status(400).json({ error: `Unknown server ID: ${id}` });
    }
    
    // Ensure config directory exists
    if (!fs.existsSync(configPath)) {
      fs.mkdirSync(configPath, { recursive: true });
    }
    
    // Write each file from the preset
    Object.keys(presetData.files).forEach(fileName => {
      const filePath = path.join(configPath, fileName);
      fs.writeFileSync(filePath, presetData.files[fileName], 'utf-8');
    });
    
    res.json({ 
      message: `Configuration preset "${presetName}" loaded successfully` 
    });
  } catch (error) {
    console.error(`Error loading preset for ${id}:`, error);
    res.status(500).json({ error: `Failed to load preset: ${error.message}` });
  }
});

// Delete a configuration preset
router.delete('/:id/config/presets', (req, res) => {
  const { id } = req.params;
  const { presetName } = req.body;
  const fs = require('fs');
  
  if (!presetName) {
    return res.status(400).json({ error: 'Preset name is required' });
  }
  
  try {
    const presetsDir = path.join(getGameServerManagerPath(), 'presets', id);
    const sanitizedName = presetName.replace(/[<>:"/\\|?*]/g, '_');
    const presetPath = path.join(presetsDir, `${sanitizedName}.json`);
    
    if (!fs.existsSync(presetPath)) {
      return res.status(404).json({ error: 'Preset not found' });
    }
    
    fs.unlinkSync(presetPath);
    
    res.json({ 
      message: `Configuration preset "${presetName}" deleted successfully` 
    });
  } catch (error) {
    console.error(`Error deleting preset for ${id}:`, error);
    res.status(500).json({ error: `Failed to delete preset: ${error.message}` });
  }
});

module.exports = router; 