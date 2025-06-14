import React, { useState, useEffect } from 'react';
import './App.css';
import ServerList from './components/ServerList';
import PortForwardingTable from './components/PortForwardingTable';
import RconManager from './components/RconManager';
import ConfigEditor from './components/ConfigEditor';
import ServerConsole from './components/ServerConsole';
import GlobalSettings from './components/GlobalSettings';
import Welcome from './components/Welcome';
import Instructions from './components/Instructions';
import Support from './components/Support';
import Header from './components/Header';
import Tabs from './components/Tabs';
import type { ServerData, PortData } from './types';

const API_URL = '/api';

function App() {
    const [servers, setServers] = useState<ServerData[]>([]);
    const [selectedServer, setSelectedServer] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('welcome');
    const [portForwarding, setPortForwarding] = useState<PortData[]>([]);

    const fetchServers = async () => {
        try {
            const response = await fetch(`${API_URL}/servers`);
            const data = await response.json();
            setServers(data);
        } catch (error) {
            console.error('Error fetching servers:', error);
        }
    };

    const fetchPortForwarding = async () => {
        try {
            const response = await fetch(`${API_URL}/ports`);
            const data = await response.json();
            setPortForwarding(data);
        } catch (error) {
            console.error('Error fetching port forwarding data:', error);
        }
    };

    useEffect(() => {
        fetchServers();
        fetchPortForwarding();

        const interval = setInterval(fetchServers, 5000);
        return () => clearInterval(interval);
    }, []);

    const renderTabContent = () => {
        switch (activeTab) {
            case 'welcome':
                return <Welcome />;
            case 'instructions':
                return <Instructions />;
            case 'console':
                return (
                    <div className="console-container">
                        <h2>Server Console</h2>
                        {selectedServer && (
                            <ServerConsole serverName={selectedServer} />
                        )}
                        {!selectedServer && (
                            <p className="select-server-prompt">Select a server to view its console</p>
                        )}
                    </div>
                );
            case 'rcon':
                return (
                    <div className="console-container">
                        <h2>RCON Console</h2>
                        {selectedServer === 'arksa_server' && (
                            <RconManager serverName="arksa_server" />
                        )}
                        {selectedServer === 'arkse_server' && (
                            <RconManager serverName="arkse_server" />
                        )}
                        {selectedServer && selectedServer !== 'arksa_server' && selectedServer !== 'arkse_server' && (
                            <p>RCON not supported for this server type</p>
                        )}
                        {!selectedServer && (
                            <p className="select-server-prompt">Select a server to access RCON</p>
                        )}
                    </div>
                );
            case 'config':
                return (
                    <div className="config-container">
                        <h2>Configuration Editor</h2>
                        {selectedServer && (
                            <ConfigEditor serverName={selectedServer} apiUrl={API_URL} />
                        )}
                        {!selectedServer && (
                            <p className="select-server-prompt">Select a server to edit its configuration</p>
                        )}
                    </div>
                );
            case 'ports':
                return (
                    <div className="ports-container">
                        <h2>Port Forwarding Configuration</h2>
                        <PortForwardingTable 
                            portForwarding={portForwarding} 
                            setPortForwarding={setPortForwarding}
                            apiUrl={API_URL} 
                        />
                    </div>
                );
            case 'settings':
                return (
                    <div className="settings-container">
                        <h2>Global Settings</h2>
                        <GlobalSettings apiUrl={API_URL} />
                    </div>
                );
            case 'support':
                return <Support />;
            default:
                return null;
        }
    };

  return (
        <div className="app">
            <Header />
            <div className="tab-container">
                <Tabs activeTab={activeTab} onTabChange={setActiveTab} />
            </div>
            <div className="content">
                <div className="sidebar">
                    <h3>Servers</h3>
                    <ServerList 
                        servers={servers} 
                        onSelectServer={setSelectedServer} 
                        selectedServer={selectedServer}
                        onRefresh={fetchServers}
                    />
                </div>
                <div className="main">
                    {renderTabContent()}
                </div>
            </div>
            <div className="footer">
                Game Server Manager v1.0 • Made with ❤️ by PHSYCO & Claude
      </div>
      </div>
    );
}

export default App;
