# AdminButton

Buttons of the admin panel (/admin/) — Mariano's private tool, an older raised style that is light-only.

**Markup:** inside the admin shell, `button.btn` + `btn-primary` | `btn-secondary` | `btn-danger`, optional `btn-sm`. Icons inside primary/danger are forced white.

- 15px / 600 labels, 12×24 padding, `radius-lg`, `btn-shadow`; hover lifts 2px with `btn-shadow-hover` (secondary: `effect-raised` → `effect-raised-hover`, label turns `admin-primary-text`).
- Primary fills `brand-blue-strong` (white 5.0:1, hover `brand-blue-hover`); danger fills `error-600` (white 4.8:1, hover `error-700`). In admin.css these are `--primary-fill` and `--error`.
- Copy is Spanish, short: “Nuevo Artículo”, “Guardar”, “Publicar”, “Eliminar”, “Cancelar”.
- These are not the public site's buttons — never use them outside /admin/.
