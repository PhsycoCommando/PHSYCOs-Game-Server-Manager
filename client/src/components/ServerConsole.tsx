import { useState, useEffect, useRef } from 'react';
import './ServerConsole.css';

interface ServerConsoleProps {
  serverName: string;
}

const ServerConsole: React.FC<ServerConsoleProps> = ({ serverName }) => {
  const [consoleLines, setConsoleLines] = useState<string[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [autoScroll, setAutoScroll] = useState(true);
  const consoleRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // Connect to WebSocket when component mounts or serverName changes
  useEffect(() => {
    // Close previous connection if it exists
    if (wsRef.current) {
      wsRef.current.close();
    }

    // Determine WebSocket URL (use secure WebSocket if the page is loaded over HTTPS)
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:54321' : window.location.host;
    const wsUrl = `${protocol}//${host}`;
    
    // Create new WebSocket connection
    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;
    
    // Set up event handlers
    ws.onopen = () => {
      console.log(`WebSocket connected for ${serverName}`);
      setIsConnected(true);
      
      // Subscribe to the server's console output
      ws.send(JSON.stringify({
        type: 'subscribe',
        serverId: serverName
      }));
    };
    
    ws.onclose = () => {
      console.log(`WebSocket disconnected for ${serverName}`);
      setIsConnected(false);
    };
    
    ws.onerror = (error) => {
      console.error(`WebSocket error for ${serverName}:`, error);
      setIsConnected(false);
    };
    
    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      
      switch (data.type) {
        case 'console':
          // Single line of console output
          if (data.serverId === serverName) {
            setConsoleLines(prev => [...prev, data.line]);
          }
          break;
          
        case 'console_history':
          // Initial history of console output
          if (data.serverId === serverName) {
            setConsoleLines(data.lines);
          }
          break;
          
        case 'console_clear':
          // Console was cleared
          if (data.serverId === serverName) {
            setConsoleLines([]);
          }
          break;
          
        default:
          console.log(`Unknown WebSocket message type: ${data.type}`);
      }
    };
    
    // Clean up WebSocket connection when component unmounts
    return () => {
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
    };
  }, [serverName]);

  // Auto-scroll to bottom when new content is added (if auto-scroll is enabled)
  useEffect(() => {
    if (autoScroll && consoleRef.current) {
      consoleRef.current.scrollTop = consoleRef.current.scrollHeight;
    }
  }, [consoleLines, autoScroll]);

  const handleScroll = () => {
    if (consoleRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = consoleRef.current;
      // If user has scrolled up more than 50px from bottom, disable auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isNearBottom);
    }
  };

  const clearConsole = () => {
    if (wsRef.current && wsRef.current.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: 'clear_console',
        serverId: serverName
      }));
    }
  };

  // Fetch initial console output via REST API as a fallback
  useEffect(() => {
    const fetchConsoleOutput = async () => {
      try {
        const response = await fetch(`/api/servers/${serverName}/console`);
        const data = await response.json();
        
        if (data.lines && data.lines.length > 0) {
          setConsoleLines(data.lines);
        }
      } catch (error) {
        console.error(`Error fetching console output for ${serverName}:`, error);
      }
    };
    
    // Only fetch if we don't have any lines yet
    if (consoleLines.length === 0) {
      fetchConsoleOutput();
    }
  }, [serverName, consoleLines.length]);

  return (
    <div className="server-console">
      <div className="console-header">
        <div className="console-title">
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}></span>
          <h3>Console Output - {serverName}</h3>
        </div>
        <div className="console-controls">
          <label className="auto-scroll-toggle">
            <input 
              type="checkbox" 
              checked={autoScroll} 
              onChange={(e) => setAutoScroll(e.target.checked)} 
            />
            Auto-scroll
          </label>
          <button className="clear-button" onClick={clearConsole}>Clear</button>
        </div>
      </div>
      
      <div 
        className="console-output" 
        ref={consoleRef}
        onScroll={handleScroll}
      >
        {consoleLines.length === 0 && (
          <div className="console-empty">
            <p>No console output available. Start the server to see console messages.</p>
          </div>
        )}
        {consoleLines.map((line, index) => (
          <div 
            key={index} 
            className={`console-line ${
              line.includes('ERROR') ? 'error' : 
              line.includes('WARNING') ? 'warning' : 
              line.includes('successfully') ? 'success' : ''
            }`}
          >
            {line}
          </div>
        ))}
      </div>
      
      <div className="console-footer">
        <span className="status-text">
          {isConnected ? 'Connected' : 'Disconnected'} • {consoleLines.length} lines
        </span>
      </div>
    </div>
  );
};

export default ServerConsole; 