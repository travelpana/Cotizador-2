import { Map } from "lucide-react";
import type { Cliente, ServicioSeleccionado } from "@/lib/types";
import { addDays } from "@/lib/calc";
import { formatTrasladoNombre } from "@/lib/utils";

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

interface Props {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  hotelPrincipal?: string;
  incluirDescriptivos: boolean;
}

export interface ItinerarioDia {
  dia: number;
  fecha: string;
  actividad: string;
  hotel: string;
  descripcion?: string;
}

export function buildItinerario(
  cliente: Cliente,
  servicios: ServicioSeleccionado[],
): ItinerarioDia[] {
  const noches = Math.max(0, cliente.noches || 0);
  const dias = noches + 1;
  const traslados = servicios.filter((s) => s.tipo === "traslado");
  const tours = servicios.filter((s) => s.tipo === "tour");
  const hoteles = servicios.filter((s) => s.tipo === "hotel");
  const hotelDefault = hoteles[0]?.nombre || "—";

  const out: ItinerarioDia[] = [];
  let tourIdx = 0;

  for (let i = 0; i < dias; i++) {
    const fecha = cliente.fechaInicio ? addDays(cliente.fechaInicio, i) : "";
    let actividad = "";
    let hotel = hotelDefault;
    let descripcion = "";

    if (i === 0) {
      const t = traslados[0];
      const tramo = t
        ? `Traslado ${formatTrasladoTramo(t.nombre, "llegada")}`
        : "Traslado al hotel";
      actividad = `Llegada · ${tramo}`;
      descripcion = tramo;
    } else if (i === dias - 1) {
      const t = traslados[traslados.length - 1];
      const tramo = t
        ? `Traslado ${formatTrasladoTramo(t.nombre, "salida")}`
        : "Traslado al aeropuerto";
      actividad = `Salida · ${tramo}`;
      descripcion = tramo;
      hotel = "—";
    } else {
      const tour = tours[tourIdx++];
      actividad = tour ? tour.nombre : "Día libre";
      descripcion = tour ? tour.nombre : "Día libre para actividades a su elección";
    }

    out.push({ dia: i + 1, fecha, actividad, hotel, descripcion });
  }
  return out;
}

export default function Itinerario({
  cliente,
  servicios,
  incluirDescriptivos,
}: Props) {
  const itinerario = buildItinerario(cliente, servicios);

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
              {itinerario.map((d) => (
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
                    {d.fecha || "—"}
                  </td>
                  <td className="py-3 px-2">
                    <div className="text-slate-900 font-medium">
                      {d.actividad}
                    </div>
                    {incluirDescriptivos && d.descripcion && (
                      <div className="text-xs text-slate-500 mt-0.5">
                        {d.descripcion}
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
