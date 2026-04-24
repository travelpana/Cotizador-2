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

export interface ServicioSeleccionado {
  id: string;
  /** External code shown in the document, defaults to id. */
  codigo?: string;
  tipo: "hotel" | "tour" | "traslado";
  nombre: string;
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
  manual?: boolean;
}

export interface Cliente {
  nombre: string;
  fechaInicio: string;
  fechaFin: string;
  pasajeros: number;
  ninos: number;
  noches: number;
}

export interface ServicioCalculado {
  id: string;
  tipo: "hotel" | "tour" | "traslado";
  nombre: string;
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
  noches?: number;
  paxAplicados?: number;
  /** For tours/traslados: which tier was applied. */
  tierAplicado?: Tier;
  unitAplicado?: number;
}

export interface CotizacionResult {
  servicios: ServicioCalculado[];
  totalesPorAcomodacion: Record<Acomodacion, number>;
  subtotalesPorTipo: {
    hotel: Record<Acomodacion, number>;
    tour: Record<Acomodacion, number>;
    traslado: Record<Acomodacion, number>;
  };
  acomodaciones: Acomodacion[];
  noches: number;
  pasajeros: number;
  ninos: number;
}
