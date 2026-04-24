import Modal from "./Modal";
import type {
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
} from "@/lib/types";
import { fmt } from "@/lib/calc";
import { buildItinerario } from "./Itinerario";

interface Props {
  open: boolean;
  onClose: () => void;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
}

export default function VistaPreviaModal({
  open,
  onClose,
  cliente,
  servicios,
  result,
  incluirItinerario,
  incluirDescriptivos,
}: Props) {
  const itinerario = incluirItinerario
    ? buildItinerario(cliente, servicios)
    : [];

  return (
    <Modal open={open} onClose={onClose} title="Vista previa de cotización" size="xl">
      <div className="px-8 py-8 bg-white text-slate-900">
        <div className="border-b-2 border-primary pb-4 mb-6">
          <h1 className="text-2xl font-bold">
            Cotización <span className="text-primary">RGE Style Travel</span>
          </h1>
          <div className="text-sm text-slate-600 mt-2 flex flex-wrap gap-x-4 gap-y-1">
            {cliente.nombre && (
              <span>
                <span className="text-slate-500">Cliente:</span>{" "}
                <strong>{cliente.nombre}</strong>
              </span>
            )}
            {cliente.fechaInicio && (
              <span>
                <span className="text-slate-500">Fechas:</span>{" "}
                {cliente.fechaInicio} → {cliente.fechaFin}
              </span>
            )}
            <span>
              <span className="text-slate-500">Pasajeros:</span>{" "}
              {cliente.pasajeros}
              {cliente.ninos ? ` + ${cliente.ninos} niños` : ""}
            </span>
            <span>
              <span className="text-slate-500">Noches:</span> {cliente.noches}
            </span>
          </div>
        </div>

        <Heading>Servicios</Heading>
        {result.servicios.length === 0 ? (
          <p className="text-sm text-slate-500 italic mb-6">
            No hay servicios seleccionados.
          </p>
        ) : (
          <div className="overflow-x-auto mb-8">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                  <th className="text-left py-2 px-3 font-semibold">Servicio</th>
                  <th className="text-left py-2 px-3 font-semibold">Detalle</th>
                  {result.acomodaciones.map((a) => (
                    <th
                      key={a}
                      className="text-right py-2 px-3 font-semibold"
                    >
                      {a}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {result.servicios.map((s) => (
                  <tr
                    key={`${s.tipo}-${s.id}`}
                    className="border-b border-slate-200"
                  >
                    <td className="py-2.5 px-3 font-medium">{s.nombre}</td>
                    <td className="py-2.5 px-3 text-slate-600 text-xs">
                      {s.detalle}
                    </td>
                    {result.acomodaciones.map((a) => (
                      <td key={a} className="py-2.5 px-3 text-right">
                        {fmt(s.totalesPorAcomodacion[a])}
                      </td>
                    ))}
                  </tr>
                ))}
                <tr className="bg-slate-50 font-bold">
                  <td colSpan={2} className="py-3 px-3">
                    TOTAL
                  </td>
                  {result.acomodaciones.map((a) => (
                    <td key={a} className="py-3 px-3 text-right">
                      {fmt(result.totalesPorAcomodacion[a])}
                    </td>
                  ))}
                </tr>
              </tbody>
            </table>
          </div>
        )}

        <Heading>Totales por acomodación</Heading>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
          {result.acomodaciones.map((a) => (
            <div
              key={a}
              className="rounded-xl border-2 border-primary/30 p-4"
            >
              <div className="text-[11px] uppercase tracking-wide text-slate-500 font-semibold">
                {a}
              </div>
              <div className="text-xl font-bold text-slate-900 mt-1">
                {fmt(result.totalesPorAcomodacion[a])}
              </div>
            </div>
          ))}
        </div>

        {incluirItinerario && itinerario.length > 0 && (
          <>
            <Heading>Itinerario</Heading>
            <div className="overflow-x-auto mb-4">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-slate-100 text-[11px] uppercase tracking-wide text-slate-600">
                    <th className="text-left py-2 px-3 font-semibold w-16">
                      Día
                    </th>
                    <th className="text-left py-2 px-3 font-semibold w-28">
                      Fecha
                    </th>
                    <th className="text-left py-2 px-3 font-semibold">
                      Actividad
                    </th>
                    <th className="text-left py-2 px-3 font-semibold">Hotel</th>
                  </tr>
                </thead>
                <tbody>
                  {itinerario.map((d) => (
                    <tr key={d.dia} className="border-b border-slate-200">
                      <td className="py-2.5 px-3 font-bold text-primary">
                        {d.dia}
                      </td>
                      <td className="py-2.5 px-3 text-slate-600 text-xs">
                        {d.fecha || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <div className="font-medium">{d.actividad}</div>
                        {incluirDescriptivos && d.descripcion && (
                          <div className="text-xs text-slate-500 mt-0.5">
                            {d.descripcion}
                          </div>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700">{d.hotel}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
      <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex justify-end">
        <button
          onClick={onClose}
          className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
        >
          Cerrar
        </button>
      </div>
    </Modal>
  );
}

function Heading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-slate-900 border-b-2 border-primary pb-1.5 mb-3">
      {children}
    </h2>
  );
}
