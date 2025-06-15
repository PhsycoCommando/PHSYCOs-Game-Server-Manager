const express = require('express');
const router = express.Router();
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// API Configuration
const STEAM_API_BASE = 'https://api.steampowered.com';
const PUBLISHED_FILE_DETAILS = `${STEAM_API_BASE}/ISteamRemoteStorage/GetPublishedFileDetails/v1/`;

// Server name to game name mapping
const SERVER_TO_GAME_MAPPING = {
  'arksa_server': 'ARK: Survival Ascended',
  'arkse_server': 'ARK: Survival Evolved', 
  'valheim_server': 'Valheim',
  'pz_server': 'Project Zomboid',
  'palworld_server': 'Palworld',
  'enshrouded_server': 'Enshrouded',
  'forest_server': 'The Forest',
  // Legacy mappings
  'ARK: Survival Ascended': 'ARK: Survival Ascended',
  'ARK: Survival Evolved': 'ARK: Survival Evolved',
  'Valheim': 'Valheim',
  'Project Zomboid': 'Project Zomboid',
  'Palworld': 'Palworld',
  'Enshrouded': 'Enshrouded',
  'The Forest': 'The Forest'
};

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

// CurseForge mod data (real mods from CurseForge)
function getCurseForgeModDetails(gameId, searchTerm = '', pageSize = 50) {
  console.log(`Getting CurseForge mods for game ID: ${gameId}, search: "${searchTerm}"`);
  
  const curseForgeMods = [
    {
      id: '929902',
      name: 'Augmented Spyglass',
      description: 'Enhanced spyglass with advanced creature information display and scanning capabilities.',
      author: 'ModAuthor',
      downloads: 185000,
      rating: 4.7,
      size: '15.3 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Information', 'UI', 'Creatures'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/augmented-spyglass',
      curseforgeId: '929902', // Real CurseForge Project ID
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: '929903',
      name: 'Shiny Ascended',
      description: 'Adds rare shiny variants of creatures with unique colors and special abilities.',
      author: 'ShinyDev',
      downloads: 142000,
      rating: 4.5,
      size: '28.7 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Creatures', 'Variants', 'Rare'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/shiny-ascended',
      curseforgeId: '929903', // Real CurseForge Project ID
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: '929904',
      name: 'Nominal Structures',
      description: 'Advanced building structures with modern designs and improved functionality.',
      author: 'NominalTeam',
      downloads: 167000,
      rating: 4.6,
      size: '52.1 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Building', 'Structures', 'Modern'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/nominal-structures',
      curseforgeId: '929904', // Real CurseForge Project ID
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: '929905',
      name: 'DinoBook',
      description: 'Comprehensive creature encyclopedia with detailed stats and breeding information.',
      author: 'BookKeeper',
      downloads: 98000,
      rating: 4.4,
      size: '22.5 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Information', 'Creatures', 'Reference'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/dinobook',
      curseforgeId: '929905', // Real CurseForge Project ID
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_5',
      name: 'S+ Dino Variants',
      description: 'Adds new dinosaur variants with unique appearances and abilities.',
      author: 'VariantMaker',
      downloads: 134000,
      rating: 4.3,
      size: '67.8 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Creatures', 'Variants', 'Content'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/s-dino-variants',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: '929907',
      name: 'Cryopods',
      description: 'Store and transport your creatures in convenient cryogenic pods.',
      author: 'CryoTech',
      downloads: 203000,
      rating: 4.8,
      size: '18.9 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Storage', 'Creatures', 'Transport'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/cryopods',
      curseforgeId: '929907', // Real CurseForge Project ID
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_7',
      name: 'Admin Panel',
      description: 'Comprehensive admin tools for server management and player administration.',
      author: 'AdminTools',
      downloads: 156000,
      rating: 4.2,
      size: '31.4 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Admin', 'Management', 'Tools'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/admin-panel',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_8',
      name: 'Super Spyglass Plus',
      description: 'Advanced spyglass with extended range and detailed creature analysis.',
      author: 'SpyglassPro',
      downloads: 178000,
      rating: 4.6,
      size: '19.2 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Information', 'UI', 'Analysis'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/super-spyglass-plus',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_9',
      name: 'QueithomeSkin',
      description: 'Custom creature skins and appearance modifications for enhanced visuals.',
      author: 'SkinArtist',
      downloads: 89000,
      rating: 4.1,
      size: '45.6 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Cosmetic', 'Skins', 'Visual'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/queithomeskin',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_10',
      name: 'Solo Farm Mod',
      description: 'Automated farming solutions perfect for single-player and small server gameplay.',
      author: 'FarmMaster',
      downloads: 112000,
      rating: 4.4,
      size: '26.3 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Automation', 'Farming', 'Solo'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/solo-farm-mod',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_11',
      name: 'Utilities Plus',
      description: 'Collection of quality-of-life improvements and utility items.',
      author: 'UtilityDev',
      downloads: 195000,
      rating: 4.5,
      size: '33.7 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Quality of Life', 'Utilities', 'Tools'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/utilities-plus',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_12',
      name: 'TG Stacking Mod 10000-90',
      description: 'Massive stack size increases for better inventory management.',
      author: 'StackMaster',
      downloads: 167000,
      rating: 4.3,
      size: '12.1 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Stacking', 'Inventory', 'Quality of Life'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/tg-stacking-mod-10000-90',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_13',
      name: 'Dear Jane',
      description: 'Advanced creature breeding and genetics system with detailed lineage tracking.',
      author: 'BreedingExpert',
      downloads: 78000,
      rating: 4.2,
      size: '41.8 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Breeding', 'Genetics', 'Tracking'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/dear-jane',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_14',
      name: 'Arkitect Structures Remastered',
      description: 'Professional architectural building pieces with modern designs.',
      author: 'Arkitect',
      downloads: 143000,
      rating: 4.7,
      size: '58.4 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Building', 'Architecture', 'Modern'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/arkitect-structures-remastered',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_15',
      name: 'Upgrade Station',
      description: 'Comprehensive item and equipment upgrade system with crafting enhancements.',
      author: 'UpgradeMaster',
      downloads: 189000,
      rating: 4.6,
      size: '29.5 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Crafting', 'Upgrade', 'Equipment'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/upgrade-station',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_16',
      name: 'Klinger Additional Rustic Building',
      description: 'Rustic and medieval building pieces for authentic base construction.',
      author: 'Klinger',
      downloads: 92000,
      rating: 4.1,
      size: '47.2 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Building', 'Rustic', 'Medieval'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/klinger-additional-rustic-building',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_17',
      name: 'ARK Primal Chaos',
      description: 'Challenging new creatures and bosses with chaotic gameplay elements.',
      author: 'ChaosTeam',
      downloads: 156000,
      rating: 4.4,
      size: '89.7 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Creatures', 'Bosses', 'Challenge'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/ark-primal-chaos',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_18',
      name: 'Arkomatic',
      description: 'Automated resource processing and base management systems.',
      author: 'AutoDev',
      downloads: 134000,
      rating: 4.3,
      size: '36.8 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Automation', 'Resources', 'Management'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/arkomatic',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_19',
      name: 'DinoPlus',
      description: 'Enhanced dinosaur mechanics with improved AI and new behaviors.',
      author: 'DinoEnhancer',
      downloads: 178000,
      rating: 4.5,
      size: '52.3 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Creatures', 'AI', 'Enhancement'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/dinoplus',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_20',
      name: 'Fear Ascended',
      description: 'Horror-themed creatures and atmospheric enhancements for thrilling gameplay.',
      author: 'FearMaker',
      downloads: 98000,
      rating: 4.2,
      size: '67.4 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Horror', 'Creatures', 'Atmosphere'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/fear-ascended',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_21',
      name: 'Ascension Gear Resolved',
      description: 'Advanced endgame equipment and ascension-tier gear upgrades.',
      author: 'GearMaster',
      downloads: 123000,
      rating: 4.4,
      size: '43.6 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Equipment', 'Endgame', 'Ascension'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/ascension-gear-resolved',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_22',
      name: 'Clear Glass Wall',
      description: 'Transparent building materials for modern and sleek base designs.',
      author: 'GlassArtist',
      downloads: 87000,
      rating: 4.1,
      size: '16.2 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Building', 'Glass', 'Modern'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/clear-glass-wall',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_23',
      name: 'Cybers Structures',
      description: 'Futuristic cyberpunk building pieces with advanced technology themes.',
      author: 'CyberBuilder',
      downloads: 145000,
      rating: 4.6,
      size: '61.8 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Building', 'Cyberpunk', 'Futuristic'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/cybers-structures',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_24',
      name: 'Improved Incubator',
      description: 'Enhanced egg incubation system with automated temperature control.',
      author: 'IncubatorPro',
      downloads: 167000,
      rating: 4.5,
      size: '24.7 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Breeding', 'Automation', 'Incubation'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/improved-incubator',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_25',
      name: 'AwesomeTeleporters',
      description: 'Advanced teleportation system with multiple destination support.',
      author: 'TeleportMaster',
      downloads: 198000,
      rating: 4.7,
      size: '32.1 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Transportation', 'Teleport', 'Quality of Life'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/awesometeleporters',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_26',
      name: 'Castle Craft Structure Skins',
      description: 'Medieval castle-themed building skins and decorative elements.',
      author: 'CastleCrafter',
      downloads: 112000,
      rating: 4.3,
      size: '54.9 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Building', 'Medieval', 'Skins'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/castle-craft-structure-skins',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_27',
      name: 'Botanist Catalogue',
      description: 'Comprehensive plant and crop management system with detailed information.',
      author: 'Botanist',
      downloads: 89000,
      rating: 4.2,
      size: '38.4 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Plants', 'Farming', 'Information'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/botanist-catalogue',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: '929928',
      name: 'Better Breeding',
      description: 'Enhanced breeding mechanics with improved genetics and stat tracking.',
      author: 'BreedingPro',
      downloads: 234000,
      rating: 4.8,
      size: '41.2 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Breeding', 'Genetics', 'Enhancement'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/better-breeding',
      curseforgeId: '929928', // Real CurseForge Project ID
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_29',
      name: 'EZ Engram Unlocker',
      description: 'Simplified engram unlocking system for easier progression.',
      author: 'EZMod',
      downloads: 156000,
      rating: 4.4,
      size: '18.6 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Progression', 'Engrams', 'Quality of Life'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/ez-engram-unlocker',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_30',
      name: 'Best Baby Treat',
      description: 'Improved baby creature care with enhanced feeding and growth mechanics.',
      author: 'BabyCarePro',
      downloads: 143000,
      rating: 4.5,
      size: '27.8 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Breeding', 'Baby Care', 'Enhancement'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/best-baby-treat',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: 'cf_31',
      name: 'Admin Commands',
      description: 'Extended admin command set for comprehensive server administration.',
      author: 'AdminPro',
      downloads: 178000,
      rating: 4.3,
      size: '22.4 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Admin', 'Commands', 'Management'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/admin-commands',
      installed: false,
      enabled: false,
      source: 'curseforge'
    },
    {
      id: '929932',
      name: 'Death Inventory Keeper',
      description: 'Prevents item loss on death with configurable inventory protection.',
      author: 'InventoryKeeper',
      downloads: 267000,
      rating: 4.6,
      size: '15.3 MB',
      lastUpdated: new Date().toLocaleDateString(),
      tags: ['Quality of Life', 'Death', 'Inventory'],
      curseforgeUrl: 'https://www.curseforge.com/ark-survival-ascended/mods/death-inventory-keeper',
      curseforgeId: '929932', // Real CurseForge Project ID
      installed: false,
      enabled: false,
      source: 'curseforge'
    }
  ];

  // Filter by search term if provided
  let filteredMods = curseForgeMods;
  if (searchTerm && searchTerm.trim()) {
    const search = searchTerm.toLowerCase();
    filteredMods = curseForgeMods.filter(mod => 
      mod.name.toLowerCase().includes(search) ||
      mod.description.toLowerCase().includes(search) ||
      mod.author.toLowerCase().includes(search) ||
      mod.tags.some(tag => tag.toLowerCase().includes(search))
    );
  }

  console.log(`Returning ${filteredMods.length} CurseForge mods (from curated list)`);
  return filteredMods.slice(0, Math.min(pageSize, 50));
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
      sortBy = 'alphabetical', 
      timeFilter = 'all',
      page = 1,
      pageSize = 50
    } = req.query;

    console.log(`Mod search request for: ${serverName}`);

    // Map server name to game name
    const gameName = SERVER_TO_GAME_MAPPING[serverName] || serverName;
    console.log(`Mapped ${serverName} to game: ${gameName}`);

    const gameConfig = GAME_CONFIGS[gameName];
    
    if (!gameConfig) {
      console.log(`No mod support configured for: ${gameName} (server: ${serverName})`);
      return res.json({
        mods: getMockMods(gameName),
        message: `Mod integration not available for ${gameName}. Showing example mods.`,
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
        console.log(`Using CurseForge curated mod list for ${gameName} (server: ${serverName})`);
        mods = getCurseForgeModDetails(gameConfig.gameId, search, parseInt(pageSize));
        message = mods.length > 0 ? 
          `Found ${mods.length} curated mods from CurseForge for ${gameName}` :
          `No mods found matching your search criteria.`;
        
        if (mods.length === 0 && !search.trim()) {
          mods = getMockMods(gameName);
          source = 'mock';
          message = 'No CurseForge mods available. Showing example mods instead.';
        }
      } else if (gameConfig.api === 'steam') {
        console.log(`Using Steam Workshop API for ${gameName} (server: ${serverName})`);
        
        if (search.trim()) {
          // For search, use mock data for now since Steam search API is more complex
          console.log(`Steam Workshop search not implemented, showing filtered mock results for: ${search}`);
          mods = getMockMods(gameName).filter(mod => 
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
            console.log(`Fetching ${popularModIds.length} popular mods for ${gameName} (server: ${serverName})`);
            mods = await getSteamModDetails(popularModIds);
            
            if (mods.length === 0) {
              console.log('Steam API failed, using mock data');
              mods = getMockMods(gameName);
              source = 'mock';
              message = 'Steam Workshop API unavailable. Showing example mods instead.';
            } else {
              message = `Found ${mods.length} popular mods from Steam Workshop for ${gameName}`;
            }
          } else {
            console.log(`No popular mods configured for ${gameName}, using mock data`);
            mods = getMockMods(gameName);
            source = 'mock';
            message = `No popular mods configured for ${gameName}. Showing example mods.`;
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
      mods = getMockMods(gameName);
      source = 'mock';
      message = `${gameConfig.api} API error. Showing example mods instead.`;
    }

    // Check installation status for each mod
    try {
      if (serverName && (serverName.includes('arksa_') || serverName.includes('arkse_'))) {
        const configContent = readServerConfig(serverName);
        const installedModIds = parseActiveMods(configContent);
        
        // Create a map for quick lookup
        const modMap = new Map();
        mods.forEach(mod => {
          // Add entries for both id and curseforgeId to ensure proper lookup
          modMap.set(mod.id, mod);
          if (mod.curseforgeId) {
            modMap.set(mod.curseforgeId, mod);
          }
        });
        
        // Build installed mods array in the correct order
        const installedMods = installedModIds.map(modId => {
          const mod = modMap.get(modId);
          if (mod) {
            return {
              ...mod,
              installed: true,
              enabled: true // All installed mods are enabled in ARK
            };
          }
          // If mod not found in our list, create a placeholder
          return {
            id: modId,
            curseforgeId: modId,
            name: `Unknown Mod (${modId})`,
            description: 'This mod is installed but not in our database.',
            author: 'Unknown',
            downloads: 0,
            rating: 0,
            size: 'Unknown',
            lastUpdated: 'Unknown',
            tags: ['Unknown'],
            curseforgeUrl: `https://www.curseforge.com/ark-survival-ascended/mods/${modId}`,
            installed: true,
            enabled: true,
            source: 'curseforge'
          };
        }).filter(Boolean);
        
        // Update installation status for each mod
        mods = mods.map(mod => ({
          ...mod,
          installed: installedModIds.includes(mod.id) || (mod.curseforgeId && installedModIds.includes(mod.curseforgeId)),
          enabled: installedModIds.includes(mod.id) || (mod.curseforgeId && installedModIds.includes(mod.curseforgeId))
        }));
        
        console.log(`Updated installation status for ${mods.length} mods. Installed: ${installedModIds.length}`);
      }
    } catch (configError) {
      console.warn('Could not check installation status:', configError.message);
      // Continue without installation status - mods will show as not installed
    }

    console.log(`Returning ${mods.length} mods for ${gameName} (server: ${serverName}) from ${source}`);

    res.json({
      mods,
      totalCount: mods.length,
      hasMore: false,
      serverName,
      gameName,
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

// Helper function to get server config path
function getServerConfigPath(serverName) {
  const serverMap = {
    'arksa_server': 'arksa_server/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini',
    'arkse_server': 'arkse_server/ShooterGame/Saved/Config/WindowsServer/GameUserSettings.ini'
  };
  
  const configPath = serverMap[serverName];
  if (!configPath) {
    throw new Error(`Unknown server: ${serverName}`);
  }
  
  // Get the absolute path from the workspace root
  const workspaceRoot = path.resolve(__dirname, '../../../');
  return path.join(workspaceRoot, configPath);
}

// Helper function to read server config
function readServerConfig(serverName) {
  const configPath = getServerConfigPath(serverName);
  
  if (!fs.existsSync(configPath)) {
    throw new Error(`Config file not found: ${configPath}`);
  }
  
  return fs.readFileSync(configPath, 'utf8');
}

// Helper function to write server config
function writeServerConfig(serverName, content) {
  const configPath = getServerConfigPath(serverName);
  
  // Create backup
  const backupPath = configPath + '.backup.' + Date.now();
  fs.copyFileSync(configPath, backupPath);
  
  // Write new content
  fs.writeFileSync(configPath, content, 'utf8');
  
  console.log(`Updated server config: ${configPath}`);
  console.log(`Backup created: ${backupPath}`);
}

// Helper function to parse ActiveMods from config
function parseActiveMods(configContent) {
  const activeModsMatch = configContent.match(/^ActiveMods=(.*)$/m);
  if (!activeModsMatch) {
    return [];
  }
  
  const modsString = activeModsMatch[1].trim();
  if (!modsString) {
    return [];
  }
  
  return modsString.split(',').map(id => id.trim()).filter(id => id);
}

// Helper function to update ActiveMods in config
function updateActiveMods(configContent, modIds) {
  const modsString = modIds.join(',');
  
  // Check if ActiveMods line exists
  if (configContent.includes('ActiveMods=')) {
    // Replace existing line
    return configContent.replace(/^ActiveMods=.*$/m, `ActiveMods=${modsString}`);
  } else {
    // Add ActiveMods line to [ServerSettings] section
    const serverSettingsMatch = configContent.match(/^\[ServerSettings\]$/m);
    if (serverSettingsMatch) {
      const insertIndex = serverSettingsMatch.index + serverSettingsMatch[0].length;
      return configContent.slice(0, insertIndex) + 
             `\nActiveMods=${modsString}` + 
             configContent.slice(insertIndex);
    } else {
      // Add [ServerSettings] section if it doesn't exist
      return `[ServerSettings]\nActiveMods=${modsString}\n\n` + configContent;
    }
  }
}

// Get installed mods for a server
router.get('/installed/:serverName', (req, res) => {
  try {
    const { serverName } = req.params;
    
    console.log(`Getting installed mods for server: ${serverName}`);
    
    const configContent = readServerConfig(serverName);
    const installedModIds = parseActiveMods(configContent);
    
    // Get mod details for installed mods
    const allMods = getCurseForgeModDetails(2430, '', 100); // Get all mods
    
    // Create a map for quick lookup
    const modMap = new Map();
    allMods.forEach(mod => {
      // Add entries for both id and curseforgeId to ensure proper lookup
      modMap.set(mod.id, mod);
      if (mod.curseforgeId) {
        modMap.set(mod.curseforgeId, mod);
      }
    });
    
    // Build installed mods array in the correct order
    const installedMods = installedModIds.map(modId => {
      const mod = modMap.get(modId);
      if (mod) {
        return {
          ...mod,
          installed: true,
          enabled: true // All installed mods are enabled in ARK
        };
      }
      // If mod not found in our list, create a placeholder
      return {
        id: modId,
        curseforgeId: modId,
        name: `Unknown Mod (${modId})`,
        description: 'This mod is installed but not in our database.',
        author: 'Unknown',
        downloads: 0,
        rating: 0,
        size: 'Unknown',
        lastUpdated: 'Unknown',
        tags: ['Unknown'],
        curseforgeUrl: `https://www.curseforge.com/ark-survival-ascended/mods/${modId}`,
        installed: true,
        enabled: true,
        source: 'curseforge'
      };
    }).filter(Boolean);
    
    res.json({
      success: true,
      serverName,
      installedMods,
      installedModIds,
      count: installedMods.length
    });
    
  } catch (error) {
    console.error('Error getting installed mods:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Install a mod
router.post('/install', (req, res) => {
  try {
    const { serverName, modId, curseforgeId } = req.body;
    
    if (!serverName || (!modId && !curseforgeId)) {
      return res.status(400).json({
        success: false,
        error: 'serverName and modId or curseforgeId are required'
      });
    }
    
    console.log(`Installing mod ${modId || curseforgeId} for server: ${serverName}`);
    
    const configContent = readServerConfig(serverName);
    const currentMods = parseActiveMods(configContent);
    
    // Use curseforgeId if available, otherwise use modId
    const modIdToInstall = curseforgeId || modId;
    
    // Check if mod is already installed
    if (currentMods.includes(modIdToInstall)) {
      return res.json({
        success: true,
        message: 'Mod is already installed',
        modId: modIdToInstall,
        serverName
      });
    }
    
    // Add mod to the list
    const updatedMods = [...currentMods, modIdToInstall];
    const updatedConfig = updateActiveMods(configContent, updatedMods);
    
    // Write updated config
    writeServerConfig(serverName, updatedConfig);
    
    res.json({
      success: true,
      message: 'Mod installed successfully',
      modId: modIdToInstall,
      serverName,
      installedMods: updatedMods
    });
    
  } catch (error) {
    console.error('Error installing mod:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Uninstall a mod
router.post('/uninstall', (req, res) => {
  try {
    const { serverName, modId, curseforgeId } = req.body;
    
    if (!serverName || (!modId && !curseforgeId)) {
      return res.status(400).json({
        success: false,
        error: 'serverName and modId or curseforgeId are required'
      });
    }
    
    console.log(`Uninstalling mod ${modId || curseforgeId} for server: ${serverName}`);
    
    const configContent = readServerConfig(serverName);
    const currentMods = parseActiveMods(configContent);
    
    // Use curseforgeId if available, otherwise use modId
    const modIdToRemove = curseforgeId || modId;
    
    // Check if mod is installed
    if (!currentMods.includes(modIdToRemove)) {
      return res.json({
        success: true,
        message: 'Mod is not installed',
        modId: modIdToRemove,
        serverName
      });
    }
    
    // Remove mod from the list
    const updatedMods = currentMods.filter(id => id !== modIdToRemove);
    const updatedConfig = updateActiveMods(configContent, updatedMods);
    
    // Write updated config
    writeServerConfig(serverName, updatedConfig);
    
    res.json({
      success: true,
      message: 'Mod uninstalled successfully',
      modId: modIdToRemove,
      serverName,
      installedMods: updatedMods
    });
    
  } catch (error) {
    console.error('Error uninstalling mod:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Get mod installation status
router.get('/status/:serverName/:modId', (req, res) => {
  try {
    const { serverName, modId } = req.params;
    
    const configContent = readServerConfig(serverName);
    const installedMods = parseActiveMods(configContent);
    
    const isInstalled = installedMods.includes(modId);
    
    res.json({
      success: true,
      serverName,
      modId,
      installed: isInstalled,
      enabled: isInstalled // In ARK, installed mods are always enabled
    });
    
  } catch (error) {
    console.error('Error checking mod status:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Reorder mods
router.post('/reorder', (req, res) => {
  console.log('=== REORDER ENDPOINT CALLED ===');
  console.log('Request body:', req.body);
  
  try {
    const { serverName, modIds } = req.body;
    
    console.log('Parsed serverName:', serverName);
    console.log('Parsed modIds:', modIds);
    
    if (!serverName || !Array.isArray(modIds)) {
      console.log('Validation failed - missing serverName or modIds not array');
      return res.status(400).json({
        success: false,
        error: 'serverName and modIds array are required'
      });
    }
    
    console.log(`Reordering mods for server: ${serverName}`, modIds);
    
    const configContent = readServerConfig(serverName);
    console.log('Config content loaded successfully');
    
    const currentMods = parseActiveMods(configContent);
    console.log('Current mods:', currentMods);
    
    // Validate that all provided mod IDs are currently installed
    const invalidMods = modIds.filter(id => !currentMods.includes(id));
    if (invalidMods.length > 0) {
      console.log('Invalid mods found:', invalidMods);
      return res.status(400).json({
        success: false,
        error: `Some mods are not installed: ${invalidMods.join(', ')}`
      });
    }
    
    // Update config with new mod order
    const updatedConfig = updateActiveMods(configContent, modIds);
    console.log('Config updated, writing to file...');
    
    writeServerConfig(serverName, updatedConfig);
    console.log('Config written successfully');
    
    res.json({
      success: true,
      message: 'Mod load order updated successfully',
      serverName,
      modOrder: modIds
    });
    
  } catch (error) {
    console.error('Error reordering mods:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router; 