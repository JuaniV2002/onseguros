/**
 * AI Quote Chat Page
 * Handles the conversational AI quote experience using Gemini via a Supabase Edge Function
 */

/** @type {{ role: 'user' | 'assistant', content: string }[]} */
const conversationHistory = [];

let apiBaseUrl = '';
let quoteApiUrl = '';
let isLoading = false;
let firstUserMessage = true;
let contactFormInjected = false;
let agentSummaryText = '';

// Token the AI appends when it's ready to collect the user's contact details
const CONTACT_SIGNAL = '[SOLICITAR_CONTACTO]';

/**
 * Initialise the page: load components, config, and display the welcome message.
 */
async function init() {
    // Components are auto-loaded by component-loader.js
    try {
        await window.envConfig.load();
        apiBaseUrl  = window.envConfig.get('AI_QUOTE_API_URL') || '';
        quoteApiUrl = window.envConfig.get('QUOTE_API_URL') || '';
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

        if (hasSignal && !contactFormInjected) {
            contactFormInjected = true;
            agentSummaryText = cleanReply;
            // Brief pause so the summary bubble renders first
            await new Promise((r) => setTimeout(r, 400));
            injectContactForm();
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
    if (match) {
        // Strip markdown bold (**) from the heading
        return match[0].replace(/\*\*/g, '').trim();
    }
    return text;
}

/**
 * Inject an inline contact form into the chat after the agent's summary.
 * On submit, POSTs to the existing send-quote-email-api endpoint.
 */
function injectContactForm() {
    const container = document.getElementById('chat-messages');

    const formRow = document.createElement('div');
    formRow.className = 'chat-message chat-message--agent';
    formRow.id = 'chat-contact-form-row';
    formRow.innerHTML = `
        <div class="chat-avatar" aria-hidden="true">O</div>
        <div class="chat-bubble chat-bubble--agent chat-contact-form">
            <p class="chat-contact-form__title">Para recibir la cotización, dejame tus datos 👇</p>
            <div class="chat-contact-form__field">
                <label for="contact-name">Nombre y apellido *</label>
                <input type="text" id="contact-name" placeholder="Juan García" autocomplete="name" required>
            </div>
            <div class="chat-contact-form__field">
                <label for="contact-phone">Teléfono</label>
                <input type="tel" id="contact-phone" placeholder="Ej: 358 123-4567" autocomplete="tel">
            </div>
            <div class="chat-contact-form__field">
                <label for="contact-email">Email</label>
                <input type="email" id="contact-email" placeholder="tu@email.com" autocomplete="email">
            </div>
            <p class="chat-contact-form__hint">Completá al menos el teléfono o el email.</p>
            <p class="chat-contact-form__error" id="contact-form-error" hidden></p>
            <button type="button" class="chat-contact-form__btn" id="contact-submit-btn">
                Enviar mis datos 📩
            </button>
        </div>
    `;

    container.appendChild(formRow);

    // Disable chat input while form is pending
    const chatInput = document.getElementById('chat-input');
    const chatSendBtn = document.getElementById('chat-send-btn');
    chatInput.disabled = true;
    chatInput.placeholder = 'Completá el formulario de arriba para continuar...';
    chatSendBtn.disabled = true;

    document.getElementById('contact-submit-btn').addEventListener('click', handleContactSubmit);
    scrollToBottom();
}

/**
 * Handle the contact form submission.
 */
async function handleContactSubmit() {
    const name  = document.getElementById('contact-name').value.trim();
    const phone = document.getElementById('contact-phone').value.trim();
    const email = document.getElementById('contact-email').value.trim();
    const errorEl = document.getElementById('contact-form-error');
    const submitBtn = document.getElementById('contact-submit-btn');

    // Validation
    if (!name) {
        errorEl.textContent = 'Por favor ingresá tu nombre.';
        errorEl.hidden = false;
        return;
    }
    if (!phone && !email) {
        errorEl.textContent = 'Por favor ingresá al menos un teléfono o email para que Mariano pueda contactarte.';
        errorEl.hidden = false;
        return;
    }
    errorEl.hidden = true;

    if (!quoteApiUrl) {
        errorEl.textContent = 'El servicio no está disponible en este momento. Escribinos directamente a mariano.pas@onseguros.net';
        errorEl.hidden = false;
        return;
    }

    submitBtn.textContent = 'Enviando...';
    submitBtn.disabled = true;

    try {
        const payload = {
            fullName: name,
            phone: phone || '',
            email: email || '',
            insuranceType: 'Consulta via Agente de IA',
            message: extractSummaryBlock(agentSummaryText),
            consent: true,
        };

        const res = await fetch(quoteApiUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'apikey': window.envConfig.get('SUPABASE_ANON_KEY') || '',
                'Authorization': `Bearer ${window.envConfig.get('SUPABASE_ANON_KEY') || ''}`,
            },
            body: JSON.stringify(payload),
        });

        if (!res.ok) {
            throw new Error(`HTTP ${res.status}`);
        }

        // Remove the form and show a success message from the agent
        document.getElementById('chat-contact-form-row').remove();
        appendAgentMessage(
            '✅ **¡Listo, ' + name.split(' ')[0] + '!** Le envié tu consulta a Mariano.\n\n' +
            'Te va a contactar a la brevedad con la cotización. Si necesitás algo urgente podés escribirle directamente a **mariano.pas@onseguros.net** 😊'
        );

        // Leave chat input disabled — conversation is done

    } catch (err) {
        console.error('Error submitting contact form:', err);
        submitBtn.textContent = 'Enviar mis datos 📩';
        submitBtn.disabled = false;
        errorEl.textContent = 'Hubo un error al enviar tus datos. Por favor intentá de nuevo.';
        errorEl.hidden = false;
    }
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
