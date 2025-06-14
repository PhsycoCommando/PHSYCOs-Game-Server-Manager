import React from 'react';
import './Server.css';

interface ServerData {
    id: string;
    name: string;
    status: string;
    pid?: number | null;
}

interface ServerProps {
    server: ServerData;
    onAction: (id: string, action: 'start' | 'stop') => void;
    isSelected?: boolean;
}

const Server: React.FC<ServerProps> = ({ server, onAction, isSelected = false }) => {
    const isRunning = server.status === 'Running';

    const handleAction = (e: React.MouseEvent, action: 'start' | 'stop') => {
        e.stopPropagation(); // Prevent triggering server selection
        onAction(server.id, action);
    };

    return (
        <div className={`server-card ${isRunning ? 'running' : 'stopped'} ${isSelected ? 'selected' : ''}`}>
            <div className="server-header">
                <h3>{server.name}</h3>
                <span className={`status-indicator ${isRunning ? 'status-running' : 'status-stopped'}`}>
                    {server.status}
                </span>
            </div>
            <div className="server-actions">
                <button 
                    onClick={(e) => handleAction(e, 'start')} 
                    disabled={isRunning}
                    className={`action-btn start-btn ${isRunning ? 'disabled' : ''}`}
                >
                    Start
                </button>
                <button 
                    onClick={(e) => handleAction(e, 'stop')} 
                    disabled={!isRunning}
                    className={`action-btn stop-btn ${!isRunning ? 'disabled' : ''}`}
                >
                    Stop
                </button>
            </div>
            {isRunning && server.pid && (
                <div className="server-details">
                    <span className="pid-info">PID: {server.pid}</span>
                </div>
            )}
        </div>
    );
};

export default Server; 