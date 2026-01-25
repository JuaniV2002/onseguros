/* =====================================================
   OnSeguros Admin Panel - JavaScript
   ===================================================== */

// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://tgokvwuiiglioegxgcpu.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnb2t2d3VpaWdsaW9lZ3hnY3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjkzMDMwNDgsImV4cCI6MjA4NDg3OTA0OH0.iipq27bUMQTlhLfYB2Ldi3VqgtTEG6tVqa2B4jDcsqk',
    // The Netlify function URL for publishing posts
    PUBLISH_API_URL: 'https://onseguros-newsletter.netlify.app/api/publish-post',
    UPDATE_API_URL: 'https://onseguros-newsletter.netlify.app/api/update-post',
    DELETE_API_URL: 'https://onseguros-newsletter.netlify.app/api/delete-post',
    POSTS_JSON_URL: '/blog/data/posts.json',
    BLOG_BASE_URL: 'https://www.onseguros.net/blog/post.html'
};

// Initialize Supabase client
const supabaseClient = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

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
    confirmDeleteBtn: document.getElementById('confirm-delete-btn')
};

// State
let currentEditingPost = null;
let allPosts = [];

/* =====================================================
   Authentication
   ===================================================== */

// Check auth state on page load
async function checkAuth() {
    const { data: { session } } = await supabaseClient.auth.getSession();
    
    if (session) {
        showAdminScreen(session.user);
    } else {
        showLoginScreen();
    }
}

// Listen for auth state changes
supabaseClient.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
        showAdminScreen(session.user);
    } else if (event === 'SIGNED_OUT') {
        showLoginScreen();
    }
});

// Show login screen
function showLoginScreen() {
    elements.loginScreen.style.display = 'flex';
    elements.adminScreen.style.display = 'none';
    elements.loginForm.reset();
    hideLoginError();
}

// Show admin screen
function showAdminScreen(user) {
    elements.loginScreen.style.display = 'none';
    elements.adminScreen.style.display = 'block';
    elements.userEmail.textContent = user.email;
    updatePreviewDate();
    loadPosts(); // Load existing posts
    showPostsManagement(); // Show posts list by default
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
    elements.postsLoading.style.display = 'flex';
    elements.postsList.innerHTML = '';
    elements.postsEmpty.style.display = 'none';
    
    try {
        const response = await fetch(CONFIG.POSTS_JSON_URL + '?t=' + Date.now());
        
        if (!response.ok) {
            throw new Error('Failed to load posts');
        }
        
        const data = await response.json();
        allPosts = data.posts || [];
        
        // Sort posts by date (newest first)
        allPosts.sort((a, b) => new Date(b.publishDate) - new Date(a.publishDate));
        
        elements.postsLoading.style.display = 'none';
        
        if (allPosts.length === 0) {
            elements.postsEmpty.style.display = 'flex';
            return;
        }
        
        renderPosts();
    } catch (error) {
        console.error('Error loading posts:', error);
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
                    <span class="post-item-date">${formatDate(post.publishDate)}</span>
                    <span>•</span>
                    <span class="post-item-slug">${post.slug}</span>
                </div>
            </div>
            <div class="post-item-actions">
                <a href="${CONFIG.BLOG_BASE_URL}?slug=${post.slug}" target="_blank" class="btn btn-sm btn-secondary" title="Ver artículo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                        <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    Ver
                </a>
                <button class="btn btn-sm btn-primary" onclick="editPost('${post.slug}')" title="Editar artículo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Editar
                </button>
                <button class="btn btn-sm btn-danger" onclick="confirmDelete('${post.slug}')" title="Eliminar artículo">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                    </svg>
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
    currentEditingPost = null;
}

// Show editor section
function showEditor(isEdit = false) {
    elements.postsManagement.style.display = 'none';
    elements.editorContainer.style.display = 'grid';
    
    if (isEdit) {
        elements.editorTitle.textContent = 'Editar Artículo';
        elements.cancelEditBtn.style.display = 'inline-block';
        elements.publishBtnText.textContent = 'Actualizar Artículo';
        elements.publishLoadingText.textContent = 'Actualizando...';
    } else {
        elements.editorTitle.textContent = 'Nuevo Artículo';
        elements.cancelEditBtn.style.display = 'none';
        elements.publishBtnText.textContent = 'Publicar Artículo';
        elements.publishLoadingText.textContent = 'Publicando...';
        clearForm(false); // Clear without confirmation
    }
}

// Edit post
async function editPost(slug) {
    const post = allPosts.find(p => p.slug === slug);
    if (!post) {
        showError('No se encontró el artículo');
        return;
    }
    
    currentEditingPost = post;
    showEditor(true);
    
    // Load post data into form
    elements.postTitle.value = post.title;
    elements.postDescription.value = post.description;
    
    // Load markdown content
    try {
        const response = await fetch(`/blog/posts/${post.markdownFile}?t=${Date.now()}`);
        if (response.ok) {
            const content = await response.text();
            elements.postContent.value = content;
        } else {
            elements.postContent.value = '';
            showError('No se pudo cargar el contenido del artículo');
        }
    } catch (error) {
        console.error('Error loading post content:', error);
        elements.postContent.value = '';
    }
    
    // Update character counts and preview
    updateCharCount(elements.postTitle, elements.titleCount, 100);
    updateCharCount(elements.postDescription, elements.descCount, 160);
    updatePreview();
}

// Confirm delete
function confirmDelete(slug) {
    const post = allPosts.find(p => p.slug === slug);
    if (!post) return;
    
    currentEditingPost = post;
    elements.deletePostTitle.textContent = `"${post.title}"`;
    elements.deleteModal.style.display = 'flex';
}

// Delete post
async function deletePost() {
    if (!currentEditingPost) return;
    
    setDeleteLoading(true);
    
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            throw new Error('No estás autenticado');
        }
        
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
        
        hideDeleteModal();
        await loadPosts(); // Reload posts
        showSuccess(null, '¡Artículo eliminado exitosamente!');
        
    } catch (error) {
        console.error('Delete error:', error);
        hideDeleteModal();
        showError(error.message || 'Error al eliminar el artículo. Intentá de nuevo.');
    } finally {
        setDeleteLoading(false);
    }
}

// Cancel edit
function cancelEdit() {
    if (currentEditingPost) {
        const confirmCancel = confirm('¿Querés cancelar la edición? Los cambios no guardados se perderán.');
        if (!confirmCancel) return;
    }
    currentEditingPost = null;
    showPostsManagement();
}

// Helper functions
function formatDate(dateString) {
    const date = new Date(dateString);
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
function updateCharCount(input, countElement, max) {
    const count = input.value.length;
    countElement.textContent = count;
    countElement.style.color = count > max * 0.9 ? 'var(--warning)' : 'var(--gray-400)';
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
function clearForm(confirm = true) {
    if (confirm && window.confirm('¿Estás seguro de que querés limpiar el formulario?')) {
        elements.postForm.reset();
        updatePreview();
        updateCharCount(elements.postTitle, elements.titleCount, 100);
        updateCharCount(elements.postDescription, elements.descCount, 160);
        currentEditingPost = null;
    } else if (!confirm) {
        elements.postForm.reset();
        updatePreview();
        updateCharCount(elements.postTitle, elements.titleCount, 100);
        updateCharCount(elements.postDescription, elements.descCount, 160);
        currentEditingPost = null;
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
        case 'h2':
            insertion = `\n## ${selectedText || 'Título'}`;
            cursorOffset = selectedText ? insertion.length : 4;
            break;
        case 'h3':
            insertion = `\n### ${selectedText || 'Subtítulo'}`;
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
        case 'ul':
            insertion = `\n- ${selectedText || 'Elemento de lista'}`;
            cursorOffset = selectedText ? insertion.length : 3;
            break;
        case 'ol':
            insertion = `\n1. ${selectedText || 'Elemento numerado'}`;
            cursorOffset = selectedText ? insertion.length : 4;
            break;
        case 'link':
            insertion = `[${selectedText || 'texto del enlace'}](url)`;
            cursorOffset = selectedText ? insertion.length - 4 : 1;
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
        showError('Por favor, completá todos los campos.');
        return;
    }
    
    if (title.length < 10) {
        showError('El título debe tener al menos 10 caracteres.');
        return;
    }
    
    if (description.length < 50) {
        showError('La descripción debe tener al menos 50 caracteres.');
        return;
    }
    
    if (content.length < 100) {
        showError('El contenido debe tener al menos 100 caracteres.');
        return;
    }
    
    setPublishLoading(true);
    
    try {
        // Get current session for auth
        const { data: { session } } = await supabaseClient.auth.getSession();
        
        if (!session) {
            throw new Error('No estás autenticado');
        }
        
        const isEditing = currentEditingPost !== null;
        const slug = isEditing ? currentEditingPost.slug : generateSlug(title);
        const publishDate = isEditing ? currentEditingPost.publishDate : new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        const postData = {
            title,
            description,
            content,
            slug,
            publishDate,
            markdownFile: `${slug}.md`
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
        
        // Success!
        await loadPosts(); // Reload posts list
        showSuccess(slug, isEditing ? '¡Artículo actualizado exitosamente!' : '¡Artículo publicado exitosamente!');
        
    } catch (error) {
        console.error('Publish error:', error);
        showError(error.message || `Error al ${currentEditingPost ? 'actualizar' : 'publicar'} el artículo. Intentá de nuevo.`);
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

function showSuccess(slug, customMessage = null) {
    if (slug) {
        elements.viewPostLink.href = `${CONFIG.BLOG_BASE_URL}?slug=${slug}`;
        elements.viewPostLink.style.display = 'inline-block';
    } else {
        elements.viewPostLink.style.display = 'none';
    }
    
    // Update success message if provided
    if (customMessage) {
        const successModal = elements.successModal;
        const messageElement = successModal.querySelector('p');
        messageElement.textContent = customMessage;
    }
    
    elements.successModal.style.display = 'flex';
}

function hideSuccess() {
    elements.successModal.style.display = 'none';
}

function showError(message) {
    elements.errorMessage.textContent = message;
    elements.errorModal.style.display = 'flex';
}

function hideError() {
    elements.errorModal.style.display = 'none';
}

function handleNewPost() {
    hideSuccess();
    currentEditingPost = null;
    showPostsManagement();
}

/* =====================================================
   Event Listeners
   ===================================================== */

// Auth
elements.loginForm.addEventListener('submit', handleLogin);
elements.logoutBtn.addEventListener('click', handleLogout);

// Posts Management
elements.newPostToggleBtn.addEventListener('click', () => showEditor(false));
elements.cancelEditBtn.addEventListener('click', cancelEdit);

// Handle "new post" triggers from empty state
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('new-post-trigger')) {
        showEditor(false);
    }
});

// Form inputs
elements.postTitle.addEventListener('input', () => {
    updateCharCount(elements.postTitle, elements.titleCount, 100);
    updatePreview();
});

elements.postDescription.addEventListener('input', () => {
    updateCharCount(elements.postDescription, elements.descCount, 160);
    updatePreview();
});

elements.postContent.addEventListener('input', updatePreview);

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

// Modal buttons
elements.newPostBtn.addEventListener('click', handleNewPost);
elements.closeErrorBtn.addEventListener('click', hideError);
elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);
elements.confirmDeleteBtn.addEventListener('click', deletePost);

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

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updatePreviewDate();
});

// Expose functions to global scope for onclick handlers
window.editPost = editPost;
window.confirmDelete = confirmDelete;
