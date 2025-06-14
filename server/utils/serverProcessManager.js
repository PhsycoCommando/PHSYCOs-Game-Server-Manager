const { spawn } = require('child_process');
const path = require('path');
const fs = require('fs');
const os = require('os');

// Store active server processes
const activeServers = {};

// Store console outputs for each server
const consoleOutputs = {};
const consoleSubscribers = {};
const MAX_CONSOLE_LINES = 1000;

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

/**
 * Get the command to start a specific server
 */
function getServerStartCommand(serverId) {
  const rootDir = findRootDeploymentDir();
  const serverPath = getServerPath(serverId);
  
  switch(serverId) {
    case 'arksa_server':
      // For demo purposes, use a test batch file if the actual server doesn't exist
      const arkSAPath = path.join(serverPath, 'ShooterGame', 'Binaries', 'Win64', 'ArkAscendedServer.exe');
      const testServerPath = path.join(rootDir, 'test_server.bat');
      
      if (fs.existsSync(arkSAPath)) {
        return {
          cmd: arkSAPath,
          args: ['TheIsland_WP?listen?SessionName=PHSYCOs ARK Server?ServerAdminPassword=420?ServerPassword=?RCONEnabled=True?RCONPort=32330'],
          cwd: path.join(serverPath, 'ShooterGame', 'Binaries', 'Win64')
        };
      } else {
        return {
          cmd: testServerPath,
          args: [],
          cwd: rootDir
        };
      }
    case 'arkse_server':
      return {
        cmd: path.join(serverPath, 'ShooterGame', 'Binaries', 'Win64', 'ShooterGameServer.exe'),
        args: ['TheIsland?listen?SessionName=PHSYCOs ARK SE Server?ServerAdminPassword=420?ServerPassword=?RCONEnabled=True?RCONPort=32330'],
        cwd: path.join(serverPath, 'ShooterGame', 'Binaries', 'Win64')
      };
    case 'valheim_server':
      return {
        cmd: path.join(serverPath, 'valheim_server.exe'),
        args: ['-name', 'PHSYCOs Valheim', '-port', '2456', '-world', 'MyValheimWorld', '-password', 'viking', '-public', '0'],
        cwd: serverPath
      };
    case 'pzserver':
      return {
        cmd: path.join(serverPath, 'StartServer64.bat'),
        args: [],
        cwd: serverPath
      };
    case 'enshrouded_server':
      return {
        cmd: path.join(serverPath, 'enshrouded_server.exe'),
        args: [],
        cwd: serverPath
      };
    default:
      throw new Error(`Unknown server ID: ${serverId}`);
  }
}

/**
 * Initialize console output storage for a server
 */
function initConsoleOutput(serverId) {
  if (!consoleOutputs[serverId]) {
    consoleOutputs[serverId] = [];
  }
  
  if (!consoleSubscribers[serverId]) {
    consoleSubscribers[serverId] = new Set();
  }
}

/**
 * Add a line to the console output and notify subscribers
 */
function addConsoleOutput(serverId, line) {
  if (!consoleOutputs[serverId]) {
    initConsoleOutput(serverId);
  }
  
  // Add timestamp if not already present
  const timestamp = new Date().toLocaleTimeString();
  const formattedLine = line.includes('[') ? line : `[${timestamp}] ${line}`;
  
  // Add to console output
  consoleOutputs[serverId].push(formattedLine);
  
  // Trim if too long
  if (consoleOutputs[serverId].length > MAX_CONSOLE_LINES) {
    consoleOutputs[serverId].shift();
  }
  
  // Notify subscribers
  if (consoleSubscribers[serverId]) {
    consoleSubscribers[serverId].forEach(client => {
      if (client.readyState === 1) { // OPEN
        client.send(JSON.stringify({
          type: 'console',
          serverId,
          line: formattedLine
        }));
      }
    });
  }
}

/**
 * Subscribe a WebSocket client to a server's console output
 */
function subscribeToConsole(serverId, ws) {
  if (!consoleSubscribers[serverId]) {
    consoleSubscribers[serverId] = new Set();
  }
  
  consoleSubscribers[serverId].add(ws);
  
  // Send initial console buffer
  if (consoleOutputs[serverId] && consoleOutputs[serverId].length > 0) {
    ws.send(JSON.stringify({
      type: 'console_history',
      serverId,
      lines: consoleOutputs[serverId]
    }));
  }
  
  // Remove client when it disconnects
  ws.on('close', () => {
    if (consoleSubscribers[serverId]) {
      consoleSubscribers[serverId].delete(ws);
    }
  });
}

/**
 * Start a game server
 */
function startServer(serverId) {
  if (activeServers[serverId]) {
    return { success: false, message: `Server ${serverId} is already running` };
  }
  
  try {
    const { cmd, args, cwd } = getServerStartCommand(serverId);
    
    // Initialize console output
    initConsoleOutput(serverId);
    addConsoleOutput(serverId, `Starting ${serverId}...`);
    addConsoleOutput(serverId, `Command: ${cmd} ${args.join(' ')}`);
    
    // Check if the executable exists
    if (!fs.existsSync(cmd)) {
      const errorMsg = `Server executable not found: ${cmd}`;
      addConsoleOutput(serverId, errorMsg);
      return { success: false, message: errorMsg };
    }
    
    // Spawn the process
    const process = spawn(cmd, args, { cwd });
    
    // Handle spawn errors
    process.on('error', (error) => {
      const errorMsg = `Failed to start server process: ${error.message}`;
      addConsoleOutput(serverId, errorMsg);
      delete activeServers[serverId];
    });
    
    // Store the process
    activeServers[serverId] = {
      process,
      pid: process.pid,
      startTime: new Date(),
      status: 'Running'
    };
    
    // Log process output
    process.stdout.on('data', (data) => {
      const lines = data.toString().trim().split(/\r?\n/);
      lines.forEach(line => {
        if (line.trim()) {
          addConsoleOutput(serverId, line.trim());
        }
      });
    });
    
    process.stderr.on('data', (data) => {
      const lines = data.toString().trim().split(/\r?\n/);
      lines.forEach(line => {
        if (line.trim()) {
          addConsoleOutput(serverId, `ERROR: ${line.trim()}`);
        }
      });
    });
    
    // Handle process exit
    process.on('exit', (code) => {
      addConsoleOutput(serverId, `Server process exited with code ${code}`);
      delete activeServers[serverId];
    });
    
    return { 
      success: true, 
      message: `Server ${serverId} started with PID ${process.pid}`,
      pid: process.pid
    };
  } catch (error) {
    addConsoleOutput(serverId, `Failed to start server: ${error.message}`);
    return { success: false, message: error.message };
  }
}

/**
 * Stop a game server
 */
function stopServer(serverId) {
  if (!activeServers[serverId]) {
    return { success: false, message: `Server ${serverId} is not running` };
  }
  
  try {
    const { process } = activeServers[serverId];
    
    // Log the stop attempt
    addConsoleOutput(serverId, `Stopping server...`);
    
    // Kill the process
    if (os.platform() === 'win32') {
      // On Windows, we need to kill the process tree
      spawn('taskkill', ['/pid', process.pid, '/f', '/t']);
    } else {
      // On Unix-like systems
      process.kill();
    }
    
    // Return success
    return { success: true, message: `Server ${serverId} stopping...` };
  } catch (error) {
    return { success: false, message: error.message };
  }
}

/**
 * Get the status of all servers
 */
function getServerStatuses() {
  const servers = [
    { id: 'arksa_server', name: 'ARK: Survival Ascended' },
    { id: 'arkse_server', name: 'ARK: Survival Evolved' },
    { id: 'valheim_server', name: 'Valheim' },
    { id: 'pzserver', name: 'Project Zomboid' },
    { id: 'enshrouded_server', name: 'Enshrouded' }
  ];
  
  return servers.map(server => {
    const active = activeServers[server.id];
    return {
      id: server.id,
      name: server.name,
      status: active ? 'Running' : 'Stopped',
      pid: active ? active.pid : null
    };
  });
}

/**
 * Get console output for a server
 */
function getConsoleOutput(serverId) {
  return consoleOutputs[serverId] || [];
}

/**
 * Clear console output for a server
 */
function clearConsoleOutput(serverId) {
  if (consoleOutputs[serverId]) {
    consoleOutputs[serverId] = [];
    
    // Notify subscribers
    if (consoleSubscribers[serverId]) {
      consoleSubscribers[serverId].forEach(client => {
        if (client.readyState === 1) { // OPEN
          client.send(JSON.stringify({
            type: 'console_clear',
            serverId
          }));
        }
      });
    }
  }
  
  return { success: true };
}

module.exports = {
  startServer,
  stopServer,
  getServerStatuses,
  getConsoleOutput,
  clearConsoleOutput,
  subscribeToConsole,
  addConsoleOutput
}; 