/**
 * Dynamic Sitemap Generator for OnSeguros
 * Reads blog posts from posts.json and generates sitemap.xml
 * 
 * Usage: node generate-sitemap.js
 * 
 * This script should be run:
 * - After publishing a new blog post
 * - Manually to update the sitemap
 * - As part of a build/deploy process
 */

const fs = require('fs');
const path = require('path');

// Configuration
const CONFIG = {
    baseUrl: 'https://www.onseguros.net',
    postsJsonPath: path.join(__dirname, 'blog/data/posts.json'),
    sitemapPath: path.join(__dirname, 'sitemap.xml'),
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
};

/**
 * Format date to ISO format (YYYY-MM-DD)
 */
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
}

/**
 * Get current date in ISO format
 */
function getCurrentDate() {
    return formatDate(new Date());
}

/**
 * Generate XML for a URL entry
 */
function generateUrlEntry(loc, lastmod, changefreq, priority) {
    return `    <url>
        <loc>${CONFIG.baseUrl}${loc}</loc>
        <lastmod>${lastmod}</lastmod>
        <changefreq>${changefreq}</changefreq>
        <priority>${priority}</priority>
    </url>`;
}

/**
 * Read blog posts from posts.json
 */
function readBlogPosts() {
    try {
        const data = fs.readFileSync(CONFIG.postsJsonPath, 'utf8');
        const json = JSON.parse(data);
        return json.posts || [];
    } catch (error) {
        console.error('Error reading posts.json:', error.message);
        return [];
    }
}

/**
 * Generate complete sitemap XML
 */
function generateSitemap() {
    const posts = readBlogPosts();
    
    let xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"
        xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
        xsi:schemaLocation="http://www.sitemaps.org/schemas/sitemap/0.9
        http://www.sitemaps.org/schemas/sitemap/0.9/sitemap.xsd">

    <!-- Página Principal -->
`;

    // Add static pages
    CONFIG.staticPages.forEach(page => {
        const lastmod = page.loc === '/blog/' ? getCurrentDate() : '2025-11-12';
        xml += generateUrlEntry(page.loc, lastmod, page.changefreq, page.priority) + '\n';
    });

    // Add blog posts
    if (posts.length > 0) {
        xml += '\n    <!-- Blog Posts -->\n';
        
        posts.forEach(post => {
            const postUrl = `/blog/post.html?post=${post.slug}`;
            const lastmod = formatDate(post.publishDate);
            xml += generateUrlEntry(postUrl, lastmod, 'monthly', '0.7') + '\n';
        });
    }

    xml += '\n</urlset>';
    
    return xml;
}

/**
 * Write sitemap to file
 */
function writeSitemap(xml) {
    try {
        fs.writeFileSync(CONFIG.sitemapPath, xml, 'utf8');
        console.log('✅ Sitemap generated successfully!');
        console.log(`📍 Location: ${CONFIG.sitemapPath}`);
        
        const posts = readBlogPosts();
        console.log(`📝 Total URLs: ${CONFIG.staticPages.length + posts.length}`);
        console.log(`   - Static pages: ${CONFIG.staticPages.length}`);
        console.log(`   - Blog posts: ${posts.length}`);
    } catch (error) {
        console.error('❌ Error writing sitemap:', error.message);
        process.exit(1);
    }
}

/**
 * Main execution
 */
function main() {
    console.log('🚀 Generating sitemap...\n');
    
    const sitemap = generateSitemap();
    writeSitemap(sitemap);
    
    console.log('\n✨ Done!');
}

// Run if executed directly
if (require.main === module) {
    main();
}

module.exports = { generateSitemap, writeSitemap };
