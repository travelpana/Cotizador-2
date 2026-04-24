import type { CotizacionResult, Cliente } from "@/lib/types";
import { fmt } from "@/lib/calc";
import { Calculator, Tag, Users, Moon } from "lucide-react";

interface Props {
  result: CotizacionResult;
  cliente: Cliente;
  mode: "tarifas" | "total";
  onModeChange: (m: "tarifas" | "total") => void;
}

export default function TotalesPanel({
  result,
  cliente,
  mode,
  onModeChange,
}: Props) {
  const { servicios, acomodaciones, totalesPorAcomodacion } = result;

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Resumen</h3>
            <p className="text-xs text-slate-500">Cálculo en tiempo real</p>
          </div>
          <Calculator className="w-5 h-5 text-primary" />
        </div>

        <div className="grid grid-cols-2 gap-2 text-xs text-slate-600">
          <div className="flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-slate-400" />
            {cliente.pasajeros} pax
            {cliente.ninos ? ` + ${cliente.ninos} niños` : ""}
          </div>
          <div className="flex items-center gap-1.5">
            <Moon className="w-3.5 h-3.5 text-slate-400" />
            {cliente.noches} noches
          </div>
        </div>
      </div>

      <div className="p-5">
        <div className="flex items-center gap-1 text-xs bg-slate-100 rounded-lg p-1 mb-4">
          <button
            onClick={() => onModeChange("tarifas")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md font-medium transition-colors ${
              mode === "tarifas"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Solo tarifas
          </button>
          <button
            onClick={() => onModeChange("total")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-1.5 rounded-md font-medium transition-colors ${
              mode === "total"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Calculator className="w-3.5 h-3.5" />
            Calcular total
          </button>
        </div>

        {servicios.length === 0 ? (
          <div className="text-center text-xs text-slate-500 py-6 border border-dashed border-slate-200 rounded-lg">
            Selecciona servicios para ver el resumen
          </div>
        ) : mode === "total" ? (
          <div className="space-y-2.5">
            {acomodaciones.map((a) => (
              <div
                key={a}
                className="rounded-xl border-2 border-primary/15 bg-gradient-to-br from-primary/5 to-transparent p-4"
              >
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase tracking-wider font-semibold text-slate-500">
                    Total {a}
                  </span>
                  <span className="text-2xl font-bold text-slate-900">
                    {fmt(totalesPorAcomodacion[a])}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500 mt-0.5">
                  Incluye {servicios.length} servicio
                  {servicios.length !== 1 ? "s" : ""}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-3 max-h-[420px] overflow-y-auto -mx-5 px-5">
            {servicios.map((sv) => (
              <div
                key={`${sv.tipo}-${sv.id}`}
                className="border-b border-slate-100 last:border-0 pb-3 last:pb-0"
              >
                <div className="text-xs font-semibold text-slate-900 leading-tight mb-1.5">
                  {sv.nombre}
                </div>
                <div className="text-[11px] text-slate-500 mb-2">{sv.detalle}</div>
                <div className="space-y-1">
                  {acomodaciones.map((a) => (
                    <div
                      key={a}
                      className="flex justify-between items-center text-xs px-2 py-1 bg-slate-50 rounded"
                    >
                      <span className="font-medium text-slate-600">{a}</span>
                      <span className="text-slate-900 font-semibold">
                        {fmt(sv.totalesPorAcomodacion[a])}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
