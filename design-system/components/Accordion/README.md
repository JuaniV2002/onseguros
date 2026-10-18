# Accordion

Flat FAQ rows on hairline rules, used by /faq/ and the legal pages (components/accordion.css + accordion.js).

**Markup:** `.accordion-list` > `.accordion-item` (`.active` when open) > `button.accordion-question` (text + chevron-down icon) + `.accordion-answer` > `.accordion-answer__content`.

- The list opens with a 2px `rule-strong`; each item closes with a 1px `rule`. No cards, shadows or gradients.
- Question: `accordion-question` style (Space Grotesk 18px / 600), hover `link`. Chevron rotates 180° when open; inverted in dark.
- Answer: max 68ch, `body` in `text-secondary`; `<strong>` in `text-primary`; links underlined in `link`.
- Closed answers are `visibility: hidden` so their links leave the tab order. Keep `aria-expanded` in sync.
- While the FAQ list loads, `faq/index.html` ships six `.accordion-item` skeleton rows in `.faq-list[aria-busy="true"]` (`faq.js` swaps them for the real list); the counter and chevron are hidden until the questions land (see Skeleton).
