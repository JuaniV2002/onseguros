/**
 * FAQ Page JavaScript
 * Handles FAQ loading from Supabase and search filtering
 */

let allFaqs = [];
let currentCategory = 'all';

document.addEventListener('DOMContentLoaded', async function() {
    const faqListContainer = document.getElementById('faq-list');
    const searchInput = document.getElementById('faq-search');
    const noResults = document.getElementById('no-results');
    const categoryChips = document.querySelectorAll('.faq-category-chip');

    // Load FAQs from Supabase
    await loadFAQs();

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
        renderFAQs();
        // Initialize accordion component if available
        if (window.Accordion) {
            new window.Accordion('.accordion-list');
        }
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

        // Render FAQs
        renderFAQs();

        // Hide skeleton and initialize accordion
        hideFAQSkeleton();
        
        // Initialize accordion component if available
        if (window.Accordion) {
            new window.Accordion('.accordion-list');
        }

    } catch (error) {
        console.error('Error loading FAQs:', error);
        hideFAQSkeleton();
        // Keep the hardcoded FAQs as fallback if they exist
    }
}

// Render FAQs into the list
function renderFAQs() {
    const faqListContainer = document.getElementById('faq-list');
    if (!faqListContainer || allFaqs.length === 0) return;

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
        console.error('Error setting FAQ cache:', error);
    }
}
