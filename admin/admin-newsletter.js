/* =====================================================
   OnSeguros Admin Panel - Newsletter Module
   Newsletter subscribers management
   ===================================================== */

// State
let allSubscribers = [];
let subscriberToDelete = null;

/* =====================================================
   NEWSLETTER MANAGEMENT
   ===================================================== */

// Load all subscribers
async function loadSubscribers() {
    // Show loading state
    elements.newsletterLoading.style.display = 'block';
    elements.newsletterTableContainer.style.display = 'none';
    elements.newsletterEmpty.style.display = 'none';

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        const response = await fetch(CONFIG.GET_SUBSCRIBERS_API_URL, {
            headers: {
                'Authorization': `Bearer ${session?.access_token}`
            }
        });

        if (!response.ok) {
            const errorText = await response.text();
            console.error('Error response:', errorText);
            throw new Error(`Failed to fetch subscribers: ${response.status}`);
        }

        allSubscribers = await response.json();

        elements.newsletterLoading.style.display = 'none';

        if (allSubscribers.length === 0) {
            elements.newsletterEmpty.style.display = 'flex';
            elements.newsletterTableContainer.style.display = 'none';
        } else {
            elements.newsletterEmpty.style.display = 'none';
            elements.newsletterTableContainer.style.display = 'block';
            renderSubscribers();
        }
    } catch (error) {
        console.error('Error loading subscribers:', error);
        elements.newsletterLoading.style.display = 'none';
        elements.newsletterEmpty.style.display = 'flex';
        Toast.error('Error al cargar los suscriptores', 'Error');
    }
}

// Render subscribers table
function renderSubscribers() {
    if (!elements.subscribersList) return;

    elements.subscribersList.innerHTML = allSubscribers.map((subscriber, index) => `
        <tr>
            <td>${index + 1}</td>
            <td>${escapeHtml(subscriber.email)}</td>
            <td>${formatSubscriptionDate(subscriber.subscribed_at)}</td>
            <td>
                <button class="btn btn-sm btn-danger" onclick="confirmDeleteSubscriber('${subscriber.id}', '${escapeHtml(subscriber.email)}')" title="Eliminar suscriptor">
                    <img src="../assets/icons/trash-2.svg" width="16" height="16" alt="">
                    Eliminar
                </button>
            </td>
        </tr>
    `).join('');
}

// Format subscription date to DD/MM/YYYY HH:MM
function formatSubscriptionDate(dateString) {
    const date = new Date(dateString);
    
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    
    return `${day}/${month}/${year} ${hours}:${minutes}`;
}

/* =====================================================
   DELETE SUBSCRIBER
   ===================================================== */

// Confirm delete subscriber
function confirmDeleteSubscriber(subscriberId, email) {
    subscriberToDelete = subscriberId;
    
    // Update modal title
    const modalTitle = elements.deleteModal.querySelector('h2');
    if (modalTitle) {
        modalTitle.textContent = '¿Eliminar Suscriptor?';
    }
    
    elements.deletePostTitle.textContent = email;
    elements.deleteMessage.textContent = '¿Estás seguro de que querés eliminar este suscriptor del newsletter? Esta acción no se puede deshacer.';
    elements.deleteModal.style.display = 'flex';
}

// Delete subscriber
async function deleteSubscriber() {
    if (!subscriberToDelete) return;

    // Show loading state
    const btnText = elements.confirmDeleteBtn.querySelector('.btn-text');
    const btnLoading = elements.confirmDeleteBtn.querySelector('.btn-loading');
    btnText.style.display = 'none';
    btnLoading.style.display = 'inline-flex';
    elements.confirmDeleteBtn.disabled = true;

    try {
        const { data: { session } } = await supabaseClient.auth.getSession();

        const response = await fetch(CONFIG.DELETE_SUBSCRIBER_API_URL, {
            method: 'DELETE',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token}`
            },
            body: JSON.stringify({ id: subscriberToDelete })
        });

        if (!response.ok) {
            throw new Error('Failed to delete subscriber');
        }

        // Remove from local state
        allSubscribers = allSubscribers.filter(s => s.id !== subscriberToDelete);

        // Hide modal
        elements.deleteModal.style.display = 'none';

        // Show success toast
        Toast.success('Suscriptor eliminado exitosamente', 'Éxito');

        // Re-render
        if (allSubscribers.length === 0) {
            elements.newsletterTableContainer.style.display = 'none';
            elements.newsletterEmpty.style.display = 'flex';
        } else {
            renderSubscribers();
        }

    } catch (error) {
        console.error('Error deleting subscriber:', error);
        Toast.error('Error al eliminar el suscriptor', 'Error');
    } finally {
        // Reset button state
        btnText.style.display = 'inline';
        btnLoading.style.display = 'none';
        elements.confirmDeleteBtn.disabled = false;
        subscriberToDelete = null;
    }
}

/* =====================================================
   NAVIGATION
   ===================================================== */

// Show newsletter management
function showNewsletterManagement() {
    elements.postsManagement.style.display = 'none';
    elements.faqManagement.style.display = 'none';
    elements.newsletterManagement.style.display = 'block';
    elements.editorContainer.style.display = 'none';
    elements.faqEditorContainer.style.display = 'none';
    
    elements.showBlogBtn.classList.remove('active');
    elements.showFaqBtn.classList.remove('active');
    elements.showNewsletterBtn.classList.add('active');
}

// Setup navigation
function setupNewsletterNavigation() {
    elements.showNewsletterBtn.addEventListener('click', () => {
        showNewsletterManagement();
        loadSubscribers();
    });
}

/* =====================================================
   DELETE MODAL HANDLERS
   ===================================================== */

// Setup delete modal for newsletter (reusing existing modal)
function setupNewsletterDeleteHandlers() {
    // The delete confirmation will be handled by existing confirmDeleteBtn listener
    // We just need to override the handler when in newsletter context
    const originalDeleteHandler = elements.confirmDeleteBtn.onclick;
    
    elements.confirmDeleteBtn.addEventListener('click', () => {
        if (subscriberToDelete) {
            deleteSubscriber();
        }
    });
}

/* =====================================================
   INITIALIZATION
   ===================================================== */

// Initialize newsletter module when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', () => {
        setupNewsletterNavigation();
        setupNewsletterDeleteHandlers();
    });
} else {
    setupNewsletterNavigation();
    setupNewsletterDeleteHandlers();
}
