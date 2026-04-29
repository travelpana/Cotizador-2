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

export interface CatalogInfo {
  filename: string;
  loadedAt: string | null;
  counts: { hoteles: number; tours: number; traslados: number } | null;
}

export interface UploadResult {
  ok: boolean;
  filename: string;
  loadedAt: string;
  counts: { hoteles: number; tours: number; traslados: number };
}

export const api = {
  hoteles: () => get<Hotel[]>("/hoteles"),
  tours: () => get<Tour[]>("/tours"),
  traslados: () => get<Traslado[]>("/traslados"),
  descriptivos: () => get<Descriptivo[]>("/descriptivos"),

  catalogInfo: () => get<CatalogInfo>("/catalog/info"),

  /**
   * Tells the server to re-parse TARIFARIO.xlsx, then re-fetches all catalog
   * data with cache-busting timestamps so the browser never serves stale data.
   */
  reloadAll: async (): Promise<{
    hoteles: Hotel[];
    tours: Tour[];
    traslados: Traslado[];
    descriptivos: Descriptivo[];
    loadedAt: string;
  }> => {
    const reload = await post<{ ok: boolean; loadedAt: string }>("/reload", {});
    const [hoteles, tours, traslados, descriptivos] = await Promise.all([
      getFresh<Hotel[]>("/hoteles"),
      getFresh<Tour[]>("/tours"),
      getFresh<Traslado[]>("/traslados"),
      getFresh<Descriptivo[]>("/descriptivos").catch(() => [] as Descriptivo[]),
    ]);
    return { hoteles, tours, traslados, descriptivos, loadedAt: reload.loadedAt };
  },

  /**
   * Uploads a new XLSX file to replace the current TARIFARIO, validates it
   * server-side, then returns the fresh catalog counts and metadata.
   */
  uploadTarifario: async (file: File): Promise<UploadResult> => {
    const buffer = await file.arrayBuffer();
    const res = await fetch(`${API_BASE}/upload`, {
      method: "POST",
      headers: { "Content-Type": "application/octet-stream" },
      body: buffer,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ error: "Error desconocido" })) as { error?: string };
      throw new Error(err.error ?? `Error al subir archivo: ${res.status}`);
    }
    return res.json() as Promise<UploadResult>;
  },

  calcular: (input: {
    servicios: { id: string; tipo: ServicioSeleccionado["tipo"] }[];
    acomodaciones: Acomodacion[];
    noches: number;
    pasajeros: number;
    ninos: number;
  }) => post<CotizacionResult>("/cotizacion/calcular", input),
};
