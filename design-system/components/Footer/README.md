# Footer

The floating footer card loaded on every page by components/component-loader.js, with a wordmark watermark along the bottom edge and the theme toggle.

**Markup:** `footer.footer` > `.footer__container` > `span.footer__watermark[aria-hidden]` + `.footer__content` (brand column + three `nav.footer__section` with `h2.footer__title` (h2 so headings never skip a level after the page h1) and `ul.footer__links` of `a.footer__link`) + `.footer__bottom-content` (legal links + ThemeToggle) + `.footer__copyright`.

- Same float as the NavBar: `float-surface`, 1px `float-border`, `radius-xl`, `float-shadow`, max `container-xl`, inset `float-inset`, padding `float-pad`.
- Watermark: “OnSeguros” in Space Grotesk 700 at 21cqi, `float-watermark` color with the “On” in `float-watermark-on` (span `.footer__watermark-on`, a hint of the logo blue), lifted `translate(-50%, -8%)` so the “g” descender clears the bottom edge; decorative (aria-hidden, unselectable), so the letters are CSS generated content (`.footer__watermark-on::before` “On”, `.footer__watermark::after` “Seguros”), not DOM text — contrast checkers skip them; hidden under 640px.
- Columns: 2fr 1fr 1fr 1fr. Column titles are eyebrows (12px / 600 / uppercase / 0.06em, `text-secondary`); links 14px `text-primary`, hover `link` + underline; 44px rows on touch.
- Bottom rows are split by 1px `rule`. Copyright 12px `text-secondary`; the credit link is `link`, always underlined (0.2em offset) because it sits inside a line of text; hover `link-hover`.
- “Usalos siempre” safety reminder: helmet + seatbelt icons tinted logo blue by a filter, label 16px / 600.
- Leaves a band under the card (below 1400px) for the WhatsApp button so it never covers the copyright.

## Theme toggle

**Markup:** `.theme-toggle` (role group) > `span.theme-toggle__label` “Tema:”, sun icon, `label.theme-toggle__switch` > `input[type=checkbox]` + `span.theme-toggle__slider`, moon icon.

- 52×28 pill in `brand-blue` (hover `brand-blue-hover`) with a 20px white knob that slides 24px; no text on it, so the logo blue is fine here.
- Sun/moon icons in mid-gray. 44px+ hit area on touch. Writes `data-theme` on `<html>`; default follows `prefers-color-scheme`.
