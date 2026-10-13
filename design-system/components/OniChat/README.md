# OniChat

The quote chat with Oni, the AI agent (/agente/): a flat chat card with agent and client bubbles, suggestion chips and the input bar.

**Markup:** `.chat-card` > `.chat-window` > `.chat-messages[role=log]` of `.chat-message--agent` (`.chat-avatar` “O” + `.chat-bubble--agent`) and `.chat-message--user` (`.chat-bubble--user`); typing state = `.typing-dots` inside an agent bubble · `.chat-suggestions` of `button.suggestion-chip` (hidden after the first message) · `.chat-divider` · `form.chat-input-area` > `.chat-input-wrapper` (`textarea.chat-input` + `button.chat-send-btn` with send.svg) + `.chat-input-hint`.

- Card: `chat-surface`, 1px `border-medium`, opened by 2px `rule-strong`, bottom corners `radius-md`. No shadow.
- Agent bubbles: `chat-agent-bg` (warm band) with a 1px `rule` edge; client bubbles: `chat-user-bg` (navy) with white text. The corner nearest the speaker is `radius-xs` (2px). Text `chat-bubble`.
- Avatar: outlined monogram “O”, never a picture.
- Chips: 1px `border-dark`, `radius-sm`, 14px / 500; hover `link` text. 36px tall (44px on touch).
- Input: 1px `border-dark`, focus ring on the wrapper; placeholder “Escribí tu mensaje...”. Send is the page's only blue fill (`brand-blue-strong`, white icon).
- Typing dots fade, never bounce; stopped under reduced motion.
- When Oni has what Mariano needs, it shows an inline contact form (`.chat-contact-form`: uppercase labels, a full-width `brand-blue-strong` button “Enviar consulta por WhatsApp”). Nothing is posted; it opens WhatsApp.
- The chat page hides the WhatsApp FAB (it is already a chat).
