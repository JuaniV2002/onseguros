# OniCard

The call-to-action panel for Oni, the AI quote agent (/agente/): a `brand-ink` navy panel with the standard blue button.

**Markup:** `.oni-cta-card` > `.oni-cta-card__badge` (avatar “O” + uppercase badge text), `h3.oni-cta-card__title`, `p.oni-cta-card__description`, `ul.oni-cta-card__features`, `a.oni-cta-card__btn`, `p.oni-cta-card__disclaimer`.

- Ground `brand-ink`, text `on-brand` (16.5:1); secondary text at 85–90% white; disclaimer 78% white. In dark it gains a `border-light` edge.
- Button = the brand primary (`brand-blue-strong`, `button-brand` label); its focus ring is `on-brand`, since `link` disappears on navy.
- Flat: `radius-md`, no gradient, no glow circles (those belong to the retired version).
- Always say what Oni does and that Mariano follows up — Oni gathers, Mariano quotes.
