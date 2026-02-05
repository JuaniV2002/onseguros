/**
 * Admin Quotes Management Module
 * Manages quote requests in the admin panel
 * Dependencies: admin-core.js must load first
 */

// State (scoped to quotes module)
let allQuotes = [];
let currentPage = 1;
const QUOTES_PER_PAGE = 20;

// Cache keys (scoped to quotes module)
const QUOTES_CACHE_KEY = 'admin-quotes-data';
const QUOTES_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

/**
 * Initialize quotes management
 */
function initQuotesManagement() {

    // Check if elements object exists
    if (typeof elements === 'undefined') {
        console.error('[Quotes] Elements object not found. admin-core.js must load first.');
        return;
    }
    
    // Check if button exists
    if (!elements.showQuotesBtn) {
        console.error('[Quotes] Show quotes button not found in DOM');
        return;
    }
    
    // Set up navigation
    elements.showQuotesBtn.addEventListener('click', showQuotesManagement);
    
    // Set up pagination controls
    setupPaginationControls();
}

/**
 * Setup pagination controls
 */
function setupPaginationControls() {
    // Top pagination
    elements.quotesPrevBtn.addEventListener('click', () => goToPage(currentPage - 1));
    elements.quotesNextBtn.addEventListener('click', () => goToPage(currentPage + 1));
    
    // Bottom pagination
    elements.quotesPrevBtnBottom.addEventListener('click', () => goToPage(currentPage - 1));
    elements.quotesNextBtnBottom.addEventListener('click', () => goToPage(currentPage + 1));
}

/**
 * Show quotes management section
 */
function showQuotesManagement() {
    
    // Hide other sections
    elements.postsManagement.style.display = 'none';
    elements.faqManagement.style.display = 'none';
    elements.newsletterManagement.style.display = 'none';
    elements.quotesManagement.style.display = 'block';
    elements.editorContainer.style.display = 'none';
    elements.faqEditorContainer.style.display = 'none';
    
    // Update nav buttons
    elements.showBlogBtn.classList.remove('active');
    elements.showFaqBtn.classList.remove('active');
    elements.showNewsletterBtn.classList.remove('active');
    elements.showQuotesBtn.classList.add('active');
    
    // Load quotes if not already loaded
    if (allQuotes.length === 0) {
        loadQuotes();
    }
}

/**
 * Load quotes from API
 */
async function loadQuotes() {
    
    // Check cache first
    const cached = getCachedQuotes();
    if (cached) {
        allQuotes = cached;
        currentPage = 1;
        renderQuotes();
        return;
    }
    
    // Show loading state
    elements.quotesLoading.style.display = 'block';
    elements.quotesEmpty.style.display = 'none';
    elements.quotesTableContainer.style.display = 'none';
    
    try {
        const GET_QUOTES_API_URL = window.envConfig.get('GET_QUOTES_API_URL');
        
        // Get session token
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            throw new Error('No hay sesión activa');
        }
        
        const response = await fetch(GET_QUOTES_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });
        
        if (!response.ok) {
            throw new Error('Error al cargar las cotizaciones');
        }
        
        const quotes = await response.json();
        
        allQuotes = quotes;
        currentPage = 1;
        
        // Cache the data
        setCachedQuotes(allQuotes);
        
        renderQuotes();
    } catch (error) {
        console.error('[Quotes] Error loading quotes:', error);
        Toast.error('Error al cargar las cotizaciones', 'Error');
        elements.quotesLoading.style.display = 'none';
    }
}

/**
 * Render quotes table with pagination
 */
function renderQuotes() {
    
    elements.quotesLoading.style.display = 'none';
    
    if (allQuotes.length === 0) {
        elements.quotesEmpty.style.display = 'block';
        elements.quotesTableContainer.style.display = 'none';
        return;
    }
    
    elements.quotesEmpty.style.display = 'none';
    elements.quotesTableContainer.style.display = 'block';
    
    // Calculate pagination
    const totalPages = Math.ceil(allQuotes.length / QUOTES_PER_PAGE);
    const startIndex = (currentPage - 1) * QUOTES_PER_PAGE;
    const endIndex = startIndex + QUOTES_PER_PAGE;
    const quotesToShow = allQuotes.slice(startIndex, endIndex);
    
    // Render table rows
    elements.quotesList.innerHTML = quotesToShow.map((quote, index) => {
        const globalIndex = startIndex + index + 1;
        const statusBadge = quote.status === 'contacted' 
            ? '<span class="status-badge status-contacted">Contactado</span>'
            : '<span class="status-badge status-pending">Pendiente</span>';
        
        const insuranceTypeNames = {
            'integrales': 'Integrales',
            'art-vida': 'ART y Vida',
            'agricolas': 'Agrícolas',
            'vehiculos': 'Vehículos',
            'otras': 'Otras'
        };
        
        const insuranceTypeName = insuranceTypeNames[quote.insurance_type] || quote.insurance_type;
        
        return `
            <tr>
                <td>${escapeHtml(quote.full_name)}</td>
                <td><a href="mailto:${escapeHtml(quote.email)}">${escapeHtml(quote.email)}</a></td>
                <td><a href="tel:${escapeHtml(quote.phone)}">${escapeHtml(quote.phone)}</a></td>
                <td>${escapeHtml(insuranceTypeName)}</td>
                <td class="quote-message">${quote.message ? escapeHtml(quote.message) : '<em>Sin mensaje</em>'}</td>
                <td>${formatDate(quote.created_at)}</td>
                <td>${statusBadge}</td>
                <td>
                    ${quote.status === 'pending' 
                        ? `<button class="btn btn-sm btn-primary" onclick="markAsContacted('${quote.id}')">
                               Contactado
                           </button>`
                        : `<button class="btn btn-sm btn-secondary" onclick="markAsPending('${quote.id}')" disabled>
                               Contactado
                           </button>`
                    }
                </td>
            </tr>
        `;
    }).join('');
    
    // Update pagination controls
    updatePaginationControls(totalPages);
    
    // Show/hide pagination based on total pages
    const showPagination = totalPages > 1;
    elements.quotesPaginationTop.style.display = showPagination ? 'flex' : 'none';
    elements.quotesPaginationBottom.style.display = showPagination ? 'flex' : 'none';
}

/**
 * Update pagination controls
 */
function updatePaginationControls(totalPages) {
    const pageInfo = `Página ${currentPage} de ${totalPages}`;
    
    // Update top pagination
    elements.quotesPageInfo.textContent = pageInfo;
    elements.quotesPrevBtn.disabled = currentPage === 1;
    elements.quotesNextBtn.disabled = currentPage === totalPages;
    
    // Update bottom pagination
    elements.quotesPageInfoBottom.textContent = pageInfo;
    elements.quotesPrevBtnBottom.disabled = currentPage === 1;
    elements.quotesNextBtnBottom.disabled = currentPage === totalPages;
}

/**
 * Go to specific page
 */
function goToPage(page) {
    const totalPages = Math.ceil(allQuotes.length / QUOTES_PER_PAGE);
    
    if (page < 1 || page > totalPages) {
        return;
    }
    
    currentPage = page;
    renderQuotes();
    
    // Scroll to top of table
    elements.quotesTableContainer.scrollIntoView({ behavior: 'smooth' });
}

/**
 * Mark quote as contacted
 */
async function markAsContacted(quoteId) {
    
    try {
        const UPDATE_QUOTE_STATUS_API_URL = window.envConfig.get('UPDATE_QUOTE_STATUS_API_URL');
        
        // Get session token
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            throw new Error('No hay sesión activa');
        }
        
        const response = await fetch(UPDATE_QUOTE_STATUS_API_URL, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                quoteId: quoteId,
                status: 'contacted'
            })
        });
        
        if (!response.ok) {
            throw new Error('Error al actualizar el estado');
        }
        
        // Update local state
        const quote = allQuotes.find(q => q.id === quoteId);
        if (quote) {
            quote.status = 'contacted';
        }
        
        // Clear cache and re-render
        clearCachedQuotes();
        setCachedQuotes(allQuotes);
        renderQuotes();
        
        Toast.success('Estado actualizado a "Contactado"', 'Éxito');
    } catch (error) {
        console.error('[Quotes] Error updating status:', error);
        Toast.error('Error al actualizar el estado', 'Error');
    }
}

/**
 * Mark quote as pending (disabled in UI, but kept for completeness)
 */
async function markAsPending(quoteId) {
    // This is intentionally disabled in the UI
    console.log('[Quotes] Mark as pending is disabled');
}

/**
 * Cache management
 */
function getCachedQuotes() {
    try {
        const cached = localStorage.getItem(QUOTES_CACHE_KEY);
        if (!cached) return null;
        
        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();
        
        if (now - timestamp > QUOTES_CACHE_TTL) {
            localStorage.removeItem(QUOTES_CACHE_KEY);
            return null;
        }
        
        return data;
    } catch (error) {
        console.error('[Quotes] Error reading cache:', error);
        return null;
    }
}

function setCachedQuotes(data) {
    try {
        const cacheData = {
            data: data,
            timestamp: Date.now()
        };
        localStorage.setItem(QUOTES_CACHE_KEY, JSON.stringify(cacheData));
    } catch (error) {
        console.error('[Quotes] Error setting cache:', error);
    }
}

function clearCachedQuotes() {
    localStorage.removeItem(QUOTES_CACHE_KEY);
}

/**
 * Refresh quotes (for use by other modules)
 */
function refreshQuotes() {
    clearCachedQuotes();
    allQuotes = [];
    currentPage = 1;
    loadQuotes();
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initQuotesManagement);
} else {
    // DOM already loaded, initialize immediately
    setTimeout(initQuotesManagement, 0);
}

// Export functions for global access
window.markAsContacted = markAsContacted;
window.markAsPending = markAsPending;
window.refreshQuotes = refreshQuotes;
