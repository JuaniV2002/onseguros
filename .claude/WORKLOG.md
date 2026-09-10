
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
