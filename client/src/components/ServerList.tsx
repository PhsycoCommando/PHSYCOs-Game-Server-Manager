import React from 'react';
import './ServerList.css';
import Server from './Server';

// Define ServerData interface directly in this file to avoid import issues
interface ServerData {
  id: string;
  name: string;
  status: string;
  pid: number | null;
}

interface ServerListProps {
    servers: ServerData[];
    selectedServer: string | null;
    onSelectServer: (serverId: string | null) => void;
    onRefresh?: () => void;
}

const ServerList: React.FC<ServerListProps> = ({ servers, selectedServer, onSelectServer, onRefresh }) => {
    
    const handleAction = async (id: string, action: 'start' | 'stop') => {
        try {
            const response = await fetch(`/api/servers/${id}/${action}`, {
                method: 'POST',
            });
            
            if (!response.ok) {
                throw new Error(`Failed to ${action} server`);
            }
            
            // Refresh server list after action
            if (onRefresh) {
                setTimeout(onRefresh, 1000); // Give server time to start/stop
            }
        } catch (error) {
            console.error(`Error ${action}ing server:`, error);
            alert(`Failed to ${action} server: ${error}`);
        }
    };

    return (
        <div className="server-list">
            <div className="servers-container">
                {servers.map((server) => (
                    <div 
                        key={server.id}
                        className={`server-card-wrapper ${selectedServer === server.id ? 'selected' : ''}`}
                        onClick={() => onSelectServer(server.id)}
                    >
                        <Server 
                            server={server}
                            onAction={handleAction}
                            isSelected={selectedServer === server.id}
                        />
                    </div>
                ))}
            </div>
        </div>
    );
};

export default ServerList; 