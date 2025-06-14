# Game Server Manager - Flexible Deployment Guide

## Overview

The Game Server Manager is designed to work from any directory location, making it flexible for different deployment scenarios. The system automatically detects the deployment structure and adapts accordingly.

## Supported Directory Structures

### Option 1: Root Level Deployment (Recommended)
```
C:\GameServers\
├── GameServerManager\
│   ├── server\
│   ├── client\
│   └── start_server_manager.bat
├── arksa_server\
├── arkse_server\
├── valheim_server\
├── pz_server\
└── enshrouded_server\
```

### Option 2: Nested Deployment
```
C:\PHSYCO\GameServers\
├── GameServerManager\
│   ├── server\
│   ├── client\
│   └── start_server_manager.bat
├── arksa_server\
├── arkse_server\
├── valheim_server\
├── pz_server\
└── enshrouded_server\
```

### Option 3: Custom Location
```
D:\MyGameServers\
├── GameServerManager\
├── arksa_server\
├── arkse_server\
├── valheim_server\
├── pz_server\
└── enshrouded_server\
```

## How Auto-Detection Works

The system uses intelligent path detection that:

1. **Starts from the GameServerManager directory**
2. **Searches parent directories** for server folders
3. **Detects the root** when it finds server folders like `arksa_server`, `valheim_server`, etc.
4. **Falls back** to the original structure if detection fails

## Server Folder Mapping

The system correctly maps server IDs to actual folder names:

| Server ID | Actual Folder Name |
|-----------|-------------------|
| `arksa_server` | `arksa_server` |
| `arkse_server` | `arkse_server` |
| `valheim_server` | `valheim_server` |
| `pzserver` | `pz_server` |
| `enshrouded_server` | `enshrouded_server` |

## Benefits of Flexible Deployment

- **Easy Migration**: Move the entire folder structure anywhere
- **Multiple Instances**: Run different setups on the same machine
- **Clean Organization**: Choose your preferred directory structure
- **No Hardcoded Paths**: System adapts to your setup automatically

## Installation Steps

1. **Choose your deployment location** (e.g., `C:\GameServers\`)
2. **Extract/copy the GameServerManager folder** to your chosen location
3. **Install your game servers** in the same parent directory
4. **Run the start script** from the GameServerManager folder

The system will automatically detect your structure and work correctly!

## Troubleshooting

If the auto-detection fails:
- Ensure server folders exist in the same parent directory as GameServerManager
- Check that folder names match the expected names (especially `pz_server` for Project Zomboid)
- The system will fall back to the original structure as a safety measure

## Console Output

When starting the server manager, you'll see detection messages like:
```
Detected deployment root: C:\GameServers
Found server folders: arksa_server, valheim_server, pz_server
```

This confirms the system has correctly identified your deployment structure. 