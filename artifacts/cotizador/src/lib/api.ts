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
  const sep = path.includes("?") ? "&" : "?";
  const url = `${API_BASE}${path}${sep}ts=${Date.now()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`GET ${path} → ${res.status}`);
  return res.json() as Promise<T>;
}

export interface CatalogInfo {
  filename: string;
  loadedAt: string | null;
  exists?: boolean;
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

  hotelesBrasil: () => get<Hotel[]>("/hoteles?mercado=brasil"),
  toursBrasil: () => get<Tour[]>("/tours?mercado=brasil"),
  trasladosBrasil: () => get<Traslado[]>("/traslados?mercado=brasil"),
  catalogInfoBrasil: () => get<CatalogInfo>("/catalog/info?mercado=brasil"),

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

  reloadAllBrasil: async (): Promise<{
    hoteles: Hotel[];
    tours: Tour[];
    traslados: Traslado[];
    loadedAt: string;
  }> => {
    const reload = await post<{ ok: boolean; loadedAt: string }>("/reload?mercado=brasil", {});
    const [hoteles, tours, traslados] = await Promise.all([
      getFresh<Hotel[]>("/hoteles?mercado=brasil"),
      getFresh<Tour[]>("/tours?mercado=brasil"),
      getFresh<Traslado[]>("/traslados?mercado=brasil"),
    ]);
    return { hoteles, tours, traslados, loadedAt: reload.loadedAt };
  },

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

  uploadTarifarioBrasil: async (file: File): Promise<UploadResult> => {
    const buffer = await file.arrayBuffer();
    const res = await fetch(`${API_BASE}/upload?mercado=brasil`, {
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
