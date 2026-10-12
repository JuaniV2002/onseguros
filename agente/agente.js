/**
 * AI Quote Chat Page
 * Handles the conversational AI quote experience using Gemini via a Supabase Edge Function
 */

/** @type {{ role: 'user' | 'assistant', content: string }[]} */
const conversationHistory = [];

let apiBaseUrl = '';
let isLoading = false;
let firstUserMessage = true;
let agentSummaryText = '';

// Token the AI appends when it's ready to collect the user's contact details
const CONTACT_SIGNAL = '[SOLICITAR_CONTACTO]';

// Mariano's WhatsApp Business number (wa.me format)
const WHATSAPP_NUMBER = '543584921111';

/**
 * Initialise the page: load components, config, and display the welcome message.
 */
async function init() {
    // Components are auto-loaded by component-loader.js
    try {
        await window.envConfig.load();
        apiBaseUrl = window.envConfig.get('AI_QUOTE_API_URL') || '';
    } catch (err) {
        console.error('Could not load config:', err);
    }

    setupEventListeners();

    // Show typing indicator briefly to give the illusion of thinking
    setLoading(true);
    await new Promise((resolve) => setTimeout(resolve, 2000));
    setLoading(false);

    // Welcome message — no API call needed
    appendAgentMessage(
        '¡Hola! Soy **Oni**, tu Agente de IA de OnSeguros 👋\n\n' +
        '¿Qué tipo de seguro necesitás cotizar hoy?'
    );
}

/**
 * Wire up all event listeners.
 */
function setupEventListeners() {
    const form = document.getElementById('chat-form');
    const input = document.getElementById('chat-input');
    const chips = document.querySelectorAll('.suggestion-chip');

    form.addEventListener('submit', (e) => {
        e.preventDefault();
        handleUserMessage(input.value.trim());
    });

    // Enter to send, Shift+Enter for new line
    input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            form.requestSubmit();
        }
    });

    // Auto-resize textarea
    input.addEventListener('input', () => {
        input.style.height = 'auto';
        input.style.height = Math.min(input.scrollHeight, 120) + 'px';
    });

    // Suggestion chips
    chips.forEach((chip) => {
        chip.addEventListener('click', () => {
            handleUserMessage(chip.dataset.message);
        });
    });
}

/**
 * Handle a message sent by the user.
 * @param {string} text
 */
async function handleUserMessage(text) {
    if (!text || isLoading) return;

    // Hide chips after first interaction
    if (firstUserMessage) {
        document.getElementById('chat-suggestions').style.display = 'none';
        firstUserMessage = false;
    }

    const input = document.getElementById('chat-input');
    input.value = '';
    input.style.height = 'auto';

    appendUserMessage(text);
    conversationHistory.push({ role: 'user', content: text });

    await fetchAgentReply();
}

/**
 * Call the Supabase Edge Function and display the AI reply.
 */
async function fetchAgentReply() {
    if (!apiBaseUrl) {
        appendAgentMessage('Lo siento, el servicio no está disponible en este momento. Por favor, [contactanos directamente](/#cotizacion).');
        return;
    }

    setLoading(true);

    try {
        const response = await fetch(apiBaseUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': window.envConfig.get('SUPABASE_ANON_KEY') || '',
                'Authorization': `Bearer ${window.envConfig.get('SUPABASE_ANON_KEY') || ''}`,
            },
            body: JSON.stringify({ messages: conversationHistory }),
        });

        if (!response.ok) {
            const errBody = await response.text();
            console.error(`Edge function error ${response.status}:`, errBody);
            throw new Error(`HTTP ${response.status}: ${errBody}`);
        }

        const data = await response.json();
        const rawReply = data.reply || 'No pude procesar tu mensaje. ¿Podés repetirlo?';

        const hasSignal = rawReply.includes(CONTACT_SIGNAL);
        const cleanReply = rawReply.replace(/\[SOLICITAR_CONTACTO\]/g, '').trim();

        conversationHistory.push({ role: 'assistant', content: cleanReply });
        appendAgentMessage(cleanReply);

        if (hasSignal) {
            agentSummaryText = cleanReply;
            // Brief pause so the summary bubble renders first
            await new Promise((r) => setTimeout(r, 400));
            showWhatsAppAction();
        }

    } catch (err) {
        console.error('Error fetching agent reply:', err);
        appendAgentMessage('Ocurrió un error al consultar el servicio. Por favor intentá de nuevo en unos segundos.');
    } finally {
        setLoading(false);
    }
}

/**
 * Extract only the structured summary block (heading + bullet lines) from the
 * full agent reply, stripping markdown bold markers from the heading.
 * Falls back to the full text if no structured block is found.
 * @param {string} text
 * @returns {string}
 */
function extractSummaryBlock(text) {
    // Match the heading line + every following "- key: value" bullet line
    const match = text.match(/(?:📋\s*)?\*{0,2}Resumen de tu consulta\*{0,2}(?:\n- .+)+/);
    // Strip markdown bold (**): WhatsApp uses single * for bold
    return (match ? match[0] : text).replace(/\*\*/g, '').trim();
}

/**
 * Build the wa.me URL with the greeting, the optional name and the summary.
 * @returns {string}
 */
function buildWhatsAppUrl() {
    const nameInput = document.getElementById('contact-name');
    const name = nameInput ? nameInput.value.trim() : '';
    const summary = extractSummaryBlock(agentSummaryText)
        .replace(/Resumen de tu consulta/, 'Resumen de mi consulta');

    const message =
        '¡Hola Mariano! ' + (name ? 'Soy ' + name + '. ' : '') + 'Quiero cotizar un seguro.\n\n' +
        summary;

    return 'https://wa.me/' + WHATSAPP_NUMBER + '?text=' + encodeURIComponent(message);
}

/**
 * Show the "send by WhatsApp" action after the agent's summary.
 * If Oni sends a new summary later, the same action moves below it and
 * its link picks up the new summary.
 */
function showWhatsAppAction() {
    const container = document.getElementById('chat-messages');
    let actionRow = document.getElementById('chat-contact-form-row');

    if (!actionRow) {
        actionRow = document.createElement('div');
        actionRow.className = 'chat-message chat-message--agent';
        actionRow.id = 'chat-contact-form-row';
        actionRow.innerHTML = `
            <div class="chat-avatar" aria-hidden="true">O</div>
            <div class="chat-bubble chat-bubble--agent chat-contact-form">
                <p class="chat-contact-form__title">Mandale tu consulta a Mariano por WhatsApp y te pasa la cotización</p>
                <div class="chat-contact-form__field">
                    <label for="contact-name">Tu nombre (opcional)</label>
                    <input type="text" id="contact-name" placeholder="Juan García" autocomplete="name">
                </div>
                <a class="chat-contact-form__btn" id="whatsapp-quote-link" href="#" target="_blank" rel="noopener">
                    Enviar consulta por WhatsApp
                </a>
                <p class="chat-contact-form__hint">Se abre WhatsApp con tu consulta lista: solo tenés que tocar enviar.</p>
            </div>
        `;

        const link = actionRow.querySelector('#whatsapp-quote-link');
        const nameInput = actionRow.querySelector('#contact-name');
        nameInput.addEventListener('input', () => { link.href = buildWhatsAppUrl(); });
        link.addEventListener('click', handleWhatsAppClick);
    }

    // Append (or move) the action below the latest summary
    container.appendChild(actionRow);
    actionRow.querySelector('#whatsapp-quote-link').href = buildWhatsAppUrl();
    scrollToBottom();
}

let whatsAppOpenedNoticeShown = false;

/**
 * After the client opens WhatsApp, remind them to tap send (once).
 * The link itself navigates natively, so nothing is prevented here.
 */
function handleWhatsAppClick(e) {
    // Make sure the href carries the latest name before the browser follows it
    e.currentTarget.href = buildWhatsAppUrl();

    if (whatsAppOpenedNoticeShown) return;
    whatsAppOpenedNoticeShown = true;
    appendAgentMessage(
        '✅ **¡Listo!** Se abrió WhatsApp con tu consulta para Mariano. Tocá **enviar** en WhatsApp y te contesta a la brevedad con la cotización 😊\n\n' +
        'Si no se abrió, tocá de nuevo el botón de arriba.'
    );
}

/**
 * Append a user message bubble to the chat.
 * @param {string} text
 */
function appendUserMessage(text) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message chat-message--user';
    msgDiv.innerHTML = `<div class="chat-bubble chat-bubble--user">${escapeHtml(text)}</div>`;
    container.appendChild(msgDiv);
    scrollToBottom();
}

/**
 * Append an agent message bubble to the chat.
 * Supports basic markdown: **bold**, *italic*, newlines, [text](url).
 * @param {string} text
 */
function appendAgentMessage(text) {
    const container = document.getElementById('chat-messages');
    const msgDiv = document.createElement('div');
    msgDiv.className = 'chat-message chat-message--agent';
    msgDiv.innerHTML = `
        <div class="chat-avatar" aria-hidden="true">O</div>
        <div class="chat-bubble chat-bubble--agent">${renderMarkdown(text)}</div>
    `;
    container.appendChild(msgDiv);
    scrollToBottom();
}

/**
 * Show or hide the typing indicator and disable the send button.
 * @param {boolean} loading
 */
function setLoading(loading) {
    isLoading = loading;
    const typingEl = document.getElementById('chat-typing');
    const sendBtn = document.getElementById('chat-send-btn');
    const input = document.getElementById('chat-input');

    typingEl.hidden = !loading;
    sendBtn.disabled = loading;
    input.disabled = loading;

    if (loading) scrollToBottom();
}

/**
 * Scroll the chat window to the latest message.
 */
function scrollToBottom() {
    const window_ = document.querySelector('.chat-window');
    if (window_) {
        // Small delay to let DOM update
        requestAnimationFrame(() => {
            window_.scrollTop = window_.scrollHeight;
        });
    }
}

/**
 * Escape HTML special characters to prevent XSS.
 * @param {string} str
 * @returns {string}
 */
function escapeHtml(str) {
    return str
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#039;');
}

/**
 * Minimal markdown renderer for agent messages.
 * Supports: **bold**, *italic*, `code`, [link](url), line breaks.
 * @param {string} text
 * @returns {string} HTML string (safe)
 */
function renderMarkdown(text) {
    // Escape HTML first
    let html = escapeHtml(text);

    // Bold
    html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic
    html = html.replace(/\*(.+?)\*/g, '<em>$1</em>');
    // Inline code
    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
    // Links [text](url) — only allow http/https
    html = html.replace(/\[([^\]]+)\]\((https?:\/\/[^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer">$1</a>');
    // Relative links [text](/path)
    html = html.replace(/\[([^\]]+)\]\((\/[^)]+)\)/g, '<a href="$2">$1</a>');
    // Double newline → paragraph break
    html = html.replace(/\n\n/g, '</p><p>');
    // Single newline → line break
    html = html.replace(/\n/g, '<br>');

    return `<p>${html}</p>`;
}

// Boot
document.addEventListener('DOMContentLoaded', init);
