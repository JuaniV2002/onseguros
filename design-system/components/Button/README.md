# Button

The site's two brand buttons: a flat `brand-blue-strong` primary and an outlined secondary, both with the large-bold `button-brand` label.

**Markup:** `<a class="btn btn--primary">` or `<button class="btn btn--secondary">`; add `btn--full-width` to stretch.

- **Primary** — one per view, the action that moves a client forward: *Cotizá con Oni →*, *Cotizar Ahora*, *Suscribirme*. Fill `brand-blue-strong`, label `on-brand` (5.0:1), hover `brand-blue-hover`.
- **Secondary** — the alternative next to a primary (*Ver Coberturas*). Transparent, 2px `border-dark`, hover border `text-primary`.
- Label is 19px / 700 (`button-brand`). The fill is `brand-blue-strong`, not the logo's `brand-blue` (white on that is only 3.9:1).
- Flat: no shadow, no lift, no gradient. Radius `radius-md`, padding 0.875rem × `space-xl`, min-height 48px.
- Focus: 2px `focus-ring` outline, 2px offset.
- Copy uses the voseo imperative (*Cotizá*, *Reportá*, *Agendá*) and may end with `→` when it navigates.
