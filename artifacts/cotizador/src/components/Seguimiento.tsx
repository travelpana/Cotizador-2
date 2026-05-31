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
  Filter,
  MessageSquare,
  History,
  X,
  Save,
  CalendarDays,
  Star,
  Flame,
  Minus,
  Phone,
  MessageCircle,
  Send,
  CreditCard,
  Calendar,
  ShieldAlert,
  AlarmClock,
} from "lucide-react";
import type {
  CotizacionGuardada,
  EstadoCRM,
  Prioridad,
  ActividadEntry,
  ActividadTipo,
  TipoProximaAccion,
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

/** Alert levels based on days since last seguimiento */
type AlertLevel = "riesgo" | "vencido" | "pendiente" | "aldia" | "sinenviar" | "none";

// ─── Typed action config ───────────────────────────────────────────────────────

interface TipoAccionMeta {
  label: string;
  Icon: typeof Phone;
  color: string;
  bg: string;
}

const TIPO_ACCION_CONFIG: Record<TipoProximaAccion, TipoAccionMeta> = {
  llamar:        { label: "Llamar",             Icon: Phone,          color: "text-blue-600",    bg: "bg-blue-50"    },
  whatsapp:      { label: "WhatsApp",           Icon: MessageCircle,  color: "text-green-600",   bg: "bg-green-50"   },
  correo:        { label: "Correo",             Icon: Mail,           color: "text-sky-600",     bg: "bg-sky-50"     },
  esperar:       { label: "Esperar respuesta",  Icon: Clock,          color: "text-amber-600",   bg: "bg-amber-50"   },
  confirmarPago: { label: "Confirmar pago",     Icon: CreditCard,     color: "text-emerald-600", bg: "bg-emerald-50" },
  reenviar:      { label: "Reenviar propuesta", Icon: Send,           color: "text-violet-600",  bg: "bg-violet-50"  },
  recordatorio:  { label: "Recordatorio",       Icon: Bell,           color: "text-orange-600",  bg: "bg-orange-50"  },
};

// ─── Estado CRM config ────────────────────────────────────────────────────────

const ESTADO_CRM_OPTIONS: { value: EstadoCRM; label: string; auto: boolean }[] = [
  { value: "nueva",             label: "Nueva",             auto: true  },
  { value: "esperando_cliente", label: "Esp. cliente",      auto: true  },
  { value: "requiere_accion",   label: "Requiere acción",   auto: true  },
  { value: "confirmada",        label: "Confirmada",        auto: false },
  { value: "perdida",           label: "Perdida",           auto: false },
];

const ESTADO_CRM_STYLES: Record<
  EstadoCRM,
  { bg: string; text: string; ring: string; dot: string }
> = {
  nueva:             { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    dot: "bg-blue-500"    },
  esperando_cliente: { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200",     dot: "bg-sky-500"     },
  requiere_accion:   { bg: "bg-red-50",     text: "text-red-700",     ring: "ring-red-200",     dot: "bg-red-500"     },
  confirmada:        { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  perdida:           { bg: "bg-slate-100",  text: "text-slate-500",   ring: "ring-slate-200",   dot: "bg-slate-400"   },
};

const PRIORIDAD_OPTIONS: { value: Prioridad; label: string }[] = [
  { value: "alta",  label: "Alta"  },
  { value: "media", label: "Media" },
  { value: "baja",  label: "Baja"  },
];

const PRIORIDAD_STYLES: Record<
  Prioridad,
  { bg: string; text: string; icon: React.ReactNode }
> = {
  alta:  { bg: "bg-red-50 text-red-700 ring-1 ring-red-200",     text: "text-red-700",   icon: <Flame className="w-3 h-3" />  },
  media: { bg: "bg-amber-50 text-amber-700 ring-1 ring-amber-200", text: "text-amber-700", icon: <Star className="w-3 h-3" />   },
  baja:  { bg: "bg-slate-100 text-slate-500 ring-1 ring-slate-200", text: "text-slate-500", icon: <Minus className="w-3 h-3" /> },
};

const ACTIVIDAD_LABELS: Record<ActividadTipo, string> = {
  creada:           "Cotización creada",
  editada:          "Cotización editada",
  pdf_enviado:      "PDF enviado",
  whatsapp_enviado: "WhatsApp enviado",
  correo_enviado:   "Correo enviado",
  duplicada:        "Cotización duplicada",
  confirmada:       "Cotización confirmada",
  nota_agregada:    "Nota interna agregada",
  estado_cambiado:  "Estado actualizado",
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "2-digit" });
}

function formatShortDate(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function formatDateTime(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" });
}

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

/**
 * PHASE 3 — Alert engine
 * 🟢 Al día      → last seguimiento ≤ 3 days ago
 * 🟡 Pendiente   → > 3 days
 * 🟠 Vencido     → > 7 days
 * 🔴 Riesgo      → > 14 days
 */
function getAlertLevel(g: CotizacionGuardada): AlertLevel {
  const estado = g.estadoCRM ?? "nueva";
  if (estado === "confirmada" || estado === "perdida") return "none";
  if (estado === "nueva" && !g.sentAt && !g.ultimoSeguimiento) return "sinenviar";
  const days = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
  if (days > 14) return "riesgo";
  if (days > 7)  return "vencido";
  if (days > 3)  return "pendiente";
  return "aldia";
}

/** True if fechaProximaAccion or fechaRecordatorio is today */
function isAccionHoy(g: CotizacionGuardada): boolean {
  const dateStr = g.fechaProximaAccion ?? g.fechaRecordatorio;
  if (!dateStr) return false;
  const d = new Date(dateStr);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label,
  value,
  sub,
  color,
  icon,
  iconStyle,
}: {
  label: string;
  value: number;
  sub?: string;
  color: string;
  icon: React.ReactNode;
  iconStyle?: React.CSSProperties;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-start gap-3">
      <div
        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`}
        style={iconStyle}
      >
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

// ─── CRM Modal ────────────────────────────────────────────────────────────────

function addDaysStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function CrmModal({
  g,
  onClose,
  onSave,
}: {
  g: CotizacionGuardada;
  onClose: () => void;
  onSave: (patch: Partial<CotizacionGuardada>) => void;
}) {
  const currentEstado: EstadoCRM = g.estadoCRM ?? "nueva";
  const isManualState = currentEstado === "confirmada" || currentEstado === "perdida";

  const [estadoManual, setEstadoManual] = useState<"confirmada" | "perdida" | null>(
    isManualState ? currentEstado : null,
  );
  const [prioridad, setPrioridad] = useState<Prioridad>(g.prioridad ?? "media");
  const [observacionSeguimiento, setObservacionSeguimiento] = useState(
    g.observacionSeguimiento ?? g.proximaAccion ?? "",
  );
  const [notaInterna, setNotaInterna] = useState(g.notaInterna ?? "");
  const [recordatorio, setRecordatorio] = useState(g.recordatorio?.slice(0, 10) ?? "");
  const [tab, setTab] = useState<"crm" | "historial">("crm");

  const handleSave = () => {
    const resolvedEstado: EstadoCRM = estadoManual ?? currentEstado;
    const newEntry: ActividadEntry = {
      fecha: new Date().toISOString(),
      tipo: "estado_cambiado",
      detalle: `Actualizado · estado: ${ESTADO_CRM_OPTIONS.find((o) => o.value === resolvedEstado)?.label ?? resolvedEstado}${notaInterna.trim() ? ` · Nota: ${notaInterna.trim().slice(0, 60)}` : ""}`,
    };
    const patch: Partial<CotizacionGuardada> = {
      estadoCRM: resolvedEstado,
      prioridad,
      recordatorio: recordatorio || undefined,
      observacionSeguimiento: observacionSeguimiento.trim() || undefined,
      notaInterna: notaInterna.trim() || undefined,
      ultimoSeguimiento: new Date().toISOString(),
      historial: [newEntry, ...(g.historial ?? [])].slice(0, 50),
    };
    onSave(patch);
    onClose();
  };

  const autoStateInfo = ESTADO_CRM_OPTIONS.find((o) => o.value === currentEstado);
  const autoStateStyle = ESTADO_CRM_STYLES[currentEstado];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4"
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[92vh]">
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
            className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${
              tab === "crm"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Seguimiento
          </button>
          <button
            type="button"
            onClick={() => setTab("historial")}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors ${
              tab === "historial"
                ? "border-primary text-primary"
                : "border-transparent text-slate-500 hover:text-slate-700"
            }`}
          >
            Historial{" "}
            {g.historial && g.historial.length > 0
              ? `(${g.historial.length})`
              : ""}
          </button>
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === "crm" ? (
            <div className="p-5 space-y-5">

              {/* Estado automático (read-only display) */}
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">
                    Estado actual (automático)
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${autoStateStyle.bg} ${autoStateStyle.text} ${autoStateStyle.ring}`}
                  >
                    <span className={`w-1.5 h-1.5 rounded-full ${autoStateStyle.dot}`} />
                    {autoStateInfo?.label ?? currentEstado}
                    {autoStateInfo?.auto && (
                      <span className="text-[10px] opacity-60 ml-1">· auto</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Cerrar venta / Marcar como perdida */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Resultado final
                </label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setEstadoManual(estadoManual === "confirmada" ? null : "confirmada")}
                    className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ring-1 ${
                      estadoManual === "confirmada"
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-300 shadow-sm"
                        : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-emerald-50/60 hover:text-emerald-600"
                    }`}
                  >
                    <CheckCircle2 className="w-4 h-4" />
                    ✅ Venta confirmada
                  </button>
                  <button
                    type="button"
                    onClick={() => setEstadoManual(estadoManual === "perdida" ? null : "perdida")}
                    className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ring-1 ${
                      estadoManual === "perdida"
                        ? "bg-slate-100 text-slate-600 ring-slate-300 shadow-sm"
                        : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                    }`}
                  >
                    ❌ Marcar perdida
                  </button>
                </div>
              </div>

              {/* Recordatorio rápido */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">
                  Recordarme
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[
                    { label: "Mañana", days: 1 },
                    { label: "En 3 días", days: 3 },
                    { label: "En 1 semana", days: 7 },
                  ].map(({ label, days }) => {
                    const target = addDaysStr(days);
                    const active = recordatorio === target;
                    return (
                      <button
                        key={days}
                        type="button"
                        onClick={() => setRecordatorio(active ? "" : target)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1 ${
                          active
                            ? "bg-primary/10 text-primary ring-primary/30 shadow-sm"
                            : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="date"
                    value={recordatorio}
                    onChange={(e) => setRecordatorio(e.target.value)}
                    placeholder="Personalizado"
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary"
                  />
                  {recordatorio && (
                    <button
                      type="button"
                      onClick={() => setRecordatorio("")}
                      className="text-xs text-slate-400 hover:text-slate-600 transition-colors"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  )}
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
                          active
                            ? s.bg
                            : "bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Observación de seguimiento */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Observación de seguimiento
                </label>
                <input
                  type="text"
                  value={observacionSeguimiento}
                  onChange={(e) => setObservacionSeguimiento(e.target.value)}
                  placeholder="Ej: Cliente confirma interés, pendiente de fechas…"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
                />
              </div>

              {/* Nota interna */}
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">
                  Nota interna (no aparece en PDF/WhatsApp/correo)
                </label>
                <textarea
                  value={notaInterna}
                  onChange={(e) => setNotaInterna(e.target.value)}
                  placeholder="Ej: Cliente quiere hotel 4*, pendiente pago, prefiere salida en la tarde…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none"
                />
              </div>
            </div>
          ) : (
            <div className="p-5">
              {!g.historial || g.historial.length === 0 ? (
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
  if (tipo === "creada")          return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (tipo === "confirmada")      return <CheckCircle2 className={`${cls} text-emerald-600`} />;
  if (tipo === "pdf_enviado")     return <FileDown className={`${cls} text-blue-500`} />;
  if (tipo === "whatsapp_enviado") return <MessageSquare className={`${cls} text-green-500`} />;
  if (tipo === "correo_enviado")  return <Mail className={`${cls} text-sky-500`} />;
  if (tipo === "duplicada")       return <Copy className={`${cls} text-amber-500`} />;
  if (tipo === "editada")         return <Pencil className={`${cls} text-slate-500`} />;
  if (tipo === "nota_agregada")   return <MessageSquare className={`${cls} text-violet-500`} />;
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

  // ─── PHASE 4 — KPI calculations ───────────────────────────────────────────

  const kpi = useMemo(() => {
    const activas = items.filter(
      (g) => g.estadoCRM !== "confirmada" && g.estadoCRM !== "perdida",
    ).length;

    const accionHoy = items.filter(
      (g) =>
        g.estadoCRM !== "confirmada" &&
        g.estadoCRM !== "perdida" &&
        isAccionHoy(g),
    ).length;

    const seguimientosPendientes = items.filter((g) => {
      const al = getAlertLevel(g);
      return al === "riesgo" || al === "vencido" || al === "pendiente";
    }).length;

    const riesgo = items.filter((g) => getAlertLevel(g) === "riesgo").length;
    const vencido = items.filter((g) => getAlertLevel(g) === "vencido").length;

    const confirmadas = items.filter((g) => g.estadoCRM === "confirmada").length;

    const now = new Date();
    const ventasMes = items.filter((g) => {
      if (g.estadoCRM !== "confirmada") return false;
      const d = new Date(g.ultimoSeguimiento ?? g.fechaCreacion);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;

    return {
      activas,
      accionHoy,
      seguimientosPendientes,
      riesgo,
      vencido,
      confirmadas,
      ventasMes,
    };
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
        g.observacionSeguimiento,
        g.proximaAccion,
        g.notaInterna,
        g.tipoProximaAccion,
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

  const totalAlerts = kpi.riesgo + kpi.vencido + kpi.seguimientosPendientes;

  return (
    <div className="space-y-4">
      {/* PHASE 5 — Alert summary banner (compact, inside Seguimiento module) */}
      {(totalAlerts > 0 || kpi.accionHoy > 0) && (
        <div className="flex items-start gap-3 bg-gradient-to-r from-slate-50 to-slate-100/60 border border-slate-200 rounded-2xl px-4 py-3 shadow-sm">
          <div className="relative w-9 h-9 rounded-xl bg-amber-100 flex items-center justify-center shrink-0 mt-0.5">
            <Bell className="w-4 h-4 text-amber-600" />
            <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1">
              {totalAlerts + kpi.accionHoy}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-xs font-bold text-slate-700 mb-1">
              Resumen de alertas
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              {kpi.riesgo > 0 && (
                <span className="text-xs text-red-700 font-medium">
                  🔴 {kpi.riesgo} riesgo de pérdida
                </span>
              )}
              {kpi.vencido > 0 && (
                <span className="text-xs text-orange-700 font-medium">
                  🟠 {kpi.vencido} seguimiento vencido
                </span>
              )}
              {kpi.seguimientosPendientes - kpi.riesgo - kpi.vencido > 0 && (
                <span className="text-xs text-amber-700 font-medium">
                  🟡 {kpi.seguimientosPendientes - kpi.riesgo - kpi.vencido} pendiente
                </span>
              )}
              {kpi.accionHoy > 0 && (
                <span className="text-xs text-blue-700 font-medium">
                  📞 {kpi.accionHoy} acción{kpi.accionHoy !== 1 ? "es" : ""} para hoy
                </span>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PHASE 4 — KPI Dashboard: Activas | Acción hoy | Seg. pendiente | Confirmadas | Ventas mes */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard
          label="Activas"
          value={kpi.activas}
          color="bg-blue-50 text-blue-600"
          icon={<TrendingUp className="w-5 h-5" />}
        />
        <KpiCard
          label="Acción hoy"
          value={kpi.accionHoy}
          color=""
          iconStyle={{ backgroundColor: "#fdf3e0", color: "#e6ae33" }}
          icon={<Calendar className="w-5 h-5" />}
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
          label="Ventas del mes"
          value={kpi.ventasMes}
          color="bg-violet-50 text-violet-600"
          icon={<Star className="w-5 h-5" />}
        />
      </div>

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
            <div className="relative">
              <select
                value={estadoFilter}
                onChange={(e) =>
                  setEstadoFilter(e.target.value as EstadoCRM | "todos")
                }
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
            <div className="relative">
              <select
                value={prioridadFilter}
                onChange={(e) =>
                  setPrioridadFilter(e.target.value as Prioridad | "todos")
                }
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
              Crea una cotización y guárdala para verla aquí.
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
                  {/* PHASE 6 — Alerta column */}
                  <Th>Alerta</Th>
                  <Th>Cliente · Agente</Th>
                  <Th>Fechas</Th>
                  <Th align="right">Pax</Th>
                  <Th align="right">Total</Th>
                  <Th>Estado</Th>
                  <Th>Prioridad</Th>
                  <Th>Último seg.</Th>
                  {/* PHASE 2 — typed action column */}
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
}: {
  g: CotizacionGuardada;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate?: () => void;
  onOpenCRM: () => void;
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
  const accionHoy = isAccionHoy(g);

  return (
    <tr className="hover:bg-slate-50/70 transition-colors">
      {/* N° */}
      <td className="pl-5 pr-2 py-3 whitespace-nowrap">
        <div className="text-xs font-bold text-slate-500 tabular-nums">
          {g.numeroCotizacion}
        </div>
        {accionHoy && (
          <div className="flex items-center gap-1 mt-0.5">
            <AlarmClock className="w-3 h-3 text-blue-500" />
            <span className="text-[10px] text-blue-600 font-semibold">Hoy</span>
          </div>
        )}
      </td>

      {/* PHASE 6 — Alerta column */}
      <td className="px-2 py-3 whitespace-nowrap">
        <AlertBadge level={alertLevel} days={daysSince(g.ultimoSeguimiento ?? g.fechaCreacion)} />
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
        <EstadoCrmBadge estado={estadoCRM} />
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
        {g.fechaRecordatorio && !g.fechaProximaAccion && (
          <div className="text-[11px] text-violet-500 mt-0.5 flex items-center gap-1">
            <CalendarDays className="w-2.5 h-2.5" />
            {formatDate(g.fechaRecordatorio)}
          </div>
        )}
      </td>

      {/* PHASE 2 — Typed próxima acción */}
      <td className="px-3 py-3">
        <ProximaAccionCell g={g} />
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
          <IconBtn onClick={onOpenCRM} label="Seguimiento / CRM" tone="violet">
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

/** PHASE 2 — Typed próxima acción cell */
function ProximaAccionCell({ g }: { g: CotizacionGuardada }) {
  const tipo = g.tipoProximaAccion;
  const fecha = g.fechaProximaAccion ?? g.fechaRecordatorio;
  const obs = g.observacionSeguimiento ?? g.proximaAccion;

  if (!tipo && !obs) {
    return (
      <span className="text-[11px] text-slate-300 italic font-medium">
        Sin programar
      </span>
    );
  }

  const cfg = tipo ? TIPO_ACCION_CONFIG[tipo] : null;

  return (
    <div className="min-w-[120px]">
      {cfg && (
        <div className={`flex items-center gap-1.5 ${cfg.color}`}>
          <cfg.Icon className="w-3.5 h-3.5 shrink-0" />
          <span className="text-[11px] font-semibold">{cfg.label}</span>
        </div>
      )}
      {fecha && (
        <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-1">
          <CalendarDays className="w-2.5 h-2.5" />
          {formatShortDate(fecha)}
        </div>
      )}
      {obs && (
        <div
          className="text-[11px] text-slate-400 mt-0.5 truncate max-w-[150px] italic"
          title={obs}
        >
          {obs}
        </div>
      )}
    </div>
  );
}

/** PHASE 6 — 4-level alert badge */
function AlertBadge({ level, days }: { level: AlertLevel; days: number }) {
  if (level === "none") return <span className="text-[10px] text-slate-300">—</span>;

  if (level === "sinenviar")
    return (
      <div className="flex items-center gap-1">
        <span className="w-2 h-2 rounded-full bg-slate-300 shrink-0" />
        <span className="text-[10px] text-slate-400 font-medium">Sin enviar</span>
      </div>
    );

  if (level === "riesgo")
    return (
      <div className="flex items-center gap-1">
        <ShieldAlert className="w-3.5 h-3.5 text-red-500 shrink-0" />
        <div>
          <div className="text-[10px] text-red-600 font-bold leading-tight">Riesgo</div>
          <div className="text-[9px] text-red-400 leading-tight">{days}d sin contacto</div>
        </div>
      </div>
    );

  if (level === "vencido")
    return (
      <div className="flex items-center gap-1">
        <AlertTriangle className="w-3.5 h-3.5 text-orange-500 shrink-0" />
        <div>
          <div className="text-[10px] text-orange-600 font-bold leading-tight">Vencido</div>
          <div className="text-[9px] text-orange-400 leading-tight">{days}d sin contacto</div>
        </div>
      </div>
    );

  if (level === "pendiente")
    return (
      <div className="flex items-center gap-1">
        <Clock className="w-3.5 h-3.5 text-amber-500 shrink-0" />
        <div>
          <div className="text-[10px] text-amber-600 font-semibold leading-tight">Pendiente</div>
          <div className="text-[9px] text-amber-400 leading-tight">{days}d sin contacto</div>
        </div>
      </div>
    );

  // aldia
  return (
    <div className="flex items-center gap-1">
      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
      <span className="text-[10px] text-emerald-600 font-medium">Al día</span>
    </div>
  );
}

function EstadoCrmBadge({ estado }: { estado: EstadoCRM }) {
  const s = ESTADO_CRM_STYLES[estado];
  const opt = ESTADO_CRM_OPTIONS.find((o) => o.value === estado);
  const label = opt?.label ?? estado;
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold ring-1 ${s.bg} ${s.text} ${s.ring}`}
      title={opt?.auto ? "Estado automático" : "Estado manual"}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {label}
    </span>
  );
}

function PrioridadBadge({ prioridad }: { prioridad: Prioridad }) {
  const s = PRIORIDAD_STYLES[prioridad];
  const label = PRIORIDAD_OPTIONS.find((o) => o.value === prioridad)?.label ?? prioridad;
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-semibold ${s.bg}`}
    >
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

// ─── PHASE 7 — Future architecture hooks (ready, not implemented) ──────────────
// The following interfaces are defined here for future expansion:
// - FavoritosManager: per-agent quote pinning
// - RecordatorioAutomatico: scheduled push reminders
// - SeguimientoPorAgente: grouping/filtering by agent with stats
// - SeguimientoPorDestino: grouping by destination tag
// - EstadisticasConversion: funnel metrics (nueva → confirmada rate, avg days to close)
// All can be added as optional props to the Seguimiento component without breaking changes.
