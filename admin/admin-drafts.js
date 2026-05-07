/* =====================================================
   OnSeguros Admin Panel - AI Drafts Module
   Topic hints, weekly draft list, draft editor, publish flow
   ===================================================== */

const DRAFTS_CACHE_KEY = 'admin-drafts-data';
const HINTS_CACHE_KEY = 'admin-hints-data';
const DRAFTS_CACHE_TTL = 60 * 1000; // 1 minute (drafts can mutate from cron)

let currentEditingDraft = null;
let allDrafts = [];
let allHints = [];

function getCachedDrafts() {
    try {
        const cached = sessionStorage.getItem(DRAFTS_CACHE_KEY);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > DRAFTS_CACHE_TTL) {
            sessionStorage.removeItem(DRAFTS_CACHE_KEY);
            return null;
        }
        return data;
    } catch { return null; }
}
function setCachedDrafts(drafts) {
    try { sessionStorage.setItem(DRAFTS_CACHE_KEY, JSON.stringify({ data: drafts, timestamp: Date.now() })); } catch {}
}
function clearDraftsCache() {
    try { sessionStorage.removeItem(DRAFTS_CACHE_KEY); } catch {}
}
function clearHintsCache() {
    try { sessionStorage.removeItem(HINTS_CACHE_KEY); } catch {}
}

/* =====================================================
   Navigation
   ===================================================== */

function hideAllOtherSections() {
    if (elements.postsManagement) elements.postsManagement.style.display = 'none';
    if (elements.faqManagement) elements.faqManagement.style.display = 'none';
    if (elements.newsletterManagement) elements.newsletterManagement.style.display = 'none';
    if (elements.quotesManagement) elements.quotesManagement.style.display = 'none';
    if (elements.siniestrosManagement) elements.siniestrosManagement.style.display = 'none';
    if (elements.editorContainer) elements.editorContainer.style.display = 'none';
    if (elements.faqEditorContainer) elements.faqEditorContainer.style.display = 'none';
    if (elements.faqDraftEditorContainer) elements.faqDraftEditorContainer.style.display = 'none';
}

function setActiveNavBtn(activeBtn) {
    document.querySelectorAll('.admin-nav .nav-btn').forEach(b => b.classList.remove('active'));
    if (activeBtn) activeBtn.classList.add('active');
}

function showDraftsManagement() {
    hideAllOtherSections();
    if (elements.draftEditorContainer) elements.draftEditorContainer.style.display = 'none';
    elements.draftsManagement.style.display = 'block';
    // Default sub-pill state: blog. activateBlogPill() lives in admin-faq-drafts.js
    // which loads after this module — guard so first-load doesn't crash if order changes.
    if (typeof activateBlogPill === 'function') activateBlogPill();
    setActiveNavBtn(elements.showDraftsBtn);
    document.querySelector('.admin-nav').style.display = 'flex';
}

function showDraftEditor() {
    hideAllOtherSections();
    elements.draftsManagement.style.display = 'none';
    elements.draftEditorContainer.style.display = 'grid';
    document.querySelector('.admin-nav').style.display = 'none';
}

/* =====================================================
   Hints
   ===================================================== */

async function loadHints() {
    if (!elements.hintsList) return;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(`${CONFIG.GET_HINTS_API_URL}?unused=1`, {
            headers: { 'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allHints = data.hints || [];
        renderHints();
    } catch (e) {
        console.error('Failed to load hints:', e);
        elements.hintsList.innerHTML = '';
    }
}

function renderHints() {
    if (!elements.hintsList) return;
    if (!allHints.length) {
        elements.hintsList.innerHTML = '<p style="color:#b8b8b8;font-size:13px;margin:0;">Sin temas pendientes. La IA va a elegir un tema por su cuenta.</p>';
        return;
    }
    elements.hintsList.innerHTML = `
        <p style="color:#5a5a64;font-size:13px;font-weight:600;margin:0 0 8px;">Temas pendientes (${allHints.length}):</p>
        <ul style="margin:0;padding-left:20px;color:#5a5a64;font-size:13px;line-height:1.6;">
            ${allHints.map(h => `<li>${escapeHtml(h.hint)} <span style="color:#b8b8b8;">· ${formatDate(h.created_at)}</span></li>`).join('')}
        </ul>`;
}

async function submitHint(e) {
    e.preventDefault();
    const text = elements.hintInput.value.trim();
    if (text.length < 3) {
        Toast.error('El tema debe tener al menos 3 caracteres', 'Tema muy corto');
        return;
    }
    elements.hintSubmitBtn.disabled = true;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(CONFIG.SUBMIT_HINT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ hint: text })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
        clearHintsCache();
        elements.hintInput.value = '';
        if (elements.hintCount) elements.hintCount.textContent = '0';
        Toast.success('Tema guardado. El próximo borrador lo va a usar.');
        loadHints();
    } catch (e) {
        Toast.error(e.message || 'Error al guardar el tema');
    } finally {
        elements.hintSubmitBtn.disabled = false;
    }
}

/* =====================================================
   Drafts list
   ===================================================== */

async function loadDrafts(useCache = true) {
    if (!elements.draftsList) return;
    if (useCache) {
        const cached = getCachedDrafts();
        if (cached) {
            allDrafts = cached;
            elements.draftsLoading.style.display = 'none';
            renderDrafts();
            return;
        }
    }
    elements.draftsLoading.style.display = 'flex';
    elements.draftsList.innerHTML = '';
    elements.draftsEmpty.style.display = 'none';
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(CONFIG.GET_DRAFTS_API_URL, {
            headers: { 'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allDrafts = data.drafts || [];
        setCachedDrafts(allDrafts);
        elements.draftsLoading.style.display = 'none';
        renderDrafts();
    } catch (e) {
        elements.draftsLoading.style.display = 'none';
        elements.draftsEmpty.style.display = 'flex';
        elements.draftsEmpty.querySelector('p').textContent = 'No se pudieron cargar los borradores. Reintentá en unos segundos.';
    }
}

function statusBadge(status) {
    const map = {
        pending: { text: 'Pendiente IA', color: '#2e7ef6', bg: '#e7f0ff' },
        edited:  { text: 'Editado',     color: '#0f7b3a', bg: '#e6f7ec' },
        failed:  { text: 'Falló',        color: '#b3261e', bg: '#fde7e7' },
        published: { text: 'Publicado', color: '#5a5a64', bg: '#eee' },
        discarded: { text: 'Descartado', color: '#5a5a64', bg: '#eee' }
    };
    const m = map[status] || map.pending;
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:${m.color};background:${m.bg};text-transform:uppercase;letter-spacing:.04em;">${m.text}</span>`;
}

function renderDrafts() {
    if (!allDrafts.length) {
        elements.draftsEmpty.style.display = 'flex';
        elements.draftsList.innerHTML = '';
        return;
    }
    elements.draftsEmpty.style.display = 'none';
    elements.draftsList.innerHTML = allDrafts.map(d => {
        const isFailed = d.status === 'failed';
        const isPending = d.status === 'pending' || d.status === 'edited';
        const safeId = String(d.id).replace(/'/g, "\\'");
        return `
        <div class="post-item" data-id="${d.id}">
            <div class="post-item-content">
                <h3 class="post-item-title">${escapeHtml(d.title)} ${statusBadge(d.status)}</h3>
                <p class="post-item-description">${escapeHtml(d.description || '')}</p>
                <div class="post-item-meta">
                    <span class="post-item-date">${formatDate(d.generated_at)}</span>
                    <span>•</span>
                    <span class="post-item-slug">${escapeHtml(d.slug)}</span>
                    ${d.hint_text ? `<span>•</span><span title="${escapeHtml(d.hint_text)}" style="color:#8a5a00;">💡 ${escapeHtml(d.hint_text.substring(0, 40))}${d.hint_text.length > 40 ? '…' : ''}</span>` : ''}
                </div>
                ${isFailed && d.error_message ? `<p style="color:#b3261e;font-size:12px;margin-top:6px;background:#fde7e7;padding:6px 10px;border-radius:6px;">${escapeHtml(d.error_message.substring(0, 200))}</p>` : ''}
            </div>
            <div class="post-item-actions">
                ${isPending ? `<button class="btn btn-sm btn-primary" onclick="editDraft('${safeId}')">Editar</button>` : ''}
                ${isPending ? `<button class="btn btn-sm btn-secondary" onclick="publishDraftFromList('${safeId}')">Publicar</button>` : ''}
                ${d.status !== 'published' ? `<button class="btn btn-sm btn-danger" onclick="discardDraft('${safeId}')">${isFailed ? 'Eliminar' : 'Descartar'}</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

/* =====================================================
   Draft editor
   ===================================================== */

function updateDraftPreview() {
    elements.draftPreviewTitle.textContent = elements.draftTitle.value.trim() || 'Tu título aparecerá aquí';
    elements.draftPreviewDescription.textContent = elements.draftDescription.value.trim() || 'La descripción aparecerá aquí…';
    const content = elements.draftContent.value.trim();
    if (content) {
        elements.draftPreviewBody.innerHTML = marked.parse(content);
    } else {
        elements.draftPreviewBody.innerHTML = '<p class="placeholder-text">El contenido se mostrará aquí mientras editás…</p>';
    }
}

function fillDraftEditor(draft) {
    currentEditingDraft = draft;
    elements.draftEditorTitle.textContent = `Editar borrador · ${draft.status}`;
    elements.draftTitle.value = draft.title || '';
    elements.draftDescription.value = draft.description || '';
    elements.draftContent.value = draft.content || '';
    elements.draftSlug.value = draft.slug || '';
    updateCharCount(elements.draftTitle, elements.draftTitleCount, 10, 100);
    updateCharCount(elements.draftDescription, elements.draftDescCount, 50, 160);
    updateCharCount(elements.draftContent, elements.draftContentCount, 100, null);

    const sourcesContainer = document.getElementById('draft-sources');
    const sources = (draft.generation_metadata && draft.generation_metadata.grounding_sources) || [];
    if (sources.length && sourcesContainer) {
        sourcesContainer.style.display = 'block';
        elements.draftSourcesList.innerHTML = sources
            .slice(0, 12)
            .map(s => `<li><a href="${s.uri}" target="_blank" rel="noopener" style="color:#2e7ef6;">${escapeHtml((s.title || s.uri).substring(0, 120))}</a></li>`)
            .join('');
    } else if (sourcesContainer) {
        sourcesContainer.style.display = 'none';
    }

    elements.draftPublishBtn.disabled = (draft.status !== 'pending' && draft.status !== 'edited');
    updateDraftPreview();
    showDraftEditor();
}

async function fetchAndOpenDraft(id) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(`${CONFIG.GET_DRAFTS_API_URL}?id=${encodeURIComponent(id)}`, {
            headers: { 'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.draft) throw new Error('Borrador no encontrado');
        fillDraftEditor(data.draft);
    } catch (e) {
        Toast.error(e.message || 'No se pudo abrir el borrador');
        showDraftsManagement();
        loadDrafts(false);
    }
}

function editDraft(id) {
    const draft = allDrafts.find(d => d.id === id);
    if (draft) {
        fillDraftEditor(draft);
    } else {
        fetchAndOpenDraft(id);
    }
}

async function saveDraft(e) {
    e?.preventDefault();
    if (!currentEditingDraft) return;
    const title = elements.draftTitle.value.trim();
    const description = elements.draftDescription.value.trim();
    const content = elements.draftContent.value.trim();
    const slug = elements.draftSlug.value.trim();
    if (title.length < 10) return Toast.error('Título muy corto (mínimo 10 caracteres)');
    if (description.length < 50) return Toast.error('Descripción muy corta (mínimo 50 caracteres)');
    if (content.length < 100) return Toast.error('Contenido muy corto (mínimo 100 caracteres)');

    elements.draftSaveBtn.disabled = true;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(CONFIG.UPDATE_DRAFT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ id: currentEditingDraft.id, title, description, content, slug })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
        currentEditingDraft = result.draft;
        clearDraftsCache();
        Toast.success('Cambios guardados. El enlace del email anterior dejó de servir.');
    } catch (e) {
        Toast.error(e.message || 'Error al guardar');
    } finally {
        elements.draftSaveBtn.disabled = false;
    }
}

async function publishDraft(id) {
    const draft = allDrafts.find(d => d.id === id) || currentEditingDraft;
    if (!draft || draft.id !== id) {
        await fetchAndOpenDraft(id);
        return;
    }
    confirmAction(
        '¿Publicar y enviar newsletter?',
        `Vas a publicar "${draft.title}" en el blog y enviar el newsletter a todos los suscriptores. Esta acción no se puede deshacer.`,
        async () => {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                const res = await fetch(CONFIG.PUBLISH_DRAFT_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ id })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
                clearDraftsCache();
                clearBlogCache();
                Toast.success(`Publicado. Newsletter enviado.`, 'Listo');
                showDraftsManagement();
                await loadDrafts(false);
            } catch (e) {
                Toast.error(e.message || 'Error al publicar');
            }
        }
    );
}

async function publishDraftFromCurrentEditor() {
    if (!currentEditingDraft) return;
    await publishDraft(currentEditingDraft.id);
}

async function publishDraftFromList(id) {
    await publishDraft(id);
}

async function discardDraft(id) {
    const draft = allDrafts.find(d => d.id === id);
    confirmAction(
        '¿Descartar borrador?',
        draft ? `Vas a descartar "${draft.title}". Si tenía un tema asociado, ese tema vuelve a estar disponible para el próximo borrador.` : '¿Confirmás descartar este borrador?',
        async () => {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                const res = await fetch(CONFIG.DISCARD_DRAFT_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ id })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
                clearDraftsCache();
                Toast.info('Borrador descartado');
                if (currentEditingDraft && currentEditingDraft.id === id) {
                    currentEditingDraft = null;
                    showDraftsManagement();
                }
                await loadDrafts(false);
                await loadHints();
            } catch (e) {
                Toast.error(e.message || 'Error al descartar');
            }
        }
    );
}

function cancelDraftEdit() {
    currentEditingDraft = null;
    showDraftsManagement();
    loadDrafts(false);
}

/* =====================================================
   Manual generation (testing)
   ===================================================== */

async function generateDraftNow() {
    confirmAction(
        '¿Generar borrador ahora?',
        'Esto va a llamar a la IA y crear un borrador nuevo, igual que el cron del viernes. Si ya hay un borrador pendiente reciente, se omite.',
        async () => {
            elements.generateDraftBtn.disabled = true;
            const orig = elements.generateDraftBtn.textContent;
            elements.generateDraftBtn.textContent = 'Generando…';
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                const res = await fetch(`${CONFIG.GENERATE_DRAFT_API_URL}?force=1`, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
                    },
                    body: '{}'
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
                if (result.skipped) {
                    Toast.info(`Generación omitida: ${result.reason}`);
                } else {
                    clearDraftsCache();
                    clearHintsCache();
                    Toast.success(`Borrador creado. ${result.grounding_count || 0} fuentes consultadas.`);
                }
                await loadDrafts(false);
                await loadHints();
            } catch (e) {
                Toast.error(e.message || 'Error al generar borrador');
            } finally {
                elements.generateDraftBtn.disabled = false;
                elements.generateDraftBtn.textContent = orig;
            }
        }
    );
}

/* =====================================================
   Event wiring
   ===================================================== */

if (elements.showDraftsBtn) {
    elements.showDraftsBtn.addEventListener('click', async () => {
        // Honor the last-selected pill so reopening the Drafts tab returns
        // the user to whichever sub-view (Blog | FAQ) they last looked at.
        const lastPill = (typeof getLastPill === 'function') ? getLastPill() : 'blog';
        if (lastPill === 'faq' && typeof window.openFaqDraftsTab === 'function') {
            window.openFaqDraftsTab();
            return;
        }
        showDraftsManagement();
        await Promise.all([loadDrafts(true), loadHints()]);
    });
}
if (elements.refreshDraftsBtn) {
    elements.refreshDraftsBtn.addEventListener('click', async () => {
        clearDraftsCache();
        clearHintsCache();
        await Promise.all([loadDrafts(false), loadHints()]);
    });
}
if (elements.generateDraftBtn) {
    elements.generateDraftBtn.addEventListener('click', generateDraftNow);
}
if (elements.hintForm) {
    elements.hintForm.addEventListener('submit', submitHint);
}
if (elements.hintInput && elements.hintCount) {
    elements.hintInput.addEventListener('input', () => {
        elements.hintCount.textContent = elements.hintInput.value.length;
    });
}
if (elements.draftForm) {
    elements.draftForm.addEventListener('submit', saveDraft);
}
if (elements.cancelDraftEditBtn) {
    elements.cancelDraftEditBtn.addEventListener('click', cancelDraftEdit);
}
if (elements.draftPublishBtn) {
    elements.draftPublishBtn.addEventListener('click', publishDraftFromCurrentEditor);
}
if (elements.draftDiscardBtn) {
    elements.draftDiscardBtn.addEventListener('click', () => {
        if (currentEditingDraft) discardDraft(currentEditingDraft.id);
    });
}
if (elements.draftTitle) {
    elements.draftTitle.addEventListener('input', () => {
        updateCharCount(elements.draftTitle, elements.draftTitleCount, 10, 100);
        updateDraftPreview();
    });
}
if (elements.draftDescription) {
    elements.draftDescription.addEventListener('input', () => {
        updateCharCount(elements.draftDescription, elements.draftDescCount, 50, 160);
        updateDraftPreview();
    });
}
if (elements.draftContent) {
    elements.draftContent.addEventListener('input', () => {
        updateCharCount(elements.draftContent, elements.draftContentCount, 100, null);
        updateDraftPreview();
    });
}

document.querySelectorAll('.admin-nav .nav-btn').forEach(btn => {
    if (btn.id === 'show-drafts-btn') return;
    btn.addEventListener('click', () => {
        if (elements.draftsManagement) elements.draftsManagement.style.display = 'none';
        if (elements.draftEditorContainer) elements.draftEditorContainer.style.display = 'none';
        if (elements.faqDraftEditorContainer) elements.faqDraftEditorContainer.style.display = 'none';
    });
});

window.editDraft = editDraft;
window.publishDraftFromList = publishDraftFromList;
window.discardDraft = discardDraft;
window.openDraftById = (id) => {
    showDraftsManagement();
    fetchAndOpenDraft(id);
};
