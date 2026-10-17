# WhatsAppFab

Fixed bottom-right WhatsApp button that expands into a labelled pill on hover/focus.

**Markup:** `a.whatsapp-fab[href="https://wa.me/543584921111"]` > `<img>` (whatsapp.svg, forced white) + `span.whatsapp-fab__tooltip`. `aria-label="Hablanos por WhatsApp"`, word for word the tooltip text: on phones the tooltip is hidden so the label is the only name, and on desktop it matches what sighted users see on hover/focus.

- Rest: `fab-size` circle in `whatsapp-green`, icon only, at `fab-offset` from the corner.
- Expanded (≥769px): 240px pill in `whatsapp-deep` so the white label is AA (4.9:1). Never put text on `whatsapp-green`.
- Mobile: never expands; stays an icon (52px).
- Quote and claim flows end in WhatsApp too — this is the agency's main channel. `.is-open` in the preview only shows the expanded state.
