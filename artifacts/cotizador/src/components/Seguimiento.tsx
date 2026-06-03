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
  Save,
  Star,
  Phone,
  MessageCircle,
  Mail,
  Send,
  CreditCard,
  ExternalLink,
  MoreHorizontal,
  XCircle,
  RotateCcw,
  ChevronRight,
} from "lucide-react";
import type {
  CotizacionGuardada,
  Opportunity,
  EstadoOportunidad,
  ActividadTipo,
} from "./Guardadas";
import { exportarCotizacionesExcel } from "@/lib/exportExcel";
import { loadAgencias, type Agencia } from "@/lib/agencias";

interface Props {
  items: CotizacionGuardada[];
  opportunities: Opportunity[];
  onView: (g: CotizacionGuardada) => void;
  onEdit: (g: CotizacionGuardada) => void;
  onDelete: (id: string) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
  onUpdateOpportunity: (id: string, patch: Partial<Opportunity>) => void;
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

// ─── Urgency semáforo ─────────────────────────────────────────────────────────

type UrgencyLevel = "red" | "yellow" | "green";

function getUrgency(o: Opportunity): UrgencyLevel {
  const days = daysSince(o.lastUpdateAt);
  if (days >= 7) return "red";
  if (days >= 4) return "yellow";
  return "green";
}

function oppSortKey(o: Opportunity): number {
  if (o.priorityManual) return 0;
  const u = getUrgency(o);
  const uMap: Record<UrgencyLevel, number> = { red: 1, yellow: 2, green: 3 };
  return uMap[u];
}

const URGENCY_META: Record<UrgencyLevel, { label: string; color: string; bg: string; dot: string }> = {
  red:    { label: "Urgente",              color: "#991b1b", bg: "#fee2e2", dot: "#ef4444" },
  yellow: { label: "Requiere seguimiento", color: "#92400e", bg: "#fef3c7", dot: "#f59e0b" },
  green:  { label: "Al día",              color: "#065f46", bg: "#d1fae5", dot: "#10b981" },
};

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

// ─── CRM Modal (per Opportunity) ──────────────────────────────────────────────

function OppCrmModal({ opp, onClose, onSave }: {
  opp: Opportunity; onClose: () => void;
  onSave: (patch: Partial<Opportunity>) => void;
}) {
  const [estado, setEstado] = useState<EstadoOportunidad>(opp.status);
  const [notaInterna, setNotaInterna] = useState(opp.notaInterna ?? "");
  const [recordatorio, setRecordatorio] = useState(opp.recordatorio?.slice(0, 10) ?? "");

  const addDaysStr = (n: number): string => {
    const d = new Date();
    d.setDate(d.getDate() + n);
    return d.toISOString().slice(0, 10);
  };

  const handleSave = () => {
    onSave({
      status: estado,
      notaInterna: notaInterna.trim() || undefined,
      recordatorio: recordatorio || undefined,
      historial: [
        { fecha: new Date().toISOString(), detalle: `Estado: ${ESTADO_OPP_OPTIONS.find((o) => o.value === estado)?.label ?? estado}${notaInterna.trim() ? ` · ${notaInterna.trim().slice(0, 60)}` : ""}` },
        ...(opp.historial ?? []),
      ].slice(0, 50),
    });
    onClose();
  };

  const estadoStyle = ESTADO_OPP_STYLES[estado];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-md flex flex-col max-h-[90vh]">
        <div className="flex items-start justify-between p-5 border-b border-slate-100">
          <div>
            <div className="font-semibold text-slate-900">{opp.quoteName}</div>
            <div className="text-xs text-slate-500 mt-0.5">{opp.agencyName}{opp.agentName ? ` · ${opp.agentName}` : ""}</div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1 p-5 space-y-5">
          {/* Estado */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-2">Estado de oportunidad</label>
            <div className="flex flex-wrap gap-2">
              {ESTADO_OPP_OPTIONS.filter((o) => o.value !== "anulada").map((o) => {
                const st = ESTADO_OPP_STYLES[o.value];
                const active = estado === o.value;
                return (
                  <button key={o.value} type="button" onClick={() => setEstado(o.value)}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ring-1 ${active ? `${st.bg} ${st.text} ${st.ring} shadow-sm` : "bg-slate-50 text-slate-400 ring-slate-200 hover:bg-slate-100"}`}>
                    {active && <span className={`w-1.5 h-1.5 rounded-full ${st.dot}`} />}
                    {o.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Recordarme */}
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

          {/* Nota interna */}
          <div>
            <label className="block text-xs font-semibold text-slate-600 uppercase tracking-wide mb-1.5">Nota interna</label>
            <textarea value={notaInterna} onChange={(e) => setNotaInterna(e.target.value)} placeholder="Ej: Cliente quiere hotel 4*, pendiente pago…" rows={3} className="w-full px-3 py-2 rounded-xl border border-slate-200 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary placeholder:text-slate-400 resize-none" />
          </div>
        </div>

        <div className="flex justify-end gap-2 p-4 border-t border-slate-100">
          <button type="button" onClick={onClose} className="px-4 py-2 rounded-xl text-sm text-slate-600 hover:bg-slate-100">Cancelar</button>
          <button type="button" onClick={handleSave} className="flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium"><Save className="w-3.5 h-3.5" />Guardar</button>
        </div>
      </div>
    </div>
  );
}

// ─── Quotes Modal ─────────────────────────────────────────────────────────────

function QuotesModal({ opp, allQuotes, onClose, onView, onDuplicate }: {
  opp: Opportunity;
  allQuotes: CotizacionGuardada[];
  onClose: () => void;
  onView: (g: CotizacionGuardada) => void;
  onDuplicate?: (g: CotizacionGuardada) => void;
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4" onClick={(e) => e.target === e.currentTarget && onClose()}>
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg flex flex-col max-h-[85vh]">
        <div className="flex items-center justify-between p-5 border-b border-slate-100">
          <div>
            <div className="font-semibold text-slate-900">{opp.quoteName}</div>
            <div className="text-xs text-slate-500 mt-0.5">{opp.quotes.length} cotización{opp.quotes.length !== 1 ? "es" : ""}</div>
          </div>
          <button type="button" onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400"><X className="w-4 h-4" /></button>
        </div>

        <div className="overflow-y-auto flex-1">
          {opp.quotes.length === 0 ? (
            <div className="p-10 text-center text-sm text-slate-400">No hay cotizaciones registradas</div>
          ) : (
            <div className="divide-y divide-slate-50">
              {opp.quotes.map((qRef, i) => {
                const full = allQuotes.find((g) => g.id === qRef.id);
                const isLatest = i === 0;
                return (
                  <div key={qRef.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50/60 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-sm font-semibold text-slate-800 font-mono">{qRef.numeroCotizacion}</span>
                        {isLatest && (
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 ring-1 ring-blue-200">Última</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                        <span className="text-[11px] text-slate-400">{formatDate(qRef.fechaCreacion)}</span>
                        {qRef.total != null && qRef.total > 0 && (
                          <span className="text-[11px] font-bold text-slate-600">· {fmtMoney(qRef.total)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 shrink-0">
                      {full ? (
                        <>
                          <button type="button" onClick={() => { onView(full); onClose(); }}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold text-white transition-opacity hover:opacity-90" style={{ background: "#004FBB" }}>
                            <ExternalLink className="w-3 h-3" />Abrir
                          </button>
                          {onDuplicate && (
                            <button type="button" onClick={() => { onDuplicate(full); onClose(); }}
                              className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600 hover:bg-slate-200 transition-colors">
                              <Copy className="w-3 h-3" />Duplicar
                            </button>
                          )}
                        </>
                      ) : (
                        <span className="text-[11px] text-slate-400 italic">No disponible</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

// ─── Menu item ────────────────────────────────────────────────────────────────

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

function OpportunityCard({ opp, agencia, allQuotes, onView, onEdit, onDuplicate, onCRM, onUpdateOpportunity, onAnular, onOpenQuotes }: {
  opp: Opportunity; agencia?: Agencia;
  allQuotes: CotizacionGuardada[];
  onView: () => void; onEdit: () => void; onDuplicate?: () => void;
  onCRM: () => void;
  onUpdateOpportunity: (patch: Partial<Opportunity>) => void;
  onAnular: () => void;
  onOpenQuotes: () => void;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [menuPos, setMenuPos] = useState<{ top: number; right: number } | null>(null);
  const menuBtnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const openMenu = () => {
    const rect = menuBtnRef.current?.getBoundingClientRect();
    if (rect) {
      const MENU_HEIGHT = 260;
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

  const urgency = getUrgency(opp);
  const uMeta = URGENCY_META[urgency];
  const sinActividad = daysSince(opp.lastUpdateAt);
  const initials = getInitials(opp.agencyName || opp.quoteName);
  const estadoStyle = ESTADO_OPP_STYLES[opp.status];
  const estadoLabel = ESTADO_OPP_OPTIONS.find((o) => o.value === opp.status)?.label ?? opp.status;
  const isClosedStatus = opp.status === "confirmada" || opp.status === "perdida";

  return (
    <div className="bg-white rounded-2xl ring-1 ring-slate-100 shadow-sm hover:shadow-md transition-shadow overflow-hidden">
      <div className="flex items-stretch gap-0 px-5 py-4">

        {/* ── Left: identity ─────────────────────────────────────────── */}
        <div className="flex items-start gap-3 flex-1 min-w-0 pr-5" style={{ borderRight: "1px solid #f1f5f9" }}>
          <div className="shrink-0 mt-0.5">
            <LogoOrInitials agencia={agencia} initials={initials} color="#004FBB" size={44} radius={12} />
          </div>
          <div className="flex-1 min-w-0">
            {/* Title: quoteName */}
            <div className="font-bold text-slate-900 truncate leading-tight" style={{ fontSize: 14 }}>
              {opp.quoteName || "Sin nombre"}
            </div>
            {/* Agencia · Agente */}
            <div className="text-xs text-slate-500 truncate mt-0.5">
              {opp.agencyName || "—"}{opp.agentName ? ` · ${opp.agentName}` : ""}
            </div>
            {/* Destino */}
            {opp.destination && (
              <div className="text-xs text-slate-400 truncate mt-0.5">{opp.destination}</div>
            )}

            <div className="flex flex-wrap items-center gap-1.5 mt-2">
              {/* Estado badge */}
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ring-1 ${estadoStyle.bg} ${estadoStyle.text} ${estadoStyle.ring}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${estadoStyle.dot}`} />{estadoLabel}
              </span>
              {/* Priority badge */}
              {opp.priorityManual && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-700 ring-1 ring-amber-300">
                  <Star className="w-2.5 h-2.5 fill-amber-500 text-amber-500" />PRIORIDAD
                </span>
              )}
            </div>

            {/* Ver cotizaciones */}
            <button type="button" onClick={onOpenQuotes}
              className="mt-2 flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-primary transition-colors">
              <ChevronRight className="w-3 h-3" />
              Ver cotizaciones ({opp.quotes.length})
            </button>
          </div>
        </div>

        {/* ── Center: value ──────────────────────────────────────────── */}
        <div className="flex flex-col justify-center items-center px-6 shrink-0" style={{ borderRight: "1px solid #f1f5f9", minWidth: 140 }}>
          {opp.totalLatest != null && opp.totalLatest > 0 ? (
            <div className="text-center">
              <div style={{ fontSize: 22, fontWeight: 800, color: "#004FBB", letterSpacing: "-0.03em", lineHeight: 1 }}>
                {fmtMoney(opp.totalLatest)}
              </div>
              <div className="text-[10px] text-slate-400 mt-1">Total cotización</div>
            </div>
          ) : (
            <div className="text-[11px] text-slate-400 text-center">Sin valor</div>
          )}
          {opp.latestQuoteCode && (
            <div className="text-[10px] font-mono text-slate-400 mt-2">{opp.latestQuoteCode}</div>
          )}
          <button type="button" onClick={onView}
            className="mt-2 text-[11px] font-semibold underline-offset-2 hover:underline transition-colors" style={{ color: "#004FBB" }}>
            Ver última
          </button>
        </div>

        {/* ── Right: urgency + actions ────────────────────────────────── */}
        <div className="flex flex-col justify-between items-end pl-5 shrink-0" style={{ minWidth: 168 }}>
          {/* Semáforo */}
          {!isClosedStatus ? (
            <div className="flex flex-col items-end gap-1">
              <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold" style={{ background: uMeta.bg, color: uMeta.color }}>
                <span className="w-2 h-2 rounded-full shrink-0" style={{ background: uMeta.dot }} />
                {uMeta.label}
              </div>
              <div className="text-[11px] text-slate-500 text-right">
                {sinActividad === 0 ? "Actualizado hoy" : `${sinActividad} día${sinActividad !== 1 ? "s" : ""} sin actualización`}
              </div>
              {opp.lastUpdateAt && (
                <div className="text-[10px] text-slate-400 text-right">
                  Últ. act.: {formatShortDate(opp.lastUpdateAt)}
                </div>
              )}
            </div>
          ) : (
            <div className="flex flex-col items-end gap-1">
              {opp.status === "confirmada" ? (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700">
                  <CheckCircle2 className="w-3 h-3" />Confirmada
                </span>
              ) : (
                <span className="flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-semibold bg-slate-100 text-slate-500">
                  <XCircle className="w-3 h-3" />Perdida
                </span>
              )}
              <div className="text-[10px] text-slate-400 text-right">{formatDate(opp.lastUpdateAt)}</div>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-1.5 mt-3">
            <button type="button" onClick={onView}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl text-white text-[12px] font-semibold hover:opacity-90 transition-opacity" style={{ background: "#004FBB" }}>
              <ExternalLink className="w-3 h-3" />Abrir
            </button>
            <button ref={menuBtnRef} type="button" onClick={openMenu}
              className="w-8 h-8 flex items-center justify-center rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-500 transition-colors">
              <MoreHorizontal className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Portal menu */}
      {menuOpen && menuPos && createPortal(
        <div ref={menuRef} className="fixed bg-white rounded-xl shadow-xl py-1 min-w-[210px] z-[9999]" style={{ top: menuPos.top, right: menuPos.right, border: "1px solid #e2e8f0", boxShadow: "0 8px 32px rgba(0,0,0,0.14), 0 2px 8px rgba(0,0,0,0.08)" }}>
          <MenuItem icon={<Pencil className="w-3.5 h-3.5" />} label="Editar" onClick={() => { onEdit(); close(); }} />
          {onDuplicate && <MenuItem icon={<Copy className="w-3.5 h-3.5" />} label="Duplicar" onClick={() => { onDuplicate(); close(); }} />}
          <MenuItem icon={<MessageSquare className="w-3.5 h-3.5" />} label="Seguimiento / CRM" onClick={() => { onCRM(); close(); }} />
          <div className="h-px bg-slate-100 my-1" />
          <MenuItem
            icon={opp.priorityManual ? <Star className="w-3.5 h-3.5 text-amber-500" /> : <Star className="w-3.5 h-3.5" />}
            label={opp.priorityManual ? "Quitar prioridad" : "Marcar prioridad"}
            onClick={() => {
              onUpdateOpportunity({ priorityManual: !opp.priorityManual });
              close();
            }}
          />
          <div className="h-px bg-slate-100 my-1" />
          <MenuItem icon={<CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />} label="Confirmar venta" onClick={() => { onUpdateOpportunity({ status: "confirmada" }); close(); }} />
          <MenuItem icon={<XCircle className="w-3.5 h-3.5 text-slate-400" />} label="Marcar como perdida" onClick={() => { onUpdateOpportunity({ status: "perdida" }); close(); }} />
          <div className="h-px bg-slate-100 my-1" />
          <MenuItem icon={<Trash2 className="w-3.5 h-3.5" />} label="Anular" onClick={() => { onAnular(); close(); }} danger />
        </div>,
        document.body
      )}
    </div>
  );
}

// ─── Anuladas View ────────────────────────────────────────────────────────────

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
        <div className="text-xs text-slate-400 mt-1">Las oportunidades anuladas aparecen aquí para que puedas restaurarlas si es necesario.</div>
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
          const agencia = agenciasMap.get((o.agencyName || "").toLowerCase());
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

// ─── Main Component ───────────────────────────────────────────────────────────

type VerPor = "urgencia" | "agencia" | "estado";

export default function Seguimiento({ items, opportunities, onView, onEdit, onDelete, onDuplicate, onUpdateCRM, onUpdateOpportunity }: Props) {
  const [tab, setTab] = useState<"activas" | "anuladas">("activas");
  const [query, setQuery] = useState("");
  const [verPor, setVerPor] = useState<VerPor>("urgencia");
  const [filterEstado, setFilterEstado] = useState<EstadoOportunidad | "todas">("todas");
  const [crmModal, setCrmModal] = useState<Opportunity | null>(null);
  const [quotesModal, setQuotesModal] = useState<Opportunity | null>(null);
  const [agencias, setAgencias] = useState<Agencia[]>([]);

  useEffect(() => { setAgencias(loadAgencias()); }, []);

  const agenciasMap = useMemo(() => {
    const map = new Map<string, Agencia>();
    for (const a of agencias) map.set(a.nombre.toLowerCase(), a);
    return map;
  }, [agencias]);

  const activeOpps = useMemo(() => opportunities.filter((o) => o.status !== "anulada"), [opportunities]);
  const anuladasOpps = useMemo(() => opportunities.filter((o) => o.status === "anulada"), [opportunities]);

  // ─── Metrics ──────────────────────────────────────────────────────────────

  const metrics = useMemo(() => {
    const open = activeOpps.filter((o) => o.status !== "confirmada" && o.status !== "perdida");
    return {
      total: activeOpps.length,
      prioritarias: open.filter((o) => o.priorityManual).length,
      urgentes: open.filter((o) => getUrgency(o) === "red").length,
      requierenSeg: open.filter((o) => getUrgency(o) === "yellow").length,
      alDia: open.filter((o) => getUrgency(o) === "green").length,
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
      // Within same priority bucket, sort by lastUpdateAt oldest first
      return new Date(a.lastUpdateAt).getTime() - new Date(b.lastUpdateAt).getTime();
    });
  }, [activeOpps, query, filterEstado, verPor]);

  // ─── Actions ──────────────────────────────────────────────────────────────

  const onAnular = (o: Opportunity) => {
    onUpdateOpportunity(o.id, { status: "anulada" });
  };

  const onRestaurar = (o: Opportunity) => {
    onUpdateOpportunity(o.id, { status: "nueva" });
  };

  // Find latest quote CotizacionGuardada for an opportunity
  const getLatestQuote = (o: Opportunity): CotizacionGuardada | undefined => {
    for (const qRef of o.quotes) {
      const found = items.find((g) => g.id === qRef.id);
      if (found) return found;
    }
    return undefined;
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
        <button type="button" onClick={() => setTab("anuladas")} className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === "anuladas" ? "bg-slate-900 text-white shadow-sm" : "text-slate-500 hover:text-slate-700"}`}>
          Anuladas
          {anuladasOpps.length > 0 && <span className={`text-[11px] font-bold px-1.5 py-0.5 rounded-full ${tab === "anuladas" ? "bg-white/20" : "bg-red-50 text-red-500"}`}>{anuladasOpps.length}</span>}
        </button>
      </div>

      {tab === "anuladas" ? (
        <AnuladasView opps={anuladasOpps} agenciasMap={agenciasMap} onRestaurar={onRestaurar} />
      ) : (
        <>
          {/* ── Metrics bar ──────────────────────────────────────────────────── */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            <KpiCard label="Total oportunidades" value={metrics.total} color="bg-blue-50 text-blue-600" icon={<TrendingUp className="w-5 h-5" />} />
            <KpiCard label="Prioritarias" value={metrics.prioritarias} color="" iconStyle={{ backgroundColor: "#fef9c3", color: "#ca8a04" }} icon={<Star className="w-5 h-5" />} />
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
              <select value={filterEstado} onChange={(e) => setFilterEstado(e.target.value as EstadoOportunidad | "todas")} className={selectCls} style={{ minWidth: 130 }}>
                <option value="todas">Estado: Todos</option>
                {ESTADO_OPP_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
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
                const agencia = agenciasMap.get((o.agencyName || "").toLowerCase());
                const latestQuote = getLatestQuote(o);
                return (
                  <OpportunityCard
                    key={o.id} opp={o}
                    agencia={agencia}
                    allQuotes={items}
                    onView={() => { if (latestQuote) onView(latestQuote); }}
                    onEdit={() => { if (latestQuote) onEdit(latestQuote); }}
                    onDuplicate={onDuplicate && latestQuote ? () => onDuplicate!(latestQuote) : undefined}
                    onCRM={() => setCrmModal(o)}
                    onUpdateOpportunity={(patch) => onUpdateOpportunity(o.id, patch)}
                    onAnular={() => onAnular(o)}
                    onOpenQuotes={() => setQuotesModal(o)}
                  />
                );
              })}
            </div>
          )}
        </>
      )}

      {/* ── CRM Modal ─────────────────────────────────────────────────────── */}
      {crmModal && (
        <OppCrmModal
          opp={crmModal}
          onClose={() => setCrmModal(null)}
          onSave={(patch) => { onUpdateOpportunity(crmModal.id, patch); setCrmModal(null); }}
        />
      )}

      {/* ── Quotes Modal ──────────────────────────────────────────────────── */}
      {quotesModal && (
        <QuotesModal
          opp={quotesModal}
          allQuotes={items}
          onClose={() => setQuotesModal(null)}
          onView={onView}
          onDuplicate={onDuplicate}
        />
      )}
    </div>
  );
}
