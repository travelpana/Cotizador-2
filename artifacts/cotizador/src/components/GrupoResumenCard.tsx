import type { Acomodacion, CotizacionResult } from "@/lib/types";
import { fmt } from "@/lib/calc";

const ROOM_PAX: Partial<Record<Acomodacion, number>> = { SGL: 1, DBL: 2, TPL: 3 };
const ROOM_ACOMS: Acomodacion[] = ["SGL", "DBL", "TPL"];

function roomPax(a: Acomodacion): number {
  return ROOM_PAX[a] ?? 1;
}

/** Total adult pax from room distribution (SGL/DBL/TPL only). */
export function calcAdultosPax(
  hab: Partial<Record<Acomodacion, number>>,
): number {
  return ROOM_ACOMS.reduce((s, a) => s + (hab[a] ?? 0) * roomPax(a), 0);
}

/** Total grupo cost: SGL/DBL/TPL rooms + ninos × CHD rate. */
export function calcGrupoTotal(
  acoms: Acomodacion[],
  hab: Partial<Record<Acomodacion, number>>,
  totales: Partial<Record<Acomodacion, number>>,
  ninos: number,
): number {
  const roomTotal = ROOM_ACOMS.filter((a) => acoms.includes(a)).reduce(
    (s, a) => s + (totales[a] ?? 0) * (hab[a] ?? 0) * roomPax(a),
    0,
  );
  const chdRate = totales["CHD" as Acomodacion] ?? 0;
  return roomTotal + ninos * chdRate;
}

interface Props {
  acomodaciones: Acomodacion[];
  result: CotizacionResult;
  habitaciones: Partial<Record<Acomodacion, number>>;
  onHabitacionesChange: (next: Partial<Record<Acomodacion, number>>) => void;
  ninos: number;
}

export default function GrupoResumenCard({
  acomodaciones,
  result,
  habitaciones,
  onHabitacionesChange,
  ninos,
}: Props) {
  const roomAcoms = acomodaciones.filter((a) => ROOM_ACOMS.includes(a));
  const adultosPax = calcAdultosPax(habitaciones);
  const totalPax = adultosPax + ninos;
  const chdRate = result.totalesPorAcomodacion["CHD" as Acomodacion] ?? 0;
  const totalGrupo = calcGrupoTotal(acomodaciones, habitaciones, result.totalesPorAcomodacion, ninos);

  const setHab = (a: Acomodacion, val: number) =>
    onHabitacionesChange({ ...habitaciones, [a]: Math.max(0, val) });

  const fmtUsd = (n: number) => `USD ${fmt(n)}`;

  const roomAcomsWithPrices = roomAcoms.filter(
    (a) => (result.totalesPorAcomodacion[a] ?? 0) > 0,
  );

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
          Distribución del Grupo
        </span>
      </div>

      <div className="bg-white divide-y divide-slate-100">
        {/* Room inputs — SGL/DBL/TPL only */}
        <div className="px-5 py-4 space-y-3">
          {roomAcoms.length === 0 && (
            <p className="text-[12px] text-slate-400 italic">
              Activa SGL, DBL o TPL en la barra de acomodaciones.
            </p>
          )}
          {roomAcoms.map((a) => {
            const count = habitaciones[a] ?? 0;
            const pax = count * roomPax(a);
            return (
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
                    {count > 0 && (
                      <span className="ml-1 text-slate-400">= {pax} pax</span>
                    )}
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => setHab(a, count - 1)}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-sm font-bold select-none"
                  >
                    −
                  </button>
                  <input
                    type="number"
                    min={0}
                    value={count}
                    onChange={(e) => setHab(a, parseInt(e.target.value) || 0)}
                    className="w-14 text-center text-sm font-bold border border-slate-200 rounded-lg py-1 focus:outline-none focus:ring-2 focus:ring-primary/30"
                    style={{ color: "#07152f" }}
                  />
                  <button
                    type="button"
                    onClick={() => setHab(a, count + 1)}
                    className="w-7 h-7 rounded-lg border border-slate-200 flex items-center justify-center text-slate-500 hover:border-primary/40 hover:text-primary hover:bg-primary/5 transition-all text-sm font-bold select-none"
                  >
                    +
                  </button>
                </div>
              </div>
            );
          })}

          {/* Niños (read-only, from passenger fields) */}
          {ninos > 0 && (
            <div className="flex items-center justify-between gap-3 pt-1 border-t border-slate-100">
              <div className="flex items-center gap-2">
                <span
                  className="text-xs font-bold px-2 py-0.5 rounded"
                  style={{ background: "#fef3c7", color: "#92400e" }}
                >
                  CHD
                </span>
                <span className="text-[12px] text-slate-500 font-medium">
                  niños (del formulario)
                </span>
              </div>
              <span className="text-sm font-bold" style={{ color: "#07152f" }}>
                {ninos}
              </span>
            </div>
          )}
        </div>

        {/* Total pasajeros */}
        <div className="px-5 py-3 flex items-center justify-between">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total pasajeros
          </span>
          <span
            className="text-base font-extrabold"
            style={{ color: "#0043BB" }}
          >
            {totalPax}
          </span>
        </div>

        {/* Precio por persona — SGL/DBL/TPL only */}
        {roomAcomsWithPrices.length > 0 && (
          <div className="px-5 py-3 space-y-1.5">
            <div className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2">
              Precio por persona
            </div>
            {roomAcomsWithPrices.map((a) => (
              <div key={a} className="flex items-center justify-between">
                <span className="text-[12px] text-slate-500 font-medium">
                  {a}
                </span>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: "#07152f" }}
                >
                  {fmtUsd(result.totalesPorAcomodacion[a] ?? 0)}
                </span>
              </div>
            ))}
            {/* CHD tarifa only if ninos > 0 */}
            {ninos > 0 && chdRate > 0 && (
              <div className="flex items-center justify-between pt-1 border-t border-slate-100">
                <span className="text-[12px] text-amber-700 font-medium">
                  Tarifa niño
                </span>
                <span
                  className="text-[13px] font-bold"
                  style={{ color: "#92400e" }}
                >
                  {fmtUsd(chdRate)}
                </span>
              </div>
            )}
          </div>
        )}

        {/* Total del grupo */}
        <div className="px-5 py-4 flex items-center justify-between bg-slate-50">
          <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">
            Total del grupo
          </span>
          <span className="text-xl font-extrabold" style={{ color: "#07152f" }}>
            {fmtUsd(totalGrupo)}
          </span>
        </div>
      </div>
    </div>
  );
}
