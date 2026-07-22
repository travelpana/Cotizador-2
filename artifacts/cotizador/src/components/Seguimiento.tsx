import { useMemo, useState, useRef, useEffect } from "react";
import { createPortal } from "react-dom";
import {
  Pencil,
  Trash2,
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
  X,
  Star,
  ExternalLink,
  XCircle,
  RotateCcw,
  CalendarClock,
  History,
  Eye,
  Ban,
  Save,
  Check,
} from "lucide-react";
import type {
  CotizacionGuardada,
  Opportunity,
  EstadoOportunidad,
  OppHistorialEntry,
} from "./Guardadas";
import { getOppUrgency, type UrgencyLevel } from "./Guardadas";
import { exportarCotizacionesExcel } from "@/lib/exportExcel";
import { loadAgenciasAsync, buildAgenciasMap, normAgencia, mergeAgenciasDuplicadas, type Agencia } from "@/lib/agencias";
import OportunidadDetailPanel from "./OportunidadDetailPanel";
import type { OppActividadTipo } from "./Guardadas";
import { useAuth } from "@/lib/auth";

interface Props {
  items: CotizacionGuardada[];
  opportunities: Opportunity[];
  onView: (g: CotizacionGuardada) => void;
  onEdit: (g: CotizacionGuardada) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
  onUpdateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
  onShowToast?: (msg: string, tone?: string) => void;
}

// ─── Configs ──────────────────────────────────────────────────────────────────

const ESTADO_OPP_OPTIONS: { value: EstadoOportunidad; label: string }[] = [
  { value: "nueva",      label: "Nueva"      },
  { value: "enviada",    label: "Enviada"    },
  { value: "seguimiento",label: "Seguimiento"},
  { value: "confirmada", label: "Confirmada" },
  { value: "perdida",    label: "Perdida"    },
];

const ESTADO_OPP_STYLES: Record<EstadoOportunidad, { bg: string; text: string; ring: string; dot: string }> = {
  nueva:       { bg: "bg-blue-50",    text: "text-blue-700",    ring: "ring-blue-200",    dot: "bg-blue-500"    },
  enviada:     { bg: "bg-sky-50",     text: "text-sky-700",     ring: "ring-sky-200",     dot: "bg-sky-500"     },
  seguimiento: { bg: "bg-amber-50",   text: "text-amber-700",   ring: "ring-amber-200",   dot: "bg-amber-500"   },
  confirmada:  { bg: "bg-emerald-50", text: "text-emerald-700", ring: "ring-emerald-200", dot: "bg-emerald-500" },
  perdida:     { bg: "bg-slate-100",  text: "text-slate-500",   ring: "ring-slate-200",   dot: "bg-slate-400"   },
  anulada:     { bg: "bg-slate-100",  text: "text-slate-400",   ring: "ring-slate-200",   dot: "bg-slate-300"   },
};

function oppSortKey(o: Opportunity): number {
  if (o.priorityManual) return 0;
  const u = getOppUrgency(o);
  const uMap: Record<UrgencyLevel, number> = { red: 1, yellow: 2, green: 3 };
  return uMap[u];
}

const URGENCY_META: Record<UrgencyLevel, { label: string; color: string; bg: string; dot: string }> = {
  red:    { label: "Urgente",              color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  yellow: { label: "Requiere seguimiento", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  green:  { label: "Al día",              color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
};

// ─── Border color by priority ──────────────────────────────────────────────────
// Priority: 1-Urgente · 2-Vencida · 3-Requiere seguimiento · 4-Prioritaria · 5-Nueva · 6-Al día
function getCardBorderColor(opp: Opportunity): string {
  const urgency = getOppUrgency(opp);
  if (urgency === "red")               return "#ef4444"; // 1. Urgente
  if (isRecordatorioActivo(opp))       return "#b91c1c"; // 2. Vencida / atrasada
  if (urgency === "yellow")            return "#e6ae33"; // 3. Requiere seguimiento
  if (opp.priorityManual)              return "#f2c94c"; // 4. Prioritaria
  if (opp.status === "nueva")          return "#0b63ff"; // 5. Nueva
  return "#03a04e";                                       // 6. Al día
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

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

function fmtMoney(n?: number): string {
  if (!n || n === 0) return "";
  return `USD ${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })}`;
}

function getInitials(name: string): string {
  if (!name?.trim()) return "?";
  const words = name.trim().split(/\s+/);
  if (words.length === 1) return name.trim().slice(0, 2).toUpperCase();
  return (words[0][0] + words[1][0]).toUpperCase();
}

function isRecordatorioActivo(o: Opportunity): boolean {
  if (!o.recordatorio) return false;
  const d = new Date(o.recordatorio + "T23:59:59");
  return d <= new Date();
}

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

const HIST_LABELS: Partial<Record<OppActividadTipo, string>> = {
  oportunidad_creada:    "Oportunidad creada",
  cotizacion_agregada:   "Cotización agregada",
  cotizacion_modificada: "Cotización modificada",
  cotizacion_duplicada:  "Cotización duplicada",
  pdf_generado:          "PDF generado",
  correo_generado:       "Correo generado",
  prioridad_activada:    "Prioridad activada",
  prioridad_quitada:     "Prioridad quitada",
  nota_agregada:         "Nota interna guardada",
  recordatorio_creado:   "Recordatorio creado",
  recordatorio_pospuesto:"Recordatorio pospuesto",
  marcada_atendida:      "Marcada como atendida",
  estado_cambiado:       "Estado cambiado",
  venta_confirmada:      "Venta confirmada",
  marcada_perdida:       "Marcada como perdida",
  anulada:               "Anulada",
  restaurada:            "Restaurada",
};

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

// ─── Confirm Modal (used only for Duplicar) ───────────────────────────────────

function ConfirmModal({ title, message, confirmLabel, danger = false, onConfirm, onCancel }: {
  title: string; message: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
}) {
  return createPortal(
    <div
      className="fixed inset-0 z-[1000] flex items-center justify-center p-4 modal-backdrop-enter"
      style={{ background: "rgba(15,23,42,0.45)", backdropFilter: "blur(2px)" }}
      onClick={onCancel}
    >
      <div
        className="bg-white rounded-2xl shadow-2xl w-full max-w-sm overflow-hidden modal-panel-enter"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="px-6 pt-6 pb-4">
          <div className="text-[15px] font-bold text-slate-900 mb-1.5">{title}</div>
          <div className="text-[13px] text-slate-500 leading-relaxed">{message}</div>
        </div>
        <div className="px-6 pb-5 flex justify-end gap-2.5">
          <button type="button" onClick={onCancel}
            className="px-4 py-2 rounded-xl text-[13px] font-semibold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={() => { onConfirm(); }}
            className={`px-4 py-2 rounded-xl text-[13px] font-semibold text-white transition-colors ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}

// ─── Confirm Popover (contextual, anchored to a button) ───────────────────────

function ConfirmPopover({ title, message, confirmLabel, danger = false, onConfirm, onCancel, anchorEl }: {
  title: string; message: string; confirmLabel: string;
  danger?: boolean; onConfirm: () => void; onCancel: () => void;
  anchorEl: HTMLElement | null;
}) {
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);

  useEffect(() => {
    if (!anchorEl) return;
    const rect = anchorEl.getBoundingClientRect();
    const popW = 228;
    let left = rect.right - popW;
    if (left < 8) left = rect.left;
    if (left + popW > window.innerWidth - 8) left = window.innerWidth - popW - 8;
    const top = rect.bottom + 6;
    setPos({ top, left });
  }, [anchorEl]);

  if (!pos) return null;

  return createPortal(
    <>
      <div className="fixed inset-0 z-[999]" onClick={onCancel} />
      <div
        className="fixed z-[1000] bg-white rounded-xl shadow-xl border border-slate-100 w-[228px] p-3.5 popover-enter"
        style={{ top: pos.top, left: pos.left }}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="text-[13px] font-bold text-slate-900 mb-1">{title}</div>
        <div className="text-[12px] text-slate-500 leading-relaxed mb-3">{message}</div>
        <div className="flex justify-end gap-2">
          <button type="button" onClick={onCancel}
            className="px-3 py-1.5 rounded-lg text-[12px] font-semibold text-slate-600 bg-white ring-1 ring-slate-200 hover:bg-slate-50 transition-colors">
            Cancelar
          </button>
          <button type="button" onClick={() => { onConfirm(); }}
            className={`px-3 py-1.5 rounded-lg text-[12px] font-semibold text-white transition-colors ${
              danger ? "bg-red-600 hover:bg-red-700" : "bg-blue-600 hover:bg-blue-700"
            }`}>
            {confirmLabel}
          </button>
        </div>
      </div>
    </>,
    document.body
  );
}

// ─── Icon Button with tooltip ─────────────────────────────────────────────────

function IconBtn({ icon, label, onClick, active = false, danger = false, btnRef }: {
  icon: React.ReactNode; label: string;
  onClick: (e: React.MouseEvent) => void;
  active?: boolean; danger?: boolean;
  btnRef?: React.RefObject<HTMLButtonElement | null>;
}) {
  return (
    <div className="relative group">
      <button
        ref={btnRef}
        type="button"
        onClick={onClick}
        className={`h-8 w-8 flex items-center justify-center rounded-lg transition-colors ${
          danger ? "text-red-400 hover:bg-red-50 hover:text-red-600"
          : active ? "bg-blue-50 text-blue-600"
          : "text-slate-400 hover:bg-slate-100 hover:text-slate-700"
        }`}
      >
        {icon}
      </button>
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 text-[10px] font-semibold text-white bg-slate-800 rounded-md whitespace-nowrap opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-10">
        {label}
      </div>
    </div>
  );
}

// ─── Opportunity Card ─────────────────────────────────────────────────────────

function OpportunityCard({ opp, agencia, allQuotes, onView, onEdit, onDuplicate, onUpdateOpportunity, onAnular, onShowToast }: {
  opp: Opportunity; agencia?: Agencia;
  allQuotes: CotizacionGuardada[];
  onView: () => void; onEdit: () => void; onDuplicate?: () => void;
  onUpdateOpportunity: (patch: Partial<Opportunity>) => void;
  onAnular: () => void;
  onShowToast?: (msg: string, tone?: string) => void;
}) {
  const { user } = useAuth();

  // Accordion
  const [expandedPanel, setExpandedPanel] = useState<"seguimiento" | "historial" | null>(null);
  // Modal confirm (duplicar only)
  const [confirmAction, setConfirmAction] = useState<"duplicar" | null>(null);
  // Popover confirm (confirmar / perdida / anular)
  const [popoverAction, setPopoverAction] = useState<"confirmar" | "perdida" | "anular" | null>(null);
  const confirmarBtnRef = useRef<HTMLButtonElement>(null);
  const perdidaBtnRef = useRef<HTMLButtonElement>(null);
  const anularBtnRef = useRef<HTMLButtonElement>(null);
  // Historial detail expansion (by flat sorted index)
  const [expandedHistEntries, setExpandedHistEntries] = useState<Set<number>>(new Set());
  const toggleHistEntry = (idx: number) =>
    setExpandedHistEntries((prev) => { const s = new Set(prev); s.has(idx) ? s.delete(idx) : s.add(idx); return s; });

  // Seguimiento form state (synced when panel opens)
  const [localProxima, setLocalProxima] = useState(opp.proximaAccion ?? "");
  const [localRec, setLocalRec] = useState(opp.recordatorio?.slice(0, 10) ?? "");
  const [localNota, setLocalNota] = useState(opp.notaInterna ?? "");

  const togglePanel = (panel: "seguimiento" | "historial") => {
    if (expandedPanel !== panel) {
      setLocalProxima(opp.proximaAccion ?? "");
      setLocalRec(opp.recordatorio?.slice(0, 10) ?? "");
      setLocalNota(opp.notaInterna ?? "");
    }
    setConfirmAction(null);
    setExpandedPanel((prev) => (prev === panel ? null : panel));
  };

  const now = () => new Date().toISOString();
  const addHistorial = (tipo: OppHistorialEntry["tipo"], detalle?: string): OppHistorialEntry[] =>
    [{ fecha: now(), tipo, detalle, byUser: user?.nombre }, ...(opp.historial ?? [])].slice(0, 100);

  const handleQuickAction = (patch: Partial<Opportunity>, entry: OppHistorialEntry) => {
    onUpdateOpportunity({ ...patch, historial: [entry, ...(opp.historial ?? [])].slice(0, 100) });
  };

  const handleSeguimientoSave = () => {
    const entries: OppHistorialEntry[] = [];
    if (localNota.trim() !== (opp.notaInterna ?? "").trim())
      entries.push({ fecha: now(), tipo: "nota_agregada", byUser: user?.nombre });
    if (localRec !== (opp.recordatorio?.slice(0, 10) ?? ""))
      entries.push({ fecha: now(), tipo: localRec ? "recordatorio_creado" : "estado_cambiado", detalle: localRec || "Recordatorio eliminado", byUser: user?.nombre });
    if (localProxima.trim() !== (opp.proximaAccion ?? "").trim())
      entries.push({ fecha: now(), tipo: "estado_cambiado", detalle: `Próxima acción: ${localProxima.trim() || "—"}`, byUser: user?.nombre });
    onUpdateOpportunity({
      proximaAccion: localProxima.trim() || undefined,
      recordatorio: localRec || undefined,
      notaInterna: localNota.trim() || undefined,
      historial: [...entries, ...(opp.historial ?? [])].slice(0, 100),
    });
    onShowToast?.("Seguimiento guardado", "success");
  };

  const urgency = getOppUrgency(opp);
  const uMeta = URGENCY_META[urgency];
  const sinActividad = daysSince(opp.lastUpdateAt);
  const initials = getInitials(opp.agencyName || opp.quoteName);
  const isClosedStatus = opp.status === "confirmada" || opp.status === "perdida";
  const borderColor = getCardBorderColor(opp);

  const latestQ = opp.quotes.length > 0 ? allQuotes.find((q) => q.id === opp.quotes[0].id) : undefined;
  const pax = latestQ?.cliente?.pasajeros;
  const ninos = latestQ?.cliente?.ninos;
  const uniqueAcoms = Array.from(new Set(latestQ?.acomodaciones ?? []));
  const tipoLabel = latestQ?.quotingMode === "grupo"
    ? "GRUPOS"
    : latestQ?.presentationMode === "package"
      ? "PAQUETE"
      : "TARIFAS";

  const lastUpdateFormatted = opp.lastUpdateAt
    ? new Date(opp.lastUpdateAt).toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase()
    : "—";

  // Historial agrupado por fecha
  const historialGroups = (() => {
    const sorted = [...(opp.historial ?? [])].sort(
      (a, b) => new Date(b.fecha).getTime() - new Date(a.fecha).getTime()
    );
    const groups: { dateKey: string; dateLabel: string; entries: { entry: OppHistorialEntry; timeLabel: string }[] }[] = [];
    for (const entry of sorted) {
      const d = new Date(entry.fecha);
      const dateKey = d.toISOString().slice(0, 10);
      const dateLabel = d.toLocaleDateString("es-ES", { day: "2-digit", month: "short", year: "numeric" }).toUpperCase();
      const timeLabel = d.toLocaleTimeString("es-ES", { hour: "2-digit", minute: "2-digit" });
      const existing = groups.find((g) => g.dateKey === dateKey);
      if (existing) existing.entries.push({ entry, timeLabel });
      else groups.push({ dateKey, dateLabel, entries: [{ entry, timeLabel }] });
    }
    return groups;
  })();

  return (
    <div
      className="bg-white rounded-2xl overflow-hidden transition-all duration-150 cursor-default"
      style={{
        borderLeft: `5px solid ${borderColor}`,
        boxShadow: "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)",
        minHeight: 110,
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 4px 16px 0 rgba(0,0,0,0.10), 0 2px 6px -1px rgba(0,0,0,0.07)"; (e.currentTarget as HTMLDivElement).style.transform = "translateY(-1px)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 3px 0 rgba(0,0,0,0.06), 0 1px 2px -1px rgba(0,0,0,0.04)"; (e.currentTarget as HTMLDivElement).style.transform = ""; }}
    >
      {/* ── Main row ──────────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 px-4 py-3 sm:py-0 sm:min-h-[110px]">

        {/* Logo */}
        <div className="shrink-0 self-start sm:self-center mt-1 sm:mt-0">
          <LogoOrInitials agencia={agencia} initials={initials} color="#004FBB" size={56} radius={14} />
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="font-bold text-slate-900 truncate leading-tight tracking-wide" style={{ fontSize: 14, fontWeight: 700, letterSpacing: "0.01em" }}>
            {(opp.destination || opp.quoteName || "SIN DESTINO").toUpperCase()}
          </div>
          {opp.agencyName && (
            <div className="text-[11px] font-semibold text-slate-500 truncate mt-0.5 tracking-wide">{opp.agencyName}</div>
          )}
          <div className="flex flex-wrap items-center gap-x-1.5 gap-y-0.5 mt-1">
            {pax != null && (
              <>
                <span className="text-[10px] font-semibold text-slate-500">{tipoLabel}</span>
                <span className="text-slate-300 text-[10px]">•</span>
                <span className="text-[10px] font-semibold text-slate-500">{pax} PERSONA{pax !== 1 ? "S" : ""}</span>
                {(ninos ?? 0) > 0 && (
                  <><span className="text-slate-300 text-[10px]">•</span><span className="text-[10px] font-semibold text-slate-500">{ninos} NIÑO{(ninos ?? 1) !== 1 ? "S" : ""}</span></>
                )}
              </>
            )}
            {opp.priorityManual && (
              <><span className="text-slate-300 text-[10px]">•</span><span className="text-[10px] font-bold text-amber-600 flex items-center gap-0.5"><Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />PRIORIDAD</span></>
            )}
            {opp.createdByName && (
              <><span className="text-slate-300 text-[10px]">•</span><span className="text-[10px] text-slate-400">Creada por: {opp.createdByName}</span></>
            )}
          </div>
        </div>

        {/* Price + Estado */}
        <div className="shrink-0 sm:w-36 flex flex-col justify-center gap-1">
          {opp.totalLatest != null && opp.totalLatest > 0 ? (
            <div className="font-bold tabular-nums leading-none" style={{ fontSize: 18, color: "#044b9e", fontWeight: 700, letterSpacing: "-0.02em" }}>
              {fmtMoney(opp.totalLatest)}
            </div>
          ) : (
            <div className="text-[11px] text-slate-400">Sin valor</div>
          )}
          {(() => {
            const st = ESTADO_OPP_STYLES[opp.status as keyof typeof ESTADO_OPP_STYLES] ?? ESTADO_OPP_STYLES.nueva;
            const label = ESTADO_OPP_OPTIONS.find(o => o.value === opp.status)?.label ?? opp.status;
            return (
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ring-1 w-fit ${st.bg} ${st.text} ${st.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />{label}
              </span>
            );
          })()}
        </div>

        {/* Semáforo */}
        <div className="shrink-0 sm:w-40 flex flex-col justify-center gap-0.5">
          {!isClosedStatus ? (
            <>
              <div className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: uMeta.dot }} />
                <span className="text-[11px] font-bold text-slate-700 tracking-wide uppercase">{uMeta.label}</span>
              </div>
              <div className="text-[10px] font-semibold" style={{ color: urgency === "red" ? "#dc2626" : "#64748b" }}>
                {sinActividad === 0 ? "ACTUALIZADO HOY" : `${sinActividad} DÍA${sinActividad !== 1 ? "S" : ""} SIN ACTUALIZACIÓN`}
              </div>
              <div className="text-[10px] text-slate-400 font-medium">{lastUpdateFormatted}</div>
              {opp.recordatorio && (
                <div className="text-[10px] text-blue-400 flex items-center gap-1 mt-0.5">
                  <CalendarClock className="w-3 h-3 shrink-0" />REC. {formatShortDate(opp.recordatorio).toUpperCase()}
                </div>
              )}
            </>
          ) : (
            <div className="text-[10px] text-slate-400 font-medium">{lastUpdateFormatted}</div>
          )}
        </div>

        {/* ── Barra de iconos ───────────────────────────────────────────── */}
        <div className="shrink-0 flex items-center gap-0 self-start sm:self-center mt-1 sm:mt-0">
          {/* Grupo 1: cotización */}
          <IconBtn icon={<Eye className="w-4 h-4" />} label="Vista previa" onClick={() => onView()} />
          <IconBtn icon={<Pencil className="w-4 h-4" />} label="Editar" onClick={() => onEdit()} />
          {onDuplicate && (
            <IconBtn icon={<Copy className="w-4 h-4" />} label="Duplicar"
              onClick={() => setConfirmAction("duplicar")} />
          )}
          <div className="w-px h-4 bg-slate-200 mx-0.5" />
          {/* Grupo 2: seguimiento + acciones + historial */}
          <IconBtn
            icon={<Bell className="w-4 h-4" />} label="Seguimiento"
            onClick={() => togglePanel("seguimiento")}
            active={expandedPanel === "seguimiento"}
          />
          <IconBtn
            icon={<Star className={`w-4 h-4 ${opp.priorityManual ? "fill-amber-400 text-amber-500" : ""}`} />}
            label={opp.priorityManual ? "Quitar prioridad" : "Marcar prioridad"}
            onClick={() => {
              const tipo: OppHistorialEntry["tipo"] = opp.priorityManual ? "prioridad_quitada" : "prioridad_activada";
              onUpdateOpportunity({ priorityManual: !opp.priorityManual, historial: addHistorial(tipo) });
            }}
          />
          <IconBtn
            icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />} label="Confirmar venta"
            btnRef={confirmarBtnRef}
            onClick={() => setPopoverAction(popoverAction === "confirmar" ? null : "confirmar")}
          />
          <IconBtn
            icon={<XCircle className="w-4 h-4 text-red-500" />} label="Marcar perdida"
            btnRef={perdidaBtnRef}
            onClick={() => setPopoverAction(popoverAction === "perdida" ? null : "perdida")}
          />
          <IconBtn icon={<Ban className="w-4 h-4" />} label="Anular"
            btnRef={anularBtnRef}
            onClick={() => setPopoverAction(popoverAction === "anular" ? null : "anular")}
            danger
          />
          <IconBtn
            icon={<History className="w-4 h-4" />} label="Historial"
            onClick={() => togglePanel("historial")}
            active={expandedPanel === "historial"}
          />
        </div>
      </div>

      {/* ── Modal de confirmación (solo Duplicar) ────────────────────── */}
      {confirmAction === "duplicar" && (
        <ConfirmModal
          title="Duplicar cotización"
          message="¿Deseas crear una copia exacta de esta cotización?"
          confirmLabel="Duplicar"
          onConfirm={() => { onDuplicate!(); setConfirmAction(null); }}
          onCancel={() => setConfirmAction(null)}
        />
      )}

      {/* ── Popovers contextuales ─────────────────────────────────────── */}
      {popoverAction === "confirmar" && (
        <ConfirmPopover
          title="Confirmar venta"
          message="Esta acción marcará la oportunidad como vendida."
          confirmLabel="Confirmar"
          anchorEl={confirmarBtnRef.current}
          onConfirm={() => { handleQuickAction({ status: "confirmada" }, { fecha: now(), tipo: "venta_confirmada", byUser: user?.nombre }); setPopoverAction(null); }}
          onCancel={() => setPopoverAction(null)}
        />
      )}
      {popoverAction === "perdida" && (
        <ConfirmPopover
          title="Marcar como perdida"
          message="¿Deseas marcar esta oportunidad como perdida?"
          confirmLabel="Aceptar"
          anchorEl={perdidaBtnRef.current}
          onConfirm={() => { handleQuickAction({ status: "perdida" }, { fecha: now(), tipo: "marcada_perdida", byUser: user?.nombre }); setPopoverAction(null); }}
          onCancel={() => setPopoverAction(null)}
        />
      )}
      {popoverAction === "anular" && (
        <ConfirmPopover
          title="Anular cotización"
          message="La cotización quedará anulada, pero podrá restaurarse."
          confirmLabel="Anular"
          danger
          anchorEl={anularBtnRef.current}
          onConfirm={() => { onAnular(); setPopoverAction(null); }}
          onCancel={() => setPopoverAction(null)}
        />
      )}

      {/* ── Seguimiento accordion ─────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateRows: expandedPanel === "seguimiento" ? "1fr" : "0fr", transition: "grid-template-rows 220ms ease" }}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-4 pt-4 pb-3 bg-slate-50/60">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">

              {/* Col 1: Próxima acción */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Próxima acción</label>
                <input
                  type="text"
                  value={localProxima}
                  onChange={(e) => setLocalProxima(e.target.value)}
                  placeholder="Ej: Llamar al cliente…"
                  className="h-8 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 w-full"
                  style={{ color: "#1F2937" }}
                />
                <div className="flex gap-2">
                  <a
                    href={`https://wa.me/?text=${encodeURIComponent(localProxima || opp.proximaAccion || "")}`}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100 transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="currentColor"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/></svg>
                    WhatsApp
                  </a>
                  <a
                    href={`mailto:?body=${encodeURIComponent(localProxima || opp.proximaAccion || "")}`}
                    className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors"
                  >
                    <svg className="w-3 h-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect width="20" height="16" x="2" y="4" rx="2"/><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/></svg>
                    Correo
                  </a>
                </div>
              </div>

              {/* Col 2: Recordatorio */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Recordatorio</label>
                <div className="flex flex-wrap gap-1.5">
                  {[{ label: "Hoy", days: 0 }, { label: "Mañana", days: 1 }, { label: "3 días", days: 3 }, { label: "1 semana", days: 7 }].map(({ label, days }) => {
                    const target = addDays(days);
                    const isActive = localRec === target;
                    return (
                      <button key={days} type="button"
                        onClick={() => setLocalRec(isActive ? "" : target)}
                        className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all ring-1 ${isActive ? "bg-blue-50 text-blue-600 ring-blue-300" : "bg-white ring-slate-200 hover:bg-slate-100"}`}
                        style={{ color: isActive ? undefined : "#1F2937" }}>
                        {label}
                      </button>
                    );
                  })}
                </div>
                <input
                  type="date"
                  value={localRec}
                  onChange={(e) => setLocalRec(e.target.value)}
                  className="h-8 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 w-full"
                  style={{ color: "#1F2937" }}
                />
              </div>

              {/* Col 3: Nota interna */}
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-semibold text-slate-400 uppercase tracking-wide">Nota interna</label>
                <textarea
                  value={localNota}
                  onChange={(e) => setLocalNota(e.target.value)}
                  placeholder="Ej: Cliente interesado en habitación superior…"
                  rows={4}
                  className="flex-1 px-3 py-2 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-blue-200 focus:border-blue-400 resize-none"
                  style={{ color: "#1F2937" }}
                />
              </div>

            </div>

            {/* Guardar — alineado abajo a la derecha */}
            <div className="flex justify-end mt-3">
              <button type="button" onClick={handleSeguimientoSave}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-[12px] font-semibold transition-colors">
                <Save className="w-3.5 h-3.5" />Guardar
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* ── Historial accordion ───────────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateRows: expandedPanel === "historial" ? "1fr" : "0fr", transition: "grid-template-rows 220ms ease" }}>
        <div className="overflow-hidden">
          <div className="border-t border-slate-100 px-4 py-4 bg-slate-50/60">
            {/* Header */}
            <div className="flex items-center justify-between mb-3">
              <div>
                <span className="text-[13px] font-bold text-slate-800">Historial</span>
                {(opp.historial?.length ?? 0) > 0 && (
                  <span className="ml-2 text-[11px] font-semibold text-slate-400">{opp.historial!.length} evento{opp.historial!.length !== 1 ? "s" : ""}</span>
                )}
              </div>
            </div>

            {historialGroups.length === 0 ? (
              <div className="text-xs text-slate-400 italic py-1">Sin eventos registrados.</div>
            ) : (() => {
              // Flat sorted list for global index (for expand state)
              let flatIdx = -1;
              return (
                <div className="max-h-80 overflow-y-auto pr-1 space-y-0">
                  {historialGroups.map((group) => (
                    <div key={group.dateKey} className="mb-3">
                      {/* Day separator */}
                      <div className="flex items-center gap-2 mb-2.5">
                        <div className="h-px flex-1 bg-slate-200" />
                        <span className="text-[10px] font-bold text-slate-400 tracking-wider shrink-0 uppercase">{group.dateLabel}</span>
                        <div className="h-px flex-1 bg-slate-200" />
                      </div>
                      {/* Timeline entries */}
                      <div className="relative pl-7">
                        <div className="absolute left-2.5 top-0 bottom-0 w-px bg-slate-200" />
                        <div className="space-y-3">
                          {group.entries.map(({ entry, timeLabel }) => {
                            flatIdx++;
                            const currentIdx = flatIdx;
                            const label = entry.tipo ? (HIST_LABELS[entry.tipo] ?? entry.tipo) : (entry.detalle ?? "Evento");
                            const hasDetail = !!entry.detalle && entry.tipo !== "estado_cambiado";
                            const isExpanded = expandedHistEntries.has(currentIdx);
                            const iconColor = (() => {
                              switch(entry.tipo) {
                                case "venta_confirmada": case "marcada_atendida": return "#10b981"; // verde
                                case "marcada_perdida": return "#64748b";                           // gris oscuro
                                case "anulada": return "#ef4444";                                   // rojo
                                case "restaurada": return "#3b82f6";                                // azul
                                case "prioridad_activada": return "#f59e0b";                        // amarillo
                                case "prioridad_quitada": return "#94a3b8";                         // gris
                                case "cotizacion_modificada": return "#3b82f6";                     // azul
                                case "cotizacion_duplicada": return "#8b5cf6";                      // violeta
                                case "cotizacion_agregada": return "#8b5cf6";                       // violeta
                                case "nota_agregada": return "#06b6d4";                             // celeste
                                case "recordatorio_creado": case "recordatorio_pospuesto": return "#f97316"; // naranja
                                case "pdf_generado": return "#6366f1";                              // índigo
                                case "correo_generado": return "#06b6d4";                           // celeste
                                default: return "#94a3b8";
                              }
                            })();
                            const icon = (() => {
                              switch(entry.tipo) {
                                case "pdf_generado": return <Eye className="w-3.5 h-3.5" />;
                                case "correo_generado": return <MessageSquare className="w-3.5 h-3.5" />;
                                case "cotizacion_modificada": return <Pencil className="w-3.5 h-3.5" />;
                                case "cotizacion_agregada": case "cotizacion_duplicada": return <Copy className="w-3.5 h-3.5" />;
                                case "prioridad_activada": return <Star className="w-3.5 h-3.5 fill-current" />;
                                case "prioridad_quitada": return <Star className="w-3.5 h-3.5" />;
                                case "nota_agregada": return <MessageSquare className="w-3.5 h-3.5" />;
                                case "recordatorio_creado": case "recordatorio_pospuesto": return <CalendarClock className="w-3.5 h-3.5" />;
                                case "venta_confirmada": case "marcada_atendida": return <Check className="w-3.5 h-3.5" />;
                                case "marcada_perdida": return <XCircle className="w-3.5 h-3.5" />;
                                case "anulada": return <Ban className="w-3.5 h-3.5" />;
                                case "restaurada": return <RotateCcw className="w-3.5 h-3.5" />;
                                default: return <Clock className="w-3.5 h-3.5" />;
                              }
                            })();
                            return (
                              <div key={currentIdx} className="flex items-start gap-2.5">
                                {/* Icon — solid colored circle, clearly visible */}
                                <div
                                  className="absolute left-0 w-5 h-5 rounded-full flex items-center justify-center shrink-0 text-white"
                                  style={{ background: iconColor, marginTop: 1 }}
                                >
                                  {icon}
                                </div>
                                <div className="flex-1 min-w-0">
                                  <div className="text-[12px] font-semibold" style={{ color: "#1F2937" }}>{label}</div>
                                  <div className="text-[10px] text-slate-400 mt-0.5">
                                    {timeLabel}{entry.byUser && <> · por <span className="font-medium text-slate-500">{entry.byUser}</span></>}
                                  </div>
                                  {hasDetail && (
                                    <>
                                      <button type="button"
                                        onClick={() => toggleHistEntry(currentIdx)}
                                        className="text-[10px] font-semibold text-blue-500 hover:text-blue-700 mt-0.5 transition-colors">
                                        {isExpanded ? "Ocultar detalle" : "Ver detalle"}
                                      </button>
                                      {isExpanded && (
                                        <div className="mt-1.5 px-2.5 py-1.5 bg-white rounded-lg ring-1 ring-slate-100 text-[11px] hist-detail-enter" style={{ color: "#1F2937" }}>
                                          {entry.detalle}
                                        </div>
                                      )}
                                    </>
                                  )}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              );
            })()}
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── Anuladas / Finalizadas Views ─────────────────────────────────────────────

function AnuladasView({ opps, agenciasMap, onRestaurar }: {
  opps: Opportunity[];
  agenciasMap: Map<string, Agencia>;
  onRestaurar: (o: Opportunity) => void;
}) {
  if (opps.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
        <Trash2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
        <div className="text-sm font-medium text-slate-600">No hay oportunidades anuladas</div>
        <div className="text-xs text-slate-400 mt-1">Las oportunidades anuladas aparecen aquí para que puedas restaurarlas.</div>
      </div>
    );
  }
  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
      <div className="px-5 py-3.5 border-b border-slate-100">
        <div className="text-sm font-bold text-slate-900">Anuladas</div>
        <div className="text-xs text-slate-400 mt-0.5">{opps.length} oportunidad{opps.length !== 1 ? "es" : ""} · puedes restaurarlas</div>
      </div>
      <div className="divide-y divide-slate-50">
        {opps.map((o) => {
          const agencia = agenciasMap.get(normAgencia(o.agencyName || ""));
          const initials = getInitials(o.agencyName || o.quoteName);
          return (
            <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
              <LogoOrInitials agencia={agencia} initials={initials} color="#94a3b8" size={32} />
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-slate-700 truncate">{o.quoteName}</div>
                <div className="text-xs text-slate-400 truncate">{o.agencyName}{o.agentName ? ` · ${o.agentName}` : ""}</div>
              </div>
              <button type="button" onClick={() => onRestaurar(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-colors hover:bg-blue-100" style={{ background: "#eff6ff", color: "#004FBB" }}>
                <RotateCcw className="w-3 h-3" />Restaurar
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function FinalizadasView({ opps, agenciasMap, onOpenDetail }: {
  opps: Opportunity[];
  agenciasMap: Map<string, Agencia>;
  onOpenDetail: (o: Opportunity) => void;
}) {
  if (opps.length === 0) {
    return (
      <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
        <CheckCircle2 className="w-10 h-10 mx-auto text-slate-200 mb-3" />
        <div className="text-sm font-medium text-slate-600">No hay oportunidades finalizadas</div>
        <div className="text-xs text-slate-400 mt-1">Confirmadas y perdidas aparecen aquí.</div>
      </div>
    );
  }
  const confirmadas = opps.filter((o) => o.status === "confirmada");
  const perdidas = opps.filter((o) => o.status === "perdida");
  return (
    <div className="space-y-4">
      {confirmadas.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            <div className="text-sm font-bold text-slate-900">Confirmadas</div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-600">{confirmadas.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {confirmadas.map((o) => {
              const agencia = agenciasMap.get(normAgencia(o.agencyName || ""));
              const initials = getInitials(o.agencyName || o.quoteName);
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <LogoOrInitials agencia={agencia} initials={initials} color="#10b981" size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-700 truncate">{o.quoteName}</div>
                    <div className="text-xs text-slate-400 truncate">{o.agencyName}{o.agentName ? ` · ${o.agentName}` : ""}</div>
                  </div>
                  {o.totalLatest != null && o.totalLatest > 0 && (
                    <span className="text-sm font-bold text-emerald-700">{fmtMoney(o.totalLatest)}</span>
                  )}
                  <button type="button" onClick={() => onOpenDetail(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold" style={{ background: "#eff6ff", color: "#004FBB" }}>
                    <ExternalLink className="w-3 h-3" />Detalle
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
      {perdidas.length > 0 && (
        <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm overflow-hidden">
          <div className="px-5 py-3.5 border-b border-slate-100 flex items-center gap-2">
            <XCircle className="w-4 h-4 text-slate-400" />
            <div className="text-sm font-bold text-slate-900">Perdidas</div>
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-slate-100 text-slate-500">{perdidas.length}</span>
          </div>
          <div className="divide-y divide-slate-50">
            {perdidas.map((o) => {
              const agencia = agenciasMap.get(normAgencia(o.agencyName || ""));
              const initials = getInitials(o.agencyName || o.quoteName);
              return (
                <div key={o.id} className="flex items-center gap-3 px-5 py-3 hover:bg-slate-50/60 transition-colors">
                  <LogoOrInitials agencia={agencia} initials={initials} color="#94a3b8" size={32} />
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-semibold text-slate-500 truncate">{o.quoteName}</div>
                    <div className="text-xs text-slate-400 truncate">{o.agencyName}{o.agentName ? ` · ${o.agentName}` : ""}</div>
                  </div>
                  <button type="button" onClick={() => onOpenDetail(o)} className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200">
                    <ExternalLink className="w-3 h-3" />Detalle
                  </button>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

type TabView = "activas" | "finalizadas" | "anuladas";
type VerPor = "urgencia" | "agencia" | "estado";

export default function Seguimiento({ items, opportunities, onView, onEdit, onDelete, onDuplicate, onUpdateCRM, onUpdateOpportunity, onShowToast }: Props) {
  const [tab, setTab] = useState<TabView>("activas");
  const [query, setQuery] = useState("");
  const [verPor, setVerPor] = useState<VerPor>("urgencia");
  const [filterEstado, setFilterEstado] = useState<EstadoOportunidad | "todas">("todas");
  const [agencias, setAgencias] = useState<Agencia[]>([]);
  const [openOppId, setOpenOppId] = useState<string | null>(null);

  useEffect(() => {
    loadAgenciasAsync().then((list) => {
      setAgencias(list);
      mergeAgenciasDuplicadas().then(() => loadAgenciasAsync().then(setAgencias));
    });
  }, []);

  const agenciasMap = useMemo(() => buildAgenciasMap(agencias), [agencias]);

  const openOpp = useMemo(
    () => openOppId ? opportunities.find((o) => o.id === openOppId) ?? null : null,
    [openOppId, opportunities],
  );

  const activeOpps = useMemo(() => opportunities.filter((o) => o.status !== "anulada" && o.status !== "confirmada" && o.status !== "perdida"), [opportunities]);
  const finalizadasOpps = useMemo(() => opportunities.filter((o) => o.status === "confirmada" || o.status === "perdida"), [opportunities]);
  const anuladasOpps = useMemo(() => opportunities.filter((o) => o.status === "anulada"), [opportunities]);

  // ─── Metrics ──────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return {
      total: activeOpps.length,
      prioritarias: activeOpps.filter((o) => o.priorityManual).length,
      urgentes: activeOpps.filter((o) => getOppUrgency(o) === "red").length,
      requierenSeg: activeOpps.filter((o) => getOppUrgency(o) === "yellow").length,
      alDia: activeOpps.filter((o) => getOppUrgency(o) === "green").length,
      accionHoy: activeOpps.filter((o) => {
        if (!o.recordatorio) return false;
        const d = new Date(o.recordatorio + "T23:59:59");
        return d <= new Date();
      }).length,
    };
  }, [activeOpps]);

  // ─── Filtered + sorted list ───────────────────────────────────────────────

  const listOpps = useMemo(() => {
    const q = query.trim().toLowerCase();
    let filtered = activeOpps;

    if (q) {
      filtered = filtered.filter((o) =>
        [o.quoteName, o.agencyName, o.agentName, o.counterName, o.destination, o.latestQuoteCode]
          .join(" ").toLowerCase().includes(q)
      );
    }
    if (filterEstado !== "todas") {
      filtered = filtered.filter((o) => o.status === filterEstado);
    }

    return [...filtered].sort((a, b) => {
      const skA = oppSortKey(a);
      const skB = oppSortKey(b);
      if (skA !== skB) return skA - skB;
      return new Date(a.lastUpdateAt).getTime() - new Date(b.lastUpdateAt).getTime();
    });
  }, [activeOpps, query, filterEstado, verPor]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const onAnular = (o: Opportunity) => {
    const entry: OppHistorialEntry = { fecha: new Date().toISOString(), tipo: "anulada" };
    onUpdateOpportunity(o.id, { status: "anulada", historial: [entry, ...(o.historial ?? [])].slice(0, 100) });
  };

  const onRestaurar = (o: Opportunity) => {
    const entry: OppHistorialEntry = { fecha: new Date().toISOString(), tipo: "restaurada" };
    onUpdateOpportunity(o.id, { status: "nueva", historial: [entry, ...(o.historial ?? [])].slice(0, 100) });
  };

  const getLatestQuote = (o: Opportunity): CotizacionGuardada | undefined => {
    for (const qRef of o.quotes) {
      const found = items.find((g) => g.id === qRef.id);
      if (found) return found;
    }
    return undefined;
  };

  const handleUpdateOpp = (id: string, patch: Partial<Opportunity>) => {
    onUpdateOpportunity(id, patch);
    if (openOppId === id) {
      // keep panel open — openOpp will re-derive from updated opportunities
    }
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
          {items.length > 0 && (
            <button type="button" onClick={() => exportarCotizacionesExcel(items)} className="flex items-center gap-2 h-9 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium transition-colors">
              <FileDown className="w-4 h-4" /><span className="hidden sm:inline">Excel</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Tab toggle ─────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1 bg-white rounded-xl ring-1 ring-slate-100 p-1 shadow-sm w-fit">
        <button type="button" onClick={() => setTab("activas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "activas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Activas
          <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "activas" ? "bg-white/20" : "bg-slate-100 text-slate-500"}`}>{activeOpps.length}</span>
        </button>
        <button type="button" onClick={() => setTab("finalizadas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "finalizadas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Finalizadas
          {finalizadasOpps.length > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "finalizadas" ? "bg-white/20" : "bg-emerald-50 text-emerald-600"}`}>{finalizadasOpps.length}</span>}
        </button>
        <button type="button" onClick={() => setTab("anuladas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "anuladas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Anuladas
          {anuladasOpps.length > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "anuladas" ? "bg-white/20" : "bg-red-50 text-red-500"}`}>{anuladasOpps.length}</span>}
        </button>
      </div>

      {tab === "anuladas" ? (
        <AnuladasView opps={anuladasOpps} agenciasMap={agenciasMap} onRestaurar={onRestaurar} />
      ) : tab === "finalizadas" ? (
        <FinalizadasView opps={finalizadasOpps} agenciasMap={agenciasMap} onOpenDetail={(o) => setOpenOppId(o.id)} />
      ) : (
        <>
          {/* ── Metrics bar ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            <KpiCard label="Total oportunidades" value={metrics.total} color="bg-blue-50 text-blue-600" icon={<TrendingUp className="w-5 h-5" />} />
            <KpiCard label="Acción hoy" value={metrics.accionHoy} color="" iconStyle={{ backgroundColor: "#dbeafe", color: "#1d4ed8" }} icon={<CalendarClock className="w-5 h-5" />} />
            <KpiCard label="Prioritarias" value={metrics.prioritarias} color="" iconStyle={{ backgroundColor: "#fef9c3", color: "#ca8a04" }} icon={<Star className="w-5 h-5" />} />
            <KpiCard label="Urgentes" value={metrics.urgentes} color="" iconStyle={{ backgroundColor: "#fee2e2", color: "#dc2626" }} icon={<AlertTriangle className="w-5 h-5" />} />
            <KpiCard label="Requieren seguimiento" value={metrics.requierenSeg} color="" iconStyle={{ backgroundColor: "#fef3c7", color: "#d97706" }} icon={<Bell className="w-5 h-5" />} />
            <KpiCard label="Al día" value={metrics.alDia} color="bg-emerald-50 text-emerald-600" icon={<CheckCircle2 className="w-5 h-5" />} />
          </div>

          {/* ── Filter bar ───────────────────────────────────────────────────── */}
          <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm px-4 py-3 flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-semibold text-slate-500 shrink-0">Ver por:</span>
              {([ ["urgencia", "Urgencia"], ["agencia", "Agencia"], ["estado", "Estado"] ] as [VerPor, string][]).map(([v, label]) => (
                <button key={v} type="button" onClick={() => setVerPor(v)} className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${verPor === v ? "text-white shadow-sm" : "bg-slate-100 text-slate-600 hover:bg-slate-200"}`} style={verPor === v ? { background: "#004FBB" } : {}}>
                  {label}
                </button>
              ))}
            </div>

            <div className="w-px h-5 bg-slate-200 hidden sm:block" />

            <div className="relative">
              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as EstadoOportunidad | "todas")} className={selectCls} style={{ minWidth: 130 }}>
                <option value="todas">Estado: Todos</option>
                {ESTADO_OPP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>

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
          {activeOpps.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-12 text-center">
              <ListChecks className="w-10 h-10 mx-auto text-slate-300 mb-3" />
              <div className="text-sm text-slate-700 font-medium">No hay oportunidades aún</div>
              <div className="text-xs text-slate-500 mt-1">Guarda una cotización, crea un PDF o copia un correo para crear tu primera oportunidad aquí.</div>
            </div>
          ) : listOpps.length === 0 ? (
            <div className="bg-white rounded-2xl ring-1 ring-slate-100 p-10 text-center">
              <Search className="w-8 h-8 mx-auto text-slate-300 mb-2" />
              <div className="text-sm text-slate-600 font-medium">Sin resultados</div>
              <div className="text-xs text-slate-400 mt-1">Prueba ajustando los filtros o la búsqueda.</div>
            </div>
          ) : (
            <div className="space-y-3">
              {listOpps.map((o) => {
                const agencia = agenciasMap.get(normAgencia(o.agencyName || ""));
                const latestQuote = getLatestQuote(o);
                return (
                  <OpportunityCard
                    key={o.id} opp={o}
                    agencia={agencia}
                    allQuotes={items}
                    onView={() => { if (latestQuote) onView(latestQuote); }}
                    onEdit={() => { if (latestQuote) onEdit(latestQuote); }}
                    onDuplicate={onDuplicate && latestQuote ? () => onDuplicate!(latestQuote) : undefined}
                    onUpdateOpportunity={(patch) => handleUpdateOpp(o.id, patch)}
                    onAnular={() => onAnular(o)}
                    onShowToast={onShowToast}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── Opportunity Detail Panel ───────────────────────────────────────── */}
      {openOpp && (
        <OportunidadDetailPanel
          opp={openOpp}
          allQuotes={items}
          onClose={() => setOpenOppId(null)}
          onSave={(patch) => handleUpdateOpp(openOpp.id, patch)}
          onView={(g) => { onView(g); setOpenOppId(null); }}
          onDuplicate={onDuplicate ? (g) => { onDuplicate!(g); setOpenOppId(null); } : undefined}
        />
      )}
    </div>
  );
}
