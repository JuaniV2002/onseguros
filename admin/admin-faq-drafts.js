/* =====================================================
   OnSeguros Admin Panel - FAQ AI Drafts Module
   Topic hints, FAQ draft list, draft editor, publish flow.
   Mirrors admin-drafts.js shape; differences: HTML answer field
   (FAQs store HTML, not markdown), category dropdown, no slug.
   ===================================================== */

const FAQ_DRAFTS_CACHE_KEY = 'admin-faq-drafts-data';
const FAQ_HINTS_CACHE_KEY = 'admin-faq-hints-data';
const FAQ_DRAFTS_CACHE_TTL = 60 * 1000;
const FAQ_DRAFTS_LAST_PILL_KEY = 'admin-drafts-last-pill';

let currentEditingFaqDraft = null;
let allFaqDrafts = [];
let allFaqHints = [];

function getCachedFaqDrafts() {
    try {
        const cached = sessionStorage.getItem(FAQ_DRAFTS_CACHE_KEY);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > FAQ_DRAFTS_CACHE_TTL) {
            sessionStorage.removeItem(FAQ_DRAFTS_CACHE_KEY);
            return null;
        }
        return data;
    } catch { return null; }
}
function setCachedFaqDrafts(drafts) {
    try { sessionStorage.setItem(FAQ_DRAFTS_CACHE_KEY, JSON.stringify({ data: drafts, timestamp: Date.now() })); } catch {}
}
function clearFaqDraftsCache() {
    try { sessionStorage.removeItem(FAQ_DRAFTS_CACHE_KEY); } catch {}
}
function clearFaqHintsCache() {
    try { sessionStorage.removeItem(FAQ_HINTS_CACHE_KEY); } catch {}
}

/* =====================================================
   Pill toggle helpers (Blog | FAQ)
   ===================================================== */

function activateFaqPill() {
    if (elements.draftsPillBlog) elements.draftsPillBlog.classList.remove('active');
    if (elements.draftsPillBlog) elements.draftsPillBlog.setAttribute('aria-selected', 'false');
    if (elements.draftsPillFaq) elements.draftsPillFaq.classList.add('active');
    if (elements.draftsPillFaq) elements.draftsPillFaq.setAttribute('aria-selected', 'true');
    if (elements.blogDraftsPanel) elements.blogDraftsPanel.style.display = 'none';
    if (elements.faqDraftsPanel) elements.faqDraftsPanel.style.display = 'block';
    try { localStorage.setItem(FAQ_DRAFTS_LAST_PILL_KEY, 'faq'); } catch {}
}

function activateBlogPill() {
    if (elements.draftsPillFaq) elements.draftsPillFaq.classList.remove('active');
    if (elements.draftsPillFaq) elements.draftsPillFaq.setAttribute('aria-selected', 'false');
    if (elements.draftsPillBlog) elements.draftsPillBlog.classList.add('active');
    if (elements.draftsPillBlog) elements.draftsPillBlog.setAttribute('aria-selected', 'true');
    if (elements.faqDraftsPanel) elements.faqDraftsPanel.style.display = 'none';
    if (elements.blogDraftsPanel) elements.blogDraftsPanel.style.display = 'block';
    try { localStorage.setItem(FAQ_DRAFTS_LAST_PILL_KEY, 'blog'); } catch {}
}

function getLastPill() {
    try { return localStorage.getItem(FAQ_DRAFTS_LAST_PILL_KEY) || 'blog'; } catch { return 'blog'; }
}

/* =====================================================
   Navigation
   ===================================================== */

function showFaqDraftsManagement() {
    if (typeof hideAllOtherSections === 'function') hideAllOtherSections();
    if (elements.faqDraftEditorContainer) elements.faqDraftEditorContainer.style.display = 'none';
    if (elements.draftEditorContainer) elements.draftEditorContainer.style.display = 'none';
    if (elements.draftsManagement) elements.draftsManagement.style.display = 'block';
    activateFaqPill();
    if (typeof setActiveNavBtn === 'function') setActiveNavBtn(elements.showDraftsBtn);
    document.querySelector('.admin-nav').style.display = 'flex';
}

function showFaqDraftEditor() {
    if (typeof hideAllOtherSections === 'function') hideAllOtherSections();
    if (elements.draftsManagement) elements.draftsManagement.style.display = 'none';
    if (elements.faqDraftEditorContainer) elements.faqDraftEditorContainer.style.display = 'grid';
    document.querySelector('.admin-nav').style.display = 'none';
}

/* =====================================================
   Hints
   ===================================================== */

async function loadFaqHints() {
    if (!elements.faqHintsList) return;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(`${CONFIG.GET_FAQ_HINTS_API_URL}?unused=1`, {
            headers: { 'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allFaqHints = data.hints || [];
        renderFaqHints();
    } catch (e) {
        console.error('Failed to load FAQ hints:', e);
        elements.faqHintsList.innerHTML = '';
    }
}

function renderFaqHints() {
    if (!elements.faqHintsList) return;
    if (!allFaqHints.length) {
        elements.faqHintsList.innerHTML = '<p style="color:#b8b8b8;font-size:13px;margin:0;">Sin temas pendientes. La IA va a elegir uno por su cuenta.</p>';
        return;
    }
    elements.faqHintsList.innerHTML = `
        <p style="color:#5a5a64;font-size:13px;font-weight:600;margin:0 0 8px;">Temas pendientes (${allFaqHints.length}):</p>
        <ul style="margin:0;padding-left:20px;color:#5a5a64;font-size:13px;line-height:1.6;">
            ${allFaqHints.map(h => `<li>${escapeHtml(h.hint)} <span style="color:#b8b8b8;">· ${formatDate(h.created_at)}</span></li>`).join('')}
        </ul>`;
}

async function submitFaqHint(e) {
    e.preventDefault();
    const text = elements.faqHintInput.value.trim();
    if (text.length < 3) {
        Toast.error('El tema debe tener al menos 3 caracteres', 'Tema muy corto');
        return;
    }
    elements.faqHintSubmitBtn.disabled = true;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(CONFIG.SUBMIT_FAQ_HINT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ hint: text })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
        clearFaqHintsCache();
        elements.faqHintInput.value = '';
        if (elements.faqHintCount) elements.faqHintCount.textContent = '0';
        Toast.success('Tema guardado. La próxima FAQ lo va a usar.');
        loadFaqHints();
    } catch (e) {
        Toast.error(e.message || 'Error al guardar el tema');
    } finally {
        elements.faqHintSubmitBtn.disabled = false;
    }
}

/* =====================================================
   Drafts list
   ===================================================== */

async function loadFaqDrafts(useCache = true) {
    if (!elements.faqDraftsList) return;
    if (useCache) {
        const cached = getCachedFaqDrafts();
        if (cached) {
            allFaqDrafts = cached;
            elements.faqDraftsLoading.style.display = 'none';
            renderFaqDrafts();
            return;
        }
    }
    elements.faqDraftsLoading.style.display = 'flex';
    elements.faqDraftsList.innerHTML = '';
    elements.faqDraftsEmpty.style.display = 'none';
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(CONFIG.GET_FAQ_DRAFTS_API_URL, {
            headers: { 'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        allFaqDrafts = data.drafts || [];
        setCachedFaqDrafts(allFaqDrafts);
        elements.faqDraftsLoading.style.display = 'none';
        renderFaqDrafts();
    } catch (e) {
        elements.faqDraftsLoading.style.display = 'none';
        elements.faqDraftsEmpty.style.display = 'flex';
        elements.faqDraftsEmpty.querySelector('p').textContent = 'No se pudieron cargar los borradores. Reintentá en unos segundos.';
    }
}

function faqStatusBadge(status) {
    const map = {
        pending:   { text: 'Pendiente IA', color: '#2e7ef6', bg: '#e7f0ff' },
        edited:    { text: 'Editado',      color: '#0f7b3a', bg: '#e6f7ec' },
        failed:    { text: 'Falló',        color: '#b3261e', bg: '#fde7e7' },
        published: { text: 'Publicado',    color: '#5a5a64', bg: '#eee' },
        discarded: { text: 'Descartado',   color: '#5a5a64', bg: '#eee' }
    };
    const m = map[status] || map.pending;
    return `<span style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;color:${m.color};background:${m.bg};text-transform:uppercase;letter-spacing:.04em;">${m.text}</span>`;
}

function faqCategoryBadge(category) {
    const label = (typeof getCategoryLabel === 'function' ? getCategoryLabel(category) : category);
    return `<span class="faq-preview-category category-${escapeHtml(category)}" style="display:inline-block;padding:2px 8px;border-radius:4px;font-size:11px;font-weight:600;text-transform:uppercase;letter-spacing:.04em;">${escapeHtml(label)}</span>`;
}

function renderFaqDrafts() {
    if (!allFaqDrafts.length) {
        elements.faqDraftsEmpty.style.display = 'flex';
        elements.faqDraftsList.innerHTML = '';
        return;
    }
    elements.faqDraftsEmpty.style.display = 'none';
    elements.faqDraftsList.innerHTML = allFaqDrafts.map(d => {
        const isFailed = d.status === 'failed';
        const isPending = d.status === 'pending' || d.status === 'edited';
        const safeId = String(d.id).replace(/'/g, "\\'");
        // Strip HTML for the description preview line.
        const tmpDiv = document.createElement('div');
        tmpDiv.innerHTML = d.answer || '';
        const answerPreview = (tmpDiv.textContent || '').replace(/\s+/g, ' ').trim().substring(0, 200);
        return `
        <div class="post-item" data-id="${d.id}">
            <div class="post-item-content">
                <h3 class="post-item-title">${escapeHtml(d.question)} ${faqStatusBadge(d.status)}</h3>
                <p class="post-item-description">${escapeHtml(answerPreview)}${answerPreview.length === 200 ? '…' : ''}</p>
                <div class="post-item-meta">
                    <span class="post-item-date">${formatDate(d.generated_at)}</span>
                    <span>•</span>
                    ${faqCategoryBadge(d.category)}
                    ${d.hint_text ? `<span>•</span><span title="${escapeHtml(d.hint_text)}" style="color:#8a5a00;">${escapeHtml(d.hint_text.substring(0, 40))}${d.hint_text.length > 40 ? '…' : ''}</span>` : ''}
                </div>
                ${isFailed && d.error_message ? `<p style="color:#b3261e;font-size:12px;margin-top:6px;background:#fde7e7;padding:6px 10px;border-radius:6px;">${escapeHtml(d.error_message.substring(0, 200))}</p>` : ''}
            </div>
            <div class="post-item-actions">
                ${isPending ? `<button class="btn btn-sm btn-primary" onclick="editFaqDraft('${safeId}')">Editar</button>` : ''}
                ${isPending ? `<button class="btn btn-sm btn-secondary" onclick="publishFaqDraftFromList('${safeId}')">Publicar</button>` : ''}
                ${d.status !== 'published' ? `<button class="btn btn-sm btn-danger" onclick="discardFaqDraft('${safeId}')">${isFailed ? 'Eliminar' : 'Descartar'}</button>` : ''}
            </div>
        </div>`;
    }).join('');
}

/* =====================================================
   Draft editor
   ===================================================== */

function updateFaqDraftPreview() {
    const q = elements.faqDraftQuestion.value.trim();
    const a = elements.faqDraftAnswer.value.trim();
    const cat = elements.faqDraftCategory.value || 'general';
    elements.faqDraftPreviewQuestion.textContent = q || 'Tu pregunta aparecerá aquí';
    elements.faqDraftPreviewCategory.textContent = (typeof getCategoryLabel === 'function' ? getCategoryLabel(cat) : cat);
    elements.faqDraftPreviewCategory.className = `faq-preview-category category-${cat}`;
    if (a) {
        elements.faqDraftPreviewAnswer.innerHTML = a;
    } else {
        elements.faqDraftPreviewAnswer.innerHTML = '<p class="placeholder-text">La respuesta aparecerá aquí mientras editás…</p>';
    }
}

function fillFaqDraftEditor(draft) {
    currentEditingFaqDraft = draft;
    elements.faqDraftEditorTitle.textContent = `Editar FAQ · ${draft.status}`;
    elements.faqDraftQuestion.value = draft.question || '';
    elements.faqDraftAnswer.value = draft.answer || '';
    elements.faqDraftCategory.value = draft.category || 'general';
    updateCharCount(elements.faqDraftQuestion, elements.faqDraftQuestionCount, 12, 200);
    updateCharCount(elements.faqDraftAnswer, elements.faqDraftAnswerCount, 50, null);

    const sourcesContainer = document.getElementById('faq-draft-sources');
    const sources = (draft.generation_metadata && draft.generation_metadata.grounding_sources) || [];
    if (sources.length && sourcesContainer) {
        sourcesContainer.style.display = 'block';
        elements.faqDraftSourcesList.innerHTML = sources
            .slice(0, 12)
            .map(s => `<li><a href="${s.uri}" target="_blank" rel="noopener" style="color:#2e7ef6;">${escapeHtml((s.title || s.uri).substring(0, 120))}</a></li>`)
            .join('');
    } else if (sourcesContainer) {
        sourcesContainer.style.display = 'none';
    }

    elements.faqDraftPublishBtn.disabled = (draft.status !== 'pending' && draft.status !== 'edited');
    updateFaqDraftPreview();
    showFaqDraftEditor();
}

async function fetchAndOpenFaqDraft(id) {
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(`${CONFIG.GET_FAQ_DRAFTS_API_URL}?id=${encodeURIComponent(id)}`, {
            headers: { 'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}` }
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        if (!data.draft) throw new Error('Borrador no encontrado');
        fillFaqDraftEditor(data.draft);
    } catch (e) {
        Toast.error(e.message || 'No se pudo abrir el borrador');
        showFaqDraftsManagement();
        loadFaqDrafts(false);
    }
}

function editFaqDraft(id) {
    const draft = allFaqDrafts.find(d => d.id === id);
    if (draft) {
        fillFaqDraftEditor(draft);
    } else {
        fetchAndOpenFaqDraft(id);
    }
}

async function saveFaqDraft(e) {
    e?.preventDefault();
    if (!currentEditingFaqDraft) return;
    const question = elements.faqDraftQuestion.value.trim();
    const answer = elements.faqDraftAnswer.value.trim();
    const category = elements.faqDraftCategory.value;
    if (question.length < 12) return Toast.error('Pregunta muy corta (mínimo 12 caracteres)');
    if (answer.length < 50) return Toast.error('Respuesta muy corta (mínimo 50 caracteres)');
    if (!category) return Toast.error('Elegí una categoría');

    elements.faqDraftSaveBtn.disabled = true;
    try {
        const { data: { session } } = await supabaseClient.auth.getSession();
        const res = await fetch(CONFIG.UPDATE_FAQ_DRAFT_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
            },
            body: JSON.stringify({ id: currentEditingFaqDraft.id, question, answer, category })
        });
        const result = await res.json();
        if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
        currentEditingFaqDraft = result.draft;
        clearFaqDraftsCache();
        Toast.success('Cambios guardados. El enlace del email anterior dejó de servir.');
    } catch (e) {
        Toast.error(e.message || 'Error al guardar');
    } finally {
        elements.faqDraftSaveBtn.disabled = false;
    }
}

async function publishFaqDraft(id) {
    const draft = allFaqDrafts.find(d => d.id === id) || currentEditingFaqDraft;
    if (!draft || draft.id !== id) {
        await fetchAndOpenFaqDraft(id);
        return;
    }
    confirmAction(
        '¿Publicar FAQ?',
        `Vas a publicar "${draft.question}" en la sección de Preguntas Frecuentes del sitio. Si querés revisarla primero, cancelá y editala.`,
        async () => {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                const res = await fetch(CONFIG.PUBLISH_FAQ_DRAFT_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ id })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
                clearFaqDraftsCache();
                if (typeof clearFAQCache === 'function') clearFAQCache();
                Toast.success('FAQ publicada. Sitemap regenerándose en GitHub Actions.', 'Listo');
                showFaqDraftsManagement();
                await loadFaqDrafts(false);
            } catch (e) {
                Toast.error(e.message || 'Error al publicar');
            }
        }
    );
}

async function publishFaqDraftFromCurrentEditor() {
    if (!currentEditingFaqDraft) return;
    await publishFaqDraft(currentEditingFaqDraft.id);
}

async function publishFaqDraftFromList(id) {
    await publishFaqDraft(id);
}

async function discardFaqDraft(id) {
    const draft = allFaqDrafts.find(d => d.id === id);
    confirmAction(
        '¿Descartar borrador de FAQ?',
        draft ? `Vas a descartar "${draft.question}". Si tenía un tema asociado, ese tema vuelve a estar disponible.` : '¿Confirmás descartar este borrador?',
        async () => {
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                const res = await fetch(CONFIG.DISCARD_FAQ_DRAFT_API_URL, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        'Authorization': `Bearer ${session?.access_token || CONFIG.SUPABASE_ANON_KEY}`
                    },
                    body: JSON.stringify({ id })
                });
                const result = await res.json();
                if (!res.ok) throw new Error(result.error || `HTTP ${res.status}`);
                clearFaqDraftsCache();
                Toast.info('Borrador descartado');
                if (currentEditingFaqDraft && currentEditingFaqDraft.id === id) {
                    currentEditingFaqDraft = null;
                    showFaqDraftsManagement();
                }
                await loadFaqDrafts(false);
                await loadFaqHints();
            } catch (e) {
                Toast.error(e.message || 'Error al descartar');
            }
        }
    );
}

function cancelFaqDraftEdit() {
    currentEditingFaqDraft = null;
    showFaqDraftsManagement();
    loadFaqDrafts(false);
}

/* =====================================================
   Manual generation (testing)
   ===================================================== */

async function generateFaqDraftNow() {
    confirmAction(
        '¿Generar FAQ ahora?',
        'Esto va a llamar a la IA y crear un borrador de FAQ nuevo, igual que el cron quincenal. Si ya hay un borrador pendiente reciente, se omite.',
        async () => {
            elements.generateFaqDraftBtn.disabled = true;
            const orig = elements.generateFaqDraftBtn.textContent;
            elements.generateFaqDraftBtn.textContent = 'Generando…';
            try {
                const { data: { session } } = await supabaseClient.auth.getSession();
                const res = await fetch(`${CONFIG.GENERATE_FAQ_DRAFT_API_URL}?force=1`, {
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
                    clearFaqDraftsCache();
                    clearFaqHintsCache();
                    Toast.success(`FAQ creada. ${result.grounding_count || 0} fuentes consultadas.`);
                }
                await loadFaqDrafts(false);
                await loadFaqHints();
            } catch (e) {
                Toast.error(e.message || 'Error al generar borrador');
            } finally {
                elements.generateFaqDraftBtn.disabled = false;
                elements.generateFaqDraftBtn.textContent = orig;
            }
        }
    );
}

/* =====================================================
   HTML formatting toolbar (mirrors admin-faq.js setupFAQToolbar
   but scoped to the FAQ-draft answer textarea via data-target)
   ===================================================== */

function setupFaqDraftToolbar() {
    const toolbar = document.querySelector('.faq-toolbar[data-target="faq-draft-answer"]');
    if (!toolbar) return;
    toolbar.addEventListener('click', (e) => {
        const btn = e.target.closest('.toolbar-btn');
        if (!btn) return;
        const action = btn.dataset.action;
        const textarea = elements.faqDraftAnswer;
        const start = textarea.selectionStart;
        const end = textarea.selectionEnd;
        const selected = textarea.value.substring(start, end);

        let replacement = '';
        switch (action) {
            case 'bold': replacement = `<strong>${selected || 'texto en negrita'}</strong>`; break;
            case 'italic': replacement = `<em>${selected || 'texto en cursiva'}</em>`; break;
            case 'ul': replacement = `<ul>\n  <li>${selected || 'Elemento de lista'}</li>\n  <li>Elemento 2</li>\n</ul>`; break;
            case 'ol': replacement = `<ol>\n  <li>${selected || 'Elemento de lista'}</li>\n  <li>Elemento 2</li>\n</ol>`; break;
            case 'link': {
                const url = prompt('Ingresá la URL:');
                if (url) replacement = `<a href="${url}">${selected || 'texto del enlace'}</a>`;
                break;
            }
            case 'p': replacement = `<p>${selected || 'Tu párrafo aquí'}</p>`; break;
        }
        if (!replacement) return;

        textarea.value = textarea.value.substring(0, start) + replacement + textarea.value.substring(end);
        textarea.focus();
        const newPos = start + replacement.length;
        textarea.setSelectionRange(newPos, newPos);
        updateCharCount(textarea, elements.faqDraftAnswerCount, 50, null);
        updateFaqDraftPreview();
    });
}

/* =====================================================
   Event wiring
   ===================================================== */

if (elements.draftsPillBlog) {
    elements.draftsPillBlog.addEventListener('click', () => {
        activateBlogPill();
        if (typeof loadDrafts === 'function') loadDrafts(true);
        if (typeof loadHints === 'function') loadHints();
    });
}
if (elements.draftsPillFaq) {
    elements.draftsPillFaq.addEventListener('click', async () => {
        activateFaqPill();
        await Promise.all([loadFaqDrafts(true), loadFaqHints()]);
    });
}
if (elements.refreshFaqDraftsBtn) {
    elements.refreshFaqDraftsBtn.addEventListener('click', async () => {
        clearFaqDraftsCache();
        clearFaqHintsCache();
        await Promise.all([loadFaqDrafts(false), loadFaqHints()]);
    });
}
if (elements.generateFaqDraftBtn) {
    elements.generateFaqDraftBtn.addEventListener('click', generateFaqDraftNow);
}
if (elements.faqHintForm) {
    elements.faqHintForm.addEventListener('submit', submitFaqHint);
}
if (elements.faqHintInput && elements.faqHintCount) {
    elements.faqHintInput.addEventListener('input', () => {
        elements.faqHintCount.textContent = elements.faqHintInput.value.length;
    });
}
if (elements.faqDraftForm) {
    elements.faqDraftForm.addEventListener('submit', saveFaqDraft);
}
if (elements.cancelFaqDraftEditBtn) {
    elements.cancelFaqDraftEditBtn.addEventListener('click', cancelFaqDraftEdit);
}
if (elements.faqDraftPublishBtn) {
    elements.faqDraftPublishBtn.addEventListener('click', publishFaqDraftFromCurrentEditor);
}
if (elements.faqDraftDiscardBtn) {
    elements.faqDraftDiscardBtn.addEventListener('click', () => {
        if (currentEditingFaqDraft) discardFaqDraft(currentEditingFaqDraft.id);
    });
}
if (elements.faqDraftQuestion) {
    elements.faqDraftQuestion.addEventListener('input', () => {
        updateCharCount(elements.faqDraftQuestion, elements.faqDraftQuestionCount, 12, 200);
        updateFaqDraftPreview();
    });
}
if (elements.faqDraftAnswer) {
    elements.faqDraftAnswer.addEventListener('input', () => {
        updateCharCount(elements.faqDraftAnswer, elements.faqDraftAnswerCount, 50, null);
        updateFaqDraftPreview();
    });
}
if (elements.faqDraftCategory) {
    elements.faqDraftCategory.addEventListener('change', updateFaqDraftPreview);
}

setupFaqDraftToolbar();

window.editFaqDraft = editFaqDraft;
window.publishFaqDraftFromList = publishFaqDraftFromList;
window.discardFaqDraft = discardFaqDraft;
window.openFaqDraftById = (id) => {
    showFaqDraftsManagement();
    fetchAndOpenFaqDraft(id);
};
window.openFaqDraftsTab = async () => {
    showFaqDraftsManagement();
    await Promise.all([loadFaqDrafts(true), loadFaqHints()]);
};
