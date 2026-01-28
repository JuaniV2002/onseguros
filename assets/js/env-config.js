/**
 * Environment Configuration Loader
 * Loads environment variables from .env file for client-side use
 */

class EnvConfig {
    constructor() {
        this.config = {};
        this.loaded = false;
    }

    /**
     * Load environment variables from .env file
     */
    async load() {
        if (this.loaded) {
            return this.config;
        }

        try {
            const response = await fetch('/.env');

            if (!response.ok) {
                throw new Error('Failed to load .env file');
            }

            const envText = await response.text();
            this.parseEnv(envText);
            this.loaded = true;

            return this.config;
        } catch (error) {
            console.error('Error loading environment variables:', error);
            throw error;
        }
    }

    /**
     * Parse .env file content
     */
    parseEnv(envText) {
        const lines = envText.split('\n');

        for (const line of lines) {
            // Skip empty lines and comments
            if (!line.trim() || line.trim().startsWith('#')) {
                continue;
            }

            // Parse KEY=VALUE
            const equalIndex = line.indexOf('=');
            if (equalIndex === -1) {
                continue;
            }

            const key = line.substring(0, equalIndex).trim();
            const value = line.substring(equalIndex + 1).trim();

            if (key) {
                this.config[key] = value;
            }
        }
    }

    /**
     * Get a configuration value
     */
    get(key) {
        if (!this.loaded) {
            console.warn('Environment variables not loaded yet. Call load() first.');
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
