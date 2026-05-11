import type { Hotel, ServicioSeleccionado, Tour, Traslado } from "@/lib/types";

export type PlantillaBlockTipo =
  | "titulo"
  | "nota"
  | "texto"
  | "hotel"
  | "tour"
  | "traslado";

export interface PlantillaBlock {
  id: string;
  tipo: PlantillaBlockTipo;
  texto?: string;
  hotelId?: string;
  hotelNombre?: string;
  hotelNotas?: string;
  tourId?: string;
  tourNombre?: string;
  trasladoId?: string;
  trasladoNombre?: string;
}

export interface Plantilla {
  id: string;
  nombre: string;
  descripcion?: string;
  bloques: PlantillaBlock[];
  createdAt: string;
  updatedAt: string;
}

const LS_KEY = "rge_plantillas_v1";

export function loadPlantillas(): Plantilla[] {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as Plantilla[];
  } catch {
    return [];
  }
}

export function savePlantillas(items: Plantilla[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(items));
}

let _counter = 0;
function uid(): string {
  return `${Date.now()}_${++_counter}`;
}

export function newBlock(tipo: PlantillaBlockTipo): PlantillaBlock {
  return { id: `blk_${uid()}`, tipo };
}

export function newPlantilla(nombre: string): Plantilla {
  const now = new Date().toISOString();
  return {
    id: `plt_${uid()}`,
    nombre,
    bloques: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function duplicarPlantilla(p: Plantilla): Plantilla {
  const now = new Date().toISOString();
  return {
    ...p,
    id: `plt_${uid()}`,
    nombre: `${p.nombre} (copia)`,
    bloques: p.bloques.map((b) => ({ ...b, id: `blk_${uid()}` })),
    createdAt: now,
    updatedAt: now,
  };
}

export function buildServiciosFromPlantilla(
  plantilla: Plantilla,
  hoteles: Hotel[],
  tours: Tour[],
  traslados: Traslado[],
): ServicioSeleccionado[] {
  const out: ServicioSeleccionado[] = [];
  for (const blk of plantilla.bloques) {
    if (blk.tipo === "hotel" && blk.hotelId) {
      const h = hoteles.find((x) => x.id === blk.hotelId);
      if (h) {
        out.push({
          id: `hotel-${h.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          codigo: h.id,
          tipo: "hotel",
          nombre: h.nombre,
          precios: {
            SGL: h.precios.SGL,
            DBL: h.precios.DBL,
            TPL: h.precios.TPL,
            CHD: h.precios.CHD,
          },
          ubicacion: h.ubicacion,
          estrellas: h.estrellas,
          vigencia: h.vigencia,
          tipoHabitacion: h.tipoHabitacion,
          notas: blk.hotelNotas || undefined,
        });
      }
    } else if (blk.tipo === "tour" && blk.tourId) {
      const t = tours.find((x) => x.id === blk.tourId);
      if (t) {
        out.push({
          id: `tour-${t.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          codigo: t.id,
          tipo: "tour",
          nombre: t.nombre,
          precios: {
            p1: t.precios.p1,
            p2_5: t.precios.p2_5,
            p6_10: t.precios.p6_10,
            chd: t.precios.chd,
          },
          usarFecha: false,
          horario: t.horario || undefined,
        });
      }
    } else if (blk.tipo === "traslado" && blk.trasladoId) {
      const tr = traslados.find((x) => x.id === blk.trasladoId);
      if (tr) {
        out.push({
          id: `traslado-${tr.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          codigo: tr.id,
          tipo: "traslado",
          nombre: tr.nombre,
          precios: {
            p1: tr.precios.p1,
            p2_5: tr.precios.p2_5,
            p6_10: tr.precios.p6_10,
            chd: tr.precios.chd,
          },
          usarFecha: false,
          tipoServicio: tr.tipo,
        });
      }
    }
  }
  return out;
}

export function serviciosToBlocks(
  servicios: ServicioSeleccionado[],
): PlantillaBlock[] {
  return servicios.map((s) => {
    const id = `blk_${uid()}`;
    if (s.tipo === "hotel") {
      return {
        id,
        tipo: "hotel" as const,
        hotelId: s.codigo ?? s.id,
        hotelNombre: s.nombre,
        hotelNotas: s.notas,
      };
    }
    if (s.tipo === "tour") {
      return {
        id,
        tipo: "tour" as const,
        tourId: s.codigo ?? s.id,
        tourNombre: s.nombre,
      };
    }
    if (s.tipo === "traslado") {
      return {
        id,
        tipo: "traslado" as const,
        trasladoId: s.codigo ?? s.id,
        trasladoNombre: s.nombre,
      };
    }
    return {
      id,
      tipo: "texto" as const,
      texto: s.nombre,
    };
  });
}
