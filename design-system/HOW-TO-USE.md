# OnSeguros design system — offline copy

Snapshot of the OnSeguros design system (the live, editable version is the Design System artifact on claude.ai).
Not deployed: `.github/workflows/deploy.yml` excludes `/design-system/`.

- `README.md` — the brand book: voice, color, type, layout, icons, logos, and notes per page. Start here.
- `tokens.json` — every color (light + dark), type style, spacing, radius, shadow and layout value, each with a usage note.
- `tokens.css` — the same tokens as CSS custom properties (`[data-theme="dark"]` for dark).
- `components/bundle.css` — the component styles, written against the tokens.
- `components/<Name>/README.md` + `preview.html` — guidelines and a live preview per component. Open a preview through a local server from the repo root (`python3 -m http.server`, then `/design-system/components/Button/preview.html`); add `data-theme="dark"` to its `<html>` to see dark mode.
- `assets/` — logos, icons and partner marks (copies of `assets/` in the site).

If the site's CSS changes, ask Claude to re-sync the artifact, then refresh this folder.
