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
  /** Manual override of the tier picked for tours/traslados (1pax, 2-5, 6-10). */
  tarifaOverride?: Tier;
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
  preciosPorAcomodacion: Record<Acomodacion, number>;
  totalesPorAcomodacion: Record<Acomodacion, number>;
  detalle: string;
  /** For tours/traslados: which tier was applied. */
  tierAplicado?: Tier;
  unitAplicado?: number;
}

export interface CotizacionResult {
  servicios: ServicioCalculado[];
  totalesPorAcomodacion: Record<Acomodacion, number>;
  acomodaciones: Acomodacion[];
  noches: number;
  pasajeros: number;
  ninos: number;
}
