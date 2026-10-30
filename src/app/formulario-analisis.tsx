"use client";

// Esta parte corre en el navegador del usuario: maneja el formulario,
// llama a nuestra API y muestra los resultados.

import { useState } from "react";
import type { Gravedad, RespuestaAnalisis } from "@/lib/revision/tipos";

const ETIQUETA: Record<Gravedad, { texto: string; clase: string }> = {
  critica: { texto: "Crítica", clase: "bg-red-600 text-white" },
  alta: { texto: "Alta", clase: "bg-orange-500 text-white" },
  media: { texto: "Media", clase: "bg-yellow-400 text-zinc-900" },
  baja: { texto: "Baja", clase: "bg-zinc-200 text-zinc-800 dark:bg-zinc-700 dark:text-zinc-100" },
};

export default function FormularioAnalisis() {
  const [url, setUrl] = useState("");
  const [cargando, setCargando] = useState(false);
  const [respuesta, setRespuesta] = useState<RespuestaAnalisis | null>(null);

  async function analizar(evento: React.FormEvent<HTMLFormElement>) {
    evento.preventDefault();
    setCargando(true);
    setRespuesta(null);
    try {
      const r = await fetch("/api/analizar", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ url }),
      });
      setRespuesta((await r.json()) as RespuestaAnalisis);
    } catch {
      setRespuesta({ ok: false, error: "No pudimos conectar con el servidor. Inténtalo de nuevo." });
    } finally {
      setCargando(false);
    }
  }

  return (
    <div className="flex flex-col gap-8">
      <form onSubmit={analizar} className="flex flex-col gap-3 sm:flex-row">
        <label htmlFor="url" className="sr-only">
          Link de tu web
        </label>
        <input
          id="url"
          type="url"
          required
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          placeholder="https://tu-web.com"
          className="flex-1 rounded-lg border border-zinc-300 bg-transparent px-4 py-3 dark:border-zinc-700"
        />
        <button
          type="submit"
          disabled={cargando}
          className="rounded-lg bg-zinc-900 px-6 py-3 font-medium text-white disabled:opacity-60 dark:bg-white dark:text-zinc-900"
        >
          {cargando ? "Analizando…" : "Analizar"}
        </button>
      </form>

      {respuesta && !respuesta.ok && (
        <p role="alert" className="rounded-lg border border-red-300 bg-red-50 p-4 text-red-800 dark:border-red-800 dark:bg-red-950 dark:text-red-200">
          {respuesta.error}
        </p>
      )}

      {respuesta?.ok && (
        <section className="flex flex-col gap-6" aria-live="polite">
          <div className="flex flex-col gap-1">
            <h2 className="break-all text-xl font-semibold">Informe de {respuesta.resultado.urlFinal}</h2>
            <p className="text-sm text-zinc-600 dark:text-zinc-400">
              {respuesta.resultado.hallazgos.length === 0
                ? "No encontramos fallas en esta revisión básica."
                : `Encontramos ${respuesta.resultado.hallazgos.length} puntos para mejorar, del más grave al menos grave.`}
            </p>
          </div>

          {respuesta.explicacion && (
            <div className="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950">
              <h3 className="font-semibold">Resumen del agente</h3>
              <p className="mt-1">{respuesta.explicacion.resumen}</p>
              {respuesta.explicacion.primerosPasos.length > 0 && (
                <ol className="mt-2 list-decimal pl-5">
                  {respuesta.explicacion.primerosPasos.map((paso) => (
                    <li key={paso}>{paso}</li>
                  ))}
                </ol>
              )}
            </div>
          )}

          <ul className="flex flex-col gap-4">
            {respuesta.resultado.hallazgos.map((h) => (
              <li key={h.id} className="rounded-lg border border-zinc-200 p-4 dark:border-zinc-800">
                <div className="flex flex-wrap items-center gap-2">
                  <span className={`rounded px-2 py-0.5 text-xs font-semibold ${ETIQUETA[h.gravedad].clase}`}>
                    {ETIQUETA[h.gravedad].texto}
                  </span>
                  <h3 className="font-semibold">{h.titulo}</h3>
                </div>
                <dl className="mt-2 flex flex-col gap-1 text-sm">
                  <div><dt className="inline font-medium">Qué pasa: </dt><dd className="inline">{h.que}</dd></div>
                  <div><dt className="inline font-medium">Por qué importa: </dt><dd className="inline">{h.porque}</dd></div>
                  <div><dt className="inline font-medium">Cómo arreglarlo: </dt><dd className="inline">{h.comoArreglar}</dd></div>
                  {h.evidencia && (
                    <div><dt className="inline font-medium">Lo que vimos: </dt><dd className="inline break-all font-mono text-xs">{h.evidencia}</dd></div>
                  )}
                </dl>
              </li>
            ))}
          </ul>

          {respuesta.resultado.aprobados.length > 0 && (
            <div>
              <h3 className="font-semibold">Lo que ya está bien</h3>
              <ul className="mt-1 list-disc pl-5 text-sm text-zinc-700 dark:text-zinc-300">
                {respuesta.resultado.aprobados.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}
    </div>
  );
}
