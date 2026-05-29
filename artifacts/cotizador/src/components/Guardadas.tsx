import type { Acomodacion, Cliente, ServicioSeleccionado } from "@/lib/types";

export type ModoCotizacion = "tarifas" | "calculo";

/** Legacy status — kept for backward compat, prefer estadoCRM */
export type EstadoCotizacion =
  | "pendiente"
  | "enviado"
  | "confirmado"
  | "cancelado";

/** New commercial CRM states */
export type EstadoCRM =
  | "nueva"
  | "enviada"
  | "seguimiento"
  | "negociacion"
  | "confirmada"
  | "perdida";

export type Prioridad = "alta" | "media" | "baja";

export type ActividadTipo =
  | "creada"
  | "editada"
  | "pdf_enviado"
  | "whatsapp_enviado"
  | "correo_enviado"
  | "duplicada"
  | "confirmada"
  | "nota_agregada"
  | "estado_cambiado";

export interface ActividadEntry {
  fecha: string;
  tipo: ActividadTipo;
  detalle?: string;
}

export interface CotizacionGuardada {
  id: string;
  fechaCreacion: string;
  numeroCotizacion: string;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  modoCotizacion: ModoCotizacion;
  /** @deprecated use estadoCRM */
  estado?: EstadoCotizacion;
  /** IDs of selected quick observations from the catalog */
  observacionesSeleccionadas?: string[];
  /** Free-text custom observation */
  observacionManual?: string;
  /** ISO timestamp when the quote was first sent (WhatsApp/email/PDF) */
  sentAt?: string;
  /** New CRM commercial state */
  estadoCRM?: EstadoCRM;
  prioridad?: Prioridad;
  /** ISO date of last follow-up action */
  ultimoSeguimiento?: string;
  proximaAccion?: string;
  fechaRecordatorio?: string;
  notaInterna?: string;
  historial?: ActividadEntry[];
}

const STORAGE_KEY = "cotizador.guardadas";

/** Map legacy estado → estadoCRM for old entries */
function migrarEstado(estado?: EstadoCotizacion): EstadoCRM {
  if (estado === "enviado") return "enviada";
  if (estado === "confirmado") return "confirmada";
  if (estado === "cancelado") return "perdida";
  return "nueva";
}

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
      numeroCotizacion: g.numeroCotizacion || deriveNumeroFromId(g.id),
      // Migrate legacy estado → estadoCRM if not already set
      estadoCRM: g.estadoCRM ?? migrarEstado(g.estado),
      historial: g.historial ?? [],
    }));
  } catch {
    return [];
  }
}

export function saveGuardadas(items: CotizacionGuardada[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** Add an activity entry to a specific quote in the list and save */
export function registrarActividad(
  items: CotizacionGuardada[],
  id: string,
  tipo: ActividadTipo,
  detalle?: string,
): CotizacionGuardada[] {
  const entry: ActividadEntry = {
    fecha: new Date().toISOString(),
    tipo,
    detalle,
  };
  const next = items.map((g) =>
    g.id === id
      ? {
          ...g,
          historial: [entry, ...(g.historial ?? [])].slice(0, 50),
          ultimoSeguimiento: new Date().toISOString(),
        }
      : g,
  );
  saveGuardadas(next);
  return next;
}

export interface GuardarEnSeguimientoInput {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
  modo: ModoCotizacion;
  numeroCotizacion?: string;
  observacionesSeleccionadas?: string[];
  observacionManual?: string;
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
    estadoCRM: "nueva",
    prioridad: "media",
    historial: [{ fecha: new Date().toISOString(), tipo: "creada" }],
    ultimoSeguimiento: new Date().toISOString(),
    observacionesSeleccionadas: input.observacionesSeleccionadas?.length
      ? [...input.observacionesSeleccionadas]
      : undefined,
    observacionManual: input.observacionManual || undefined,
  };
  const next = [nueva, ...items].slice(0, 50);
  saveGuardadas(next);
  return { saved: true, items: next };
}

export function duplicarCotizacion(
  orig: CotizacionGuardada,
): CotizacionGuardada {
  return {
    ...orig,
    id: `${Date.now()}`,
    fechaCreacion: new Date().toISOString(),
    numeroCotizacion: generateNumeroCotizacion(),
    estado: "pendiente",
    estadoCRM: "nueva",
    prioridad: orig.prioridad ?? "media",
    ultimoSeguimiento: new Date().toISOString(),
    proximaAccion: undefined,
    fechaRecordatorio: undefined,
    notaInterna: undefined,
    historial: [{ fecha: new Date().toISOString(), tipo: "duplicada", detalle: `Desde ${orig.numeroCotizacion}` }],
    // Preserve observations from the original
    observacionesSeleccionadas: orig.observacionesSeleccionadas ? [...orig.observacionesSeleccionadas] : undefined,
    observacionManual: orig.observacionManual,
    cliente: { ...orig.cliente },
    servicios: orig.servicios.map((s) => ({ ...s })),
    acomodaciones: [...orig.acomodaciones],
  };
}
