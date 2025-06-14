const express = require('express');
const router = express.Router();
const fs = require('fs');
const fsPromises = require('fs/promises');
const path = require('path');
const { exec } = require('child_process');

const configPath = path.join(__dirname, '../config.json');
const batchFilesDir = path.join(__dirname, '../batch_files');

const readConfig = async () => {
    const data = await fsPromises.readFile(configPath, 'utf-8');
    return JSON.parse(data);
};

const writeConfig = async (config) => {
    await fsPromises.writeFile(configPath, JSON.stringify(config, null, 2));
};

// Ensure batch files directory exists
fsPromises.mkdir(batchFilesDir, { recursive: true }).catch(console.error);

const sanitizeServerName = (name) => {
    return name.replace(/[^a-zA-Z0-9]/g, '_');
};

const generateBatchFiles = async (config) => {
    const enableCommands = [];
    const disableCommands = [];

    config.portForwarding.forEach(entry => {
        if (!entry.enabled) return;

        const ports = entry.ports.split(/[,\s–-]+/).map(p => p.trim()).filter(p => p);
        const protocols = entry.protocol.split('/').map(p => p.trim().toUpperCase());
        const serverName = sanitizeServerName(entry.serverName);

        ports.forEach(port => {
            protocols.forEach(protocol => {
                const ruleName = `GSM_${serverName}_${port}_${protocol}`;
                if (protocol === 'UDP' || protocol === 'TCP') {
                    enableCommands.push(`netsh advfirewall firewall add rule name="${ruleName}" dir=in action=allow protocol=${protocol} localport=${port} enable=yes`);
                    enableCommands.push(`netsh advfirewall firewall add rule name="${ruleName}" dir=out action=allow protocol=${protocol} localport=${port} enable=yes`);
                    disableCommands.push(`netsh advfirewall firewall delete rule name="${ruleName}" dir=in`);
                    disableCommands.push(`netsh advfirewall firewall delete rule name="${ruleName}" dir=out`);
                }
            });
        });
    });

    const wrapperContent = '@echo off\n' +
        'echo Checking for administrator privileges...\n' +
        'net session >nul 2>&1\n' +
        'if %errorLevel% neq 0 (\n' +
        '    echo This script requires administrator privileges.\n' +
        '    echo Right-click and select "Run as administrator"\n' +
        '    pause\n' +
        '    exit /b 1\n' +
        ')\n' +
        'cd /d "%~dp0"\n' +
        'call %1\n' +
        'exit /b %errorLevel%\n';

    const enableContent = '@echo off\n' +
        'echo Enabling ports for Game Server Manager...\n' +
        enableCommands.join('\n') +
        '\necho.\necho Ports enabled successfully!\n' +
        'timeout /t 3\n';

    const disableContent = '@echo off\n' +
        'echo Disabling ports for Game Server Manager...\n' +
        disableCommands.join('\n') +
        '\necho.\necho Ports disabled successfully!\n' +
        'timeout /t 3\n';

    await fsPromises.writeFile(path.join(batchFilesDir, 'run_as_admin.bat'), wrapperContent);
    await fsPromises.writeFile(path.join(batchFilesDir, 'enable_ports.bat'), enableContent);
    await fsPromises.writeFile(path.join(batchFilesDir, 'disable_ports.bat'), disableContent);

    return {
        wrapperPath: path.join(batchFilesDir, 'run_as_admin.bat'),
        enablePath: path.join(batchFilesDir, 'enable_ports.bat'),
        disablePath: path.join(batchFilesDir, 'disable_ports.bat')
    };
};

// GET /api/config - Get the main config
router.get('/', async (req, res) => {
    try {
        const config = await readConfig();
        res.json(config);
    } catch (error) {
        res.status(500).json({ message: 'Error reading config file', error });
    }
});

// POST /api/config - Update the main config
router.post('/', async (req, res) => {
    try {
        const newConfig = req.body;
        await writeConfig(newConfig);
        res.json({ message: 'Config updated successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error writing config file', error });
    }
});

// POST /api/config/ports/generate - Generate port forwarding batch files
router.post('/ports/generate', async (req, res) => {
    try {
        const config = await readConfig();
        const batchFiles = await generateBatchFiles(config);
        res.json({
            message: 'Batch files generated successfully',
            paths: batchFiles
        });
    } catch (error) {
        console.error('Error generating batch files:', error);
        res.status(500).json({ message: 'Error generating batch files', error: error.message });
    }
});

// POST /api/config/ports/execute/:action - Execute port forwarding batch file
router.post('/ports/execute/:action', async (req, res) => {
    const { action } = req.params;
    if (action !== 'enable' && action !== 'disable') {
        return res.status(400).json({ message: 'Invalid action. Must be "enable" or "disable".' });
    }

    try {
        const wrapperPath = path.join(batchFilesDir, 'run_as_admin.bat');
        const targetPath = path.join(batchFilesDir, `${action}_ports.bat`);
        
        if (!fs.existsSync(wrapperPath) || !fs.existsSync(targetPath)) {
            throw new Error('Required batch files not found. Please try generating them first.');
        }

        exec(`"${wrapperPath}" "${targetPath}"`, { windowsHide: false }, (error, stdout, stderr) => {
            if (error) {
                console.error(`Error executing batch file:`, error);
                return res.status(500).json({ 
                    message: 'Error executing batch file. Make sure to run as administrator.',
                    error: error.message,
                    stdout,
                    stderr
                });
            }
            res.json({ 
                message: `Ports ${action}d successfully`, 
                stdout,
                stderr
            });
        });
    } catch (error) {
        console.error('Error executing batch file:', error);
        res.status(500).json({ 
            message: 'Error executing batch file',
            error: error.message
        });
    }
});

module.exports = router; 