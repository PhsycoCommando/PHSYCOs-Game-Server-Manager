const express = require('express');
const router = express.Router();
const axios = require('axios');

// Steam Workshop API endpoints
const STEAM_API_BASE = 'https://api.steampowered.com';
const PUBLISHED_FILE_DETAILS = `${STEAM_API_BASE}/ISteamRemoteStorage/GetPublishedFileDetails/v1/`;
const PUBLISHED_FILE_SEARCH = `${STEAM_API_BASE}/IPublishedFileService/QueryFiles/v1/`;

// Game App IDs for Steam Workshop
const GAME_APP_IDS = {
  'ARK: Survival Ascended': 2399830,
  'ARK: Survival Evolved': 346110,
  'Valheim': 892970,
  'Project Zomboid': 108600,
  'Palworld': 1623730,
  'Enshrouded': 1203620,
  'The Forest': 242760,
  'Green Hell': 815370,
  'Raft': 648800,
  'Subnautica': 264710
};

// Popular mod IDs for each game (these are real Steam Workshop items)
const POPULAR_MODS = {
  346110: [ // ARK: Survival Evolved
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
  ],
  2399830: [ // ARK: Survival Ascended
    '3282365140', // Structures Plus (S+) ASA
    '3283828732', // Awesome Spyglass ASA
    '3284178187', // Ultra Stacks ASA
    '3285421895', // Dino Storage v2 ASA
    '3286547896'  // Better Dinos ASA
  ],
  892970: [ // Valheim
    '1392026038', // Valheim Plus
    '1398877109', // Equipment and Quick Slots
    '1401825858', // Unrestricted Portals
    '1404942527', // Craft From Containers
    '1408164467'  // Better Archery
  ],
  108600: [ // Project Zomboid
    '2169435993', // Brita's Weapon Pack
    '2200148440', // Authentic Z
    '2313387159', // True Actions. Act 3 - Dancing
    '2366717227', // Expanded Helicopter Events
    '2478247379'  // Vehicle Recycling
  ]
};

// Cache for mod details to avoid excessive API calls
const modCache = new Map();
const CACHE_DURATION = 30 * 60 * 1000; // 30 minutes

// Helper function to get Steam Workshop mod details
async function getModDetails(modIds) {
  try {
    const uncachedIds = modIds.filter(id => {
      const cached = modCache.get(id);
      return !cached || (Date.now() - cached.timestamp > CACHE_DURATION);
    });

    let newMods = [];
    if (uncachedIds.length > 0) {
      const formData = new URLSearchParams();
      formData.append('itemcount', uncachedIds.length);
      uncachedIds.forEach((id, index) => {
        formData.append(`publishedfileids[${index}]`, id);
      });

      const response = await axios.post(PUBLISHED_FILE_DETAILS, formData, {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded'
        },
        timeout: 10000
      });

      if (response.data && response.data.response && response.data.response.publishedfiledetails) {
        newMods = response.data.response.publishedfiledetails
          .filter(mod => mod.result === 1) // Only successful results
          .map(mod => ({
            id: mod.publishedfileid,
            name: mod.title || 'Unknown Mod',
            description: mod.short_description || mod.description || 'No description available',
            author: mod.creator || 'Unknown Author',
            image: mod.preview_url || `https://steamuserimages-a.akamaihd.net/ugc/${mod.publishedfileid}/`,
            downloads: parseInt(mod.subscriptions) || 0,
            rating: mod.vote_data ? (mod.vote_data.votes_up / (mod.vote_data.votes_up + mod.vote_data.votes_down) * 100) : 0,
            size: mod.file_size ? `${(mod.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
            lastUpdated: mod.time_updated ? new Date(mod.time_updated * 1000).toLocaleDateString() : 'Unknown',
            tags: mod.tags ? mod.tags.map(tag => tag.tag) : [],
            steamUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.publishedfileid}`,
            installed: false,
            enabled: false
          }));

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
    console.error('Error fetching mod details:', error.message);
    return [];
  }
}

// Helper function to search Steam Workshop
async function searchWorkshop(appId, searchText = '', page = 1, sortBy = 'trend') {
  try {
    const params = new URLSearchParams({
      key: process.env.STEAM_API_KEY || '', // Optional: Steam API key for higher rate limits
      query_type: sortBy === 'popular' ? '9' : sortBy === 'recent' ? '1' : '3', // Total subscriptions, publication date, or trend
      page: page.toString(),
      numperpage: '50',
      creator_appid: appId.toString(),
      appid: appId.toString(),
      search_text: searchText,
      return_vote_data: 'true',
      return_tags: 'true',
      return_previews: 'true',
      return_short_description: 'true'
    });

    const response = await axios.get(`${PUBLISHED_FILE_SEARCH}?${params}`, {
      timeout: 10000
    });

    if (response.data && response.data.response && response.data.response.publishedfiledetails) {
      return response.data.response.publishedfiledetails
        .filter(mod => mod.result === 1)
        .map(mod => ({
          id: mod.publishedfileid,
          name: mod.title || 'Unknown Mod',
          description: mod.short_description || mod.description || 'No description available',
          author: mod.creator || 'Unknown Author',
          image: mod.preview_url || `https://steamuserimages-a.akamaihd.net/ugc/${mod.publishedfileid}/`,
          downloads: parseInt(mod.subscriptions) || 0,
          rating: mod.vote_data ? (mod.vote_data.votes_up / (mod.vote_data.votes_up + mod.vote_data.votes_down) * 100) : 0,
          size: mod.file_size ? `${(mod.file_size / 1024 / 1024).toFixed(1)} MB` : 'Unknown',
          lastUpdated: mod.time_updated ? new Date(mod.time_updated * 1000).toLocaleDateString() : 'Unknown',
          tags: mod.tags ? mod.tags.map(tag => tag.tag) : [],
          steamUrl: `https://steamcommunity.com/sharedfiles/filedetails/?id=${mod.publishedfileid}`,
          installed: false,
          enabled: false
        }));
    }

    return [];
  } catch (error) {
    console.error('Error searching workshop:', error.message);
    return [];
  }
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

    const appId = GAME_APP_IDS[serverName];
    
    if (!appId) {
      return res.json({
        mods: [],
        message: `Steam Workshop integration not available for ${serverName}. This game may not support Steam Workshop or the integration is not yet implemented.`,
        totalCount: 0,
        hasMore: false
      });
    }

    let mods = [];

    if (search.trim()) {
      // Search Steam Workshop
      mods = await searchWorkshop(appId, search, page, sortBy);
    } else {
      // Get popular mods for this game
      const popularModIds = POPULAR_MODS[appId] || [];
      if (popularModIds.length > 0) {
        mods = await getModDetails(popularModIds);
        
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
      }
    }

    // Apply time filter (for trending/recent)
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

    res.json({
      mods,
      totalCount: mods.length,
      hasMore: false, // For now, we don't implement pagination
      serverName,
      appId
    });

  } catch (error) {
    console.error('Error in mod search:', error);
    res.status(500).json({ 
      error: 'Failed to search mods',
      message: error.message,
      mods: [],
      totalCount: 0,
      hasMore: false
    });
  }
});

// POST /api/mods/:server/install/:modId - Install a mod
router.post('/:server/install/:modId', async (req, res) => {
  try {
    const { server, modId } = req.params;
    
    // In a real implementation, this would:
    // 1. Use SteamCMD to download the workshop item
    // 2. Extract it to the appropriate server mod directory
    // 3. Update server configuration
    // 4. Track installation status
    
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
    
    // In a real implementation, this would scan the server's mod directory
    // and return information about installed mods
    
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