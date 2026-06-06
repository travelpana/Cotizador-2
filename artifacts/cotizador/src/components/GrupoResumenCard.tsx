import type { Acomodacion, CotizacionResult } from "@/lib/types";
import type { Cliente } from "@/lib/types";
import { fmt } from "@/lib/calc";

interface Props {
  cliente: Cliente;
  acomodaciones: Acomodacion[];
  result: CotizacionResult;
}

function calcHabitaciones(totalPax: number, acom: Acomodacion): number {
  if (acom === "SGL") return totalPax;
  if (acom === "DBL") return Math.ceil(totalPax / 2);
  if (acom === "TPL") return Math.ceil(totalPax / 3);
  return totalPax;
}

export default function GrupoResumenCard({ cliente, acomodaciones, result }: Props) {
  const adultos = cliente.pasajeros ?? 0;
  const ninos = cliente.ninos ?? 0;
  const totalPasajeros = adultos + ninos;
  const acomBase: Acomodacion = acomodaciones[0] ?? "DBL";
  const habitaciones = calcHabitaciones(totalPasajeros, acomBase);
  const totalGrupo = result.totalesPorAcomodacion[acomBase] ?? 0;
  const precioPorPersona = totalPasajeros > 0 ? Math.round(totalGrupo / totalPasajeros) : 0;

  const fmtUsd = (n: number) => `USD ${fmt(n)}`;

  return (
    <div
      className="rounded-2xl overflow-hidden shadow-md"
      style={{ border: "1px solid #d0daf0" }}
    >
      <div
        className="px-5 py-3 flex items-center gap-2"
        style={{ backgroundColor: "rgba(0,36,126,0.92)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}
      >
        <div className="w-[3px] h-4 rounded-full flex-shrink-0" style={{ backgroundColor: "#eec774" }} />
        <span style={{ color: "#ffffff", fontSize: 13, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase" }}>
          Resumen del Grupo
        </span>
      </div>

      <div className="bg-white px-5 py-4">
        <div className="grid grid-cols-2 gap-x-6 gap-y-2 mb-4">
          <Row label="Adultos" value={String(adultos)} />
          <Row label="Niños" value={String(ninos)} />
          <Row label="Total pasajeros" value={String(totalPasajeros)} highlight />
          <Row label="Habitaciones" value={String(habitaciones)} />
          <div className="col-span-2">
            <Row label="Acomodación base" value={acomBase} />
          </div>
        </div>

        <div className="border-t border-slate-100 pt-3 space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Total grupo</span>
            <span
              className="text-lg font-extrabold"
              style={{ color: "#07152f" }}
            >
              {fmtUsd(totalGrupo)}
            </span>
          </div>
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Precio por persona</span>
            <span
              className="text-base font-bold"
              style={{ color: "#1495ff" }}
            >
              {fmtUsd(precioPorPersona)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div className="flex items-center justify-between gap-2">
      <span className="text-[12px] text-slate-500 font-medium">{label}</span>
      <span
        className="text-[13px] font-bold"
        style={{ color: highlight ? "#0043BB" : "#07152f" }}
      >
        {value}
      </span>
    </div>
  );
}
