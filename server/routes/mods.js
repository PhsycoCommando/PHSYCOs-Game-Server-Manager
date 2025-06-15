const express = require('express');
const router = express.Router();
const fs = require('fs').promises;
const path = require('path');

// Mock Steam Workshop API integration
// TODO: Replace with real Steam Workshop API calls
const MOCK_MODS = [
  {
    id: '731604991',
    name: 'Structures Plus (S+)',
    description: 'Structures Plus is a building and QoL mod that adds over 100 new structures and features to enhance your ARK building experience.',
    author: 'orionsun',
    downloadCount: 2500000,
    rating: 4.8,
    lastUpdated: '2024-06-10',
    imageUrl: 'https://steamuserimages-a.akamaihd.net/ugc/731604991/preview.jpg',
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
    imageUrl: 'https://steamuserimages-a.akamaihd.net/ugc/889745138/preview.jpg',
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
    imageUrl: 'https://steamuserimages-a.akamaihd.net/ugc/1404697612/preview.jpg',
    workshopUrl: 'https://steamcommunity.com/sharedfiles/filedetails/?id=1404697612',
    fileSize: '28.5 MB',
    tags: ['Dinos', 'Storage', 'Management'],
    installed: false,
    enabled: false
  }
];

// Search mods (Steam Workshop API simulation)
router.get('/search', async (req, res) => {
  try {
    const { query = '', sortBy = 'popular', timeFilter = 'all' } = req.query;
    
    let filteredMods = MOCK_MODS.filter(mod => {
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
      totalCount: filteredMods.length
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
    const modData = MOCK_MODS.find(mod => mod.id === modId);
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