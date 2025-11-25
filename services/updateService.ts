import { APP_VERSION } from '../constants';

export interface UpdateInfo {
    hasUpdate: boolean;
    latestVersion: string;
    currentVersion: string;
    releaseNotes: string;
    downloadUrl: string;
}

export const checkForUpdates = async (): Promise<UpdateInfo> => {
    try {
        // Try fetching latest release first
        let data;
        let isTag = false;
        
        const response = await fetch('https://api.github.com/repos/huanhq99/StreamHub/releases/latest');
        
        if (response.ok) {
            data = await response.json();
        } else {
            // Fallback to tags if releases are not found (e.g. only tags exist)
            console.log('Latest release not found, checking tags...');
            const tagsResponse = await fetch('https://api.github.com/repos/huanhq99/StreamHub/tags');
            if (!tagsResponse.ok) {
                throw new Error('Failed to fetch update info');
            }
            const tags = await tagsResponse.json();
            if (tags.length > 0) {
                data = tags[0];
                isTag = true;
            } else {
                throw new Error('No version information found');
            }
        }
        
        const tagName = isTag ? data.name : data.tag_name;
        const latestVersion = tagName.replace(/^v/, ''); // Remove 'v' prefix
        const currentVersion = APP_VERSION;
        
        // Simple version comparison
        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
        
        return {
            hasUpdate,
            latestVersion,
            currentVersion,
            releaseNotes: isTag ? 'No release notes available (Tag only)' : data.body,
            downloadUrl: isTag ? `https://github.com/huanhq99/StreamHub/releases/tag/${tagName}` : data.html_url
        };
    } catch (error) {
        console.error('Update check failed:', error);
        throw error;
    }
};

// Returns 1 if v1 > v2, -1 if v1 < v2, 0 if equal
const compareVersions = (v1: string, v2: string): number => {
    const parts1 = v1.split('.').map(Number);
    const parts2 = v2.split('.').map(Number);
    
    for (let i = 0; i < Math.max(parts1.length, parts2.length); i++) {
        const n1 = parts1[i] || 0;
        const n2 = parts2[i] || 0;
        if (n1 > n2) return 1;
        if (n1 < n2) return -1;
    }
    return 0;
};
