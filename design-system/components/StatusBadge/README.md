# StatusBadge

Small uppercase labels in the admin: AI-draft status and FAQ category.

**Markup:** draft status — `statusBadge(status)` in admin-drafts.js writes an inline-styled `<span>` (here named `.status-badge.status--pending|edited|failed|neutral`). FAQ category — `span.faq-item-category-badge.category-<slug>`.

- Draft statuses: Pendiente IA (`status-pending`), Editado (`status-edited`), Falló (`status-failed`), Publicado / Descartado (`status-neutral`). 11px / 600, uppercase, 0.04em, 2×8 padding, 4px radius.
- Categories: general, cobertura, cotizacion, art, siniestro, vehiculos — each a `cat-*` text on its `cat-*-bg` wash; 0.7rem / 600 uppercase, 10px radius.
- The word carries the meaning; color only helps scanning.
- Every badge text reaches at least 4.5:1 on its wash (Pendiente IA 6.0, Cotización 4.8, Siniestro 5.3, Vehículos 4.5). Keep new categories to that floor.
