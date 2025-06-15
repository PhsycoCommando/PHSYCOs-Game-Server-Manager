const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Mock Steam Workshop API integration
// TODO: Replace with real Steam Workshop API calls
const MOCK_MODS = {
  // ARK: Survival Ascended Mods
  arksa_server: [
    {
      id: '731604991',
      name: 'Structures Plus (S+)',
      description: 'Structures Plus is a building and QoL mod that adds over 100 new structures and features to enhance your ARK building experience.',
      author: 'orionsun',
      downloadCount: 2500000,
      rating: 4.8,
      lastUpdated: '2024-06-10',
      imageUrl: 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=Structures+Plus',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=731604991',
      fileSize: '45.2 MB',
      tags: ['Building', 'Quality of Life', 'Structures'],
      installed: false,
      enabled: false
    },
    {
      id: '889745138',
      name: 'Awesome Spyglass!',
      description: 'Enhanced spyglass with creature stats, taming info, and more detailed information about everything in ARK!',
      author: 'Mizari',
      downloadCount: 1800000,
      rating: 4.7,
      lastUpdated: '2024-06-08',
      imageUrl: 'https://via.placeholder.com/300x200/2196F3/ffffff?text=Awesome+Spyglass',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=889745138',
      fileSize: '12.8 MB',
      tags: ['Tools', 'Information', 'Taming'],
      installed: false,
      enabled: false
    },
    {
      id: '1404697612',
      name: 'Dino Storage v2',
      description: 'Capture, store and manage your dinosaurs with advanced pokeball-like technology. Perfect for base organization!',
      author: 'Letoric',
      downloadCount: 1200000,
      rating: 4.6,
      lastUpdated: '2024-06-05',
      imageUrl: 'https://via.placeholder.com/300x200/9C27B0/ffffff?text=Dino+Storage',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1404697612',
      fileSize: '28.5 MB',
      tags: ['Dinos', 'Storage', 'Management'],
      installed: false,
      enabled: false
    },
    {
      id: '1300713111',
      name: 'Eco Trees',
      description: 'Adds realistic tree growth and environmental effects to make your ARK world more immersive and beautiful.',
      author: 'EcoModder',
      downloadCount: 950000,
      rating: 4.5,
      lastUpdated: '2024-06-01',
      imageUrl: 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=Eco+Trees',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1300713111',
      fileSize: '67.3 MB',
      tags: ['Environment', 'Visual', 'Immersion'],
      installed: false,
      enabled: false
    },
    {
      id: '1999447172',
      name: 'Better Reusables',
      description: 'Improves the durability and functionality of reusable items like grappling hooks, parachutes, and more.',
      author: 'QualityMods',
      downloadCount: 750000,
      rating: 4.4,
      lastUpdated: '2024-05-28',
      imageUrl: 'https://via.placeholder.com/300x200/FF9800/ffffff?text=Better+Reusables',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1999447172',
      fileSize: '15.7 MB',
      tags: ['Quality of Life', 'Items', 'Durability'],
      installed: false,
      enabled: false
    }
  ],
  
  // ARK: Survival Evolved Mods
  arkse_server: [
    {
      id: '731604991',
      name: 'Structures Plus (S+)',
      description: 'The classic building mod for ARK: Survival Evolved with enhanced structures and building mechanics.',
      author: 'orionsun',
      downloadCount: 5200000,
      rating: 4.9,
      lastUpdated: '2024-06-12',
      imageUrl: 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=S%2B+Classic',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=731604991',
      fileSize: '52.1 MB',
      tags: ['Building', 'Quality of Life', 'Structures'],
      installed: false,
      enabled: false
    },
    {
      id: '566887000',
      name: 'Classic Flyers',
      description: 'Restores the classic flyer mechanics and speeds from before the great flyer nerf.',
      author: 'Genie45',
      downloadCount: 3100000,
      rating: 4.6,
      lastUpdated: '2024-06-09',
      imageUrl: 'https://via.placeholder.com/300x200/03A9F4/ffffff?text=Classic+Flyers',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=566887000',
      fileSize: '8.2 MB',
      tags: ['Flyers', 'Balance', 'Classic'],
      installed: false,
      enabled: false
    },
    {
      id: '821530042',
      name: 'Upgrade Station v1.8i',
      description: 'Upgrade your items and equipment with this comprehensive upgrade system.',
      author: 'Kalbintion',
      downloadCount: 2800000,
      rating: 4.5,
      lastUpdated: '2024-06-07',
      imageUrl: 'https://via.placeholder.com/300x200/E91E63/ffffff?text=Upgrade+Station',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=821530042',
      fileSize: '34.7 MB',
      tags: ['Items', 'Upgrade', 'Crafting'],
      installed: false,
      enabled: false
    }
  ],
  
  // Valheim Mods (Nexus/Thunderstore)
  valheim_server: [
    {
      id: 'valheim_plus',
      name: 'ValheimPlus',
      description: 'The ultimate Valheim mod that adds tons of quality of life improvements and customization options.',
      author: 'ValheimPlus Team',
      downloadCount: 1500000,
      rating: 4.7,
      lastUpdated: '2024-06-11',
      imageUrl: 'https://via.placeholder.com/300x200/FF5722/ffffff?text=ValheimPlus',
      workshopUrl: 'https://www.nexusmods.com/valheim/mods/4',
      fileSize: '12.3 MB',
      tags: ['Quality of Life', 'Configuration', 'Enhancement'],
      installed: false,
      enabled: false
    },
    {
      id: 'epic_loot',
      name: 'Epic Loot',
      description: 'Adds a loot system with magic items, enchantments, and legendary equipment to Valheim.',
      author: 'RandyKnapp',
      downloadCount: 890000,
      rating: 4.6,
      lastUpdated: '2024-06-08',
      imageUrl: 'https://via.placeholder.com/300x200/9C27B0/ffffff?text=Epic+Loot',
      workshopUrl: 'https://www.nexusmods.com/valheim/mods/387',
      fileSize: '8.7 MB',
      tags: ['Loot', 'Magic', 'Equipment'],
      installed: false,
      enabled: false
    },
    {
      id: 'jotunn',
      name: 'Jötunn',
      description: 'A modding library for Valheim that enables advanced mod functionality and compatibility.',
      author: 'Valheim Modding',
      downloadCount: 750000,
      rating: 4.8,
      lastUpdated: '2024-06-10',
      imageUrl: 'https://via.placeholder.com/300x200/607D8B/ffffff?text=Jotunn+Lib',
      workshopUrl: 'https://www.nexusmods.com/valheim/mods/1138',
      fileSize: '5.2 MB',
      tags: ['Library', 'Framework', 'Modding'],
      installed: false,
      enabled: false
    }
  ],
  
  // Project Zomboid Mods
  project_zomboid_server: [
    {
      id: '2004998206',
      name: 'Brita\'s Weapon Pack',
      description: 'Massive weapon expansion adding hundreds of realistic firearms and melee weapons to Project Zomboid.',
      author: 'Brita',
      downloadCount: 1200000,
      rating: 4.8,
      lastUpdated: '2024-06-09',
      imageUrl: 'https://via.placeholder.com/300x200/F44336/ffffff?text=Britas+Weapons',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2004998206',
      fileSize: '156.8 MB',
      tags: ['Weapons', 'Firearms', 'Realism'],
      installed: false,
      enabled: false
    },
    {
      id: '2169435993',
      name: 'Authentic Z',
      description: 'Overhauls zombie behavior and AI to make them more realistic and challenging.',
      author: 'AuthenticPeach',
      downloadCount: 850000,
      rating: 4.6,
      lastUpdated: '2024-06-07',
      imageUrl: 'https://via.placeholder.com/300x200/795548/ffffff?text=Authentic+Z',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2169435993',
      fileSize: '23.4 MB',
      tags: ['Zombies', 'AI', 'Difficulty'],
      installed: false,
      enabled: false
    },
    {
      id: '2200148440',
      name: 'Vehicle Recycling',
      description: 'Allows you to dismantle and recycle vehicle parts for materials and components.',
      author: 'Filibuster Rhymes',
      downloadCount: 650000,
      rating: 4.5,
      lastUpdated: '2024-06-05',
      imageUrl: 'https://via.placeholder.com/300x200/4CAF50/ffffff?text=Vehicle+Recycling',
      workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=2200148440',
      fileSize: '12.1 MB',
      tags: ['Vehicles', 'Crafting', 'Recycling'],
      installed: false,
      enabled: false
    }
  ]
};

// Get mods for specific server/game
const getModsForServer = (serverName) => {
  return MOCK_MODS[serverName] || [];
};

// Search mods (Steam Workshop API simulation)
router.get('/search/:serverName', async (req, res) => {
  try {
    const { serverName } = req.params;
    const { query = '', sortBy = 'popular', timeFilter = 'all' } = req.query;
    
    let filteredMods = getModsForServer(serverName).filter(mod => {
      const searchTerm = query.toLowerCase();
      return (
        mod.name.toLowerCase().includes(searchTerm) ||
        mod.description.toLowerCase().includes(searchTerm) ||
        mod.author.toLowerCase().includes(searchTerm) ||
        mod.tags.some(tag => tag.toLowerCase().includes(searchTerm))
      );
    });
    
    // Sort mods
    filteredMods.sort((a, b) => {
      switch (sortBy) {
        case 'popular':
          return b.downloadCount - a.downloadCount;
        case 'recent':
          return new Date(b.lastUpdated).getTime() - new Date(a.lastUpdated).getTime();
        case 'rating':
          return b.rating - a.rating;
        case 'name':
          return a.name.localeCompare(b.name);
        default:
          return 0;
      }
    });
    
    res.json({
      mods: filteredMods,
      totalCount: filteredMods.length,
      serverName: serverName
    });
  } catch (error) {
    console.error('Error searching mods:', error);
    res.status(500).json({ error: 'Failed to search mods' });
  }
});

// Install a mod (placeholder implementation)
router.post('/:serverName/install/:modId', async (req, res) => {
  try {
    const { serverName, modId } = req.params;
    
    // Find mod in database
    const modData = getModsForServer(serverName).find(mod => mod.id === modId);
    if (!modData) {
      return res.status(404).json({ error: 'Mod not found' });
    }
    
    console.log(`Installing mod ${modId} (${modData.name}) for server ${serverName}`);
    
    // TODO: Implement actual mod installation
    // For now, just simulate success
    
    res.json({ 
      success: true, 
      message: `Mod "${modData.name}" installed successfully`,
      mod: { ...modData, installed: true, enabled: true }
    });
  } catch (error) {
    console.error('Error installing mod:', error);
    res.status(500).json({ error: 'Failed to install mod' });
  }
});

// Uninstall a mod
router.delete('/:serverName/uninstall/:modId', async (req, res) => {
  try {
    const { serverName, modId } = req.params;
    
    console.log(`Uninstalling mod ${modId} from server ${serverName}`);
    
    res.json({ 
      success: true, 
      message: 'Mod uninstalled successfully'
    });
  } catch (error) {
    console.error('Error uninstalling mod:', error);
    res.status(500).json({ error: 'Failed to uninstall mod' });
  }
});

// Toggle mod enabled/disabled
router.patch('/:serverName/toggle/:modId', async (req, res) => {
  try {
    const { serverName, modId } = req.params;
    const { enabled } = req.body;
    
    console.log(`Toggling mod ${modId} ${enabled ? 'enabled' : 'disabled'} for server ${serverName}`);
    
    res.json({ 
      success: true, 
      message: `Mod ${enabled ? 'enabled' : 'disabled'} successfully`
    });
  } catch (error) {
    console.error('Error toggling mod:', error);
    res.status(500).json({ error: 'Failed to toggle mod' });
  }
});

module.exports = router; 