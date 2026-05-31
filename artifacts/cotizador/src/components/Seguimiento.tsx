import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
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
  ExternalLink,
  MoreHorizontal,
  XCircle,
  RotateCcw,
  Building2,
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
import { loadAgencias, type Agencia } from "@/lib/agencias";

interface Props {
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onEdit: (g: CotizacionGuardada) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
}

// ─── Configs ──────────────────────────────────────────────────────────────────

interface TipoAccionMeta { label: string; Icon: typeof Phone; color: string; bg: string }

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

const PRIORIDAD_STYLES: Record<Prioridad, { bg: string }> = {
  alta:  { bg: "bg-red-50 text-red-700 ring-1 ring-red-200"        },
  media: { bg: "bg-amber-50 text-amber-700 ring-1 ring-amber-200"  },
  baja:  { bg: "bg-slate-100 text-slate-500 ring-1 ring-slate-200" },
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
  id: EstadoCRM; label: string; borderColor: string; dotColor: string;
  bgHeader: string; badgeBg: string; badgeText: string; initialsColor: string;
}

const KANBAN_COLUMNS: KanbanColConfig[] = [
  { id: "nueva",             label: "Nuevas",      borderColor: "#004FBB", dotColor: "#004FBB", bgHeader: "#eff6ff", badgeBg: "#dbeafe", badgeText: "#1d4ed8", initialsColor: "#004FBB" },
  { id: "esperando_cliente", label: "Enviadas",    borderColor: "#0ea5e9", dotColor: "#0ea5e9", bgHeader: "#f0f9ff", badgeBg: "#e0f2fe", badgeText: "#0369a1", initialsColor: "#0ea5e9" },
  { id: "requiere_accion",   label: "Seguimiento", borderColor: "#E6AE33", dotColor: "#E6AE33", bgHeader: "#fffbeb", badgeBg: "#fef3c7", badgeText: "#92400e", initialsColor: "#b45309" },
  { id: "confirmada",        label: "Confirmadas", borderColor: "#03A04E", dotColor: "#03A04E", bgHeader: "#f0fdf4", badgeBg: "#dcfce7", badgeText: "#15803d", initialsColor: "#03A04E" },
  { id: "perdida",           label: "Perdidas",    borderColor: "#94a3b8", dotColor: "#94a3b8", bgHeader: "#f8fafc", badgeBg: "#f1f5f9", badgeText: "#475569", initialsColor: "#94a3b8" },
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
  return d.getFullYear() === today.getFullYear() && d.getMonth() === today.getMonth() && d.getDate() === today.getDate();
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
  if (dv !== null && dv <= 0) return { text: "Vigencia vencida", urgent: true };
  if (dv === 1) return { text: "Vence mañana", urgent: true };
  if (isDateToday(g.recordatorio)) return { text: "Recordatorio hoy", urgent: false };
  const days = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
  if (days >= 3) return { text: `Sin seguimiento hace ${days} días`, urgent: days >= 7 };
  return { text: "Requiere atención", urgent: false };
}

// Agency name from cliente (stored in correo field)
function agencyName(g: CotizacionGuardada): string {
  return g.cliente.correo || g.cliente.nombre || "(sin nombre)";
}

// ─── KPI Card ─────────────────────────────────────────────────────────────────

function KpiCard({ label, value, color, icon, iconStyle }: {
  label: string; value: number; color: string;
  icon: React.ReactNode; iconStyle?: React.CSSProperties;
}) {
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm p-4 flex items-start gap-3">
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 ${color}`} style={iconStyle}>{icon}</div>
      <div className="min-w-0">
        <div className="text-2xl font-bold text-slate-900 leading-tight tabular-nums">{value}</div>
        <div className="text-xs font-medium text-slate-600 leading-tight mt-0.5">{label}</div>
      </div>
    </div>
  );
}

// ─── CRM Modal ────────────────────────────────────────────────────────────────

function CrmModal({ g, onClose, onSave }: {
  g: CotizacionGuardada; onClose: () => void;
  onSave: (patch: Partial<CotizacionGuardada>) => void;
}) {
  const currentEstado: EstadoCRM = g.estadoCRM ?? "nueva";
  const isManualState = currentEstado === "confirmada" || currentEstado === "perdida";
  const [estadoManual, setEstadoManual] = useState<"confirmada" | "perdida" | null>(isManualState ? currentEstado : null);
  const [prioridad, setPrioridad] = useState<Prioridad>(g.prioridad ?? "media");
  const [observacionSeguimiento, setObservacionSeguimiento] = useState(g.observacionSeguimiento ?? g.proximaAccion ?? "");
  const [notaInterna, setNotaInterna] = useState(g.notaInterna ?? "");
  const [recordatorio, setRecordatorio] = useState(g.recordatorio?.slice(0, 10) ?? "");
  const [tab, setTab] = useState<"crm" | "historial">("crm");

  const handleSave = () => {
    const resolvedEstado: EstadoCRM = estadoManual ?? currentEstado;
    const newEntry: ActividadEntry = { fecha: new Date().toISOString(), tipo: "estado_cambiado", detalle: `Actualizado · estado: ${ESTADO_CRM_OPTIONS.find((o) => o.value === resolvedEstado)?.label ?? resolvedEstado}${notaInterna.trim() ? ` · Nota: ${notaInterna.trim().slice(0, 60)}` : ""}` };
    onSave({ estadoCRM: resolvedEstado, prioridad, recordatorio: recordatorio || undefined, observacionSeguimiento: observacionSeguimiento.trim() || undefined, notaInterna: notaInterna.trim() || undefined, ultimoSeguimiento: new Date().toISOString(), historial: [newEntry, ...(g.historial ?? [])].slice(0, 50) });
    onClose();
  };

  const autoStateInfo = ESTADO_CRM_OPTIONS.find((o) => o.value === currentEstado);
  const autoStateStyle = ESTADO_CRM_STYLES[currentEstado];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[92vh]">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <div className="font-semibold text-slate-900">{agencyName(g)}</div>
            <div className="text-xs text-slate-500 mt-0.5">{g.numeroCotizacion} · {g.cliente.agente}</div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>
        <div className="flex border-b border-slate-100 px-5">
          {(["crm", "historial"] as const).map((t) => (
            <button key={t} type="button" onClick={() => setTab(t)} className={`py-3 px-1 mr-5 text-sm font-medium border-b-2 transition-colors ${tab === t ? "border-primary text-primary" : "border-transparent text-slate-500 hover:text-slate-700"}`}>
              {t === "crm" ? "Seguimiento" : `Historial${g.historial && g.historial.length > 0 ? ` (${g.historial.length})` : ""}`}
            </button>
          ))}
        </div>
        <div className="overflow-y-auto flex-1">
          {tab === "crm" ? (
            <div className="p-5 space-y-5">
              <div>
                <div className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Estado actual (automático)</div>
                <div className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold ring-1 ${autoStateStyle.bg} ${autoStateStyle.text} ${autoStateStyle.ring}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${autoStateStyle.dot}`} />{autoStateInfo?.label ?? currentEstado}{autoStateInfo?.auto && <span className="text-[10px] opacity-60 ml-1">· auto</span>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Resultado final</label>
                <div className="flex gap-2">
                  <button type="button" onClick={() => setEstadoManual(estadoManual === "confirmada" ? null : "confirmada")} className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ring-1 ${estadoManual === "confirmada" ? "bg-emerald-50 text-emerald-700 ring-emerald-300 shadow-sm" : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-emerald-50/60 hover:text-emerald-600"}`}><CheckCircle2 className="w-4 h-4" />✅ Venta confirmada</button>
                  <button type="button" onClick={() => setEstadoManual(estadoManual === "perdida" ? null : "perdida")} className={`flex items-center gap-2 flex-1 justify-center px-3 py-2.5 rounded-xl text-xs font-semibold transition-all ring-1 ${estadoManual === "perdida" ? "bg-slate-100 text-slate-600 ring-slate-300 shadow-sm" : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"}`}>❌ Marcar perdida</button>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Recordarme</label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {[{ label: "Mañana", days: 1 }, { label: "En 3 días", days: 3 }, { label: "En 1 semana", days: 7 }].map(({ label, days }) => {
                    const target = addDaysStr(days);
                    const active = recordatorio === target;
                    return (
                      <button key={days} type="button" onClick={() => setRecordatorio(active ? "" : target)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1 ${active ? "bg-primary/10 text-primary ring-primary/30 shadow-sm" : "bg-slate-50 text-slate-500 ring-slate-200 hover:bg-slate-100"}`}>{label}</button>
                    );
                  })}
                </div>
                <div className="flex items-center gap-2">
                  <input type="date" value={recordatorio} onChange={(e) => setRecordatorio(e.target.value)} className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary" />
                  {recordatorio && <button type="button" onClick={() => setRecordatorio("")} className="text-slate-400 hover:text-slate-600"><X className="w-4 h-4" /></button>}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Prioridad</label>
                <div className="flex gap-2">
                  {PRIORIDAD_OPTIONS.map((o) => (
                    <button key={o.value} type="button" onClick={() => setPrioridad(o.value)} className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1 ${prioridad === o.value ? PRIORIDAD_STYLES[o.value].bg : "bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100"}`}>{o.label}</button>
                  ))}
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Observación de seguimiento</label>
                <input type="text" value={observacionSeguimiento} onChange={(e) => setObservacionSeguimiento(e.target.value)} placeholder="Ej: Cliente confirma interés, pendiente de fechas…" className="w-full h-9 px-3 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400" />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Nota interna</label>
                <textarea value={notaInterna} onChange={(e) => setNotaInterna(e.target.value)} placeholder="Ej: Cliente quiere hotel 4*, pendiente pago…" rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none" />
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
                        <div className="w-7 h-7 rounded-full bg-white ring-2 ring-slate-200 flex items-center justify-center shrink-0 z-10"><ActivityIcon tipo={entry.tipo} /></div>
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
            <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
            <button type="button" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium"><Save className="w-3.5 h-3.5" />Guardar</button>
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

// ─── Logo Avatar ──────────────────────────────────────────────────────────────

function LogoOrInitials({ agencia, initials, color, size = 36 }: {
  agencia?: Agencia; initials: string; color: string; size?: number;
}) {
  if (agencia?.logoUrl) {
    return (
      <div className="bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0" style={{ width: size, height: size, borderRadius: 10 }}>
        <img src={agencia.logoUrl} alt="" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center font-bold text-white shrink-0" style={{ width: size, height: size, borderRadius: 10, background: color, fontSize: size * 0.33 }}>
      {initials}
    </div>
  );
}

// ─── Attention cards ──────────────────────────────────────────────────────────

function AtencionCard({ g, agencia, onView, onAtender, onPosponer }: {
  g: CotizacionGuardada; agencia?: Agencia;
  onView: () => void; onAtender: () => void; onPosponer: () => void;
}) {
  const motivo = getMotivoAlerta(g);
  const valor = g.valorCotizacion;
  const phone = g.cliente.whatsapp?.replace(/[^0-9+]/g, "");
  const agency = agencyName(g);
  const initials = getInitials(agency);
  const dateLabel = g.cliente.fechaInicio ? `Viaje: ${formatShortDate(g.cliente.fechaInicio)}` : g.cliente.vigencia ? `Vigencia: ${formatShortDate(g.cliente.vigencia)}` : "";

  return (
    <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-col gap-3 min-w-[220px]" style={{ border: `1px solid ${motivo.urgent ? "#fca5a5" : "#fde68a"}` }}>
      <div className="flex items-start gap-2">
        <LogoOrInitials agencia={agencia} initials={initials} color="#004FBB" size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-bold text-slate-900 truncate leading-tight">{agency}</div>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {g.numeroCotizacion && <span className="text-[10px] text-slate-400 font-mono">{g.numeroCotizacion}</span>}
            {valor != null && valor > 0 && <span className="text-[10px] font-bold text-slate-500">· {fmtMoney(valor)}</span>}
            {dateLabel && <span className="text-[10px] text-slate-400">· {dateLabel}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: motivo.urgent ? "#fee2e2" : "rgba(230,174,51,0.1)", color: motivo.urgent ? "#991b1b" : "#92400e" }}>
        {motivo.urgent ? <AlertTriangle className="w-3.5 h-3.5 shrink-0" /> : <AlarmClock className="w-3.5 h-3.5 shrink-0" />}
        {motivo.text}
      </div>
      <div className="flex flex-wrap gap-1.5">
        <button type="button" onClick={onView} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold" style={{ background: "#004FBB" }}>
          <ExternalLink className="w-3 h-3" />Abrir
        </button>
        {phone && (
          <a href={`https://wa.me/${phone}`} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: "#f0fdf4", color: "#03A04E", border: "1px solid #bbf7d0" }}>
            <MessageCircle className="w-3 h-3" />WhatsApp
          </a>
        )}
        <button type="button" onClick={onAtender} className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 text-[11px] font-semibold" style={{ border: "1px solid #a7f3d0" }}>
          <CheckCircle2 className="w-3 h-3" />Atendida
        </button>
        <button type="button" onClick={onPosponer} className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold" style={{ background: "rgba(230,174,51,0.08)", color: "#92400e", border: "1px solid rgba(230,174,51,0.35)" }}>
          <AlarmClock className="w-3 h-3" />Posponer
        </button>
      </div>
    </div>
  );
}

// ─── ⋯ Menu item ──────────────────────────────────────────────────────────────

function MenuItem({ icon, label, onClick, danger = false }: {
  icon: React.ReactNode; label: string; onClick: () => void; danger?: boolean;
}) {
  return (
    <button type="button" onClick={onClick} className={`w-full flex items-center gap-2.5 px-3.5 py-2 text-[12px] font-medium transition-colors ${danger ? "text-red-600 hover:bg-red-50" : "text-slate-700 hover:bg-slate-50"}`}>
      {icon}{label}
    </button>
  );
}

// ─── Mini Kanban card ─────────────────────────────────────────────────────────

function MiniKanbanCard({ g, col, agencia, onView, onEdit, onDuplicate, onCRM, onUpdateCRM, onAnular }: {
  g: CotizacionGuardada; col: KanbanColConfig; agencia?: Agencia;
  onView: () => void; onEdit: () => void; onDuplicate?: () => void;
  onCRM: () => void; onUpdateCRM: (patch: Partial<CotizacionGuardada>) => void;
  onAnular: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      setMenuPos({ top: rect.bottom + 6, right: window.innerWidth - rect.right });
      setMenuOpen(true);
    }
  };

  useEffect(() => {
    if (!menuOpen) return;
    const handler = (e: MouseEvent) => {
      if (menuBtnRef.current?.contains(e.target as Node) || menuRef.current?.contains(e.target as Node)) return;
      setMenuOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [menuOpen]);

  const close = () => setMenuOpen(false);

  const agency = agencyName(g);
  const initials = getInitials(agency);
  const valor = g.valorCotizacion;
  const sinActividad = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
  const showSinActividad = col.id === "requiere_accion" && sinActividad >= 3;

  return (
    <div className="bg-white rounded-xl ring-1 ring-slate-100 p-3 hover:ring-slate-200 hover:shadow-sm transition-all">
      {/* Logo + Agency info */}
      <div className="flex items-start gap-2 mb-2.5">
        <LogoOrInitials agencia={agencia} initials={initials} color={col.initialsColor} size={36} />
        <div className="flex-1 min-w-0">
          <div className="text-[12px] font-bold text-slate-900 truncate leading-tight">{agency}</div>
          <div className="flex items-center gap-1 flex-wrap mt-0.5">
            {g.numeroCotizacion && <span className="text-[10px] text-slate-400 font-mono">{g.numeroCotizacion}</span>}
            {valor != null && valor > 0 && <span className="text-[10px] text-slate-500 font-semibold">· {fmtMoney(valor)}</span>}
          </div>
          {showSinActividad && (
            <div className="text-[10px] font-semibold mt-0.5" style={{ color: sinActividad >= 7 ? "#991b1b" : "#b45309" }}>
              {sinActividad} día{sinActividad !== 1 ? "s" : ""} sin actividad
            </div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <button type="button" onClick={onView} className="flex-1 flex items-center justify-center gap-1 h-7 rounded-lg text-white text-[11px] font-semibold hover:opacity-90 transition-opacity" style={{ background: "#004FBB" }}>
          <ExternalLink className="w-3 h-3" />Abrir
        </button>
        <button ref={menuBtnRef} type="button" onClick={openMenu} className="w-7 h-7 flex items-center justify-center rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors" title="Más acciones">
          <MoreHorizontal className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Portal menu */}
      {menuOpen && menuPos && createPortal(
        <div ref={menuRef} className="fixed bg-white rounded-xl shadow-xl py-1 min-w-[190px] z-[500]" style={{ top: menuPos.top, right: menuPos.right, border: "1px solid #e2e8f0" }}>
          <MenuItem icon={<Eye className="w-3.5 h-3.5" />} label="Abrir cotización" onClick={() => { onView(); close(); }} />
          <MenuItem icon={<Pencil className="w-3.5 h-3.5" />} label="Editar" onClick={() => { onEdit(); close(); }} />
          {onDuplicate && <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicar" onClick={() => { onDuplicate(); close(); }} />}
          <MenuItem icon={<MessageSquare className="w-3.5 h-3.5" />} label="Seguimiento / CRM" onClick={() => { onCRM(); close(); }} />
          <div className="h-px bg-slate-100 my-1" />
          <MenuItem icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />} label="Confirmar venta" onClick={() => { onUpdateCRM({ estadoCRM: "confirmada", ultimoSeguimiento: new Date().toISOString() }); close(); }} />
          <MenuItem icon={<XCircle className="w-3.5 h-3.5 text-slate-400" />} label="Marcar como perdida" onClick={() => { onUpdateCRM({ estadoCRM: "perdida", ultimoSeguimiento: new Date().toISOString() }); close(); }} />
          <div className="h-px bg-slate-100 my-1" />
          <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Anular / Eliminar" onClick={() => { onAnular(); close(); }} danger />
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Kanban Column ────────────────────────────────────────────────────────────

function KanbanColumn({ col, items, agenciasMap, onView, onEdit, onDuplicate, onCRM, onUpdateCRM, onAnular }: {
  col: KanbanColConfig; items: CotizacionGuardada[];
  agenciasMap: Map<string, Agencia>;
  onView: (g: CotizacionGuardada) => void; onEdit: (g: CotizacionGuardada) => void;
  onDuplicate?: (g: CotizacionGuardada) => void; onCRM: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
  onAnular: (g: CotizacionGuardada) => void;
}) {
  const [expanded, setExpanded] = useState(false);
  const PREVIEW = 5;
  const visible = expanded ? items : items.slice(0, PREVIEW);
  const hasMore = items.length > PREVIEW;

  return (
    <div className="flex flex-col bg-slate-50 rounded-2xl ring-1 ring-slate-200 overflow-visible min-w-[200px]" style={{ borderLeft: `3px solid ${col.borderColor}` }}>
      <div className="flex items-center justify-between px-3 py-2.5 rounded-tl-xl rounded-tr-xl" style={{ background: col.bgHeader }}>
        <span className="text-xs font-bold text-slate-700">{col.label}</span>
        <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full" style={{ background: col.badgeBg, color: col.badgeText }}>{items.length}</span>
      </div>
      <div className="flex-1 flex flex-col gap-2 p-2" style={{ minHeight: 80, maxHeight: 440, overflowY: "auto" }}>
        {visible.length === 0 ? (
          <div className="text-center py-6 text-[11px] text-slate-400">Sin cotizaciones</div>
        ) : visible.map((g) => (
          <MiniKanbanCard
            key={g.id} g={g} col={col}
            agencia={agenciasMap.get((g.cliente.correo || "").toLowerCase())}
            onView={() => onView(g)} onEdit={() => onEdit(g)}
            onDuplicate={onDuplicate ? () => onDuplicate(g) : undefined}
            onCRM={() => onCRM(g)}
            onUpdateCRM={(patch) => onUpdateCRM(g.id, patch)}
            onAnular={() => onAnular(g)}
          />
        ))}
      </div>
      {hasMore && (
        <button type="button" onClick={() => setExpanded((v) => !v)} className="flex items-center justify-center gap-1 text-[11px] font-semibold py-2 border-t border-slate-200 hover:opacity-80 transition-opacity" style={{ color: col.badgeText }}>
          {expanded ? "Ver menos" : `Ver todas (${items.length - PREVIEW} más)`}
          <ChevronDown className={`w-3 h-3 transition-transform ${expanded ? "rotate-180" : ""}`} />
        </button>
      )}
    </div>
  );
}

// ─── Anuladas View ────────────────────────────────────────────────────────────

function AnuladasView({ items, agenciasMap, onRestaurar }: {
  items: CotizacionGuardada[];
  agenciasMap: Map<string, Agencia>;
  onRestaurar: (g: CotizacionGuardada) => void;
}) {
  if (items.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
        <Trash2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
        <div className="text-sm font-medium text-slate-600">No hay cotizaciones anuladas</div>
        <div className="text-xs text-slate-400 mt-1">Las cotizaciones anuladas aparecen aquí para que puedas restaurarlas si es necesario.</div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <div className="text-sm font-bold text-slate-900">Anuladas / Eliminadas</div>
        <div className="text-xs text-slate-400 mt-0.5">{items.length} cotización{items.length !== 1 ? "es" : ""} · puedes restaurarlas</div>
      </div>
      <div className="divide-y divide-slate-50">
        {items.map((g) => {
          const agency = agencyName(g);
          const agencia = agenciasMap.get(agency.toLowerCase());
          const initials = getInitials(agency);
          return (
            <div key={g.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
              <LogoOrInitials agencia={agencia} initials={initials} color="#94a3b8" size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-700 truncate">{agency}</div>
                <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                  {g.numeroCotizacion && <span className="text-[11px] text-slate-400 font-mono">{g.numeroCotizacion}</span>}
                  {g.fechaAnulacion && <span className="text-[11px] text-slate-400">· Anulada {formatDate(g.fechaAnulacion)}</span>}
                </div>
              </div>
              <button type="button" onClick={() => onRestaurar(g)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-blue-100" style={{ background: "#eff6ff", color: "#004FBB" }}>
                <RotateCcw className="w-3 h-3" />Restaurar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function Seguimiento({ items, onView, onEdit, onDelete, onDuplicate, onUpdateCRM }: Props) {
  const [tab, setTab] = useState<"activas" | "anuladas">("activas");
  const [query, setQuery] = useState("");
  const [showSearch, setShowSearch] = useState(false);
  const [crmModal, setCrmModal] = useState<CotizacionGuardada | null>(null);
  const [agencias, setAgencias] = useState<Agencia[]>([]);

  useEffect(() => { setAgencias(loadAgencias()); }, []);

  const agenciasMap = useMemo(() => {
    const map = new Map<string, Agencia>();
    for (const a of agencias) map.set(a.nombre.toLowerCase(), a);
    return map;
  }, [agencias]);

  const activeItems = useMemo(() => items.filter((g) => !g.anulada), [items]);
  const anuladasItems = useMemo(() => items.filter((g) => g.anulada), [items]);

  // ─── KPI ──────────────────────────────────────────────────────────────────

  const kpi = useMemo(() => {
    const activas = activeItems.filter((g) => g.estadoCRM !== "confirmada" && g.estadoCRM !== "perdida").length;
    const accionHoy = activeItems.filter((g) => {
      if (g.estadoCRM === "confirmada" || g.estadoCRM === "perdida") return false;
      const dateStr = g.fechaProximaAccion ?? g.fechaRecordatorio;
      if (!dateStr) return false;
      return isDateToday(dateStr);
    }).length;
    const seguimientosPendientes = activeItems.filter((g) => {
      const estado = g.estadoCRM ?? "nueva";
      if (estado === "confirmada" || estado === "perdida") return false;
      return daysSince(g.ultimoSeguimiento ?? g.fechaCreacion) > 3;
    }).length;
    const confirmadas = activeItems.filter((g) => g.estadoCRM === "confirmada").length;
    const now = new Date();
    const ventasMes = activeItems.filter((g) => {
      if (g.estadoCRM !== "confirmada") return false;
      const d = new Date(g.ultimoSeguimiento ?? g.fechaCreacion);
      return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    }).length;
    return { activas, accionHoy, seguimientosPendientes, confirmadas, ventasMes };
  }, [activeItems]);

  // ─── Attention items ──────────────────────────────────────────────────────

  const atencionItems = useMemo(() => {
    return activeItems
      .filter((g) => {
        const estado = g.estadoCRM ?? "nueva";
        if (estado === "confirmada" || estado === "perdida") return false;
        const sinActividad = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
        const dv = daysUntil(g.cliente.vigencia);
        return sinActividad >= 3 || dv === 1 || isDateToday(g.recordatorio);
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
  }, [activeItems]);

  // ─── Kanban buckets ───────────────────────────────────────────────────────

  const kanbanBuckets = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = q
      ? activeItems.filter((g) => [agencyName(g), g.numeroCotizacion, g.cliente.agente, g.observacionSeguimiento].join(" ").toLowerCase().includes(q))
      : activeItems;
    const out: Record<EstadoCRM, CotizacionGuardada[]> = { nueva: [], esperando_cliente: [], requiere_accion: [], confirmada: [], perdida: [] };
    for (const g of filtered) out[g.estadoCRM ?? "nueva"].push(g);
    for (const col of Object.keys(out) as EstadoCRM[]) {
      out[col].sort((a, b) => col === "requiere_accion"
        ? daysSince(a.ultimoSeguimiento ?? a.fechaCreacion) - daysSince(b.ultimoSeguimiento ?? b.fechaCreacion)
        : new Date(b.fechaCreacion).getTime() - new Date(a.fechaCreacion).getTime()
      );
    }
    return out;
  }, [activeItems, query]);

  // ─── CRM actions ──────────────────────────────────────────────────────────

  const markAtendida = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, { ultimoSeguimiento: new Date().toISOString(), recordatorio: undefined, historial: [{ fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: "Marcado como atendido" }, ...(g.historial ?? [])].slice(0, 50) });
  };

  const posponer = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, { ultimoSeguimiento: new Date().toISOString(), recordatorio: addDaysStr(1), historial: [{ fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: "Pospuesto 1 día" }, ...(g.historial ?? [])].slice(0, 50) });
  };

  const onAnular = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, { anulada: true, fechaAnulacion: new Date().toISOString(), historial: [{ fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: "Cotización anulada" }, ...(g.historial ?? [])].slice(0, 50) });
  };

  const onRestaurar = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, { anulada: false, fechaAnulacion: undefined, historial: [{ fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: "Cotización restaurada" }, ...(g.historial ?? [])].slice(0, 50) });
  };

  return (
    <div className="space-y-4">

      {/* ── Tab toggle ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white rounded-xl ring-1 ring-slate-100 p-1 shadow-sm w-fit">
        <button type="button" onClick={() => setTab("activas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "activas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Activas
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "activas" ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{activeItems.length}</span>
        </button>
        <button type="button" onClick={() => setTab("anuladas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "anuladas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Anuladas
          {anuladasItems.length > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "anuladas" ? "bg-white/20" : "bg-red-50 text-red-500"}`}>{anuladasItems.length}</span>}
        </button>
      </div>

      {tab === "anuladas" ? (
        <AnuladasView items={anuladasItems} agenciasMap={agenciasMap} onRestaurar={onRestaurar} />
      ) : (
        <>
          {/* ── KPI Cards ────────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Activas" value={kpi.activas} color="bg-blue-50 text-blue-600" icon={<TrendingUp className="w-5 h-5" />} />
            <KpiCard label="Acción hoy" value={kpi.accionHoy} color="" iconStyle={{ backgroundColor: "#fdf3e0", color: "#e6ae33" }} icon={<Calendar className="w-5 h-5" />} />
            <KpiCard label="Seguimiento pendiente" value={kpi.seguimientosPendientes} color="bg-amber-50 text-amber-600" icon={<Bell className="w-5 h-5" />} />
            <KpiCard label="Confirmadas" value={kpi.confirmadas} color="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 className="w-5 h-5" />} />
            <KpiCard label="Ventas del mes" value={kpi.ventasMes} color="bg-violet-50 text-violet-600" icon={<Star className="w-5 h-5" />} />
          </div>

          {/* ── Requieren atención hoy ───────────────────────────────────────── */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
            <div className="flex items-center justify-between px-5 py-3.5 border-b border-slate-100">
              <div>
                <div className="text-sm font-bold text-slate-900">Requieren atención hoy</div>
                <div className="text-[11px] text-slate-400 mt-0.5">Cotizaciones que necesitan seguimiento inmediato</div>
              </div>
              {atencionItems.length > 0 && <span className="text-[11px] font-bold px-2 py-0.5 rounded-full text-white" style={{ background: "#E6AE33" }}>{atencionItems.length}</span>}
            </div>
            {atencionItems.length === 0 ? (
              <div className="flex flex-col items-center py-8 gap-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div className="text-sm font-semibold text-slate-700">Todo al día</div>
                <div className="text-xs text-slate-400">No tienes cotizaciones pendientes por atender.</div>
              </div>
            ) : (
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-3">
                {atencionItems.map((g) => (
                  <AtencionCard key={g.id} g={g} agencia={agenciasMap.get((g.cliente.correo || "").toLowerCase())} onView={() => onView(g)} onAtender={() => markAtendida(g)} onPosponer={() => posponer(g)} />
                ))}
              </div>
            )}
          </div>

          {/* ── Search + Export ──────────────────────────────────────────────── */}
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setShowSearch((v) => !v)} className={`flex items-center gap-2 h-9 px-3 rounded-xl border text-sm transition-colors ${showSearch ? "border-primary bg-primary/5 text-primary" : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50"}`}>
              <Search className="w-4 h-4" />Buscar
            </button>
            {showSearch && (
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar agencia, código, agente…" autoFocus className="flex-1 h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400" />
            )}
            <div className="flex-1" />
            {items.length > 0 && (
              <button type="button" onClick={() => exportarCotizacionesExcel(activeItems)} className="flex items-center gap-2 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
                <FileDown className="w-4 h-4" />
                <span className="hidden sm:inline">Exportar Excel</span>
              </button>
            )}
          </div>

          {/* ── Kanban Board ─────────────────────────────────────────────────── */}
          {activeItems.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
              <ListChecks className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <div className="text-sm text-slate-700 font-medium">No hay cotizaciones aún</div>
              <div className="text-xs text-slate-500 mt-1">Crea una cotización y guárdala para verla aquí.</div>
            </div>
          ) : (
            <div className="overflow-x-auto pb-2 -mx-1 px-1">
              <div className="grid gap-3" style={{ gridTemplateColumns: "repeat(5, minmax(200px, 1fr))", minWidth: 1060 }}>
                {KANBAN_COLUMNS.map((col) => (
                  <KanbanColumn key={col.id} col={col} items={kanbanBuckets[col.id]} agenciasMap={agenciasMap} onView={onView} onEdit={onEdit} onDuplicate={onDuplicate} onCRM={setCrmModal} onUpdateCRM={onUpdateCRM} onAnular={onAnular} />
                ))}
              </div>
            </div>
          )}
        </>
      )}

      {/* ── CRM Modal ─────────────────────────────────────────────────────── */}
      {crmModal && (
        <CrmModal g={crmModal} onClose={() => setCrmModal(null)} onSave={(patch) => { onUpdateCRM(crmModal.id, patch); setCrmModal(null); }} />
      )}
    </div>
  );
}
