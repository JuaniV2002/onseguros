# ServiceRow

One line of business as a row in an index — the landing's replacement for three identical cards.

**Markup:** `.services__grid` > `article.service-card` > `.service-card__icons` (1–2 `.service-card__icon` > `<img>`), `h3.service-card__title`, `p.service-card__description`, `a.service-card__link` with an arrow `<span>→</span>`.

- Index opens with a 2px `rule-strong`; rows separated by 1px `border-medium`. Sits on `surface-band` on the landing.
- From 900px the row becomes four columns (icons · title · description · link), baseline-aligned.
- Title `card-title`; description `body` in `text-secondary`, max 60ch; link in `link`, 600, arrow nudges 3px on hover.
- Icons: 22px Lucide strokes, black via `<img>`, inverted in dark. Agro → wheat; ART → building-2 + helmet; Integrales → store/house/building.
