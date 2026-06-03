import { useState, useRef, useEffect, useCallback } from "react";
import { createPortal } from "react-dom";
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
  ChevronRight,
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

function fmtMoney(n?: number): string {
  if (!n || n === 0) return "";
  return `${n.toLocaleString("es-ES", { maximumFractionDigits: 0 })} US$`;
}

function relativeTime(iso?: string): string {
  if (!iso) return "";
  const days = daysSince(iso);
  if (days === 0) return "hoy";
  if (days === 1) return "hace 1 día";
  return `hace ${days} días`;
}

// ─── Flat alert types ─────────────────────────────────────────────────────────

type FlatAlertKind = "sin_seguimiento" | "vence_manana" | "vence_pronto" | "recordatorio";

interface FlatAlert {
  g: CotizacionGuardada;
  kind: FlatAlertKind;
  label: string;
  sublabel?: string;
  priority: number;
}

function buildFlatAlerts(items: CotizacionGuardada[]): FlatAlert[] {
  const alerts: FlatAlert[] = [];

  for (const g of items) {
    const estado = g.estadoCRM ?? "nueva";
    if (estado === "confirmada" || estado === "perdida") continue;

    const sinActividad = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
    const diasHastaVigencia = daysUntil(g.cliente.vigencia);
    const valor = g.valorCotizacion ?? 0;

    if (diasHastaVigencia === 1) {
      alerts.push({
        g,
        kind: "vence_manana",
        label: "Cotización vence mañana",
        sublabel: relativeTime(g.ultimoSeguimiento ?? g.fechaCreacion),
        priority: 2000 + valor,
      });
      continue;
    }

    if (diasHastaVigencia !== null && diasHastaVigencia >= 2 && diasHastaVigencia <= 5) {
      alerts.push({
        g,
        kind: "vence_pronto",
        label: `Cotización vence en ${diasHastaVigencia} días`,
        sublabel: relativeTime(g.ultimoSeguimiento ?? g.fechaCreacion),
        priority: 1000 + (5 - diasHastaVigencia) * 200 + (valor > 1500 ? 30 : 0),
      });
    }

    if (g.recordatorio) {
      const rd = daysUntil(g.recordatorio);
      if (rd !== null && rd <= 1) {
        alerts.push({
          g,
          kind: "recordatorio",
          label: rd <= 0 ? "Recordatorio para hoy" : "Recordatorio mañana",
          sublabel: isDateToday(g.recordatorio) ? undefined : relativeTime(g.ultimoSeguimiento ?? g.fechaCreacion),
          priority: rd <= 0 ? 1500 : 800,
        });
      }
    }

    if (sinActividad >= 3) {
      const alreadyAdded = alerts.some(
        (a) => a.g.id === g.id && a.kind === "vence_manana",
      );
      if (!alreadyAdded) {
        alerts.push({
          g,
          kind: "sin_seguimiento",
          label:
            sinActividad >= 5
              ? `Sin seguimiento hace ${sinActividad} días`
              : "Sin seguimiento hace 3 días",
          sublabel: relativeTime(g.ultimoSeguimiento ?? g.fechaCreacion),
          priority: sinActividad * 10 + (valor > 1500 ? 30 : valor > 500 ? 15 : 0),
        });
      }
    }
  }

  const byId = new Map<string, FlatAlert>();
  for (const a of alerts) {
    const existing = byId.get(a.g.id);
    if (!existing || a.priority > existing.priority) byId.set(a.g.id, a);
  }

  return Array.from(byId.values()).sort((a, b) => b.priority - a.priority);
}

// ─── Portal Panel ─────────────────────────────────────────────────────────────

interface PanelPosition {
  top: number;
  right: number;
}

function NotificationPanel({
  open,
  anchorRef,
  onClose,
  children,
}: {
  open: boolean;
  anchorRef: React.RefObject<HTMLButtonElement | null>;
  onClose: () => void;
  children: React.ReactNode;
}) {
  const [pos, setPos] = useState<PanelPosition | null>(null);
  const [mounted, setMounted] = useState(false);
  const [visible, setVisible] = useState(false);

  const updatePos = useCallback(() => {
    if (!anchorRef.current) return;
    const rect = anchorRef.current.getBoundingClientRect();
    setPos({
      top: rect.bottom + 12,
      right: window.innerWidth - rect.right,
    });
  }, [anchorRef]);

  useEffect(() => {
    if (open) {
      updatePos();
      setMounted(true);
      // Trigger animation on next frame
      requestAnimationFrame(() => {
        requestAnimationFrame(() => setVisible(true));
      });
      return undefined;
    } else {
      setVisible(false);
      const t = setTimeout(() => setMounted(false), 200);
      return () => clearTimeout(t);
    }
  }, [open, updatePos]);

  useEffect(() => {
    if (!open) return;
    window.addEventListener("resize", updatePos);
    window.addEventListener("scroll", updatePos, true);
    return () => {
      window.removeEventListener("resize", updatePos);
      window.removeEventListener("scroll", updatePos, true);
    };
  }, [open, updatePos]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handler(e: MouseEvent) {
      const target = e.target as Node;
      if (anchorRef.current?.contains(target)) return;
      const panel = document.getElementById("notification-panel-portal");
      if (panel && panel.contains(target)) return;
      onClose();
    }
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open, onClose, anchorRef]);

  if (!mounted || !pos) return null;

  return createPortal(
    <>
      {/* Invisible overlay to capture outside clicks — below the panel */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 9998,
          background: "transparent",
        }}
        onMouseDown={onClose}
      />
      {/* Panel */}
      <div
        id="notification-panel-portal"
        style={{
          position: "fixed",
          top: pos.top,
          right: pos.right,
          zIndex: 9999,
          width: "min(440px, calc(100vw - 24px))",
          maxHeight: "min(540px, 90vh)",
          display: "flex",
          flexDirection: "column",
          background: "#ffffff",
          borderRadius: 24,
          boxShadow: "0 20px 60px rgba(4,25,65,0.18), 0 4px 16px rgba(4,25,65,0.08)",
          border: "1px solid rgba(4,25,65,0.07)",
          overflow: "hidden",
          opacity: visible ? 1 : 0,
          transform: visible ? "translateY(0) scale(1)" : "translateY(-8px) scale(0.98)",
          transition: "opacity 0.2s ease, transform 0.2s ease",
          pointerEvents: visible ? "auto" : "none",
        }}
      >
        {children}
      </div>
    </>,
    document.body,
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

interface Props {
  items: CotizacionGuardada[];
  onView: (g: CotizacionGuardada) => void;
  onUpdateCRM: (id: string, patch: Partial<CotizacionGuardada>) => void;
  onGoToSeguimiento?: () => void;
}

export default function NotificationBell({
  items,
  onView,
  onUpdateCRM,
  onGoToSeguimiento,
}: Props) {
  const [open, setOpen] = useState(false);
  const [readIds, setReadIds] = useState<Set<string>>(new Set());
  const bellRef = useRef<HTMLButtonElement>(null);

  const allAlerts = buildFlatAlerts(items);
  const totalBadge = allAlerts.length;
  const visible = allAlerts.slice(0, 5);
  const hasMore = allAlerts.length > 5;

  useEffect(() => {
    if (open && visible.length > 0) {
      setReadIds((prev) => new Set([...prev, ...visible.map((a) => a.g.id)]));
    }
  }, [open]);

  const close = useCallback(() => setOpen(false), []);

  const markAtendida = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, {
      ultimoSeguimiento: new Date().toISOString(),
      recordatorio: undefined,
      historial: [
        {
          fecha: new Date().toISOString(),
          tipo: "estado_cambiado" as ActividadTipo,
          detalle: "Marcado como atendido",
        },
        ...(g.historial ?? []),
      ].slice(0, 50),
    });
  };

  const posponer = (g: CotizacionGuardada) => {
    onUpdateCRM(g.id, {
      ultimoSeguimiento: new Date().toISOString(),
      recordatorio: addDays(1),
      historial: [
        {
          fecha: new Date().toISOString(),
          tipo: "estado_cambiado" as ActividadTipo,
          detalle: "Pospuesto 1 día",
        },
        ...(g.historial ?? []),
      ].slice(0, 50),
    });
  };

  const markAllRead = () => {
    for (const a of visible) markAtendida(a.g);
  };

  return (
    <>
      {/* Bell Button */}
      <button
        ref={bellRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors"
        aria-label={`Notificaciones${totalBadge > 0 ? ` (${totalBadge})` : ""}`}
      >
        <Bell
          className="w-5 h-5"
          style={{
            color: "#E6AE33",
            fill: totalBadge > 0 ? "rgba(230,174,51,0.18)" : "none",
          }}
        />
        {totalBadge > 0 && (
          <span
            className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm"
            style={{ background: "#E6AE33" }}
          >
            {totalBadge > 99 ? "99+" : totalBadge}
          </span>
        )}
      </button>

      {/* Portal Panel */}
      <NotificationPanel open={open} anchorRef={bellRef} onClose={close}>
        {/* Header */}
        <div className="flex items-start justify-between px-4 py-3 border-b border-slate-100 shrink-0">
          <div>
            <div className="text-sm font-bold text-slate-900">Notificaciones</div>
            <div className="text-[11px] text-slate-400 mt-0.5">
              Alertas que requieren atención
            </div>
          </div>
          <div className="flex items-center gap-3 ml-2">
            {totalBadge > 0 && (
              <button
                type="button"
                onClick={markAllRead}
                className="text-[11px] text-slate-400 hover:text-slate-700 transition-colors whitespace-nowrap"
              >
                Marcar todas como leídas
              </button>
            )}
            <button
              type="button"
              onClick={close}
              className="w-6 h-6 flex items-center justify-center rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>

        {/* Alert list */}
        <div className="overflow-y-auto flex-1">
          {visible.length === 0 ? (
            <div className="flex flex-col items-center py-10 gap-2">
              <div
                className="w-12 h-12 rounded-full flex items-center justify-center mb-1"
                style={{ background: "rgba(16,185,129,0.1)" }}
              >
                <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              </div>
              <div className="text-sm font-semibold text-slate-800">✓ Todo al día</div>
              <div className="text-xs text-slate-400">
                No tienes cotizaciones pendientes.
              </div>
            </div>
          ) : (
            <div className="divide-y divide-slate-50">
              {visible.map((alert) => (
                <AlertDropdownItem
                  key={alert.g.id + alert.kind}
                  alert={alert}
                  isRead={readIds.has(alert.g.id)}
                  onView={() => {
                    onView(alert.g);
                    close();
                  }}
                  onAtender={() => markAtendida(alert.g)}
                  onPosponer={() => posponer(alert.g)}
                />
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 px-4 py-2.5 shrink-0">
          <button
            type="button"
            onClick={() => {
              close();
              onGoToSeguimiento?.();
            }}
            className="flex items-center justify-center gap-1 text-xs font-semibold w-full py-0.5 transition-colors hover:opacity-80"
            style={{ color: "#004FBB" }}
          >
            {hasMore
              ? `Ver todas en Seguimiento (${allAlerts.length - 5} más)`
              : "Ver todas en Seguimiento"}
            <ChevronRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </NotificationPanel>
    </>
  );
}

// ─── Alert Dropdown Item ───────────────────────────────────────────────────────

const KIND_CONFIG: Record<
  FlatAlertKind,
  { icon: React.ReactNode; color: string; dot: string }
> = {
  sin_seguimiento: {
    icon: <AlertTriangle className="w-4 h-4" style={{ color: "#E6AE33" }} />,
    color: "#92400e",
    dot: "#E6AE33",
  },
  vence_manana: {
    icon: <CalendarClock className="w-4 h-4 text-red-500" />,
    color: "#991b1b",
    dot: "#ef4444",
  },
  vence_pronto: {
    icon: <CalendarClock className="w-4 h-4 text-amber-500" />,
    color: "#92400e",
    dot: "#f59e0b",
  },
  recordatorio: {
    icon: <Clock className="w-4 h-4 text-blue-500" />,
    color: "#1e40af",
    dot: "#3b82f6",
  },
};

function AlertDropdownItem({
  alert,
  isRead,
  onView,
  onAtender,
  onPosponer,
}: {
  alert: FlatAlert;
  isRead: boolean;
  onView: () => void;
  onAtender: () => void;
  onPosponer: () => void;
}) {
  const cfg = KIND_CONFIG[alert.kind];
  const agencia = alert.g.cliente.nombre || "(sin nombre)";
  const valor = alert.g.valorCotizacion;

  return (
    <div className="px-4 py-3 hover:bg-slate-50/70 transition-colors relative">
      {!isRead && (
        <span
          className="absolute left-1.5 top-4 w-1.5 h-1.5 rounded-full"
          style={{ background: cfg.dot }}
        />
      )}

      <div className="flex items-start gap-2.5">
        <div className="mt-0.5 shrink-0">{cfg.icon}</div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold text-slate-900 truncate">
              {agencia}
            </span>
            {valor != null && valor > 0 && (
              <span className="text-[11px] font-bold shrink-0" style={{ color: "#041941" }}>
                {fmtMoney(valor)}
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5 flex-wrap">
            {alert.g.numeroCotizacion && (
              <span className="text-[11px] text-slate-400 font-mono">
                {alert.g.numeroCotizacion}
              </span>
            )}
            {alert.sublabel && (
              <span className="text-[11px] text-slate-400">· {alert.sublabel}</span>
            )}
          </div>

          <div className="text-[11px] font-semibold mt-0.5" style={{ color: cfg.color }}>
            {alert.label}
          </div>

          <div className="flex items-center gap-1.5 mt-2">
            <button
              type="button"
              onClick={onView}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-white text-[11px] font-semibold transition-colors hover:opacity-90"
              style={{ background: "#004FBB" }}
            >
              <ExternalLink className="w-3 h-3" />
              Abrir
            </button>
            <button
              type="button"
              onClick={onAtender}
              className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-semibold ring-1 ring-emerald-200 transition-colors"
            >
              <Check className="w-3 h-3" />
              Atendida
            </button>
            {alert.kind !== "vence_manana" && (
              <button
                type="button"
                onClick={onPosponer}
                className="flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-colors hover:opacity-90"
                style={{
                  background: "rgba(230,174,51,0.08)",
                  color: "#92400e",
                  border: "1px solid rgba(230,174,51,0.35)",
                }}
              >
                <AlarmClock className="w-3 h-3" />
                Posponer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
