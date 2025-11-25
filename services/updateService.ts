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
        const response = await fetch('https://api.github.com/repos/huanhq99/StreamHub/releases/latest');
        if (!response.ok) {
            throw new Error('Failed to fetch release info');
        }
        
        const data = await response.json();
        const latestVersion = data.tag_name.replace(/^v/, ''); // Remove 'v' prefix if present
        const currentVersion = APP_VERSION;
        
        // Simple version comparison (assumes semantic versioning x.y.z)
        const hasUpdate = compareVersions(latestVersion, currentVersion) > 0;
        
        return {
            hasUpdate,
            latestVersion,
            currentVersion,
            releaseNotes: data.body,
            downloadUrl: data.html_url
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
