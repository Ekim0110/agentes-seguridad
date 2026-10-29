// Tipos compartidos entre el revisor, la API y la página.

export type Gravedad = "critica" | "alta" | "media" | "baja";

export type Hallazgo = {
  id: string;
  titulo: string;
  gravedad: Gravedad;
  // Qué encontramos, en palabras simples.
  que: string;
  // Por qué es un problema.
  porque: string;
  // Cómo se arregla.
  comoArreglar: string;
  // Lo que vimos de verdad (por ejemplo, el valor de una cabecera).
  evidencia?: string;
};

export type ResultadoRevision = {
  urlRevisada: string;
  urlFinal: string;
  estadoHttp: number;
  hallazgos: Hallazgo[];
  // Cosas que la web ya hace bien.
  aprobados: string[];
};

export type Explicacion = {
  resumen: string;
  primerosPasos: string[];
};

export type RespuestaAnalisis =
  | { ok: true; resultado: ResultadoRevision; explicacion: Explicacion | null }
  | { ok: false; error: string };

export const ORDEN_GRAVEDAD: Record<Gravedad, number> = {
  critica: 0,
  alta: 1,
  media: 2,
  baja: 3,
};
