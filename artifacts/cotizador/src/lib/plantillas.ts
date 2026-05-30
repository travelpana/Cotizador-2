import type { Hotel, ServicioSeleccionado, Tour, Traslado } from "@/lib/types";

export type PlantillaBlockTipo =
  | "titulo"
  | "nota"
  | "texto"
  | "hotel"
  | "tour"
  | "traslado"
  | "vuelo"
  | "catamaran"
  | "observaciones";

export interface PlantillaBlock {
  id: string;
  tipo: PlantillaBlockTipo;
  /** Used for: titulo, nota, texto, observaciones (newline-separated bullets) */
  texto?: string;
  hotelId?: string;
  hotelNombre?: string;
  hotelNotas?: string;
  tourId?: string;
  tourNombre?: string;
  trasladoId?: string;
  trasladoNombre?: string;
  /** Vuelo fields */
  vueloOrigen?: string;
  vueloDestino?: string;
  vueloIdaVuelta?: boolean;
  vueloPrecio?: number;
  vueloPrecioChd?: number;
  vueloNotas?: string;
  /** Catamaran fields (uses tours catalog) */
  catamaranId?: string;
  catamaranNombre?: string;
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
          desayuno: h.desayuno || undefined,
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
    } else if (blk.tipo === "vuelo") {
      const origen = blk.vueloOrigen?.trim() || "";
      const destino = blk.vueloDestino?.trim() || "";
      if (origen || destino) {
        const nombre = blk.vueloIdaVuelta
          ? `${origen || "?"} → ${destino || "?"} → ${origen || "?"}`
          : `${origen || "?"} → ${destino || "?"}`;
        const precio = blk.vueloPrecio ?? 0;
        const precioChd = blk.vueloPrecioChd ?? precio;
        out.push({
          id: `vuelo-plt-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          tipo: "vuelo",
          nombre,
          origen,
          destino,
          precios: {
            p1: precio,
            p2_5: precio,
            p6_10: precio,
            chd: precioChd,
          },
          unitOverride: precio,
          manual: true,
          notas: blk.vueloNotas || undefined,
        });
      }
    } else if (blk.tipo === "catamaran" && blk.catamaranId) {
      const t = tours.find((x) => x.id === blk.catamaranId);
      if (t) {
        out.push({
          id: `catamaran-${t.id}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
          codigo: t.id,
          tipo: "catamaran",
          nombre: t.nombre,
          precios: {
            p1: t.precios.p1,
            p2_5: t.precios.p2_5,
            p6_10: t.precios.p6_10,
            chd: t.precios.chd,
          },
          usarFecha: false,
        });
      }
    }
  }
  return out;
}

/** Extracts observaciones bullets from an "observaciones" block in the template. */
export function extractObservacionesFromPlantilla(plantilla: Plantilla): string[] {
  const lines: string[] = [];
  for (const blk of plantilla.bloques) {
    if (blk.tipo === "observaciones" && blk.texto) {
      for (const line of blk.texto.split("\n")) {
        const trimmed = line.trim();
        if (trimmed) lines.push(trimmed);
      }
    }
  }
  return lines;
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
    if (s.tipo === "vuelo") {
      return {
        id,
        tipo: "vuelo" as const,
        vueloOrigen: s.origen,
        vueloDestino: s.destino,
        vueloPrecio: s.unitOverride ?? s.precios.p1,
        vueloPrecioChd: s.precios.chd,
        vueloNotas: s.notas,
      };
    }
    if (s.tipo === "catamaran") {
      return {
        id,
        tipo: "catamaran" as const,
        catamaranId: s.codigo ?? s.id,
        catamaranNombre: s.nombre,
      };
    }
    return {
      id,
      tipo: "texto" as const,
      texto: s.nombre,
    };
  });
}
