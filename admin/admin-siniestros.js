/**
 * Admin Siniestros Management Module
 * Manages car accident reports in the admin panel.
 * Dependencies: admin-core.js must load first.
 */

// State
let allSiniestros = [];

const SINIESTROS_CACHE_KEY = 'admin-siniestros-data';
const SINIESTROS_CACHE_TTL = 5 * 60 * 1000; // 5 minutes

// =====================================================
// Cache helpers
// =====================================================

function getCachedSiniestros() {
    try {
        const cached = sessionStorage.getItem(SINIESTROS_CACHE_KEY);
        if (!cached) return null;
        const { data, timestamp } = JSON.parse(cached);
        if (Date.now() - timestamp > SINIESTROS_CACHE_TTL) {
            sessionStorage.removeItem(SINIESTROS_CACHE_KEY);
            return null;
        }
        return data;
    } catch { return null; }
}

function setCachedSiniestros(data) {
    try {
        sessionStorage.setItem(SINIESTROS_CACHE_KEY, JSON.stringify({ data, timestamp: Date.now() }));
    } catch (e) { /* ignore */ }
}

function clearSiniestrosCache() {
    try { sessionStorage.removeItem(SINIESTROS_CACHE_KEY); } catch { /* ignore */ }
}

// =====================================================
// Navigation
// =====================================================

function showSiniestrosManagement() {
    elements.postsManagement.style.display = 'none';
    elements.faqManagement.style.display = 'none';
    elements.newsletterManagement.style.display = 'none';
    elements.quotesManagement.style.display = 'none';
    elements.siniestrosManagement.style.display = 'block';
    elements.editorContainer.style.display = 'none';
    elements.faqEditorContainer.style.display = 'none';

    elements.showBlogBtn.classList.remove('active');
    elements.showFaqBtn.classList.remove('active');
    elements.showNewsletterBtn.classList.remove('active');
    elements.showQuotesBtn.classList.remove('active');
    elements.showSiniestrosBtn.classList.add('active');

    if (allSiniestros.length === 0) {
        loadSiniestros();
    } else {
        elements.siniestrosEmpty.style.display = 'none';
        elements.siniestrosTableContainer.style.display = 'block';
        renderSiniestros();
    }
}

// =====================================================
// Load siniestros
// =====================================================

async function loadSiniestros(forceRefresh = false) {
    if (!forceRefresh) {
        const cached = getCachedSiniestros();
        if (cached) {
            allSiniestros = cached;
            elements.siniestrosEmpty.style.display = 'none';
            elements.siniestrosTableContainer.style.display = 'block';
            renderSiniestros();
            return;
        }
    }

    elements.siniestrosLoading.style.display = 'block';
    elements.siniestrosEmpty.style.display = 'none';
    elements.siniestrosTableContainer.style.display = 'none';

    try {
        const GET_SINIESTROS_API_URL = window.envConfig.get('GET_SINIESTROS_API_URL');
        const { data: { session } } = await supabaseClient.auth.getSession();

        if (!session) throw new Error('No hay sesión activa');

        const response = await fetch(GET_SINIESTROS_API_URL, {
            method: 'GET',
            headers: {
                'Authorization': `Bearer ${session.access_token}`,
                'Content-Type': 'application/json'
            }
        });

        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        allSiniestros = await response.json();
        setCachedSiniestros(allSiniestros);

        elements.siniestrosLoading.style.display = 'none';

        if (allSiniestros.length === 0) {
            elements.siniestrosEmpty.style.display = 'flex';
        } else {
            elements.siniestrosTableContainer.style.display = 'block';
            renderSiniestros();
        }
    } catch (error) {
        console.error('Error loading siniestros:', error);
        elements.siniestrosLoading.style.display = 'none';
        elements.siniestrosEmpty.style.display = 'flex';
        Toast.error('Error al cargar los siniestros.', 'Error');
    }
}

// =====================================================
// Render
// =====================================================

function renderSiniestros() {
    if (!elements.siniestrosList) return;

    elements.siniestrosList.innerHTML = allSiniestros.map((s) => {
        const fecha = formatSiniestroDate(s.fecha_siniestro, s.hora_siniestro);
        const descripcion = s.descripcion.length > 60
            ? escapeHtml(s.descripcion.substring(0, 60)) + '…'
            : escapeHtml(s.descripcion);
        const denuncia = s.denuncia_policial === 'Sí'
            ? `<span class="status-badge status-badge--info">Sí${s.numero_denuncia ? ' #' + escapeHtml(s.numero_denuncia) : ''}</span>`
            : '<span class="status-badge status-badge--neutral">No</span>';
        const estadoBadge = renderEstadoBadge(s.estado);

        return `
        <tr>
            <td>${escapeHtml(fecha)}</td>
            <td>
                <strong>${escapeHtml(s.nombre)}</strong><br>
                <small>${escapeHtml(s.email)}</small>
            </td>
            <td><a href="tel:${escapeHtml(s.telefono)}">${escapeHtml(s.telefono)}</a></td>
            <td><strong>${escapeHtml(s.patente)}</strong>${s.marca_modelo ? '<br><small>' + escapeHtml(s.marca_modelo) + '</small>' : ''}</td>
            <td>${s.lugar_siniestro ? escapeHtml(s.lugar_siniestro) : '<span style="color:var(--gray-400)">—</span>'}</td>
            <td>${denuncia}</td>
            <td title="${escapeHtml(s.descripcion)}">${descripcion}</td>
            <td>
                <select class="estado-select" data-id="${s.id}" onchange="updateSiniestroEstado(this)">
                    <option value="nuevo"${s.estado === 'nuevo' ? ' selected' : ''}>Nuevo</option>
                    <option value="en_proceso"${s.estado === 'en_proceso' ? ' selected' : ''}>En proceso</option>
                    <option value="resuelto"${s.estado === 'resuelto' ? ' selected' : ''}>Resuelto</option>
                    <option value="cerrado"${s.estado === 'cerrado' ? ' selected' : ''}>Cerrado</option>
                </select>
            </td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="openSiniestroDetail('${s.id}')" title="Ver detalle">
                    <img src="../assets/icons/eye.svg" width="14" height="14" alt=""> Ver
                </button>
            </td>
        </tr>`;
    }).join('');
}

function renderEstadoBadge(estado) {
    const map = {
        nuevo: 'status-badge--warning',
        en_proceso: 'status-badge--info',
        resuelto: 'status-badge--success',
        cerrado: 'status-badge--neutral',
    };
    const labels = { nuevo: 'Nuevo', en_proceso: 'En proceso', resuelto: 'Resuelto', cerrado: 'Cerrado' };
    return `<span class="status-badge ${map[estado] || ''}">${labels[estado] || estado}</span>`;
}

function formatSiniestroDate(fecha, hora) {
    if (!fecha) return '—';
    const [y, m, d] = fecha.split('-');
    const base = `${d}/${m}/${y}`;
    return hora ? `${base} ${hora.substring(0, 5)}` : base;
}

// =====================================================
// Estado update (inline via Supabase JS client)
// =====================================================

async function updateSiniestroEstado(selectEl) {
    const id = selectEl.dataset.id;
    const estado = selectEl.value;

    try {
        const { error } = await supabaseClient
            .from('siniestros')
            .update({ estado })
            .eq('id', id);

        if (error) throw error;

        // Update local cache
        const idx = allSiniestros.findIndex(s => s.id === id);
        if (idx !== -1) allSiniestros[idx].estado = estado;
        setCachedSiniestros(allSiniestros);

        Toast.success('Estado actualizado.', 'Siniestro');
    } catch (err) {
        console.error('Error updating estado:', err);
        Toast.error('No se pudo actualizar el estado.', 'Error');
        // Revert select visually
        const original = allSiniestros.find(s => s.id === id);
        if (original) selectEl.value = original.estado;
    }
}

// =====================================================
// Detail modal
// =====================================================

function openSiniestroDetail(id) {
    const s = allSiniestros.find(s => s.id === id);
    if (!s) return;

    const field = (label, val) => val
        ? `<div class="sd-field"><span class="sd-label">${label}</span><span class="sd-value">${escapeHtml(String(val))}</span></div>`
        : '';

    const hasTercero = s.tercero_nombre || s.tercero_patente || s.tercero_telefono || s.tercero_aseguradora;
    const denunciaVal = s.denuncia_policial === 'Sí' && s.numero_denuncia
        ? `Sí — N° ${s.numero_denuncia}`
        : (s.denuncia_policial || 'No');

    elements.siniestroDetailBody.innerHTML = `
        <div class="sd-sections">
            <div class="sd-section">
                <div class="sd-section-title">Asegurado</div>
                ${field('Nombre', s.nombre)}
                ${field('Teléfono', s.telefono)}
                ${field('Email', s.email)}
                ${field('DNI', s.dni)}
            </div>
            <div class="sd-section">
                <div class="sd-section-title">Vehículo</div>
                ${field('Patente', s.patente)}
                ${field('Marca / Modelo', s.marca_modelo)}
                ${field('Aseguradora', s.aseguradora)}
                ${field('N° Póliza', s.numero_poliza)}
            </div>
            <div class="sd-section">
                <div class="sd-section-title">Accidente</div>
                ${field('Fecha', formatSiniestroDate(s.fecha_siniestro, s.hora_siniestro))}
                ${field('Lugar', s.lugar_siniestro)}
                ${field('Denuncia policial', denunciaVal)}
            </div>
            ${hasTercero ? `
            <div class="sd-section">
                <div class="sd-section-title">Tercero involucrado</div>
                ${field('Nombre', s.tercero_nombre)}
                ${field('Teléfono', s.tercero_telefono)}
                ${field('Patente', s.tercero_patente)}
                ${field('Aseguradora', s.tercero_aseguradora)}
            </div>` : ''}
            <div class="sd-section sd-section--full">
                <div class="sd-section-title">Descripción</div>
                <p class="sd-descripcion">${escapeHtml(s.descripcion)}</p>
            </div>
            ${(s.fotos && s.fotos.length > 0) ? `
            <div class="sd-section sd-section--full">
                <div class="sd-section-title">Fotos del accidente (${s.fotos.length})</div>
                <div class="sd-photo-grid">
                    ${s.fotos.map((url, i) => `<a href="${escapeHtml(url)}" target="_blank" rel="noopener noreferrer" title="Ver foto ${i + 1} en tamaño completo">
                        <img src="${escapeHtml(url)}" alt="Foto del accidente ${i + 1}" loading="lazy">
                    </a>`).join('')}
                </div>
            </div>` : ''}
            <div class="sd-meta">ID: ${s.id} &nbsp;·&nbsp; Recibido: ${new Date(s.created_at).toLocaleString('es-AR')}</div>
        </div>`;

    elements.siniestroDetailModal.style.display = 'flex';
}

function closeSiniestroModal() {
    elements.siniestroDetailModal.style.display = 'none';
}

// =====================================================
// Initialization
// =====================================================

function initSiniestrosManagement() {
    if (typeof elements === 'undefined' || !elements.showSiniestrosBtn) {
        console.error('[Siniestros] Required elements not found.');
        return;
    }

    elements.showSiniestrosBtn.addEventListener('click', showSiniestrosManagement);

    elements.refreshSiniestrosBtn.addEventListener('click', () => {
        clearSiniestrosCache();
        allSiniestros = [];
        loadSiniestros(true);
    });

    elements.closeSiniestroModalBtn.addEventListener('click', closeSiniestroModal);

    elements.siniestroDetailModal.addEventListener('click', (e) => {
        if (e.target === elements.siniestroDetailModal) closeSiniestroModal();
    });
}

if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initSiniestrosManagement);
} else {
    initSiniestrosManagement();
}
