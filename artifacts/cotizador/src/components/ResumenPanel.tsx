import type { Cliente, CotizacionResult } from "@/lib/types";
import type { ModoCotizacion } from "./Guardadas";
import { fmt } from "@/lib/calc";
import { Calculator, Tag, Users, Moon, Info } from "lucide-react";

interface Props {
  result: CotizacionResult;
  cliente: Cliente;
  modo: ModoCotizacion;
  onModoChange: (m: ModoCotizacion) => void;
}

export default function ResumenPanel({
  result,
  cliente,
  modo,
  onModoChange,
}: Props) {
  const { servicios, acomodaciones, totalesPorAcomodacion, subtotalesPorTipo } =
    result;
  const primary = acomodaciones[0];

  return (
    <div className="bg-white rounded-2xl shadow-md overflow-hidden">
      <div className="p-5 border-b border-slate-100">
        <div className="flex items-center justify-between mb-3">
          <div>
            <h3 className="text-base font-semibold text-slate-900">Resumen</h3>
            <p className="text-xs text-slate-500">
              {modo === "tarifas"
                ? "Tarifas unitarias sin cálculo"
                : "Cálculo completo"}
            </p>
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
            onClick={() => onModoChange("tarifas")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md font-medium transition-colors ${
              modo === "tarifas"
                ? "bg-white shadow-sm text-slate-900"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            <Tag className="w-3.5 h-3.5" />
            Solo tarifas
          </button>
          <button
            onClick={() => onModoChange("calculo")}
            className={`flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-md font-medium transition-colors ${
              modo === "calculo"
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
        ) : modo === "tarifas" ? (
          <div className="space-y-3">
            <div className="flex items-start gap-2 p-3 rounded-lg bg-blue-50 border border-blue-100">
              <Info className="w-4 h-4 text-blue-600 flex-shrink-0 mt-0.5" />
              <div className="text-[12px] text-blue-900 leading-snug">
                Mostrando precios unitarios sin multiplicar por noches ni
                pasajeros. Cambia a <strong>Calcular total</strong> para ver
                subtotales y gran total.
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center">
              <Stat
                label="Hoteles"
                value={servicios.filter((s) => s.tipo === "hotel").length}
              />
              <Stat
                label="Traslados"
                value={servicios.filter((s) => s.tipo === "traslado").length}
              />
              <Stat
                label="Tours"
                value={servicios.filter((s) => s.tipo === "tour").length}
              />
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="space-y-1.5 text-sm">
              <Sub label="Alojamiento" value={subtotalesPorTipo.hotel[primary]} />
              <Sub label="Traslados" value={subtotalesPorTipo.traslado[primary]} />
              <Sub label="Tours" value={subtotalesPorTipo.tour[primary]} />
            </div>
            <div className="space-y-2 pt-3 border-t-2 border-slate-100">
              {acomodaciones.map((a) => (
                <div
                  key={a}
                  className={`rounded-xl p-4 ${
                    a === primary
                      ? "border-2 border-primary/15 bg-gradient-to-br from-primary/5 to-transparent"
                      : "bg-slate-50"
                  }`}
                >
                  <div className="flex items-baseline justify-between">
                    <span className="text-[11px] uppercase tracking-wider font-bold text-slate-500">
                      Total {a}
                    </span>
                    <span
                      className={`font-bold ${
                        a === primary
                          ? "text-2xl text-blue-600"
                          : "text-base text-slate-700"
                      }`}
                    >
                      {fmt(totalesPorAcomodacion[a])}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Sub({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-baseline justify-between">
      <span className="text-slate-700">{label}</span>
      <span className="font-semibold text-slate-900">{fmt(value)}</span>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-slate-50 p-2">
      <div className="text-lg font-bold text-slate-900">{value}</div>
      <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
        {label}
      </div>
    </div>
  );
}
