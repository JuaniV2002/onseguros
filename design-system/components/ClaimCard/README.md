# ClaimCard

A quiet secondary entry point for existing clients to report a car claim (/siniestros/).

**Markup:** `.siniestros-mini-card` > `.siniestros-mini-card__content` (car icon + title + subtitle) + `a.siniestros-mini-card__btn`.

- `surface-base` box, 1px `border-medium`, `radius-md`, no shadow; wraps on narrow widths.
- Title `small` 600 in `text-primary`; subtitle 12px in `text-secondary`.
- The link is an outlined ghost (1px `border-dark`), hover `link`. It must never compete with a primary button.
