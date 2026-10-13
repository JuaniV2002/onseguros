# AdminEditor

The admin's Markdown editor with a formatting toolbar and a live preview, used for blog posts, FAQs and AI drafts.

**Markup:** `.editor-container` (two columns) > `.editor-panel` (`.editor-header` + h2, FormField groups, `.markdown-toolbar` of `.toolbar-group`s of `button.toolbar-btn` with 16px icons and `.toolbar-divider`s, the content `<textarea>` joined under the toolbar, `.form-actions`) + `.preview-panel` (`.preview-header` with “Vista previa” and `span.preview-badge` “En vivo”, `.preview-content` > `.preview-article` with `.preview-title`, `.preview-description`, `.preview-meta`, `.preview-body`).

- Panels: white, `radius-lg`, `effect-raised`, 1px `admin-gray-100` edge. The preview panel is sticky beside the editor.
- Toolbar: sticky under the admin header, translucent `admin-bg`; 32px square buttons, 1px `admin-gray-200`, `admin-gray-600` icons, hover `admin-primary-text` and a 1px lift. Buttons carry Spanish titles with shortcuts (“Negrita (Ctrl+B)”).
- Content textarea: 14px / 1.7, at least 400px tall in the real panel.
- “En vivo” badge: `admin-success-text` on `admin-success-light` with a pulsing dot (stops under reduced motion).
- Preview: `admin-preview-title` (Space Grotesk 32px) and `admin-preview-body` (16px / 1.8, `admin-gray-700`); links in `admin-primary-text`.
- Editing a draft changes its `updated_at`, which invalidates the publish link in Mariano's email — after editing, publish from the panel.
- The textarea text in the preview is sample copy.
