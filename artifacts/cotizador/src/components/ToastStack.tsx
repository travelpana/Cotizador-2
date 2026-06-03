import { CheckCircle2, Info, AlertTriangle, XCircle, X } from "lucide-react";

export type ToastTone = "success" | "info" | "warning" | "error";

export interface ToastItem {
  id: string;
  msg: string;
  tone: ToastTone;
  leaving?: boolean;
}

const TONE_CFG: Record<ToastTone, {
  icon: React.ReactNode;
  iconColor: string;
  barColor: string;
}> = {
  success: {
    icon: <CheckCircle2 className="w-4 h-4 shrink-0" />,
    iconColor: "#03A04E",
    barColor: "#03A04E",
  },
  info: {
    icon: <Info className="w-4 h-4 shrink-0" />,
    iconColor: "#004FBB",
    barColor: "#004FBB",
  },
  warning: {
    icon: <AlertTriangle className="w-4 h-4 shrink-0" />,
    iconColor: "#E6AE33",
    barColor: "#E6AE33",
  },
  error: {
    icon: <XCircle className="w-4 h-4 shrink-0" />,
    iconColor: "#E55353",
    barColor: "#E55353",
  },
};

interface Props {
  toasts: ToastItem[];
  onDismiss: (id: string) => void;
}

export default function ToastStack({ toasts, onDismiss }: Props) {
  if (toasts.length === 0) return null;

  return (
    <div
      role="region"
      aria-label="Notificaciones"
      style={{
        position: "fixed",
        top: 24,
        right: 24,
        zIndex: 9999,
        display: "flex",
        flexDirection: "column",
        gap: 12,
        pointerEvents: "none",
        minWidth: 280,
        maxWidth: 400,
      }}
    >
      {toasts.map((t) => {
        const cfg = TONE_CFG[t.tone];
        return (
          <div
            key={t.id}
            role="status"
            aria-live="polite"
            className={t.leaving ? "toast-leave" : "toast-enter"}
            style={{
              pointerEvents: "auto",
              background: "#fff",
              borderRadius: 16,
              boxShadow: "0 8px 32px rgba(4,25,65,0.13), 0 1px 4px rgba(0,0,0,0.06)",
              border: "1px solid rgba(4,25,65,0.08)",
              borderLeft: `4px solid ${cfg.barColor}`,
              display: "flex",
              alignItems: "center",
              gap: 12,
              padding: "12px 14px",
              minHeight: 52,
            }}
          >
            <span style={{ color: cfg.iconColor, display: "flex", alignItems: "center" }}>
              {cfg.icon}
            </span>
            <span
              style={{
                flex: 1,
                fontSize: 13,
                fontWeight: 500,
                color: "#07152f",
                lineHeight: 1.4,
              }}
            >
              {t.msg}
            </span>
            <button
              type="button"
              onClick={() => onDismiss(t.id)}
              aria-label="Cerrar notificación"
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                borderRadius: 8,
                border: "none",
                background: "transparent",
                color: "#94a3b8",
                cursor: "pointer",
                padding: 0,
                flexShrink: 0,
                transition: "background 0.15s",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f1f5f9"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        );
      })}
    </div>
  );
}
