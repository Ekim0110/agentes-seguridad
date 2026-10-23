// Página de inicio. Por ahora solo muestra la idea de la herramienta.
// En la Fase 1 el formulario empezará a analizar links de verdad.

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

      <form className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="url" className="sr-only">
          Link de tu web
        </label>
        <input
          id="url"
          type="url"
          placeholder="https://tu-web.com"
          disabled
          className="flex-1 rounded-lg border border-zinc-300 px-4 py-3 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled
          className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white opacity-60 dark:bg-white dark:text-zinc-900"
        >
          Analizar (próximamente)
        </button>
      </form>

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
        Solo se pueden analizar sitios de los que seas dueño o tengas permiso por escrito.
      </p>
    </main>
  );
}
