
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
