// El revisor de seguridad básica. Visita la web UNA vez, como un navegador normal,
// y mira cómo responde. No ataca nada ni intenta entrar: solo observa.

import { connect } from "node:tls";
import type { Hallazgo, ResultadoRevision } from "./tipos";
import { validarUrl } from "./validar-url";

const TIEMPO_MAXIMO_MS = 10_000;
const MAX_REDIRECCIONES = 5;
const AGENTE = "AgentesSeguridad/0.1 (revision pasiva)";

export async function revisarSitio(texto: string): Promise<ResultadoRevision> {
  const inicial = await validarUrl(texto);
  const { respuesta, urlFinal } = await visitar(inicial);
  const cabeceras = respuesta.headers;

  const hallazgos: Hallazgo[] = [];
  const aprobados: string[] = [];
  const esHttps = urlFinal.protocol === "https:";

  // 1. ¿Usa HTTPS (el candado)?
  if (!esHttps) {
    hallazgos.push({
      id: "sin-https",
      titulo: "La web no usa HTTPS",
      gravedad: "critica",
      que: "La página se abre sin el candado de seguridad (http:// en vez de https://).",
      porque: "Todo lo que escriben los visitantes, como contraseñas o datos de pago, viaja sin cifrar y alguien en la misma red podría leerlo.",
      comoArreglar: "Activa un certificado SSL. En Vercel, Netlify y la mayoría de servicios es gratis y automático; si usas un servidor propio, puedes usar Let's Encrypt.",
      evidencia: urlFinal.href,
    });
  } else {
    aprobados.push("Usa HTTPS (tiene el candado de seguridad).");
    await revisarCertificado(urlFinal.hostname, hallazgos, aprobados);
    await revisarRedireccionHttp(urlFinal.hostname, hallazgos, aprobados);
  }

  // 2. Cabeceras de seguridad: instrucciones que el servidor le da al navegador.
  if (esHttps) {
    const hsts = cabeceras.get("strict-transport-security");
    if (!hsts) {
      hallazgos.push({
        id: "sin-hsts",
        titulo: "Falta la cabecera HSTS",
        gravedad: "media",
        que: "El servidor no le pide al navegador que use siempre HTTPS.",
        porque: "Un atacante podría forzar la primera visita por http:// (sin cifrar) y desde ahí espiar o cambiar la página.",
        comoArreglar: "Agrega la cabecera Strict-Transport-Security: max-age=31536000; includeSubDomains",
      });
    } else {
      const maxAge = Number(hsts.match(/max-age=(\d+)/i)?.[1] ?? 0);
      if (maxAge < 15_552_000) {
        hallazgos.push({
          id: "hsts-corto",
          titulo: "HSTS dura muy poco tiempo",
          gravedad: "baja",
          que: "La cabecera HSTS existe, pero dura menos de 6 meses.",
          porque: "Pasado ese tiempo el navegador olvida que debe usar HTTPS y vuelve a quedar expuesto.",
          comoArreglar: "Sube max-age a 31536000 (un año).",
          evidencia: hsts,
        });
      } else {
        aprobados.push("Tiene HSTS: el navegador siempre usará HTTPS.");
      }
    }
  }

  const csp = cabeceras.get("content-security-policy");
  if (!csp) {
    hallazgos.push({
      id: "sin-csp",
      titulo: "Falta la política de seguridad de contenido (CSP)",
      gravedad: "media",
      que: "El servidor no le dice al navegador de dónde se pueden cargar scripts, estilos e imágenes.",
      porque: "Si alguien logra meter código malicioso en la página (un ataque XSS), el navegador lo ejecutará sin dudar.",
      comoArreglar: "Agrega una cabecera Content-Security-Policy. Empieza con una sencilla, como default-src 'self', y ve ampliándola según lo que use tu web.",
    });
  } else {
    aprobados.push("Tiene política de seguridad de contenido (CSP).");
  }

  const xfo = cabeceras.get("x-frame-options");
  if (!xfo && !/frame-ancestors/i.test(csp ?? "")) {
    hallazgos.push({
      id: "sin-anti-clickjacking",
      titulo: "La web se puede meter dentro de otra página",
      gravedad: "media",
      que: "Nada impide que otra web muestre la tuya dentro de un marco invisible.",
      porque: "Así engañan al usuario para que haga clic en botones de tu web sin darse cuenta (se llama clickjacking).",
      comoArreglar: "Agrega X-Frame-Options: DENY, o en la CSP: frame-ancestors 'none'.",
    });
  } else {
    aprobados.push("Está protegida contra clickjacking.");
  }

  if ((cabeceras.get("x-content-type-options") ?? "").toLowerCase() !== "nosniff") {
    hallazgos.push({
      id: "sin-nosniff",
      titulo: "Falta X-Content-Type-Options",
      gravedad: "baja",
      que: "El navegador puede adivinar el tipo de los archivos en vez de respetar el que dice el servidor.",
      porque: "Un archivo subido como imagen podría ejecutarse como código.",
      comoArreglar: "Agrega la cabecera X-Content-Type-Options: nosniff",
    });
  } else {
    aprobados.push("Tiene X-Content-Type-Options: nosniff.");
  }

  if (!cabeceras.get("referrer-policy")) {
    hallazgos.push({
      id: "sin-referrer-policy",
      titulo: "Falta Referrer-Policy",
      gravedad: "baja",
      que: "No se controla qué parte de tu dirección se envía a otras webs cuando un usuario hace clic en un enlace.",
      porque: "Si tus direcciones llevan datos (como un código o un correo), se pueden filtrar a otros sitios.",
      comoArreglar: "Agrega Referrer-Policy: strict-origin-when-cross-origin",
    });
  } else {
    aprobados.push("Tiene Referrer-Policy.");
  }

  // 3. ¿El servidor cuenta demasiado de sí mismo?
  for (const nombre of ["server", "x-powered-by"]) {
    const valor = cabeceras.get(nombre);
    if (valor && /\d/.test(valor)) {
      hallazgos.push({
        id: `version-expuesta-${nombre}`,
        titulo: "El servidor muestra su versión",
        gravedad: "baja",
        que: `La cabecera ${nombre} dice qué programa y versión usa el servidor.`,
        porque: "Un atacante puede buscar fallas conocidas de esa versión exacta.",
        comoArreglar: `Oculta o quita la cabecera ${nombre} en la configuración del servidor.`,
        evidencia: `${nombre}: ${valor}`,
      });
    }
  }

  // 4. Cookies: los datos que la web guarda en el navegador (por ejemplo, la sesión).
  const cookies = cabeceras.getSetCookie();
  for (const cookie of cookies) {
    const nombre = cookie.split("=")[0].trim();
    const atributos = cookie.toLowerCase();
    const faltan: string[] = [];
    if (esHttps && !/;\s*secure/.test(atributos)) faltan.push("Secure");
    if (!/;\s*httponly/.test(atributos)) faltan.push("HttpOnly");
    if (!/;\s*samesite=/.test(atributos)) faltan.push("SameSite");
    if (faltan.length > 0) {
      hallazgos.push({
        id: `cookie-${nombre}`,
        titulo: `La cookie "${nombre}" no está bien protegida`,
        gravedad: faltan.includes("Secure") ? "media" : "baja",
        que: `Le faltan estas protecciones: ${faltan.join(", ")}.`,
        porque: "Secure evita que viaje sin cifrar, HttpOnly evita que un script malicioso la robe y SameSite evita que otras webs la usen a tu nombre.",
        comoArreglar: `Al crear la cookie, agrega: ${faltan.join("; ")}. Si es la cookie de sesión, las tres son importantes.`,
        evidencia: nombre,
      });
    }
  }
  if (cookies.length > 0 && !hallazgos.some((h) => h.id.startsWith("cookie-"))) {
    aprobados.push("Las cookies tienen sus protecciones.");
  }

  return {
    urlRevisada: inicial.href,
    urlFinal: urlFinal.href,
    estadoHttp: respuesta.status,
    hallazgos,
    aprobados,
  };
}

// Abre la página siguiendo las redirecciones a mano, para validar cada salto.
async function visitar(url: URL): Promise<{ respuesta: Response; urlFinal: URL }> {
  let actual = url;
  for (let salto = 0; salto <= MAX_REDIRECCIONES; salto++) {
    let respuesta: Response;
    try {
      respuesta = await fetch(actual, {
        redirect: "manual",
        headers: { "user-agent": AGENTE },
        signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
      });
    } catch {
      throw new Error(
        "No pudimos abrir la web. Puede estar caída, tardar demasiado o tener un problema con su certificado.",
      );
    }
    // No necesitamos el contenido de la página, solo las cabeceras.
    await respuesta.body?.cancel();

    const destino = respuesta.headers.get("location");
    if (respuesta.status >= 300 && respuesta.status < 400 && destino) {
      actual = await validarUrl(new URL(destino, actual).href);
      continue;
    }
    return { respuesta, urlFinal: actual };
  }
  throw new Error("La web redirige demasiadas veces.");
}

// ¿La versión http:// lleva automáticamente a https://?
async function revisarRedireccionHttp(host: string, hallazgos: Hallazgo[], aprobados: string[]) {
  try {
    const url = await validarUrl(`http://${host}/`);
    const r = await fetch(url, {
      redirect: "manual",
      headers: { "user-agent": AGENTE },
      signal: AbortSignal.timeout(TIEMPO_MAXIMO_MS),
    });
    await r.body?.cancel();
    const destino = r.headers.get("location") ?? "";
    if (r.status >= 300 && r.status < 400 && destino.startsWith("https://")) {
      aprobados.push("La versión http:// lleva automáticamente a https://.");
      return;
    }
    hallazgos.push({
      id: "http-sin-redireccion",
      titulo: "La versión sin candado no redirige a HTTPS",
      gravedad: "media",
      que: `Si alguien escribe http://${host}, la web se abre sin cifrar en vez de llevarlo a https://.`,
      porque: "Muchos usuarios escriben la dirección sin https:// y quedarían en la versión insegura.",
      comoArreglar: "Configura una redirección permanente (301) de http:// a https://.",
      evidencia: `Respuesta ${r.status}`,
    });
  } catch {
    // Si el puerto 80 no responde, no es una falla: simplemente no hay versión http://.
  }
}

// Lee el certificado SSL para ver cuándo vence.
function revisarCertificado(host: string, hallazgos: Hallazgo[], aprobados: string[]): Promise<void> {
  return new Promise((resolver) => {
    const socket = connect({ host, port: 443, servername: host, timeout: TIEMPO_MAXIMO_MS }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      if (!cert?.valid_to) return resolver();
      const dias = Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000);
      if (dias < 15) {
        hallazgos.push({
          id: "certificado-por-vencer",
          titulo: "El certificado SSL está por vencer",
          gravedad: "alta",
          que: `El certificado vence en ${dias} días.`,
          porque: "Cuando vence, los navegadores muestran una alerta roja de \"sitio no seguro\" y los visitantes se van.",
          comoArreglar: "Renueva el certificado o activa la renovación automática.",
          evidencia: `Vence: ${cert.valid_to}`,
        });
      } else {
        aprobados.push(`El certificado SSL es válido por ${dias} días más.`);
      }
      resolver();
    });
    socket.on("error", () => resolver());
    socket.on("timeout", () => {
      socket.destroy();
      resolver();
    });
  });
}
