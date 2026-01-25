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
            const componentPath = `${basePath}${componentName}.html`;
            console.log(`Loading component: ${componentPath}`);
            
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
            console.log(`Component ${componentName} loaded successfully`);
            
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
        console.log('Loading all components with basePath:', basePath);
        await Promise.all([
            this.loadHeader(basePath),
            this.loadFooter(basePath)
        ]);
        
        // Notify that all components are loaded
        console.log('All components loaded, dispatching event');
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
    console.log('Initializing components...');
    console.log('Current path:', window.location.pathname);
    console.log('Current href:', window.location.href);
    
    // Determine base path based on current page location
    const currentPath = window.location.pathname;
    const currentHref = window.location.href;
    
    // Use absolute path from root to avoid relative path issues
    let basePath = '/components/';
    
    // For local file:// development, use relative paths
    if (window.location.protocol === 'file:') {
        if (currentPath.includes('/legal') || currentPath.includes('/faq') || 
            currentPath.includes('/blog') || currentPath.includes('/admin')) {
            basePath = '../components/';
        } else {
            basePath = 'components/';
        }
    }
    
    console.log('Using basePath:', basePath);
    
    // Load all components
    ComponentLoader.loadAll(basePath);
}

// Export for manual usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ComponentLoader;
}
