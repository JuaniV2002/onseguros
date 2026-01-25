/* =====================================================
   OnSeguros Admin Panel - JavaScript
   ===================================================== */

// Configuration
const CONFIG = {
    SUPABASE_URL: 'https://tgokvwuiiglioegxgcpu.supabase.co',
    SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InRnb2t2d3VpaWdsaW9lZ3hnY3B1Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzcxMzIxMDcsImV4cCI6MjA1MjcwODEwN30.GJfptLVMbxWV4WNsIhMJBPJlz2X3xIYRuSflg9oHR-c',
    // The Netlify function URL for publishing posts
    PUBLISH_API_URL: 'https://onseguros-newsletter.netlify.app/api/publish-post',
    BLOG_BASE_URL: 'https://www.onseguros.com.ar/blog/post.html'
};

// Initialize Supabase client
const supabase = window.supabase.createClient(CONFIG.SUPABASE_URL, CONFIG.SUPABASE_ANON_KEY);

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
    
    // Post Form
    postForm: document.getElementById('post-form'),
    postTitle: document.getElementById('post-title'),
    postDescription: document.getElementById('post-description'),
    postContent: document.getElementById('post-content'),
    publishBtn: document.getElementById('publish-btn'),
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
    closeErrorBtn: document.getElementById('close-error-btn')
};

/* =====================================================
   Authentication
   ===================================================== */

// Check auth state on page load
async function checkAuth() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        showAdminScreen(session.user);
    } else {
        showLoginScreen();
    }
}

// Listen for auth state changes
supabase.auth.onAuthStateChange((event, session) => {
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
}

// Handle login
async function handleLogin(e) {
    e.preventDefault();
    
    const email = elements.emailInput.value.trim();
    const password = elements.passwordInput.value;
    
    setLoginLoading(true);
    hideLoginError();
    
    try {
        const { data, error } = await supabase.auth.signInWithPassword({
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
    await supabase.auth.signOut();
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
function clearForm() {
    if (confirm('¿Estás seguro de que querés limpiar el formulario?')) {
        elements.postForm.reset();
        updatePreview();
        updateCharCount(elements.postTitle, elements.titleCount, 100);
        updateCharCount(elements.postDescription, elements.descCount, 160);
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
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session) {
            throw new Error('No estás autenticado');
        }
        
        const slug = generateSlug(title);
        const publishDate = new Date().toISOString().split('T')[0]; // YYYY-MM-DD
        
        const postData = {
            title,
            description,
            content,
            slug,
            publishDate,
            markdownFile: `${slug}.md`
        };
        
        // Call the publish API
        const response = await fetch(CONFIG.PUBLISH_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify(postData)
        });
        
        const result = await response.json();
        
        if (!response.ok) {
            throw new Error(result.error || 'Error al publicar el artículo');
        }
        
        // Success!
        showSuccess(slug);
        
    } catch (error) {
        console.error('Publish error:', error);
        showError(error.message || 'Error al publicar el artículo. Intentá de nuevo.');
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

function showSuccess(slug) {
    elements.viewPostLink.href = `${CONFIG.BLOG_BASE_URL}?slug=${slug}`;
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
    elements.postForm.reset();
    updatePreview();
    updateCharCount(elements.postTitle, elements.titleCount, 100);
    updateCharCount(elements.postDescription, elements.descCount, 160);
}

/* =====================================================
   Event Listeners
   ===================================================== */

// Auth
elements.loginForm.addEventListener('submit', handleLogin);
elements.logoutBtn.addEventListener('click', handleLogout);

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

// Close modals on backdrop click
elements.successModal.addEventListener('click', (e) => {
    if (e.target === elements.successModal) hideSuccess();
});

elements.errorModal.addEventListener('click', (e) => {
    if (e.target === elements.errorModal) hideError();
});

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
    checkAuth();
    updatePreviewDate();
});
