# Newsletter

The Friday newsletter sign-up on the landing and both blog pages: pitch beside a single email field and a primary button.

**Markup:** `section.newsletter` > `.newsletter__container` > `.newsletter__content` (`h2.newsletter__title`, `p.newsletter__description`) + `form.newsletter__form` > `.newsletter__form-group` (visually hidden label, `input.newsletter__input`, `button.newsletter__button.btn.btn--primary` “Suscribirme”), `.newsletter__error[role=alert]`, `.newsletter__success[role=status]`, `p.newsletter__consent`.

- Opens with 2px `rule-strong`; no box or gradient. From 900px the pitch and the form sit side by side.
- Input: 48px, 1px `field-border`, `radius-md`; the button is the standard Button primary.
- Error text `error-text`; success text `success-text` beside a 3px `success-rule`. Both are announced (alert / status) and worded in vos.
- Consent line 12px `text-secondary` with an underlined `link` to the privacy policy, and says when emails go out.
- The success message in the preview is placeholder copy. Landing form posts to Formspree; blog forms to Supabase — both exist on purpose.
