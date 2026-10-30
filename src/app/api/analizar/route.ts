// La "ventanilla" (API) que recibe el link desde la página y devuelve el informe.
// Corre en el servidor: aquí sí podemos usar la clave secreta de Claude.

import { explicarConClaude } from "@/lib/revision/explicar-con-claude";
import { revisarSitio, SitioRedirigido } from "@/lib/revision/revisar-sitio";
import { ORDEN_GRAVEDAD, type RespuestaAnalisis } from "@/lib/revision/tipos";
import { UrlNoPermitida } from "@/lib/revision/validar-url";

// Le damos hasta 60 segundos: revisar la web y pedirle el resumen a Claude toma un rato.
export const maxDuration = 60;

export async function POST(request: Request): Promise<Response> {
  let url: unknown;
  try {
    ({ url } = await request.json());
  } catch {
    return responder({ ok: false, error: "La petición no es válida." }, 400);
  }
  if (typeof url !== "string" || url.length === 0 || url.length > 2000) {
    return responder({ ok: false, error: "Escribe el link de la web que quieres revisar." }, 400);
  }

  try {
    const resultado = await revisarSitio(url);
    resultado.hallazgos.sort((a, b) => ORDEN_GRAVEDAD[a.gravedad] - ORDEN_GRAVEDAD[b.gravedad]);
    const explicacion = await explicarConClaude(resultado);
    return responder({ ok: true, resultado, explicacion }, 200);
  } catch (error) {
    if (error instanceof UrlNoPermitida || error instanceof SitioRedirigido) return responder({ ok: false, error: error.message }, 400);
    const mensaje = error instanceof Error ? error.message : "Algo salió mal al revisar la web.";
    return responder({ ok: false, error: mensaje }, 502);
  }
}

function responder(cuerpo: RespuestaAnalisis, estado: number): Response {
  return Response.json(cuerpo, { status: estado });
}
