export type Acomodacion = "SGL" | "DBL" | "TPL" | "CHD";
export type Tier = "p1" | "p2_5" | "p6_10";

export interface Hotel {
  id: string;
  nombre: string;
  categoria: string;
  estrellas: string;
  tipoHabitacion: string;
  ubicacion: string;
  desayuno: string;
  vigencia: string;
  precios: { SGL: number; DBL: number; TPL: number; CHD: number };
}

export interface Tour {
  id: string;
  nombre: string;
  categoria: string;
  seccion: string;
  horario: string;
  precio_por_persona: number;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
  descripcion: string;
}

export interface Traslado {
  id: string;
  nombre: string;
  categoria: string;
  tipo: "Regular" | "Privado";
  precio_por_persona: number;
  precios: { p1: number; p2_5: number; p6_10: number; chd: number };
}

/** Tour-only manual add-on for entrance tickets. */
export interface TourTickets {
  enabled: boolean;
  label: string;
  adultPrice: number;
  childPrice?: number;
}

export interface ServicioSeleccionado {
  id: string;
  /** External code shown in the document, defaults to id. */
  codigo?: string;
  tipo: "hotel" | "tour" | "traslado" | "vuelo" | "catamaran";
  nombre: string;
  /** Vuelo-only: airport / city of origin. */
  origen?: string;
  /** Vuelo-only: airport / city of destination. */
  destino?: string;
  /** Tour-only: optional manual ticket add-on (e.g. museum entry). */
  tickets?: TourTickets;
  /** Tour-only: schedule label captured from catalog (days · time · duration). */
  horario?: string;
  precios: {
    p1?: number;
    p2_5?: number;
    p6_10?: number;
    chd?: number;
    SGL?: number;
    DBL?: number;
    TPL?: number;
    CHD?: number;
  };
  /** Manual override of the tier picked for tours/traslados. */
  tarifaOverride?: Tier;
  /** Manual override of the unit price (total p/p) for tours/traslados.
   * When defined, sobrescribe la tarifa automática y NO cambia aunque cambie el rango. */
  unitOverride?: number;
  /** Override of pax count used when computing this service. */
  paxOverride?: number;
  /** Tour/traslado: whether to display a service date. */
  usarFecha?: boolean;
  /** Tour/traslado date (single day). */
  fecha?: string;
  /** Hotel check-in. */
  fechaInicio?: string;
  /** Hotel check-out. */
  fechaFin?: string;
  /** Free notes shown in the document. */
  notas?: string;
  /** Hotel-only meta inherited when picked from catalog. */
  ubicacion?: string;
  estrellas?: string;
  vigencia?: string;
  tipoHabitacion?: string;
  /** Hotel-only: meal plan / régimen (e.g. "Desayuno buffet incluido"). */
  desayuno?: string;
  manual?: boolean;
  /** For traslados: whether the service is Regular or Privado. */
  tipoServicio?: "Regular" | "Privado";
}

export interface Descriptivo {
  codigo: string;
  titulo: string;
  info?: string;
  parrafos?: string[];
  incluye?: string;
  observaciones?: string;
  notaImportante?: string;
  recomendaciones?: string;
  horarioExtra?: string;
}

export const AGENTES = [
  "JOHANNA C.",
  "MELISA A.",
  "GABRIELA S.",
  "JONATHAN C.",
] as const;

export type Agente = (typeof AGENTES)[number];

export interface Cliente {
  nombre: string;
  correo: string;
  whatsapp: string;
  agente: string;
  fechaInicio: string;
  fechaFin: string;
  vigencia: string;
  pasajeros: number;
  ninos: number;
  noches: number;
}

export type ClienteValidationField = "agencia" | "agente" | "fechaInicio";

export type ClienteValidationErrors = Partial<
  Record<ClienteValidationField, boolean>
>;

export function validateCliente(c: Cliente): {
  ok: boolean;
  errors: ClienteValidationErrors;
} {
  const errors: ClienteValidationErrors = {};
  if (!c.correo?.trim()) errors.agencia = true;
  if (!c.agente?.trim()) errors.agente = true;
  return { ok: Object.keys(errors).length === 0, errors };
}

export interface ServicioCalculado {
  id: string;
  tipo: "hotel" | "tour" | "traslado" | "vuelo" | "catamaran";
  nombre: string;
  origen?: string;
  destino?: string;
  codigo?: string;
  preciosPorAcomodacion: Record<Acomodacion, number>;
  totalesPorAcomodacion: Record<Acomodacion, number>;
  detalle: string;
  fecha?: string;
  fechaInicio?: string;
  fechaFin?: string;
  notas?: string;
  ubicacion?: string;
  estrellas?: string;
  vigencia?: string;
  tipoHabitacion?: string;
  /** Hotel-only: meal plan displayed under hotel name in proposals. */
  desayuno?: string;
  noches?: number;
  paxAplicados?: number;
  /** For tours/traslados: which tier was applied. */
  tierAplicado?: Tier;
  unitAplicado?: number;
  /** Tour-only: surfaced ticket add-on for display. */
  tickets?: TourTickets;
  /** Tour-only: schedule label surfaced for display. */
  horario?: string;
  /** For traslados/tours: Regular or Privado. */
  tipoServicio?: "Regular" | "Privado";
}

export interface CotizacionResult {
  servicios: ServicioCalculado[];
  totalesPorAcomodacion: Record<Acomodacion, number>;
  subtotalesPorTipo: {
    hotel: Record<Acomodacion, number>;
    tour: Record<Acomodacion, number>;
    traslado: Record<Acomodacion, number>;
    vuelo: Record<Acomodacion, number>;
    catamaran: Record<Acomodacion, number>;
  };
  acomodaciones: Acomodacion[];
  noches: number;
  pasajeros: number;
  ninos: number;
}
