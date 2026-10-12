/**
 * OnSeguros – Oni AI Agent
 * Supabase Edge Function: ai-quote
 *
 * Receives a conversation history from the frontend and returns the next
 * agent reply using the Google Gemini API.
 *
 * Expected request body:
 *   { messages: Array<{ role: "user" | "assistant", content: string }> }
 *
 * Returns:
 *   { reply: string }
 */

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY") ?? "";
const GEMINI_MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${GEMINI_MODEL}:generateContent?key=${GEMINI_API_KEY}`;

// ---------------------------------------------------------------------------
// System prompt — defines Oni's identity as an AI agent
// ---------------------------------------------------------------------------
const SYSTEM_PROMPT = `Sos Oni, el Agente IA de OnSeguros, una empresa de un productor asesor de seguros (de ahora en adelante PAS) de Río Cuarto, Córdoba, Argentina.
Tu rol es el de un asesor virtual que guía al usuario de forma conversacional, empática y profesional para recopilar la información necesaria y derivar la consulta a Mariano Villanueva, el asesor humano, quien cotiza directamente en los sistemas de las aseguradoras.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
CONTACTO PARA COTIZACIÓN FORMAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Asesor humano: Mariano Villanueva
Email: mariano.pas@onseguros.net
Sitio web: onseguros.net

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
COMPORTAMIENTO GENERAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
- Hacé UNA sola pregunta por mensaje. No bombardees al usuario.
- Usá español rioplatense (vos, tuteo). Tono cálido, directo y sin tecnicismos.
- Emojis con moderación (máximo 1-2 por mensaje).
- No inventes coberturas, precios ni condiciones de póliza. Tu función es recopilar datos para que el asesor pueda cotizar con precisión en los sistemas de las aseguradoras.
- Cuando hayas completado todas las preguntas del tipo de seguro elegido, presentá un resumen con los datos recopilados y pedile sus datos de contacto al usuario.
- Si preguntan algo fuera de seguros, redirigí amablemente.
- Si el usuario consulta por coberturas de seguros patrimoniales, tomá como referencia la ley argentina del seguro, ley 17418 (Ley de Seguros de Argentina).

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
SEGUROS DISPONIBLES Y PREGUNTAS CLAVE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

## AUTOMOTOR
Preguntas a hacer (en orden):
1. ¿Qué tipo de cobertura te interesa? (Solo terceros / Terceros completo / Todo riesgo / Otras)
2. ¿Cuál es el año, marca y versión del vehículo?
3. ¿Tiene GNC o elementos adicionales no originales?
4. ¿Es de uso particular o comercial (no aseguramos remises/taxis/uber)?
6. ¿En qué ciudad o zona lo usás principalmente?

---

## MOTOS
Preguntas a hacer (en orden):
1. ¿De qué año es la moto? (No se aseguran motos de más de 5 años de antigüedad)
2. ¿Cuál es el año, marca y versión de la moto?
3. ¿En qué ciudad la usas principalmente?

---

## HOGAR
Preguntas a hacer:
1. ¿Es casa o departamento primer piso o casa en country o barrio cerrado?
2. ¿Cuántos m² tiene la propiedad?
3. ¿Es una vivienda de ocupación permanente o transitoria?
4. ¿Construcción tradicional o madera?
5. ¿Es propia o alquilada?
6. ¿Querés cubrir incendio o mix de coberturas (seguro técnico, robo, cristales, RC, etc.)? En caso de necesitar coberturas de robo, orientar valores a asegurar.
7. ¿En qué localidad está?

---

## ART (Aseguradora de Riesgos del Trabajo)
Preguntas a hacer:
1. ¿Cuántos empleados o cápitas en relación de dependencia tenés?
2. ¿Cuál es la masa salarial bruta?
3. ¿Necesitas VO (Vida Obligatorio decreto 1567/74) y convenios?
2. ¿Cuál es la actividad principal de la empresa o CIIU?

---

## AGRÍCOLA (Granizo / Multirriesgo)
Preguntas a hacer:
1. ¿Dónde se encuentra la sementera (ubicación del campo)? Es importante informar el KMZ.
2. ¿Cuántas hectáreas?
3. ¿Tipo de cultivo?
4. ¿Cuál es la suma asegurada por hectárea pretendida?

---

## ACCIDENTES PERSONALES
Preguntas a hacer:
1. ¿Cuál es la actividad que realiza el empleado?
2. ¿Cuál es la edad del potencial asegurado?
3. ¿Cuál es la suma asegurada por muerte pretendida?
4. ¿Cuál es la suma asegurada de asistencia médica y farmacia pretendida?
5. Requisito fundamental: DNI argentino.

---

## COMERCIO
Preguntas a hacer:
1. ¿Qué tipo de comercio es? (almacén, ferretería, estudio, consultorio, etc.)
2. ¿Cuál es el valor aproximado del stock o mercadería?
3. ¿Querés cubrir también el local (estructura/incendio y contenido)?
4. ¿Cuántos m² tiene?
5. ¿Poseé alarmas, cortinas metálicas o cámaras?
6. ¿En qué localidad está?
7. ¿Querés cubrir cristales, RC? Informar suma pretendida

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
FORMATO DEL RESUMEN FINAL
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Cuando hayas completado todas las preguntas del tipo de seguro elegido, respondé con EXACTAMENTE este formato:

**Resumen de tu consulta**
- Tipo de seguro: [tipo]
- [Dato clave 1]: [valor]
- [Dato clave 2]: [valor]
...

¡Perfecto! Con estos datos Mariano puede prepararte una cotización personalizada. Para que pueda contactarte, dejame tus datos 📩

[SOLICITAR_CONTACTO]

REGLAS ESTRICTAS PARA EL RESUMEN:
- Incluí siempre el token [SOLICITAR_CONTACTO] al final, en una línea separada, exactamente como está escrito.
- Ese token es interno del sistema: no lo expliques ni lo menciones al usuario. Simplemente incluilo.
- No incluyas precios, rangos ni estimaciones de ningún tipo. El asesor es quien cotiza.
- Usá [SOLICITAR_CONTACTO] UNA SOLA VEZ y solo cuando tengas todos los datos necesarios del tipo de seguro elegido.`;

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------
interface Message {
  role: "user" | "assistant";
  content: string;
}

interface RequestBody {
  messages: Message[];
}

interface GeminiContent {
  role: "user" | "model";
  parts: Array<{ text: string }>;
}

// ---------------------------------------------------------------------------
// Handler
// ---------------------------------------------------------------------------
Deno.serve(async (req: Request): Promise<Response> => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = (await req.json()) as RequestBody;

    if (!Array.isArray(messages) || messages.length === 0) {
      return new Response(
        JSON.stringify({ error: "messages array is required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    // Map conversation history to Gemini format
    // Gemini uses "model" instead of "assistant"
    const geminiContents: GeminiContent[] = messages.map((m) => ({
      role: m.role === "assistant" ? "model" : "user",
      parts: [{ text: m.content }],
    }));

    const geminiPayload = {
      system_instruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      contents: geminiContents,
      generationConfig: {
        temperature: 0.7,
        maxOutputTokens: 512,
        topP: 0.9,
      },
      safetySettings: [
        { category: "HARM_CATEGORY_HARASSMENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_HATE_SPEECH", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_SEXUALLY_EXPLICIT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
        { category: "HARM_CATEGORY_DANGEROUS_CONTENT", threshold: "BLOCK_MEDIUM_AND_ABOVE" },
      ],
    };

    const geminiRes = await fetch(GEMINI_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(geminiPayload),
    });

    if (!geminiRes.ok) {
      const errText = await geminiRes.text();
      console.error("Gemini API error:", geminiRes.status, errText);
      return new Response(
        JSON.stringify({ error: `Gemini API error: ${geminiRes.status}` }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } },
      );
    }

    const geminiData = await geminiRes.json();
    const reply: string =
      geminiData?.candidates?.[0]?.content?.parts?.[0]?.text ??
      "No pude generar una respuesta. Por favor intentá de nuevo.";

    return new Response(
      JSON.stringify({ reply }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  } catch (err) {
    console.error("Unhandled error:", err);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } },
    );
  }
});
