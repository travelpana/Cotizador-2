import type { Hotel, Tour, Traslado, CotizacionResult, ServicioSeleccionado, Acomodacion } from "./types";

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

export const api = {
  hoteles: () => get<Hotel[]>("/hoteles"),
  tours: () => get<Tour[]>("/tours"),
  traslados: () => get<Traslado[]>("/traslados"),
  reload: () => post<{ ok: boolean }>("/reload", {}),
  calcular: (input: {
    servicios: { id: string; tipo: ServicioSeleccionado["tipo"] }[];
    acomodaciones: Acomodacion[];
    noches: number;
    pasajeros: number;
    ninos: number;
  }) => post<CotizacionResult>("/cotizacion/calcular", input),
};
