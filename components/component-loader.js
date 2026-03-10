/**
 * Component Loader
 * Loads reusable HTML components (header, footer) into pages
 */

class ComponentLoader {
    /**
     * Load a component from the components directory
     * @param {string} componentName - Name of the component (e.g., 'header', 'footer')
     * @param {string} targetSelector - CSS selector for where to insert the component
     * @param {string} basePath - Base path to components directory (default: 'components/')
     */
    static async loadComponent(componentName, targetSelector, basePath = 'components/') {
        try {
            const componentPath = `${basePath}${componentName}.html?v=2`;
            
            const response = await fetch(componentPath);
            
            if (!response.ok) {
                throw new Error(`Failed to load ${componentName}: ${response.status} ${response.statusText}`);
            }
            
            const html = await response.text();
            const target = document.querySelector(targetSelector);
            
            if (!target) {
                console.warn(`Target selector "${targetSelector}" not found`);
                return;
            }
            
            target.innerHTML = html;
            
            // Dispatch custom event when component is loaded
            document.dispatchEvent(new CustomEvent('componentLoaded', {
                detail: { componentName, targetSelector }
            }));
            
        } catch (error) {
            console.error(`Error loading component ${componentName}:`, error);
        }
    }
    
    /**
     * Load header component
     * @param {string} basePath - Base path to components directory
     */
    static async loadHeader(basePath = 'components/') {
        await this.loadComponent('header', '#header-placeholder', basePath);
    }
    
    /**
     * Load footer component
     * @param {string} basePath - Base path to components directory
     */
    static async loadFooter(basePath = 'components/') {
        await this.loadComponent('footer', '#footer-placeholder', basePath);
    }
    
    /**
     * Load all standard components (header + footer)
     * @param {string} basePath - Base path to components directory
     */
    static async loadAll(basePath = 'components/') {
        await Promise.all([
            this.loadHeader(basePath),
            this.loadFooter(basePath)
        ]);
        
        // Notify that all components are loaded
        document.dispatchEvent(new CustomEvent('allComponentsLoaded'));
    }
}

// Auto-load components when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initComponents);
} else {
    // DOM already loaded
    initComponents();
}

function initComponents() {
    // Determine base path based on current page location
    const currentPath = window.location.pathname;
    let basePath = 'components/';
    
    // Adjust path for pages in subdirectories
    // For deeper nested paths (e.g., /legal/privacidad/)
    if (currentPath.match(/\/legal\/[^/]+\//)) {
        basePath = '../../components/';
    } else if (currentPath.includes('/legal')) {
        basePath = '../components/';
    } else if (currentPath.includes('/faq')) {
        basePath = '../components/';
    } else if (currentPath.includes('/blog')) {
        basePath = '../components/';
    } else if (currentPath.includes('/admin')) {
        basePath = '../components/';
    } else if (currentPath.includes('/cotizar') || currentPath.includes('/agente')) {
        basePath = '../components/';
    } else if (currentPath.includes('/siniestros')) {
        basePath = '../components/';
    } else if (currentPath.includes('/unsubscribe')) {
        basePath = '../components/';
    }
    
    // Load all components
    ComponentLoader.loadAll(basePath);
}

// Export for manual usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
}
