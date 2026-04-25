import type { Acomodacion, Cliente, ServicioSeleccionado } from "@/lib/types";

export type ModoCotizacion = "tarifas" | "calculo";

export interface CotizacionGuardada {
  id: string;
  fechaCreacion: string;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  modoCotizacion: ModoCotizacion;
}

const STORAGE_KEY = "cotizador.guardadas";

export function loadGuardadas(): CotizacionGuardada[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as CotizacionGuardada[];
    // backwards-compat: legacy quotes default to "calculo"
    return items.map((g) => ({
      ...g,
      modoCotizacion: g.modoCotizacion ?? "calculo",
    }));
  } catch {
    return [];
  }
}

export function saveGuardadas(items: CotizacionGuardada[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

export interface GuardarEnSeguimientoInput {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  modo: ModoCotizacion;
}

export interface GuardarEnSeguimientoResult {
  saved: boolean;
  items: CotizacionGuardada[];
  duplicate?: boolean;
}

export function guardarEnSeguimiento(
  input: GuardarEnSeguimientoInput,
): GuardarEnSeguimientoResult {
  const items = loadGuardadas();
  const norm = (s: string) => (s || "").trim().toLowerCase();
  const isDuplicate = items.some(
    (g) =>
      norm(g.cliente.nombre) === norm(input.cliente.nombre) &&
      g.cliente.fechaInicio === input.cliente.fechaInicio &&
      g.cliente.fechaFin === input.cliente.fechaFin,
  );
  if (isDuplicate) {
    return { saved: false, items, duplicate: true };
  }
  const nueva: CotizacionGuardada = {
    id: `${Date.now()}`,
    fechaCreacion: new Date().toISOString(),
    cliente: input.cliente,
    servicios: input.servicios,
    acomodaciones: input.acomodaciones,
    modoCotizacion: input.modo,
  };
  const next = [nueva, ...items].slice(0, 50);
  saveGuardadas(next);
  return { saved: true, items: next };
}
