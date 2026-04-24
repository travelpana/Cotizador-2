import type { Acomodacion, CotizacionResult } from "@/lib/types";
import { fmt } from "@/lib/calc";

interface Props {
  result: CotizacionResult;
  showTarifas: boolean;
  onToggle: () => void;
}

export default function Totales({ result, showTarifas, onToggle }: Props) {
  const { servicios, acomodaciones, totalesPorAcomodacion } = result;

  return (
    <div className="card-white p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold">
          {showTarifas ? "Tarifas por servicio" : "Resumen de totales"}
        </h2>
        <div className="flex items-center gap-1 text-xs bg-slate-100 rounded-md p-1">
          <button
            onClick={() => !showTarifas && onToggle()}
            className={`px-3 py-1.5 rounded ${showTarifas ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-600"}`}
          >
            Ver tarifas
          </button>
          <button
            onClick={() => showTarifas && onToggle()}
            className={`px-3 py-1.5 rounded ${!showTarifas ? "bg-white shadow-sm font-medium text-slate-900" : "text-slate-600"}`}
          >
            Ver total
          </button>
        </div>
      </div>

      {servicios.length === 0 ? (
        <div className="text-center py-12 text-slate-500 text-sm border border-dashed border-slate-300 rounded-md">
          Selecciona al menos un servicio y una acomodación para ver tarifas.
        </div>
      ) : showTarifas ? (
        <div className="space-y-4">
          {servicios.map((sv) => (
            <div
              key={`${sv.tipo}-${sv.id}`}
              className="border border-slate-200 rounded-lg p-4"
            >
              <div className="flex items-baseline justify-between mb-2">
                <div>
                  <div className="font-medium text-slate-900 text-sm">
                    {labelTipo(sv.tipo)}: {sv.nombre}
                  </div>
                  <div className="text-xs text-slate-500">{sv.detalle}</div>
                </div>
              </div>
              <div className="grid gap-1.5 text-sm">
                {acomodaciones.map((a) => (
                  <div
                    key={a}
                    className="flex justify-between items-center py-1.5 px-3 bg-slate-50 rounded"
                  >
                    <span className="font-medium text-slate-700">{a}:</span>
                    <span className="text-slate-900">
                      {sv.tipo === "hotel" ? (
                        <>
                          {fmt(sv.preciosPorAcomodacion[a])}
                          <span className="text-xs text-slate-500"> /pax/noche</span>
                          <span className="mx-2 text-slate-300">→</span>
                          <span className="font-semibold">
                            {fmt(sv.totalesPorAcomodacion[a])}
                          </span>
                        </>
                      ) : (
                        <>
                          {fmt(sv.preciosPorAcomodacion[a])}
                          <span className="text-xs text-slate-500"> /pax</span>
                          <span className="mx-2 text-slate-300">→</span>
                          <span className="font-semibold">
                            {fmt(sv.totalesPorAcomodacion[a])}
                          </span>
                        </>
                      )}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {acomodaciones.map((a) => (
            <div
              key={a}
              className="rounded-lg p-5 border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-transparent"
            >
              <div className="text-xs font-medium text-slate-500 uppercase tracking-wide">
                Total {a}
              </div>
              <div className="text-3xl font-bold text-slate-900 mt-1">
                {fmt(totalesPorAcomodacion[a as Acomodacion])}
              </div>
              <div className="text-xs text-slate-500 mt-1">
                {result.pasajeros} pax · {result.noches} noches
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function labelTipo(t: "hotel" | "tour" | "traslado") {
  if (t === "hotel") return "Hotel";
  if (t === "tour") return "Tour";
  return "Traslado";
}
