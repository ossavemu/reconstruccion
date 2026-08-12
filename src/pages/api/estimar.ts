import type { APIRoute } from "astro";
import Anthropic from "@anthropic-ai/sdk";

export const prerender = false;

const ESTIMATE_SCHEMA = {
  type: "object",
  additionalProperties: false,
  required: [
    "costo_min_cop",
    "costo_max_cop",
    "nivel_riesgo",
    "resumen",
    "recomendaciones",
    "requiere_inspeccion_urgente",
  ],
  properties: {
    costo_min_cop: { type: "integer" },
    costo_max_cop: { type: "integer" },
    nivel_riesgo: { type: "string", enum: ["bajo", "medio", "alto", "critico"] },
    resumen: { type: "string" },
    recomendaciones: { type: "array", items: { type: "string" } },
    requiere_inspeccion_urgente: { type: "boolean" },
  },
} as const;

const SYSTEM_PROMPT = `Eres un estimador de costos de construccion con amplia experiencia en evaluacion de danos post-terremoto en viviendas colombianas. A partir de la descripcion de una vivienda afectada, produce una estimacion monetaria preliminar del costo de reparacion o reconstruccion en pesos colombianos (COP), usando precios actuales de materiales y mano de obra en Colombia.

Reglas:
- Entrega un rango (minimo y maximo) realista y conservador, en COP, numeros enteros.
- Si el dano descrito implica colapso total, estima el costo de reconstruccion completa segun el area.
- Clasifica el nivel de riesgo estructural como bajo, medio, alto o critico.
- Marca requiere_inspeccion_urgente en true si hay indicios de riesgo para la vida (colapsos, columnas agrietadas, techos inclinados).
- El resumen debe ser breve, claro y en un tono empatico dirigido a una persona que perdio su vivienda.
- Da entre 2 y 4 recomendaciones practicas e inmediatas.`;

function json(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const POST: APIRoute = async ({ request }) => {
  const apiKey = import.meta.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    return json(
      { error: "El estimador no esta configurado todavia. Intente mas tarde." },
      503,
    );
  }

  let body: Record<string, string>;
  try {
    body = await request.json();
  } catch {
    return json({ error: "Solicitud invalida." }, 400);
  }

  const { municipio, tipoVivienda, areaM2, nivelDano, descripcion } = body;
  if (!municipio || !tipoVivienda || !areaM2 || !nivelDano || !descripcion) {
    return json({ error: "Complete todos los campos del formulario." }, 400);
  }

  const userPrompt = `Vivienda afectada por el terremoto:
- Municipio: ${municipio}
- Tipo de vivienda: ${tipoVivienda}
- Area aproximada: ${areaM2} m2
- Nivel de dano observado: ${nivelDano}
- Descripcion de la persona afectada: ${descripcion}`;

  const client = new Anthropic({ apiKey });

  try {
    const response = await client.beta.messages.create({
      model: "claude-opus-5",
      max_tokens: 16000,
      betas: ["server-side-fallback-2026-07-01"],
      // Server-side refusal fallback: if safety classifiers decline, the API
      // re-serves the request on the recommended fallback model.
      fallbacks: "default",
      system: SYSTEM_PROMPT,
      output_config: {
        format: { type: "json_schema", schema: ESTIMATE_SCHEMA },
      },
      messages: [{ role: "user", content: userPrompt }],
    } as Anthropic.Beta.Messages.MessageCreateParamsNonStreaming);

    if (response.stop_reason === "refusal") {
      return json(
        { error: "No pudimos generar la estimacion para esta solicitud." },
        502,
      );
    }

    const text = response.content.find((block) => block.type === "text");
    if (!text || text.type !== "text") {
      return json({ error: "La IA no devolvio una estimacion valida." }, 502);
    }

    return json({ estimacion: JSON.parse(text.text) });
  } catch (error) {
    console.error("estimar endpoint error:", error);
    return json(
      { error: "Ocurrio un error generando la estimacion. Intente de nuevo." },
      500,
    );
  }
};
