const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

const globalSettingsPath = path.join(__dirname, '../globalSettings.json');

// Helper function to find the root deployment directory
function findRootDeploymentDir() {
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
      return parentDir;
    }
    
    currentDir = parentDir;
  }
  
  // Fallback: assume we're in the standard structure
  return path.resolve(process.cwd(), '..', '..');
}

// Helper function to get server folder name
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

// Helper function to get server path
function getServerPath(serverId) {
  const rootDir = findRootDeploymentDir();
  const folderName = getServerFolderName(serverId);
  return path.join(rootDir, folderName);
}

// Default global settings
const defaultSettings = {
  serverName: "PHSYCO's Game Server",
  serverPassword: '',
  adminPassword: '420',
  rconPort: 32330,
  maxPlayers: 10,
  enableRcon: true,
  allowExternalAccess: false
};

// GET /api/global-settings - Get global settings
router.get('/', async (req, res) => {
  try {
    if (fs.existsSync(globalSettingsPath)) {
      const data = await fsPromises.readFile(globalSettingsPath, 'utf-8');
      const settings = JSON.parse(data);
      res.json(settings);
    } else {
      res.json(defaultSettings);
    }
  } catch (error) {
    console.error('Error reading global settings:', error);
    res.status(500).json({ error: 'Failed to read global settings' });
  }
});

// POST /api/global-settings - Save global settings
router.post('/', async (req, res) => {
  try {
    const settings = req.body;
    await fsPromises.writeFile(globalSettingsPath, JSON.stringify(settings, null, 2));
    res.json({ message: 'Global settings saved successfully' });
  } catch (error) {
    console.error('Error saving global settings:', error);
    res.status(500).json({ error: 'Failed to save global settings' });
  }
});

// POST /api/global-settings/apply - Apply global settings to selected servers
router.post('/apply', async (req, res) => {
  try {
    const { settings, servers } = req.body;
    const appliedTo = [];
    const errors = [];

    for (const serverId of servers) {
      try {
        await applySettingsToServer(serverId, settings);
        appliedTo.push(serverId);
      } catch (error) {
        console.error(`Error applying settings to ${serverId}:`, error);
        errors.push({ server: serverId, error: error.message });
      }
    }

    if (errors.length > 0) {
      res.status(207).json({ 
        message: 'Settings applied with some errors',
        appliedTo,
        errors
      });
    } else {
      res.json({ 
        message: 'Settings applied successfully',
        appliedTo
      });
    }
  } catch (error) {
    console.error('Error applying global settings:', error);
    res.status(500).json({ error: 'Failed to apply global settings' });
  }
});

// Helper function to apply settings to a specific server
async function applySettingsToServer(serverId, settings) {
  const serverPath = getServerPath(serverId);
  let configPath;
  let configFiles = [];

  switch (serverId) {
    case 'arksa_server':
    case 'arkse_server':
      configPath = path.join(serverPath, 'ShooterGame', 'Saved', 'Config', 'WindowsServer');
      configFiles = [
        {
          name: 'GameUserSettings.ini',
          path: path.join(configPath, 'GameUserSettings.ini'),
          updateFunction: updateArkConfig
        }
      ];
      break;
    case 'valheim_server':
      configPath = serverPath;
      configFiles = [
        {
          name: 'start_server.bat',
          path: path.join(configPath, 'start_server.bat'),
          updateFunction: updateValheimConfig
        }
      ];
      break;
    case 'pzserver':
      configPath = path.join(serverPath, 'Zomboid', 'Server');
      configFiles = [
        {
          name: 'server.ini',
          path: path.join(configPath, 'server.ini'),
          updateFunction: updatePZConfig
        }
      ];
      break;
    case 'enshrouded_server':
      configPath = serverPath;
      configFiles = [
        {
          name: 'enshrouded_server.json',
          path: path.join(configPath, 'enshrouded_server.json'),
          updateFunction: updateEnshroudedConfig
        }
      ];
      break;
    default:
      throw new Error(`Unknown server ID: ${serverId}`);
  }

  // Ensure directory exists
  if (!fs.existsSync(configPath)) {
    fs.mkdirSync(configPath, { recursive: true });
  }

  // Update each config file
  for (const configFile of configFiles) {
    await configFile.updateFunction(configFile.path, settings);
  }
}

// Config update functions for different server types
async function updateArkConfig(filePath, settings) {
  let content = '';
  
  if (fs.existsSync(filePath)) {
    content = await fsPromises.readFile(filePath, 'utf-8');
  }

  // Parse and update ARK config
  const lines = content.split('\n');
  const updatedLines = [];
  let inServerSettings = false;

  for (let line of lines) {
    if (line.trim() === '[ServerSettings]') {
      inServerSettings = true;
      updatedLines.push(line);
      continue;
    }
    
    if (line.trim().startsWith('[') && line.trim() !== '[ServerSettings]') {
      inServerSettings = false;
    }

    if (inServerSettings) {
      if (line.startsWith('ServerName=')) {
        updatedLines.push(`ServerName=${settings.serverName}`);
      } else if (line.startsWith('ServerPassword=')) {
        updatedLines.push(`ServerPassword=${settings.serverPassword}`);
      } else if (line.startsWith('ServerAdminPassword=')) {
        updatedLines.push(`ServerAdminPassword=${settings.adminPassword}`);
      } else if (line.startsWith('RCONEnabled=')) {
        updatedLines.push(`RCONEnabled=${settings.enableRcon}`);
      } else if (line.startsWith('RCONPort=')) {
        updatedLines.push(`RCONPort=${settings.rconPort}`);
      } else if (line.startsWith('MaxPlayers=')) {
        updatedLines.push(`MaxPlayers=${settings.maxPlayers}`);
      } else if (line.startsWith('MultiHome=')) {
        updatedLines.push(`MultiHome=${settings.allowExternalAccess ? '0.0.0.0' : '127.0.0.1'}`);
      } else {
        updatedLines.push(line);
      }
    } else {
      updatedLines.push(line);
    }
  }

  // If no [ServerSettings] section exists, create one
  if (!content.includes('[ServerSettings]')) {
    updatedLines.unshift(
      '[ServerSettings]',
      `ServerName=${settings.serverName}`,
      `ServerPassword=${settings.serverPassword}`,
      `ServerAdminPassword=${settings.adminPassword}`,
      `RCONEnabled=${settings.enableRcon}`,
      `RCONPort=${settings.rconPort}`,
      `MaxPlayers=${settings.maxPlayers}`,
      `MultiHome=${settings.allowExternalAccess ? '0.0.0.0' : '127.0.0.1'}`,
      ''
    );
  }

  await fsPromises.writeFile(filePath, updatedLines.join('\n'));
}

async function updateValheimConfig(filePath, settings) {
  const publicFlag = settings.allowExternalAccess ? '1' : '0';
  const content = `@echo off
set SteamAppId=892970
echo "Starting server PRESS CTRL-C to exit"
valheim_server.exe -name "${settings.serverName}" -port 2456 -world "MyValheimWorld" -password "${settings.serverPassword}" -public ${publicFlag}`;
  
  await fsPromises.writeFile(filePath, content);
}

async function updatePZConfig(filePath, settings) {
  let content = '';
  
  if (fs.existsSync(filePath)) {
    content = await fsPromises.readFile(filePath, 'utf-8');
  }

  const lines = content.split('\n');
  const updatedLines = [];
  let foundPublicName = false;
  let foundPassword = false;
  let foundMaxPlayers = false;
  let foundOpen = false;

  for (let line of lines) {
    if (line.startsWith('PublicName=')) {
      updatedLines.push(`PublicName=${settings.serverName}`);
      foundPublicName = true;
    } else if (line.startsWith('Password=')) {
      updatedLines.push(`Password=${settings.serverPassword}`);
      foundPassword = true;
    } else if (line.startsWith('MaxPlayers=')) {
      updatedLines.push(`MaxPlayers=${settings.maxPlayers}`);
      foundMaxPlayers = true;
    } else if (line.startsWith('Open=')) {
      updatedLines.push(`Open=${settings.allowExternalAccess ? 'true' : 'false'}`);
      foundOpen = true;
    } else {
      updatedLines.push(line);
    }
  }

  // Add missing settings
  if (!foundPublicName) {
    updatedLines.push(`PublicName=${settings.serverName}`);
  }
  if (!foundPassword) {
    updatedLines.push(`Password=${settings.serverPassword}`);
  }
  if (!foundMaxPlayers) {
    updatedLines.push(`MaxPlayers=${settings.maxPlayers}`);
  }
  if (!foundOpen) {
    updatedLines.push(`Open=${settings.allowExternalAccess ? 'true' : 'false'}`);
  }

  await fsPromises.writeFile(filePath, updatedLines.join('\n'));
}

async function updateEnshroudedConfig(filePath, settings) {
  let config = {
    name: settings.serverName,
    password: settings.serverPassword,
    saveDirectory: "./savegame",
    logDirectory: "./logs",
    ip: settings.allowExternalAccess ? "0.0.0.0" : "127.0.0.1",
    gamePort: 15636,
    queryPort: 15637,
    slotCount: settings.maxPlayers
  };

  if (fs.existsSync(filePath)) {
    const existingContent = await fsPromises.readFile(filePath, 'utf-8');
    const existingConfig = JSON.parse(existingContent);
    config = { ...existingConfig, ...config };
  }

  await fsPromises.writeFile(filePath, JSON.stringify(config, null, 2));
}

module.exports = router; 