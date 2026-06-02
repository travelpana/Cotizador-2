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
  guardado_manual:  "Guardado manualmente",
  duplicada:        "Cotización duplicada",
  confirmada:       "Cotización confirmada",
  nota_agregada:    "Nota interna agregada",
  estado_cambiado:  "Estado actualizado",
};

// ─── Urgency semáforo ─────────────────────────────────────────────────────────

type UrgencyLevel = "red" | "yellow" | "green";

function getUrgency(g: CotizacionGuardada): UrgencyLevel {
  const days = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
  if (days >= 7) return "red";
  if (days >= 4) return "yellow";
  return "green";
}

function urgencySortKey(g: CotizacionGuardada): number {
  const u = getUrgency(g);
  const uMap: Record<UrgencyLevel, number> = { red: 1, yellow: 2, green: 3 };
  const pMap: Record<string, number> = { alta: 0, media: 1, baja: 2 };
  const hasPrioAlta = g.prioridad === "alta" ? 0 : 1;
  return hasPrioAlta * 100 + uMap[u] * 10 + (pMap[g.prioridad ?? "media"] ?? 1);
}

const URGENCY_META: Record<UrgencyLevel, { label: string; color: string; bg: string; dot: string }> = {
  red:    { label: "Urgente",              color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  yellow: { label: "Requiere seguimiento", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  green:  { label: "Al día",              color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
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

function LogoOrInitials({ agencia, initials, color, size = 36, radius }: {
  agencia?: Agencia; initials: string; color: string; size?: number; radius?: number;
}) {
  const br = radius ?? (size >= 44 ? 14 : 10);
  if (agencia?.logoUrl) {
    return (
      <div className="bg-white border border-slate-200 flex items-center justify-center overflow-hidden shrink-0" style={{ width: size, height: size, borderRadius: br }}>
        <img src={agencia.logoUrl} alt="" className="w-full h-full object-contain" />
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center font-bold text-white shrink-0" style={{ width: size, height: size, borderRadius: br, background: color, fontSize: size * 0.33 }}>
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

// ─── Opportunity Card ─────────────────────────────────────────────────────────

function OpportunityCard({ g, agencia, onView, onEdit, onDuplicate, onCRM, onUpdateCRM, onAnular }: {
  g: CotizacionGuardada; agencia?: Agencia;
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
      const MENU_HEIGHT = 220;
      const openUp = rect.bottom + 6 + MENU_HEIGHT > window.innerHeight;
      setMenuPos({ top: openUp ? rect.top - MENU_HEIGHT : rect.bottom + 6, right: window.innerWidth - rect.right });
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

  const urgency = getUrgency(g);
  const uMeta = URGENCY_META[urgency];
  const sinActividad = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
  const agencyLabel = agencyName(g);
  const cotNombre = g.cliente.cotizacionNombre?.trim() || g.cliente.nombre?.trim() || "Sin nombre";
  const initials = getInitials(agencyLabel || cotNombre);
  const destino = g.destinoSeguimiento?.trim();
  const valor = g.valorCotizacion;
  const estadoStyle = ESTADO_CRM_STYLES[g.estadoCRM ?? "nueva"];
  const estadoLabel = ESTADO_CRM_OPTIONS.find((o) => o.value === (g.estadoCRM ?? "nueva"))?.label ?? "Nueva";

  const paxLabel = [
    g.cliente.pasajeros > 0 ? `${g.cliente.pasajeros} adulto${g.cliente.pasajeros !== 1 ? "s" : ""}` : null,
    g.cliente.ninos > 0 ? `${g.cliente.ninos} niño${g.cliente.ninos !== 1 ? "s" : ""}` : null,
  ].filter(Boolean).join(" + ");

  const acomLabel = g.acomodaciones?.length > 0
    ? [...new Set(g.acomodaciones.map((a) => a.tipo))].join(" / ")
    : null;

  const isConfirmedOrLost = g.estadoCRM === "confirmada" || g.estadoCRM === "perdida";

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-stretch gap-0 px-5 py-4">

        {/* ── Left: identity ─────────────────────────────────────────── */}
        <div className="flex items-start gap-3 flex-1 min-w-0 pr-5" style={{ borderRight: "1px solid #f1f5f9" }}>
          <div className="shrink-0 mt-0.5">
            <LogoOrInitials agencia={agencia} initials={initials} color="#004FBB" size={44} radius={12} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="font-bold text-slate-900 truncate leading-tight" style={{ fontSize: 14 }}>{cotNombre}</div>
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {agencyLabel}{destino ? ` · ${destino}` : ""}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {paxLabel && (
                <span className="text-[11px] text-slate-500 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-slate-300 inline-block" />
                  {paxLabel}
                </span>
              )}
              {acomLabel && (
                <span className="text-[11px] text-slate-400">{acomLabel}</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${estadoStyle.bg} ${estadoStyle.text} ${estadoStyle.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${estadoStyle.dot}`} />{estadoLabel}
              </span>
              {g.prioridad === "alta" && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-red-50 text-red-700 ring-1 ring-red-200">
                  <Flame className="w-2.5 h-2.5" />Alta prioridad
                </span>
              )}
            </div>
          </div>
        </div>

        {/* ── Center: value ──────────────────────────────────────────── */}
        <div className="flex flex-col justify-center items-center px-6 shrink-0" style={{ borderRight: "1px solid #f1f5f9", minWidth: 140 }}>
          {valor != null && valor > 0 ? (
            <div className="text-center">
              <div style={{ fontSize: 22, fontWeight: 800, color: "#004FBB", letterSpacing: "-0.03em", lineHeight: 1 }}>
                USD {valor.toLocaleString("es-ES", { maximumFractionDigits: 0 })}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Total cotización</div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 text-center">Sin valor</div>
          )}
          {g.numeroCotizacion && (
            <div className="text-[10px] font-mono text-slate-400 mt-2">{g.numeroCotizacion}</div>
          )}
          <button type="button" onClick={onView} className="mt-2 text-[11px] font-semibold underline-offset-2 hover:underline transition-colors" style={{ color: "#004FBB" }}>
            Ver cotización
          </button>
        </div>

        {/* ── Right: urgency + actions ────────────────────────────────── */}
        <div className="flex flex-col justify-between items-end pl-5 shrink-0" style={{ minWidth: 168 }}>
          {/* Semáforo */}
          {!isConfirmedOrLost ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: uMeta.bg, color: uMeta.color }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: uMeta.dot }} />
                {uMeta.label}
              </div>
              <div className="text-[11px] text-slate-500 text-right">
                {sinActividad === 0 ? "Actualizado hoy" : `${sinActividad} día${sinActividad !== 1 ? "s" : ""} sin actualización`}
              </div>
              {g.ultimoSeguimiento && (
                <div className="text-[10px] text-slate-400 text-right">
                  Últ. act.: {formatShortDate(g.ultimoSeguimiento)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              {g.estadoCRM === "confirmada" ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" />Confirmada
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                  <XCircle className="w-3 h-3" />Perdida
                </span>
              )}
              {g.ultimoSeguimiento && (
                <div className="text-[10px] text-slate-400 text-right">
                  {formatDate(g.ultimoSeguimiento)}
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 mt-3">
            <button type="button" onClick={onView} className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-[12px] font-semibold hover:opacity-90 transition-opacity" style={{ background: "#004FBB" }}>
              <ExternalLink className="w-3 h-3" />Abrir
            </button>
            <button ref={menuBtnRef} type="button" onClick={openMenu} className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Portal menu */}
      {menuOpen && menuPos && createPortal(
        <div ref={menuRef} className="fixed bg-white rounded-xl shadow-xl py-1 min-w-[200px] z-[9999]" style={{ top: menuPos.top, right: menuPos.right, border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)" }}>
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

type VerPor = "urgencia" | "agencia" | "estado";

export default function Seguimiento({ items, onView, onEdit, onDelete, onDuplicate, onUpdateCRM }: Props) {
  const [tab, setTab] = useState<"activas" | "anuladas">("activas");
  const [query, setQuery] = useState("");
  const [verPor, setVerPor] = useState<VerPor>("urgencia");
  const [filterEstado, setFilterEstado] = useState<EstadoCRM | "todas">("todas");
  const [filterPrioridad, setFilterPrioridad] = useState<"todas" | "alta" | "media" | "baja">("todas");
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

  // ─── Metrics ──────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const open = activeItems.filter((g) => g.estadoCRM !== "confirmada" && g.estadoCRM !== "perdida");
    return {
      total: activeItems.length,
      prioritarias: open.filter((g) => g.prioridad === "alta").length,
      urgentes: open.filter((g) => getUrgency(g) === "red").length,
      requierenSeg: open.filter((g) => getUrgency(g) === "yellow").length,
      alDia: open.filter((g) => getUrgency(g) === "green").length,
    };
  }, [activeItems]);

  // ─── Filtered + sorted list ───────────────────────────────────────────────

  const listItems = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = activeItems;

    if (q) {
      filtered = filtered.filter((g) =>
        [agencyName(g), g.numeroCotizacion, g.cliente.agente, g.cliente.cotizacionNombre, g.cliente.nombre, g.observacionSeguimiento, g.destinoSeguimiento]
          .join(" ").toLowerCase().includes(q)
      );
    }
    if (filterEstado !== "todas") {
      filtered = filtered.filter((g) => (g.estadoCRM ?? "nueva") === filterEstado);
    }
    if (filterPrioridad !== "todas") {
      filtered = filtered.filter((g) => (g.prioridad ?? "media") === filterPrioridad);
    }

    return [...filtered].sort((a, b) => {
      if (verPor === "agencia") {
        const cmp = agencyName(a).localeCompare(agencyName(b), "es");
        if (cmp !== 0) return cmp;
      }
      const sk = urgencySortKey(a) - urgencySortKey(b);
      if (sk !== 0) return sk;
      return new Date(a.fechaCreacion).getTime() - new Date(b.fechaCreacion).getTime();
    });
  }, [activeItems, query, filterEstado, filterPrioridad, verPor]);

  // ─── CRM actions ──────────────────────────────────────────────────────────

  const onAnular = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, { anulada: true, fechaAnulacion: new Date().toISOString(), historial: [{ fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: "Cotización anulada" }, ...(g.historial ?? [])].slice(0, 50) });
  };

  const onRestaurar = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, { anulada: false, fechaAnulacion: undefined, historial: [{ fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: "Cotización restaurada" }, ...(g.historial ?? [])].slice(0, 50) });
  };

  const inputCls = "h-9 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400";
  const selectCls = `${inputCls} pr-8 appearance-none`;

  return (
    <div className="space-y-5">

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="font-bold text-slate-900" style={{ fontSize: 22, letterSpacing: "-0.02em" }}>Seguimiento de oportunidades</h2>
          <p className="text-sm text-slate-500 mt-0.5">Administra y da seguimiento a tus oportunidades comerciales</p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          {activeItems.length > 0 && (
            <button type="button" onClick={() => exportarCotizacionesExcel(activeItems)} className="flex items-center gap-2 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
              <FileDown className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
            </button>
          )}
          <button type="button" onClick={() => { }} className="flex items-center gap-2 h-9 px-4 rounded-xl text-white text-sm font-semibold transition-colors" style={{ background: "#004FBB" }}>
            <span className="text-base leading-none">+</span> Nueva oportunidad
          </button>
        </div>
      </div>

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
          {/* ── Metrics bar ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Total oportunidades" value={metrics.total} color="bg-blue-50 text-blue-600" icon={<TrendingUp className="w-5 h-5" />} />
            <KpiCard label="Prioritarias" value={metrics.prioritarias} color="" iconStyle={{ backgroundColor: "#fef9c3", color: "#ca8a04" }} icon={<Flame className="w-5 h-5" />} />
            <KpiCard label="Urgentes" value={metrics.urgentes} color="" iconStyle={{ backgroundColor: "#fee2e2", color: "#dc2626" }} icon={<AlertTriangle className="w-5 h-5" />} />
            <KpiCard label="Requieren seguimiento" value={metrics.requierenSeg} color="" iconStyle={{ backgroundColor: "#fef3c7", color: "#d97706" }} icon={<Bell className="w-5 h-5" />} />
            <KpiCard label="Al día" value={metrics.alDia} color="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 className="w-5 h-5" />} />
          </div>

          {/* ── Filter bar ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            {/* Ver por */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Ver por:</span>
              {([ ["urgencia", "Urgencia"], ["agencia", "Agencia"], ["estado", "Estado"] ] as [VerPor, string][]).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setVerPor(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${verPor === v ? "text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} style={verPor === v ? { background: "#004FBB" } : {}}>
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-200 hidden sm:block" />

            {/* Estado filter */}
            <div className="relative">
              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as EstadoCRM | "todas")} className={selectCls} style={{ minWidth: 130 }}>
                <option value="todas">Estado: Todos</option>
                {ESTADO_CRM_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Prioridad filter */}
            <div className="relative">
              <select value={filterPrioridad} onChange={(e) => setFilterPrioridad(e.target.value as typeof filterPrioridad)} className={selectCls} style={{ minWidth: 140 }}>
                <option value="todas">Prioridad: Todas</option>
                {PRIORIDAD_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

            {/* Search */}
            <div className="flex-1 min-w-[160px] relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
              <input type="text" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar oportunidades…" className="w-full h-9 pl-9 pr-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400" />
              {query && (
                <button type="button" onClick={() => setQuery("")} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600">
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>
          </div>

          {/* ── Vertical list ────────────────────────────────────────────────── */}
          {activeItems.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
              <ListChecks className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <div className="text-sm text-slate-700 font-medium">No hay cotizaciones aún</div>
              <div className="text-xs text-slate-500 mt-1">Crea una cotización y guárdala para verla aquí.</div>
            </div>
          ) : listItems.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-10 text-center">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <div className="text-sm text-slate-600 font-medium">Sin resultados</div>
              <div className="text-xs text-slate-400 mt-1">Prueba ajustando los filtros o la búsqueda.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {listItems.map((g) => (
                <OpportunityCard
                  key={g.id} g={g}
                  agencia={agenciasMap.get((g.cliente.correo || "").toLowerCase())}
                  onView={() => onView(g)} onEdit={() => onEdit(g)}
                  onDuplicate={onDuplicate ? () => onDuplicate(g) : undefined}
                  onCRM={() => setCrmModal(g)}
                  onUpdateCRM={(patch) => onUpdateCRM(g.id, patch)}
                  onAnular={() => onAnular(g)}
                />
              ))}
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
