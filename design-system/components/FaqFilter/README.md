# FaqFilter

Search + category filter for the FAQ page (/faq/), beside the numbered question list.

**Markup:** `.faq-tools` > `.faq-search` (search icon + `input.faq-search__input` “Buscar una pregunta...”) + `.faq-categories` of `button.faq-category-chip` (one `.active`; “Todas” first) · `.faq-list.accordion-list` of Accordion items whose question text sits in a `<span>`.

- Mobile and tablet: chips wrap in a row — 40px (44px on touch), 1px `border-medium`, `radius-sm`, 14px / 500 `text-secondary`; active is inverted (`text-primary` fill, `bg-primary` text, 600).
- From 1024px the filters become a sticky vertical index beside the list (this system shows it with `.faq-tools--index`): 2px `rule-strong` on top, 1px `rule` rows, 16px labels, and the active one underlined in `color-accent` with a small dot at the end.
- Search: 48px, 1px `border-dark`, hover `text-secondary`, focus ring.
- The list numbers each question 01, 02… in `text-secondary` tabular figures, like the hero index; answers indent to line up with the text.
- Categories: General, Coberturas, Cotización, ART, Siniestros, Vehículos (the same slugs as the admin's category badges, but with no colors on the public page).
- Page title `faq-title`. Description: “Encontrá respuestas a todas tus dudas…” (vos, like the rest of the site).
