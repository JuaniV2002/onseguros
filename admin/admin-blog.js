/* =====================================================
   OnSeguros Admin Panel - Blog Module
   Blog CRUD, editor, and related functionality
   ===================================================== */

// State
let currentEditingPost = null;
let allPosts = [];

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

        const response = await fetch(CONFIG.DELETE_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session.access_token}`
            },
            body: JSON.stringify({ id: currentEditingPost.id })
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

// Helper functions
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

        // Include ID when editing
        if (isEditing) {
            postData.id = currentEditingPost.id;
        }

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
   Blog Event Listeners
   ===================================================== */

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
   Modal Event Listeners
   ===================================================== */

// Success modal
elements.newPostBtn.addEventListener('click', async () => {
    currentEditingPost = null;
    await loadPosts();
    showPostsManagement();
});

// Close modals on backdrop click
elements.successModal.addEventListener('click', (e) => {
    if (e.target === elements.successModal) {
        elements.successModal.style.display = 'none';
    }
});

elements.errorModal.addEventListener('click', (e) => {
    if (e.target === elements.errorModal) {
        elements.errorModal.style.display = 'none';
    }
});

elements.deleteModal.addEventListener('click', (e) => {
    if (e.target === elements.deleteModal) hideDeleteModal();
});

// Error modal
elements.closeErrorBtn.addEventListener('click', () => {
    elements.errorModal.style.display = 'none';
});

// Delete post via modal
elements.confirmDeleteBtn.addEventListener('click', () => {
    // Check if we're deleting a FAQ or a post
    if (currentEditingFaq) {
        deleteFAQ();
    } else {
        deletePost();
    }
});

// Cancel delete
elements.cancelDeleteBtn.addEventListener('click', hideDeleteModal);

/* =====================================================
   Expose to Global Scope
   ===================================================== */

// Expose to global scope for onclick handlers
window.editPost = editPost;
window.confirmDelete = confirmDelete;
