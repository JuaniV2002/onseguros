/**
 * Blog Functionality
 * Handles blog post listing, markdown rendering, and newsletter subscription
 */

/**
 * Generate Blog Post Schema structured data (JSON-LD)
 * @param {Object} post - The blog post object
 */
function generateBlogPostStructuredData(post) {
    console.log('generateBlogPostStructuredData called with post:', post);
    
    if (!post || !post.title) {
        console.log('Invalid post data, returning early');
        return;
    }

    // Remove existing dynamic blog post structured data if present
    const existingScript = document.getElementById('blog-post-dynamic-schema');
    if (existingScript) {
        console.log('Removing existing blog post schema');
        existingScript.remove();
    }

    // Create BlogPosting schema
    const blogSchema = {
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        "headline": post.title,
        "description": post.description,
        "datePublished": post.publish_date,
        "dateModified": post.updated_at || post.publish_date,
        "author": {
            "@type": "Person",
            "name": "Mariano Villanueva",
            "url": "https://www.onseguros.net/"
        },
        "publisher": {
            "@type": "Organization",
            "name": "OnSeguros",
            "url": "https://www.onseguros.net/",
            "logo": {
                "@type": "ImageObject",
                "url": "https://www.onseguros.net/assets/logo.svg"
            }
        },
        "mainEntityOfPage": {
            "@type": "WebPage",
            "@id": `https://www.onseguros.net/blog/post.html?slug=${post.slug}`
        }
    };

    // Create script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'blog-post-dynamic-schema';
    script.textContent = JSON.stringify(blogSchema, null, 2);

    // Inject into head at the end
    document.head.appendChild(script);
    
    console.log('Blog post schema injected:', JSON.stringify(blogSchema, null, 2));
    console.log(`Generated blog post schema for: ${post.title}`);
}

class Blog {
    constructor() {
        this.apiBaseUrl = window.envConfig.get('API_BASE_URL');
        this.blogGrid = document.getElementById('blog-grid');
        this.blogEmpty = document.getElementById('blog-empty');
        this.blogSearch = document.getElementById('blog-search');
        this.blogNoResults = document.getElementById('blog-no-results');
        this.progressBar = document.getElementById('reading-progress');
        this.isPostPage = window.location.pathname.includes('post.html');
        this.posts = []; // Store posts for search filtering
        this.cacheTTL = 5 * 60 * 1000; // Cache for 5 minutes

        this.init();
    }

    async init() {
        if (this.isPostPage) {
            await this.loadPost();
            this.initProgressBar();
        } else if (this.blogGrid) {
            await this.loadPosts();
            this.initSearch();
        }

        this.initNewsletter();
    }

    /**
     * Load all blog posts for the listing page
     */
    async loadPosts() {
        try {
            // Check cache first
            const cachedData = this.getCachedData('blog-posts');
            if (cachedData) {
                this.posts = cachedData;
                this.renderPosts(this.posts);
                return;
            }

            const url = new URL(`${this.apiBaseUrl}/get-posts-api`);
            url.searchParams.append('t', Date.now());
            const response = await fetch(url.toString());

            if (!response.ok) {
                throw new Error('Failed to load posts');
            }

            const data = await response.json();
            this.posts = data.posts || [];

            // Cache the posts data
            this.setCachedData('blog-posts', this.posts);

            // Posts are already sorted by publish_date DESC from the API

            if (this.posts.length === 0) {
                this.showEmptyState();
                return;
            }

            this.renderPosts(this.posts);
        } catch (error) {
            console.error('Error loading posts:', error);
            this.showEmptyState();
        }
    }

    /**
     * Initialize search functionality
     */
    initSearch() {
        if (!this.blogSearch) return;

        this.blogSearch.addEventListener('input', () => this.handleSearch());
    }

    /**
     * Get cached data from sessionStorage
     * @param {string} key - The cache key
     * @returns {any|null} - The cached data or null if not found/expired
     */
    getCachedData(key) {
        try {
            const cached = sessionStorage.getItem(key);
            if (!cached) return null;

            const { data, timestamp } = JSON.parse(cached);
            const now = Date.now();

            // Check if cache has expired
            if (now - timestamp > this.cacheTTL) {
                sessionStorage.removeItem(key);
                return null;
            }

            return data;
        } catch (error) {
            console.error('Error reading cache:', error);
            return null;
        }
    }

    /**
     * Set data in cache with timestamp
     * @param {string} key - The cache key
     * @param {any} data - The data to cache
     */
    setCachedData(key, data) {
        try {
            const cacheObject = {
                data,
                timestamp: Date.now()
            };
            sessionStorage.setItem(key, JSON.stringify(cacheObject));
        } catch (error) {
            console.error('Error setting cache:', error);
        }
    }

    /**
     * Handle search input
     */
    handleSearch() {
        const searchTerm = this.blogSearch.value.toLowerCase().trim();

        if (!searchTerm) {
            // Show all posts if search is empty
            this.renderPosts(this.posts);
            if (this.blogNoResults) {
                this.blogNoResults.classList.remove('visible');
            }
            if (this.blogGrid) {
                this.blogGrid.style.display = '';
            }
            return;
        }

        // Filter posts by title and description
        const filteredPosts = this.posts.filter(post => {
            const titleMatch = post.title.toLowerCase().includes(searchTerm);
            const descriptionMatch = post.description.toLowerCase().includes(searchTerm);
            return titleMatch || descriptionMatch;
        });

        if (filteredPosts.length === 0) {
            // Show no results message
            if (this.blogGrid) {
                this.blogGrid.style.display = 'none';
            }
            if (this.blogNoResults) {
                this.blogNoResults.classList.add('visible');
            }
        } else {
            // Show filtered posts
            if (this.blogGrid) {
                this.blogGrid.style.display = '';
            }
            if (this.blogNoResults) {
                this.blogNoResults.classList.remove('visible');
            }
            this.renderPosts(filteredPosts);
        }
    }

    /**
     * Render blog posts to the grid
     */
    renderPosts(posts) {
        if (!this.blogGrid) return;

        this.blogGrid.innerHTML = posts.map((post, index) => this.createPostCard(post, index === 0)).join('');
    }

    /**
     * Create HTML for a blog post card
     * @param {Object} post - The post data
     * @param {boolean} isNewest - Whether this is the newest post
     */
    createPostCard(post, isNewest = false) {
        const formattedDate = this.formatDate(post.publish_date);
        const postUrl = `/blog/post.html?slug=${post.slug}`;
        const badgeHtml = isNewest ? '<span class="blog-card__badge" aria-label="Artículo nuevo">¡Nuevo!</span>' : '';

        return `
            <a href="${postUrl}" class="blog-card" aria-label="Leer artículo: ${post.title}">
                ${badgeHtml}
                <time class="blog-card__date" datetime="${post.publish_date}">${formattedDate}</time>
                <h2 class="blog-card__title">${post.title}</h2>
                <p class="blog-card__description">${post.description}</p>
                <span class="blog-card__read-more">
                    Leer más
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
                        <line x1="5" y1="12" x2="19" y2="12"></line>
                        <polyline points="12 5 19 12 12 19"></polyline>
                    </svg>
                </span>
            </a>
        `;
    }

    /**
     * Show empty state when no posts are available
     */
    showEmptyState() {
        if (this.blogGrid) {
            this.blogGrid.style.display = 'none';
        }
        if (this.blogEmpty) {
            this.blogEmpty.style.display = 'block';
        }
    }

    /**
     * Load a single blog post
     */
    async loadPost() {
        const urlParams = new URLSearchParams(window.location.search);
        const slug = urlParams.get('slug');

        if (!slug) {
            this.showPostNotFound();
            return;
        }

        try {
            // Check cache first
            const cacheKey = `blog-post-${slug}`;
            const cachedPost = this.getCachedData(cacheKey);
            if (cachedPost) {
                this.renderPost(cachedPost, cachedPost.content);
                return;
            }

            // Load post from API
            const url = new URL(`${this.apiBaseUrl}/get-post-api/${slug}`);
            url.searchParams.append('t', Date.now());
            const response = await fetch(url.toString());

            if (!response.ok) {
                if (response.status === 404) {
                    this.showPostNotFound();
                    return;
                }
                throw new Error('Failed to load post');
            }

            const data = await response.json();
            const post = data.post;

            if (!post) {
                this.showPostNotFound();
                return;
            }

            // Cache the post data
            this.setCachedData(cacheKey, post);

            // Render the post with content from the database
            this.renderPost(post, post.content);

        } catch (error) {
            console.error('Error loading post:', error);
            this.showPostNotFound();
        }
    }

    /**
     * Render a single blog post
     */
    renderPost(post, markdownContent) {
        const postTitle = document.getElementById('post-title');
        const postDate = document.getElementById('post-date');
        const postContent = document.getElementById('post-content');
        const breadcrumbTitle = document.getElementById('breadcrumb-title');

        // Update page title and meta tags
        document.title = `${post.title} | Blog OnSeguros`;
        this.updateMetaTags(post);
        
        // Generate JSON-LD structured data
        console.log('renderPost: About to call generateBlogPostStructuredData');
        if (typeof generateBlogPostStructuredData === 'function') {
            console.log('renderPost: Function exists, calling it now');
            generateBlogPostStructuredData(post);
        } else {
            console.error('renderPost: generateBlogPostStructuredData function not found!');
        }

        // Update breadcrumb
        if (breadcrumbTitle) {
            breadcrumbTitle.textContent = post.title;
        }

        // Update post header
        if (postTitle) {
            postTitle.textContent = post.title;
        }

        if (postDate) {
            postDate.textContent = this.formatDate(post.publish_date);
            postDate.setAttribute('datetime', post.publish_date);
        }

        // Render markdown content
        if (postContent && typeof marked !== 'undefined') {
            // Configure marked for security
            marked.setOptions({
                breaks: true,
                gfm: true,
                headerIds: true,
                mangle: false
            });

            postContent.innerHTML = marked.parse(markdownContent);
        }

        // Update canonical URL
        const canonical = document.querySelector('link[rel="canonical"]');
        if (canonical) {
            canonical.href = `https://www.onseguros.net/blog/post.html?slug=${post.slug}`;
        }
    }

    /**
     * Update meta tags for SEO
     */
    updateMetaTags(post) {
        // Update title meta
        const titleMeta = document.querySelector('meta[name="title"]');
        if (titleMeta) titleMeta.content = `${post.title} | Blog OnSeguros`;

        // Update description meta
        const descMeta = document.querySelector('meta[name="description"]');
        if (descMeta) descMeta.content = post.description;

        // Update Open Graph
        const ogTitle = document.querySelector('meta[property="og:title"]');
        if (ogTitle) ogTitle.content = `${post.title} | Blog OnSeguros`;

        const ogDesc = document.querySelector('meta[property="og:description"]');
        if (ogDesc) ogDesc.content = post.description;

        const ogUrl = document.querySelector('meta[property="og:url"]');
        if (ogUrl) ogUrl.content = `https://www.onseguros.net/blog/post.html?slug=${post.slug}`;

        // Update Twitter
        const twitterTitle = document.querySelector('meta[name="twitter:title"]');
        if (twitterTitle) twitterTitle.content = `${post.title} | Blog OnSeguros`;

        const twitterDesc = document.querySelector('meta[name="twitter:description"]');
        if (twitterDesc) twitterDesc.content = post.description;
    }

    /**
     * Show post not found state
     */
    showPostNotFound() {
        const postContent = document.getElementById('post-content');
        const postNotFound = document.getElementById('post-not-found');
        const postHeader = document.querySelector('.blog-post__header');
        const postBack = document.querySelector('.blog-post__back');
        const newsletter = document.querySelector('.newsletter');

        if (postContent) postContent.style.display = 'none';
        if (postHeader) postHeader.style.display = 'none';
        if (postBack) postBack.style.display = 'none';
        if (newsletter) newsletter.style.display = 'none';
        if (postNotFound) postNotFound.style.display = 'block';

        document.title = 'Artículo no encontrado | Blog OnSeguros';
    }

    /**
     * Format date to Spanish locale
     */
    formatDate(dateString) {
        // Parse the date string as a local date (not UTC)
        // Handle both "YYYY-MM-DD" and full ISO format
        const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
        const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
        
        return date.toLocaleDateString('es-AR', {
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        });
    }

    /**
     * Initialize newsletter form functionality
     */
    initNewsletter() {
        const form = document.getElementById('newsletter-form');
        if (!form) return;

        form.addEventListener('submit', (e) => this.handleNewsletterSubmit(e));
    }

    /**
     * Handle newsletter form submission
     */
    async handleNewsletterSubmit(e) {
        e.preventDefault();

        const form = e.target;
        const emailInput = form.querySelector('#newsletter-email');
        const submitButton = form.querySelector('button[type="submit"]');
        const errorDiv = document.getElementById('newsletter-error');
        const successDiv = document.getElementById('newsletter-success');

        // Clear previous messages
        if (errorDiv) errorDiv.textContent = '';
        if (successDiv) successDiv.style.display = 'none';

        // Validate email
        const email = emailInput.value.trim();
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

        if (!email) {
            if (errorDiv) errorDiv.textContent = 'Por favor ingresá tu email.';
            emailInput.focus();
            return;
        }

        if (!emailRegex.test(email)) {
            if (errorDiv) errorDiv.textContent = 'Por favor ingresá un email válido.';
            emailInput.focus();
            return;
        }

        // Show loading state
        const originalText = submitButton.textContent;
        submitButton.textContent = 'Enviando...';
        submitButton.disabled = true;

        try {
            // Load Supabase configuration from environment
            const SUPABASE_URL = window.envConfig.get('SUPABASE_URL');
            const SUPABASE_ANON_KEY = window.envConfig.get('SUPABASE_ANON_KEY');

            const response = await fetch(`${SUPABASE_URL}/rest/v1/subscribers`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'apikey': SUPABASE_ANON_KEY,
                    'Authorization': `Bearer ${SUPABASE_ANON_KEY}`,
                    'Prefer': 'return=minimal'
                },
                body: JSON.stringify({ email: email })
            });

            if (response.status === 409 || response.status === 400) {
                // Email already exists (unique constraint violation)
                if (errorDiv) {
                    errorDiv.textContent = 'Este email ya está suscrito al newsletter.';
                }
                return;
            }

            if (!response.ok) {
                throw new Error('Subscription failed');
            }

            // Show success message
            if (successDiv) {
                successDiv.textContent = '✓ ¡Gracias por suscribirte! Recibirás nuestro newsletter cada viernes.';
                successDiv.style.display = 'block';
            }

            // Reset form
            form.reset();

        } catch (error) {
            console.error('Newsletter subscription error:', error);
            if (errorDiv) {
                errorDiv.textContent = 'Hubo un error al suscribirte. Por favor intentá nuevamente.';
            }
        } finally {
            submitButton.textContent = originalText;
            submitButton.disabled = false;
        }
    }

    /**
     * Initialize reading progress bar
     */
    initProgressBar() {
        if (!this.progressBar || !this.isPostPage) return;

        const updateProgress = () => {
            const scrollTop = document.documentElement.scrollTop || document.body.scrollTop;
            const scrollHeight = document.documentElement.scrollHeight - document.documentElement.clientHeight;
            const scrollPercent = (scrollHeight > 0) ? (scrollTop / scrollHeight) * 100 : 0;

            this.progressBar.style.width = `${scrollPercent}%`;
        };

        window.addEventListener('scroll', updateProgress, { passive: true });
        window.addEventListener('resize', updateProgress, { passive: true });
        updateProgress();
    }
}

// Initialize blog when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', async () => {
        // Load environment configuration first
        await window.envConfig.load();
        new Blog();
    });
} else {
    // Load config and initialize blog
    window.envConfig.load().then(() => {
        new Blog();
    });
}
