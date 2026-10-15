# Skeleton

Loading placeholders shown while posts, FAQs, live-info values and admin lists load (assets/css/style.css, faq/faq.css, admin/admin.css).

**Markup:** the real item markup (`.blog-card`, `.accordion-item > .accordion-question`, `.blog-post__header`/`.prose`, `.post-item`, `.faq-item`, `.subscribers-table` rows) with each line of text replaced by `span.skeleton-line` (`style="--w:62%"` sets its width). `span.skeleton-line--m` is an extra line that only shows below 768px, where the real text wraps more; the line before it goes full width there. Admin loaders wrap the items in `.is-skeleton`; their buttons keep the real `.btn` classes and labels but render as `skeleton-fill` blocks.

- Same container, padding, line-height and count as the loaded state (blog 6 rows, FAQ 6, admin 3), so nothing shifts when data lands.
- Bars are 0.7em tall, centered in a 1lh line, `radius-sm`, filled with `skeleton-fill` (`border-light`: visible on `bg-primary` in both themes, black in high contrast). Admin uses `admin-skeleton-fill`.
- A slow opacity pulse (1.2s, 1 → 0.45), no shimmer gradient; it stops under `prefers-reduced-motion`.
- The loading container carries `aria-busy="true"` and the skeleton items `aria-hidden="true"`; JS removes `aria-busy` on render, empty state or error. Placeholder text that stays in the DOM (live-info "--°", breadcrumb "Artículo") is kept for screen readers.
- The live-info values (`.liveinfo__card--loading`) keep their placeholder text but paint it as a `skeleton-fill` block sized to the loaded value.
