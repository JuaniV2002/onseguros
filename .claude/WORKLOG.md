
## 2026-09-01 — widgets clima + dólar en landing
- done: strip de dos tarjetas entre hero y "¿Por qué elegir OnSeguros?" — clima de Río Cuarto (Open-Meteo) y dólar oficial (dolarapi.com). Nuevo `assets/js/live-widgets.js`, CSS `.liveinfo*` al final de `style.css`, markup en `index.html` (sección `#en-vivo`).
- state: done — commit 8f6bebe. Verificado en local (claro/oscuro/mobile 390px) y probados los dos caminos de fallo.
- next: push a master para que salga a producción.

## 2026-09-01 — widgets achicados a píldoras
- done: Mariano los vio muy grandes. Las tarjetas (312px de alto) pasaron a píldoras de una línea (~77px): ícono + label + valor. Sensación/humedad/viento/máx-mín y el sello de actualización viven ahora en el `title` (tooltip) de cada píldora.
- state: done — verificado en claro/oscuro, 390px y 320px con valores extremos.
- next: push a master.

## 2026-09-10 — línea nueva de teléfono separada de WhatsApp
- done: teléfono de llamadas → 3584921111 (`tel:+543584921111`, schema `+54-358-492-1111`) en index/blog/siniestros/legal×3. WhatsApp queda en 3584122566 en todos los `wa.me`. En `legal/accesibilidad` se separó el ítem "WhatsApp / Teléfono" en dos. El placeholder del form de siniestros pasó a número de ejemplo.
- state: done — verificado en navegador: todos los `tel:` apuntan al nuevo y todos los `wa.me` al viejo; JSON-LD válido.
- pushed: solo el commit de teléfonos (03a0660) a master. Local estaba 88 commits atrás (todos del bot de sitemap): rebase sobre origin/master y cherry-pick del commit de teléfonos para no arrastrar los widgets. Deploy OK, verificado en producción.
- state: done y en producción.
- next: los widgets de clima/dólar siguen locales esperando ajustes de Mariano. OJO: `.claude/` no está en los excludes del rsync de deploy.yml — al pushear los widgets, el WORKLOG queda público en onseguros.net/.claude/WORKLOG.md.

## 2026-09-10 — clima desde el SMN + dólar etiquetado como BNA
- done: `.claude` agregado a los excludes del rsync (8bcd10f). Nueva edge function `supabase/functions/get-clima-api` que baja el ZIP del open data del SMN, lo infla con DecompressionStream (sin librería de zip) y sirve la línea de Río Cuarto como JSON. `live-widgets.js` reescrito para consumirla vía `API_BASE_URL` (no hizo falta clave nueva en config.json). Etiquetas: "Río Cuarto · SMN" y "Dólar oficial · Banco Nación".
- Verificado: dolarapi `oficial` == pizarra de bna.com.ar exacto (1485/1535), así que el dólar ya era BNA, solo faltaba decirlo. Íconos probados contra los 20 estados que publicó el SMN hoy.
- state: BLOQUEADO para deployar — el CLI de supabase de esta máquina está logueado en otra cuenta y da 403 en el proyecto tgokvwuiiglioegxgcpu.
- next: deployar con `supabase functions deploy get-clima-api --no-verify-jwt --project-ref tgokvwuiiglioegxgcpu` desde la cuenta de Mariano, verificar el endpoint, recién ahí pushear (si no, la píldora del clima se oculta sola en producción).

## 2026-09-10 — todo en producción
- done: `get-clima-api` deployada (el error de Mariano era estar parado en `~` en vez del repo). Pusheados los 7 commits. Bug encontrado al verificar: Cloudflare cachea `style.css` con max-age=14400, así que los widgets salieron sin estilos — se versionaron las 18 referencias a `style.css?v=3` (mismo patrón que el `?v=2` de component-loader).
- state: done. Verificado en vivo: píldoras con estilos, clima del SMN, dólar BNA, tel nuevo, wa.me viejo, `.claude` da 404.
- next: nada pendiente. Si se toca el CSS y hace falta que se vea ya, subir el `?v=`.

## 2026-10-08 — rediseño de la landing (sacarle el "look IA")
- done: commit 30c2f54 en rama `landing-redesign` (NO en master). Bloque CSS nuevo al final de style.css, todo bajo `body.landing`; hero con índice 01–03 en vez de tarjetas flotantes, servicios en filas, testimonio destacado, sin gradientes/glows/fade-ins. style.css → ?v=4 en 11 HTML. Copy sin cambios.
- state: reviewer limpio, QA PASS (4 anchos × claro/oscuro, teclado, reduced-motion, otras páginas iguales). Esperando que Mariano lo vea.
- next: si aprueba → merge a master + push. Pendiente de decisión: botón con gradiente "Cotizá con Oni" del header (header quedó fuera de alcance). Deuda chica: HeroAnimations en script.js:751-845 ahora es código muerto; `.btn--primary` global no pasa AA (style.css:635); style.css duplicado en faq/ y siniestros/.

## 2026-10-08 — "des-IA-zado" extendido a todo el sitio público
- done: en `landing-redesign` (sin push): 36e9b91 (azul del logo #2e7ef6, header/footer planos, blog/faq/legal/agente/siniestros/sitemap/404/unsubscribe restyle, ?v= bumpeados: style.css v6, script.js v2, loader v3), 81e4ed7 (console.log de blog.js), 4abe6ea (markup terminos + alt FAQ). Reviewer + QA PASS (15 páginas × 4 anchos × claro/oscuro), admin intacto.
- state: esperando que Mariano lo vea.
- next: decisiones pendientes: botones 19px bold (AA con azul del logo) vs fill más oscuro; ocultar WhatsApp FAB en /agente/ (input queda angosto en 320); "Volver al Inicio" en legal/* apunta a /legal/; Formspree blog (xgolwvob) ≠ landing (xdkyknqv); blog y FAQ en producción devuelven 0 items; copy "Encuentra"→"Encontrá" en faq. Deuda: siniestros.js:241-252 sin aria-invalid, chips FAQ sin aria-pressed, reglas .legal-page* muertas en style.css (~2749-2880).

## 2026-10-12 — header/footer flotantes de nuevo + huecos
- done: 1 commit en `landing-redesign` (sin push). Mariano quería el header/footer "que flotan" de antes → cards con inset, borde fino y una sombra suave, sin gradiente/glow. Sacados `min-height` del newsletter y `100vh` de blog/faq/legal (causaban los huecos enormes). loader v4, style.css v7. Reviewer PASS, QA del designer 11 páginas × 4 anchos × claro/oscuro.
- state: esperando que Mariano lo vea.
- next: nit: en páginas muy cortas en pantallas muy altas el footer no queda pegado abajo (body no es flex). Reglas `.legal-page` en style.css ~2586/2699 usan tokens inexistentes, borrables.
