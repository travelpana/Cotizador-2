import type { ServicioSeleccionado } from "./types";

export type ObservacionCategoria =
  | "general"
  | "hotel"
  | "tour"
  | "traslado"
  | "vuelo";

export interface ObservacionRapida {
  id: string;
  texto: string;
  categoria: ObservacionCategoria;
  /** Display order */
  orden: number;
  /** Hidden from UI when false (for future admin panel) */
  activo: boolean;
}

const STORAGE_KEY = "rge_observaciones_v1";

/** Default catalog — editable via future admin panel stored in localStorage */
const DEFAULT_OBSERVACIONES: ObservacionRapida[] = [
  {
    id: "precios_netos_pp",
    texto: "Precios netos por persona / por noche en hotelería",
    categoria: "hotel",
    orden: 1,
    activo: true,
  },
  {
    id: "sujeto_disponibilidad",
    texto: "Precios sujetos a disponibilidad al momento de solicitar la reserva",
    categoria: "general",
    orden: 2,
    activo: true,
  },
  {
    id: "suplemento_sgl",
    texto: "Pasajeros viajando solos aplican suplemento de $25 USD por noche",
    categoria: "general",
    orden: 3,
    activo: true,
  },
  {
    id: "suplemento_vuelo_nocturno",
    texto: "Pasajeros en vuelos nocturnos aplican suplemento adicional por vía",
    categoria: "vuelo",
    orden: 4,
    activo: true,
  },
  {
    id: "impuestos_hoteleros",
    texto: "No incluye impuestos hoteleros locales (City Tax / Resort Fee)",
    categoria: "hotel",
    orden: 5,
    activo: true,
  },
  {
    id: "checkin_checkout",
    texto: "Check-in: 15:00 hrs · Check-out: 12:00 hrs",
    categoria: "hotel",
    orden: 6,
    activo: true,
  },
  {
    id: "traslado_compartido",
    texto: "Traslados en modalidad compartida",
    categoria: "traslado",
    orden: 7,
    activo: true,
  },
  {
    id: "minimo_pasajeros",
    texto: "Tours operan con mínimo de pasajeros confirmados",
    categoria: "tour",
    orden: 8,
    activo: true,
  },
  {
    id: "sujeto_clima",
    texto: "Actividades sujetas a condiciones climáticas",
    categoria: "tour",
    orden: 9,
    activo: true,
  },
  {
    id: "vuelos_no_incluidos",
    texto: "Vuelos internacionales no incluidos en la cotización",
    categoria: "general",
    orden: 10,
    activo: true,
  },
];

/** Load catalog from localStorage, falling back to defaults */
export function loadObservaciones(): ObservacionRapida[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_OBSERVACIONES;
    const stored = JSON.parse(raw) as ObservacionRapida[];
    // Merge: keep stored order/active, add any new defaults not yet in store
    const storedIds = new Set(stored.map((o) => o.id));
    const merged = [
      ...stored,
      ...DEFAULT_OBSERVACIONES.filter((d) => !storedIds.has(d.id)),
    ];
    return merged.sort((a, b) => a.orden - b.orden);
  } catch {
    return DEFAULT_OBSERVACIONES;
  }
}

export function saveObservaciones(items: ObservacionRapida[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

/** IDs that should be pre-suggested based on the services in the current quote */
export function getSugeridos(servicios: ServicioSeleccionado[]): Set<string> {
  const suggested = new Set<string>();
  const tipos = new Set(servicios.map((s) => s.tipo));

  // Always suggest availability disclaimer
  suggested.add("sujeto_disponibilidad");

  if (tipos.has("hotel")) {
    suggested.add("precios_netos_pp");
    suggested.add("impuestos_hoteleros");
    suggested.add("checkin_checkout");
  }

  if (tipos.has("traslado")) {
    // Only suggest "compartida" if any traslado is Regular
    const hasRegular = servicios.some(
      (s) => s.tipo === "traslado" && (s.tipoServicio === "Regular" || !s.tipoServicio),
    );
    if (hasRegular) suggested.add("traslado_compartido");
  }

  if (tipos.has("tour")) {
    suggested.add("minimo_pasajeros");
    suggested.add("sujeto_clima");
  }

  if (tipos.has("vuelo")) {
    suggested.add("suplemento_vuelo_nocturno");
  }

  if (!tipos.has("vuelo") && (tipos.has("hotel") || tipos.has("tour") || tipos.has("traslado"))) {
    suggested.add("vuelos_no_incluidos");
  }

  return suggested;
}

/** Resolve selected IDs + manual text into an array of final strings for export */
export function resolveObservaciones(
  catalog: ObservacionRapida[],
  seleccionadas: string[],
  manual: string,
): string[] {
  const idSet = new Set(seleccionadas);
  const textos = catalog
    .filter((o) => o.activo && idSet.has(o.id))
    .sort((a, b) => a.orden - b.orden)
    .map((o) => o.texto);

  const manualTrimmed = manual.trim();
  if (manualTrimmed) textos.push(manualTrimmed);

  return textos;
}
