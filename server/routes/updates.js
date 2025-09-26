const express = require('express');
const router = express.Router();
const { authenticateToken, requireAdmin } = require('../middleware/auth');
const githubUpdateService = require('../services/githubUpdateService');
const { logActivity } = require('../middleware/activity');
const { URL } = require('url');
// Check for updates (accessible to all authenticated users)
router.get('/check', authenticateToken, async (req, res) => {
  try {
    const updateInfo = await githubUpdateService.getUpdateInfo();
    
    // Log the update check activity
    req.activity = {
      action: 'update_check',
      resource_type: 'system',
      resource_id: 'update_checker',
      details: {
        hasUpdate: !updateInfo.upToDate,
        currentVersion: updateInfo.currentVersion,
        latestVersion: updateInfo.latestVersion || null
      }
    };

    res.json(updateInfo);
  } catch (error) {
    console.error('Error checking for updates:', error);
    res.status(500).json({ 
      error: true, 
      message: 'Failed to check for updates',
      currentVersion: await githubUpdateService.getCurrentVersion()
    });
  }
});

// Get current version
router.get('/version', authenticateToken, async (req, res) => {
  try {
    const currentVersion = await githubUpdateService.getCurrentVersion();
    res.json({ version: currentVersion });
  } catch (error) {
    console.error('Error getting current version:', error);
    res.status(500).json({ error: 'Failed to get current version' });
  }
});

// Get latest release info
router.get('/latest-release', authenticateToken, async (req, res) => {
  try {
    const latestRelease = await githubUpdateService.getLatestRelease();
    res.json(latestRelease);
  } catch (error) {
    console.error('Error getting latest release:', error);
    res.status(500).json({ error: error.message });
  }
});

// Get all releases (paginated)
router.get('/releases', authenticateToken, async (req, res) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const perPage = Math.min(parseInt(req.query.per_page) || 10, 50);
    
    const releases = await githubUpdateService.getAllReleases(page, perPage);
    res.json({
      releases,
      pagination: {
        page,
        per_page: perPage,
        has_more: releases.length === perPage
      }
    });
  } catch (error) {
    console.error('Error getting releases:', error);
    res.status(500).json({ error: error.message });
  }
});

// Download update (admin only - this would be used for automatic updates)
router.post('/download', authenticateToken, requireAdmin, async (req, res) => {
  try {
    const { downloadUrl } = req.body;
    
    if (!downloadUrl) {
      return res.status(400).json({ error: 'Download URL is required' });
    }

    // For security, only allow downloads from GitHub
    let parsedUrl;
    try {
      parsedUrl = new URL(downloadUrl);
    } catch (err) {
      return res.status(400).json({ error: 'Invalid download URL format' });
    }
    const allowedHosts = [
      'github.com',
      'www.github.com',
      'objects.githubusercontent.com'
    ];
    if (!allowedHosts.includes(parsedUrl.host)) {
      return res.status(400).json({ error: 'Download URL must be from github.com' });
    }

    // Log the download attempt
    req.activity = {
      action: 'update_download',
      resource_type: 'system',
      resource_id: 'update_system',
      details: {
        downloadUrl: downloadUrl
      }
    };

    // In a real implementation, this would download and apply the update
    // For now, we'll just return a success response
    res.json({ 
      message: 'Update download initiated',
      note: 'Manual update required - please visit the GitHub releases page to download the latest version'
    });
    
  } catch (error) {
    console.error('Error downloading update:', error);
    res.status(500).json({ error: 'Failed to download update' });
  }
});

// Update settings (admin only)
router.get('/settings', authenticateToken, requireAdmin, (req, res) => {
  try {
    // Return current update settings
    const settings = {
      autoCheckEnabled: true, // This could be stored in database
      checkInterval: 24, // hours
      autoDownloadEnabled: false,
      notificationsEnabled: true,
      repository: {
        owner: 'SAOFR-DEV',
        name: 'CloudNetPanel'
      }
    };
    
    res.json(settings);
  } catch (error) {
    console.error('Error getting update settings:', error);
    res.status(500).json({ error: 'Failed to get update settings' });
  }
});

router.post('/settings', authenticateToken, requireAdmin, (req, res) => {
  try {
    const { autoCheckEnabled, checkInterval, autoDownloadEnabled, notificationsEnabled } = req.body;
    
    // In a real implementation, these would be saved to database
    const settings = {
      autoCheckEnabled: autoCheckEnabled !== undefined ? autoCheckEnabled : true,
      checkInterval: checkInterval || 24,
      autoDownloadEnabled: autoDownloadEnabled || false,
      notificationsEnabled: notificationsEnabled !== undefined ? notificationsEnabled : true
    };

    // Log the settings change
    req.activity = {
      action: 'update_settings_changed',
      resource_type: 'system',
      resource_id: 'update_settings',
      details: settings
    };
    
    res.json({ message: 'Update settings saved', settings });
  } catch (error) {
    console.error('Error saving update settings:', error);
    res.status(500).json({ error: 'Failed to save update settings' });
  }
});

module.exports = router;