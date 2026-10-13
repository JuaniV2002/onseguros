# AdminNav

The admin panel's floating bottom section switcher, and the Blog | FAQ sub-pill used inside Borradores.

**Markup:** `nav.admin-nav` (fixed, bottom center) > `button.nav-btn` (one `.active`, each with a 16px icon) · `.drafts-subnav` > `button.subpill` (one `.active`).

- Nav: white bar, 2px `admin-gray-200` border, `radius-lg`, `effect-raised`. Buttons 15px / 500 `admin-gray-600`, hover `admin-gray-100`; active fills `brand-blue-strong` with white 600 text (5.0:1).
- Sub-pill: `admin-gray-100` track, Space Grotesk 13.6px pills; active `brand-blue-strong` with `btn-shadow`.
- Order is product-decided: Borradores, Blog, FAQ, Suscriptores. Only one section is visible at a time.
