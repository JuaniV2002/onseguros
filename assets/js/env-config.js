/**
 * Environment Configuration Loader
 * Loads environment variables from config.json file
 * Note: Using config.json instead of .env because web servers block access to dotfiles
 */

class EnvConfig {
    constructor() {
        this.config = {};
        this.loaded = false;
    }

    /**
     * Load environment variables from config.json file
     */
    async load() {
        if (this.loaded) {
            return this.config;
        }

        try {
            // Add timestamp to force fresh fetch and bypass browser cache
            const response = await fetch(`/config.json?t=${Date.now()}`, {
                cache: 'no-store',
                headers: {
                    'Pragma': 'no-cache',
                    'Cache-Control': 'no-cache'
                }
            });

            if (!response.ok) {
                throw new Error(`Failed to load config.json: ${response.status} ${response.statusText}`);
            }

            this.config = await response.json();
            this.loaded = true;

            return this.config;
        } catch (error) {
            throw error;
        }
    }

    /**
     * Get a configuration value
     */
    get(key) {
        if (!this.loaded) {
            return undefined;
        }
        return this.config[key];
    }

    /**
     * Get all configuration
     */
    getAll() {
        return { ...this.config };
    }
}

// Create singleton instance
window.envConfig = new EnvConfig();
