import type { Cliente, ServicioSeleccionado } from "@/lib/types";
import { addDays } from "@/lib/calc";

interface Props {
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  hotelPrincipal?: string;
  incluirDescriptivos: boolean;
  onToggleDescriptivos: () => void;
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
      actividad = `Llegada · ${traslados[0]?.nombre || "Traslado al hotel"}`;
      descripcion = traslados[0]?.nombre || "";
    } else if (i === dias - 1) {
      actividad = `Salida · ${
        traslados[traslados.length - 1]?.nombre || "Traslado al aeropuerto"
      }`;
      descripcion = traslados[traslados.length - 1]?.nombre || "";
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
  onToggleDescriptivos,
}: Props) {
  const itinerario = buildItinerario(cliente, servicios);

  return (
    <div className="card-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">Itinerario</h2>
        <label className="flex items-center gap-2 text-xs text-slate-600 cursor-pointer">
          <input
            type="checkbox"
            checked={incluirDescriptivos}
            onChange={onToggleDescriptivos}
            className="w-4 h-4 rounded border-slate-300 text-primary focus:ring-primary"
          />
          Incluir descriptivos
        </label>
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
                <th className="text-left py-2 px-2">Hotel</th>
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
                  <td className="py-3 px-2 text-slate-700">{d.hotel}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
