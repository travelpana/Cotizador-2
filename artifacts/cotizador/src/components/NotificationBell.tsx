import { useState, useRef, useEffect } from "react";
import {
  Bell,
  Phone,
  MessageCircle,
  Mail,
  Clock,
  CreditCard,
  Send,
  X,
  Check,
  AlarmClock,
  AlertTriangle,
  ExternalLink,
  ShieldAlert,
} from "lucide-react";
import type { CotizacionGuardada, TipoProximaAccion } from "./Guardadas";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function daysSince(iso?: string): number {
  if (!iso) return 999;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return 999;
  return Math.floor((Date.now() - d.getTime()) / (1000 * 60 * 60 * 24));
}

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

function tomorrow(): string {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

// ─── Types ────────────────────────────────────────────────────────────────────

type NotifLevel = "riesgo" | "vencido" | "pendiente" | "accion_hoy";

interface NotifItem {
  g: CotizacionGuardada;
  level: NotifLevel;
  days?: number;
}

const TIPO_ACCION_ICONS: Record<TipoProximaAccion, typeof Phone> = {
  llamar: Phone,
  whatsapp: MessageCircle,
  correo: Mail,
  esperar: Clock,
  confirmarPago: CreditCard,
  reenviar: Send,
  recordatorio: Bell,
};

const TIPO_ACCION_LABELS: Record<TipoProximaAccion, string> = {
  llamar: "Llamar",
  whatsapp: "WhatsApp",
  correo: "Correo",
  esperar: "Esperar respuesta",
  confirmarPago: "Confirmar pago",
  reenviar: "Reenviar propuesta",
  recordatorio: "Recordatorio",
};

const LEVEL_META: Record<
  NotifLevel,
  { label: string; color: string; iconColor: string; dotColor: string }
> = {
  riesgo: {
    label: "Riesgo de perder cliente",
    color: "bg-red-50 border-red-200",
    iconColor: "text-red-500",
    dotColor: "bg-red-500",
  },
  vencido: {
    label: "Seguimiento vencido",
    color: "bg-orange-50 border-orange-200",
    iconColor: "text-orange-500",
    dotColor: "bg-orange-500",
  },
  pendiente: {
    label: "Seguimiento pendiente",
    color: "bg-amber-50 border-amber-200",
    iconColor: "text-amber-500",
    dotColor: "bg-amber-400",
  },
  accion_hoy: {
    label: "Acción para hoy",
    color: "bg-blue-50 border-blue-200",
    iconColor: "text-blue-500",
    dotColor: "bg-blue-500",
  },
};

function buildNotifications(items: CotizacionGuardada[]): NotifItem[] {
  const result: NotifItem[] = [];
  const active = items.filter(
    (g) => g.estadoCRM !== "confirmada" && g.estadoCRM !== "perdida",
  );

  // Acción hoy first
  for (const g of active) {
    if (isAccionHoy(g)) {
      result.push({ g, level: "accion_hoy" });
    }
  }

  // Then riesgo > vencido > pendiente (skip if already added as accion_hoy)
  const accionHoyIds = new Set(result.map((n) => n.g.id));
  for (const g of active) {
    if (accionHoyIds.has(g.id)) continue;
    const days = daysSince(g.ultimoSeguimiento ?? g.fechaCreacion);
    if (days > 14) result.push({ g, level: "riesgo", days });
    else if (days > 7) result.push({ g, level: "vencido", days });
    else if (days > 3) result.push({ g, level: "pendiente", days });
  }

  return result;
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

  const notifications = buildNotifications(items);
  const count = notifications.length;

  // Close on outside click
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

  const handleMarcarRealizada = (notif: NotifItem) => {
    const patch: Partial<CotizacionGuardada> = {
      ultimoSeguimiento: new Date().toISOString(),
      historial: [
        {
          fecha: new Date().toISOString(),
          tipo: "estado_cambiado" as const,
          detalle: "Seguimiento marcado como realizado",
        },
        ...(notif.g.historial ?? []),
      ].slice(0, 50),
    };
    if (notif.level === "accion_hoy") {
      patch.fechaProximaAccion = undefined;
      patch.tipoProximaAccion = undefined;
    }
    onUpdateCRM(notif.g.id, patch);
  };

  const handlePosponer = (notif: NotifItem) => {
    if (notif.level === "accion_hoy") {
      onUpdateCRM(notif.g.id, { fechaProximaAccion: tomorrow() });
    } else {
      // Reset follow-up clock by setting ultimoSeguimiento to now
      onUpdateCRM(notif.g.id, {
        ultimoSeguimiento: new Date().toISOString(),
        historial: [
          {
            fecha: new Date().toISOString(),
            tipo: "estado_cambiado" as const,
            detalle: "Seguimiento pospuesto",
          },
          ...(notif.g.historial ?? []),
        ].slice(0, 50),
      });
    }
  };

  // Group by level for display
  const grouped: Record<NotifLevel, NotifItem[]> = {
    riesgo: [],
    vencido: [],
    pendiente: [],
    accion_hoy: [],
  };
  for (const n of notifications) grouped[n.level].push(n);

  const levelOrder: NotifLevel[] = ["riesgo", "vencido", "accion_hoy", "pendiente"];

  return (
    <div className="relative">
      {/* Bell Button */}
      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="relative flex items-center justify-center w-10 h-10 rounded-xl bg-white/10 hover:bg-white/20 transition-colors text-white"
        aria-label={`Notificaciones${count > 0 ? ` (${count})` : ""}`}
      >
        <Bell className="w-5 h-5" style={{ color: "#E6AE33" }} />
        {count > 0 && (
          <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] rounded-full bg-red-500 text-white text-[9px] font-bold flex items-center justify-center px-1 shadow-sm">
            {count > 99 ? "99+" : count}
          </span>
        )}
      </button>

      {/* Panel */}
      {open && (
        <div
          ref={panelRef}
          className="absolute right-0 top-[calc(100%+8px)] w-[380px] max-h-[520px] bg-white rounded-2xl shadow-2xl ring-1 ring-slate-200 flex flex-col z-[200] overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100 bg-slate-50 shrink-0">
            <div className="flex items-center gap-2">
              <Bell className="w-4 h-4 text-slate-600" />
              <span className="text-sm font-semibold text-slate-800">
                Notificaciones
              </span>
              {count > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-[10px] font-bold">
                  {count}
                </span>
              )}
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-slate-200 text-slate-400 transition-colors"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Content */}
          <div className="overflow-y-auto flex-1">
            {count === 0 ? (
              <div className="flex flex-col items-center justify-center py-12 gap-3 text-slate-400">
                <Check className="w-8 h-8 text-emerald-400" />
                <div className="text-sm font-medium text-slate-500">
                  Todo al día
                </div>
                <div className="text-xs text-slate-400">
                  No hay alertas pendientes
                </div>
              </div>
            ) : (
              <div className="divide-y divide-slate-100">
                {levelOrder.map((level) => {
                  const notifs = grouped[level];
                  if (notifs.length === 0) return null;
                  const meta = LEVEL_META[level];
                  return (
                    <div key={level}>
                      {/* Section header */}
                      <div className={`flex items-center gap-2 px-4 py-2 border-b ${meta.color}`}>
                        {level === "riesgo" && (
                          <ShieldAlert className={`w-3.5 h-3.5 ${meta.iconColor}`} />
                        )}
                        {level === "vencido" && (
                          <AlertTriangle className={`w-3.5 h-3.5 ${meta.iconColor}`} />
                        )}
                        {level === "pendiente" && (
                          <Clock className={`w-3.5 h-3.5 ${meta.iconColor}`} />
                        )}
                        {level === "accion_hoy" && (
                          <AlarmClock className={`w-3.5 h-3.5 ${meta.iconColor}`} />
                        )}
                        <span className={`text-[11px] font-bold uppercase tracking-wide ${meta.iconColor}`}>
                          {meta.label}
                        </span>
                        <span className={`ml-auto text-[10px] font-bold px-1.5 py-0.5 rounded-full ${meta.dotColor} text-white`}>
                          {notifs.length}
                        </span>
                      </div>

                      {/* Notification items */}
                      {notifs.map((notif) => (
                        <NotifRow
                          key={notif.g.id}
                          notif={notif}
                          onView={() => { onView(notif.g); setOpen(false); }}
                          onRealizada={() => handleMarcarRealizada(notif)}
                          onPosponer={() => handlePosponer(notif)}
                        />
                      ))}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Footer */}
          {count > 0 && (
            <div className="px-4 py-2.5 border-t border-slate-100 bg-slate-50 shrink-0">
              <p className="text-[11px] text-slate-400 text-center">
                {count} alerta{count !== 1 ? "s" : ""} activa{count !== 1 ? "s" : ""}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notification Row ─────────────────────────────────────────────────────────

function NotifRow({
  notif,
  onView,
  onRealizada,
  onPosponer,
}: {
  notif: NotifItem;
  onView: () => void;
  onRealizada: () => void;
  onPosponer: () => void;
}) {
  const { g, level, days } = notif;
  const nombre = g.cliente.nombre || "(sin nombre)";

  const subtitle =
    level === "accion_hoy"
      ? g.tipoProximaAccion
        ? `${TIPO_ACCION_LABELS[g.tipoProximaAccion]} programado para hoy`
        : "Recordatorio para hoy"
      : days !== undefined
        ? `${days} día${days !== 1 ? "s" : ""} sin seguimiento`
        : "Sin seguimiento reciente";

  const TipoIcon =
    g.tipoProximaAccion && level === "accion_hoy"
      ? TIPO_ACCION_ICONS[g.tipoProximaAccion]
      : null;

  return (
    <div className="px-4 py-3 hover:bg-slate-50/60 transition-colors group">
      <div className="flex items-start gap-3">
        <div className="mt-0.5 shrink-0">
          {TipoIcon ? (
            <TipoIcon className="w-4 h-4 text-blue-500" />
          ) : level === "riesgo" ? (
            <ShieldAlert className="w-4 h-4 text-red-500" />
          ) : level === "vencido" ? (
            <AlertTriangle className="w-4 h-4 text-orange-500" />
          ) : (
            <Clock className="w-4 h-4 text-amber-500" />
          )}
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-semibold text-slate-900 truncate">
            {nombre}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5 truncate">
            {subtitle}
          </div>
          {g.observacionSeguimiento && (
            <div className="text-[11px] text-slate-400 italic mt-0.5 truncate">
              {g.observacionSeguimiento}
            </div>
          )}
        </div>
      </div>
      {/* Action buttons */}
      <div className="flex items-center gap-1.5 mt-2 ml-7">
        <button
          type="button"
          onClick={onView}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 hover:bg-slate-700 text-white text-[11px] font-medium transition-colors"
        >
          <ExternalLink className="w-3 h-3" />
          Abrir
        </button>
        <button
          type="button"
          onClick={onRealizada}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-50 hover:bg-emerald-100 text-emerald-700 text-[11px] font-medium ring-1 ring-emerald-200 transition-colors"
        >
          <Check className="w-3 h-3" />
          Realizada
        </button>
        <button
          type="button"
          onClick={onPosponer}
          className="flex items-center gap-1 px-2.5 py-1 rounded-md bg-amber-50 hover:bg-amber-100 text-amber-700 text-[11px] font-medium ring-1 ring-amber-200 transition-colors"
        >
          <AlarmClock className="w-3 h-3" />
          Posponer
        </button>
      </div>
    </div>
  );
}
