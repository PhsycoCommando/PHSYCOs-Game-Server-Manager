import React, { useState, useEffect } from 'react';
import './ModManager.css';

interface Mod {
  id: string;
  name: string;
  description: string;
  author: string;
  image: string;
  downloads: number;
  rating: number;
  size: string;
  lastUpdated: string;
  tags: string[];
  steamUrl: string;
  installed: boolean;
  enabled: boolean;
}

interface ModManagerProps {
  selectedServer: string;
}

const ModManager: React.FC<ModManagerProps> = ({ selectedServer }) => {
  const [activeTab, setActiveTab] = useState<'browse' | 'installed'>('browse');
  const [mods, setMods] = useState<Mod[]>([]);
  const [installedMods, setInstalledMods] = useState<Mod[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('popular');
  const [timeFilter, setTimeFilter] = useState('all');
  const [message, setMessage] = useState<string | null>(null);

  // Load mods when component mounts or server changes
  useEffect(() => {
    if (activeTab === 'browse') {
      loadMods();
    } else {
      loadInstalledMods();
    }
  }, [selectedServer, activeTab, searchTerm, sortBy, timeFilter]);

  const loadMods = async () => {
    setLoading(true);
    setError(null);
    setMessage(null);
    
    try {
      const params = new URLSearchParams({
        serverName: selectedServer,
        search: searchTerm,
        sortBy,
        timeFilter
      });

      const response = await fetch(`/api/mods/search?${params}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load mods');
      }

      setMods(data.mods || []);
      if (data.message) {
        setMessage(data.message);
      }
    } catch (err) {
      console.error('Error loading mods:', err);
      setError(err instanceof Error ? err.message : 'Failed to load mods');
      setMods([]);
    } finally {
      setLoading(false);
    }
  };

  const loadInstalledMods = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await fetch(`/api/mods/${encodeURIComponent(selectedServer)}/installed`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load installed mods');
      }

      setInstalledMods(data.mods || []);
      if (data.message) {
        setMessage(data.message);
      }
    } catch (err) {
      console.error('Error loading installed mods:', err);
      setError(err instanceof Error ? err.message : 'Failed to load installed mods');
      setInstalledMods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallMod = async (modId: string) => {
    try {
      const response = await fetch(`/api/mods/${encodeURIComponent(selectedServer)}/install/${modId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to install mod');
      }

      // Update mod status
      setMods(prevMods => 
        prevMods.map(mod => 
          mod.id === modId 
            ? { ...mod, installed: true, enabled: true }
            : mod
        )
      );

      // Show success message
      setMessage(`Installing mod... This may take a few minutes.`);
      
      // Refresh installed mods if on that tab
      if (activeTab === 'installed') {
        setTimeout(() => loadInstalledMods(), 2000);
      }
    } catch (err) {
      console.error('Error installing mod:', err);
      setError(err instanceof Error ? err.message : 'Failed to install mod');
    }
  };

  const handleUninstallMod = async (modId: string) => {
    try {
      const response = await fetch(`/api/mods/${encodeURIComponent(selectedServer)}/uninstall/${modId}`, {
        method: 'DELETE',
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to uninstall mod');
      }

      // Update mod status
      setMods(prevMods => 
        prevMods.map(mod => 
          mod.id === modId 
            ? { ...mod, installed: false, enabled: false }
            : mod
        )
      );

      setInstalledMods(prevMods => 
        prevMods.filter(mod => mod.id !== modId)
      );

      setMessage('Mod uninstalled successfully');
    } catch (err) {
      console.error('Error uninstalling mod:', err);
      setError(err instanceof Error ? err.message : 'Failed to uninstall mod');
    }
  };

  const handleToggleMod = async (modId: string, enabled: boolean) => {
    try {
      const response = await fetch(`/api/mods/${encodeURIComponent(selectedServer)}/toggle/${modId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ enabled }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to toggle mod');
      }

      // Update mod status
      const updateMod = (mod: Mod) => 
        mod.id === modId ? { ...mod, enabled } : mod;

      setMods(prevMods => prevMods.map(updateMod));
      setInstalledMods(prevMods => prevMods.map(updateMod));

      setMessage(`Mod ${enabled ? 'enabled' : 'disabled'} successfully`);
    } catch (err) {
      console.error('Error toggling mod:', err);
      setError(err instanceof Error ? err.message : 'Failed to toggle mod');
    }
  };

  const handleImageError = (e: React.SyntheticEvent<HTMLImageElement>) => {
    const img = e.target as HTMLImageElement;
    img.src = 'https://via.placeholder.com/300x200/333333/ffffff?text=No+Image';
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
    <div key={mod.id} className="mod-card">
      <div className="mod-image-container">
        <img 
          src={mod.image} 
          alt={mod.name}
          className="mod-image"
          onError={handleImageError}
          loading="lazy"
        />
        <div className="mod-rating">
          <span className="rating-stars">★</span>
          <span>{mod.rating.toFixed(1)}</span>
        </div>
      </div>
      
      <div className="mod-content">
        <div className="mod-header">
          <h3 className="mod-title">{mod.name}</h3>
          <span className="mod-author">by {mod.author}</span>
        </div>
        
        <p className="mod-description">{mod.description}</p>
        
        <div className="mod-stats">
          <span className="mod-downloads">
            <i className="icon-download"></i>
            {formatNumber(mod.downloads)} downloads
          </span>
          <span className="mod-size">
            <i className="icon-file"></i>
            {mod.size}
          </span>
          <span className="mod-updated">
            <i className="icon-clock"></i>
            {mod.lastUpdated}
          </span>
        </div>
        
        {mod.tags.length > 0 && (
          <div className="mod-tags">
            {mod.tags.slice(0, 3).map((tag, index) => (
              <span key={index} className="mod-tag">{tag}</span>
            ))}
          </div>
        )}
        
        <div className="mod-actions">
          {mod.installed ? (
            <>
              <button
                className={`mod-btn ${mod.enabled ? 'mod-btn-disable' : 'mod-btn-enable'}`}
                onClick={() => handleToggleMod(mod.id, !mod.enabled)}
              >
                {mod.enabled ? 'Disable' : 'Enable'}
              </button>
              <button
                className="mod-btn mod-btn-uninstall"
                onClick={() => handleUninstallMod(mod.id)}
              >
                Uninstall
              </button>
            </>
          ) : (
            <button
              className="mod-btn mod-btn-install"
              onClick={() => handleInstallMod(mod.id)}
            >
              Install
            </button>
          )}
          <a
            href={mod.steamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mod-btn mod-btn-view"
          >
            View on Steam
          </a>
        </div>
      </div>
    </div>
  );

  return (
    <div className="mod-manager">
      <div className="mod-manager-header">
        <h2>Mod Manager - {selectedServer}</h2>
        
        <div className="mod-tabs">
          <button
            className={`mod-tab ${activeTab === 'browse' ? 'active' : ''}`}
            onClick={() => setActiveTab('browse')}
          >
            Browse Workshop
          </button>
          <button
            className={`mod-tab ${activeTab === 'installed' ? 'active' : ''}`}
            onClick={() => setActiveTab('installed')}
          >
            Installed Mods ({installedMods.length})
          </button>
        </div>
      </div>

      {activeTab === 'browse' && (
        <div className="mod-controls">
          <div className="mod-search">
            <input
              type="text"
              placeholder="Search mods..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="mod-search-input"
            />
          </div>
          
          <div className="mod-filters">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="mod-filter-select"
            >
              <option value="popular">Most Popular</option>
              <option value="recent">Most Recent</option>
              <option value="rating">Highest Rated</option>
              <option value="alphabetical">Alphabetical</option>
            </select>
            
            <select
              value={timeFilter}
              onChange={(e) => setTimeFilter(e.target.value)}
              className="mod-filter-select"
            >
              <option value="all">All Time</option>
              <option value="week">This Week</option>
              <option value="month">This Month</option>
            </select>
          </div>
        </div>
      )}

      {error && (
        <div className="mod-error">
          <p>❌ {error}</p>
        </div>
      )}

      {message && (
        <div className="mod-message">
          <p>ℹ️ {message}</p>
        </div>
      )}

      {loading ? (
        <div className="mod-loading">
          <div className="loading-spinner"></div>
          <p>Loading mods...</p>
        </div>
      ) : (
        <div className="mod-grid">
          {activeTab === 'browse' 
            ? mods.map(renderModCard)
            : installedMods.map(renderModCard)
          }
          
          {((activeTab === 'browse' && mods.length === 0) || 
            (activeTab === 'installed' && installedMods.length === 0)) && 
            !loading && !error && (
            <div className="mod-empty">
              <p>
                {activeTab === 'browse' 
                  ? 'No mods found. Try adjusting your search or filters.'
                  : 'No mods installed yet. Browse the workshop to find mods to install!'
                }
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ModManager; 