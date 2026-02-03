/* =====================================================
   OnSeguros Admin Panel - JavaScript
   ===================================================== */

// Configuration - will be loaded from environment variables
let CONFIG = null;
let supabaseClient = null;
let isAuthenticated = false;

// Cache management constants
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes
const BLOG_CACHE_KEY = 'admin-blog-data';
const FAQ_CACHE_KEY = 'admin-faq-data';

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
            DELETE_FAQ_API_URL: window.envConfig.get('DELETE_FAQ_API_URL')
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

    // Navigation
    showBlogBtn: document.getElementById('show-blog-btn'),
    showFaqBtn: document.getElementById('show-faq-btn')
};

// State
let currentEditingPost = null;
let allPosts = [];
let currentEditingFaq = null;
let allFaqs = [];
let draggedFaqElement = null;

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
   Posts Management
   ===================================================== */

// Load all posts from posts.json
async function loadPosts() {
    // Check cache first
    const cachedPosts = getCachedBlogPosts();
    if (cachedPosts) {
        allPosts = cachedPosts;
        elements.postsLoading.style.display = 'none';
        
        if (allPosts.length === 0) {
            elements.postsEmpty.style.display = 'flex';
        } else {
            elements.postsEmpty.style.display = 'none';
            renderPosts();
        }
        return;
    }

    // Show loading state
    elements.postsLoading.style.display = 'flex';
    elements.postsList.innerHTML = '';
    elements.postsEmpty.style.display = 'none';

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        const response = await fetch(CONFIG.GET_POSTS_API_URL, {
            headers: {
                'Authorization': `Bearer ${session?.access_token}`
            }
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            throw new Error('Failed to load posts');
        }

        const data = await response.json();
        allPosts = data.posts || [];

        // Cache the posts
        setCachedBlogPosts(allPosts);

        // Posts are already sorted by publish_date DESC from API

        elements.postsLoading.style.display = 'none';

        if (allPosts.length === 0) {
            elements.postsEmpty.style.display = 'flex';
            return;
        }

        renderPosts();
    } catch (error) {
        elements.postsLoading.style.display = 'none';
        elements.postsEmpty.style.display = 'flex';
    }
}

// Render posts list
function renderPosts() {
    elements.postsList.innerHTML = allPosts.map(post => `
        <div class="post-item" data-slug="${post.slug}">
            <div class="post-item-content">
                <h3 class="post-item-title">${escapeHtml(post.title)}</h3>
                <p class="post-item-description">${escapeHtml(post.description)}</p>
                <div class="post-item-meta">
                    <span class="post-item-date">${formatDate(post.publish_date)}</span>
                    <span>•</span>
                    <span class="post-item-slug">${post.slug}</span>
                </div>
            </div>
            <div class="post-item-actions">
                <a href="${CONFIG.BLOG_BASE_URL}?slug=${post.slug}" target="_blank" class="btn btn-sm btn-secondary" title="Ver artículo">
                    <img src="../assets/icons/eye.svg" width="16" height="16" alt="">
                    Ver
                </a>
                <button class="btn btn-sm btn-primary" onclick="editPost('${post.slug}')" title="Editar artículo">
                    <img src="../assets/icons/square-pen.svg" width="16" height="16" alt="">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('${post.slug}')" title="Eliminar artículo">
                    <img src="../assets/icons/trash-2.svg" width="16" height="16" alt="">
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');
}

// Show posts management section
function showPostsManagement() {
    elements.postsManagement.style.display = 'block';
    elements.editorContainer.style.display = 'none';
    document.querySelector('.admin-nav').style.display = 'flex';
    currentEditingPost = null;
}

// Show editor section
function showEditor(isEdit = false) {
    elements.postsManagement.style.display = 'none';
    elements.editorContainer.style.display = 'grid';
    document.querySelector('.admin-nav').style.display = 'none';

    if (isEdit) {
        elements.editorTitle.textContent = 'Editar Artículo';
        elements.publishBtnText.textContent = 'Actualizar Artículo';
        elements.publishLoadingText.textContent = 'Actualizando...';
    } else {
        elements.editorTitle.textContent = 'Nuevo Artículo';
        elements.publishBtnText.textContent = 'Publicar Artículo';
        elements.publishLoadingText.textContent = 'Publicando...';
        clearForm(false); // Clear without confirmation
    }
}

// Edit post
async function editPost(slug) {
    const post = allPosts.find(p => p.slug === slug);
    if (!post) {
        Toast.error('No se encontró el artículo', 'Error');
        return;
    }

    currentEditingPost = post;
    showEditor(true);

    // Load post data into form (content is already in the post object from API)
    elements.postTitle.value = post.title;
    elements.postDescription.value = post.description;
    elements.postContent.value = post.content || '';

    // Update character counts and preview
    updateCharCount(elements.postTitle, elements.titleCount, 10, 100);
    updateCharCount(elements.postDescription, elements.descCount, 50, 160);
    updateCharCount(elements.postContent, elements.contentCount, 100, null);
    updatePreview();
}

// Confirm delete
function confirmDelete(slug) {
    const post = allPosts.find(p => p.slug === slug);
    if (!post) return;

    currentEditingPost = post;
    
    // Update modal for blog post deletion
    const deleteModal = elements.deleteModal;
    const titleElement = deleteModal.querySelector('h2');
    titleElement.textContent = '¿Eliminar Artículo?';
    elements.deleteMessage.textContent = '¿Estás seguro de que querés eliminar este artículo? Esta acción no se puede deshacer.';
    elements.deletePostTitle.textContent = `"${post.title}"`;
    elements.deleteModal.style.display = 'flex';
}

// Delete post
async function deletePost() {
    if (!currentEditingPost) return;

    setDeleteLoading(true);

    try {
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError || !session || !session.access_token) {
            console.error('Session error:', sessionError);
            throw new Error('No estás autenticado. Por favor, volvé a iniciar sesión.');
        }

        console.log('Deleting with user:', session.user.email);

        const response = await fetch(CONFIG.DELETE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ slug: currentEditingPost.slug })
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || 'Error al eliminar el artículo');
        }

        // Clear the blog cache
        clearBlogCache();
        hideDeleteModal();
        await loadPosts(); // Reload posts
        Toast.success('¡Artículo eliminado exitosamente!', 'Eliminado');

    } catch (error) {
        console.error('Delete error:', error);
        hideDeleteModal();
        Toast.error(error.message || 'Error al eliminar el artículo. Intentá de nuevo.');
    } finally {
        setDeleteLoading(false);
    }
}

// Cancel edit
// Cancel edit
async function cancelEdit() {
    if (currentEditingPost) {
        confirmAction('¿Descartar cambios?', '¿Querés cancelar la edición? Los cambios no guardados se perderán.', async () => {
            currentEditingPost = null;
            await loadPosts();
            showPostsManagement();
        });
    } else {
        currentEditingPost = null;
        showPostsManagement();
    }
}

// Cancel FAQ edit
async function cancelFAQEdit() {
    if (currentEditingFaq) {
        confirmAction('¿Descartar cambios?', '¿Querés cancelar la edición? Los cambios no guardados se perderán.', async () => {
            currentEditingFaq = null;
            await loadFAQs();
            showFAQManagement();
        });
    } else {
        currentEditingFaq = null;
        showFAQManagement();
    }
}

// Helper functions
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

function setDeleteLoading(loading) {
    elements.confirmDeleteBtn.disabled = loading;
    elements.cancelDeleteBtn.disabled = loading;
    elements.confirmDeleteBtn.querySelector('.btn-text').style.display = loading ? 'none' : 'inline';
    elements.confirmDeleteBtn.querySelector('.btn-loading').style.display = loading ? 'inline-flex' : 'none';
}

function hideDeleteModal() {
    elements.deleteModal.style.display = 'none';
    currentEditingPost = null;
}

/* =====================================================
   Post Editor
   ===================================================== */

// Update character counts
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

// Update live preview
function updatePreview() {
    const title = elements.postTitle.value.trim() || 'Tu título aparecerá aquí';
    const description = elements.postDescription.value.trim() || 'La descripción aparecerá aquí...';
    const content = elements.postContent.value.trim();

    elements.previewTitle.textContent = title;
    elements.previewDescription.textContent = description;

    if (content) {
        elements.previewBody.innerHTML = marked.parse(content);
    } else {
        elements.previewBody.innerHTML = '<p class="placeholder-text">El contenido de tu artículo se mostrará aquí mientras escribís...</p>';
    }
}

// Update preview date
function updatePreviewDate() {
    const today = new Date();
    const options = { year: 'numeric', month: 'long', day: 'numeric' };
    elements.previewDate.textContent = today.toLocaleDateString('es-AR', options);
}

// Generate slug from title
function generateSlug(title) {
    return title
        .toLowerCase()
        .normalize('NFD')
        .replace(/[\u0300-\u036f]/g, '') // Remove accents
        .replace(/[^a-z0-9\s-]/g, '')    // Remove special chars
        .replace(/\s+/g, '-')            // Replace spaces with -
        .replace(/-+/g, '-')             // Replace multiple - with single -
        .replace(/^-|-$/g, '')           // Remove leading/trailing -
        .substring(0, 60);               // Limit length
}

// Clear form
// Clear form
function clearForm(confirm = true) {
    const doClear = () => {
        elements.postForm.reset();
        updatePreview();
        updateCharCount(elements.postTitle, elements.titleCount, 10, 100);
        updateCharCount(elements.postDescription, elements.descCount, 50, 160);
        updateCharCount(elements.postContent, elements.contentCount, 100, null);
        currentEditingPost = null;
    };

    if (confirm) {
        confirmAction('¿Limpiar formulario?', '¿Estás seguro de que querés borrar todo el contenido?', () => {
            doClear();
            Toast.info('Formulario limpiado');
        });
    } else {
        doClear();
    }
}

/* =====================================================
   Markdown Toolbar
   ===================================================== */

function insertMarkdown(action) {
    const textarea = elements.postContent;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = textarea.value.substring(start, end);

    let insertion = '';
    let cursorOffset = 0;

    switch (action) {
        case 'h1':
            insertion = `\n# ${selectedText || 'Título Principal'}`;
            cursorOffset = selectedText ? insertion.length : 3;
            break;
        case 'h2':
            insertion = `\n## ${selectedText || 'Subtítulo'}`;
            cursorOffset = selectedText ? insertion.length : 4;
            break;
        case 'h3':
            insertion = `\n### ${selectedText || 'Sección'}`;
            cursorOffset = selectedText ? insertion.length : 5;
            break;
        case 'bold':
            insertion = `**${selectedText || 'texto en negrita'}**`;
            cursorOffset = selectedText ? insertion.length : 2;
            break;
        case 'italic':
            insertion = `*${selectedText || 'texto en cursiva'}*`;
            cursorOffset = selectedText ? insertion.length : 1;
            break;
        case 'strikethrough':
            insertion = `~~${selectedText || 'texto tachado'}~~`;
            cursorOffset = selectedText ? insertion.length : 2;
            break;
        case 'quote':
            insertion = `\n> ${selectedText || 'Cita de texto...'}`;
            cursorOffset = selectedText ? insertion.length : 3;
            break;
        case 'code':
            if (selectedText.includes('\n')) {
                insertion = `\n\`\`\`\n${selectedText}\n\`\`\`\n`;
                cursorOffset = 5; // After first ```
            } else {
                insertion = `\n\`\`\`\n${selectedText || 'código'}\n\`\`\`\n`;
                cursorOffset = selectedText ? insertion.length - 4 : 5;
            }
            break;
        case 'ul':
            insertion = `\n- ${selectedText || 'Elemento de lista'}`;
            cursorOffset = selectedText ? insertion.length : 3;
            break;
        case 'ol':
            insertion = `\n1. ${selectedText || 'Elemento numerado'}`;
            cursorOffset = selectedText ? insertion.length : 4;
            break;
        case 'checklist':
            insertion = `\n- [ ] ${selectedText || 'Tarea pendiente'}`;
            cursorOffset = selectedText ? insertion.length : 7;
            break;
        case 'link':
            insertion = `[${selectedText || 'texto del enlace'}](url)`;
            cursorOffset = selectedText ? insertion.length - 4 : 1;
            break;
        case 'image':
            insertion = `![${selectedText || 'texto alternativo'}](url-imagen)`;
            cursorOffset = selectedText ? insertion.length - 11 : 2;
            break;
        case 'table':
            insertion = `\n| Encabezado 1 | Encabezado 2 |\n| ------------ | ------------ |\n| Celda 1      | Celda 2      |\n`;
            cursorOffset = insertion.length;
            break;
        case 'hr':
            insertion = '\n\n---\n\n';
            cursorOffset = insertion.length;
            break;
    }

    textarea.value = textarea.value.substring(0, start) + insertion + textarea.value.substring(end);
    textarea.focus();

    const newPos = start + cursorOffset;
    textarea.setSelectionRange(newPos, newPos);

    updatePreview();
}

/* =====================================================
   Publish Post
   ===================================================== */

async function handlePublish(e) {
    e.preventDefault();

    const title = elements.postTitle.value.trim();
    const description = elements.postDescription.value.trim();
    const content = elements.postContent.value.trim();

    // Validation
    if (!title || !description || !content) {
        Toast.error('Por favor, completá todos los campos.', 'Datos incompletos');
        return;
    }

    if (title.length < 10) {
        Toast.error('El título debe tener al menos 10 caracteres.', 'Título muy corto');
        return;
    }

    if (description.length < 50) {
        Toast.error('La descripción debe tener al menos 50 caracteres.', 'Descripción muy corta');
        return;
    }

    if (content.length < 100) {
        Toast.error('El contenido debe tener al menos 100 caracteres.', 'Contenido muy corto');
        return;
    }

    setPublishLoading(true);

    try {
        // Get current session for auth
        const { data: { session }, error: sessionError } = await supabaseClient.auth.getSession();

        if (sessionError || !session || !session.access_token) {
            throw new Error('No estás autenticado. Por favor, volvé a iniciar sesión.');
        }


        const isEditing = currentEditingPost !== null;
        const slug = isEditing ? currentEditingPost.slug : generateSlug(title);
        const publishDate = isEditing ? currentEditingPost.publish_date : new Date().toISOString().split('T')[0]; // YYYY-MM-DD

        const postData = {
            title,
            description,
            content,
            slug,
            publishDate
        };

        // Call the appropriate API (update or publish)
        const apiUrl = isEditing ? CONFIG.UPDATE_API_URL : CONFIG.PUBLISH_API_URL;

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(postData)
        });

        const result = await response.json();

        if (!response.ok) {
            throw new Error(result.error || `Error al ${isEditing ? 'actualizar' : 'publicar'} el artículo`);
        }

        // Success! Clear the blog cache
        clearBlogCache();
        await loadPosts(); // Reload posts list
        showPostsManagement();
        Toast.success(isEditing ? '¡Artículo actualizado exitosamente!' : '¡Artículo publicado exitosamente!', isEditing ? 'Actualizado' : 'Publicado');

    } catch (error) {
        console.error('Publish error:', error);
        Toast.error(error.message || `Error al ${currentEditingPost ? 'actualizar' : 'publicar'} el artículo. Intentá de nuevo.`);
    } finally {
        setPublishLoading(false);
    }
}

// Publish loading state
function setPublishLoading(loading) {
    elements.publishBtn.disabled = loading;
    elements.clearBtn.disabled = loading;
    elements.publishBtn.querySelector('.btn-text').style.display = loading ? 'none' : 'inline';
    elements.publishBtn.querySelector('.btn-loading').style.display = loading ? 'inline-flex' : 'none';
}

/* =====================================================
   Modals
   ===================================================== */

function showSuccess(slug, customMessage = null, type = 'blog') {
    const successModal = elements.successModal;
    const titleElement = successModal.querySelector('h2');
    const messageElement = successModal.querySelector('p');
    const viewLinkElement = elements.viewPostLink;
    const newActionBtn = successModal.querySelector('button');

    // Update title and messages based on type
    if (type === 'faq') {
        titleElement.textContent = '¡Pregunta Guardada!';
        messageElement.textContent = customMessage || 'Tu pregunta fue guardada exitosamente y ya está disponible en el sitio.';
        viewLinkElement.style.display = 'none';
        newActionBtn.textContent = 'Crear Otra';
    } else {
        titleElement.textContent = '¡Artículo Publicado!';
        messageElement.textContent = customMessage || 'Tu artículo fue publicado exitosamente. En unos minutos estará disponible en el blog.';
        if (slug) {
            viewLinkElement.href = `${CONFIG.BLOG_BASE_URL}?slug=${slug}`;
            viewLinkElement.style.display = 'inline-block';
        } else {
            viewLinkElement.style.display = 'none';
        }
        newActionBtn.textContent = 'Escribir Otro';
    }

    elements.successModal.style.display = 'flex';
}

function hideSuccess() {
    elements.successModal.style.display = 'none';
}

function showError(message, type = 'blog') {
    const errorModal = elements.errorModal;
    const titleElement = errorModal.querySelector('h2');
    
    // Update title based on type
    if (type === 'faq') {
        titleElement.textContent = 'Error al Guardar';
    } else {
        titleElement.textContent = 'Error al Publicar';
    }
    
    elements.errorMessage.textContent = message;
    elements.errorModal.style.display = 'flex';
}

function hideError() {
    elements.errorModal.style.display = 'none';
}

async function handleNewPost() {
    hideSuccess();
    currentEditingPost = null;
    await loadPosts();
    showPostsManagement();
}

/* =====================================================
   Event Listeners
   ===================================================== */

// Auth
elements.loginForm.addEventListener('submit', handleLogin);
elements.logoutBtn.addEventListener('click', handleLogout);

// Posts Management
if (elements.newPostToggleBtn) {
    elements.newPostToggleBtn.addEventListener('click', () => showEditor(false));
}
if (elements.cancelEditBtn) {
    elements.cancelEditBtn.addEventListener('click', cancelEdit);
}

// Handle "new post" triggers from empty state
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('new-post-trigger')) {
        showEditor(false);
    }
    if (e.target.classList.contains('new-faq-trigger')) {
        showFAQEditor(false);
    }
});

// Form inputs
elements.postTitle.addEventListener('input', () => {
    updateCharCount(elements.postTitle, elements.titleCount, 10, 100);
    updatePreview();
});

elements.postDescription.addEventListener('input', () => {
    updateCharCount(elements.postDescription, elements.descCount, 50, 160);
    updatePreview();
});

elements.postContent.addEventListener('input', () => {
    updateCharCount(elements.postContent, elements.contentCount, 100, null);
    updatePreview();
});

// Form actions
elements.postForm.addEventListener('submit', handlePublish);
elements.clearBtn.addEventListener('click', clearForm);

// Markdown toolbar
document.querySelectorAll('.toolbar-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        insertMarkdown(btn.dataset.action);
    });
});

// Keyboard shortcuts for markdown
elements.postContent.addEventListener('keydown', (e) => {
    if (e.ctrlKey || e.metaKey) {
        switch (e.key.toLowerCase()) {
            case 'b':
                e.preventDefault();
                insertMarkdown('bold');
                break;
            case 'i':
                e.preventDefault();
                insertMarkdown('italic');
                break;
        }
    }
});

/* =====================================================
   FAQ MANAGEMENT
   ===================================================== */

// Load all FAQs
async function loadFAQs() {
    // Check cache first
    const cachedFaqs = getCachedAdminFAQs();
    if (cachedFaqs) {
        allFaqs = cachedFaqs;
        elements.faqLoading.style.display = 'none';
        
        if (allFaqs.length === 0) {
            elements.faqEmpty.style.display = 'flex';
            elements.faqList.style.display = 'none';
        } else {
            elements.faqEmpty.style.display = 'none';
            elements.faqList.style.display = 'block';
            renderFAQsList();
        }
        return;
    }

    // Show loading state
    elements.faqLoading.style.display = 'block';
    elements.faqList.style.display = 'none';
    elements.faqEmpty.style.display = 'none';

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        const headers = {};
        if (session) {
            headers['Authorization'] = `Bearer ${CONFIG.SUPABASE_ANON_KEY}`;
        } else {
            headers['Authorization'] = `Bearer ${session.access_token}`;
        }

        const response = await fetch(CONFIG.GET_FAQS_API_URL, { headers });
        
        if (!response.ok) {
            throw new Error('Failed to fetch FAQs');
        }

        allFaqs = await response.json();

        // Cache the FAQs
        setCachedAdminFAQs(allFaqs);

        elements.faqLoading.style.display = 'none';

        if (allFaqs.length === 0) {
            elements.faqEmpty.style.display = 'flex';
        } else {
            elements.faqList.style.display = 'block';
            renderFAQsList();
        }
    } catch (error) {
        console.error('Error loading FAQs:', error);
        elements.faqLoading.style.display = 'none';
        elements.faqEmpty.style.display = 'flex';
        Toast.error('Error al cargar las preguntas frecuentes', 'Error');
    }
}

// Render FAQs list
function renderFAQsList() {
    if (!elements.faqList) return;

    // Sort by order_number
    const sortedFaqs = [...allFaqs].sort((a, b) => a.order_number - b.order_number);

    elements.faqList.innerHTML = sortedFaqs.map(faq => `
        <div class="faq-item" draggable="true" data-faq-id="${faq.id}" data-order="${faq.order_number}">
            <div class="faq-item-content">
                <div class="faq-item-question">
                    <span class="faq-item-drag-handle" title="Arrastrá para reordenar">
                        <img src="../assets/icons/grip-vertical.svg" width="16" height="16" alt="">
                    </span>
                    <span>${escapeHtml(faq.question)}</span>
                </div>
                <div class="faq-item-meta">
                    <span class="faq-item-category-badge category-${faq.category}">${getCategoryLabel(faq.category)}</span>
                </div>
            </div>
            <div class="faq-item-actions">
                <button class="btn btn-sm btn-primary" onclick="editFAQ('${faq.id}')" title="Editar pregunta">
                    <img src="../assets/icons/square-pen.svg" width="16" height="16" alt="">
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteFAQ('${faq.id}', \`${escapeHtml(faq.question)}\`)" title="Eliminar pregunta">
                    <img src="../assets/icons/trash-2.svg" width="16" height="16" alt="">
                    Eliminar
                </button>
            </div>
        </div>
    `).join('');

    // Attach drag and drop handlers
    attachFAQDragHandlers();
}

// Get category label
function getCategoryLabel(category) {
    const labels = {
        general: 'General',
        cobertura: 'Coberturas',
        cotizacion: 'Cotización',
        art: 'ART',
        siniestro: 'Siniestros',
        vehiculos: 'Vehículos'
    };
    return labels[category] || category;
}

// Attach drag and drop handlers
function attachFAQDragHandlers() {
    const faqItems = document.querySelectorAll('.faq-item');
    
    faqItems.forEach(item => {
        item.addEventListener('dragstart', handleFAQDragStart);
        item.addEventListener('dragend', handleFAQDragEnd);
        item.addEventListener('dragover', handleFAQDragOver);
        item.addEventListener('drop', handleFAQDrop);
        item.addEventListener('dragleave', handleFAQDragLeave);
    });
}

function handleFAQDragStart(e) {
    draggedFaqElement = this;
    this.classList.add('dragging');
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/html', this.innerHTML);
}

function handleFAQDragEnd(e) {
    this.classList.remove('dragging');
    // Remove drag-over class from all items
    document.querySelectorAll('.faq-item').forEach(item => {
        item.classList.remove('drag-over');
    });
}

function handleFAQDragOver(e) {
    if (e.preventDefault) {
        e.preventDefault();
    }
    this.classList.add('drag-over');
    e.dataTransfer.dropEffect = 'move';
    return false;
}

function handleFAQDragLeave(e) {
    this.classList.remove('drag-over');
}

function handleFAQDrop(e) {
    if (e.stopPropagation) {
        e.stopPropagation();
    }

    if (draggedFaqElement !== this) {
        // Swap the FAQs
        const draggedId = draggedFaqElement.dataset.faqId;
        const droppedId = this.dataset.faqId;

        const draggedFaq = allFaqs.find(f => f.id === draggedId);
        const droppedFaq = allFaqs.find(f => f.id === droppedId);

        if (draggedFaq && droppedFaq) {
            // Swap order numbers
            const tempOrder = draggedFaq.order_number;
            draggedFaq.order_number = droppedFaq.order_number;
            droppedFaq.order_number = tempOrder;

            // Update both FAQs in the backend
            updateFAQOrder(draggedFaq);
            updateFAQOrder(droppedFaq);

            // Re-render the list
            renderFAQsList();
            Toast.success('Orden actualizado correctamente');
        }
    }

    this.classList.remove('drag-over');
    return false;
}

// Update FAQ order in backend
async function updateFAQOrder(faq) {
    try {
        await fetch(CONFIG.UPDATE_FAQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                id: faq.id,
                question: faq.question,
                answer: faq.answer,
                category: faq.category,
                order_number: faq.order_number
            })
        });
        
        // Clear the FAQ cache when order changes
        clearFAQCache();
    } catch (error) {
        console.error('Error updating FAQ order:', error);
    }
}

// Show FAQ management section
function showFAQManagement() {
    elements.postsManagement.style.display = 'none';
    elements.editorContainer.style.display = 'none';
    elements.faqManagement.style.display = 'block';
    elements.faqEditorContainer.style.display = 'none';
    document.querySelector('.admin-nav').style.display = 'flex';
    currentEditingFaq = null;

    // Update navigation
    elements.showBlogBtn.classList.remove('active');
    elements.showFaqBtn.classList.add('active');
    
    // Reload FAQs to ensure proper state
    loadFAQs();
}

// Show FAQ editor
function showFAQEditor(isEdit = false) {
    elements.faqManagement.style.display = 'none';
    elements.faqEditorContainer.style.display = 'grid';
    document.querySelector('.admin-nav').style.display = 'none';

    if (isEdit) {
        elements.faqEditorTitle.textContent = 'Editar Pregunta';
        elements.saveFaqBtn.querySelector('.btn-text').textContent = 'Actualizar Pregunta';
    } else {
        elements.faqEditorTitle.textContent = 'Nueva Pregunta';
        elements.saveFaqBtn.querySelector('.btn-text').textContent = 'Guardar Pregunta';
        elements.faqForm.reset();
        currentEditingFaq = null;
        updateCharCount(elements.faqQuestion, elements.questionCount, 10, 200);
        updateCharCount(elements.faqAnswer, elements.answerCount, 20, null);
        updateFAQPreview();
    }

    // Focus on question input
    elements.faqQuestion.focus();
}

// Edit FAQ
async function editFAQ(faqId) {
    const faq = allFaqs.find(f => f.id === faqId);
    if (!faq) {
        Toast.error('Pregunta no encontrada', 'Error');
        return;
    }

    currentEditingFaq = faq;
    showFAQEditor(true);

    // Populate form
    elements.faqQuestion.value = faq.question;
    elements.faqCategory.value = faq.category;
    elements.faqAnswer.value = faq.answer;

    // Update character counts and preview
    updateCharCount(elements.faqQuestion, elements.questionCount, 10, 200);
    updateCharCount(elements.faqAnswer, elements.answerCount, 20, null);
    updateFAQPreview();
}

// Save FAQ (create or update)
async function saveFAQ(e) {
    e.preventDefault();

    const question = elements.faqQuestion.value.trim();
    const category = elements.faqCategory.value;
    const answer = elements.faqAnswer.value.trim();

    // Auto-assign order_number based on existing FAQs count
    const order_number = currentEditingFaq ? currentEditingFaq.order_number : allFaqs.length;

    // Validation
    if (!question || !category || !answer) {
        Toast.error('Por favor, completá todos los campos obligatorios.', 'Datos incompletos');
        return;
    }

    if (question.length < 10) {
        Toast.error('La pregunta debe tener al menos 10 caracteres.', 'Pregunta muy corta');
        return;
    }

    if (answer.length < 20) {
        Toast.error('La respuesta debe tener al menos 20 caracteres.', 'Respuesta muy corta');
        return;
    }

    setSaveFAQLoading(true);

    try {
        const apiUrl = currentEditingFaq ? CONFIG.UPDATE_FAQ_API_URL : CONFIG.CREATE_FAQ_API_URL;
        const payload = currentEditingFaq
            ? { id: currentEditingFaq.id, question, answer, category, order_number }
            : { question, answer, category, order_number };

        console.log('Calling:', apiUrl, 'with payload:', payload);

        const response = await fetch(apiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(payload)
        });

        console.log('Response status:', response.status);

        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error response:', errorData);
            throw new Error(errorData.error || 'Error al guardar');
        }

        const savedFaq = await response.json();

        // Clear the FAQ cache
        clearFAQCache();

        Toast.success(
            currentEditingFaq ? '¡Pregunta actualizada exitosamente!' : '¡Pregunta creada exitosamente!',
            currentEditingFaq ? 'Actualizada' : 'Creada'
        );

        // Reload FAQs and show management
        await loadFAQs();
        showFAQManagement();

    } catch (error) {
        console.error('Error saving FAQ:', error);
        Toast.error(error.message || 'Error al guardar la pregunta', 'Error');
    } finally {
        setSaveFAQLoading(false);
    }
}

// Delete FAQ
async function deleteFAQ() {
    if (!currentEditingFaq) return;

    setDeleteLoading(true);

    try {
        const response = await fetch(CONFIG.DELETE_FAQ_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ id: currentEditingFaq.id })
        });

        if (!response.ok) {
            throw new Error('Error al eliminar');
        }

        // Clear the FAQ cache
        clearFAQCache();

        Toast.success('Pregunta eliminada correctamente', 'Eliminada');
        hideDeleteModal();

        // Reload FAQs
        await loadFAQs();
        showFAQManagement();
        currentEditingFaq = null;

    } catch (error) {
        console.error('Error deleting FAQ:', error);
        Toast.error('Error al eliminar la pregunta', 'Error');
    } finally {
        setDeleteLoading(false);
    }
}

// Confirm delete FAQ
function confirmDeleteFAQ(faqId, question) {
    const faq = allFaqs.find(f => f.id === faqId);
    if (!faq) return;

    currentEditingFaq = faq;
    
    // Update modal for FAQ deletion
    const deleteModal = elements.deleteModal;
    const titleElement = deleteModal.querySelector('h2');
    titleElement.textContent = '¿Eliminar Pregunta?';
    elements.deleteMessage.textContent = '¿Estás seguro de que querés eliminar esta pregunta? Esta acción no se puede deshacer.';
    elements.deletePostTitle.textContent = question;
    elements.deleteModal.style.display = 'flex';
}

// Set loading state for save FAQ button
function setSaveFAQLoading(loading) {
    elements.saveFaqBtn.disabled = loading;
    elements.clearFaqBtn.disabled = loading;
    elements.saveFaqBtn.querySelector('.btn-text').style.display = loading ? 'none' : 'inline';
    elements.saveFaqBtn.querySelector('.btn-loading').style.display = loading ? 'inline-flex' : 'none';
}

// Update FAQ preview
function updateFAQPreview() {
    const question = elements.faqQuestion.value.trim() || 'Tu pregunta aparecerá aquí';
    const category = elements.faqCategory.value || 'general';
    const answer = elements.faqAnswer.value.trim();

    elements.faqPreviewQuestion.textContent = question;
    elements.faqPreviewCategory.textContent = getCategoryLabel(category);
    elements.faqPreviewCategory.className = `faq-preview-category category-${category}`;

    if (answer) {
        elements.faqPreviewAnswer.innerHTML = answer;
    } else {
        elements.faqPreviewAnswer.innerHTML = '<p class="placeholder-text">La respuesta aparecerá aquí mientras escribís...</p>';
    }
}

// Simple HTML formatting toolbar for FAQ answer
function setupFAQToolbar() {
    const toolbar = document.querySelector('.faq-toolbar');
    if (!toolbar) return;

    toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.toolbar-btn');
        if (!btn) return;

        const action = btn.dataset.action;
        const textarea = elements.faqAnswer;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selectedText = textarea.value.substring(start, end);

        let replacement = '';

        switch (action) {
            case 'bold':
                replacement = `<strong>${selectedText || 'texto en negrita'}</strong>`;
                break;
            case 'italic':
                replacement = `<em>${selectedText || 'texto en cursiva'}</em>`;
                break;
            case 'ul':
                replacement = `<ul>\n  <li>${selectedText || 'Elemento de lista'}</li>\n  <li>Elemento 2</li>\n</ul>`;
                break;
            case 'ol':
                replacement = `<ol>\n  <li>${selectedText || 'Elemento de lista'}</li>\n  <li>Elemento 2</li>\n</ol>`;
                break;
            case 'link':
                const url = prompt('Ingresá la URL:');
                if (url) {
                    replacement = `<a href="${url}">${selectedText || 'texto del enlace'}</a>`;
                }
                break;
            case 'p':
                replacement = `<p>${selectedText || 'Tu párrafo aquí'}</p>`;
                break;
        }

        if (replacement) {
            textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
            textarea.focus();
            updateFAQPreview();
        }
    });
}

// Navigation between Blog and FAQ
function setupNavigation() {
    elements.showBlogBtn.addEventListener('click', () => {
        elements.postsManagement.style.display = 'block';
        elements.faqManagement.style.display = 'none';
        elements.editorContainer.style.display = 'none';
        elements.faqEditorContainer.style.display = 'none';
        
        elements.showBlogBtn.classList.add('active');
        elements.showFaqBtn.classList.remove('active');
        
        loadPosts();
    });

    elements.showFaqBtn.addEventListener('click', () => {
        showFAQManagement();
        loadFAQs();
    });
}

/* =====================================================
   Event Listeners (Blog Posts)
   ===================================================== */

// Modal buttons
elements.newPostBtn.addEventListener('click', handleNewPost);
elements.closeErrorBtn.addEventListener('click', hideError);
elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
elements.confirmDeleteBtn.addEventListener('click', () => {
    // Check if we're deleting a FAQ or a post
    if (currentEditingFaq) {
        deleteFAQ();
    } else {
        deletePost();
    }
});

// Close modals on backdrop click
elements.successModal.addEventListener('click', (e) => {
    if (e.target === elements.successModal) hideSuccess();
});

elements.errorModal.addEventListener('click', (e) => {
    if (e.target === elements.errorModal) hideError();
});

elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) hideDeleteModal();
});

/* =====================================================
   FAQ Event Listeners
   ===================================================== */

// FAQ Form submission
if (elements.faqForm) {
    elements.faqForm.addEventListener('submit', saveFAQ);
}

// FAQ buttons
if (elements.newFaqToggleBtn) {
    elements.newFaqToggleBtn.addEventListener('click', () => showFAQEditor(false));
}

if (elements.cancelFaqEditBtn) {
    elements.cancelFaqEditBtn.addEventListener('click', cancelFAQEdit);
}

if (elements.clearFaqBtn) {
    elements.clearFaqBtn.addEventListener('click', () => {
        if (elements.faqForm) elements.faqForm.reset();
        updateCharCount(elements.faqQuestion, elements.questionCount, 10, 200);
        updateCharCount(elements.faqAnswer, elements.answerCount, 20, null);
        updateFAQPreview();
    });
}

// FAQ live preview updates
if (elements.faqQuestion) {
    elements.faqQuestion.addEventListener('input', () => {
        updateCharCount(elements.faqQuestion, elements.questionCount, 10, 200);
        updateFAQPreview();
    });
}

if (elements.faqCategory) {
    elements.faqCategory.addEventListener('change', updateFAQPreview);
}

if (elements.faqAnswer) {
    elements.faqAnswer.addEventListener('input', () => {
        updateCharCount(elements.faqAnswer, elements.answerCount, 20, null);
        updateFAQPreview();
    });
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    // Load configuration first
    const configLoaded = await loadConfig();
    if (!configLoaded) {
        return; // Stop if config failed to load
    }

    // Then proceed with auth check
    checkAuth();
    updatePreviewDate();
    
    // Setup FAQ toolbar and navigation
    setupFAQToolbar();
    setupNavigation();
});

// Expose functions to global scope for onclick handlers
window.editPost = editPost;
window.confirmDelete = confirmDelete;
window.editFAQ = editFAQ;
window.confirmDeleteFAQ = confirmDeleteFAQ;

