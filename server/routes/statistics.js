const express = require('express');
const router = express.Router();
const { authenticateToken } = require('../middleware/auth');
const { db } = require('../database/init');
const cloudnetApi = require('../services/cloudnetApi');

// Mock data for development - replace with real data sources
const generateMockPlayerStats = () => {
  const players = [];
  const usernames = ['Steve', 'Alex', 'Notch', 'Herobrine', 'Jeb_', 'Dinnerbone', 'Grumm', 'Deadmau5'];
  
  for (let i = 0; i < 20; i++) {
    const uuid = `${Math.random().toString(36).substr(2, 8)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 4)}-${Math.random().toString(36).substr(2, 12)}`;
    const username = usernames[Math.floor(Math.random() * usernames.length)] + (i > usernames.length ? i : '');
    const totalPlaytime = Math.floor(Math.random() * 10000) + 100; // minutes
    const connectionCount = Math.floor(Math.random() * 50) + 1;
    const status = Math.random() > 0.7 ? 'online' : 'offline';
    
    players.push({
      uuid,
      username,
      totalPlaytime,
      serverPlaytime: {
        'lobby-1': Math.floor(totalPlaytime * 0.3),
        'survival-1': Math.floor(totalPlaytime * 0.4),
        'creative-1': Math.floor(totalPlaytime * 0.3)
      },
      connectionCount,
      lastSeen: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toISOString(),
      status
    });
  }
  
  return players;
};

const generateMockServerStats = () => {
  return [
    {
      name: 'lobby-1',
      currentPlayers: Math.floor(Math.random() * 50),
      maxPlayers: 100,
      totalConnections: Math.floor(Math.random() * 10000) + 1000,
      uptime: Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000
    },
    {
      name: 'survival-1',
      currentPlayers: Math.floor(Math.random() * 30),
      maxPlayers: 50,
      totalConnections: Math.floor(Math.random() * 8000) + 800,
      uptime: Date.now() - Math.random() * 5 * 24 * 60 * 60 * 1000
    },
    {
      name: 'creative-1',
      currentPlayers: Math.floor(Math.random() * 20),
      maxPlayers: 40,
      totalConnections: Math.floor(Math.random() * 5000) + 500,
      uptime: Date.now() - Math.random() * 3 * 24 * 60 * 60 * 1000
    },
    {
      name: 'minigames-1',
      currentPlayers: Math.floor(Math.random() * 25),
      maxPlayers: 60,
      totalConnections: Math.floor(Math.random() * 6000) + 600,
      uptime: Date.now() - Math.random() * 4 * 24 * 60 * 60 * 1000
    }
  ];
};

// Get player statistics
router.get('/players', authenticateToken, async (req, res) => {
  try {
    // For now, return mock data. In production, this would query your database
    // with player data from CloudNet or your own tracking system
    const playerStats = generateMockPlayerStats();
    res.json(playerStats);
  } catch (error) {
    console.error('Error fetching player statistics:', error);
    res.status(500).json({ error: 'Failed to fetch player statistics' });
  }
});

// Get server statistics
router.get('/servers', authenticateToken, async (req, res) => {
  try {
    // Try to get real server data from CloudNet API
    let serverStats;
    try {
      const servers = await cloudnetApi.getServers();
      serverStats = servers.map(server => ({
        name: server.name,
        currentPlayers: server.players || 0,
        maxPlayers: server.maxPlayers || 0,
        totalConnections: Math.floor(Math.random() * 5000) + 500, // This would come from your tracking
        uptime: Date.now() - (server.creationTime || Date.now())
      }));
    } catch (cloudnetError) {
      console.log('CloudNet API not available, using mock data');
      serverStats = generateMockServerStats();
    }
    
    res.json(serverStats);
  } catch (error) {
    console.error('Error fetching server statistics:', error);
    res.status(500).json({ error: 'Failed to fetch server statistics' });
  }
});

// Get global statistics
router.get('/global', authenticateToken, async (req, res) => {
  try {
    const playerStats = generateMockPlayerStats();
    const serverStats = generateMockServerStats();
    
    const globalStats = {
      totalPlayers: playerStats.length,
      onlinePlayers: playerStats.filter(p => p.status === 'online').length,
      totalConnections: playerStats.reduce((sum, p) => sum + p.connectionCount, 0),
      averagePlaytime: Math.round(playerStats.reduce((sum, p) => sum + p.totalPlaytime, 0) / playerStats.length),
      topServers: serverStats
        .sort((a, b) => b.currentPlayers - a.currentPlayers)
        .slice(0, 5)
    };
    
    res.json(globalStats);
  } catch (error) {
    console.error('Error fetching global statistics:', error);
    res.status(500).json({ error: 'Failed to fetch global statistics' });
  }
});

// Get playtime trends (for future expansion)
router.get('/trends', authenticateToken, async (req, res) => {
  try {
    // Generate trend data for the last 7 days
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      trends.push({
        date: date.toISOString().split('T')[0],
        players: Math.floor(Math.random() * 100) + 50,
        playtime: Math.floor(Math.random() * 500) + 200
      });
    }
    
    res.json(trends);
  } catch (error) {
    console.error('Error fetching trend statistics:', error);
    res.status(500).json({ error: 'Failed to fetch trend statistics' });
  }
});

module.exports = router;