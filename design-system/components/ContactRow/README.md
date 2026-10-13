# ContactRow

A labelled contact detail as a ruled row: icon, uppercase label, value.

**Markup:** `.contact__details` > `.contact-item` > `.contact-item__icon` > `<img>` + a block with `p.contact-item__label` and `.contact-item__value` (wrap in `<a>` when actionable: `tel:`, `mailto:`, `wa.me`).

- Opens with 2px `rule-strong`; rows separated by 1px `border-medium`; padding `space-lg` 0.
- Label: `eyebrow` (12px / 600, 0.06em, uppercase) in `text-secondary`. Value: `body-lg` in `text-primary`, `link` on hover.
- Icons 20px, inverted in dark.
