import { useMemo } from "react";
import {
  Eye,
  Pencil,
  Trash2,
  ListChecks,
  Calendar,
  Tag,
  Calculator,
} from "lucide-react";
import type { CotizacionGuardada } from "./Guardadas";
import { calcularLocal, fmt } from "@/lib/calc";

interface Props {
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onEdit: (g: CotizacionGuardada) => void;
  onDelete: (id: string) => void;
}

export default function Seguimiento({
  items,
  onView,
  onEdit,
  onDelete,
}: Props) {
  return (
    <div className="space-y-4">
      <header className="bg-white rounded-2xl shadow-md p-6 flex items-center justify-between">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
            <ListChecks className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">
              Seguimiento de cotizaciones
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {items.length === 0
                ? "Aún no hay cotizaciones guardadas"
                : `${items.length} cotización${items.length !== 1 ? "es" : ""} guardada${items.length !== 1 ? "s" : ""}`}
            </p>
          </div>
        </div>
      </header>

      {items.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-md p-12 text-center">
          <ListChecks className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <div className="text-sm text-slate-700 font-medium">
            No hay cotizaciones aún
          </div>
          <div className="text-xs text-slate-500 mt-1">
            Crea una cotización y guárdala desde el botón "Guardar" para verla aquí.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {items.map((g) => (
            <Row
              key={g.id}
              g={g}
              onView={() => onView(g)}
              onEdit={() => onEdit(g)}
              onDelete={() => onDelete(g.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function Row({
  g,
  onView,
  onEdit,
  onDelete,
}: {
  g: CotizacionGuardada;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const result = useMemo(
    () => calcularLocal(g.servicios, g.acomodaciones, g.cliente),
    [g],
  );
  const primary = g.acomodaciones[0];
  const total = result.totalesPorAcomodacion[primary];
  const fecha = new Date(g.fechaCreacion).toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return (
    <article className="bg-white rounded-2xl shadow-md p-5 flex flex-col gap-3 hover:shadow-lg transition-shadow">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="text-base font-semibold text-slate-900 truncate">
            {g.cliente.nombre || "(sin nombre)"}
          </div>
          <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
            <Calendar className="w-3 h-3" />
            {fecha}
            <span>·</span>
            <span>{g.cliente.pasajeros} pax</span>
            <span>·</span>
            <span>{g.servicios.length} servicios</span>
          </div>
        </div>
        <ModeBadge modo={g.modoCotizacion} />
      </div>

      {g.modoCotizacion === "calculo" ? (
        <div className="rounded-lg bg-slate-50 p-3">
          <div className="text-[10px] uppercase tracking-wider text-slate-500 font-semibold">
            Total {primary}
          </div>
          <div className="text-2xl font-bold text-blue-600 leading-tight">
            {fmt(total)}
          </div>
        </div>
      ) : (
        <div className="rounded-lg bg-slate-50 p-3 text-xs text-slate-500">
          Sin total · cotización en modo solo tarifas
        </div>
      )}

      <div className="flex items-center gap-2 mt-auto">
        <button
          onClick={onView}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-slate-900 text-white text-xs font-medium hover:bg-slate-800"
        >
          <Eye className="w-3.5 h-3.5" />
          Ver
        </button>
        <button
          onClick={onEdit}
          className="flex-1 inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-primary text-primary-foreground text-xs font-medium hover:opacity-90"
        >
          <Pencil className="w-3.5 h-3.5" />
          Editar
        </button>
        <button
          onClick={onDelete}
          className="p-2 rounded-lg text-red-600 hover:bg-red-50"
          title="Borrar"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </article>
  );
}

function ModeBadge({ modo }: { modo: "tarifas" | "calculo" }) {
  if (modo === "tarifas") {
    return (
      <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-amber-50 text-amber-700 border border-amber-200">
        <Tag className="w-3 h-3" />
        Tarifas
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-[10px] uppercase tracking-wider font-bold px-2 py-1 rounded-full bg-blue-50 text-blue-700 border border-blue-200">
      <Calculator className="w-3 h-3" />
      Cálculo
    </span>
  );
}
