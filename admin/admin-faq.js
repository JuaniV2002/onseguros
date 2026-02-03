/* =====================================================
   OnSeguros Admin Panel - FAQ Module
   FAQ CRUD, editor, drag-drop ordering
   ===================================================== */

// State
let currentEditingFaq = null;
let allFaqs = [];
let draggedFaqElement = null;

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
   FAQ Event Listeners
   ===================================================== */

// Handle "new faq" triggers from empty state
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('new-faq-trigger')) {
        showFAQEditor(false);
    }
});

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

// Delete FAQ via modal
document.addEventListener('DOMContentLoaded', () => {
    // This is handled in admin-blog.js confirmDeleteBtn listener
    // But we need to ensure deleteFAQ is accessible
});

// Expose to global scope for onclick handlers
window.editFAQ = editFAQ;
window.confirmDeleteFAQ = confirmDeleteFAQ;

// Initialize FAQ features after DOM is ready
document.addEventListener('DOMContentLoaded', async () => {
    setupFAQToolbar();
    setupNavigation();
});
