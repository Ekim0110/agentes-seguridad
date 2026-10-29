# Agentes de Seguridad

Herramienta que revisa una web o app con un equipo de agentes de IA y entrega un informe
de fallas de seguridad, funcionamiento, diseño y código.

Hecha con Next.js, TypeScript y Tailwind CSS. Se publica en Vercel.

## Cómo correrla en tu computador

1. Instala [Node.js](https://nodejs.org) (versión 20 o más nueva).
2. En la carpeta del proyecto, ejecuta `npm install` (descarga las librerías).
3. Copia `.env.example` como `.env.local` y llena tus claves. Nunca subas `.env.local`.
4. Ejecuta `npm run dev` y abre http://localhost:3000

## Estado

Fase 1: revisión de seguridad básica de un link.

- `src/lib/revision/validar-url.ts`: bloquea links a redes internas o privadas (protección contra SSRF).
- `src/lib/revision/revisar-sitio.ts`: visita la web una vez y revisa HTTPS, certificado, cabeceras de seguridad y cookies.
- `src/lib/revision/explicar-con-claude.ts`: si hay `ANTHROPIC_API_KEY`, Claude escribe un resumen en español sencillo.
- `src/app/api/analizar/route.ts`: la API que usa la página.

Sin `ANTHROPIC_API_KEY` la herramienta funciona igual, pero sin el resumen del agente.

Límite conocido: la validación del link se hace antes de abrirlo; un sitio malicioso podría cambiar su IP justo después (DNS rebinding). Lo cerramos en una fase siguiente.

Solo se deben analizar sitios propios o con permiso por escrito de su dueño.
