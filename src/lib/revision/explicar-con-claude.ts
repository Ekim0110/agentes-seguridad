// El "agente": le pasamos a Claude lo que encontró el revisor y nos devuelve
// un resumen en español sencillo con los primeros pasos a seguir.
//
// Si no hay clave de Claude configurada, devolvemos null y la página muestra
// solo los hallazgos (que ya vienen explicados).

import Anthropic from "@anthropic-ai/sdk";
import type { Explicacion, ResultadoRevision } from "./tipos";

const ESQUEMA = {
  type: "object",
  properties: {
    resumen: {
      type: "string",
      description: "2 a 4 frases para el dueño de la web: qué tan segura está y qué es lo más urgente.",
    },
    primerosPasos: {
      type: "array",
      items: { type: "string" },
      description: "De 1 a 3 acciones concretas, en orden de prioridad.",
    },
  },
  required: ["resumen", "primerosPasos"],
  additionalProperties: false,
} as const;

const INSTRUCCIONES = `Eres un asesor de seguridad web que le explica resultados a una persona que está aprendiendo a programar.
Recibes los hallazgos de una revisión pasiva (cabeceras HTTP, HTTPS, certificado y cookies) de una web que su dueño pidió revisar.
Escribe en español sencillo, sin jerga, con frases cortas. Usa solo los hallazgos que recibes: no inventes fallas ni supongas cosas que la revisión no midió.
Si casi todo está bien, dilo con claridad. Recuerda que esta revisión es básica y no reemplaza una auditoría completa.`;

export async function explicarConClaude(resultado: ResultadoRevision): Promise<Explicacion | null> {
  if (!process.env.ANTHROPIC_API_KEY) return null;

  const cliente = new Anthropic();
  try {
    const respuesta = await cliente.beta.messages.create({
      model: "claude-opus-5-5",
      max_tokens: 4000,
      system: INSTRUCCIONES,
      output_config: { effort: "low", format: { type: "json_schema", schema: ESQUEMA } },
      // Si un filtro de seguridad rechaza la petición, Claude la reintenta con otro modelo.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      messages: [
        {
          role: "user",
          content: JSON.stringify({
            web: resultado.urlFinal,
            hallazgos: resultado.hallazgos.map(({ titulo, gravedad, que }) => ({ titulo, gravedad, que })),
            loQueEstaBien: resultado.aprobados,
          }),
        },
      ],
    });

    if (respuesta.stop_reason === "refusal") return null;
    const texto = respuesta.content.find((bloque) => bloque.type === "text");
    if (!texto || texto.type !== "text") return null;
    return JSON.parse(texto.text) as Explicacion;
  } catch (error) {
    // Si Claude falla, la revisión sigue sirviendo sin el resumen.
    console.error("No se pudo generar la explicación con Claude:", error);
    return null;
  }
}
