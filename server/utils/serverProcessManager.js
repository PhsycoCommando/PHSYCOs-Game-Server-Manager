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
        // Direct execution for better output capture
        // ARK Survival Ascended requires specific parameters
        return {
          cmd: arkSAPath,
          args: [
            'TheIsland_WP',
            '-server',
            '-log',
            '-ServerSettings',
            '-Port=7777',
            '-QueryPort=27015',
            '-RCONEnabled=True',
            '-RCONPort=32330',
            '-ServerAdminPassword=420',
            '-SessionName="PHSYCOs ARK Server"'
          ],
          cwd: path.join(serverPath, 'ShooterGame', 'Binaries', 'Win64')
        };
      } else {
        // Fallback to test server if ARK SA not found
        return {
          cmd: testServerPath,
          args: [],
          cwd: rootDir
        };
      }
    case 'arkse_server':
      const arkSEPath = path.join(serverPath, 'ShooterGame', 'Binaries', 'Win64', 'ShooterGameServer.exe');
      // Direct execution for better output capture
      return {
        cmd: arkSEPath,
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
    
    // Spawn the process with enhanced output capture
    const spawnOptions = {
      cwd,
      stdio: ['pipe', 'pipe', 'pipe'], // Explicitly configure stdin, stdout, stderr
      shell: false, // Direct execution without shell for better output capture
      windowsHide: false, // Allow console window for better output capture on Windows
      detached: false, // Keep attached to parent process
      env: { 
        ...process.env, // Inherit environment variables
        // Force console output for some applications
        FORCE_COLOR: '0', // Disable color codes that might interfere
        NO_COLOR: '1', // Disable color codes
        TERM: 'dumb', // Use dumb terminal for consistent output
        // Windows-specific console settings
        CONSOLE_OUTPUT_CP: '65001', // UTF-8 console output
        PYTHONUNBUFFERED: '1', // Force unbuffered output
        NODE_NO_WARNINGS: '1' // Reduce noise
      }
    };
    
    console.log(`🚀 Spawning server process: ${cmd} ${args.join(' ')}`);
    console.log(`📁 Working directory: ${cwd}`);
    console.log(`⚙️ Spawn options:`, spawnOptions);
    
    const serverProcess = spawn(cmd, args, spawnOptions);
    
    // Initialize output buffers
    let stdoutBuffer = '';
    let stderrBuffer = '';
    
    // Handle process spawn event (captures early initialization)
    serverProcess.on('spawn', () => {
      console.log(`✅ [${serverId}] Process spawned successfully with PID ${serverProcess.pid}`);
      addConsoleOutput(serverId, `Process spawned successfully with PID ${serverProcess.pid}`);
      addConsoleOutput(serverId, `Server initialization starting...`);
    });
    
    // Handle spawn errors
    serverProcess.on('error', (error) => {
      const errorMsg = `Failed to start server process: ${error.message}`;
      console.error(`❌ [${serverId}] ${errorMsg}`);
      addConsoleOutput(serverId, errorMsg);
      delete activeServers[serverId];
    });
    
    // Enhanced output capture with server readiness detection
    // Capture stdout with enhanced processing
    serverProcess.stdout.on('data', (data) => {
      const chunk = data.toString('utf8');
      stdoutBuffer += chunk;
      
      // Process complete lines immediately
      const lines = stdoutBuffer.split(/\r?\n/);
      stdoutBuffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      lines.forEach(line => {
        if (line.trim()) {
          console.log(`📤 [${serverId}] STDOUT: ${line.trim()}`);
          addConsoleOutput(serverId, line.trim());
          
          // Check for server readiness indicators
          const trimmedLine = line.trim();
          if (trimmedLine.includes('Server has completed startup') || 
              trimmedLine.includes('Server: "') && trimmedLine.includes('has successfully started!') ||
              trimmedLine.includes('Full Startup:')) {
            console.log(`✅ [${serverId}] Server fully initialized - RCON should be ready`);
            addConsoleOutput(serverId, `Server fully initialized - RCON is now available`);
            if (activeServers[serverId]) {
              activeServers[serverId].status = 'Running';
              activeServers[serverId].rconReady = true;
            }
          }
        }
      });
    });
    
    // Capture stderr with enhanced processing
    serverProcess.stderr.on('data', (data) => {
      const chunk = data.toString('utf8');
      stderrBuffer += chunk;
      
      // Process complete lines immediately
      const lines = stderrBuffer.split(/\r?\n/);
      stderrBuffer = lines.pop() || ''; // Keep incomplete line in buffer
      
      lines.forEach(line => {
        if (line.trim()) {
          console.log(`📤 [${serverId}] STDERR: ${line.trim()}`);
          addConsoleOutput(serverId, `ERROR: ${line.trim()}`);
        }
      });
    });
    
    // Handle any remaining buffer content when streams close
    serverProcess.stdout.on('end', () => {
      if (stdoutBuffer.trim()) {
        console.log(`📤 [${serverId}] STDOUT (final): ${stdoutBuffer.trim()}`);
        addConsoleOutput(serverId, stdoutBuffer.trim());
      }
    });
    
    serverProcess.stderr.on('end', () => {
      if (stderrBuffer.trim()) {
        console.log(`📤 [${serverId}] STDERR (final): ${stderrBuffer.trim()}`);
        addConsoleOutput(serverId, `ERROR: ${stderrBuffer.trim()}`);
      }
    });
    
    // Store the process with enhanced monitoring
    activeServers[serverId] = {
      process: serverProcess,
      pid: serverProcess.pid,
      startTime: new Date(),
      status: 'Starting',
      stdoutBuffer,
      stderrBuffer,
      rconReady: false
    };
    
    // For ARK servers, set RCON ready after startup delay since they don't output to stdout properly
    if (serverId.includes('ark')) {
      setTimeout(() => {
        if (activeServers[serverId]) {
          console.log(`✅ [${serverId}] ARK server startup timeout reached - assuming RCON is ready`);
          addConsoleOutput(serverId, `ARK server startup timeout reached - RCON should now be available`);
          activeServers[serverId].status = 'Running';
          activeServers[serverId].rconReady = true;
        }
      }, 45000); // 45 seconds should be enough for ARK to start
    }
    
    // Set up periodic buffer flush to catch any missed output
    const bufferFlushInterval = setInterval(() => {
      if (!activeServers[serverId]) {
        clearInterval(bufferFlushInterval);
        return;
      }
      
      // Flush any remaining stdout buffer
      if (stdoutBuffer.trim()) {
        const lines = stdoutBuffer.split(/\r?\n/);
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`📤 [${serverId}] STDOUT (flush): ${line.trim()}`);
            addConsoleOutput(serverId, line.trim());
          }
        });
        stdoutBuffer = '';
      }
      
      // Flush any remaining stderr buffer
      if (stderrBuffer.trim()) {
        const lines = stderrBuffer.split(/\r?\n/);
        lines.forEach(line => {
          if (line.trim()) {
            console.log(`📤 [${serverId}] STDERR (flush): ${line.trim()}`);
            addConsoleOutput(serverId, `ERROR: ${line.trim()}`);
          }
        });
        stderrBuffer = '';
      }
    }, 1000); // Flush every second
    
    // Handle process exit with enhanced logging
    serverProcess.on('exit', (code, signal) => {
      clearInterval(bufferFlushInterval);
      
      const exitMsg = signal 
        ? `Server process terminated by signal ${signal}` 
        : `Server process exited with code ${code}`;
      
      console.log(`🔄 [${serverId}] ${exitMsg}`);
      addConsoleOutput(serverId, exitMsg);
      
      if (code === 0) {
        addConsoleOutput(serverId, `Server shutdown completed successfully`);
      } else if (code !== null) {
        addConsoleOutput(serverId, `Server shutdown with error code ${code}`);
      }
      
      delete activeServers[serverId];
    });
    
    // For Windows, also try to capture console output using a different method
    if (os.platform() === 'win32') {
      // Add a periodic check to see if we can get more output
      const windowsConsoleMonitor = setInterval(() => {
        if (!activeServers[serverId]) {
          clearInterval(windowsConsoleMonitor);
          return;
        }
        
        // Add some diagnostic information periodically
        const uptime = Math.floor((Date.now() - activeServers[serverId].startTime) / 1000);
        if (uptime % 30 === 0 && uptime > 0) { // Every 30 seconds
          console.log(`🔍 [${serverId}] Server running for ${uptime} seconds, monitoring for additional output...`);
        }
      }, 1000);
      
      // Clean up monitor when process exits
      serverProcess.on('exit', () => {
        clearInterval(windowsConsoleMonitor);
      });
    }
    
    return { 
      success: true, 
      message: `Server ${serverId} started with PID ${serverProcess.pid}`,
      pid: serverProcess.pid
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

/**
 * Check if RCON is ready for a server
 */
function isRconReady(serverId) {
  const server = activeServers[serverId];
  if (!server) {
    return false;
  }
  
  // Server must be running and RCON must be marked as ready
  return server.status === 'Running' && server.rconReady === true;
}

/**
 * Get server status including RCON readiness
 */
function getServerStatus(serverId) {
  const server = activeServers[serverId];
  if (!server) {
    return { status: 'Stopped', rconReady: false };
  }
  
  return {
    status: server.status,
    rconReady: server.rconReady,
    pid: server.pid,
    startTime: server.startTime
  };
}

module.exports = {
  startServer,
  stopServer,
  getServerStatuses,
  getConsoleOutput,
  clearConsoleOutput,
  subscribeToConsole,
  addConsoleOutput,
  isRconReady,
  getServerStatus
}; 