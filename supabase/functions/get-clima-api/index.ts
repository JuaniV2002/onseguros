/**
 * get-clima-api — observación actual del SMN para Río Cuarto.
 *
 * El SMN publica el estado del tiempo como un ZIP sin headers CORS, así que el
 * navegador no lo puede leer directo. Esta función lo baja, lo descomprime y
 * devuelve la línea de Río Cuarto como JSON.
 *
 * Público, sin secretos. Desplegar con --no-verify-jwt:
 *   supabase functions deploy get-clima-api --no-verify-jwt --project-ref tgokvwuiiglioegxgcpu
 */

import { corsHeaders, jsonResponse } from '../_shared/cors.ts'

const SMN_URL = 'https://ssl.smn.gob.ar/dpd/zipopendata.php?dato=tiepre'
const ESTACION = 'Río Cuarto'

// El SMN actualiza una vez por hora. Se cachea en memoria para no bajar el ZIP
// en cada visita a la home.
const CACHE_MS = 10 * 60 * 1000
let cache: { at: number; body: Record<string, unknown> } | null = null

/**
 * Extrae el único archivo de un ZIP con un solo entry.
 *
 * Se parsea el local file header a mano y se infla con DecompressionStream,
 * nativo en Deno — así no hace falta una librería de zip.
 */
async function unzipSingleFile(buf: ArrayBuffer): Promise<Uint8Array> {
  const bytes = new Uint8Array(buf)
  const view = new DataView(buf)

  if (view.getUint32(0, true) !== 0x04034b50) {
    throw new Error('la respuesta del SMN no es un ZIP')
  }

  const method = view.getUint16(8, true)
  const compressedSize = view.getUint32(18, true)
  const nameLen = view.getUint16(26, true)
  const extraLen = view.getUint16(28, true)
  const start = 30 + nameLen + extraLen

  // ponytail: se asume que el tamaño viene en el local file header (flag bit 3
  // sin usar), que es lo que escribe ZipArchive de PHP. Si el SMN cambiara a un
  // writer en streaming esto falla acá con un error claro en vez de devolver
  // basura; ahí habría que buscar la firma del central directory (PK\x01\x02).
  if (compressedSize === 0) {
    throw new Error('ZIP sin tamaño en el header (data descriptor), no soportado')
  }

  const payload = bytes.subarray(start, start + compressedSize)

  if (method === 0) return payload // stored, sin comprimir
  if (method !== 8) throw new Error(`método de compresión no soportado: ${method}`)

  const inflated = new Blob([payload])
    .stream()
    .pipeThrough(new DecompressionStream('deflate-raw'))

  return new Uint8Array(await new Response(inflated).arrayBuffer())
}

/**
 * Parsea una línea del open data del SMN. Formato (separado por ";"):
 *   estación;fecha;hora;estado;visibilidad;temp;sensación;humedad;viento;presión
 * Ejemplo:
 *   Río Cuarto;10-septiembre-2026;15:00;Nublado;15 km;17.2;No se calcula; 56;Este  14;961 /
 */
function parseLinea(linea: string) {
  const f = linea.split(';').map((x) => x.trim())

  // El viento viene como "Este  14" (dirección + km/h) o "Calma".
  const viento = f[8] ?? ''
  const kmh = viento.match(/(\d+(?:[.,]\d+)?)\s*$/)

  // Se extrae el primer número del campo en vez de confiar en la tolerancia de
  // parseFloat: la presión llega como "961 /" y la humedad como " 56", y los
  // campos sin dato dicen "No se calcula".
  const num = (s: string | undefined) => {
    const m = String(s ?? '').replace(',', '.').match(/-?\d+(?:\.\d+)?/)
    return m ? parseFloat(m[0]) : null
  }

  return {
    estacion: f[0],
    fecha: f[1],
    hora: f[2],
    estado: f[3],
    visibilidad: f[4] || null,
    temperatura: num(f[5]),
    // El SMN manda "No se calcula" muy seguido; se normaliza a null.
    sensacion: num(f[6]),
    humedad: num(f[7]),
    viento: {
      direccion: kmh ? viento.slice(0, kmh.index).trim() : viento || null,
      velocidad: kmh ? num(kmh[1]) : 0,
    },
    presion: num(f[9]),
    fuente: 'Servicio Meteorológico Nacional',
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (cache && Date.now() - cache.at < CACHE_MS) {
    return jsonResponse(cache.body)
  }

  try {
    const res = await fetch(SMN_URL, {
      headers: {
        // Sin User-Agent de navegador el SMN a veces corta la descarga.
        'User-Agent': 'Mozilla/5.0 (compatible; OnSeguros/1.0; +https://www.onseguros.net)',
      },
    })
    if (!res.ok) throw new Error(`SMN devolvió HTTP ${res.status}`)

    const txt = await unzipSingleFile(await res.arrayBuffer())
    // El open data del SMN viene en latin-1, no en UTF-8.
    const contenido = new TextDecoder('iso-8859-1').decode(txt)

    const linea = contenido
      .split('\n')
      .find((l) => l.trim().toLowerCase().startsWith(ESTACION.toLowerCase()))

    if (!linea) throw new Error(`no se encontró la estación "${ESTACION}" en el open data`)

    const body = parseLinea(linea)
    cache = { at: Date.now(), body }
    return jsonResponse(body)
  } catch (error) {
    console.error('[get-clima-api]', error)
    // Si hay algo cacheado, aunque esté viejo, es mejor que nada.
    if (cache) return jsonResponse({ ...cache.body, obsoleto: true })
    return jsonResponse({ error: String(error instanceof Error ? error.message : error) }, 502)
  }
})
