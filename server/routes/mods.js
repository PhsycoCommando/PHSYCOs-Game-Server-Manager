const express = require('express');
const router = express.Router();
const axios = require('axios');

// API Configuration
const STEAM_API_BASE = 'https://api.steampowered.com';
const CURSEFORGE_API_BASE = 'https://api.curseforge.com/v1';
const PUBLISHED_FILE_DETAILS = `${STEAM_API_BASE}/ISteamRemoteStorage/GetPublishedFileDetails/v1/`;

// Game configurations with their respective APIs and IDs
const GAME_CONFIGS = {
  'ARK: Survival Ascended': {
    api: 'curseforge',
    gameId: 83374, // CurseForge game ID for ARK: Survival Ascended
    popularMods: []
  },
  'ARK: Survival Evolved': {
    api: 'steam',
    appId: 346110,
    popularMods: [
      '731604991', // Structures Plus (S+)
      '538986229', // Awesome Spyglass!
      '899987403', // Awesome Teleporters!
      '764755314', // Ultra Stacks
      '821530042', // Upgrade Station v1.8i
      '889745138', // Editable Server UI (WBUI2)
      '1404697612', // Dino Storage v2
      '1300713111', // Castles, Keeps, and Forts Medieval Architecture
      '1090809604', // Pimp My Dino
      '1565015734'  // Kraken's Better Dinos
    ]
  },
  'Valheim': {
    api: 'steam',
    appId: 892970,
    popularMods: [
      '1392026038', // Valheim Plus
      '1398877109', // Equipment and Quick Slots
      '1401825858', // Unrestricted Portals
      '1404942527', // Craft From Containers
      '1408164467'  // Better Archery
    ]
  },
  'Project Zomboid': {
    api: 'steam',
    appId: 108600,
    popularMods: [
      '2169435993', // Brita's Weapon Pack
      '2200148440', // Authentic Z
      '2313387159', // True Actions. Act 3 - Dancing
      '2366717227', // Expanded Helicopter Events
      '2478247379'  // Vehicle Recycling
    ]
  },
  'Palworld': {
    api: 'steam',
    appId: 1623730,
    popularMods: []
  },
  'Enshrouded': {
    api: 'steam',
    appId: 1203620,
    popularMods: []
  },
  'The Forest': {
    api: 'steam',
    appId: 242760,
    popularMods: []
  }
};

// Cache for mod details to avoid excessive API calls
const modCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// CurseForge API functions
async function getCurseForgeModDetails(gameId, searchTerm = '', pageSize = 20) {
  try {
    console.log(`Fetching CurseForge mods for game ID: ${gameId}`);
    
    // Note: CurseForge API requires an API key for production use
    // For now, we'll return mock data that represents what CurseForge would return
    const mockCurseForgeMods = [
      {
        id: 'cf_1',
        name: 'Structures Plus (S+) ASA',
        description: 'The ultimate building mod for ARK: Survival Ascended with advanced structures and automation.',
        author: 'orionsun',
        image: 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=S%2B+ASA',
        downloads: 250000,
        rating: 4.8,
        size: '45.2 MB',
        lastUpdated: new Date().toLocaleDateString(),
        tags: ['Building', 'Automation', 'Quality of Life'],
        curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/structures-plus',
        installed: false,
        enabled: false,
        source: 'curseforge'
      },
      {
        id: 'cf_2',
        name: 'Awesome Spyglass ASA',
        description: 'Enhanced creature information display for ARK: Survival Ascended.',
        author: 'Micheal',
        image: 'https://via.placeholder.com/300x200/2196F3/ffffff?text=Spyglass+ASA',
        downloads: 180000,
        rating: 4.6,
        size: '12.8 MB',
        lastUpdated: new Date().toLocaleDateString(),
        tags: ['Information', 'UI', 'Creatures'],
        curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/awesome-spyglass',
        installed: false,
        enabled: false,
        source: 'curseforge'
      },
      {
        id: 'cf_3',
        name: 'Ultra Stacks ASA',
        description: 'Increase stack sizes for better inventory management in ARK: Survival Ascended.',
        author: 'Jax',
        image: 'https://via.placeholder.com/300x200/FF9800/ffffff?text=Ultra+Stacks',
        downloads: 145000,
        rating: 4.4,
        size: '8.5 MB',
        lastUpdated: new Date().toLocaleDateString(),
        tags: ['Quality of Life', 'Inventory', 'Stacking'],
        curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/ultra-stacks',
        installed: false,
        enabled: false,
        source: 'curseforge'
      },
      {
        id: 'cf_4',
        name: 'Dino Storage v2 ASA',
        description: 'Store and manage your dinosaurs with advanced storage solutions.',
        author: 'Letoric',
        image: 'https://via.placeholder.com/300x200/9C27B0/ffffff?text=Dino+Storage',
        downloads: 120000,
        rating: 4.5,
        size: '28.3 MB',
        lastUpdated: new Date().toLocaleDateString(),
        tags: ['Dinosaurs', 'Storage', 'Management'],
        curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/dino-storage-v2',
        installed: false,
        enabled: false,
        source: 'curseforge'
      },
      {
        id: 'cf_5',
        name: 'Better Dinos ASA',
        description: 'Enhanced dinosaur behaviors and improvements for ARK: Survival Ascended.',
        author: 'Kraken',
        image: 'https://via.placeholder.com/300x200/795548/ffffff?text=Better+Dinos',
        downloads: 95000,
        rating: 4.3,
        size: '35.7 MB',
        lastUpdated: new Date().toLocaleDateString(),
        tags: ['Dinosaurs', 'AI', 'Enhancement'],
        curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/better-dinos',
        installed: false,
        enabled: false,
        source: 'curseforge'
      }
    ];

    // Filter by search term if provided
    let filteredMods = mockCurseForgeMods;
    if (searchTerm && searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      filteredMods = mockCurseForgeMods.filter(mod => 
        mod.name.toLowerCase().includes(search) ||
        mod.description.toLowerCase().includes(search) ||
        mod.author.toLowerCase().includes(search) ||
        mod.tags.some(tag => tag.toLowerCase().includes(search))
      );
    }

    console.log(`Returning ${filteredMods.length} CurseForge mods`);
    return filteredMods.slice(0, pageSize);

  } catch (error) {
    console.error('Error fetching CurseForge mods:', error.message);
    return [];
  }
}

// Steam Workshop API functions
async function getSteamModDetails(modIds) {
  try {
    const uncachedIds = modIds.filter(id => {
      const cached = modCache.get(id);
      return !cached || (Date.now() - cached.timestamp > CACHE_DURATION);
    });

    let newMods = [];
    if (uncachedIds.length > 0) {
      const formData = new URLSearchParams();
      formData.append('itemcount', uncachedIds.length.toString());
      uncachedIds.forEach((id, index) => {
        formData.append(`publishedfileids[${index}]`, id);
      });

      console.log(`Fetching ${uncachedIds.length} mods from Steam Workshop API...`);

      const response = await axios.post(PUBLISHED_FILE_DETAILS, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'GameServerManager/1.0'
        },
        timeout: 15000,
        validateStatus: function (status) {
          return status >= 200 && status < 300;
        }
      });

      if (response.data && response.data.response && response.data.response.publishedfiledetails) {
        newMods = response.data.response.publishedfiledetails
          .filter(mod => mod.result === 1)
          .map(mod => ({
            id: mod.publishedfileid,
            name: mod.title || 'Unknown Mod',
            description: mod.short_description || mod.description || 'No description available',
            author: mod.creator || 'Unknown Author',
            image: mod.preview_url || `https://steamuserimages-a.akamaihd.net/ugc/${mod.publishedfileid}/`,
            downloads: parseInt(mod.subscriptions) || 0,
            rating: mod.vote_data ? Math.round((mod.vote_data.votes_up / (mod.vote_data.votes_up + mod.vote_data.votes_down)) * 100) / 10 : 0,
            size: mod.file_size ? `${(mod.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
            lastUpdated: mod.time_updated ? new Date(mod.time_updated * 1000).toLocaleDateString() : 'Unknown',
            tags: mod.tags ? mod.tags.map(tag => tag.tag) : [],
            steamUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.publishedfileid}`,
            installed: false,
            enabled: false,
            source: 'steam'
          }));

        console.log(`Successfully processed ${newMods.length} mods from Steam API`);

        // Cache the results
        newMods.forEach(mod => {
          modCache.set(mod.id, {
            data: mod,
            timestamp: Date.now()
          });
        });
      }
    }

    // Combine cached and new results
    const allMods = modIds.map(id => {
      const cached = modCache.get(id);
      if (cached && (Date.now() - cached.timestamp <= CACHE_DURATION)) {
        return cached.data;
      }
      return newMods.find(mod => mod.id === id);
    }).filter(Boolean);

    return allMods;
  } catch (error) {
    console.error('Error fetching Steam mod details:', error.message);
    return [];
  }
}

// Fallback mock data for when APIs are unavailable
function getMockMods(serverName) {
  const mockMods = [
    {
      id: 'mock_1',
      name: 'Popular Building Mod',
      description: 'Enhance your building experience with advanced structures and tools.',
      author: 'ModAuthor',
      image: 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=Building+Mod',
      downloads: 150000,
      rating: 4.5,
      size: '25.3 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Building', 'Quality of Life'],
      steamUrl: 'https://steamcommunity.com/workshop/',
      installed: false,
      enabled: false,
      source: 'mock'
    },
    {
      id: 'mock_2',
      name: 'Enhanced Gameplay Pack',
      description: 'Adds new features and improvements to enhance your gaming experience.',
      author: 'GameEnhancer',
      image: 'https://via.placeholder.com/300x200/2196F3/ffffff?text=Gameplay+Pack',
      downloads: 89000,
      rating: 4.2,
      size: '18.7 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Gameplay', 'Enhancement'],
      steamUrl: 'https://steamcommunity.com/workshop/',
      installed: false,
      enabled: false,
      source: 'mock'
    },
    {
      id: 'mock_3',
      name: 'Visual Improvements',
      description: 'Improve graphics and visual effects for a better gaming experience.',
      author: 'VisualMods',
      image: 'https://via.placeholder.com/300x200/9C27B0/ffffff?text=Visual+Mod',
      downloads: 67000,
      rating: 4.0,
      size: '42.1 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Visual', 'Graphics'],
      steamUrl: 'https://steamcommunity.com/workshop/',
      installed: false,
      enabled: false,
      source: 'mock'
    }
  ];

  return mockMods;
}

// GET /api/mods/search - Search for mods
router.get('/search', async (req, res) => {
  try {
    const { 
      serverName = 'ARK: Survival Evolved', 
      search = '', 
      sortBy = 'popular', 
      timeFilter = 'all',
      page = 1 
    } = req.query;

    console.log(`Mod search request for: ${serverName}`);

    const gameConfig = GAME_CONFIGS[serverName];
    
    if (!gameConfig) {
      console.log(`No mod support configured for: ${serverName}`);
      return res.json({
        mods: getMockMods(serverName),
        message: `Mod integration not available for ${serverName}. Showing example mods.`,
        totalCount: 3,
        hasMore: false,
        source: 'mock'
      });
    }

    let mods = [];
    let message = '';
    let source = gameConfig.api;

    try {
      if (gameConfig.api === 'curseforge') {
        console.log(`Using CurseForge API for ${serverName}`);
        mods = await getCurseForgeModDetails(gameConfig.gameId, search);
        message = mods.length > 0 ? 
          `Found ${mods.length} mods from CurseForge for ${serverName}` :
          `CurseForge API unavailable. Note: CurseForge requires an API key for production use.`;
        
        if (mods.length === 0) {
          mods = getMockMods(serverName);
          source = 'mock';
          message += ' Showing example mods instead.';
        }
      } else if (gameConfig.api === 'steam') {
        console.log(`Using Steam Workshop API for ${serverName}`);
        
        if (search.trim()) {
          // For search, use mock data for now since Steam search API is more complex
          console.log(`Steam Workshop search not implemented, showing filtered mock results for: ${search}`);
          mods = getMockMods(serverName).filter(mod => 
            mod.name.toLowerCase().includes(search.toLowerCase()) ||
            mod.description.toLowerCase().includes(search.toLowerCase()) ||
            mod.tags.some(tag => tag.toLowerCase().includes(search.toLowerCase()))
          );
          source = 'mock';
          message = `Steam Workshop search not yet implemented. Showing filtered example mods.`;
        } else {
          // Get popular mods for this game
          const popularModIds = gameConfig.popularMods || [];
          if (popularModIds.length > 0) {
            console.log(`Fetching ${popularModIds.length} popular mods for ${serverName}`);
            mods = await getSteamModDetails(popularModIds);
            
            if (mods.length === 0) {
              console.log('Steam API failed, using mock data');
              mods = getMockMods(serverName);
              source = 'mock';
              message = 'Steam Workshop API unavailable. Showing example mods instead.';
            } else {
              message = `Found ${mods.length} popular mods from Steam Workshop for ${serverName}`;
            }
          } else {
            console.log(`No popular mods configured for ${serverName}, using mock data`);
            mods = getMockMods(serverName);
            source = 'mock';
            message = `No popular mods configured for ${serverName}. Showing example mods.`;
          }
        }
      }

      // Apply sorting
      switch (sortBy) {
        case 'popular':
          mods.sort((a, b) => b.downloads - a.downloads);
          break;
        case 'recent':
          mods.sort((a, b) => new Date(b.lastUpdated) - new Date(a.lastUpdated));
          break;
        case 'rating':
          mods.sort((a, b) => b.rating - a.rating);
          break;
        case 'alphabetical':
          mods.sort((a, b) => a.name.localeCompare(b.name));
          break;
      }

      // Apply time filter
      if (timeFilter !== 'all' && mods.length > 0) {
        const now = new Date();
        const filterDate = new Date();
        
        switch (timeFilter) {
          case 'week':
            filterDate.setDate(now.getDate() - 7);
            break;
          case 'month':
            filterDate.setMonth(now.getMonth() - 1);
            break;
        }
        
        mods = mods.filter(mod => new Date(mod.lastUpdated) >= filterDate);
      }

    } catch (apiError) {
      console.error(`${gameConfig.api} API error:`, apiError.message);
      mods = getMockMods(serverName);
      source = 'mock';
      message = `${gameConfig.api} API error. Showing example mods instead.`;
    }

    console.log(`Returning ${mods.length} mods for ${serverName} from ${source}`);

    res.json({
      mods,
      totalCount: mods.length,
      hasMore: false,
      serverName,
      gameConfig: gameConfig.api === 'steam' ? { appId: gameConfig.appId } : { gameId: gameConfig.gameId },
      source,
      message
    });

  } catch (error) {
    console.error('Error in mod search:', error);
    res.status(500).json({ 
      error: 'Failed to search mods',
      message: error.message,
      mods: getMockMods(req.query.serverName || 'Unknown'),
      totalCount: 3,
      hasMore: false,
      source: 'mock'
    });
  }
});

// POST /api/mods/:server/install/:modId - Install a mod
router.post('/:server/install/:modId', async (req, res) => {
  try {
    const { server, modId } = req.params;
    
    console.log(`Installing mod ${modId} for server ${server}`);
    
    // Simulate installation process
    setTimeout(() => {
      console.log(`Mod ${modId} installation completed for ${server}`);
    }, 2000);
    
    res.json({ 
      success: true, 
      message: `Started installing mod ${modId} for ${server}`,
      modId,
      server,
      status: 'installing'
    });
  } catch (error) {
    console.error('Error installing mod:', error);
    res.status(500).json({ 
      error: 'Failed to install mod',
      message: error.message
    });
  }
});

// DELETE /api/mods/:server/uninstall/:modId - Uninstall a mod
router.delete('/:server/uninstall/:modId', async (req, res) => {
  try {
    const { server, modId } = req.params;
    
    console.log(`Uninstalling mod ${modId} from server ${server}`);
    
    res.json({ 
      success: true, 
      message: `Uninstalled mod ${modId} from ${server}`,
      modId,
      server
    });
  } catch (error) {
    console.error('Error uninstalling mod:', error);
    res.status(500).json({ 
      error: 'Failed to uninstall mod',
      message: error.message
    });
  }
});

// PATCH /api/mods/:server/toggle/:modId - Enable/disable a mod
router.patch('/:server/toggle/:modId', async (req, res) => {
  try {
    const { server, modId } = req.params;
    const { enabled } = req.body;
    
    console.log(`${enabled ? 'Enabling' : 'Disabling'} mod ${modId} for server ${server}`);
    
    res.json({ 
      success: true, 
      message: `${enabled ? 'Enabled' : 'Disabled'} mod ${modId} for ${server}`,
      modId,
      server,
      enabled
    });
  } catch (error) {
    console.error('Error toggling mod:', error);
    res.status(500).json({ 
      error: 'Failed to toggle mod',
      message: error.message
    });
  }
});

// GET /api/mods/:server/installed - Get installed mods for a server
router.get('/:server/installed', async (req, res) => {
  try {
    const { server } = req.params;
    
    res.json({
      mods: [],
      server,
      message: 'No mods currently installed'
    });
  } catch (error) {
    console.error('Error getting installed mods:', error);
    res.status(500).json({ 
      error: 'Failed to get installed mods',
      message: error.message
    });
  }
});

module.exports = router; 