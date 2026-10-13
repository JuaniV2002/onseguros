# FormField

Label + input well used by the claim form (/siniestros/), contact and admin forms.

**Markup:** `.form-group` > `.form-label` + `.form-input` (add `.form-textarea` to a `<textarea>`), optional `.form-error` message after the input.

- Well: `surface-sunken`, 2px `border-medium`, `radius-md`, padding `space-md`, `shadow-inset-subtle`, min-height 48px.
- Focus: border `color-primary`, a 3px `primary-lighter` halo, ground lifts to `surface-raised`.
- Error: only after a submit attempt — border `error-500` plus a message prefixed with ⚠ (never color alone). Messages speak *vos*: “Ingresá un email válido.”
- Labels: `label` style (14px / 500) in `text-primary`. Optional fields are announced to screen readers only.
- The consumer provides `id`/`for` pairs and `aria-describedby` for messages.
