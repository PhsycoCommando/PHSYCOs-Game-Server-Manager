import React from 'react';
import type { PortData } from '../types';

interface PortForwardingTableProps {
    portForwarding: PortData[];
    setPortForwarding: React.Dispatch<React.SetStateAction<PortData[]>>;
    apiUrl: string;
}

const PortForwardingTable: React.FC<PortForwardingTableProps> = ({ portForwarding, setPortForwarding, apiUrl }) => {
    const togglePortEnabled = async (index: number) => {
        const updatedPorts = [...portForwarding];
        updatedPorts[index].enabled = !updatedPorts[index].enabled;
        setPortForwarding(updatedPorts);
        
        try {
            await fetch(`${apiUrl}/ports`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ portForwarding: updatedPorts }),
            });
        } catch (error) {
            console.error('Error updating port status:', error);
        }
    };

    const generateBatchFile = async (action: 'enable' | 'disable') => {
        try {
            const response = await fetch(`${apiUrl}/ports/generate-batch`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ action }),
            });
            
            const result = await response.json();
            
            if (response.ok) {
                // Create a download link
                const link = document.createElement('a');
                link.href = result.downloadUrl;
                link.download = result.filename;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
            } else {
                alert(`Error: ${result.error}`);
            }
        } catch (error) {
            console.error('Error generating batch file:', error);
            alert('Failed to generate batch file');
        }
    };

    return (
        <div className="port-forwarding">
            <div className="port-actions">
                <button 
                    className="export-btn" 
                    onClick={() => generateBatchFile('enable')}
                >
                    Download Enable Ports Script
                </button>
                <button 
                    className="export-btn" 
                    onClick={() => generateBatchFile('disable')}
                    style={{ marginLeft: '10px' }}
                >
                    Download Disable Ports Script
                </button>
            </div>
            <table>
                <thead>
                    <tr>
                        <th>Server</th>
                        <th>Ports</th>
                        <th>Protocol</th>
                        <th>Notes</th>
                        <th>Enabled</th>
                    </tr>
                </thead>
                <tbody>
                    {portForwarding.map((port, index) => (
                        <tr key={port.serverName}>
                            <td>{port.serverName}</td>
                            <td>{port.ports}</td>
                            <td>{port.protocol}</td>
                            <td>{port.notes}</td>
                            <td>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={port.enabled}
                                        onChange={() => togglePortEnabled(index)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default PortForwardingTable; 