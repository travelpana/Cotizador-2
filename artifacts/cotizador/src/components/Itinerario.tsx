import { Map } from "lucide-react";
import type { Cliente, ServicioSeleccionado } from "@/lib/types";
import { addDays } from "@/lib/calc";
import { formatTrasladoNombre } from "@/lib/utils";
import { useEffect, useRef } from "react";

const ARROW = "→";

/** Format a transfer name showing only the relevant leg for arrival/departure.
 *  - Round-trip (3+ segments): "A → B → C"
 *      mode="llegada"  → "A → B"
 *      mode="salida"   → "B → C"
 *  - One-way / single leg: returned as-is.
 */
function formatTrasladoTramo(
  name: string,
  mode: "llegada" | "salida",
): string {
  const clean = formatTrasladoNombre(name);
  const segs = clean
    .split(ARROW)
    .map((s) => s.trim())
    .filter(Boolean);
  if (segs.length < 3) return clean;
  if (mode === "llegada") return `${segs[0]} ${ARROW} ${segs[1]}`;
  return `${segs[segs.length - 2]} ${ARROW} ${segs[segs.length - 1]}`;
}

function formatFechaDMY(iso: string): string {
  if (!iso) return "—";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return iso;
  return `${d}/${m}/${y}`;
}

interface Props {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  hotelPrincipal?: string;
  incluirDescriptivos: boolean;
  actividadesOverride?: Record<number, string>;
  onActividadesOverrideChange?: (next: Record<number, string>) => void;
}

export interface ItinerarioDia {
  dia: number;
  fecha: string;
  actividad: string;
  /** All activities for this day when multiple services share the same date. */
  actividades?: string[];
  hotel: string;
  descripcion?: string;
  /** Tour-day only: schedule label "{days} · {time} · {duration}". */
  horario?: string;
  /** Whether this day's activity is a tour (vs llegada/salida/día libre). */
  esTour?: boolean;
}

export function buildItinerario(
  cliente: Cliente,
  servicios: ServicioSeleccionado[],
): ItinerarioDia[] {
  const noches = Math.max(0, cliente.noches || 0);
  const totalDias = noches + 1;
  const hoteles = servicios.filter((s) => s.tipo === "hotel");
  const hotelDefault = hoteles[0]?.nombre || "—";

  // ── Helpers ──────────────────────────────────────────────────────────────

  const AIRPORT_KW = ["aeropuerto", "airport"];
  const hasAirport = (seg: string) =>
    AIRPORT_KW.some((kw) => seg.toLowerCase().includes(kw));

  /** True if the transfer's first segment originates from an airport. */
  const isArrivalTraslado = (nombre: string): boolean => {
    const segs = formatTrasladoNombre(nombre).split("→").map((s) => s.trim());
    return segs.length >= 2 && hasAirport(segs[0]);
  };

  /** True if the transfer's last segment ends at an airport. */
  const isDepartureTraslado = (nombre: string): boolean => {
    const segs = formatTrasladoNombre(nombre).split("→").map((s) => s.trim());
    return segs.length >= 2 && hasAirport(segs[segs.length - 1]);
  };

  /** Whether a service's fechaItinerario matches this day. */
  const matchesDia = (
    fi: string | undefined,
    dayIndex: number,
    dayFecha: string,
  ): boolean => {
    if (!fi) return false;
    if (fi.startsWith("dia-")) return parseInt(fi.slice(4), 10) === dayIndex + 1;
    return !!dayFecha && fi === dayFecha;
  };

  // Ordering within a day: llegadas → traslados → tours → actividades → salidas
  type Category = "llegada" | "traslado" | "tour" | "actividad" | "salida";
  const CATEGORY_ORDER: Category[] = ["llegada", "traslado", "tour", "actividad", "salida"];

  const getCategory = (s: ServicioSeleccionado, dayIndex: number): Category => {
    if (s.tipo === "traslado") {
      if (isArrivalTraslado(s.nombre) && dayIndex === 0) return "llegada";
      if (isDepartureTraslado(s.nombre) && dayIndex === totalDias - 1) return "salida";
      return "traslado";
    }
    if (s.tipo === "tour" || s.tipo === "catamaran" || s.tipo === "vuelo") return "tour";
    return "actividad";
  };

  const getTransladoDisplayName = (nombre: string, category: Category): string => {
    if (category === "llegada")
      return `Llegada · Traslado ${formatTrasladoTramo(nombre, "llegada")}`;
    if (category === "salida")
      return `Salida · Traslado ${formatTrasladoTramo(nombre, "salida")}`;
    return `Traslado ${formatTrasladoNombre(nombre)}`;
  };

  // Tours without any day assignment: fill middle days sequentially as fallback
  const unassignedTours = servicios.filter(
    (s) => s.tipo === "tour" && !s.fechaItinerario,
  );
  let unassignedTourIdx = 0;

  const nonHotelServices = servicios.filter((s) => s.tipo !== "hotel");

  // ── Build each day ────────────────────────────────────────────────────────

  const out: ItinerarioDia[] = [];

  for (let i = 0; i < totalDias; i++) {
    const fecha = cliente.fechaInicio ? addDays(cliente.fechaInicio, i) : "";

    type DayEntry = { name: string; category: Category; horario?: string };
    const dayEntries: DayEntry[] = [];

    for (const s of nonHotelServices) {
      // ── Traslados ────────────────────────────────────────────────────────
      if (s.tipo === "traslado") {
        if (s.fechaItinerario) {
          // Explicit day assignment — always respected
          if (matchesDia(s.fechaItinerario, i, fecha)) {
            const cat = getCategory(s, i);
            dayEntries.push({ name: getTransladoDisplayName(s.nombre, cat), category: cat });
          }
        } else {
          // Auto-detect from name: airport arrival → Day 1, airport departure → Last day
          // A round-trip traslado (Apto → Hotel → Apto) appears on BOTH days
          const arrival = isArrivalTraslado(s.nombre);
          const departure = isDepartureTraslado(s.nombre);
          if (arrival && i === 0)
            dayEntries.push({ name: getTransladoDisplayName(s.nombre, "llegada"), category: "llegada" });
          if (departure && i === totalDias - 1)
            dayEntries.push({ name: getTransladoDisplayName(s.nombre, "salida"), category: "salida" });
          // Interhotel / local traslados without explicit day: not shown automatically
        }
        continue;
      }

      // ── Vuelos ───────────────────────────────────────────────────────────
      if (s.tipo === "vuelo") {
        const vueloName = s.nombre || (s.origen && s.destino ? `${s.origen} → ${s.destino}` : "");
        if (s.fechaItinerario && matchesDia(s.fechaItinerario, i, fecha)) {
          dayEntries.push({ name: vueloName, category: "tour" });
        }
        // "Ida y vuelta" return leg
        if (s.tipoVuelo === "Ida y vuelta" && s.fechaItinerarioVuelta && matchesDia(s.fechaItinerarioVuelta, i, fecha)) {
          const returnName = s.destino && s.origen ? `${s.destino} → ${s.origen}` : vueloName;
          dayEntries.push({ name: returnName, category: "tour" });
        }
        continue;
      }

      // ── Tours, catamarán, and custom services ────────────────────────────
      if (s.fechaItinerario && matchesDia(s.fechaItinerario, i, fecha)) {
        const cat = getCategory(s, i);
        dayEntries.push({ name: s.nombre, category: cat, horario: s.horario?.trim() || undefined });
      }
      // Tours without a day assignment are handled by the sequential fallback below
    }

    // Sort within the day by category order
    dayEntries.sort(
      (a, b) => CATEGORY_ORDER.indexOf(a.category) - CATEGORY_ORDER.indexOf(b.category),
    );

    let actividad: string;
    let actividades: string[] | undefined;
    let esTour = false;
    let horario: string | undefined;
    let descripcion = "";

    if (dayEntries.length > 0) {
      actividades = dayEntries.map((e) => e.name);
      actividad = actividades.join(" · ");
      descripcion = actividad;
      esTour = true;
      horario = dayEntries.find((e) => e.horario)?.horario;
    } else {
      // Fallback: unassigned tours fill middle days sequentially
      const isBoundaryDay = i === 0 || i === totalDias - 1;
      const tour = !isBoundaryDay ? unassignedTours[unassignedTourIdx++] : undefined;
      actividad = tour ? tour.nombre : "Día libre";
      descripcion = tour ? tour.nombre : "Día libre para actividades a su elección";
      if (tour) {
        esTour = true;
        horario = tour.horario?.trim() || undefined;
      }
    }

    // On the last day, hide the hotel if there's a departure transfer
    const hasDeparture = dayEntries.some((e) => e.category === "salida");
    const hotel = i === totalDias - 1 && hasDeparture ? "—" : hotelDefault;

    out.push({ dia: i + 1, fecha, actividad, actividades, hotel, descripcion, horario, esTour });
  }

  return out;
}

interface ActividadCellProps {
  dia: number;
  value: string;
  editable: boolean;
  onCommit: (next: string) => void;
}

function ActividadCell({ dia, value, editable, onCommit }: ActividadCellProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    if (document.activeElement === ref.current) return;
    if (ref.current.textContent !== value) {
      ref.current.textContent = value;
    }
  }, [value]);

  if (!editable) {
    return (
      <div className="text-slate-900 font-medium">{value}</div>
    );
  }

  return (
    <div
      ref={ref}
      role="textbox"
      aria-label={`Editar actividad del día ${dia}`}
      contentEditable
      suppressContentEditableWarning
      spellCheck={false}
      className="text-slate-900 font-medium outline-none focus:ring-2 focus:ring-primary/40 rounded px-1 -mx-1 cursor-text"
      onBlur={(e) => {
        const next = e.currentTarget.textContent ?? "";
        if (next !== value) onCommit(next);
      }}
      onKeyDown={(e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          (e.currentTarget as HTMLDivElement).blur();
        }
      }}
    >
      {value}
    </div>
  );
}

export default function Itinerario({
  cliente,
  servicios,
  incluirDescriptivos,
  actividadesOverride,
  onActividadesOverrideChange,
}: Props) {
  const itinerario = buildItinerario(cliente, servicios);
  const overrides = actividadesOverride ?? {};
  const editable = typeof onActividadesOverrideChange === "function";

  const commit = (dia: number, next: string) => {
    if (!onActividadesOverrideChange) return;
    const trimmed = next.trim();
    const original = itinerario.find((x) => x.dia === dia)?.actividad ?? "";
    const copy = { ...overrides };
    if (!trimmed || trimmed === original) {
      delete copy[dia];
    } else {
      copy[dia] = trimmed;
    }
    onActividadesOverrideChange(copy);
  };

  return (
    <div className="card-white p-6">
      <div className="flex items-center gap-2 mb-4">
        <div className="w-9 h-9 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
          <Map className="w-4 h-4" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-slate-900">Itinerario</h2>
          <p className="text-xs text-slate-500">
            Vista previa del día a día generado automáticamente
            {editable ? " · Click en la actividad para editar" : ""}
          </p>
        </div>
      </div>

      {itinerario.length === 0 ? (
        <div className="text-center py-8 text-sm text-slate-500">
          Define noches o fechas para generar el itinerario.
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs uppercase tracking-wide text-slate-500 border-b border-slate-200">
                <th className="text-left py-2 px-2 w-16">Día</th>
                <th className="text-left py-2 px-2 w-28">Fecha</th>
                <th className="text-left py-2 px-2">Actividad</th>
              </tr>
            </thead>
            <tbody>
              {itinerario.map((d) => {
                const value = overrides[d.dia] ?? d.actividad;
                return (
                  <tr
                    key={d.dia}
                    className="border-b border-slate-100 last:border-0"
                  >
                    <td className="py-3 px-2">
                      <div className="w-9 h-9 rounded-full bg-primary/10 text-primary flex items-center justify-center font-bold text-xs">
                        {d.dia}
                      </div>
                    </td>
                    <td className="py-3 px-2 text-slate-700 text-xs">
                      {d.fecha ? formatFechaDMY(d.fecha) : "—"}
                    </td>
                    <td className="py-3 px-2">
                      {d.actividades && d.actividades.length > 1 ? (
                        <div className="space-y-1">
                          {d.actividades.map((a, idx) => (
                            <div key={idx} className="flex items-start gap-1.5">
                              <span className="text-primary font-bold text-xs mt-0.5">·</span>
                              <span className="text-slate-900 font-medium text-sm">{a}</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <ActividadCell
                          dia={d.dia}
                          value={value}
                          editable={editable}
                          onCommit={(next) => commit(d.dia, next)}
                        />
                      )}
                      {incluirDescriptivos && d.esTour && d.horario && (
                        <div className="text-xs text-slate-500 mt-1.5">
                          Horario: {d.horario}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
