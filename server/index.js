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

// RCON Configuration for ARK: Survival Ascended
const ARCSA_RCON_CONFIG = {
    host: '127.0.0.1',
    port: 32330,
    password: '420',
};

// RCON Configuration for ARK: Survival Evolved
const ARKSE_RCON_CONFIG = {
    host: '127.0.0.1',
    port: 32330,
    password: '420',
};

// API endpoint to handle RCON commands for ark-sa
app.post('/api/rcon/arksa_server', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ message: 'RCON command is required.' });
    }

    let rcon;
    try {
        rcon = new Rcon({
            host: ARCSA_RCON_CONFIG.host,
            port: ARCSA_RCON_CONFIG.port,
            password: ARCSA_RCON_CONFIG.password
        });

        await rcon.connect();
        const response = await rcon.send(command);
        
        // Also add the command and response to the console output
        serverManager.addConsoleOutput('arksa_server', `RCON Command: ${command}`);
        serverManager.addConsoleOutput('arksa_server', `RCON Response: ${response}`);
        
        res.json({ success: true, output: response });
    } catch (error) {
        console.error(`RCON Error for arksa_server: ${error.message}`);
        serverManager.addConsoleOutput('arksa_server', `RCON Error: ${error.message}`);
        res.status(500).json({ success: false, message: `RCON command failed: ${error.message}` });
    } finally {
        if (rcon && rcon.connected) {
            await rcon.end();
        }
    }
});

// API endpoint to handle RCON commands for ark-se
app.post('/api/rcon/arkse_server', async (req, res) => {
    const { command } = req.body;

    if (!command) {
        return res.status(400).json({ message: 'RCON command is required.' });
    }

    let rcon;
    try {
        rcon = new Rcon({
            host: ARKSE_RCON_CONFIG.host,
            port: ARKSE_RCON_CONFIG.port,
            password: ARKSE_RCON_CONFIG.password
        });

        await rcon.connect();
        const response = await rcon.send(command);
        
        // Also add the command and response to the console output
        serverManager.addConsoleOutput('arkse_server', `RCON Command: ${command}`);
        serverManager.addConsoleOutput('arkse_server', `RCON Response: ${response}`);
        
        res.json({ success: true, output: response });
    } catch (error) {
        console.error(`RCON Error for arkse_server: ${error.message}`);
        serverManager.addConsoleOutput('arkse_server', `RCON Error: ${error.message}`);
        res.status(500).json({ success: false, message: `RCON command failed: ${error.message}` });
    } finally {
        if (rcon && rcon.connected) {
            await rcon.end();
        }
    }
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