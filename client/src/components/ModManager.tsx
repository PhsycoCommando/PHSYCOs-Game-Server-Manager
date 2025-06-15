import React, { useState, useEffect } from 'react';
import './ModManager.css';

interface Mod {
  id: string;
  name: string;
  description: string;
  author: string;
  downloadCount: number;
  rating: number;
  lastUpdated: string;
  imageUrl: string;
  workshopUrl: string;
  fileSize: string;
  tags: string[];
  installed: boolean;
  enabled: boolean;
}

interface ModManagerProps {
  selectedServer: string;
}

const ModManager: React.FC<ModManagerProps> = ({ selectedServer }) => {
  const [mods, setMods] = useState<Mod[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'popular' | 'recent' | 'rating' | 'name'>('popular');
  const [timeFilter, setTimeFilter] = useState<'week' | 'month' | 'all'>('all');
  const [loading, setLoading] = useState(false);
  const [installedMods, setInstalledMods] = useState<Mod[]>([]);
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');

  // Games that support mods
  const supportedGames = ['arksa_server', 'arkse_server', 'valheim_server', 'project_zomboid_server'];
  const isModSupported = supportedGames.includes(selectedServer);

  // Game display names
  const gameNames: { [key: string]: string } = {
    'arksa_server': 'ARK: Survival Ascended',
    'arkse_server': 'ARK: Survival Evolved', 
    'valheim_server': 'Valheim',
    'project_zomboid_server': 'Project Zomboid'
  };

  const getGameDisplayName = () => {
    return gameNames[selectedServer] || selectedServer;
  };

  // Mock data for development - will be replaced with real API calls
  const mockMods: Mod[] = [
    {
      id: '731604991',
      name: 'Structures Plus (S+)',
      description: 'Structures Plus is a building and QoL mod that adds over 100 new structures and features.',
      author: 'orionsun',
      downloadCount: 2500000,
      rating: 4.8,
      lastUpdated: '2024-06-10',
      imageUrl: '/api/placeholder/300/200',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=731604991',
      fileSize: '45.2 MB',
      tags: ['Building', 'Quality of Life', 'Structures'],
      installed: false,
      enabled: false
    },
    {
      id: '889745138',
      name: 'Awesome Spyglass!',
      description: 'Enhanced spyglass with creature stats, taming info, and more!',
      author: 'Mizari',
      downloadCount: 1800000,
      rating: 4.7,
      lastUpdated: '2024-06-08',
      imageUrl: '/api/placeholder/300/200',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=889745138',
      fileSize: '12.8 MB',
      tags: ['Tools', 'Information', 'Taming'],
      installed: true,
      enabled: true
    },
    {
      id: '1404697612',
      name: 'Dino Storage v2',
      description: 'Capture, store and manage your dinosaurs with advanced pokeball-like technology.',
      author: 'Letoric',
      downloadCount: 1200000,
      rating: 4.6,
      lastUpdated: '2024-06-05',
      imageUrl: '/api/placeholder/300/200',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1404697612',
      fileSize: '28.5 MB',
      tags: ['Dinos', 'Storage', 'Management'],
      installed: true,
      enabled: false
    }
  ];

  useEffect(() => {
    if (isModSupported) {
      loadMods();
    }
  }, [searchTerm, sortBy, timeFilter, selectedServer]);

  const loadMods = async () => {
    setLoading(true);
    try {
      // Call the real API with serverName parameter
      const params = new URLSearchParams({
        query: searchTerm,
        sortBy,
        timeFilter
      });
      
      const response = await fetch(`/api/mods/search/${selectedServer}?${params}`);
      const data = await response.json();
      
      if (response.ok) {
        setMods(data.mods || []);
        setInstalledMods(data.mods?.filter((mod: Mod) => mod.installed) || []);
      } else {
        console.error('Error loading mods:', data.error);
        // Fallback to empty array if API fails
        setMods([]);
        setInstalledMods([]);
      }
    } catch (error) {
      console.error('Error loading mods:', error);
      // Fallback to empty array if API fails
      setMods([]);
      setInstalledMods([]);
    } finally {
      setLoading(false);
    }
  };

  const installMod = async (modId: string) => {
    try {
      const response = await fetch(`/api/mods/${selectedServer}/install/${modId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        // Update mod status
        setMods(prev => prev.map((mod: Mod) => 
          mod.id === modId ? { ...mod, installed: true, enabled: true } : mod
        ));
        
        alert(data.message || 'Mod installed successfully!');
      } else {
        alert(data.error || 'Failed to install mod');
      }
    } catch (error) {
      console.error('Error installing mod:', error);
      alert('Failed to install mod. Please try again.');
    }
  };

  const toggleMod = async (modId: string) => {
    try {
             const mod = mods.find((m: Mod) => m.id === modId);
      if (!mod) return;
      
      const response = await fetch(`/api/mods/${selectedServer}/toggle/${modId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ enabled: !mod.enabled })
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMods(prev => prev.map(m => 
          m.id === modId ? { ...m, enabled: !m.enabled } : m
        ));
        setInstalledMods(prev => prev.map(m => 
          m.id === modId ? { ...m, enabled: !m.enabled } : m
        ));
      } else {
        alert(data.error || 'Failed to toggle mod');
      }
    } catch (error) {
      console.error('Error toggling mod:', error);
    }
  };

  const uninstallMod = async (modId: string) => {
    if (!confirm('Are you sure you want to uninstall this mod?')) return;
    
    try {
      const response = await fetch(`/api/mods/${selectedServer}/uninstall/${modId}`, {
        method: 'DELETE'
      });
      
      const data = await response.json();
      
      if (response.ok) {
        setMods(prev => prev.map(mod => 
          mod.id === modId ? { ...mod, installed: false, enabled: false } : mod
        ));
        setInstalledMods(prev => prev.filter(mod => mod.id !== modId));
        
        alert(data.message || 'Mod uninstalled successfully!');
      } else {
        alert(data.error || 'Failed to uninstall mod');
      }
    } catch (error) {
      console.error('Error uninstalling mod:', error);
      alert('Failed to uninstall mod. Please try again.');
    }
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const renderModCard = (mod: Mod) => (
    <div key={mod.id} className={`mod-card ${mod.installed ? 'installed' : ''}`}>
      <div className="mod-image">
        <img src={mod.imageUrl} alt={mod.name} onError={(e) => {
          (e.target as HTMLImageElement).src = '/api/placeholder/300/200';
        }} />
        {mod.installed && (
          <div className={`mod-status ${mod.enabled ? 'enabled' : 'disabled'}`}>
            {mod.enabled ? '✅ Enabled' : '⏸️ Disabled'}
          </div>
        )}
      </div>
      
      <div className="mod-info">
        <h3 className="mod-title">{mod.name}</h3>
        <p className="mod-author">by {mod.author}</p>
        <p className="mod-description">{mod.description}</p>
        
        <div className="mod-stats">
          <span className="mod-downloads">📥 {formatNumber(mod.downloadCount)}</span>
          <span className="mod-rating">⭐ {mod.rating}</span>
          <span className="mod-size">💾 {mod.fileSize}</span>
          <span className="mod-updated">🕒 {new Date(mod.lastUpdated).toLocaleDateString()}</span>
        </div>
        
        <div className="mod-tags">
          {mod.tags.map(tag => (
            <span key={tag} className="mod-tag">{tag}</span>
          ))}
        </div>
        
        <div className="mod-actions">
          {!mod.installed ? (
            <>
              <button 
                className="btn btn-primary install-btn"
                onClick={() => installMod(mod.id)}
              >
                📦 Install
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => window.open(mod.workshopUrl, '_blank')}
              >
                🔗 View on Steam
              </button>
            </>
          ) : (
            <>
              <button 
                className={`btn ${mod.enabled ? 'btn-warning' : 'btn-success'}`}
                onClick={() => toggleMod(mod.id)}
              >
                {mod.enabled ? '⏸️ Disable' : '▶️ Enable'}
              </button>
              <button 
                className="btn btn-danger"
                onClick={() => uninstallMod(mod.id)}
              >
                🗑️ Uninstall
              </button>
              <button 
                className="btn btn-secondary"
                onClick={() => window.open(mod.workshopUrl, '_blank')}
              >
                🔗 Steam
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div className="mod-manager">
      <div className="mod-manager-header">
        <h2>🎮 Mod Manager - {getGameDisplayName()}</h2>
        <p>Browse, install, and manage mods for your {getGameDisplayName()} server</p>
      </div>

      {!isModSupported ? (
        <div className="empty-state">
          <h3>🚫 Mod Support Not Available</h3>
          <p>
            {getGameDisplayName()} doesn't currently support mods through this manager, 
            or mod support hasn't been implemented yet.
          </p>
          <p>
            <strong>Supported Games:</strong><br/>
            • ARK: Survival Ascended (Steam Workshop)<br/>
            • ARK: Survival Evolved (Steam Workshop)<br/>
            • Valheim (Nexus Mods / Thunderstore)<br/>
            • Project Zomboid (Steam Workshop)
          </p>
        </div>
      ) : (
        <>
          <div className="mod-tabs">
            <button 
              className={`tab-btn ${activeTab === 'browse' ? 'active' : ''}`}
              onClick={() => setActiveTab('browse')}
            >
              🔍 Browse Mods ({mods.length})
            </button>
            <button 
              className={`tab-btn ${activeTab === 'installed' ? 'active' : ''}`}
              onClick={() => setActiveTab('installed')}
            >
              📦 Installed Mods ({installedMods.length})
            </button>
          </div>

          {activeTab === 'browse' && (
            <>
              <div className="mod-controls">
                <div className="search-section">
                  <input
                    type="text"
                    placeholder={`Search ${getGameDisplayName()} mods by name, description, or tags...`}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="search-input"
                  />
                </div>
                
                <div className="filter-section">
                  <select 
                    value={sortBy} 
                    onChange={(e) => setSortBy(e.target.value as any)}
                    className="filter-select"
                  >
                    <option value="popular">Most Popular</option>
                    <option value="recent">Recently Updated</option>
                    <option value="rating">Highest Rated</option>
                    <option value="name">Alphabetical</option>
                  </select>
                  
                  <select 
                    value={timeFilter} 
                    onChange={(e) => setTimeFilter(e.target.value as any)}
                    className="filter-select"
                  >
                    <option value="all">All Time</option>
                    <option value="month">Past Month</option>
                    <option value="week">Past Week</option>
                  </select>
                </div>
              </div>

              {loading ? (
                <div className="loading-state">
                  <div className="spinner"></div>
                  <p>Loading {getGameDisplayName()} mods...</p>
                </div>
              ) : mods.length === 0 ? (
                <div className="empty-state">
                  <h3>No mods found</h3>
                  <p>Try adjusting your search terms or filters.</p>
                </div>
              ) : (
                <div className="mod-grid">
                  {mods.map(renderModCard)}
                </div>
              )}
            </>
          )}

          {activeTab === 'installed' && (
            <div className="installed-mods">
              {installedMods.length === 0 ? (
                <div className="empty-state">
                  <h3>No mods installed</h3>
                  <p>Browse the mod library to install your first {getGameDisplayName()} mod!</p>
                  <button 
                    className="btn btn-primary"
                    onClick={() => setActiveTab('browse')}
                  >
                    🔍 Browse Mods
                  </button>
                </div>
              ) : (
                <div className="mod-grid">
                  {installedMods.map(renderModCard)}
                </div>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ModManager; 