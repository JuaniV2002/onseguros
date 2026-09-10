/**
 * OnSeguros — Widgets en vivo: clima de Río Cuarto y dólar oficial.
 *
 * Clima: Servicio Meteorológico Nacional, vía la edge function get-clima-api
 *        (el open data del SMN viene en un ZIP sin CORS, así que no se puede
 *        leer directo desde el navegador).
 * Dólar: dolarAPI /dolares/oficial, que replica la pizarra de Banco Nación.
 *        `venta` es el tipo vendedor.
 */

'use strict';

(function () {
    const REFRESH_MS = 10 * 60 * 1000;
    const TZ = 'America/Argentina/Cordoba';

    const DOLAR_URL = 'https://dolarapi.com/v1/dolares/oficial';

    // Estados del SMN → [ícono de día, ícono de noche]. Se evalúa en orden:
    // "Nublado con tormenta sin precipitación" tiene que caer en tormenta,
    // no en nublado.
    const ICONOS = [
        [/tormenta|graniz/i, '⛈️', '⛈️'],
        [/nieve|nevada|aguanieve/i, '🌨️', '🌨️'],
        // Ojo: no se matchea "precipitación" suelto. Los dos estados del SMN que la
        // nombran son "tormenta sin precipitación" (ya cae en tormenta arriba) y
        // "precipitación a la vista", que es lluvia a lo lejos, no sobre la ciudad.
        [/llovizna|lluvia|chaparr/i, '🌧️', '🌧️'],
        [/niebla|neblina|bruma|humo|polvo/i, '🌫️', '🌫️'],
        [/parcialmente nublado|algo nublado/i, '⛅', '☁️'],
        [/cubierto|nublado/i, '☁️', '☁️'],
        [/despejado|claro/i, '☀️', '🌙']
    ];

    const pesos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
    const grados = new Intl.NumberFormat('es-AR', { minimumFractionDigits: 1, maximumFractionDigits: 1 });
    const fechaHora = new Intl.DateTimeFormat('es-AR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
    });

    const $ = (id) => document.getElementById(id);

    // Una vez que una tarjeta cargó bien, un fallo posterior deja los últimos
    // datos a la vista en lugar de esconder la tarjeta.
    const loaded = { 'weather-card': false, 'dolar-card': false };

    async function getJSON(url) {
        const res = await fetch(url, { cache: 'no-store' });
        if (!res.ok) throw new Error(url + ' → HTTP ' + res.status);
        return res.json();
    }

    function ready(cardId) {
        loaded[cardId] = true;
        const card = $(cardId);
        if (!card) return;
        card.removeAttribute('aria-busy');
        card.classList.remove('liveinfo__card--loading');
    }

    function fail(cardId, error) {
        console.error('[live-widgets]', error);
        if (loaded[cardId]) return;
        const card = $(cardId);
        if (card) card.hidden = true;

        // Si ninguna de las dos tarjetas pudo cargar, se oculta la sección entera.
        const section = document.querySelector('.liveinfo');
        if (section && !section.querySelector('.liveinfo__card:not([hidden])')) {
            section.hidden = true;
        }
    }

    /** Ícono según el estado del SMN, de día o de noche según la hora del dato. */
    function icono(estado, hora) {
        const h = parseInt(String(hora || '').slice(0, 2), 10);
        const esDia = !Number.isFinite(h) || (h >= 7 && h < 19);
        for (const [re, dia, noche] of ICONOS) {
            if (re.test(estado || '')) return esDia ? dia : noche;
        }
        return '🌡️';
    }

    async function renderClima() {
        const config = await window.envConfig.load();
        const base = config.API_BASE_URL;
        if (!base) throw new Error('falta API_BASE_URL en config.json');

        const d = await getJSON(base + '/get-clima-api?t=' + Date.now());
        if (d.error) throw new Error('get-clima-api: ' + d.error);

        $('weather-icon').textContent = icono(d.estado, d.hora);
        $('weather-desc').textContent = d.estado || '';
        $('weather-temp').textContent = d.temperatura === null ? '--°' : grados.format(d.temperatura) + '°';

        // El detalle va en el tooltip para no agrandar la píldora.
        const detalle = [];
        if (d.sensacion !== null && d.sensacion !== undefined) detalle.push('Sensación ' + grados.format(d.sensacion) + '°');
        if (d.humedad !== null) detalle.push('Humedad ' + Math.round(d.humedad) + '%');
        if (d.viento && d.viento.velocidad) detalle.push('Viento ' + d.viento.direccion + ' ' + Math.round(d.viento.velocidad) + ' km/h');
        else if (d.viento && d.viento.direccion) detalle.push('Viento ' + d.viento.direccion);
        if (d.visibilidad) detalle.push('Visibilidad ' + d.visibilidad);
        if (d.presion !== null) detalle.push('Presión ' + Math.round(d.presion) + ' hPa');
        if (d.hora) detalle.push('Medición de las ' + d.hora + ' hs');
        if (d.obsoleto) detalle.push('(el SMN no responde, último dato disponible)');
        $('weather-card').title = detalle.join(' · ');

        ready('weather-card');
    }

    async function renderDolar() {
        const d = await getJSON(DOLAR_URL);

        $('dolar-buy').textContent = '$' + pesos.format(d.compra);
        $('dolar-sell').textContent = '$' + pesos.format(d.venta);

        // Se muestra siempre la fecha: el oficial no se mueve sábados, domingos ni feriados.
        const updated = new Date(d.fechaActualizacion);
        $('dolar-card').title = 'Pizarra de Banco Nación · venta = tipo vendedor'
            + (isNaN(updated) ? '' : ' · Actualizado ' + fechaHora.format(updated).replace(', ', ' ') + ' hs');

        ready('dolar-card');
    }

    function tick() {
        renderClima().catch((e) => fail('weather-card', e));
        renderDolar().catch((e) => fail('dolar-card', e));
    }

    function init() {
        if (!document.querySelector('.liveinfo')) return;
        tick();
        setInterval(tick, REFRESH_MS);
    }

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        init();
    }
})();
