# ClaimForm

The car-accident claim form (/siniestros/): eyebrow header, urgent-contact note, numbered ruled sections, radio cards, and a submit that opens WhatsApp.

**Markup:** `.siniestro-header__eyebrow` + `h1.siniestro-header__title` · `.siniestro-alert[role=note]` (info icon + text with WhatsApp and phone links) · `form.siniestro-form` > `section.siniestro-section` (`.siniestro-section__header` with `.siniestro-section__number` + title + subtitle, then `.siniestro-grid` of FormField groups; `.siniestro-grid__full` spans both columns) · `fieldset.siniestro-fieldset` > `.siniestro-radio-group` of `label.siniestro-radio` (hidden radio + `.siniestro-radio__box`) · `.siniestro-submit` (`.siniestro-success[role=status]`, full-width primary Button with send icon, `.siniestro-submit__note`).

- Five sections, each opened by a 2px `rule-strong` and numbered 01–05 like the hero index: Tus datos, Tu vehículo, El accidente, Tercero involucrado, Fotos del accidente.
- Fields here are flatter than the global FormField: 1px `claim-field-border` (≥3:1), `radius-sm`, 52px tall, 16px text (no iOS zoom), `claim-placeholder` placeholders; focus = 2px `focus-ring` inside the border.
- Required: a bold `claim-error` asterisk (hidden from screen readers; the note explains it). Optional: “(opcional)” in 13px `text-secondary`.
- Error: `claim-error` border plus a 3px inner bar on the left, and a message in `claim-error` 500 — e.g. “Ingresá tu nombre completo.” (preview copy).
- Radios are cards: 1px border; checked = `link` border + 1px inset ring, 600 label, filled dot.
- Two columns from 580px. Column `post-max` (760px).
- Nothing is uploaded or stored: submit opens WhatsApp with a formatted message and the client attaches photos in the chat. The success note says so and offers a fallback link.
