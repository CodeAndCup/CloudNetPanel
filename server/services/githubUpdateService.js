const axios = require('axios');
const fs = require('fs').promises;
const path = require('path');

class GitHubUpdateService {
  constructor() {
    this.repositoryOwner = 'SAOFR-DEV';
    this.repositoryName = 'CloudNetPanel';
    this.currentVersion = '1.0.0'; // This should be read from package.json
    this.apiBaseUrl = 'https://api.github.com';
  }

  async getCurrentVersion() {
    try {
      const packageJsonPath = path.join(__dirname, '../package.json');
      const packageJson = JSON.parse(await fs.readFile(packageJsonPath, 'utf-8'));
      this.currentVersion = packageJson.version;
      return this.currentVersion;
    } catch (error) {
      console.error('Error reading current version:', error);
      return this.currentVersion;
    }
  }

  async getLatestRelease() {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/repos/${this.repositoryOwner}/${this.repositoryName}/releases/latest`,
        {
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CloudNetPanel-UpdateChecker'
          },
          timeout: 10000
        }
      );

      return {
        tagName: response.data.tag_name,
        name: response.data.name,
        body: response.data.body,
        publishedAt: response.data.published_at,
        htmlUrl: response.data.html_url,
        zipballUrl: response.data.zipball_url,
        tarballUrl: response.data.tarball_url,
        assets: response.data.assets.map(asset => ({
          name: asset.name,
          downloadUrl: asset.browser_download_url,
          size: asset.size,
          contentType: asset.content_type
        }))
      };
    } catch (error) {
      if (error.response?.status === 404) {
        throw new Error('No releases found for this repository');
      }
      throw new Error(`Failed to fetch latest release: ${error.message}`);
    }
  }

  async getAllReleases(page = 1, perPage = 10) {
    try {
      const response = await axios.get(
        `${this.apiBaseUrl}/repos/${this.repositoryOwner}/${this.repositoryName}/releases`,
        {
          params: { page, per_page: perPage },
          headers: {
            'Accept': 'application/vnd.github.v3+json',
            'User-Agent': 'CloudNetPanel-UpdateChecker'
          },
          timeout: 10000
        }
      );

      return response.data.map(release => ({
        tagName: release.tag_name,
        name: release.name,
        body: release.body,
        publishedAt: release.published_at,
        htmlUrl: release.html_url,
        prerelease: release.prerelease,
        draft: release.draft
      }));
    } catch (error) {
      throw new Error(`Failed to fetch releases: ${error.message}`);
    }
  }

  compareVersions(version1, version2) {
    // Simple version comparison (assumes semantic versioning)
    const normalize = (v) => {
      return v.replace(/^v/, '').split('.').map(n => parseInt(n, 10));
    };

    const v1Parts = normalize(version1);
    const v2Parts = normalize(version2);
    const maxLength = Math.max(v1Parts.length, v2Parts.length);

    for (let i = 0; i < maxLength; i++) {
      const part1 = v1Parts[i] || 0;
      const part2 = v2Parts[i] || 0;

      if (part1 < part2) return -1;
      if (part1 > part2) return 1;
    }

    return 0;
  }

  async checkForUpdates() {
    try {
      const currentVersion = await this.getCurrentVersion();
      const latestRelease = await this.getLatestRelease();
      
      const hasUpdate = this.compareVersions(currentVersion, latestRelease.tagName) < 0;
      
      return {
        hasUpdate,
        currentVersion,
        latestVersion: latestRelease.tagName,
        latestRelease: hasUpdate ? latestRelease : null
      };
    } catch (error) {
      throw new Error(`Update check failed: ${error.message}`);
    }
  }

  async downloadUpdate(downloadUrl, destinationPath) {
    try {
      const response = await axios.get(downloadUrl, {
        responseType: 'stream',
        timeout: 300000, // 5 minutes timeout for downloads
        headers: {
          'User-Agent': 'CloudNetPanel-UpdateChecker'
        }
      });

      const writer = require('fs').createWriteStream(destinationPath);
      response.data.pipe(writer);

      return new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
      });
    } catch (error) {
      throw new Error(`Failed to download update: ${error.message}`);
    }
  }

  async getUpdateInfo() {
    try {
      const updateCheck = await this.checkForUpdates();
      
      if (!updateCheck.hasUpdate) {
        return {
          upToDate: true,
          currentVersion: updateCheck.currentVersion,
          message: 'You are running the latest version'
        };
      }

      return {
        upToDate: false,
        currentVersion: updateCheck.currentVersion,
        latestVersion: updateCheck.latestVersion,
        releaseNotes: updateCheck.latestRelease.body,
        publishedAt: updateCheck.latestRelease.publishedAt,
        downloadUrl: updateCheck.latestRelease.htmlUrl,
        directDownloadUrl: updateCheck.latestRelease.zipballUrl
      };
    } catch (error) {
      return {
        error: true,
        message: error.message,
        currentVersion: await this.getCurrentVersion()
      };
    }
  }
}

module.exports = new GitHubUpdateService();