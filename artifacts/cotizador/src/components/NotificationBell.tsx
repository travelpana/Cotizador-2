import { useState, useRef, useEffect } from "react";
import {
  Bell,
  X,
  Check,
  AlarmClock,
  AlertTriangle,
  ExternalLink,
  Clock,
  CheckCircle2,
  CalendarClock,
  BellRing,
} from "lucide-react";
import type { CotizacionGuardada, ActividadTipo } from "./Guardadas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function addDays(n: number): string {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d.toISOString().slice(0, 10);
}

function formatDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toLocaleDateString("es-ES", { day: "2-digit", month: "short" });
}

function fmtMoney(n?: number): string {
  if (!n) return "";
  return n.toLocaleString("es-ES", { style: "currency", currency: "USD", maximumFractionDigits: 0 });
}

// ─── Alert items ──────────────────────────────────────────────────────────────

interface AccionAlert {
  g: CotizacionGuardada;
  kind: "accion";
  reason: string;
  sinActividad: number;
  priority: number;
}

interface VencimientoAlert {
  g: CotizacionGuardada;
  kind: "vencimiento";
  diasRestantes: number;
  priority: number;
}

interface RecordatorioAlert {
  g: CotizacionGuardada;
  kind: "recordatorio";
  fecha: string;
  priority: number;
}

interface ConfirmadaAlert {
  g: CotizacionGuardada;
  kind: "confirmada";
  priority: number;
}

type AlertItem = AccionAlert | VencimientoAlert | RecordatorioAlert | ConfirmadaAlert;

function buildAlerts(items: CotizacionGuardada[]): {
  accion: AccionAlert[];
  vencimiento: VencimientoAlert[];
  recordatorios: RecordatorioAlert[];
  confirmadas: ConfirmadaAlert[];
} {
  const accion: AccionAlert[] = [];
  const vencimiento: VencimientoAlert[] = [];
  const recordatorios: RecordatorioAlert[] = [];
  const confirmadas: ConfirmadaAlert[] = [];

  for (const g of items) {
    const estado = g.estadoCRM ?? "nueva";
    const isActive = estado !== "confirmada" && estado !== "perdida";
    const sinActividad = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
    const diasHastaVigencia = daysUntil(g.cliente.vigencia);
    const valor = g.valorCotizacion ?? 0;

    // 🔴 Requieren acción
    if (isActive) {
      if (sinActividad >= 3) {
        const reason =
          sinActividad >= 5
            ? `${sinActividad} días sin seguimiento`
            : "3 días sin seguimiento";
        // priority: más días = más urgente; valor alto sube
        const priority = sinActividad * 10 + (valor > 1500 ? 30 : valor > 500 ? 15 : 0);
        accion.push({ g, kind: "accion", reason, sinActividad, priority });
      } else if (diasHastaVigencia !== null && diasHastaVigencia <= 1) {
        accion.push({
          g,
          kind: "accion",
          reason: diasHastaVigencia <= 0 ? "Vigencia vencida" : "Vence mañana",
          sinActividad,
          priority: 1000 + valor,
        });
      }
    }

    // 🟡 Próximas a vencer (1–5 días)
    if (isActive && diasHastaVigencia !== null && diasHastaVigencia >= 2 && diasHastaVigencia <= 5) {
      const priority =
        (5 - diasHastaVigencia) * 100 + (valor > 1500 ? 30 : valor > 500 ? 15 : 0);
      vencimiento.push({ g, kind: "vencimiento", diasRestantes: diasHastaVigencia, priority });
    }

    // 🔵 Recordatorios
    if (g.recordatorio) {
      const recDays = daysUntil(g.recordatorio);
      if (recDays !== null && recDays <= 1) {
        recordatorios.push({
          g,
          kind: "recordatorio",
          fecha: g.recordatorio,
          priority: recDays <= 0 ? 1000 : 0,
        });
      }
    }

    // 🟢 Confirmadas recientes (últimos 14 días)
    if (estado === "confirmada") {
      const dias = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
      if (dias <= 14) {
        confirmadas.push({ g, kind: "confirmada", priority: dias });
      }
    }
  }

  // Sort each category by priority descending
  accion.sort((a, b) => b.priority - a.priority);
  vencimiento.sort((a, b) => b.priority - a.priority);
  recordatorios.sort((a, b) => b.priority - a.priority);
  confirmadas.sort((a, b) => a.priority - b.priority); // most recent first

  return { accion, vencimiento, recordatorios, confirmadas };
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
}

export default function NotificationBell({ items, onView, onUpdateCRM }: Props) {
  const [open, setOpen] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const btnRef = useRef<HTMLButtonElement>(null);

  const { accion, vencimiento, recordatorios, confirmadas } = buildAlerts(items);
  const urgentCount = accion.length + vencimiento.length + recordatorios.filter(r => daysUntil(r.fecha) !== null && daysUntil(r.fecha)! <= 0).length;
  const totalBadge = accion.length + vencimiento.length + recordatorios.length;

  useEffect(() => {
    function handler(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        btnRef.current &&
        !btnRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    if (open) document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

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

  const posponer = (g: CotizacionGuardada, days = 1) => {
    onUpdateCRM(g.id, {
      ultimoSeguimiento: new Date().toISOString(),
      recordatorio: addDays(days),
      historial: [
        { fecha: new Date().toISOString(), tipo: "estado_cambiado" as ActividadTipo, detalle: `Pospuesto ${days} día${days !== 1 ? "s" : ""}` },
        ...(g.historial ?? []),
      ].slice(0, 50),
    });
  };

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label={`Notificaciones${totalBadge > 0 ? ` (${totalBadge})` : ""}`}
      >
        <Bell
          className="w-5 h-5"
          style={{ color: "#E6AE33", fill: totalBadge > 0 ? "rgba(230,174,51,0.15)" : "none" }}
        />
        {totalBadge > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>

      {/* Drawer Panel */}
      {open && (
        <>
          {/* backdrop */}
          <div
            className="fixed inset-0 z-[199] bg-black/20"
            onClick={() => setOpen(false)}
          />
          <div
            ref={panelRef}
            className="fixed top-0 right-0 h-full w-[400px] max-w-[95vw] bg-white shadow-2xl z-[200] flex flex-col"
            style={{ borderLeft: "1px solid #e2e8f0" }}
          >
            {/* Header */}
            <div
              className="flex items-center justify-between px-5 py-4 shrink-0"
              style={{ background: "#041941" }}
            >
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: "rgba(230,174,51,0.15)" }}>
                  <BellRing className="w-4 h-4" style={{ color: "#E6AE33" }} />
                </div>
                <div>
                  <div className="text-sm font-bold text-white">Centro de alertas</div>
                  {totalBadge > 0 ? (
                    <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>
                      {totalBadge} alerta{totalBadge !== 1 ? "s" : ""} activa{totalBadge !== 1 ? "s" : ""}
                    </div>
                  ) : (
                    <div className="text-[11px]" style={{ color: "rgba(255,255,255,0.6)" }}>Todo al día</div>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg text-white/50 hover:text-white hover:bg-white/10 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto bg-slate-50">
              {totalBadge === 0 && confirmadas.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-400">
                  <CheckCircle2 className="w-10 h-10 text-emerald-400" />
                  <div className="text-sm font-semibold text-slate-600">¡Todo bajo control!</div>
                  <div className="text-xs text-slate-400">No hay alertas pendientes</div>
                </div>
              ) : (
                <div className="divide-y divide-slate-200">
                  {/* 🔴 Requieren acción */}
                  {accion.length > 0 && (
                    <AlertSection
                      title="Requieren acción"
                      emoji="🔴"
                      count={accion.length}
                      color="red"
                    >
                      {accion.map((a) => (
                        <AlertCard
                          key={a.g.id}
                          g={a.g}
                          subtitle={a.reason}
                          icon={<AlertTriangle className="w-4 h-4 text-red-500" />}
                          accentColor="red"
                          onView={() => { onView(a.g); setOpen(false); }}
                          onAtender={() => markAtendida(a.g)}
                          onPosponer={() => posponer(a.g)}
                        />
                      ))}
                    </AlertSection>
                  )}

                  {/* 🟡 Próximas a vencer */}
                  {vencimiento.length > 0 && (
                    <AlertSection
                      title="Próximas a vencer"
                      emoji="🟡"
                      count={vencimiento.length}
                      color="amber"
                    >
                      {vencimiento.map((v) => (
                        <AlertCard
                          key={v.g.id}
                          g={v.g}
                          subtitle={
                            v.diasRestantes === 1
                              ? "Vence mañana"
                              : `Vence en ${v.diasRestantes} días · ${formatDate(v.g.cliente.vigencia)}`
                          }
                          icon={<CalendarClock className="w-4 h-4 text-amber-500" />}
                          accentColor="amber"
                          onView={() => { onView(v.g); setOpen(false); }}
                          onAtender={() => markAtendida(v.g)}
                          onPosponer={() => posponer(v.g)}
                        />
                      ))}
                    </AlertSection>
                  )}

                  {/* 🔵 Recordatorios */}
                  {recordatorios.length > 0 && (
                    <AlertSection
                      title="Recordatorios"
                      emoji="🔵"
                      count={recordatorios.length}
                      color="blue"
                    >
                      {recordatorios.map((r) => {
                        const du = daysUntil(r.fecha);
                        const label =
                          du === null
                            ? formatDate(r.fecha)
                            : du <= 0
                              ? "Recordatorio de hoy"
                              : "Recordatorio mañana";
                        return (
                          <AlertCard
                            key={r.g.id}
                            g={r.g}
                            subtitle={label}
                            icon={<Clock className="w-4 h-4 text-blue-500" />}
                            accentColor="blue"
                            onView={() => { onView(r.g); setOpen(false); }}
                            onAtender={() => markAtendida(r.g)}
                            onPosponer={() => posponer(r.g)}
                          />
                        );
                      })}
                    </AlertSection>
                  )}

                  {/* 🟢 Confirmadas recientemente */}
                  {confirmadas.length > 0 && (
                    <AlertSection
                      title="Confirmadas recientes"
                      emoji="🟢"
                      count={confirmadas.length}
                      color="emerald"
                    >
                      {confirmadas.map((c) => (
                        <AlertCard
                          key={c.g.id}
                          g={c.g}
                          subtitle={`Confirmada hace ${c.priority === 0 ? "hoy" : `${c.priority} día${c.priority !== 1 ? "s" : ""}`}`}
                          icon={<CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                          accentColor="emerald"
                          onView={() => { onView(c.g); setOpen(false); }}
                          readonly
                        />
                      ))}
                    </AlertSection>
                  )}
                </div>
              )}
            </div>

            {/* Footer */}
            {urgentCount > 0 && (
              <div
                className="px-5 py-3 shrink-0 text-center text-xs border-t border-slate-200"
                style={{ color: "#041941" }}
              >
                <span className="font-semibold">{urgentCount}</span> alerta{urgentCount !== 1 ? "s" : ""} requiere{urgentCount !== 1 ? "n" : ""} atención inmediata
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}

// ─── Section wrapper ───────────────────────────────────────────────────────────

const COLOR_MAP: Record<string, { bg: string; text: string; badge: string }> = {
  red:     { bg: "bg-red-50",     text: "text-red-700",     badge: "bg-red-500"     },
  amber:   { bg: "bg-amber-50",   text: "text-amber-700",   badge: "bg-amber-500"   },
  blue:    { bg: "bg-blue-50",    text: "text-blue-700",    badge: "bg-blue-500"    },
  emerald: { bg: "bg-emerald-50", text: "text-emerald-700", badge: "bg-emerald-500" },
};

function AlertSection({
  title,
  emoji,
  count,
  color,
  children,
}: {
  title: string;
  emoji: string;
  count: number;
  color: string;
  children: React.ReactNode;
}) {
  const c = COLOR_MAP[color] ?? COLOR_MAP.blue;
  return (
    <div>
      <div className={`flex items-center gap-2 px-4 py-2.5 ${c.bg} border-b border-slate-200`}>
        <span className="text-sm">{emoji}</span>
        <span className={`text-[11px] font-bold uppercase tracking-wide ${c.text}`}>{title}</span>
        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${c.badge} text-white`}>
          {count}
        </span>
      </div>
      {children}
    </div>
  );
}

// ─── Alert Card ───────────────────────────────────────────────────────────────

function AlertCard({
  g,
  subtitle,
  icon,
  accentColor,
  onView,
  onAtender,
  onPosponer,
  readonly = false,
}: {
  g: CotizacionGuardada;
  subtitle: string;
  icon: React.ReactNode;
  accentColor: string;
  onView: () => void;
  onAtender?: () => void;
  onPosponer?: () => void;
  readonly?: boolean;
}) {
  const nombre = g.cliente.nombre || "(sin nombre)";
  const valor = g.valorCotizacion;

  return (
    <div className="px-4 py-3 bg-white hover:bg-slate-50/70 transition-colors">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">{icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-slate-900 truncate">{nombre}</span>
            {valor != null && valor > 0 && (
              <span className="text-[10px] font-bold text-slate-500 shrink-0">{fmtMoney(valor)}</span>
            )}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">{subtitle}</div>
          {g.numeroCotizacion && (
            <div className="text-[10px] text-slate-400 mt-0.5">{g.numeroCotizacion}</div>
          )}
        </div>
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5 mt-2.5 ml-7">
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold transition-colors"
          style={{ background: "#041941" }}
        >
          <ExternalLink className="w-3 h-3" />
          Abrir
        </button>
        {!readonly && onAtender && (
          <button
            type="button"
            onClick={onAtender}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200 transition-colors"
          >
            <Check className="w-3 h-3" />
            Atendida
          </button>
        )}
        {!readonly && onPosponer && (
          <button
            type="button"
            onClick={onPosponer}
            className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-semibold ring-1 ring-amber-200 transition-colors"
          >
            <AlarmClock className="w-3 h-3" />
            Posponer
          </button>
        )}
      </div>
    </div>
  );
}
