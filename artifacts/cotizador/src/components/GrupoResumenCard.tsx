import type { Acomodacion, CotizacionResult } from "@/lib/types";
import { fmt } from "@/lib/calc";

const ROOM_PAX: Partial<Record<Acomodacion, number>> = {
  SGL: 1,
  DBL: 2,
  TPL: 3,
  CHD: 1,
};

function roomPax(a: Acomodacion): number {
  return ROOM_PAX[a] ?? 1;
}

export function calcGrupoTotalPax(
  acoms: Acomodacion[],
  hab: Partial<Record<Acomodacion, number>>,
): number {
  return acoms.reduce((s, a) => s + (hab[a] ?? 0) * roomPax(a), 0);
}

export function calcGrupoTotal(
  acoms: Acomodacion[],
  hab: Partial<Record<Acomodacion, number>>,
  totales: Partial<Record<Acomodacion, number>>,
): number {
  return acoms.reduce(
    (s, a) => s + (totales[a] ?? 0) * (hab[a] ?? 0) * roomPax(a),
    0,
  );
}

interface Props {
  acomodaciones: Acomodacion[];
  result: CotizacionResult;
  habitaciones: Partial<Record<Acomodacion, number>>;
  onHabitacionesChange: (next: Partial<Record<Acomodacion, number>>) => void;
}

export default function GrupoResumenCard({
  acomodaciones,
  result,
  habitaciones,
  onHabitacionesChange,
}: Props) {
  const totalPax = calcGrupoTotalPax(acomodaciones, habitaciones);
  const totalGrupo = calcGrupoTotal(
    acomodaciones,
    habitaciones,
    result.totalesPorAcomodacion,
  );

  const setHab = (a: Acomodacion, val: number) =>
    onHabitacionesChange({ ...habitaciones, [a]: Math.max(0, val) });

  const fmtUsd = (n: number) => `USD ${fmt(n)}`;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md"
      style={{ border: "1px solid #d0daf0" }}
    >
      {/* Header */}
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{
          backgroundColor: "rgba(0,36,126,0.92)",
          borderBottom: "1px solid rgba(255,255,255,0.08)",
        }}
      >
        <div
          className="w-[3px] h-4 rounded-full flex-shrink-0"
          style={{ backgroundColor: "#eec774" }}
        />
        <span
          style={{
            color: "#ffffff",
            fontSize: 13,
            fontWeight: 700,
            letterSpacing: "0.12em",
            textTransform: "uppercase",
          }}
        >
          Configuración del Grupo
        </span>
      </div>

      <div className="bg-white divide-y divide-slate-100">
        {/* Room inputs */}
        <div className="px-5 py-4 space-y-3">
          {acomodaciones.map((a) => (
            <div key={a} className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: "#eef2f8", color: "#1E3A8A" }}
                >
                  {a}
                </span>
                <span className="text-[12px] text-slate-500 font-medium">
                  habitaciones
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setHab(a, (habitaciones[a] ?? 0) - 1)}
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-sm font-bold select-none"
                >
                  −
                </button>
                <input
                  type="number"
                  min={0}
                  value={habitaciones[a] ?? 0}
                  onChange={(e) =>
                    setHab(a, parseInt(e.target.value) || 0)
                  }
                  className="w-14 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                  style={{ color: "#07152f" }}
                />
                <button
                  type="button"
                  onClick={() => setHab(a, (habitaciones[a] ?? 0) + 1)}
                  className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-sm font-bold select-none"
                >
                  +
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Total pasajeros */}
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total pasajeros
          </span>
          <span className="text-base font-extrabold" style={{ color: "#0043BB" }}>
            {totalPax}
          </span>
        </div>

        {/* Precios por acomodación */}
        {acomodaciones.filter((a) => (result.totalesPorAcomodacion[a] ?? 0) > 0).length > 0 && (
          <div className="px-5 py-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Precio por persona
            </div>
            {acomodaciones
              .filter((a) => (result.totalesPorAcomodacion[a] ?? 0) > 0)
              .map((a) => (
                <div key={a} className="flex items-center justify-between">
                  <span className="text-[12px] text-slate-500 font-medium">{a}</span>
                  <span className="text-[13px] font-bold" style={{ color: "#07152f" }}>
                    {fmtUsd(result.totalesPorAcomodacion[a] ?? 0)}
                  </span>
                </div>
              ))}
          </div>
        )}

        {/* Total grupo */}
        <div className="px-5 py-4 flex items-center justify-between bg-slate-50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total del grupo
          </span>
          <span
            className="text-xl font-extrabold"
            style={{ color: "#07152f" }}
          >
            {fmtUsd(totalGrupo)}
          </span>
        </div>
      </div>
    </div>
  );
}
