# AdminPostItem

A section header and a list row for blog posts, FAQs, drafts and subscribers in the admin panel.

**Markup:** `.section-header` > `h2` + action button · `.posts-list` > `.post-item` > `.post-item-content` (`h3.post-item-title`, `p.post-item-description` clamped to 2 lines, `.post-item-meta` with date + `span.post-item-slug`) + `.post-item-actions`.

- Section title `admin-section-title` (28px) with a 60×3px `color-accent` underline sitting on the header's 1px `admin-gray-200` rule.
- Rows: white cards, `radius-lg`, `effect-raised`; hover lifts 4px, shows a 4px `brand-blue` left bar and turns the title `admin-primary-text`. (That's the old style; the public site uses ruled rows instead.)
- Description `admin-gray-600`, meta 13px `admin-gray-500`, slug chip in Space Grotesk on `admin-gray-100`.
- Section order is fixed: Borradores, Blog, FAQ, Suscriptores.
