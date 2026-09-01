/**
 * OnSeguros — Widgets en vivo: clima de Río Cuarto y dólar oficial.
 *
 * Fuentes públicas, sin API key ni backend propio:
 *   - Open-Meteo (clima)  https://open-meteo.com
 *   - dolarAPI   (dólar)  https://dolarapi.com
 * Ambas responden con CORS abierto, así que se consultan directo desde el navegador.
 */

'use strict';

(function () {
    const REFRESH_MS = 10 * 60 * 1000;
    const TZ = 'America/Argentina/Cordoba';

    // Río Cuarto, Córdoba
    const WEATHER_URL = 'https://api.open-meteo.com/v1/forecast'
        + '?latitude=-33.1307&longitude=-64.3499'
        + '&current=temperature_2m,apparent_temperature,relative_humidity_2m,weather_code,wind_speed_10m,is_day'
        + '&daily=temperature_2m_max,temperature_2m_min&forecast_days=1'
        + '&timezone=' + encodeURIComponent(TZ);

    const DOLAR_URL = 'https://dolarapi.com/v1/dolares/oficial';

    // Códigos WMO → [descripción, ícono de día, ícono de noche (opcional)]
    const WMO = {
        0: ['Despejado', '☀️', '🌙'],
        1: ['Mayormente despejado', '🌤️', '🌙'],
        2: ['Parcialmente nublado', '⛅', '☁️'],
        3: ['Nublado', '☁️'],
        45: ['Niebla', '🌫️'],
        48: ['Niebla con escarcha', '🌫️'],
        51: ['Llovizna leve', '🌦️'],
        53: ['Llovizna', '🌦️'],
        55: ['Llovizna intensa', '🌧️'],
        56: ['Llovizna helada', '🌧️'],
        57: ['Llovizna helada', '🌧️'],
        61: ['Lluvia leve', '🌦️'],
        63: ['Lluvia', '🌧️'],
        65: ['Lluvia intensa', '🌧️'],
        66: ['Lluvia helada', '🌧️'],
        67: ['Lluvia helada', '🌧️'],
        71: ['Nevada leve', '🌨️'],
        73: ['Nevada', '🌨️'],
        75: ['Nevada intensa', '❄️'],
        77: ['Aguanieve', '🌨️'],
        80: ['Chaparrones', '🌦️'],
        81: ['Chaparrones', '🌧️'],
        82: ['Chaparrones fuertes', '⛈️'],
        85: ['Chaparrones de nieve', '🌨️'],
        86: ['Chaparrones de nieve', '🌨️'],
        95: ['Tormenta', '⛈️'],
        96: ['Tormenta con granizo', '⛈️'],
        99: ['Tormenta con granizo', '⛈️']
    };

    const pesos = new Intl.NumberFormat('es-AR', { maximumFractionDigits: 2 });
    const fechaHora = new Intl.DateTimeFormat('es-AR', {
        day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false, timeZone: TZ
    });

    const $ = (id) => document.getElementById(id);
    const deg = (v) => Math.round(v) + '°';

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

    async function renderWeather() {
        const data = await getJSON(WEATHER_URL);
        const now = data.current;
        const [desc, dayIcon, nightIcon] = WMO[now.weather_code] || ['Sin datos', '🌡️'];

        $('weather-icon').textContent = now.is_day ? dayIcon : (nightIcon || dayIcon);
        $('weather-desc').textContent = desc;
        $('weather-temp').textContent = deg(now.temperature_2m);

        // El detalle va en el tooltip para no agrandar la píldora.
        // now.time ya viene en hora local de Córdoba ("2026-09-01T10:45").
        $('weather-card').title = [
            'Sensación ' + deg(now.apparent_temperature),
            'Humedad ' + Math.round(now.relative_humidity_2m) + '%',
            'Viento ' + Math.round(now.wind_speed_10m) + ' km/h',
            'Máx ' + deg(data.daily.temperature_2m_max[0]) + ' · Mín ' + deg(data.daily.temperature_2m_min[0]),
            'Actualizado ' + now.time.slice(11, 16) + ' hs'
        ].join(' · ');
        ready('weather-card');
    }

    async function renderDolar() {
        const data = await getJSON(DOLAR_URL);

        $('dolar-buy').textContent = '$' + pesos.format(data.compra);
        $('dolar-sell').textContent = '$' + pesos.format(data.venta);

        // Se muestra siempre la fecha: el oficial no se mueve sábados, domingos ni feriados.
        const updated = new Date(data.fechaActualizacion);
        $('dolar-card').title = isNaN(updated)
            ? 'Cotización de referencia'
            : 'Cotización de referencia · Actualizado ' + fechaHora.format(updated).replace(', ', ' ') + ' hs';
        ready('dolar-card');
    }

    function tick() {
        renderWeather().catch((e) => fail('weather-card', e));
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
