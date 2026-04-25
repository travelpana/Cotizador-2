import Modal from "./Modal";
import type {
  Cliente,
  CotizacionResult,
  ServicioSeleccionado,
} from "@/lib/types";
import type { ModoCotizacion } from "./Guardadas";
import { fmt } from "@/lib/calc";
import { buildItinerario } from "./Itinerario";

interface Props {
  open: boolean;
  onClose: () => void;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  result: CotizacionResult;
  modo: ModoCotizacion;
  incluirItinerario: boolean;
  incluirDescriptivos: boolean;
}

export default function VistaPreviaModal({
  open,
  onClose,
  cliente,
  servicios,
  result,
  modo,
  incluirItinerario,
  incluirDescriptivos,
}: Props) {
  const itinerario = incluirItinerario
    ? buildItinerario(cliente, servicios)
    : [];

  const hoteles = result.servicios.filter((s) => s.tipo === "hotel");
  const traslados = result.servicios.filter((s) => s.tipo === "traslado");
  const tours = result.servicios.filter((s) => s.tipo === "tour");
  const acoms = result.acomodaciones;
  const primary = acoms[0];
  const isCalc = modo === "calculo";

  return (
    <Modal
      open={open}
      onClose={onClose}
      title="Vista previa de cotización"
      size="xl"
    >
      <div className="bg-white text-slate-900">
        <div className="px-10 py-8">
          {/* Header */}
          <div className="flex items-start justify-between border-b-2 border-blue-600 pb-5 mb-6">
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                Cotización <span className="text-blue-600">de Viaje</span>
              </h1>
              <div className="text-sm text-slate-500 mt-1">
                RGE Style Travel · {new Date().toLocaleDateString("es-ES")}
              </div>
              <div
                className={`inline-block mt-2 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded ${
                  isCalc
                    ? "bg-blue-50 text-blue-700"
                    : "bg-amber-50 text-amber-700"
                }`}
              >
                {isCalc ? "Modo: cálculo total" : "Modo: solo tarifas"}
              </div>
            </div>
            <div className="text-right text-sm">
              {cliente.nombre && (
                <div>
                  <span className="text-slate-500">Cliente: </span>
                  <strong className="text-slate-900">{cliente.nombre}</strong>
                </div>
              )}
              <div className="text-slate-600 mt-1">
                {cliente.pasajeros} pax
                {cliente.ninos ? ` + ${cliente.ninos} niños` : ""} ·{" "}
                {cliente.noches} noches
              </div>
              {cliente.fechaInicio && (
                <div className="text-slate-600">
                  {cliente.fechaInicio} → {cliente.fechaFin}
                </div>
              )}
            </div>
          </div>

          <div
            className={`grid grid-cols-1 ${isCalc ? "lg:grid-cols-[minmax(0,1fr)_280px]" : ""} gap-8`}
          >
            <div className="space-y-8 min-w-0">
              {/* Alojamiento */}
              {hoteles.length > 0 && (
                <section>
                  <DocHeading>Alojamiento</DocHeading>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-600 border-b-2 border-slate-300">
                          <th className="text-left py-2 pr-3 font-semibold">
                            Hotel
                          </th>
                          <th className="text-left py-2 px-2 font-semibold w-20">
                            Check-in
                          </th>
                          <th className="text-left py-2 px-2 font-semibold w-20">
                            Check-out
                          </th>
                          <th className="text-center py-2 px-2 font-semibold w-12">
                            Noches
                          </th>
                          {acoms.map((a) => (
                            <th
                              key={a}
                              className="text-right py-2 px-2 font-semibold w-24"
                            >
                              {a}
                              {!isCalc && (
                                <div className="text-[9px] font-normal text-slate-400 normal-case">
                                  /noche
                                </div>
                              )}
                            </th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {hoteles.map((s) => (
                          <tr
                            key={`${s.tipo}-${s.id}`}
                            className="border-b border-slate-100 align-top"
                          >
                            <td className="py-3 pr-3">
                              <div className="font-semibold text-slate-900">
                                {s.nombre}
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 leading-snug">
                                {[s.ubicacion, s.estrellas, s.vigencia]
                                  .filter(Boolean)
                                  .join(" · ")}
                              </div>
                              {s.notas && (
                                <div className="text-[11px] text-slate-500 italic mt-1">
                                  {s.notas}
                                </div>
                              )}
                            </td>
                            <td className="py-3 px-2 text-slate-700 text-xs">
                              {s.fechaInicio || "—"}
                            </td>
                            <td className="py-3 px-2 text-slate-700 text-xs">
                              {s.fechaFin || "—"}
                            </td>
                            <td className="py-3 px-2 text-center text-slate-700">
                              {s.noches ?? "—"}
                            </td>
                            {acoms.map((a) => (
                              <td
                                key={a}
                                className="py-3 px-2 text-right text-slate-900 font-semibold"
                              >
                                {isCalc
                                  ? fmt(s.totalesPorAcomodacion[a])
                                  : fmt(s.preciosPorAcomodacion[a])}
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </section>
              )}

              {/* Traslados */}
              {traslados.length > 0 && (
                <section className="pt-2 border-t border-slate-200">
                  <DocHeading>Traslados</DocHeading>
                  <ServicioAdicionalTabla
                    items={traslados}
                    isCalc={isCalc}
                    primary={primary}
                  />
                </section>
              )}

              {/* Tours */}
              {tours.length > 0 && (
                <section className="pt-2 border-t border-slate-200">
                  <DocHeading>Tours</DocHeading>
                  <ServicioAdicionalTabla
                    items={tours}
                    isCalc={isCalc}
                    primary={primary}
                  />
                </section>
              )}

              {/* Itinerario */}
              {itinerario.length > 0 && (
                <section className="pt-2 border-t border-slate-200">
                  <DocHeading>Itinerario</DocHeading>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="text-[10px] uppercase tracking-wider text-slate-600 border-b-2 border-slate-300">
                          <th className="text-left py-2 pr-3 font-semibold w-12">
                            Día
                          </th>
                          <th className="text-left py-2 px-2 font-semibold w-24">
                            Fecha
                          </th>
                          <th className="text-left py-2 px-2 font-semibold">
                            Actividad
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {itinerario.map((d) => (
                          <tr
                            key={d.dia}
                            className="border-b border-slate-100 align-top"
                          >
                            <td className="py-2.5 pr-3 font-bold text-blue-600">
                              {d.dia}
                            </td>
                            <td className="py-2.5 px-2 text-slate-600 text-xs">
                              {d.fecha || "—"}
                            </td>
                            <td className="py-2.5 px-2">
                              <div className="font-medium">{d.actividad}</div>
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
                </section>
              )}

              {!isCalc && (
                <div className="rounded-xl bg-amber-50 border border-amber-200 p-4 text-sm text-amber-900">
                  Esta cotización se presenta en modo <strong>solo tarifas</strong>:
                  los precios mostrados son unitarios (por noche / por persona) y
                  no incluyen el cálculo de totales.
                </div>
              )}
            </div>

            {/* Right summary card - only in calculo mode */}
            {isCalc && (
              <aside>
                <div className="rounded-2xl border-2 border-blue-100 bg-slate-50 p-5 sticky top-4">
                  <div className="text-[10px] uppercase tracking-wider font-bold text-blue-600 mb-3">
                    Resumen de costos
                  </div>
                  <div className="space-y-2 text-sm">
                    <SubtotalLine
                      label="Alojamiento"
                      value={result.subtotalesPorTipo.hotel[primary]}
                    />
                    <SubtotalLine
                      label="Traslados"
                      value={result.subtotalesPorTipo.traslado[primary]}
                    />
                    <SubtotalLine
                      label="Tours"
                      value={result.subtotalesPorTipo.tour[primary]}
                    />
                  </div>
                  <div className="border-t-2 border-blue-200 mt-4 pt-4 space-y-2">
                    {acoms.map((a) => (
                      <div
                        key={a}
                        className="flex items-baseline justify-between"
                      >
                        <span className="text-[11px] uppercase tracking-wide font-bold text-slate-500">
                          Total {a}
                        </span>
                        <span
                          className={`font-bold ${
                            a === primary
                              ? "text-2xl text-blue-600"
                              : "text-base text-slate-700"
                          }`}
                        >
                          {fmt(result.totalesPorAcomodacion[a])}
                        </span>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-[10px] text-slate-500 leading-snug">
                    Resumen calculado sobre {primary}. Las demás acomodaciones
                    se muestran como referencia.
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>

        <div className="px-6 py-3 border-t border-slate-200 bg-slate-50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-slate-900 text-white text-sm font-medium hover:bg-slate-800"
          >
            Cerrar
          </button>
        </div>
      </div>
    </Modal>
  );
}

function DocHeading({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-base font-bold text-blue-600 uppercase tracking-wider mb-3 pb-1.5 border-b-2 border-blue-100">
      {children}
    </h2>
  );
}

function ServicioAdicionalTabla({
  items,
  isCalc,
  primary,
}: {
  items: import("@/lib/types").ServicioCalculado[];
  isCalc: boolean;
  primary: import("@/lib/types").Acomodacion;
}) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-[10px] uppercase tracking-wider text-slate-600 border-b-2 border-slate-300">
            <th className="text-left py-2 pr-3 font-semibold">Descripción</th>
            <th className="text-left py-2 px-2 font-semibold w-28">Fecha</th>
            <th className="text-right py-2 px-2 font-semibold w-32">
              {isCalc ? "Total" : "Tarifa p/p"}
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((s) => (
            <tr
              key={`${s.tipo}-${s.id}`}
              className="border-b border-slate-100 align-top"
            >
              <td className="py-3 pr-3">
                <div className="font-semibold text-slate-900">{s.nombre}</div>
                {s.notas && (
                  <div className="text-[11px] text-slate-500 italic mt-0.5">
                    {s.notas}
                  </div>
                )}
              </td>
              <td className="py-3 px-2 text-slate-700 text-xs">
                {s.fecha || "—"}
              </td>
              <td className="py-3 px-2 text-right text-slate-900 font-semibold">
                {isCalc
                  ? fmt(s.totalesPorAcomodacion[primary])
                  : `${fmt(s.unitAplicado ?? 0)} p/p`}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function SubtotalLine({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-slate-700">{label}</span>
      <span className="font-semibold text-slate-900">{fmt(value)}</span>
    </div>
  );
}
