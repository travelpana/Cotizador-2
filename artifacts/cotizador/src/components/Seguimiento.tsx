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
  AlarmClock,
  ChevronRight,
  CalendarClock,
  ExternalLink,
  Users,
} from "lucide-react";
import type {
  CotizacionGuardada,
  EstadoCRM,
  Prioridad,
  ActividadEntry,
  ActividadTipo,
  TipoProximaAccion,
} from "./Guardadas";
import { exportarCotizacionesExcel } from "@/lib/exportExcel";

interface Props {
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onEdit: (g: CotizacionGuardada) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

const ESTADO_CRM_OPTIONS: { value: EstadoCRM; label: string; auto: boolean }[] = [
  { value: "nueva",             label: "Nueva",           auto: true  },
  { value: "esperando_cliente", label: "Esp. cliente",    auto: true  },
  { value: "requiere_accion",   label: "Requiere acción", auto: true  },
  { value: "confirmada",        label: "Confirmada",      auto: false },
  { value: "perdida",           label: "Perdida",         auto: false },
];

const ESTADO_CRM_STYLES: Record<EstadoCRM, { bg: string; text: string; ring: string; dot: string }> = {
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

const PRIORIDAD_STYLES: Record<Prioridad, { bg: string; text: string; icon: React.ReactNode }> = {
  alta:  { bg: "bg-red-50 text-red-700 ring-1 ring-red-200",       text: "text-red-700",   icon: <Flame className="w-3 h-3" />  },
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

// ─── Kanban column config ─────────────────────────────────────────────────────

interface KanbanColConfig {
  id: EstadoCRM;
  label: string;
  borderColor: string;
  dotColor: string;
  bgHeader: string;
  badgeBg: string;
  badgeText: string;
  initialsColor: string;
}

const KANBAN_COLUMNS: KanbanColConfig[] = [
  {
    id: "nueva",
    label: "Nuevas",
    borderColor: "#004FBB",
    dotColor: "#004FBB",
    bgHeader: "#eff6ff",
    badgeBg: "#dbeafe",
    badgeText: "#1d4ed8",
    initialsColor: "#004FBB",
  },
  {
    id: "esperando_cliente",
    label: "Enviadas",
    borderColor: "#0ea5e9",
    dotColor: "#0ea5e9",
    bgHeader: "#f0f9ff",
    badgeBg: "#e0f2fe",
    badgeText: "#0369a1",
    initialsColor: "#0ea5e9",
  },
  {
    id: "requiere_accion",
    label: "Seguimiento",
    borderColor: "#E6AE33",
    dotColor: "#E6AE33",
    bgHeader: "#fffbeb",
    badgeBg: "#fef3c7",
    badgeText: "#92400e",
    initialsColor: "#b45309",
  },
  {
    id: "confirmada",
    label: "Confirmadas",
    borderColor: "#03A04E",
    dotColor: "#03A04E",
    bgHeader: "#f0fdf4",
    badgeBg: "#dcfce7",
    badgeText: "#15803d",
    initialsColor: "#03A04E",
  },
  {
    id: "perdida",
    label: "Perdidas",
    borderColor: "#94a3b8",
    dotColor: "#94a3b8",
    bgHeader: "#f8fafc",
    badgeBg: "#f1f5f9",
    badgeText: "#475569",
    initialsColor: "#94a3b8",
  },
];

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

function daysUntil(iso?: string): number | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return Math.floor((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24));
}

function isDateToday(iso?: string): boolean {
  if (!iso) return false;
  const d = new Date(iso);
  const today = new Date();
  return (
    d.getFullYear() === today.getFullYear() &&
    d.getMonth() === today.getMonth() &&
    d.getDate() === today.getDate()
  );
}

function addDaysStr(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function fmtMoney(n?: number): string {
  if (!n || n === 0) return "";
  return `${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })} US$`;
}

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function getMotivoAlerta(g: CotizacionGuardada): { text: string; urgent: boolean } {
  const dv = daysUntil(g.cliente.vigencia);
  if (dv === 1) return { text: "Vence mañana", urgent: true };
  if (dv !== null && dv <= 0) return { text: "Vigencia vencida", urgent: true };
  if (isDateToday(g.recordatorio)) return { text: "Recordatorio hoy", urgent: false };
  const days = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
  if (days >= 3) return { text: `Sin seguimiento hace ${days} días`, urgent: days >= 7 };
  return { text: "Requiere atención", urgent: false };
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({
  label, value, sub, color, icon, iconStyle,
}: {
  label: string; value: number; sub?: string;
  color: string; icon: React.ReactNode; iconStyle?: React.CSSProperties;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`} style={iconStyle}>
        {icon}
      </div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 leading-tight tabular-nums">{value}</div>
        <div className="text-xs font-medium text-slate-600 leading-tight mt-0.5">{label}</div>
        {sub && <div className="text-[11px] text-slate-400 mt-0.5">{sub}</div>}
      </div>
    </div>
  );
}

// ─── CRM Modal ────────────────────────────────────────────────────────────────

function CrmModal({
  g, onClose, onSave,
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
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <div className="font-semibold text-slate-900">{g.cliente.nombre || "(sin nombre)"}</div>
            <div className="text-xs text-slate-500 mt-0.5">{g.numeroCotizacion} · {g.cliente.agente}</div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="flex border-b border-slate-100 px-5">
          {(["crm", "historial"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => setTab(t)}
              className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}
            >
              {t === "crm" ? "Seguimiento" : `Historial${g.historial && g.historial.length > 0 ? ` (${g.historial.length})` : ""}`}
            </button>
          ))}
        </div>

        <div className="overflow-y-auto flex-1">
          {tab === "crm" ? (
            <div className="p-5 space-y-5">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Estado actual (automático)</div>
                  <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${autoStateStyle.bg} ${autoStateStyle.text} ${autoStateStyle.ring}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${autoStateStyle.dot}`} />
                    {autoStateInfo?.label ?? currentEstado}
                    {autoStateInfo?.auto && <span className="text-[10px] opacity-60 ml-1">· auto</span>}
                  </div>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Resultado final</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEstadoManual(estadoManual === "confirmada" ? null : "confirmada")}
                    className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ring-1 ${estadoManual === "confirmada" ? "bg-emerald-50 text-emerald-700 ring-emerald-300 shadow-sm" : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-emerald-50/60 hover:text-emerald-600"}`}>
                    <CheckCircle2 className="w-4 h-4" />✅ Venta confirmada
                  </button>
                  <button type="button" onClick={() => setEstadoManual(estadoManual === "perdida" ? null : "perdida")}
                    className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ring-1 ${estadoManual === "perdida" ? "bg-slate-100 text-slate-600 ring-slate-300 shadow-sm" : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"}`}>
                    ❌ Marcar perdida
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Recordarme</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[{ label: "Mañana", days: 1 }, { label: "En 3 días", days: 3 }, { label: "En 1 semana", days: 7 }].map(({ label, days }) => {
                    const target = addDaysStr(days);
                    const active = recordatorio === target;
                    return (
                      <button key={days} type="button" onClick={() => setRecordatorio(active ? "" : target)}
                        className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1 ${active ? "bg-primary/10 text-primary ring-primary/30 shadow-sm" : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"}`}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={recordatorio} onChange={(e) => setRecordatorio(e.target.value)}
                    className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  {recordatorio && (
                    <button type="button" onClick={() => setRecordatorio("")} className="text-slate-400 hover:text-slate-600">
                      <X className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Prioridad</label>
                <div className="flex gap-2">
                  {PRIORIDAD_OPTIONS.map((o) => {
                    const s = PRIORIDAD_STYLES[o.value];
                    return (
                      <button key={o.value} type="button" onClick={() => setPrioridad(o.value)}
                        className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1 ${prioridad === o.value ? s.bg : "bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100"}`}>
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Observación de seguimiento</label>
                <input type="text" value={observacionSeguimiento} onChange={(e) => setObservacionSeguimiento(e.target.value)}
                  placeholder="Ej: Cliente confirma interés, pendiente de fechas…"
                  className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400" />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Nota interna (no aparece en PDF/WhatsApp/correo)</label>
                <textarea value={notaInterna} onChange={(e) => setNotaInterna(e.target.value)}
                  placeholder="Ej: Cliente quiere hotel 4*, pendiente pago…"
                  rows={3}
                  className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none" />
              </div>
            </div>
          ) : (
            <div className="p-5">
              {!g.historial || g.historial.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-sm">No hay actividad registrada aún</div>
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
                          <div className="text-sm font-medium text-slate-800">{ACTIVIDAD_LABELS[entry.tipo] ?? entry.tipo}</div>
                          {entry.detalle && <div className="text-xs text-slate-500 mt-0.5 leading-snug">{entry.detalle}</div>}
                          <div className="text-[11px] text-slate-400 mt-1">{formatDateTime(entry.fecha)}</div>
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
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors">Cancelar</button>
            <button type="button" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium transition-colors">
              <Save className="w-3.5 h-3.5" />Guardar
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function ActivityIcon({ tipo }: { tipo: ActividadTipo }) {
  const cls = "w-3 h-3";
  if (tipo === "creada")           return <CheckCircle2 className={`${cls} text-emerald-500`} />;
  if (tipo === "confirmada")       return <CheckCircle2 className={`${cls} text-emerald-600`} />;
  if (tipo === "pdf_enviado")      return <FileDown className={`${cls} text-blue-500`} />;
  if (tipo === "whatsapp_enviado") return <MessageSquare className={`${cls} text-green-500`} />;
  if (tipo === "correo_enviado")   return <Mail className={`${cls} text-sky-500`} />;
  if (tipo === "duplicada")        return <Copy className={`${cls} text-amber-500`} />;
  if (tipo === "editada")          return <Pencil className={`${cls} text-slate-500`} />;
  if (tipo === "nota_agregada")    return <MessageSquare className={`${cls} text-violet-500`} />;
  return <History className={`${cls} text-slate-400`} />;
}

// ─── Attention cards (Requieren atención hoy) ─────────────────────────────────

function AtencionCard({
  g, onView, onAtender, onPosponer, onCRM,
}: {
  g: CotizacionGuardada;
  onView: () => void;
  onAtender: () => void;
  onPosponer: () => void;
  onCRM: () => void;
}) {
  const motivo = getMotivoAlerta(g);
  const valor = g.valorCotizacion;
  const phone = g.cliente.whatsapp?.replace(/[^0-9+]/g, "");
  const dateLabel = g.cliente.fechaInicio
    ? `Viaje: ${formatShortDate(g.cliente.fechaInicio)}`
    : g.cliente.vigencia
    ? `Vigencia: ${formatShortDate(g.cliente.vigencia)}`
    : "";

  return (
    <div
      className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 min-w-[220px]"
      style={{ border: `1px solid ${motivo.urgent ? "#fca5a5" : "#fde68a"}` }}
    >
      {/* Top row */}
      <div>
        <div className="flex items-start justify-between gap-2">
          <span className="text-sm font-bold text-slate-900 truncate leading-tight">
            {g.cliente.nombre || "(sin nombre)"}
          </span>
          {valor != null && valor > 0 && (
            <span className="text-[11px] font-bold shrink-0" style={{ color: "#041941" }}>
              {fmtMoney(valor)}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
          {g.numeroCotizacion && (
            <span className="text-[11px] text-slate-400 font-mono">{g.numeroCotizacion}</span>
          )}
          {dateLabel && (
            <span className="text-[11px] text-slate-400">· {dateLabel}</span>
          )}
        </div>
      </div>

      {/* Motivo */}
      <div
        className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold"
        style={{
          background: motivo.urgent ? "#fee2e2" : "rgba(230,174,51,0.1)",
          color: motivo.urgent ? "#991b1b" : "#92400e",
        }}
      >
        {motivo.urgent ? (
          <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
        ) : (
          <AlarmClock className="w-3.5 h-3.5 shrink-0" />
        )}
        {motivo.text}
      </div>

      {/* Actions */}
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold"
          style={{ background: "#004FBB" }}
        >
          <ExternalLink className="w-3 h-3" />
          Abrir
        </button>
        {phone && (
          <a
            href={`https://wa.me/${phone}`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold ring-1 ring-green-200"
            style={{ background: "#f0fdf4", color: "#03A04E" }}
          >
            <MessageCircle className="w-3 h-3" />
            WhatsApp
          </a>
        )}
        <button
          type="button"
          onClick={onAtender}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200"
        >
          <CheckCircle2 className="w-3 h-3" />
          Atendida
        </button>
        <button
          type="button"
          onClick={onPosponer}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold"
          style={{ background: "rgba(230,174,51,0.08)", color: "#92400e", border: "1px solid rgba(230,174,51,0.35)" }}
        >
          <AlarmClock className="w-3 h-3" />
          Posponer
        </button>
      </div>
    </div>
  );
}

// ─── Kanban mini-card ─────────────────────────────────────────────────────────

function MiniKanbanCard({
  g, col, onView, onCRM,
}: {
  g: CotizacionGuardada;
  col: KanbanColConfig;
  onView: () => void;
  onCRM: () => void;
}) {
  const initials = getInitials(g.cliente.nombre || "?");
  const valor = g.valorCotizacion;
  const sinActividad = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
  const showSinActividad = col.id === "requiere_accion" && sinActividad >= 3;
  const dateLabel = g.cliente.fechaInicio
    ? formatShortDate(g.cliente.fechaInicio)
    : g.cliente.vigencia
    ? formatShortDate(g.cliente.vigencia)
    : "";

  return (
    <div
      className="bg-white rounded-xl ring-1 ring-slate-100 p-3 hover:ring-slate-200 hover:shadow-sm transition-all cursor-pointer group"
      onClick={onCRM}
    >
      <div className="flex items-start gap-2">
        {/* Initials */}
        <div
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[11px] font-bold text-white shrink-0"
          style={{ background: col.initialsColor }}
        >
          {initials}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-semibold text-slate-900 truncate leading-tight">
            {g.cliente.nombre || "(sin nombre)"}
          </div>
          <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
            {g.numeroCotizacion && (
              <span className="text-[10px] text-slate-400 font-mono">{g.numeroCotizacion}</span>
            )}
            {valor != null && valor > 0 && (
              <span className="text-[10px] font-semibold text-slate-500">· {fmtMoney(valor)}</span>
            )}
          </div>
          {dateLabel && (
            <div className="text-[10px] text-slate-400 mt-0.5">{dateLabel}</div>
          )}

          {/* Seguimiento indicator */}
          {showSinActividad && (
            <div className="text-[10px] font-semibold mt-1" style={{ color: sinActividad >= 7 ? "#991b1b" : "#b45309" }}>
              {sinActividad} día{sinActividad !== 1 ? "s" : ""} sin actividad
            </div>
          )}
        </div>

        {/* Open button */}
        <button
          type="button"
          onClick={(e) => { e.stopPropagation(); onView(); }}
          className="opacity-0 group-hover:opacity-100 transition-opacity w-6 h-6 flex items-center justify-center rounded-md hover:bg-slate-100 text-slate-400 shrink-0"
          title="Ver cotización"
        >
          <ExternalLink className="w-3 h-3" />
        </button>
      </div>
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({
  col, items, onView, onCRM,
}: {
  col: KanbanColConfig;
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onCRM: (g: CotizacionGuardada) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW_COUNT = 5;
  const visible = expanded ? items : items.slice(0, PREVIEW_COUNT);
  const hasMore = items.length > PREVIEW_COUNT;

  return (
    <div className="flex flex-col bg-slate-50 rounded-2xl ring-1 ring-slate-200 overflow-hidden min-w-[200px]" style={{ borderLeft: `3px solid ${col.borderColor}` }}>
      {/* Column header */}
      <div className="flex items-center justify-between px-3 py-2.5" style={{ background: col.bgHeader }}>
        <span className="text-xs font-bold text-slate-700">{col.label}</span>
        <span
          className="text-[10px] font-bold px-1.5 py-0.5 rounded-full"
          style={{ background: col.badgeBg, color: col.badgeText }}
        >
          {items.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 flex flex-col gap-2 p-2 overflow-y-auto" style={{ maxHeight: 420 }}>
        {visible.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-slate-400">Sin cotizaciones</div>
        ) : (
          visible.map((g) => (
            <MiniKanbanCard
              key={g.id}
              g={g}
              col={col}
              onView={() => onView(g)}
              onCRM={() => onCRM(g)}
            />
          ))
        )}
      </div>

      {/* Ver todas */}
      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="flex items-center justify-center gap-1 text-[11px] font-semibold py-2 border-t border-slate-200 transition-colors hover:opacity-80"
          style={{ color: col.badgeText }}
        >
          {expanded ? "Ver menos" : `Ver todas (${items.length - PREVIEW_COUNT} más)`}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Seguimiento({
  items, onView, onEdit, onDelete, onDuplicate, onUpdateCRM,
}: Props) {
  const [query, setQuery] = useState("");
  const [crmModal, setCrmModal] = useState<CotizacionGuardada | null>(null);
  const [showSearch, setShowSearch] = useState(false);

  // ─── KPI ──────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const activas = items.filter((g) => g.estadoCRM !== "confirmada" && g.estadoCRM !== "perdida").length;
    const accionHoy = items.filter((g) => {
      if (g.estadoCRM === "confirmada" || g.estadoCRM === "perdida") return false;
      const dateStr = g.fechaProximaAccion ?? g.fechaRecordatorio;
      if (!dateStr) return false;
      const d = new Date(dateStr);
      const today = new Date();
      return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
    }).length;
    const seguimientosPendientes = items.filter((g) => {
      const estado = g.estadoCRM ?? "nueva";
      if (estado === "confirmada" || estado === "perdida") return false;
      const days = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
      return days > 3;
    }).length;
    const confirmadas = items.filter((g) => g.estadoCRM === "confirmada").length;
    const now = new Date();
    const ventasMes = items.filter((g) => {
      if (g.estadoCRM !== "confirmada") return false;
      const d = new Date(g.ultimoSeguimiento ?? g.fechaCreacion);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { activas, accionHoy, seguimientosPendientes, confirmadas, ventasMes };
  }, [items]);

  // ─── Requieren atención hoy ────────────────────────────────────────────────

  const atencionItems = useMemo(() => {
    return items
      .filter((g) => {
        const estado = g.estadoCRM ?? "nueva";
        if (estado === "confirmada" || estado === "perdida") return false;
        const sinActividad = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
        const dv = daysUntil(g.cliente.vigencia);
        const recHoy = isDateToday(g.recordatorio);
        return sinActividad >= 3 || dv === 1 || recHoy;
      })
      .sort((a, b) => {
        const getPri = (g: CotizacionGuardada) => {
          const dv = daysUntil(g.cliente.vigencia);
          if (dv !== null && dv <= 1) return 2000 + (g.valorCotizacion ?? 0);
          if (isDateToday(g.recordatorio)) return 1500;
          return daysSince(g.ultimoSeguimiento ?? g.fechaCreacion) * 10;
        };
        return getPri(b) - getPri(a);
      })
      .slice(0, 5);
  }, [items]);

  // ─── Kanban buckets ───────────────────────────────────────────────────────

  const kanbanBuckets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? items.filter((g) => {
          const haystack = [g.cliente.nombre, g.numeroCotizacion, g.cliente.agente, g.observacionSeguimiento]
            .join(" ").toLowerCase();
          return haystack.includes(q);
        })
      : items;

    const out: Record<EstadoCRM, CotizacionGuardada[]> = {
      nueva: [], esperando_cliente: [], requiere_accion: [], confirmada: [], perdida: [],
    };
    for (const g of filtered) {
      const col = g.estadoCRM ?? "nueva";
      out[col].push(g);
    }
    // Sort each bucket by recency / urgency
    for (const col of Object.keys(out) as EstadoCRM[]) {
      out[col].sort((a, b) => {
        if (col === "requiere_accion") {
          return daysSince(a.ultimoSeguimiento ?? a.fechaCreacion) - daysSince(b.ultimoSeguimiento ?? b.fechaCreacion);
        }
        return new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime();
      });
    }
    return out;
  }, [items, query]);

  // ─── CRM actions ──────────────────────────────────────────────────────────

  const markAtendida = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, {
      ultimoSeguimiento: new Date().toISOString(),
      recordatorio: undefined,
      historial: [
        { fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: "Marcado como atendido" },
        ...(g.historial ?? []),
      ].slice(0, 50),
    });
  };

  const posponer = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, {
      ultimoSeguimiento: new Date().toISOString(),
      recordatorio: addDaysStr(1),
      historial: [
        { fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: "Pospuesto 1 día" },
        ...(g.historial ?? []),
      ].slice(0, 50),
    });
  };

  return (
    <div className="space-y-4">

      {/* ── KPI Cards ──────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
        <KpiCard label="Activas" value={kpi.activas} color="bg-blue-50 text-blue-600" icon={<TrendingUp className="w-5 h-5" />} />
        <KpiCard label="Acción hoy" value={kpi.accionHoy} color="" iconStyle={{ backgroundColor: "#fdf3e0", color: "#e6ae33" }} icon={<Calendar className="w-5 h-5" />} />
        <KpiCard label="Seguimiento pendiente" value={kpi.seguimientosPendientes} color="bg-amber-50 text-amber-600" icon={<Bell className="w-5 h-5" />} />
        <KpiCard label="Confirmadas" value={kpi.confirmadas} color="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 className="w-5 h-5" />} />
        <KpiCard label="Ventas del mes" value={kpi.ventasMes} color="bg-violet-50 text-violet-600" icon={<Star className="w-5 h-5" />} />
      </div>

      {/* ── Requieren atención hoy ─────────────────────────────────────────── */}
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
          <div>
            <div className="text-sm font-bold text-slate-900">Requieren atención hoy</div>
            <div className="text-[11px] text-slate-400 mt-0.5">Cotizaciones que necesitan seguimiento inmediato</div>
          </div>
          {atencionItems.length > 0 && (
            <span
              className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white"
              style={{ background: "#E6AE33" }}
            >
              {atencionItems.length}
            </span>
          )}
        </div>

        {atencionItems.length === 0 ? (
          <div className="flex flex-col items-center py-10 gap-2">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            <div className="text-sm font-semibold text-slate-700">Todo al día</div>
            <div className="text-xs text-slate-400">No tienes cotizaciones pendientes por atender.</div>
          </div>
        ) : (
          <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
            {atencionItems.map((g) => (
              <AtencionCard
                key={g.id}
                g={g}
                onView={() => onView(g)}
                onAtender={() => markAtendida(g)}
                onPosponer={() => posponer(g)}
                onCRM={() => setCrmModal(g)}
              />
            ))}
          </div>
        )}
      </div>

      {/* ── Search + Export bar ────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={() => setShowSearch((v) => !v)}
          className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-sm transition-colors ${showSearch ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}
        >
          <Search className="w-4 h-4" />
          Buscar
        </button>
        {showSearch && (
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Buscar agencia, código, agente…"
            autoFocus
            className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400"
          />
        )}
        <div className="flex-1" />
        {items.length > 0 && (
          <button
            type="button"
            onClick={() => exportarCotizacionesExcel(items)}
            className="flex items-center gap-2 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors"
          >
            <FileDown className="w-4 h-4" />
            <span className="hidden sm:inline">Exportar Excel</span>
          </button>
        )}
      </div>

      {/* ── Kanban Board ────────────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
          <ListChecks className="w-10 h-10 mx-auto text-slate-300 mb-3" />
          <div className="text-sm text-slate-700 font-medium">No hay cotizaciones aún</div>
          <div className="text-xs text-slate-500 mt-1">Crea una cotización y guárdala para verla aquí.</div>
        </div>
      ) : (
        <div className="overflow-x-auto pb-2 -mx-1 px-1">
          <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, minmax(200px, 1fr))", minWidth: 1060 }}>
            {KANBAN_COLUMNS.map((col) => (
              <KanbanColumn
                key={col.id}
                col={col}
                items={kanbanBuckets[col.id]}
                onView={onView}
                onCRM={setCrmModal}
              />
            ))}
          </div>
        </div>
      )}

      {/* ── CRM Modal ───────────────────────────────────────────────────────── */}
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
