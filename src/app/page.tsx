// Página de inicio: explica la herramienta y muestra el formulario de análisis.

import FormularioAnalisis from "./formulario-analisis";

const agentes = [
  { nombre: "Seguridad", detalle: "Accesos, datos y certificado SSL" },
  { nombre: "Funcionamiento", detalle: "Botones, formularios y errores" },
  { nombre: "Diseño", detalle: "Celular y accesibilidad" },
  { nombre: "Código", detalle: "Librerías viejas y claves expuestas" },
];

export default function Home() {
  return (
    <main className="mx-auto flex min-h-screen max-w-3xl flex-col gap-10 px-4 py-16">
      <header className="flex flex-col gap-3">
        <h1 className="text-3xl font-semibold sm:text-4xl">Agentes de Seguridad</h1>
        <p className="text-lg text-zinc-600 dark:text-zinc-400">
          Pega el link de tu web o app y un equipo de agentes la revisa y te entrega un
          informe con sus fallas y cómo arreglarlas.
        </p>
      </header>

      <FormularioAnalisis />

      <section className="grid gap-4 sm:grid-cols-2">
        {agentes.map((agente) => (
          <div
            key={agente.nombre}
            className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800"
          >
            <h2 className="font-semibold">{agente.nombre}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">{agente.detalle}</p>
          </div>
        ))}
      </section>

      <p className="text-sm text-zinc-500">
        Solo se pueden analizar sitios de los que seas dueño o tengas permiso por escrito. Por ahora revisamos la seguridad básica (HTTPS, certificado, cabeceras y cookies); los demás agentes llegan en las próximas fases.
      </p>
    </main>
  );
}
