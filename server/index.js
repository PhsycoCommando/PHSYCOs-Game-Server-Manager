const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs').promises;
const http = require('http');
const WebSocket = require('ws');
const { Rcon } = require('rcon-client');

const serversRouter = require('./routes/servers');
const filesRouter = require('./routes/files');
const configRouter = require('./routes/config');
const globalSettingsRouter = require('./routes/globalSettings');
const feedbackRouter = require('./routes/feedback');
const serverManager = require('./utils/serverProcessManager');

const app = express();
const PORT = 54321;

// Create HTTP server
const server = http.createServer(app);

// Create WebSocket server
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Serve the React frontend (we'll create this later)
app.use(express.static(path.join(__dirname, '../client/dist')));

// Serve batch files
app.use('/api/batch_files', express.static(path.join(__dirname, 'batch_files')));

// API routes will go here
app.use('/api/servers', serversRouter);
app.use('/api/files', filesRouter);
app.use('/api/config', configRouter);
app.use('/api/global-settings', globalSettingsRouter);
app.use('/api/feedback', feedbackRouter);

// Port forwarding route
app.get('/api/ports', async (req, res) => {
    try {
        const configPath = path.join(__dirname, 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        res.json(config.portForwarding || []);
    } catch (error) {
        console.error('Error reading port forwarding config:', error);
        res.status(500).json({ error: 'Failed to read port forwarding configuration' });
    }
});

// Update port forwarding configuration
app.post('/api/ports', async (req, res) => {
    try {
        const { portForwarding } = req.body;
        const configPath = path.join(__dirname, 'config.json');
        
        // Read current config
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        // Update port forwarding
        config.portForwarding = portForwarding;
        
        // Write back to file
        await fs.writeFile(configPath, JSON.stringify(config, null, 2));
        
        res.json({ message: 'Port forwarding configuration updated successfully' });
    } catch (error) {
        console.error('Error updating port forwarding config:', error);
        res.status(500).json({ error: 'Failed to update port forwarding configuration' });
    }
});

// Generate port forwarding batch files
app.post('/api/ports/generate-batch', async (req, res) => {
    try {
        const { action } = req.body; // 'enable' or 'disable'
        const configPath = path.join(__dirname, 'config.json');
        const configData = await fs.readFile(configPath, 'utf8');
        const config = JSON.parse(configData);
        
        const batchDir = path.join(__dirname, 'batch_files');
        await fs.mkdir(batchDir, { recursive: true });
        
        let batchContent = '@echo off\n';
        batchContent += 'echo Port Forwarding Management\n';
        batchContent += 'echo ========================\n';
        batchContent += 'echo.\n';
        
        if (action === 'enable') {
            batchContent += 'echo Enabling port forwarding rules...\n';
            batchContent += 'echo.\n';
            
            for (const server of config.portForwarding) {
                if (server.enabled) {
                    batchContent += `echo Configuring ports for ${server.serverName}...\n`;
                    // Parse ports string (e.g., "7777, 7778, 27015, 32330" or "2456–2458")
                    const portList = server.ports.split(/[,–-]/).map(p => p.trim()).filter(p => p);
                    const protocols = server.protocol.includes('/') ? server.protocol.split('/') : [server.protocol];
                    
                    for (const portStr of portList) {
                        const port = parseInt(portStr);
                        if (!isNaN(port)) {
                            for (const protocol of protocols) {
                                const proto = protocol.trim().toUpperCase();
                                batchContent += `netsh advfirewall firewall add rule name="${server.serverName}_${port}_${proto}" dir=in action=allow protocol=${proto} localport=${port}\n`;
                                batchContent += `netsh advfirewall firewall add rule name="${server.serverName}_${port}_${proto}_OUT" dir=out action=allow protocol=${proto} localport=${port}\n`;
                            }
                        }
                    }
                    batchContent += 'echo.\n';
                }
            }
        } else {
            batchContent += 'echo Disabling port forwarding rules...\n';
            batchContent += 'echo.\n';
            
            for (const server of config.portForwarding) {
                batchContent += `echo Removing ports for ${server.serverName}...\n`;
                // Parse ports string (e.g., "7777, 7778, 27015, 32330" or "2456–2458")
                const portList = server.ports.split(/[,–-]/).map(p => p.trim()).filter(p => p);
                const protocols = server.protocol.includes('/') ? server.protocol.split('/') : [server.protocol];
                
                for (const portStr of portList) {
                    const port = parseInt(portStr);
                    if (!isNaN(port)) {
                        for (const protocol of protocols) {
                            const proto = protocol.trim().toUpperCase();
                            batchContent += `netsh advfirewall firewall delete rule name="${server.serverName}_${port}_${proto}" >nul 2>&1\n`;
                            batchContent += `netsh advfirewall firewall delete rule name="${server.serverName}_${port}_${proto}_OUT" >nul 2>&1\n`;
                        }
                    }
                }
                batchContent += 'echo.\n';
            }
        }
        
        batchContent += 'echo Port forwarding configuration complete!\n';
        batchContent += 'pause\n';
        
        const filename = `${action}_port_forwarding.bat`;
        const filePath = path.join(batchDir, filename);
        
        await fs.writeFile(filePath, batchContent);
        
        res.json({ 
            message: `Batch file generated successfully`,
            filename: filename,
            downloadUrl: `/api/batch_files/${filename}`
        });
    } catch (error) {
        console.error('Error generating batch file:', error);
        res.status(500).json({ error: 'Failed to generate batch file' });
    }
});

// RCON Configuration - Global settings for single-server operation
// Since this manager runs only one server at a time, we use a single RCON port
const GLOBAL_RCON_CONFIG = {
    host: '127.0.0.1',
    port: 32330,  // Global RCON port - no conflicts since only one server runs at a time
    password: '420',
};

// Manual RCON test endpoint (bypasses readiness check)
app.post('/api/rcon/:serverName/test', async (req, res) => {
    const { serverName } = req.params;
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ message: 'RCON command is required.' });
    }

    console.log(`🧪 [${serverName}] Manual RCON test - bypassing readiness check`);
    
    let rcon;
    try {
        // Use global RCON configuration for all servers
        rcon = new Rcon({
            host: GLOBAL_RCON_CONFIG.host,
            port: GLOBAL_RCON_CONFIG.port,
            password: GLOBAL_RCON_CONFIG.password,
            timeout: 5000 // 5 second timeout for testing
        });

        console.log(`🎮 Testing RCON connection to ${serverName} on port ${GLOBAL_RCON_CONFIG.port}`);
        await rcon.connect();
        
        console.log(`📤 Sending test RCON command to ${serverName}: ${command}`);
        const response = await rcon.send(command);
        
        // Add the command and response to the console output
        serverManager.addConsoleOutput(serverName, `RCON Test Command: ${command}`);
        serverManager.addConsoleOutput(serverName, `RCON Test Response: ${response || 'Command executed successfully'}`);
        
        console.log(`✅ RCON test successful for ${serverName}`);
        res.json({ success: true, output: response || 'Command executed successfully', message: 'RCON test successful!' });
        
    } catch (error) {
        console.error(`❌ RCON Test Error for ${serverName}: ${error.message}`);
        serverManager.addConsoleOutput(serverName, `RCON Test Error: ${error.message}`);
        
        let errorMessage = error.message;
        if (error.message.includes('ECONNREFUSED')) {
            errorMessage = `Cannot connect to RCON on port ${GLOBAL_RCON_CONFIG.port}. Server may not be ready yet.`;
        } else if (error.message.includes('Authentication failed')) {
            errorMessage = `RCON authentication failed. Check the RCON password.`;
        } else if (error.message.includes('ETIMEDOUT') || error.message.includes('Timeout')) {
            errorMessage = `RCON connection timed out. Server may still be starting.`;
        }
        
        res.status(500).json({ success: false, message: `RCON test failed: ${errorMessage}` });
    } finally {
        if (rcon && rcon.connected) {
            try {
                await rcon.end();
            } catch (endError) {
                console.warn(`Warning: Error closing RCON test connection: ${endError.message}`);
            }
        }
    }
});

// Dynamic RCON endpoint that works for any server
app.post('/api/rcon/:serverName', async (req, res) => {
    const { serverName } = req.params;
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ message: 'RCON command is required.' });
    }

    // Check if server is running and RCON is ready
    const serverStatus = serverManager.getServerStatus(serverName);
    if (serverStatus.status === 'Stopped') {
        return res.status(400).json({ 
            success: false, 
            message: 'Server is not running. Please start the server first.' 
        });
    }
    
    if (!serverStatus.rconReady) {
        return res.status(400).json({ 
            success: false, 
            message: 'Server is still initializing. Please wait for the server to fully start before using RCON commands.' 
        });
    }

    // RCON retry configuration
    const maxRetries = 3;
    const retryDelay = 2000; // 2 seconds between retries
    
    let rcon;
    let lastError;
    
    for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
            // Use global RCON configuration for all servers
            rcon = new Rcon({
                host: GLOBAL_RCON_CONFIG.host,
                port: GLOBAL_RCON_CONFIG.port,
                password: GLOBAL_RCON_CONFIG.password,
                timeout: 10000 // 10 second timeout
            });

            console.log(`🎮 Attempting RCON connection to ${serverName} on port ${GLOBAL_RCON_CONFIG.port} (attempt ${attempt}/${maxRetries})`);
            await rcon.connect();
            
            console.log(`📤 Sending RCON command to ${serverName}: ${command}`);
            const response = await rcon.send(command);
            
            // Add the command and response to the console output
            serverManager.addConsoleOutput(serverName, `RCON Command: ${command}`);
            serverManager.addConsoleOutput(serverName, `RCON Response: ${response || 'Command executed successfully'}`);
            
            console.log(`✅ RCON command successful for ${serverName}`);
            return res.json({ success: true, output: response || 'Command executed successfully' });
            
        } catch (error) {
            lastError = error;
            console.error(`❌ RCON Error for ${serverName} (attempt ${attempt}/${maxRetries}): ${error.message}`);
            
            // Close the connection if it exists
            if (rcon && rcon.connected) {
                try {
                    await rcon.end();
                } catch (endError) {
                    console.warn(`Warning: Error closing RCON connection: ${endError.message}`);
                }
                rcon = null;
            }
            
            // If this isn't the last attempt, wait before retrying
            if (attempt < maxRetries) {
                console.log(`⏳ Waiting ${retryDelay/1000} seconds before retry...`);
                serverManager.addConsoleOutput(serverName, `RCON connection failed (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay/1000} seconds...`);
                await new Promise(resolve => setTimeout(resolve, retryDelay));
            }
        }
    }
    
    // All retries failed
    console.error(`❌ All RCON attempts failed for ${serverName}: ${lastError.message}`);
    serverManager.addConsoleOutput(serverName, `RCON Error: ${lastError.message}`);
    
    // Provide more helpful error messages
    let errorMessage = lastError.message;
    if (lastError.message.includes('ECONNREFUSED')) {
        errorMessage = `Cannot connect to RCON on port ${GLOBAL_RCON_CONFIG.port}. Make sure the server is running and RCON is enabled.`;
    } else if (lastError.message.includes('Authentication failed')) {
        errorMessage = `RCON authentication failed. Check the RCON password in server configuration.`;
    } else if (lastError.message.includes('ETIMEDOUT') || lastError.message.includes('Timeout')) {
        errorMessage = `RCON connection timed out. Server may still be initializing - try again in a few moments.`;
    }
    
    res.status(500).json({ success: false, message: `RCON command failed after ${maxRetries} attempts: ${errorMessage}` });
});

// Handle WebSocket connections
wss.on('connection', (ws) => {
    console.log('WebSocket client connected');
    
    ws.on('message', (message) => {
        try {
            const data = JSON.parse(message);
            
            switch (data.type) {
                case 'subscribe':
                    // Subscribe to console output for a server
                    if (data.serverId) {
                        serverManager.subscribeToConsole(data.serverId, ws);
                        console.log(`Client subscribed to ${data.serverId} console`);
                    }
                    break;
                    
                case 'clear_console':
                    // Clear console output for a server
                    if (data.serverId) {
                        serverManager.clearConsoleOutput(data.serverId);
                        console.log(`Console cleared for ${data.serverId}`);
                    }
                    break;
                    
                default:
                    console.log(`Unknown WebSocket message type: ${data.type}`);
            }
        } catch (error) {
            console.error('Error processing WebSocket message:', error);
        }
    });
    
    ws.on('close', () => {
        console.log('WebSocket client disconnected');
    });
});

app.get('/api', (req, res) => {
  res.json({ message: 'Hello from the Game Server Manager backend!' });
});

// Add a catch-all route to serve the React app's index.html
app.get('/*path', (req, res) => {
  res.sendFile(path.join(__dirname, '../client/dist/index.html'));
});

// Start the HTTP server
server.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
  console.log(`WebSocket server is running on ws://localhost:${PORT}`);
}); 