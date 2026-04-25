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
