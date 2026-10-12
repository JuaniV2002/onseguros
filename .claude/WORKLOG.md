
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

## 2026-10-12 — header con más aire + marca de agua en footer
- done: e3fbbb5 en `landing-redesign` (sin push). Token `--float-pad` (16/24/32px) compartido por header/footer; header ocupa la columna de 1280px. Footer sin logo, con "OnSeguros" gigante casi invisible de fondo (estilo fieldrecreation.com), aria-hidden y recortado por la card. loader v5, style.css v8. Reviewer PASS.
- state: esperando que Mariano lo vea.
- next: el padding del footer en ≥640px bajó de 32/40 a 24/32px para igualar al header; confirmar que le gusta.

## 2026-10-12 — pasada mobile + marca de agua más sutil
- done: commit en `landing-redesign` (sin push). Auditoría QA 15 páginas × 7 viewports → arreglados: overflow de URLs largas en posts, input del chat a 16px, touch targets ≥44px, texto chico, FAB tapando footer, scroll-padding con `--header-h`. Marca de agua más clara, más arriba, oculta <640px. loader v6, style.css v9. Reviewer PASS.
- state: esperando que Mariano lo vea.
- next: decisiones pendientes: ocultar FAB WhatsApp en /agente/ (roza el input del chat), carrusel de logos del hero cortado a la derecha en mobile (¿intencional?). No probado en iPhone real.

## 2026-10-12 — WhatsApp al número fijo + sin FAB en /agente/
- done: 2 commits en `landing-redesign` (sin push). Mariano: el fijo 3584921111 ahora tiene WhatsApp Business → todos los `wa.me` y el número mostrado pasan de 3584122566 a 3584921111 (6 archivos). FAB de WhatsApp oculto en /agente/ y sacado el hueco que dejaba en el input del chat. loader v7, agente.css v5. QA PASS. Carrusel de logos cortado en mobile = intencional (confirmado).
- state: esperando que Mariano vea la rama.
- next: FAQs en la base (Supabase `faqs`) o el prompt de Oni (ai-quote-api, fuera del repo) podrían tener el número viejo — revisar. Si quiere el número nuevo en producción ya, hacer commit aparte sobre master (la rama del rediseño no se puede cherry-pickear limpio).

## 2026-10-12 — sección Universal Assistance en la landing
- done: commit en `landing-redesign` (sin push). Mariano es partner de UA. Sección #asistencia-al-viajero entre Servicios y Testimonios; logo blanco (vector extraído del manual de marca, `assets/logos/universal-assistance-negative.svg`) sobre azul UA en ambos temas; copy de las frases que UA manda a partners; CTA a WhatsApp con texto precargado; link en footer. loader v8, style.css v10. Reviewer PASS.
- state: esperando que Mariano lo vea.
- next: confirmar con UA vigencia de "USD 5 por día" y "USD 1.000.000" y si exigen legales; si UA da link/código de partner para venta online, reemplazar el CTA de WhatsApp.

## 2026-10-12 — UA en el carrusel + ajustes de la sección
- done: commit en `landing-redesign` (sin push). Logo color de UA (bicolor según manual, `assets/logos/universal-assistance.svg`) en el carrusel del hero, sin filtro gris, blanco en modo oscuro; loop del carrusel en mobile arreglado; sección UA sin párrafo intro, + ítem viajes deportivos, + "hasta 12 cuotas sin interés"; sacada la flecha de scroll del hero. style.css v11. Reviewer PASS.
- state: esperando que Mariano lo vea.
- next: se perdió la única mención de cobertura por embarazo al borrar el párrafo (¿agregar ítem?). UA es el único logo a color del carrusel — confirmar que le gusta.

## 2026-10-12 — UA al centro del carrusel + frase + foto de Iván de Pineda
- done: 2 commits en `landing-redesign` (sin push). UA 3º de 5 en el carrusel (tamaños por clase `--lg`, no por posición); panel azul de UA con "Tu viaje es tu viaje. Nosotros lo protegemos." y foto recortada de Iván de Pineda (embajador) anclada abajo-izquierda (`assets/images/ivan-de-pineda-ua.{webp,png}`). Aparte: arreglado overflow de 4px del newsletter a 640-645px. style.css v12. Reviewer PASS.
- state: esperando que Mariano lo vea.
- next: confirmar con UA que los partners pueden usar la imagen de Iván de Pineda y el slogan (derechos de imagen del embajador suelen ser restringidos). Mención de embarazo sacada a propósito (pedido de Mariano).

## 2026-10-12 — foto de Iván alineada a la derecha
- done: commit en `landing-redesign` (sin push). Sillón al ras del borde derecho/inferior del panel azul en todos los anchos; piernas cortadas se desvanecen a la izquierda (mask). style.css v13.
- state: esperando que Mariano lo vea.
- next: igual que antes: confirmar con UA permiso de imagen de Iván de Pineda y slogan.

## 2026-10-12 — logo UA "A company of Zurich" en el panel
- done: commit en `landing-redesign` (sin push). Panel azul usa `assets/logos/universal-assistance-zurich-negative.svg` (lo pasó Juani) a todo el ancho del panel; columna del panel en desktop min 22rem. Carrusel sigue con el logo UA solo (no hay versión color del lockup). style.css v14.
- state: esperando OK final de Mariano.
- next: si UA manda versión color del lockup Zurich, se puede usar también en el carrusel.

## 2026-10-12 — cotizaciones y siniestros por WhatsApp, fuera del admin
- done: 43e2c1c en `landing-redesign` (sin push). Oni muestra "Enviar consulta por WhatsApp" (nombre opcional + resumen) en vez de POST a QUOTE_API_URL; /siniestros/ abre wa.me/543584921111 con los campos agrupados, sin subida de fotos (van en el chat), email opcional, nada a Supabase. Admin sin tabs Cotizaciones/Siniestros (JS+CSS borrados), 5 keys fuera de deploy.yml. Aparte: 240cc66 Borradores ya no queda resaltado al cambiar de tab; 574e0b6 `.playwright-mcp/` ignorado. Reviewer+security+QA PASS.
- state: esperando que Mariano lo pruebe en un celular real.
- next: limpieza manual en Supabase (security, prioridad media): borrar edge fns submit-siniestro-api/send-quote-email-api/get-siniestros-api/get-quotes-api/update-quote-status-api (siguen aceptando llamadas anónimas); exportar y borrar o privatizar el bucket público `siniestros-fotos` (fotos con PII, probable INSERT anónimo); exportar/dropear tablas `quote_requests`/`siniestros`; borrar los 5 GitHub Secrets. Revisar prompt de Oni (ai-quote-api) por si dice "te contactamos por email". Botón Clientes del admin no hace nada (decisión de producto). Política de privacidad no menciona WhatsApp/Meta.

## 2026-10-12 — pendientes del handoff a WhatsApp
- done: 3c3a08c botón Clientes fuera del admin; f59a7d9 política de privacidad menciona WhatsApp/Meta, datos de siniestros y Google (Oni); 3b5b588+c14077f fuente de `ai-quote-api` ahora en el repo y prompt pide tocar el botón de WhatsApp (NO desplegado); cf53ff2 runbook `supabase/RETIRE_QUOTES_SINIESTROS.md`. Backup de las 5 fotos del bucket + fuente v19 de Oni en `~/onseguros-backups/2026-10-12/`. Chequeado: un visitante anónimo ve 0 filas de quote_requests/siniestros (RLS ok, no hay fuga).
- state: limpieza de Supabase en espera — Juani eligió hacerla recién cuando la rama esté en producción (master todavía usa el flujo viejo).
- next: al publicar la rama, correr el runbook en orden (deploy Oni → export CSV de las tablas desde el Dashboard, el CLI no tiene password de DB → borrar funciones, bucket, tablas, secrets). Aparte: el prompt de Oni llama al asesor "Mariano Villanueva" (¿correcto?); `get-clima-api` desplegada y no documentada; `generate-faq-draft`/`publish-faq-draft-api` desplegadas con verify_jwt=true aunque CLAUDE.md dice --no-verify-jwt (el cron/link de mail podrían estar fallando — revisar).

## 2026-10-12 — fix pipeline FAQ + rama pusheada, PR #1
- done: c2cf010 `config.toml` fija verify_jwt=false para generate/publish (blog y FAQ) + ai-quote-api; WEEKLY_DRAFT_DEPLOY.md documenta el deploy FAQ. Causa: generate-faq-draft y publish-faq-draft-api desplegadas con JWT → 401 del gateway (link "Publicar" del mail de FAQ y cron FAQ rotos; blog ok). Rama `landing-redesign` pusheada, PR https://github.com/JuaniV2002/onseguros/pull/1. CLAUDE.md: dueño = Mariano Villanueva, get-clima-api documentada.
- state: bloqueado — el clasificador de auto mode rechazó el deploy de funciones y el merge a master; los hace Juani o los autoriza.
- next: merge PR #1 → verificar prod → redeploy `generate-faq-draft` y `publish-faq-draft-api` con --no-verify-jwt y reprobar (esperado: respuesta de la función, no UNAUTHORIZED_NO_AUTH_HEADER) → runbook RETIRE_QUOTES_SINIESTROS.md (Juani exporta CSV de tablas). Revisar si el cron FAQ está agendado (`select * from cron.job`; en la migración está comentado).

## 2026-10-12 — rama en producción + backend viejo retirado
- done: PR #1 mergeado (4e94929), deploy OK; prod verificado (siniestros sin fotos, agente.js v3, admin sin tabs, config.json sin keys viejas). generate-faq-draft/publish-faq-draft-api redeployadas sin JWT (ahora responden la función: 401 propio / 400 HTML). Oni con prompt nuevo (smoke: resumen + "Tocá el botón", no pide datos). Runbook completo: 5 fns borradas, bucket siniestros-fotos borrado, tablas exportadas a JSON (3+3 filas) y dropeadas (migración 20261012173500), 5 GH secrets borrados, config.json local limpio.
- state: done.
- next: cron biweekly-faq-draft SÍ estaba agendado (`0 11 */14 * *`) y venía fallando por el 401; ver que el próximo corra bien. Ojo: `*/14` en día-del-mes corre días 1, 15, 29, no cada 14 días exactos.
