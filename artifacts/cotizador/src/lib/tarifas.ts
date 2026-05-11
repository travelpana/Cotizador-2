import type { Hotel, Tour, Traslado } from "@/lib/types";

/* ─── Extended local types ─── */

export interface HotelLocal extends Hotel {
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TourLocal extends Tour {
  /** RGE code (e.g. "RGE-020") — becomes the `codigo` on ServicioSeleccionado for descriptivos linking.
   *  For API-imported tours, id already IS the RGE code. For new local tours, the user sets it. */
  tipoServicio?: "Regular" | "Privado";
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface TrasladoLocal extends Traslado {
  rutaOrigen?: string;
  rutaDestino?: string;
  activo: boolean;
  createdAt: string;
  updatedAt: string;
}

/* ─── Storage keys ─── */

const LS_HOTELES = "rge_tarifas_hoteles_v1";
const LS_TOURS = "rge_tarifas_tours_v1";
const LS_TRASLADOS = "rge_tarifas_traslados_v1";

/* ─── ID generator ─── */

let _cnt = 0;
function uid(prefix: string) {
  return `${prefix}_${Date.now()}_${++_cnt}`;
}

/* ─── Load / Save ─── */

export function loadHotelesLS(): HotelLocal[] {
  try { return JSON.parse(localStorage.getItem(LS_HOTELES) ?? "[]"); } catch { return []; }
}
export function saveHotelesLS(items: HotelLocal[]) {
  localStorage.setItem(LS_HOTELES, JSON.stringify(items));
}

export function loadToursLS(): TourLocal[] {
  try { return JSON.parse(localStorage.getItem(LS_TOURS) ?? "[]"); } catch { return []; }
}
export function saveToursLS(items: TourLocal[]) {
  localStorage.setItem(LS_TOURS, JSON.stringify(items));
}

export function loadTrasladosLS(): TrasladoLocal[] {
  try { return JSON.parse(localStorage.getItem(LS_TRASLADOS) ?? "[]"); } catch { return []; }
}
export function saveTrasladosLS(items: TrasladoLocal[]) {
  localStorage.setItem(LS_TRASLADOS, JSON.stringify(items));
}

/* ─── Factory functions ─── */

export function newHotelLocal(partial?: Partial<HotelLocal>): HotelLocal {
  const now = new Date().toISOString();
  return {
    id: uid("hotel"),
    nombre: "",
    categoria: "★★★★",
    estrellas: "★★★★",
    tipoHabitacion: "Estándar",
    ubicacion: "CIUDAD DE PANAMÁ",
    desayuno: "No incluido",
    vigencia: "",
    precios: { SGL: 0, DBL: 0, TPL: 0, CHD: 0 },
    activo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newTourLocal(partial?: Partial<TourLocal>): TourLocal {
  const now = new Date().toISOString();
  return {
    id: uid("tour"),
    nombre: "",
    categoria: "",
    seccion: "",
    horario: "",
    precio_por_persona: 0,
    precios: { p1: 0, p2_5: 0, p6_10: 0, chd: 0 },
    descripcion: "",
    tipoServicio: "Regular",
    activo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

export function newTrasladoLocal(partial?: Partial<TrasladoLocal>): TrasladoLocal {
  const now = new Date().toISOString();
  return {
    id: uid("traslado"),
    nombre: "",
    categoria: "",
    tipo: "Regular",
    precio_por_persona: 0,
    precios: { p1: 0, p2_5: 0, p6_10: 0, chd: 0 },
    rutaOrigen: "",
    rutaDestino: "",
    activo: true,
    createdAt: now,
    updatedAt: now,
    ...partial,
  };
}

/* ─── Duplicate helpers ─── */

export function duplicarHotel(h: HotelLocal): HotelLocal {
  const now = new Date().toISOString();
  return { ...h, id: uid("hotel"), nombre: `${h.nombre} (copia)`, createdAt: now, updatedAt: now };
}

export function duplicarTour(t: TourLocal): TourLocal {
  const now = new Date().toISOString();
  return { ...t, id: uid("tour"), nombre: `${t.nombre} (copia)`, createdAt: now, updatedAt: now };
}

export function duplicarTraslado(t: TrasladoLocal): TrasladoLocal {
  const now = new Date().toISOString();
  return { ...t, id: uid("traslado"), nombre: `${t.nombre} (copia)`, createdAt: now, updatedAt: now };
}

/* ─── Import from API item ─── */

export function hotelFromApi(h: Hotel): HotelLocal {
  const now = new Date().toISOString();
  return { ...h, activo: true, createdAt: now, updatedAt: now };
}

export function tourFromApi(t: Tour): TourLocal {
  const now = new Date().toISOString();
  return { ...t, tipoServicio: "Regular", activo: true, createdAt: now, updatedAt: now };
}

export function trasladoFromApi(t: Traslado): TrasladoLocal {
  const now = new Date().toISOString();
  return { ...t, rutaOrigen: "", rutaDestino: "", activo: true, createdAt: now, updatedAt: now };
}

/* ─── Merge: LS takes priority over API (by id). Inactive excluded. ─── */

export function mergeHoteles(ls: HotelLocal[], api: Hotel[]): Hotel[] {
  const active = ls.filter((h) => h.activo);
  const lsIds = new Set(active.map((h) => h.id));
  const apiOnly = api.filter((h) => !lsIds.has(h.id));
  return [...(active as Hotel[]), ...apiOnly];
}

export function mergeTours(ls: TourLocal[], api: Tour[]): Tour[] {
  const active = ls.filter((t) => t.activo);
  const lsIds = new Set(active.map((t) => t.id));
  const apiOnly = api.filter((t) => !lsIds.has(t.id));
  return [...(active as Tour[]), ...apiOnly];
}

export function mergeTraslados(ls: TrasladoLocal[], api: Traslado[]): Traslado[] {
  const active = ls.filter((t) => t.activo);
  const lsIds = new Set(active.map((t) => t.id));
  const apiOnly = api.filter((t) => !lsIds.has(t.id));
  return [...(active as Traslado[]), ...apiOnly];
}

/* ─── Export backup ─── */

export function exportarRespaldo() {
  const data = {
    exportedAt: new Date().toISOString(),
    hoteles: loadHotelesLS(),
    tours: loadToursLS(),
    traslados: loadTrasladosLS(),
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `tarifas-rge-${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
