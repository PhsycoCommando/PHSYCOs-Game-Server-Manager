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
  steamUrl?: string;
  curseforgeUrl?: string;
  source: string;
  installed: boolean;
  enabled: boolean;
  curseforgeId?: string;
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
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null);
  const [reordering, setReordering] = useState(false);
  const [pendingChanges, setPendingChanges] = useState(false);
  const [saving, setSaving] = useState(false);

  const loadInstalledModsCount = async () => {
    try {
      const response = await fetch(`/api/mods/installed/${encodeURIComponent(selectedServer)}`);
      const data = await response.json();
      
      if (response.ok && data.success) {
        // Update the installed mods array to get the count
        setInstalledMods(data.installedMods || []);
      }
    } catch (err) {
      console.error('Error loading installed mods count:', err);
    }
  };

  // Load mods when component mounts or server changes
  useEffect(() => {
    if (selectedServer) {
      if (activeTab === 'browse') {
        loadMods();
      } else {
        loadInstalledMods();
      }
      // Always load the count for the tab display
      loadInstalledModsCount();
    }
  }, [selectedServer, activeTab]);

  // Load mods when search/filter parameters change (only for browse tab)
  useEffect(() => {
    if (selectedServer && activeTab === 'browse') {
      loadMods();
    }
  }, [searchTerm, sortBy, timeFilter]);

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
      const response = await fetch(`/api/mods/installed/${encodeURIComponent(selectedServer)}`);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to load installed mods');
      }

      setInstalledMods(data.installedMods || []);
      if (data.count !== undefined) {
        setMessage(`Found ${data.count} installed mods`);
      }
    } catch (err) {
      console.error('Error loading installed mods:', err);
      setError(err instanceof Error ? err.message : 'Failed to load installed mods');
      setInstalledMods([]);
    } finally {
      setLoading(false);
    }
  };

  const handleInstallMod = async (mod: Mod) => {
    try {
      // Add mod to installed list locally
      const newMod = { ...mod, installed: true, enabled: true };
      setInstalledMods(prevMods => [...prevMods, newMod]);
      
      // Update mod status in browse list
      setMods(prevMods => 
        prevMods.map(m => 
          m.id === mod.id 
            ? { ...m, installed: true, enabled: true }
            : m
        )
      );

      // Mark changes as pending
      setPendingChanges(true);
      setMessage(`Mod "${mod.name}" added to install queue. Click "Save Configuration" to apply.`);
      
    } catch (err) {
      console.error('Error installing mod:', err);
      setError(err instanceof Error ? err.message : 'Failed to install mod');
    }
  };

  const handleUninstallMod = async (mod: Mod) => {
    try {
      // Remove mod from installed list locally
      setInstalledMods(prevMods => prevMods.filter(m => m.id !== mod.id));
      
      // Update mod status in browse list
      setMods(prevMods => 
        prevMods.map(m => 
          m.id === mod.id 
            ? { ...m, installed: false, enabled: false }
            : m
        )
      );

      // Mark changes as pending
      setPendingChanges(true);
      setMessage(`Mod "${mod.name}" removed from install queue. Click "Save Configuration" to apply.`);
      
    } catch (err) {
      console.error('Error uninstalling mod:', err);
      setError(err instanceof Error ? err.message : 'Failed to uninstall mod');
    }
  };

  const handleSaveConfiguration = async () => {
    try {
      setSaving(true);
      
      // Extract mod IDs and names in the current order
      const modIds = installedMods.map(mod => mod.curseforgeId || mod.id);
      const modNames = installedMods.map(mod => mod.name);
      
      const response = await fetch('/api/mods/save-config', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          serverName: selectedServer,
          modIds: modIds,
          modNames: modNames
        }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.message || 'Failed to save configuration');
      }

      setPendingChanges(false);
      setMessage('Configuration saved successfully! Restart server to apply changes.');
      
    } catch (err) {
      console.error('Error saving configuration:', err);
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleReorderMods = async (newOrder: Mod[]) => {
    try {
      setReordering(true);
      
      // Update local state with new order
      setInstalledMods(newOrder);
      setPendingChanges(true);
      setMessage('Mod order updated. Click "Save Configuration" to apply changes.');
      
    } catch (err) {
      console.error('Error reordering mods:', err);
      setError(err instanceof Error ? err.message : 'Failed to reorder mods');
    } finally {
      setReordering(false);
    }
  };

  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e: React.DragEvent, dropIndex: number) => {
    e.preventDefault();
    
    if (draggedIndex === null || draggedIndex === dropIndex) {
      setDraggedIndex(null);
      return;
    }

    const newOrder = [...installedMods];
    const draggedMod = newOrder[draggedIndex];
    
    // Remove dragged mod from its current position
    newOrder.splice(draggedIndex, 1);
    
    // Insert dragged mod at new position
    newOrder.splice(dropIndex, 0, draggedMod);
    
    setDraggedIndex(null);
    handleReorderMods(newOrder);
  };

  const formatNumber = (num: number): string => {
    if (num >= 1000000) {
      return (num / 1000000).toFixed(1) + 'M';
    } else if (num >= 1000) {
      return (num / 1000).toFixed(1) + 'K';
    }
    return num.toString();
  };

  const renderInstalledModItem = (mod: Mod, index: number) => (
    <div
      key={mod.id}
      className={`installed-mod-item ${draggedIndex === index ? 'dragging' : ''}`}
      draggable
      onDragStart={(e) => handleDragStart(e, index)}
      onDragOver={handleDragOver}
      onDrop={(e) => handleDrop(e, index)}
    >
      <div className="mod-drag-handle">
        <span className="drag-icon">⋮⋮</span>
      </div>
      
      <div className="mod-order-number">
        {index + 1}
      </div>
      
      <div className="mod-info">
        <div className="mod-name-author">
          <h4 className="mod-name">{mod.name}</h4>
          <span className="mod-author">by {mod.author}</span>
        </div>
        <div className="mod-description-compact">
          {mod.description}
        </div>
        <div className="mod-stats-compact">
          <span className="mod-downloads">{formatNumber(mod.downloads)} downloads</span>
          <span className="mod-size">{mod.size}</span>
          <span className="mod-rating">★ {mod.rating.toFixed(1)}</span>
        </div>
      </div>
      
      <div className="mod-actions-compact">
        <button
          className="mod-btn mod-btn-uninstall"
          onClick={() => handleUninstallMod(mod)}
          disabled={reordering}
        >
          Uninstall
        </button>
        <a
          href={mod.source === 'curseforge' ? mod.curseforgeUrl : mod.steamUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="mod-btn mod-btn-view"
        >
          View
        </a>
      </div>
    </div>
  );

  const renderModCard = (mod: Mod) => (
    <div key={mod.id} className="mod-card">
      <div className="mod-content">
        <div className="mod-header">
          <h3 className="mod-title">{mod.name}</h3>
          <div className="mod-rating">
            <span className="rating-stars">★</span>
            <span>{mod.rating.toFixed(1)}</span>
          </div>
        </div>
        <span className="mod-author">by {mod.author}</span>
        
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
            <button
              className="mod-btn mod-btn-uninstall"
              onClick={() => handleUninstallMod(mod)}
            >
              Uninstall
            </button>
          ) : (
            <button
              className="mod-btn mod-btn-install"
              onClick={() => handleInstallMod(mod)}
            >
              Install
            </button>
          )}
          <a
            href={mod.source === 'curseforge' ? mod.curseforgeUrl : mod.steamUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mod-btn mod-btn-view"
          >
            {mod.source === 'curseforge' ? 'View on CurseForge' : 'View on Steam'}
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
            Browse Mods
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

      {activeTab === 'installed' && installedMods.length > 0 && (
        <div className="load-order-info">
          <span className="info-icon">🔄</span>
          <span>
            Drag and drop mods to reorder them. Load order is important - some mods require specific positioning to work correctly.
            Changes will be saved automatically and applied on server restart.
          </span>
        </div>
      )}

      {activeTab === 'installed' && installedMods.length > 0 && (
        <div className="mod-config-controls">
          <button
            className={`save-config-btn ${pendingChanges ? 'has-changes' : ''}`}
            onClick={handleSaveConfiguration}
            disabled={saving || !pendingChanges}
          >
            {saving ? 'Saving...' : pendingChanges ? 'Save Configuration' : 'Configuration Saved'}
          </button>
          {pendingChanges && (
            <span className="pending-changes-notice">
              ⚠️ You have unsaved changes
            </span>
          )}
        </div>
      )}

      {loading ? (
        <div className="mod-loading">
          <div className="loading-spinner"></div>
          <p>Loading mods...</p>
        </div>
      ) : (
        <div className={`mod-grid ${activeTab === 'installed' ? 'installed-view' : ''} ${reordering ? 'reordering' : ''}`}>
          {activeTab === 'browse' 
            ? mods.map(renderModCard)
            : installedMods.map((mod, index) => renderInstalledModItem(mod, index))
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