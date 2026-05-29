import { useMemo, useState } from "react";
import {
  Pencil,
  Trash2,
  Eye,
  Mail,
  Search,
  ListChecks,
  ChevronDown,
  Copy,
  FileDown,
  Bell,
  AlertTriangle,
  CheckCircle2,
  Clock,
  TrendingUp,
  XCircle,
  Filter,
  MessageSquare,
  History,
  X,
  Save,
  CalendarDays,
  Star,
  Flame,
  Minus,
} from "lucide-react";
import type {
  CotizacionGuardada,
  EstadoCRM,
  Prioridad,
  ActividadEntry,
  ActividadTipo,
} from "./Guardadas";
import { calcularLocal, fmt } from "@/lib/calc";
import { exportarCotizacionesExcel } from "@/lib/exportExcel";
import { AGENTES } from "@/lib/types";

interface Props {
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onEdit: (g: CotizacionGuardada) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

type AlertLevel = "urgente" | "pendiente" | "aldia" | "sinenviar" | "none";

// ─── Estado CRM config ────────────────────────────────────────────────────────

const ESTADO_CRM_OPTIONS: { value: EstadoCRM; label: string }[] = [
  { value: "nueva", label: "Nueva" },
  { value: "enviada", label: "Enviada" },
  { value: "seguimiento", label: "Seguimiento" },
  { value: "negociacion", label: "Negociación" },
  { value: "confirmada", label: "Confirmada" },
  { value: "perdida", label: "Perdida" },
];

const ESTADO_CRM_STYLES: Record<
  EstadoCRM,
  { bg: string; text: string; ring: string; dot: string }
> = {
  nueva: {
    bg: "bg-blue-50",
    text: "text-blue-700",
    ring: "ring-blue-200",
    dot: "bg-blue-500",
  },
  enviada: {
    bg: "bg-sky-50",
    text: "text-sky-700",
    ring: "ring-sky-200",
    dot: "bg-sky-500",
  },
  seguimiento: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    ring: "ring-amber-200",
    dot: "bg-amber-500",
  },
  negociacion: {
    bg: "bg-orange-50",
    text: "text-orange-700",
    ring: "ring-orange-200",
    dot: "bg-orange-500",
  },
  confirmada: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    ring: "ring-emerald-200",
    dot: "bg-emerald-500",
  },
  perdida: {
    bg: "bg-slate-100",
    text: "text-slate-500",
    ring: "ring-slate-200",
    dot: "bg-slate-400",
  },
};

const PRIORIDAD_OPTIONS: { value: Prioridad; label: string }[] = [
  { value: "alta", label: "Alta" },
  { value: "media", label: "Media" },
  { value: "baja", label: "Baja" },
];

const PRIORIDAD_STYLES: Record<
  Prioridad,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  alta: {
    bg: "bg-red-50 text-red-700 ring-1 ring-red-200",
    text: "text-red-700",
    icon: <Flame className="w-3 h-3" />,
  },
  media: {
    bg: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    text: "text-amber-700",
    icon: <Star className="w-3 h-3" />,
  },
  baja: {
    bg: "bg-slate-100 text-slate-500 ring-1 ring-slate-200",
    text: "text-slate-500",
    icon: <Minus className="w-3 h-3" />,
  },
};

const ACTIVIDAD_LABELS: Record<ActividadTipo, string> = {
  creada: "Cotización creada",
  editada: "Cotización editada",
  pdf_enviado: "PDF enviado",
  whatsapp_enviado: "WhatsApp enviado",
  correo_enviado: "Correo enviado",
  duplicada: "Cotización duplicada",
  confirmada: "Cotización confirmada",
  nota_agregada: "Nota interna agregada",
  estado_cambiado: "Estado actualizado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

function getAlertLevel(g: CotizacionGuardada): AlertLevel {
  const estado = g.estadoCRM ?? "nueva";
  if (estado === "confirmada" || estado === "perdida") return "none";
  if (estado === "nueva") return "sinenviar";
  const days = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
  if (days >= 3) return "urgente";
  if (days >= 2) return "pendiente";
  return "aldia";
}

function isRecordatorioHoy(g: CotizacionGuardada): boolean {
  if (!g.fechaRecordatorio) return false;
  const rec = new Date(g.fechaRecordatorio);
  const today = new Date();
  return (
    rec.getFullYear() === today.getFullYear() &&
    rec.getMonth() === today.getMonth() &&
    rec.getDate() === today.getDate()
  );
}

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  icon,
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 leading-tight tabular-nums">
          {value}
        </div>
        <div className="text-xs font-medium text-slate-600 leading-tight mt-0.5">
          {label}
        </div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── Pendientes Hoy Widget ────────────────────────────────────────────────────

function PendientesHoyWidget({
  items,
  onView,
}: {
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
}) {
  const pendientes = items.filter(
    (g) => isRecordatorioHoy(g) || getAlertLevel(g) === "urgente",
  );
  if (pendientes.length === 0) return null;

  return (
    <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <Bell className="w-4 h-4 text-amber-600" />
        <span className="text-sm font-semibold text-amber-800">
          Seguimientos pendientes hoy · {pendientes.length}
        </span>
      </div>
      <div className="space-y-2">
        {pendientes.slice(0, 5).map((g) => {
          const days = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
          return (
            <button
              key={g.id}
              type="button"
              onClick={() => onView(g)}
              className="w-full flex items-center justify-between gap-3 bg-white rounded-xl px-3 py-2 text-left hover:bg-amber-50 transition-colors ring-1 ring-amber-100"
            >
              <div className="min-w-0">
                <div className="text-sm font-semibold text-slate-900 truncate">
                  {g.cliente.nombre || "(sin nombre)"}
                </div>
                {g.proximaAccion && (
                  <div className="text-xs text-slate-500 truncate">
                    {g.proximaAccion}
                  </div>
                )}
              </div>
              <div className="text-[11px] font-medium text-red-600 whitespace-nowrap">
                Hace {days}d sin respuesta
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── CRM Modal ────────────────────────────────────────────────────────────────

function CrmModal({
  g,
  onClose,
  onSave,
}: {
  g: CotizacionGuardada;
  onClose: () => void;
  onSave: (patch: Partial<CotizacionGuardada>) => void;
}) {
  const [estadoCRM, setEstadoCRM] = useState<EstadoCRM>(g.estadoCRM ?? "nueva");
  const [prioridad, setPrioridad] = useState<Prioridad>(g.prioridad ?? "media");
  const [proximaAccion, setProximaAccion] = useState(g.proximaAccion ?? "");
  const [fechaRecordatorio, setFechaRecordatorio] = useState(
    g.fechaRecordatorio ? g.fechaRecordatorio.slice(0, 10) : "",
  );
  const [notaInterna, setNotaInterna] = useState(g.notaInterna ?? "");
  const [tab, setTab] = useState<"crm" | "historial">("crm");

  const handleSave = () => {
    const patch: Partial<CotizacionGuardada> = {
      estadoCRM,
      prioridad,
      proximaAccion: proximaAccion.trim() || undefined,
      fechaRecordatorio: fechaRecordatorio || undefined,
      notaInterna: notaInterna.trim() || undefined,
      ultimoSeguimiento: new Date().toISOString(),
    };
    const newEntry = {
      fecha: new Date().toISOString(),
      tipo: "estado_cambiado" as ActividadTipo,
      detalle: `Estado → ${ESTADO_CRM_OPTIONS.find((o) => o.value === estadoCRM)?.label ?? estadoCRM}${notaInterna.trim() ? ` · Nota: ${notaInterna.trim().slice(0, 60)}` : ""}`,
    };
    patch.historial = [newEntry, ...(g.historial ?? [])].slice(0, 50);
    onSave(patch);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <div className="font-semibold text-slate-900">
              {g.cliente.nombre || "(sin nombre)"}
            </div>
            <div className="text-xs text-slate-500 mt-0.5">
              {g.numeroCotizacion} · {g.cliente.agente}
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tabs */}
        <div className="flex border-b border-slate-100 px-5">
          <button
            type="button"
            onClick={() => setTab("crm")}
            className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${tab === "crm" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            CRM
          </button>
          <button
            type="button"
            onClick={() => setTab("historial")}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${tab === "historial" ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}
          >
            Historial {g.historial && g.historial.length > 0 ? `(${g.historial.length})` : ""}
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === "crm" ? (
            <div className="p-5 space-y-4">
              {/* Estado */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Estado comercial
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {ESTADO_CRM_OPTIONS.map((o) => {
                    const s = ESTADO_CRM_STYLES[o.value];
                    const active = estadoCRM === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setEstadoCRM(o.value)}
                        className={`flex items-center gap-1.5 px-2.5 py-2 rounded-xl text-xs font-semibold transition-all ring-1 ${
                          active
                            ? `${s.bg} ${s.text} ${s.ring} shadow-sm`
                            : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        <span className={`w-2 h-2 rounded-full shrink-0 ${active ? s.dot : "bg-slate-300"}`} />
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Prioridad */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Prioridad
                </label>
                <div className="flex gap-2">
                  {PRIORIDAD_OPTIONS.map((o) => {
                    const s = PRIORIDAD_STYLES[o.value];
                    const active = prioridad === o.value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => setPrioridad(o.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1 ${
                          active ? s.bg : "bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Próxima acción */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Próxima acción
                </label>
                <input
                  type="text"
                  value={proximaAccion}
                  onChange={(e) => setProximaAccion(e.target.value)}
                  placeholder="Ej: Llamar mañana, Esperando aprobación…"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                />
              </div>

              {/* Fecha recordatorio */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Fecha recordatorio
                </label>
                <input
                  type="date"
                  value={fechaRecordatorio}
                  onChange={(e) => setFechaRecordatorio(e.target.value)}
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                />
              </div>

              {/* Nota interna */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Nota interna (no aparece en PDF/WhatsApp/email)
                </label>
                <textarea
                  value={notaInterna}
                  onChange={(e) => setNotaInterna(e.target.value)}
                  placeholder="Ej: Cliente quiere hotel 4*, pendiente de pago, prefiere salida en la tarde…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-5">
              {(!g.historial || g.historial.length === 0) ? (
                <div className="text-center py-8 text-slate-400 text-sm">
                  No hay actividad registrada aún
                </div>
              ) : (
                <div className="relative">
                  <div className="absolute left-3.5 top-0 bottom-0 w-px bg-slate-100" />
                  <div className="space-y-4">
                    {g.historial.map((entry, i) => (
                      <div key={i} className="flex gap-4 relative">
                        <div className="w-7 h-7 rounded-full bg-white ring-2 ring-slate-200 flex items-center justify-center shrink-0 z-10">
                          <ActivityIcon tipo={entry.tipo} />
                        </div>
                        <div className="flex-1 min-w-0 pb-1">
                          <div className="text-sm font-medium text-slate-800">
                            {ACTIVIDAD_LABELS[entry.tipo] ?? entry.tipo}
                          </div>
                          {entry.detalle && (
                            <div className="text-xs text-slate-500 mt-0.5 leading-snug">
                              {entry.detalle}
                            </div>
                          )}
                          <div className="text-[11px] text-slate-400 mt-1">
                            {formatDateTime(entry.fecha)}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {tab === "crm" && (
          <div className="flex justify-end gap-2 p-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors"
            >
              <Save className="w-3.5 h-3.5" />
              Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityIcon({ tipo }: { tipo: ActividadTipo }) {
  const cls = "w-3 h-3";
  if (tipo === "creada") return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (tipo === "confirmada") return <CheckCircle2 className={`${cls} text-emerald-600`} />;
  if (tipo === "pdf_enviado") return <FileDown className={`${cls} text-blue-500`} />;
  if (tipo === "whatsapp_enviado") return <MessageSquare className={`${cls} text-green-500`} />;
  if (tipo === "correo_enviado") return <Mail className={`${cls} text-sky-500`} />;
  if (tipo === "duplicada") return <Copy className={`${cls} text-amber-500`} />;
  if (tipo === "editada") return <Pencil className={`${cls} text-slate-500`} />;
  if (tipo === "nota_agregada") return <MessageSquare className={`${cls} text-violet-500`} />;
  return <History className={`${cls} text-slate-400`} />;
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Seguimiento({
  items,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onUpdateCRM,
}: Props) {
  const [query, setQuery] = useState("");
  const [estadoFilter, setEstadoFilter] = useState<EstadoCRM | "todos">("todos");
  const [agenteFilter, setAgenteFilter] = useState("todos");
  const [prioridadFilter, setPrioridadFilter] = useState<Prioridad | "todos">("todos");
  const [showFilters, setShowFilters] = useState(false);
  const [crmModal, setCrmModal] = useState<CotizacionGuardada | null>(null);

  // ─── KPI calculations ───────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const activas = items.filter(
      (g) => g.estadoCRM !== "confirmada" && g.estadoCRM !== "perdida",
    ).length;
    const seguimientosPendientes = items.filter((g) => {
      const al = getAlertLevel(g);
      return al === "urgente" || al === "pendiente";
    }).length;
    const urgentes = items.filter((g) => getAlertLevel(g) === "urgente").length;
    const recordatoriosHoy = items.filter(isRecordatorioHoy).length;
    const confirmadas = items.filter((g) => g.estadoCRM === "confirmada").length;
    const perdidas = items.filter((g) => g.estadoCRM === "perdida").length;
    const now = new Date();
    const ventasMes = items.filter((g) => {
      if (g.estadoCRM !== "confirmada") return false;
      const d = new Date(g.ultimoSeguimiento ?? g.fechaCreacion);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { activas, seguimientosPendientes, urgentes, recordatoriosHoy, confirmadas, perdidas, ventasMes };
  }, [items]);

  // ─── Filtered items ─────────────────────────────────────────────────────────

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((g) => {
      const estado = g.estadoCRM ?? "nueva";
      if (estadoFilter !== "todos" && estado !== estadoFilter) return false;
      if (agenteFilter !== "todos" && g.cliente.agente !== agenteFilter) return false;
      if (prioridadFilter !== "todos" && (g.prioridad ?? "media") !== prioridadFilter) return false;
      if (!q) return true;
      const haystack = [
        g.cliente.nombre,
        g.cliente.correo,
        g.numeroCotizacion,
        g.cliente.agente,
        g.proximaAccion,
        g.notaInterna,
      ]
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [items, query, estadoFilter, agenteFilter, prioridadFilter]);

  const activeFilterCount =
    (estadoFilter !== "todos" ? 1 : 0) +
    (agenteFilter !== "todos" ? 1 : 0) +
    (prioridadFilter !== "todos" ? 1 : 0);

  return (
    <div className="space-y-4">
      {/* Notification Center */}
      {(kpi.urgentes > 0 || kpi.recordatoriosHoy > 0) && (
        <div className="flex items-start gap-3 bg-gradient-to-r from-amber-50 to-orange-50 border border-amber-200 rounded-2xl px-4 py-3 shadow-sm">
          <div className="relative w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-amber-600" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
              {kpi.urgentes + kpi.recordatoriosHoy}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-amber-900 mb-1">Centro de notificaciones</div>
            <div className="flex flex-col gap-0.5">
              {kpi.urgentes > 0 && (
                <span className="text-xs text-red-700 font-medium">
                  🔴 {kpi.urgentes} {kpi.urgentes === 1 ? "cotización requiere" : "cotizaciones requieren"} seguimiento urgente
                </span>
              )}
              {kpi.seguimientosPendientes > kpi.urgentes && (
                <span className="text-xs text-amber-800 font-medium">
                  🟡 {kpi.seguimientosPendientes - kpi.urgentes} {(kpi.seguimientosPendientes - kpi.urgentes) === 1 ? "cotización pendiente" : "cotizaciones pendientes"} de seguimiento
                </span>
              )}
              {kpi.recordatoriosHoy > 0 && (
                <span className="text-xs text-violet-700 font-medium">
                  🔔 {kpi.recordatoriosHoy} recordatorio{kpi.recordatoriosHoy > 1 ? "s" : ""} vence{kpi.recordatoriosHoy > 1 ? "n" : ""} hoy
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* KPI Dashboard */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Activas"
          value={kpi.activas}
          color="bg-blue-50 text-blue-600"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KpiCard
          label="Seguimiento pendiente"
          value={kpi.seguimientosPendientes}
          color="bg-amber-50 text-amber-600"
          icon={<Bell className="w-5 h-5" />}
        />
        <KpiCard
          label="Confirmadas"
          value={kpi.confirmadas}
          color="bg-emerald-50 text-emerald-600"
          icon={<CheckCircle2 className="w-5 h-5" />}
        />
        <KpiCard
          label="Perdidas"
          value={kpi.perdidas}
          color="bg-slate-100 text-slate-500"
          icon={<XCircle className="w-5 h-5" />}
        />
        <KpiCard
          label="Ventas del mes"
          value={kpi.ventasMes}
          color="bg-violet-50 text-violet-600"
          icon={<Star className="w-5 h-5" />}
        />
      </div>

      {/* Pendientes hoy */}
      <PendientesHoyWidget items={items} onView={onView} />

      {/* Header / Filters */}
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
          {items.length > 0 && (
            <button
              type="button"
              onClick={() =>
                exportarCotizacionesExcel(
                  filtered.length < items.length ? filtered : items,
                )
              }
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors shadow-sm whitespace-nowrap"
            >
              <FileDown className="w-4 h-4" />
              <span className="hidden sm:inline">
                {filtered.length < items.length
                  ? `Exportar ${filtered.length}`
                  : "Exportar Excel"}
              </span>
            </button>
          )}
        </div>

        {/* Search + filter toggle */}
        <div className="flex flex-col md:flex-row gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar cotización, cliente, agente…"
              className="w-full h-10 pl-9 pr-3 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowFilters((v) => !v)}
            className={`flex items-center gap-2 h-10 px-4 rounded-xl border text-sm font-medium transition-colors ${
              showFilters || activeFilterCount > 0
                ? "border-primary bg-primary/5 text-primary"
                : "border-slate-200 text-slate-600 hover:bg-slate-50"
            }`}
          >
            <Filter className="w-4 h-4" />
            Filtros
            {activeFilterCount > 0 && (
              <span className="w-5 h-5 rounded-full bg-primary text-white text-[10px] font-bold flex items-center justify-center">
                {activeFilterCount}
              </span>
            )}
          </button>
        </div>

        {/* Advanced filters */}
        {showFilters && (
          <div className="mt-3 pt-3 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-2">
            {/* Estado */}
            <div className="relative">
              <select
                value={estadoFilter}
                onChange={(e) => setEstadoFilter(e.target.value as EstadoCRM | "todos")}
                className="appearance-none w-full h-10 pl-3 pr-9 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="todos">Todos los estados</option>
                {ESTADO_CRM_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {/* Agente */}
            <div className="relative">
              <select
                value={agenteFilter}
                onChange={(e) => setAgenteFilter(e.target.value)}
                className="appearance-none w-full h-10 pl-3 pr-9 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="todos">Todos los agentes</option>
                {AGENTES.map((a) => (
                  <option key={a} value={a}>
                    {a}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {/* Prioridad */}
            <div className="relative">
              <select
                value={prioridadFilter}
                onChange={(e) => setPrioridadFilter(e.target.value as Prioridad | "todos")}
                className="appearance-none w-full h-10 pl-3 pr-9 rounded-xl border border-slate-200 text-sm text-slate-900 bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary cursor-pointer"
              >
                <option value="todos">Toda prioridad</option>
                {PRIORIDAD_OPTIONS.map((o) => (
                  <option key={o.value} value={o.value}>
                    {o.label}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
            </div>
            {activeFilterCount > 0 && (
              <button
                type="button"
                onClick={() => {
                  setEstadoFilter("todos");
                  setAgenteFilter("todos");
                  setPrioridadFilter("todos");
                }}
                className="flex items-center gap-1.5 text-xs text-slate-500 hover:text-red-600 transition-colors"
              >
                <X className="w-3 h-3" />
                Limpiar filtros
              </button>
            )}
          </div>
        )}
      </header>

      {/* Table */}
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
                  <Th className="pl-5">N° / Alerta</Th>
                  <Th>Cliente · Agente</Th>
                  <Th>Fechas</Th>
                  <Th align="right">Pax</Th>
                  <Th align="right">Total</Th>
                  <Th>Estado</Th>
                  <Th>Prioridad</Th>
                  <Th>Último seg.</Th>
                  <Th>Próxima acción</Th>
                  <Th align="right" className="pr-5">
                    Acciones
                  </Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filtered.map((g) => (
                  <TableRow
                    key={g.id}
                    g={g}
                    onView={() => onView(g)}
                    onEdit={() => onEdit(g)}
                    onDelete={() => onDelete(g.id)}
                    onDuplicate={onDuplicate ? () => onDuplicate(g) : undefined}
                    onOpenCRM={() => setCrmModal(g)}
                    onUpdateCRM={onUpdateCRM}
                  />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* CRM Modal */}
      {crmModal && (
        <CrmModal
          g={crmModal}
          onClose={() => setCrmModal(null)}
          onSave={(patch) => {
            onUpdateCRM(crmModal.id, patch);
            setCrmModal(null);
          }}
        />
      )}
    </div>
  );
}

// ─── Table Row ────────────────────────────────────────────────────────────────

function TableRow({
  g,
  onView,
  onEdit,
  onDelete,
  onDuplicate,
  onOpenCRM,
  onUpdateCRM,
}: {
  g: CotizacionGuardada;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onOpenCRM: () => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
}) {
  const result = useMemo(
    () => calcularLocal(g.servicios, g.acomodaciones, g.cliente),
    [g],
  );
  const primary = g.acomodaciones[0] ?? "DBL";
  const total = result.totalesPorAcomodacion[primary] ?? 0;
  const estadoCRM: EstadoCRM = g.estadoCRM ?? "nueva";
  const prioridad: Prioridad = g.prioridad ?? "media";
  const showTotal = g.modoCotizacion === "calculo";
  const correo = g.cliente.correo?.trim();
  const alertLevel = getAlertLevel(g);
  const hasRecordatorioHoy = isRecordatorioHoy(g);

  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      {/* N° + Alert */}
      <td className="pl-5 pr-3 py-3 whitespace-nowrap">
        <div className="text-xs font-bold text-slate-500 tabular-nums">
          {g.numeroCotizacion}
        </div>
        {alertLevel !== "none" && (
          <AlertBadge level={alertLevel} days={daysSince(g.ultimoSeguimiento ?? g.fechaCreacion)} />
        )}
        {hasRecordatorioHoy && (
          <div className="flex items-center gap-1 mt-0.5">
            <CalendarDays className="w-3 h-3 text-violet-500" />
            <span className="text-[10px] text-violet-600 font-medium">Hoy</span>
          </div>
        )}
      </td>

      {/* Cliente + Agente */}
      <td className="px-3 py-3">
        <button
          onClick={onView}
          className="text-left group min-w-0"
          title="Ver cotización"
        >
          <div className="text-sm font-semibold text-slate-900 group-hover:text-primary transition-colors truncate max-w-[180px]">
            {g.cliente.nombre || "(sin nombre)"}
          </div>
          {g.cliente.agente && (
            <div className="text-[11px] text-slate-400 truncate max-w-[180px]">
              {g.cliente.agente}
            </div>
          )}
        </button>
      </td>

      {/* Fechas */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="text-xs text-slate-700">{formatDate(g.cliente.fechaInicio)}</div>
        {g.cliente.fechaFin && (
          <div className="text-[11px] text-slate-400">{formatDate(g.cliente.fechaFin)}</div>
        )}
      </td>

      {/* Pax */}
      <td className="px-3 py-3 text-sm text-slate-700 text-right tabular-nums whitespace-nowrap">
        {g.cliente.pasajeros}
        {g.cliente.ninos > 0 && (
          <span className="text-slate-400"> +{g.cliente.ninos}</span>
        )}
      </td>

      {/* Total */}
      <td className="px-3 py-3 text-sm font-semibold text-slate-900 text-right tabular-nums whitespace-nowrap">
        {showTotal ? (
          fmt(total)
        ) : (
          <span className="text-slate-400 font-normal">—</span>
        )}
      </td>

      {/* Estado CRM */}
      <td className="px-3 py-3 whitespace-nowrap">
        <EstadoCrmBadge
          estado={estadoCRM}
          onChange={(e) => onUpdateCRM(g.id, {
            estadoCRM: e,
            ultimoSeguimiento: new Date().toISOString(),
            historial: [
              { fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: `Estado → ${ESTADO_CRM_OPTIONS.find(o => o.value === e)?.label}` },
              ...(g.historial ?? []),
            ].slice(0, 50),
          })}
        />
      </td>

      {/* Prioridad */}
      <td className="px-3 py-3 whitespace-nowrap">
        <PrioridadBadge prioridad={prioridad} />
      </td>

      {/* Último seguimiento */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="text-xs text-slate-600">
          {g.ultimoSeguimiento ? formatDate(g.ultimoSeguimiento) : "—"}
        </div>
        {g.fechaRecordatorio && (
          <div className="text-[11px] text-violet-500 mt-0.5 flex items-center gap-1">
            <CalendarDays className="w-2.5 h-2.5" />
            {formatDate(g.fechaRecordatorio)}
          </div>
        )}
      </td>

      {/* Próxima acción */}
      <td className="px-3 py-3">
        <div className="text-xs text-slate-600 max-w-[160px] truncate" title={g.proximaAccion}>
          {g.proximaAccion || (
            <span className="text-slate-300 italic">Sin acción</span>
          )}
        </div>
        {g.notaInterna && (
          <div className="text-[11px] text-violet-500 mt-0.5 flex items-center gap-1">
            <MessageSquare className="w-2.5 h-2.5" />
            <span className="truncate max-w-[150px]" title={g.notaInterna}>
              {g.notaInterna}
            </span>
          </div>
        )}
      </td>

      {/* Actions */}
      <td className="pl-3 pr-5 py-3">
        <div className="flex items-center justify-end gap-1">
          <IconBtn onClick={onView} label="Ver" tone="slate">
            <Eye className="w-4 h-4" />
          </IconBtn>
          <IconBtn onClick={onEdit} label="Editar" tone="primary">
            <Pencil className="w-4 h-4" />
          </IconBtn>
          {onDuplicate && (
            <IconBtn onClick={onDuplicate} label="Duplicar" tone="amber">
              <Copy className="w-4 h-4" />
            </IconBtn>
          )}
          <IconBtn onClick={onOpenCRM} label="CRM / Nota" tone="violet">
            <MessageSquare className="w-4 h-4" />
          </IconBtn>
          {correo ? (
            <a
              href={`mailto:${correo}?subject=${encodeURIComponent(
                `Cotización ${g.numeroCotizacion} - ${g.cliente.nombre || ""}`.trim(),
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

// ─── Sub-components ───────────────────────────────────────────────────────────

function AlertBadge({ level, days }: { level: AlertLevel; days: number }) {
  if (level === "sinenviar")
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <span className="w-2 h-2 rounded-full bg-slate-400 shrink-0" />
        <span className="text-[10px] text-slate-500 font-medium">Sin enviar</span>
      </div>
    );
  if (level === "urgente")
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" />
        <span className="text-[10px] text-red-600 font-semibold">Urgente · {days}d</span>
      </div>
    );
  if (level === "pendiente")
    return (
      <div className="flex items-center gap-1 mt-0.5">
        <Clock className="w-3 h-3 text-amber-500 shrink-0" />
        <span className="text-[10px] text-amber-600 font-medium">Seg. pendiente</span>
      </div>
    );
  return (
    <div className="flex items-center gap-1 mt-0.5">
      <CheckCircle2 className="w-3 h-3 text-emerald-400 shrink-0" />
      <span className="text-[10px] text-emerald-600">Al día</span>
    </div>
  );
}

function EstadoCrmBadge({
  estado,
  onChange,
}: {
  estado: EstadoCRM;
  onChange: (e: EstadoCRM) => void;
}) {
  const s = ESTADO_CRM_STYLES[estado];
  const label = ESTADO_CRM_OPTIONS.find((o) => o.value === estado)?.label ?? estado;
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
        onChange={(e) => onChange(e.target.value as EstadoCRM)}
        aria-label="Cambiar estado"
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
      >
        {ESTADO_CRM_OPTIONS.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  const s = PRIORIDAD_STYLES[prioridad];
  const label = PRIORIDAD_OPTIONS.find((o) => o.value === prioridad)?.label ?? prioridad;
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.bg}`}>
      {s.icon}
      {label}
    </span>
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
      className={`px-3 py-3 text-[10px] font-bold uppercase tracking-[0.12em] whitespace-nowrap ${
        align === "right" ? "text-right" : "text-left"
      } ${className}`}
    >
      {children}
    </th>
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
  tone: "slate" | "primary" | "red" | "amber" | "violet";
  children: React.ReactNode;
}) {
  const cls =
    tone === "red"
      ? "text-red-600 hover:bg-red-50"
      : tone === "primary"
        ? "text-primary hover:bg-primary/10"
        : tone === "amber"
          ? "text-amber-600 hover:bg-amber-50"
          : tone === "violet"
            ? "text-violet-600 hover:bg-violet-50"
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
