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

export type EntradaTipo =
  | "canal_panama"
  | "museo"
  | "sitio_historico"
  | "otro";

export interface EntradaAdicional {
  tipo: EntradaTipo;
  precio: number;
  notas?: string;
}

export interface ServicioSeleccionado {
  id: string;
  /** External code shown in the document, defaults to id. */
  codigo?: string;
  tipo: "hotel" | "tour" | "traslado" | "vuelo";
  nombre: string;
  /** Vuelo-only: airport / city of origin. */
  origen?: string;
  /** Vuelo-only: airport / city of destination. */
  destino?: string;
  /** Tour-only: optional add-on entry (museum, site, etc.) priced per person. */
  entrada?: EntradaAdicional;
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
  manual?: boolean;
}

export interface Cliente {
  nombre: string;
  correo: string;
  whatsapp: string;
  fechaInicio: string;
  fechaFin: string;
  vigencia: string;
  pasajeros: number;
  ninos: number;
  noches: number;
}

export interface ServicioCalculado {
  id: string;
  tipo: "hotel" | "tour" | "traslado" | "vuelo";
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
  noches?: number;
  paxAplicados?: number;
  /** For tours/traslados: which tier was applied. */
  tierAplicado?: Tier;
  unitAplicado?: number;
  /** Tour-only: copy of the add-on entry, surfaced for display. */
  entrada?: EntradaAdicional;
}

export interface CotizacionResult {
  servicios: ServicioCalculado[];
  totalesPorAcomodacion: Record<Acomodacion, number>;
  subtotalesPorTipo: {
    hotel: Record<Acomodacion, number>;
    tour: Record<Acomodacion, number>;
    traslado: Record<Acomodacion, number>;
    vuelo: Record<Acomodacion, number>;
  };
  acomodaciones: Acomodacion[];
  noches: number;
  pasajeros: number;
  ninos: number;
}
