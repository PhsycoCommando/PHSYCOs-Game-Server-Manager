import { useState, useRef, useEffect } from 'react';
import axios from 'axios';
import './RconManager.css';

interface RconManagerProps {
  serverName: string;
}

// Common ARK commands for suggestions
const COMMON_ARK_COMMANDS = [
  { label: 'List Players', command: 'listplayers' },
  { label: 'Server Info', command: 'serverinfo' },
  { label: 'Broadcast', command: 'broadcast' },
  { label: 'Save World', command: 'saveworld' },
  { label: 'Show Chat', command: 'showchat' },
  { label: 'Kick Player', command: 'kickplayer' },
  { label: 'Ban Player', command: 'banplayer' },
  { label: 'Unban Player', command: 'unbanplayer' },
];

const RconManager = ({ serverName }: RconManagerProps) => {
  const [command, setCommand] = useState('');
  const [output, setOutput] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const outputRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom of output when new content is added
  useEffect(() => {
    if (outputRef.current) {
      outputRef.current.scrollTop = outputRef.current.scrollHeight;
    }
  }, [output]);

  const handleCommandChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setCommand(e.target.value);
  };

  const executeCommand = async (cmdToExecute: string = command) => {
    if (!cmdToExecute.trim()) return;
    
    setIsLoading(true);
    setError(null);
    
    try {
      const response = await axios.post(`http://localhost:54321/api/rcon/${serverName}`, {
        command: cmdToExecute.trim()
      });
      
      // Add command and response to output history
      setOutput(prev => [
        ...prev, 
        cmdToExecute, 
        response.data.output || 'Command executed successfully (no output)'
      ]);
      
      // Clear command input only if it's the same as what was executed
      if (cmdToExecute === command) {
        setCommand('');
      }
    } catch (err) {
      console.error('RCON command error:', err);
      setError(err instanceof Error ? err.message : 'Failed to execute RCON command');
      setOutput(prev => [
        ...prev, 
        cmdToExecute, 
        `ERROR: ${err instanceof Error ? err.message : 'Failed to execute RCON command'}`
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !isLoading) {
      executeCommand();
    }
  };

  const clearConsole = () => {
    setOutput([]);
  };

  const handleSuggestionClick = (suggestedCommand: string) => {
    setCommand(suggestedCommand);
    // Focus the input field after setting the command
    const inputElement = document.querySelector('.rcon-input') as HTMLInputElement;
    if (inputElement) {
      inputElement.focus();
    }
  };

  return (
    <div className="rcon-manager">
      <div className="rcon-header">
        <h3>RCON Console - {serverName}</h3>
        <button 
          className="clear-button" 
          onClick={clearConsole}
          title="Clear console"
        >
          Clear
        </button>
      </div>
      
      <div className="rcon-output" ref={outputRef}>
        {output.length === 0 && (
          <div className="welcome-message">
            <p>Welcome to the RCON Console for {serverName}.</p>
            <p>Type a command below or click one of the suggestions to get started.</p>
          </div>
        )}
        {output.map((line, index) => (
          <div 
            key={index} 
            className={index % 2 === 0 ? 'command-line' : 'response-line'}
          >
            {line}
          </div>
        ))}
      </div>
      
      <div className="command-suggestions">
        {COMMON_ARK_COMMANDS.map((cmd) => (
          <button
            key={cmd.command}
            className="suggestion-chip"
            onClick={() => handleSuggestionClick(cmd.command)}
            title={`Execute: ${cmd.command}`}
          >
            {cmd.label}
          </button>
        ))}
      </div>
      
      <div className="rcon-input-container">
        <span className="prompt">$</span>
        <input
          type="text"
          value={command}
          onChange={handleCommandChange}
          onKeyDown={handleKeyDown}
          placeholder="Enter RCON command..."
          disabled={isLoading}
          className="rcon-input"
        />
        <button 
          onClick={() => executeCommand()}
          disabled={isLoading || !command.trim()}
          className="execute-button"
        >
          {isLoading ? 'Sending...' : 'Execute'}
        </button>
      </div>
      
      {error && <div className="error-message">{error}</div>}
    </div>
  );
};

export default RconManager; 