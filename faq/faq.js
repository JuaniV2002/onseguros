/**
 * FAQ Page JavaScript
 * Handles FAQ loading from Supabase and search filtering
 */

let allFaqs = [];

document.addEventListener('DOMContentLoaded', async function() {
    const faqListContainer = document.getElementById('faq-list');
    const searchInput = document.getElementById('faq-search');
    const noResults = document.getElementById('no-results');

    // Load FAQs from Supabase
    await loadFAQs();

    // Search functionality
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            const searchTerm = this.value.toLowerCase().trim();
            const accordionItems = document.querySelectorAll('.accordion-item');
            let hasResults = false;

            accordionItems.forEach(item => {
                const questionText = item.querySelector('.accordion-question span').textContent.toLowerCase();
                const answerText = item.querySelector('.accordion-answer__content').textContent.toLowerCase();
                
                if (questionText.includes(searchTerm) || answerText.includes(searchTerm)) {
                    item.style.display = 'block';
                    hasResults = true;
                } else {
                    item.style.display = 'none';
                    item.classList.remove('active');
                }
            });

            // Show/hide no results message
            if (noResults) {
                if (searchTerm && !hasResults) {
                    noResults.classList.add('visible');
                } else {
                    noResults.classList.remove('visible');
                }
            }
        });
    }
});

// Load FAQs from Supabase
async function loadFAQs() {
    const faqListContainer = document.getElementById('faq-list');
    
    if (!faqListContainer) return;

    // Show skeletal loading
    showFAQSkeleton();

    try {
        // Load environment config first
        await window.envConfig.load();
        const apiUrl = window.envConfig.get('GET_FAQS_API_URL');

        if (!apiUrl) {
            console.error('FAQ API URL not configured');
            hideFAQSkeleton();
            return;
        }

        const response = await fetch(apiUrl);
        
        if (!response.ok) {
            throw new Error('Failed to fetch FAQs');
        }

        allFaqs = await response.json();
        
        // Sort FAQs by order_number
        allFaqs.sort((a, b) => a.order_number - b.order_number);

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
