# Toast

Admin feedback after saves, publishes and deletes; slides in at the bottom right.

**Markup:** `.toast-container` (fixed bottom-right) > `.toast.toast--success|error|info` > `.toast-icon` (✓ / ✕ / ℹ), `.toast-content` (`.toast-title`, `.toast-message`), `button.toast-close` ✕. Created by `showToast(message, type, title)` in admin-core.js; default titles Éxito / Error / Información.

- White card, `radius-lg`, `admin-toast-shadow`, 1px `admin-gray-100` edge, 300–400px wide, and a 4px left bar in the type color (`success-500`, `error-600`, `brand-blue`) with a matching icon on a light wash (`admin-success-text`, `error-600`, `admin-primary-text`). The close ✕ is `admin-gray-500`.
- Title Space Grotesk 14px / 600; message 13px `admin-gray-600`.
- Messages are short Spanish sentences that say what happened and what to do (“Reintentá en unos segundos.”). The sample messages in the preview are placeholders.
