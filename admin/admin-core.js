/* =====================================================
   OnSeguros Admin Panel - Core Module
   Shared configuration, authentication, and utilities
   ===================================================== */

// Configuration - will be loaded from environment variables
let CONFIG = null;
let supabaseClient = null;
let isAuthenticated = false;

// Cache management constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BLOG_CACHE_KEY = 'admin-blog-data';
const FAQ_CACHE_KEY = 'admin-faq-data';
const NEWSLETTER_CACHE_KEY = 'admin-newsletter-data';

// Cache clearing utilities
function clearBlogCache() {
    try {
        sessionStorage.removeItem(BLOG_CACHE_KEY);
        console.log('Blog cache cleared');
    } catch (error) {
        console.error('Error clearing blog cache:', error);
    }
}

function clearFAQCache() {
    try {
        sessionStorage.removeItem(FAQ_CACHE_KEY);
        console.log('FAQ cache cleared');
    } catch (error) {
        console.error('Error clearing FAQ cache:', error);
    }
}

function clearNewsletterCache() {
    try {
        sessionStorage.removeItem(NEWSLETTER_CACHE_KEY);
        console.log('Newsletter cache cleared');
    } catch (error) {
        console.error('Error clearing newsletter cache:', error);
    }
}

/**
 * Get cached blog posts from sessionStorage
 */
function getCachedBlogPosts() {
    try {
        const cached = sessionStorage.getItem(BLOG_CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Check if cache has expired
        if (now - timestamp > CACHE_TTL) {
            sessionStorage.removeItem(BLOG_CACHE_KEY);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading blog cache:', error);
        return null;
    }
}

/**
 * Set blog posts in cache with timestamp
 */
function setCachedBlogPosts(posts) {
    try {
        const cacheObject = {
            data: posts,
            timestamp: Date.now()
        };
        sessionStorage.setItem(BLOG_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
        console.error('Error setting blog cache:', error);
    }
}

/**
 * Get cached FAQs from sessionStorage
 */
function getCachedAdminFAQs() {
    try {
        const cached = sessionStorage.getItem(FAQ_CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Check if cache has expired
        if (now - timestamp > CACHE_TTL) {
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
 */
function setCachedAdminFAQs(faqs) {
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

/**
 * Get cached newsletter subscribers from sessionStorage
 */
function getCachedNewsletterSubscribers() {
    try {
        const cached = sessionStorage.getItem(NEWSLETTER_CACHE_KEY);
        if (!cached) return null;

        const { data, timestamp } = JSON.parse(cached);
        const now = Date.now();

        // Check if cache has expired
        if (now - timestamp > CACHE_TTL) {
            sessionStorage.removeItem(NEWSLETTER_CACHE_KEY);
            return null;
        }

        return data;
    } catch (error) {
        console.error('Error reading newsletter cache:', error);
        return null;
    }
}

/**
 * Set newsletter subscribers in cache with timestamp
 */
function setCachedNewsletterSubscribers(subscribers) {
    try {
        const cacheObject = {
            data: subscribers,
            timestamp: Date.now()
        };
        sessionStorage.setItem(NEWSLETTER_CACHE_KEY, JSON.stringify(cacheObject));
    } catch (error) {
        console.error('Error setting newsletter cache:', error);
    }
}

// Load configuration from .env file
async function loadConfig() {
    try {
        await window.envConfig.load();

        CONFIG = {
            SUPABASE_URL: window.envConfig.get('SUPABASE_URL'),
            SUPABASE_ANON_KEY: window.envConfig.get('SUPABASE_ANON_KEY'),
            GET_POSTS_API_URL: window.envConfig.get('GET_POSTS_API_URL'),
            GET_POST_API_URL: window.envConfig.get('GET_POST_API_URL'),
            PUBLISH_API_URL: window.envConfig.get('PUBLISH_API_URL'),
            UPDATE_API_URL: window.envConfig.get('UPDATE_API_URL'),
            DELETE_API_URL: window.envConfig.get('DELETE_API_URL'),
            BLOG_BASE_URL: window.envConfig.get('BLOG_BASE_URL'),
            GET_FAQS_API_URL: window.envConfig.get('GET_FAQS_API_URL'),
            GET_FAQ_API_URL: window.envConfig.get('GET_FAQ_API_URL'),
            CREATE_FAQ_API_URL: window.envConfig.get('CREATE_FAQ_API_URL'),
            UPDATE_FAQ_API_URL: window.envConfig.get('UPDATE_FAQ_API_URL'),
            DELETE_FAQ_API_URL: window.envConfig.get('DELETE_FAQ_API_URL'),
            GET_SUBSCRIBERS_API_URL: window.envConfig.get('GET_SUBSCRIBERS_API_URL'),
            DELETE_SUBSCRIBER_API_URL: window.envConfig.get('DELETE_SUBSCRIBER_API_URL')
        };

        // Initialize Supabase client after config is loaded
        supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

        // Set up auth state listener after client is initialized
        supabaseClient.auth.onAuthStateChange((event, session) => {
            if (event === 'SIGNED_IN' && session && !isAuthenticated) {
                showAdminScreen(session.user, true);
            } else if (event === 'SIGNED_OUT') {
                isAuthenticated = false;
                showLoginScreen();
            }
        });

        return true;
    } catch (error) {
        console.error('Failed to load configuration:', error);
        Toast.error('Error al cargar la configuración. Por favor, recargá la página.', 'Error Crítico');
        return false;
    }
}

// DOM Elements
const elements = {
    // Screens
    loginScreen: document.getElementById('login-screen'),
    adminScreen: document.getElementById('admin-screen'),

    // Login
    loginForm: document.getElementById('login-form'),
    emailInput: document.getElementById('email'),
    passwordInput: document.getElementById('password'),
    loginBtn: document.getElementById('login-btn'),
    loginError: document.getElementById('login-error'),

    // Admin
    userEmail: document.getElementById('user-email'),
    logoutBtn: document.getElementById('logout-btn'),

    // Posts Management
    postsManagement: document.getElementById('posts-management'),
    postsList: document.getElementById('posts-list'),
    postsLoading: document.getElementById('posts-loading'),
    postsEmpty: document.getElementById('posts-empty'),
    newPostToggleBtn: document.getElementById('new-post-toggle-btn'),
    editorContainer: document.getElementById('editor-container'),
    editorTitle: document.getElementById('editor-title'),
    cancelEditBtn: document.getElementById('cancel-edit-btn'),

    // Post Form
    postForm: document.getElementById('post-form'),
    postTitle: document.getElementById('post-title'),
    postDescription: document.getElementById('post-description'),
    postContent: document.getElementById('post-content'),
    publishBtn: document.getElementById('publish-btn'),
    publishBtnText: document.getElementById('publish-btn-text'),
    publishLoadingText: document.getElementById('publish-loading-text'),
    clearBtn: document.getElementById('clear-btn'),

    // Character counts
    titleCount: document.getElementById('title-count'),
    descCount: document.getElementById('desc-count'),
    contentCount: document.getElementById('content-count'),

    // Preview
    previewTitle: document.getElementById('preview-title'),
    previewDescription: document.getElementById('preview-description'),
    previewDate: document.getElementById('preview-date'),
    previewBody: document.getElementById('preview-body'),

    // Modals
    successModal: document.getElementById('success-modal'),
    errorModal: document.getElementById('error-modal'),
    errorMessage: document.getElementById('error-message'),
    viewPostLink: document.getElementById('view-post-link'),
    newPostBtn: document.getElementById('new-post-btn'),
    closeErrorBtn: document.getElementById('close-error-btn'),
    deleteModal: document.getElementById('delete-modal'),
    deleteMessage: document.getElementById('delete-message'),
    deletePostTitle: document.getElementById('delete-post-title'),
    cancelDeleteBtn: document.getElementById('cancel-delete-btn'),
    confirmDeleteBtn: document.getElementById('confirm-delete-btn'),

    // Confirmation Modal
    confirmModal: document.getElementById('confirm-modal'),
    confirmTitle: document.getElementById('confirm-title'),
    confirmMessage: document.getElementById('confirm-message'),
    confirmOkBtn: document.getElementById('confirm-ok-btn'),
    confirmCancelBtn: document.getElementById('confirm-cancel-btn'),

    // Toasts
    toastContainer: document.getElementById('toast-container'),

    // FAQ Management
    faqManagement: document.getElementById('faq-management'),
    faqList: document.getElementById('faq-list'),
    faqLoading: document.getElementById('faq-loading'),
    faqEmpty: document.getElementById('faq-empty'),
    newFaqToggleBtn: document.getElementById('new-faq-toggle-btn'),
    faqEditorContainer: document.getElementById('faq-editor-container'),
    faqEditorTitle: document.getElementById('faq-editor-title'),
    cancelFaqEditBtn: document.getElementById('cancel-faq-edit-btn'),

    // FAQ Form
    faqForm: document.getElementById('faq-form'),
    faqQuestion: document.getElementById('faq-question'),
    faqCategory: document.getElementById('faq-category'),
    faqAnswer: document.getElementById('faq-answer'),
    answerCount: document.getElementById('answer-count'),
    saveFaqBtn: document.getElementById('save-faq-btn'),
    clearFaqBtn: document.getElementById('clear-faq-btn'),
    questionCount: document.getElementById('question-count'),

    // FAQ Preview
    faqPreviewQuestion: document.getElementById('faq-preview-question'),
    faqPreviewCategory: document.getElementById('faq-preview-category'),
    faqPreviewAnswer: document.getElementById('faq-preview-answer'),

    // Newsletter Management
    newsletterManagement: document.getElementById('newsletter-management'),
    newsletterLoading: document.getElementById('newsletter-loading'),
    newsletterEmpty: document.getElementById('newsletter-empty'),
    newsletterTableContainer: document.getElementById('newsletter-table-container'),
    subscribersList: document.getElementById('subscribers-list'),

    // Navigation
    showBlogBtn: document.getElementById('show-blog-btn'),
    showFaqBtn: document.getElementById('show-faq-btn'),
    showNewsletterBtn: document.getElementById('show-newsletter-btn')
};

/* =====================================================
   Toast Manager
   ===================================================== */
class ToastManager {
    constructor() {
        this.container = document.getElementById('toast-container');
    }

    show(message, type = 'info', title = null) {
        if (!this.container) return; // Guard

        const toast = document.createElement('div');
        toast.className = `toast toast--${type}`;

        const iconMap = {
            success: '✓',
            error: '✕',
            info: 'ℹ'
        };

        const defaultTitles = {
            success: 'Éxito',
            error: 'Error',
            info: 'Información'
        };

        const displayTitle = title || defaultTitles[type] || '';

        toast.innerHTML = `
            <div class="toast-icon">${iconMap[type] || '•'}</div>
            <div class="toast-content">
                <div class="toast-title">${displayTitle}</div>
                <div class="toast-message">${message}</div>
            </div>
            <button class="toast-close">✕</button>
        `;

        // Close button behavior
        toast.querySelector('.toast-close').addEventListener('click', () => {
            this.remove(toast);
        });

        this.container.appendChild(toast);

        // Animate in
        requestAnimationFrame(() => {
            toast.classList.add('show');
        });

        // Auto dismiss
        setTimeout(() => {
            this.remove(toast);
        }, 5000);
    }

    remove(toast) {
        toast.classList.remove('show');
        toast.addEventListener('transitionend', () => {
            if (toast.parentNode) toast.remove();
        });
    }

    success(message, title) { this.show(message, 'success', title); }
    error(message, title) { this.show(message, 'error', title); }
    info(message, title) { this.show(message, 'info', title); }
}

const Toast = new ToastManager();

/* =====================================================
   Confirmation Manager
   ===================================================== */
function confirmAction(title, message, onConfirm) {
    if (!elements.confirmModal) return;

    elements.confirmTitle.textContent = title;
    elements.confirmMessage.textContent = message;

    // Reset listeners (clone node)
    const newOkBtn = elements.confirmOkBtn.cloneNode(true);
    const newCancelBtn = elements.confirmCancelBtn.cloneNode(true);

    elements.confirmOkBtn.parentNode.replaceChild(newOkBtn, elements.confirmOkBtn);
    elements.confirmCancelBtn.parentNode.replaceChild(newCancelBtn, elements.confirmCancelBtn);

    elements.confirmOkBtn = newOkBtn;
    elements.confirmCancelBtn = newCancelBtn;

    elements.confirmOkBtn.addEventListener('click', () => {
        elements.confirmModal.style.display = 'none';
        if (onConfirm) onConfirm();
    });

    elements.confirmCancelBtn.addEventListener('click', () => {
        elements.confirmModal.style.display = 'none';
    });

    // Close on backdrop click (once)
    const backdropHandler = (e) => {
        if (e.target === elements.confirmModal) {
            elements.confirmModal.style.display = 'none';
            elements.confirmModal.removeEventListener('click', backdropHandler);
        }
    };
    elements.confirmModal.addEventListener('click', backdropHandler);

    elements.confirmModal.style.display = 'flex';
}

/* =====================================================
   Authentication
   ===================================================== */

// Check auth state on page load
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();

    if (session) {
        showAdminScreen(session.user, true);
    } else {
        showLoginScreen();
    }
}

// Show login screen
function showLoginScreen() {
    elements.loginScreen.style.display = 'flex';
    elements.adminScreen.style.display = 'none';
    elements.loginForm.reset();
    hideLoginError();
}

// Show admin screen
function showAdminScreen(user, isInitialLoad = false) {
    elements.loginScreen.style.display = 'none';
    elements.adminScreen.style.display = 'block';
    elements.userEmail.textContent = user.email;
    isAuthenticated = true;
    
    // Only reset to posts management view on initial load
    if (isInitialLoad) {
        updatePreviewDate();
        loadPosts(); // Load existing posts
        showPostsManagement(); // Show posts list by default
    }
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();

    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;

    setLoginLoading(true);
    hideLoginError();

    try {
        const { data, error } = await supabaseClient.auth.signInWithPassword({
            email,
            password
        });

        if (error) throw error;

    } catch (error) {
        console.error('Login error:', error);
        showLoginError(getAuthErrorMessage(error));
    } finally {
        setLoginLoading(false);
    }
}

// Handle logout
async function handleLogout() {
    await supabaseClient.auth.signOut();
}

// Login loading state
function setLoginLoading(loading) {
    elements.loginBtn.disabled = loading;
    elements.loginBtn.querySelector('.btn-text').style.display = loading ? 'none' : 'inline';
    elements.loginBtn.querySelector('.btn-loading').style.display = loading ? 'inline-flex' : 'none';
}

// Show login error
function showLoginError(message) {
    elements.loginError.textContent = message;
    elements.loginError.style.display = 'block';
}

// Hide login error
function hideLoginError() {
    elements.loginError.style.display = 'none';
}

// Get user-friendly auth error message
function getAuthErrorMessage(error) {
    const messages = {
        'Invalid login credentials': 'Email o contraseña incorrectos',
        'Email not confirmed': 'Por favor, confirmá tu email primero',
        'Too many requests': 'Demasiados intentos. Esperá un momento.',
        'User not found': 'Usuario no encontrado'
    };
    return messages[error.message] || 'Error al iniciar sesión. Intentá de nuevo.';
}

/* =====================================================
   Shared Utilities
   ===================================================== */

function formatDate(dateString) {
    // Parse the date string as a local date (not UTC)
    // Handle both "YYYY-MM-DD" and full ISO format
    const [year, month, day] = dateString.split('T')[0].split('-').map(Number);
    const date = new Date(year, month - 1, day); // month is 0-indexed in Date constructor
    
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    return date.toLocaleDateString('es-AR', options);
}

function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateCharCount(input, countElement, min, max) {
    const count = input.value.length;
    const parent = countElement.closest('.char-count');
    
    // Update the count number
    countElement.textContent = count;
    
    // Turn green when minimum is reached, otherwise gray
    if (min && count >= min) {
        parent.style.color = 'var(--success)';
    } else {
        parent.style.color = 'var(--gray-400)';
    }
}

// Update preview date
function updatePreviewDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    elements.previewDate.textContent = today.toLocaleDateString('es-AR', options);
}

/* =====================================================
   Authentication Event Listeners
   ===================================================== */

elements.loginForm.addEventListener('submit', handleLogin);
elements.logoutBtn.addEventListener('click', handleLogout);

/* =====================================================
   Initialization
   ===================================================== */

document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    const configLoaded = await loadConfig();
    if (!configLoaded) {
        return; // Stop if config failed to load
    }

    // Then proceed with auth check
    checkAuth();
    updatePreviewDate();
});
