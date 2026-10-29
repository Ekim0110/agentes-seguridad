// Revisa que el link sea seguro de visitar ANTES de que nuestro servidor lo abra.
//
// Por qué: si dejamos que cualquiera nos pida abrir cualquier dirección, alguien
// podría usar nuestro servidor para entrar a redes privadas (por ejemplo
// http://localhost o 169.254.169.254, donde los servidores en la nube guardan
// datos internos). Ese ataque se llama SSRF. Aquí lo bloqueamos.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

export class UrlNoPermitida extends Error {}

const PUERTOS_PERMITIDOS = new Set(["", "80", "443"]);

export async function validarUrl(texto: string): Promise<URL> {
  let url: URL;
  try {
    url = new URL(texto.trim());
  } catch {
    throw new UrlNoPermitida("Eso no parece un link válido. Debe empezar por https:// o http://");
  }

  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new UrlNoPermitida("Solo se pueden revisar links que empiecen por https:// o http://");
  }
  if (url.username || url.password) {
    throw new UrlNoPermitida("El link no debe llevar usuario ni contraseña.");
  }
  if (!PUERTOS_PERMITIDOS.has(url.port)) {
    throw new UrlNoPermitida("Solo revisamos webs en los puertos normales (80 y 443).");
  }

  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local") || host.endsWith(".internal")) {
    throw new UrlNoPermitida("No se pueden revisar direcciones internas.");
  }

  // Averiguamos a qué IP apunta el nombre y rechazamos las IP privadas.
  let direcciones: { address: string }[];
  try {
    direcciones = isIP(host) ? [{ address: host }] : await lookup(host, { all: true, verbatim: true });
  } catch {
    throw new UrlNoPermitida("No encontramos esa dirección en internet. Revisa que esté bien escrita.");
  }
  if (direcciones.length === 0 || direcciones.some((d) => esIpPrivada(d.address))) {
    throw new UrlNoPermitida("No se pueden revisar direcciones internas o privadas.");
  }

  return url;
}

function esIpPrivada(ip: string): boolean {
  const version = isIP(ip);
  if (version === 4) return esIpv4Privada(ip);
  if (version === 6) {
    const minus = ip.toLowerCase();
    // IPv4 escrita dentro de IPv6, por ejemplo ::ffff:127.0.0.1
    const mapeada = minus.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
    if (mapeada) return esIpv4Privada(mapeada[1]);
    if (minus === "::" || minus === "::1") return true;
    if (/^f[cd]/.test(minus)) return true; // fc00::/7 red privada
    if (/^fe[89ab]/.test(minus)) return true; // fe80::/10 red local
    if (/^ff/.test(minus)) return true; // multicast
    return false;
  }
  return true;
}

function esIpv4Privada(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}
