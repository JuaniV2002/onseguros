/**
 * Client-side Sitemap Generator for OnSeguros
 * Can be run in browser or Node.js environment
 * 
 * This version fetches posts.json and generates sitemap XML
 * that can be used in Netlify Functions or static builds
 */

const SitemapGenerator = {
    config: {
        baseUrl: 'https://www.onseguros.net',
        postsJsonUrl: '/blog/data/posts.json',
        staticPages: [
            { loc: '/', priority: '1.0', changefreq: 'weekly' },
            { loc: '/index.html', priority: '1.0', changefreq: 'weekly' },
            { loc: '/#inicio', priority: '0.9', changefreq: 'weekly' },
            { loc: '/#nosotros', priority: '0.8', changefreq: 'monthly' },
            { loc: '/#servicios', priority: '0.9', changefreq: 'monthly' },
            { loc: '/#testimonios', priority: '0.7', changefreq: 'monthly' },
            { loc: '/#contacto', priority: '0.8', changefreq: 'monthly' },
            { loc: '/#cotizacion', priority: '0.9', changefreq: 'monthly' },
            { loc: '/faq/faq.html', priority: '0.8', changefreq: 'monthly' },
            { loc: '/blog/', priority: '0.8', changefreq: 'weekly' },
            { loc: '/legal/privacidad.html', priority: '0.3', changefreq: 'yearly' },
            { loc: '/legal/terminos.html', priority: '0.3', changefreq: 'yearly' },
            { loc: '/legal/accesibilidad.html', priority: '0.3', changefreq: 'yearly' }
        ]
    },

    /**
     * Format date to ISO format (YYYY-MM-DD)
     */
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
    },

    /**
     * Get current date in ISO format
     */
    getCurrentDate() {
        return this.formatDate(new Date());
    },

    /**
     * Generate XML for a URL entry
     */
    generateUrlEntry(loc, lastmod, changefreq, priority) {
        return `    <url>
        <loc>${this.config.baseUrl}${loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;
    },

    /**
     * Fetch blog posts from posts.json
     */
    async fetchBlogPosts() {
        try {
            const response = await fetch(this.config.postsJsonUrl);
            if (!response.ok) {
                throw new Error('Failed to fetch posts.json');
            }
            const data = await response.json();
            return data.posts || [];
        } catch (error) {
            console.error('Error fetching posts:', error);
            return [];
        }
    },

    /**
     * Generate complete sitemap XML
     */
    async generate() {
        const posts = await this.fetchBlogPosts();
        
        let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

    <!-- Página Principal -->
`;

        // Add static pages
        this.config.staticPages.forEach(page => {
            const lastmod = page.loc === '/blog/' ? this.getCurrentDate() : '2025-11-12';
            xml += this.generateUrlEntry(page.loc, lastmod, page.changefreq, page.priority) + '\n';
        });

        // Add blog posts
        if (posts.length > 0) {
            xml += '\n    <!-- Blog Posts -->\n';
            
            // Sort by date (newest first)
            const sortedPosts = [...posts].sort((a, b) => 
                new Date(b.publishDate) - new Date(a.publishDate)
            );
            
            sortedPosts.forEach(post => {
                const postUrl = `/blog/post.html?post=${post.slug}`;
                const lastmod = this.formatDate(post.publishDate);
                xml += this.generateUrlEntry(postUrl, lastmod, 'monthly', '0.7') + '\n';
            });
        }

        xml += '\n</urlset>';
        
        return xml;
    },

    /**
     * Generate and download sitemap
     */
    async generateAndDownload() {
        try {
            const xml = await this.generate();
            
            // Create blob and download
            const blob = new Blob([xml], { type: 'application/xml' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = 'sitemap.xml';
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            window.URL.revokeObjectURL(url);
            
            console.log('✅ Sitemap generated and downloaded!');
            return xml;
        } catch (error) {
            console.error('❌ Error generating sitemap:', error);
            throw error;
        }
    },

    /**
     * Log sitemap info
     */
    async info() {
        const posts = await this.fetchBlogPosts();
        console.log('📊 Sitemap Information:');
        console.log(`   - Base URL: ${this.config.baseUrl}`);
        console.log(`   - Static pages: ${this.config.staticPages.length}`);
        console.log(`   - Blog posts: ${posts.length}`);
        console.log(`   - Total URLs: ${this.config.staticPages.length + posts.length}`);
        return {
            baseUrl: this.config.baseUrl,
            staticPages: this.config.staticPages.length,
            blogPosts: posts.length,
            totalUrls: this.config.staticPages.length + posts.length
        };
    }
};

// Export for Node.js if available
if (typeof module !== 'undefined' && module.exports) {
    module.exports = SitemapGenerator;
}

// Make available globally in browser
if (typeof window !== 'undefined') {
    window.SitemapGenerator = SitemapGenerator;
}
