# 🎮 PHSYCO's Game Server Manager

**A powerful, web-based game server management solution with Discord integration and comprehensive automation features.**

![License](https://img.shields.io/badge/license-MIT-blue.svg)
![Node.js](https://img.shields.io/badge/node.js-18+-green.svg)
![React](https://img.shields.io/badge/react-18+-blue.svg)

## 📋 Overview

PHSYCO's Game Server Manager is a modern, full-stack web application designed to simplify the management of multiple game servers from a single, intuitive interface. Built with React and Node.js, it provides real-time monitoring, configuration management, and automated deployment tools for popular survival and multiplayer games.

## ✨ Key Features

### 🖥️ **Multi-Server Management**
- Support for ARK: Survival Ascended, ARK: Survival Evolved, Valheim, Project Zomboid, and Enshrouded
- Start, stop, and monitor multiple servers simultaneously
- Real-time server status and process monitoring
- Intelligent server detection and auto-configuration

### ⚙️ **Advanced Configuration**
- Browser-based configuration file editor with syntax highlighting
- Live config validation and backup creation
- Configuration presets and templates
- Automatic default config generation

### 🎯 **RCON Integration**
- Built-in RCON console for remote server administration
- Execute commands without joining the game
- Player management and server control
- Command history and auto-completion

### 💾 **Backup & Restore System**
- Named world backups with metadata
- One-click backup creation and restoration
- Backup scheduling and management
- Safe experimentation with rollback capability

### 🌐 **Network Management**
- Automated Windows Firewall configuration
- Port forwarding rule generation
- Network security best practices
- External access management

### 📊 **Real-Time Monitoring**
- Live server console output via WebSocket
- Performance metrics and resource usage
- Server health monitoring
- Automated alerts and notifications

### 🔧 **Discord Integration**
- Feedback system with Discord webhook support
- Real-time notifications for server events
- Community feedback collection
- Bug reporting and feature requests

## 🎯 Supported Games

| Game | Status | Features |
|------|--------|----------|
| **ARK: Survival Ascended** | ✅ Full Support | RCON, Config Editor, Backups |
| **ARK: Survival Evolved** | ✅ Full Support | RCON, Config Editor, Backups |
| **Valheim** | ✅ Full Support | Config Editor, Backups |
| **Project Zomboid** | ✅ Full Support | Config Editor, Backups |
| **Enshrouded** | ✅ Full Support | Config Editor, Backups |

## 🚀 Quick Start

### Prerequisites

- **Node.js 18+** - [Download here](https://nodejs.org/)
- **Windows 10/11** (for game server compatibility)
- **Git** - [Download here](https://git-scm.com/)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/PhsycoCommando/PHSYCOs-Game-Server-Manager.git
   cd PHSYCOs-Game-Server-Manager
   ```

2. **Install backend dependencies**
   ```bash
   cd GameServerManager/server
   npm install
   ```

3. **Install frontend dependencies**
   ```bash
   cd ../client
   npm install
   ```

4. **Set up your directory structure**
   ```
   C:\GameServers\                    # Or your preferred location
   ├── GameServerManager/             # This repository
   ├── arksa_server/                  # ARK: Survival Ascended (optional)
   ├── arkse_server/                  # ARK: Survival Evolved (optional)
   ├── valheim_server/                # Valheim (optional)
   ├── pz_server/                     # Project Zomboid (optional)
   └── enshrouded_server/             # Enshrouded (optional)
   ```

5. **Start the application**

   **Option A: Development Mode (Recommended for testing)**
   ```bash
   # Terminal 1 - Backend
   cd GameServerManager/server
   npm start
   
   # Terminal 2 - Frontend
   cd GameServerManager/client
   npm run dev
   ```
   Access at: `http://localhost:5173`

   **Option B: Production Mode**
   ```bash
   # Build frontend
   cd GameServerManager/client
   npm run build
   
   # Start backend (serves built frontend)
   cd ../server
   npm start
   ```
   Access at: `http://localhost:54321`

## 📁 Directory Structure

```
GameServerManager/
├── client/                         # React frontend
│   ├── src/
│   │   ├── components/             # UI components
│   │   │   ├── ConfigEditor.tsx    # Configuration file editor
│   │   │   ├── ServerConsole.tsx   # Real-time console output
│   │   │   ├── ServerList.tsx      # Server management interface
│   │   │   └── Support.tsx         # Feedback and donation system
│   │   ├── types.ts                # TypeScript definitions
│   │   └── main.tsx                # Application entry point
│   ├── package.json
│   └── vite.config.ts              # Vite configuration with API proxy
├── server/                         # Node.js backend
│   ├── routes/                     # API endpoints
│   │   ├── servers.js              # Server management API
│   │   ├── feedback.js             # Discord webhook integration
│   │   └── config.js               # Configuration management
│   ├── utils/                      # Utility functions
│   │   └── serverProcessManager.js # Process management
│   ├── package.json
│   └── index.js                    # Server entry point
├── docs/                           # Documentation
├── .gitignore                      # Git ignore rules
└── README.md                       # This file
```

## ⚙️ Configuration

### Discord Integration (Optional)

1. **Create a Discord webhook** in your server
2. **Set environment variable**:
   ```bash
   # Create .env file in server directory
   echo "DISCORD_WEBHOOK_URL=your_webhook_url_here" > GameServerManager/server/.env
   ```
3. **Or edit the feedback.js file** directly (not recommended for public repos)

### Game Server Setup

The application will automatically detect installed game servers. If servers are missing:

1. **Use the built-in installer** (Global Settings → Server Installation)
2. **Or install manually** and place in the correct directory structure

## 🛠️ Development

### Tech Stack

**Frontend:**
- React 18 with TypeScript
- Vite for development and building
- Modern CSS with responsive design
- WebSocket for real-time updates

**Backend:**
- Node.js with Express
- WebSocket server for live console output
- RCON client for game server communication
- File system management and automation

### Building for Production

```bash
# Build frontend
cd GameServerManager/client
npm run build

# The built files will be served by the backend server
cd ../server
npm start
```

## 🔧 Usage

### Basic Workflow

1. **Start the application** using the quick start guide above
2. **Check the Instructions tab** for setup checklist
3. **Install missing servers** via Global Settings
4. **Configure your servers** using the Config Editor
5. **Start your servers** and begin hosting!

### Key Features Usage

- **Server Management**: Use the sidebar to select and control servers
- **Configuration**: Edit config files directly in the browser
- **RCON Commands**: Execute server commands remotely
- **Backups**: Create and restore world backups safely
- **Port Management**: Configure firewall and port forwarding
- **Monitoring**: Watch real-time console output and server status

## 🤝 Contributing

Contributions are welcome! Please feel free to submit issues, feature requests, or pull requests.

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📞 Support & Community

- **Discord**: [Join our community](https://discord.gg/88syxd5)
- **YouTube**: [PHSYCO Commando](https://www.youtube.com/@phsycocommando)
- **Issues**: Use GitHub Issues for bug reports and feature requests
- **Feedback**: Built-in feedback system with Discord integration

## 🔒 Security

- Never commit sensitive information (webhooks, passwords, etc.)
- Use environment variables for configuration
- Keep your game servers updated
- Follow network security best practices

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- Built with ❤️ by PHSYCO & Claude
- Special thanks to the gaming community for feedback and testing
- Inspired by the need for better game server management tools

## 📊 Roadmap

- [ ] Support for additional games (Minecraft, Rust, etc.)
- [ ] Mobile-responsive interface improvements
- [ ] Advanced scheduling and automation
- [ ] Plugin system for custom extensions
- [ ] Docker containerization support

---

**⭐ Star this repository if you find it useful!**

**🎮 Happy Gaming!** 