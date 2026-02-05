/**
 * FAQ Page JavaScript
 * Handles FAQ loading from Supabase and search filtering
 */

let allFaqs = [];
let currentCategory = 'all';

/**
 * Generate FAQ Schema structured data (JSON-LD)
 * @param {Array} faqs - Array of FAQ objects
 */
function generateFAQStructuredData(faqs) {
    if (!faqs || faqs.length === 0) {
        return;
    }

    // Remove existing dynamic FAQ structured data if present
    const existingScript = document.getElementById('faq-dynamic-schema');
    if (existingScript) {
        console.log('Removing existing schema');
        existingScript.remove();
    }

    // Create mainEntity array with all FAQs
    const mainEntity = faqs.map(faq => ({
        "@type": "Question",
        "name": faq.question,
        "acceptedAnswer": {
            "@type": "Answer",
            "text": stripHtmlTags(faq.answer) // Remove any HTML tags from answer
        }
    }));

    // Create FAQPage schema
    const faqSchema = {
        "@context": "https://schema.org",
        "@type": "FAQPage",
        "mainEntity": mainEntity
    };

    // Create script element
    const script = document.createElement('script');
    script.type = 'application/ld+json';
    script.id = 'faq-dynamic-schema';
    script.textContent = JSON.stringify(faqSchema);

    // Inject into head
    document.head.appendChild(script);

    console.log(`Generated FAQ schema with ${faqs.length} questions`);
}

/**
 * Strip HTML tags from text while preserving content
 * @param {string} html - HTML string to clean
 * @returns {string} - Plain text without HTML tags
 */
function stripHtmlTags(html) {
    if (!html) return '';
    const div = document.createElement('div');
    div.innerHTML = html;
    return div.textContent || div.innerText || '';
}

document.addEventListener('DOMContentLoaded', async function() {
    const faqListContainer = document.getElementById('faq-list');
    const searchInput = document.getElementById('faq-search');
    const noResults = document.getElementById('no-results');
    const categoryChips = document.querySelectorAll('.faq-category-chip');

    // Load FAQs from Supabase
    await loadFAQs();

    // Refresh FAQs when page becomes visible (user returns to tab)
    document.addEventListener('visibilitychange', async function() {
        if (!document.hidden) {
            // Page is now visible - refresh FAQs to get latest data
            clearFAQCache();
            await loadFAQs();
        }
    });

    // Category filter functionality
    categoryChips.forEach(chip => {
        chip.addEventListener('click', function() {
            // Update active state
            categoryChips.forEach(c => c.classList.remove('active'));
            this.classList.add('active');
            
            // Store current category
            currentCategory = this.dataset.category;
            
            // Clear search input
            if (searchInput) {
                searchInput.value = '';
            }
            
            // Apply filter
            filterFAQs();
        });
    });

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            filterFAQs();
        });
    }
});

// Filter FAQs based on search and category
function filterFAQs() {
    const searchInput = document.getElementById('faq-search');
    const noResults = document.getElementById('no-results');
    const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
    const accordionItems = document.querySelectorAll('.accordion-item');
    let hasResults = false;

    accordionItems.forEach(item => {
        const category = item.dataset.category;
        const questionText = item.querySelector('.accordion-question span').textContent.toLowerCase();
        const answerText = item.querySelector('.accordion-answer__content').textContent.toLowerCase();
        
        // Check category filter
        const categoryMatch = currentCategory === 'all' || category === currentCategory;
        
        // Check search filter
        const searchMatch = !searchTerm || questionText.includes(searchTerm) || answerText.includes(searchTerm);
        
        if (categoryMatch && searchMatch) {
            item.style.display = 'block';
            hasResults = true;
        } else {
            item.style.display = 'none';
            item.classList.remove('active');
        }
    });

    // Show/hide no results message
    if (noResults) {
        if (!hasResults) {
            noResults.classList.add('visible');
        } else {
            noResults.classList.remove('visible');
        }
    }
}

// Load FAQs from Supabase
async function loadFAQs() {
    const faqListContainer = document.getElementById('faq-list');
    
    if (!faqListContainer) return;

    // Check cache first
    const cachedFaqs = getCachedFAQs();
    if (cachedFaqs) {
        allFaqs = cachedFaqs;
        // Generate JSON-LD structured data from cache
        if (typeof generateFAQStructuredData === 'function') {
            generateFAQStructuredData(cachedFaqs);
        }
        renderFAQs();
        return;
    }

    // Show skeletal loading
    showFAQSkeleton();

    try {
        // Load environment config first
        await window.envConfig.load();
        const apiUrl = window.envConfig.get('GET_FAQS_API_URL');
        const anonKey = window.envConfig.get('SUPABASE_ANON_KEY');

        if (!apiUrl) {
            console.error('FAQ API URL not configured');
            hideFAQSkeleton();
            return;
        }

        const response = await fetch(apiUrl, {
            headers: {
                'Authorization': `Bearer ${anonKey}`
            }
        });
        
        if (!response.ok) {
            throw new Error('Failed to fetch FAQs');
        }

        allFaqs = await response.json();
        
        // Sort FAQs by order_number
        allFaqs.sort((a, b) => a.order_number - b.order_number);

        // Cache the FAQs data
        setCachedFAQs(allFaqs);

        // Hide skeleton
        hideFAQSkeleton();

        // Generate JSON-LD structured data
        if (typeof generateFAQStructuredData === 'function') {
            generateFAQStructuredData(allFaqs);
        } else {
            console.error('generateFAQStructuredData function not found!');
        }

        // Render FAQs (which also initializes accordion)
        renderFAQs();

    } catch (error) {
        console.error('Error loading FAQs:', error);
        hideFAQSkeleton();
        // Show empty state on error
        renderFAQs();
    }
}

// Render FAQs into the list
function renderFAQs() {
    const faqListContainer = document.getElementById('faq-list');
    const faqSearch = document.querySelector('.faq-search');
    const faqCategories = document.querySelector('.faq-categories');
    
    if (!faqListContainer) return;
    
    // Check if FAQs are empty
    if (allFaqs.length === 0) {
        // Show empty state
        showEmptyState();
        // Hide search and categories
        if (faqSearch) faqSearch.style.display = 'none';
        if (faqCategories) faqCategories.style.display = 'none';
        return;
    }

    // Show search and categories if FAQs are available
    if (faqSearch) faqSearch.style.display = 'block';
    if (faqCategories) faqCategories.style.display = 'flex';
    // Hide empty state if visible
    hideEmptyState();

    faqListContainer.innerHTML = allFaqs.map(faq => `
        <div class="accordion-item" data-category="${escapeHtml(faq.category)}">
            <button class="accordion-question" aria-expanded="false">
                <span>${escapeHtml(faq.question)}</span>
                <img src="../assets/icons/chevron-down.svg" alt="chevron-down icon">
            </button>
            <div class="accordion-answer">
                <div class="accordion-answer__content">
                    ${faq.answer}
                </div>
            </div>
        </div>
    `).join('');

    // Initialize accordion after rendering
    if (window.Accordion) {
        new window.Accordion('.accordion-list');
    }
}

// Show skeletal loading
function showFAQSkeleton() {
    const faqListContainer = document.getElementById('faq-list');
    if (!faqListContainer) return;

    faqListContainer.innerHTML = `
        <div class="faq-skeleton-loading">
            <div class="faq-skeleton-item">
                <div class="faq-skeleton-question"></div>
            </div>
            <div class="faq-skeleton-item">
                <div class="faq-skeleton-question"></div>
            </div>
            <div class="faq-skeleton-item">
                <div class="faq-skeleton-question"></div>
            </div>
            <div class="faq-skeleton-item">
                <div class="faq-skeleton-question"></div>
            </div>
            <div class="faq-skeleton-item">
                <div class="faq-skeleton-question"></div>
            </div>
        </div>
    `;
}

// Hide skeletal loading
function hideFAQSkeleton() {
    const skeleton = document.querySelector('.faq-skeleton-loading');
    if (skeleton) {
        skeleton.remove();
    }
}

// Show empty state
function showEmptyState() {
    const faqEmptyContainer = document.getElementById('faq-empty');
    if (!faqEmptyContainer) return;

    faqEmptyContainer.classList.add('visible');
    faqEmptyContainer.innerHTML = `
        <h2 class="faq-empty__title">No hay preguntas frecuentes disponibles</h2>
        <p class="faq-empty__description">
            Estamos trabajando en contenido de calidad para vos. Por favor, contactanos directamente si tienes alguna pregunta.
        </p>
    `;
}

// Hide empty state
function hideEmptyState() {
    const faqEmptyContainer = document.getElementById('faq-empty');
    if (faqEmptyContainer) {
        faqEmptyContainer.classList.remove('visible');
        faqEmptyContainer.innerHTML = '';
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Cache management
const FAQ_CACHE_KEY = 'faq-data';
const FAQ_CACHE_TTL = 5 * 60 * 1000; // Cache for 5 minutes

/**
 * Clear FAQ cache from sessionStorage
 */
function clearFAQCache() {
    try {
        sessionStorage.removeItem(FAQ_CACHE_KEY);
    } catch (error) {
        console.error('Error clearing FAQ cache:', error);
    }
}

/**
 * Get cached FAQs from sessionStorage
 * @returns {Array|null} - The cached FAQs or null if not found/expired
 */
function getCachedFAQs() {
    try {
        const cached = sessionStorage.getItem(FAQ_CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Check if cache has expired
        if (now - timestamp > FAQ_CACHE_TTL) {
            sessionStorage.removeItem(FAQ_CACHE_KEY);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading FAQ cache:', error);
        return null;
    }
}

/**
 * Set FAQs in cache with timestamp
 * @param {Array} faqs - The FAQs data to cache
 */
function setCachedFAQs(faqs) {
    try {
        const cacheObject = {
            data: faqs,
            timestamp: Date.now()
        };
        sessionStorage.setItem(FAQ_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
        console.error('Error loading FAQs:', error);
        hideFAQSkeleton();
        // Show empty state on error
        renderFAQs();
    }
}
