import type { Acomodacion, Cliente, ServicioSeleccionado } from "@/lib/types";

export type ModoCotizacion = "tarifas" | "calculo";
export type EstadoCotizacion =
  | "pendiente"
  | "enviado"
  | "confirmado"
  | "cancelado";

export interface CotizacionGuardada {
  id: string;
  fechaCreacion: string;
  numeroCotizacion: string;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  modoCotizacion: ModoCotizacion;
  estado?: EstadoCotizacion;
}

const STORAGE_KEY = "cotizador.guardadas";

export function generateNumeroCotizacion(): string {
  const code = Date.now().toString(36).slice(-6).toUpperCase();
  return `RGE-${code}`;
}

function deriveNumeroFromId(id: string): string {
  const n = parseInt(id, 10);
  if (Number.isFinite(n) && n > 0) {
    const code = n.toString(36).slice(-6).toUpperCase().padStart(6, "0");
    return `RGE-${code}`;
  }
  return generateNumeroCotizacion();
}

export function loadGuardadas(): CotizacionGuardada[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const items = JSON.parse(raw) as Array<
      Partial<CotizacionGuardada> & {
        id: string;
        fechaCreacion: string;
        cliente: Cliente;
        servicios: ServicioSeleccionado[];
        acomodaciones: Acomodacion[];
      }
    >;
    return items.map((g) => ({
      ...g,
      modoCotizacion: g.modoCotizacion ?? "calculo",
      // backwards-compat: legacy quotes (created before the RGE-XXXXXX scheme)
      // get a deterministic code derived from their id so it stays stable.
      numeroCotizacion: g.numeroCotizacion || deriveNumeroFromId(g.id),
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
  /** When provided, the saved entry will use this code so it matches the one shown in the preview/PDF/email. */
  numeroCotizacion?: string;
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
    numeroCotizacion: input.numeroCotizacion || generateNumeroCotizacion(),
    cliente: input.cliente,
    servicios: input.servicios,
    acomodaciones: input.acomodaciones,
    modoCotizacion: input.modo,
  };
  const next = [nueva, ...items].slice(0, 50);
  saveGuardadas(next);
  return { saved: true, items: next };
}

/**
 * Returns a fresh copy of the cotización ready to be inserted as a new entry.
 * Keeps every detail (cliente, agente, agencia, servicios, fechas, pax, etc.)
 * but assigns a brand new id, fechaCreacion and numeroCotizacion, and resets
 * the estado so the duplicate starts as "pendiente".
 */
export function duplicarCotizacion(
  orig: CotizacionGuardada,
): CotizacionGuardada {
  return {
    ...orig,
    id: `${Date.now()}`,
    fechaCreacion: new Date().toISOString(),
    numeroCotizacion: generateNumeroCotizacion(),
    estado: "pendiente",
    // deep clone the mutable nested arrays/objects so future edits don't bleed back
    cliente: { ...orig.cliente },
    servicios: orig.servicios.map((s) => ({ ...s })),
    acomodaciones: [...orig.acomodaciones],
  };
}
