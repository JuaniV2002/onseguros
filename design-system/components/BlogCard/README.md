# BlogCard

One post as a row in the blog index (/blog/), plus the search field that filters it.

**Markup:** `.blog-grid` > `a.blog-card` > optional `span.blog-card__badge` “¡Nuevo!” (newest post only), `time.blog-card__date`, `h2.blog-card__title`, `p.blog-card__description`, `span.blog-card__read-more` “Leer más →”. Search: `.blog-search` > search icon + `input.blog-search__input` “Buscar un artículo...”.

- Index opens with 2px `rule-strong`; rows close with 1px `rule`. The whole row is the link.
- From 768px: a 12.5rem date column beside the title, description and link.
- Date: 14px / 500, `text-secondary`, tabular numbers, long Spanish format (“10 de octubre de 2026”).
- Title `blog-card-title`; the newest (first) post leads at clamp(1.5rem … 2.125rem). Hover underlines the title.
- “¡Nuevo!”: 12px / 700 uppercase with a 3px `accent-dark` underline — no pill, no pulse.
- Read-more in `link` 600. Search input: 48px, 1px `field-border` (3:1), `radius-md`.
- Sample posts in the preview are placeholders; real posts come from Supabase.
- While loading, `#blog-grid[aria-busy]` holds six `.blog-card` skeleton rows (see Skeleton); the post page does the same for the breadcrumb, date, title and first paragraphs.
