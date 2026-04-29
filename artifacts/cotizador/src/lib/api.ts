import type { Hotel, Tour, Traslado, CotizacionResult, ServicioSeleccionado, Acomodacion, Descriptivo } from "./types";

const API_BASE = "/api";

async function get<T>(path: string): Promise<T> {
  const res = await fetch(API_BASE + path);
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function post<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(API_BASE + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) throw new Error(`POST ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

async function getFresh<T>(path: string): Promise<T> {
  const url = `${API_BASE}${path}?ts=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export const api = {
  hoteles: () => get<Hotel[]>("/hoteles"),
  tours: () => get<Tour[]>("/tours"),
  traslados: () => get<Traslado[]>("/traslados"),
  descriptivos: () => get<Descriptivo[]>("/descriptivos"),

  /**
   * Tells the server to re-parse TARIFARIO.xlsx, then re-fetches all catalog
   * data with cache-busting timestamps so the browser never serves stale data.
   */
  reloadAll: async (): Promise<{
    hoteles: Hotel[];
    tours: Tour[];
    traslados: Traslado[];
    descriptivos: Descriptivo[];
  }> => {
    await post<{ ok: boolean }>("/reload", {});
    const [hoteles, tours, traslados, descriptivos] = await Promise.all([
      getFresh<Hotel[]>("/hoteles"),
      getFresh<Tour[]>("/tours"),
      getFresh<Traslado[]>("/traslados"),
      getFresh<Descriptivo[]>("/descriptivos").catch(() => [] as Descriptivo[]),
    ]);
    return { hoteles, tours, traslados, descriptivos };
  },

  calcular: (input: {
    servicios: { id: string; tipo: ServicioSeleccionado["tipo"] }[];
    acomodaciones: Acomodacion[];
    noches: number;
    pasajeros: number;
    ninos: number;
  }) => post<CotizacionResult>("/cotizacion/calcular", input),
};
