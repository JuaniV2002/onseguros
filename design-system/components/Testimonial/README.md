# Testimonial

A client quote with rating and initials avatar: one featured on a `surface-band` panel, the rest as ruled entries.

**Markup:** `article.testimonial-card` (add `--featured` for the lead quote; on the site it is `:first-child` of `.testimonials__grid`) > `.testimonial-card__rating` (5 × `span.star`), `blockquote.testimonial-card__quote`, `.testimonial-card__author` > `.testimonial-card__avatar[data-initials]` + `cite.testimonial-card__name` + `p.testimonial-card__title`.

- Featured quote: `quote-featured` (Space Grotesk 500, fluid to 26px), panel `surface-band`, `radius-md`, author pinned to the bottom.
- Supporting quotes: 1px `border-medium` on top, no box. Stars in `star`.
- Avatars show initials (`data-initials`). Names as *Nombre + inicial* (Juan José L.) with a role (Productor Agrícola, Comerciante, Propietario).
- Quotes are real client words in their own register — don't polish them.
