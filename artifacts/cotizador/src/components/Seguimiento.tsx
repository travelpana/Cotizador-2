import { useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Eye,
  Mail,
  Search,
  ListChecks,
  ChevronDown,
} from "lucide-react";
import type { CotizacionGuardada, EstadoCotizacion } from "./Guardadas";
import { calcularLocal, fmt } from "@/lib/calc";

interface Props {
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onEdit: (g: CotizacionGuardada) => void;
  onDelete: (id: string) => void;
  onUpdateEstado?: (id: string, estado: EstadoCotizacion) => void;
}

type EstadoFilter = "todos" | EstadoCotizacion;

const ESTADO_OPTIONS: { value: EstadoCotizacion; label: string }[] = [
  { value: "pendiente", label: "Pendiente" },
  { value: "enviado", label: "Enviado" },
  { value: "confirmado", label: "Confirmado" },
  { value: "cancelado", label: "Cancelado" },
];

const ESTADO_STYLES: Record<
  EstadoCotizacion,
  { bg: string; text: string; ring: string; dot: string }
> = {
  pendiente: {
    bg: "bg-slate-100",
    text: "text-slate-700",
    ring: "ring-slate-200",
    dot: "bg-slate-400",
  },
  enviado: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
  },
  confirmado: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
  },
  cancelado: {
    bg: "bg-red-50",
    text: "text-red-700",
    ring: "ring-red-200",
    dot: "bg-red-500",
  },
};

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    year: "2-digit",
  });
}

export default function Seguimiento({
  items,
  onView,
  onEdit,
  onDelete,
  onUpdateEstado,
}: Props) {
  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoFilter>("todos");

  const numeroPorId = useMemo(() => {
    const sorted = [...items].sort((a, b) =>
      a.fechaCreacion.localeCompare(b.fechaCreacion),
    );
    const map = new Map<string, string>();
    sorted.forEach((g, i) => {
      map.set(g.id, `COT-${String(i + 1).padStart(3, "0")}`);
    });
    return map;
  }, [items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((g) => {
      const estado: EstadoCotizacion = g.estado ?? "pendiente";
      if (estadoFilter !== "todos" && estado !== estadoFilter) return false;
      if (!q) return true;
      const numero = numeroPorId.get(g.id) ?? "";
      const haystack = [g.cliente.nombre, g.cliente.correo, numero]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, estadoFilter, numeroPorId]);

  return (
    <div className="space-y-4">
      <header className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 p-5">
        <div className="flex items-start justify-between gap-3 mb-4">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center">
              <ListChecks className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-slate-900 leading-tight">
                Control de cotizaciones
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {items.length === 0
                  ? "Aún no hay cotizaciones guardadas"
                  : `${items.length} cotización${items.length !== 1 ? "es" : ""} · ${filtered.length} visible${filtered.length !== 1 ? "s" : ""}`}
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cotización..."
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
            />
          </div>
          <div className="relative md:w-56">
            <select
              value={estadoFilter}
              onChange={(e) =>
                setEstadoFilter(e.target.value as EstadoFilter)
              }
              className="appearance-none w-full h-10 pl-3 pr-9 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
            >
              <option value="todos">Todos los estados</option>
              {ESTADO_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
          </div>
        </div>
      </header>

      <div className="bg-white rounded-2xl shadow-sm ring-1 ring-slate-100 overflow-hidden">
        {items.length === 0 ? (
          <div className="p-12 text-center">
            <ListChecks className="w-10 h-10 mx-auto text-slate-300 mb-3" />
            <div className="text-sm text-slate-700 font-medium">
              No hay cotizaciones aún
            </div>
            <div className="text-xs text-slate-500 mt-1">
              Crea una cotización y guárdala desde el botón "Guardar" para
              verla aquí.
            </div>
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-sm text-slate-500">
            No se encontraron cotizaciones con esos filtros.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-slate-900 text-slate-200">
                  <Th className="pl-5">N°</Th>
                  <Th>Cliente</Th>
                  <Th>Llegada</Th>
                  <Th>Salida</Th>
                  <Th align="right">Pax</Th>
                  <Th align="right">Total</Th>
                  <Th>Estado</Th>
                  <Th align="right" className="pr-5">
                    Acciones
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g) => (
                  <Row
                    key={g.id}
                    g={g}
                    numero={numeroPorId.get(g.id) ?? "—"}
                    onView={() => onView(g)}
                    onEdit={() => onEdit(g)}
                    onDelete={() => onDelete(g.id)}
                    onUpdateEstado={onUpdateEstado}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function Th({
  children,
  align = "left",
  className = "",
}: {
  children: React.ReactNode;
  align?: "left" | "right";
  className?: string;
}) {
  return (
    <th
      className={`px-3 py-3 text-[10px] font-bold uppercase tracking-[0.12em] ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
  );
}

function Row({
  g,
  numero,
  onView,
  onEdit,
  onDelete,
  onUpdateEstado,
}: {
  g: CotizacionGuardada;
  numero: string;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onUpdateEstado?: (id: string, estado: EstadoCotizacion) => void;
}) {
  const result = useMemo(
    () => calcularLocal(g.servicios, g.acomodaciones, g.cliente),
    [g],
  );
  const primary = g.acomodaciones[0] ?? "DBL";
  const total = result.totalesPorAcomodacion[primary] ?? 0;
  const estado: EstadoCotizacion = g.estado ?? "pendiente";
  const showTotal = g.modoCotizacion === "calculo";
  const correo = g.cliente.whatsapp?.trim();

  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      <td className="pl-5 pr-3 py-3 text-xs font-bold text-slate-500 tabular-nums whitespace-nowrap">
        {numero}
      </td>
      <td className="px-3 py-3">
        <button
          onClick={onView}
          className="text-left group min-w-0"
          title="Ver cotización"
        >
          <div className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors truncate max-w-[220px]">
            {g.cliente.nombre || "(sin nombre)"}
          </div>
          {g.cliente.correo && (
            <div className="text-[11px] text-slate-500 truncate max-w-[220px]">
              {g.cliente.correo}
            </div>
          )}
        </button>
      </td>
      <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
        {formatDate(g.cliente.fechaInicio)}
      </td>
      <td className="px-3 py-3 text-sm text-slate-700 whitespace-nowrap">
        {formatDate(g.cliente.fechaFin)}
      </td>
      <td className="px-3 py-3 text-sm text-slate-700 text-right tabular-nums whitespace-nowrap">
        {g.cliente.pasajeros}
        {g.cliente.ninos > 0 && (
          <span className="text-slate-400">
            {" "}
            +{g.cliente.ninos}
          </span>
        )}
      </td>
      <td className="px-3 py-3 text-sm font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
        {showTotal ? (
          fmt(total)
        ) : (
          <span className="text-slate-400 font-normal">—</span>
        )}
      </td>
      <td className="px-3 py-3 whitespace-nowrap">
        <EstadoBadge
          estado={estado}
          editable={!!onUpdateEstado}
          onChange={(e) => onUpdateEstado?.(g.id, e)}
        />
      </td>
      <td className="pl-3 pr-5 py-3">
        <div className="flex items-center justify-end gap-1">
          <IconBtn onClick={onView} label="Ver" tone="slate">
            <Eye className="w-4 h-4" />
          </IconBtn>
          <IconBtn onClick={onEdit} label="Editar" tone="primary">
            <Pencil className="w-4 h-4" />
          </IconBtn>
          {correo ? (
            <a
              href={`mailto:${correo}?subject=${encodeURIComponent(
                `Cotización ${numero} - ${g.cliente.nombre || ""}`.trim(),
              )}`}
              title="Enviar correo"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-emerald-600 hover:bg-emerald-50 transition-colors"
            >
              <Mail className="w-4 h-4" />
            </a>
          ) : (
            <span
              title="Sin correo registrado"
              className="inline-flex items-center justify-center w-8 h-8 rounded-lg text-slate-300 cursor-not-allowed"
            >
              <Mail className="w-4 h-4" />
            </span>
          )}
          <IconBtn onClick={onDelete} label="Eliminar" tone="red">
            <Trash2 className="w-4 h-4" />
          </IconBtn>
        </div>
      </td>
    </tr>
  );
}

function IconBtn({
  onClick,
  label,
  tone,
  children,
}: {
  onClick: () => void;
  label: string;
  tone: "slate" | "primary" | "red";
  children: React.ReactNode;
}) {
  const cls =
    tone === "red"
      ? "text-red-600 hover:bg-red-50"
      : tone === "primary"
        ? "text-primary hover:bg-primary/10"
        : "text-slate-500 hover:bg-slate-100";
  return (
    <button
      type="button"
      onClick={onClick}
      title={label}
      aria-label={label}
      className={`inline-flex items-center justify-center w-8 h-8 rounded-lg transition-colors ${cls}`}
    >
      {children}
    </button>
  );
}

function EstadoBadge({
  estado,
  editable,
  onChange,
}: {
  estado: EstadoCotizacion;
  editable: boolean;
  onChange: (e: EstadoCotizacion) => void;
}) {
  const s = ESTADO_STYLES[estado];
  const label =
    ESTADO_OPTIONS.find((o) => o.value === estado)?.label ?? estado;

  if (!editable) {
    return (
      <span
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {label}
      </span>
    );
  }

  return (
    <div className="relative inline-block">
      <span
        className={`inline-flex items-center gap-1.5 pl-2.5 pr-7 py-1 rounded-full text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
      >
        <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
        {label}
        <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 opacity-70" />
      </span>
      <select
        value={estado}
        onChange={(e) => onChange(e.target.value as EstadoCotizacion)}
        aria-label="Cambiar estado"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {ESTADO_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}
