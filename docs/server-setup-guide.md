# 🎮 Dedicated Game Server Installation Guide (SteamCMD-based)
**Install Path:** `C:\PHSYCO\GameServers\`

---

## 🔧 Step 1: Set Up SteamCMD

1. **Download SteamCMD** from Valve’s developer site:  
   https://developer.valvesoftware.com/wiki/SteamCMD

2. **Extract** it into your intended folder:  

3. **Run `steamcmd.exe`** once to update and create necessary files.

---

## 🗃️ Step 2: Install a Game Server

Open SteamCMD and run these commands:

```bash
login anonymous
force_install_dir "C:\PHSYCO\GameServers\<SERVER_NAME>"
app_update <SERVER_ID> validate
quit
