OnSeguros is Mariano Villanueva's insurance brokerage in Río Cuarto, Córdoba — agro (granizo), ART and patrimonial cover, sold person-to-person for 25+ years. The site is calm, editorial and flat: left-aligned type, hairline rules instead of boxes, logo blue for actions and a single yellow accent. Slogan: **Activá tranquilidad**.

## Content fundamentals

- **Spanish, Argentine register, always *vos*.** “Protegé tus cosechas”, “Cotizá con Oni”, “¿Ya sos cliente?” — never *tú* (“protege”, “cotiza”). Warm and professional, like Mariano talking across his desk.
- **Speak to the client, about Mariano.** “Mariano te contacta con la cotización personalizada”, “Mariano Villanueva, productor asesor habilitado, te brinda asesoramiento personalizado.” The company is *nosotros*; the person is Mariano.
- **CTAs are short voseo imperatives**, optionally with `→` when they navigate: *Cotizá con Oni →*, *Cotizar Ahora →*, *Reportar siniestro →*, *Suscribirme*, *Agendar Cita*.
- **Headlines pair a promise with tranquility**: “Tu tranquilidad, nuestra misión”, “Activá tranquilidad con nuestros seguros”, “Tu viaje es tu viaje. Nosotros lo protegemos.” Title Case is used on short labels (*Seguros Agrícolas*, *Años de Experiencia*); sentences elsewhere.
- **Concrete over vague.** Name the risks (granizo, incendio, resiembra, heladas), the place (Río Cuarto y zona) and the numbers that are true (+25 años, +8 aseguradoras, 24/7). No invented stats.
- **Fine print is honest and small**: “Coberturas sujetas a condiciones del producto contratado.” · “Gratis · Sin compromiso · Respuesta rápida” (middle dots separate short claims).
- **No emoji** in marketing copy. The only exceptions are the live weather/dollar widgets (🌡️, 💵) and Oni's 👋 welcome — don't spread them.
- Don't rewrite or translate existing copy without being asked; match the voice of what is there.

## Color

- Ground `bg-primary`; body copy `text-primary`; descriptions and labels `text-secondary`; fine print `text-tertiary`. All three pass 4.5:1 on every `surface-*` and `surface-band` in both themes.
- **Blue has three jobs.** The logo blue `brand-blue` is the mark and decorative fills only — white on it is just 3.9:1. Anything with a label (primary buttons, nav CTA, Oni button) fills with `brand-blue-strong` (hover `brand-blue-hover`) and `on-brand` text, 5.0:1 at any size; labels stay `button-brand` (19px / 700) for presence. Blue *text* is always `link` / `link-hover`.
- `brand-ink` (logo navy) is the one dark brand surface — the Oni card and the skip link.
- `color-accent` yellow appears once per view: the hero highlight underline (0.14em) and the 2px `accent-dark` eyebrow dash. Never as text or a fill behind text on light grounds.
- `color-secondary` is the gray of the wordmark; decorative only.
- Alternate sections sit on the warm `surface-band` (Services, Contact, the featured quote).
- Status colors (`error-500`, `success-500`, `warning-500`) always travel with a word or ⚠/✓ mark.
- Partner colors stay inside partner blocks: `ua-blue` only behind Universal Assistance's white logo; `whatsapp-green`/`whatsapp-deep` only on the WhatsApp button.
- Dark mode follows `prefers-color-scheme` and the toggle (`[data-theme="dark"]`): neutral grays, no blue tint; `link` and `color-primary` lift to 68% lightness.

## Type

- Two Google faces: **Space Grotesk** (`display`) for every heading, figure and list-row title; **Inter** (`sans`) for body and UI. Headings get letter-spacing −0.02em or tighter.
- Scale: `hero-title` → `section-title` → `card-title` / `row-title` for display; `lead`, `body-lg`, `body`, `small`, `fineprint` for text. Large display sizes are fluid `clamp()`s — the tokens hold the maximum, each usage note gives the clamp.
- Labels on brand buttons are always `button-brand` (19px / 700).
- `eyebrow`: 12px, 600, uppercase, 0.08em tracking, `text-secondary`, led by a 2rem × 2px `accent-dark` dash in the hero.
- Highlight one phrase per hero with an underline in `color-accent` — never gradient text.
- Body line-height 1.6; descriptions 1.625; balance long titles (`text-wrap: balance`).

## Layout, rules and shape

- **Index of rows, not grids of cards.** Lists (services, stats, contact, FAQ, hero lines) open with a 2px `rule-strong` and separate rows with 1px `rule` (or `border-medium` on `surface-band`). See ServiceRow, StatsStrip, ContactRow, Accordion.
- **Borders, not shadows.** Content is flat. The only shadows are `float-shadow` / `float-shadow-scrolled` on the floating header and footer cards (and the partner travel card). `shadow-*`, `effect-*`, `btn-shadow*` and `highlight-top*` are legacy (pre-redesign pages and the admin) — don't use them in new work.
- Radii: `radius-md` (8px) for buttons, inputs and panels; `radius-xl` (16px) for the floating cards; `radius-full` for avatars. Nothing pill-shaped except the WhatsApp button.
- Spacing on a rem scale: `space-md` mobile gutter, `space-lg` tablet, `space-xl` desktop; sections breathe at `space-5xl`. Page column `container-xl` (1280px).
- Left-aligned, editorial: section headers max ~46rem, descriptions max 56–60ch.
- **Motion is minimal**: content is visible immediately (no scroll-in animations); only 150ms hover color changes and a 3px arrow nudge. Respect `prefers-reduced-motion`.
- **Loading states mirror the content** (Skeleton): build them from the real item markup with `skeleton-line` bars in `skeleton-fill`, same count and spacing, `aria-busy` on the container. One slow opacity pulse, no shimmer; still under reduced motion.
- **Accessibility is a requirement**: 48px buttons/inputs, 44px nav targets, a visible 2px `focus-ring` everywhere (`on-brand` on navy), skip link, ARIA on interactive widgets, high-contrast mode turns borders solid black.

## Iconography

- **Lucide** icons (24×24, 2px stroke, round caps), stored as SVG files in **Icons** and placed with `<img>` at 20–24px. They render black; in dark mode the site inverts them (`filter: invert(1) brightness(1.2)`; `.os-icon` in this system).
- Lines of business: wheat (agro), building-2 + helmet (ART), store / house / building (integrales), car (siniestros). Contact: whatsapp, phone, mail, map-pin. The admin editor uses the formatting set (bold, italic, heading-1…3, list, table-2…).
- helmet, seatbelt and whatsapp are not Lucide (custom / Simple Icons). helmet and seatbelt draw in `currentColor` like the rest, so they invert in dark too.
- Don't use emoji as icons.

## Logos

- **OnSeguros wordmark** (`logo.svg`): the blue power-button “On” + gray “Seguros”. Use it as-is at ≥40px tall in the header (52px there). `slogan.svg` adds “Activá tranquilidad” beneath. `favicon.svg` is the “On” alone.
- The wordmark's gray is light; place it on light grounds (`bg-primary`, `surface-raised`). Don't recolor, outline or rebuild it.
- **Insurer logos** (Partners) run as a grayscale row at 70% opacity under a hairline (inverted in dark). **Universal Assistance** is never recolored: its blue logo on light, its white negative on dark or on `ua-blue`, with clear space ≥ its own height.

## Footer

- Every page ends with the floating footer card (Footer): same float as the header, a huge “OnSeguros” watermark in `float-watermark` (its “On” a hint of blue, `float-watermark-on`) resting just above the bottom edge (descenders fully visible), eyebrow column titles and 14px links.
- The theme toggle lives in the footer; the “Usalos siempre” helmet + seatbelt reminder sits under the brand line.

## Blog

- The listing (BlogCard) is an index of ruled rows with a date column; the newest post leads with a larger title and an “¡Nuevo!” label underlined in `accent-dark`.
- Posts (BlogPost) open with a 2px rule, an eyebrow date led by the yellow dash, a `post-title`, then `prose` at 18px / 1.75 in a 760px column. Quotes get a yellow left rule, tables are ruled rows.
- Inputs on these pages use the 1px `field-border` (3:1), and the Newsletter closes every blog page.

## Oni chat

- The quote agent (OniChat) is a flat chat card opened by the 2px rule: agent bubbles on the warm band (`chat-agent-bg`), client bubbles in navy (`chat-user-bg`) with white text, an outlined “O” avatar.
- Oni speaks vos and in short turns (“¿Qué tipo de seguro necesitás cotizar hoy?”); the welcome is the only place an emoji (👋) appears. Oni gathers details, Mariano quotes, and the hand-off opens WhatsApp.
- Suggestion chips name the lines of business in one word (Automotor, Hogar, ART, Agrícola, Comercio…).

## Claim form and FAQ

- The claim form (ClaimForm) is the site's one long form: an eyebrow header, a warm `surface-band` note with the urgent WhatsApp/phone links, then five numbered sections each opened by a 2px rule. Its fields are flat (1px `claim-field-border`, `radius-sm`), errors and required marks use `claim-error`, and submit opens WhatsApp — nothing is uploaded.
- The FAQ page (FaqFilter) pairs a search field and category filter with the numbered Accordion; on desktop the filters become a sticky ruled index with the active one underlined in yellow.

## Admin panel

- /admin/ is Mariano's private tool and keeps its own older look: white raised cards, `effect-raised` shadows, a gray scale (`admin-gray-*`), a floating bottom nav (AdminNav), toasts and status badges. It is **light-only**; its tokens have no dark values.
- Don't bring the admin style to the public site, and don't restyle the admin without asking. Section order is Borradores, Blog, FAQ, Suscriptores.
- Admin loaders are `.is-skeleton` copies of the real rows (posts, FAQs, drafts, subscriber table) filled with `admin-skeleton-fill`, never a boxed card around them.
- Admin text meets 4.5:1 too: labeled fills use `brand-blue-strong` and `error-600`, blue text uses `admin-primary-text`, green text `admin-success-text`, placeholders `admin-gray-500`, and every badge's text is dark enough for its wash. `brand-blue` stays only for bars and borders there.

## Not synced

Built from the local checkout of the onseguros repository: `assets/css/style.css`, `components/` (header, footer, accordion), `blog/blog.css`, `agente/agente.css`, `admin/admin.css` and `admin/admin-drafts.js`. Not representable here: the `-rgb` triplet variables (`--color-text-rgb` etc. are not colors; their rgba results are resolved into `border-*`, `field-border` and `shadow-*`), `--card-gradient` (a gradient) and the `--transition-*` durations (no motion family; 150/250/350ms ease-in-out). Fonts are Google-hosted, so no font files are stored. Components are a static, hand-written rendition of the site's own CSS classes (the site has no component library); `.testimonial-card--featured`, `.os-icon`, `.eyebrow-dash`, `.highlight`, `.is-open`, `.admin`, `.status-badge`/`.status--*`, `.faq-tools--index` (the FAQ filter's ≥1024px layout) and `.editor-textarea` are names used in this system for rules the site scopes to `body.landing`, `:hover`, `:first-child` or writes inline. The claim form's field border and placeholder are `color-mix()` values in the code, stored here resolved (`claim-field-border`, `claim-placeholder`). Pages without a component of their own: the legal pages (they use Accordion and the global type), 404 and unsubscribe (they reuse Button).
