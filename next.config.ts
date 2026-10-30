import type { NextConfig } from "next";

// Cabeceras de seguridad: instrucciones que el servidor le envía al navegador
// en cada respuesta. Son las mismas que revisa nuestro agente.
const esDesarrollo = process.env.NODE_ENV === "development";

const politicaDeContenido = [
  "default-src 'self'",
  // Next.js necesita scripts en línea; en desarrollo también 'unsafe-eval'.
  `script-src 'self' 'unsafe-inline'${esDesarrollo ? " 'unsafe-eval'" : ""}`,
  "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data:",
  "font-src 'self'",
  "connect-src 'self'",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'self'",
  "frame-ancestors 'none'",
].join("; ");

const cabecerasDeSeguridad = [
  { key: "Content-Security-Policy", value: politicaDeContenido },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
];

const nextConfig: NextConfig = {
  // Ocultamos "X-Powered-By: Next.js" para no contar qué tecnología usamos.
  poweredByHeader: false,
  headers() {
    return [{ source: "/:path*", headers: cabecerasDeSeguridad }];
  },
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
