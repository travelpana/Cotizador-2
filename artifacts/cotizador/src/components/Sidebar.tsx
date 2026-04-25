import { Plane, FileSpreadsheet, RefreshCw, ListChecks } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";

export type View = "cotizador" | "seguimiento";

interface Props {
  view: View;
  onView: (v: View) => void;
  seguimientoCount: number;
  onReload?: () => void;
}

export default function Sidebar({
  view,
  onView,
  seguimientoCount,
  onReload,
}: Props) {
  const [reloading, setReloading] = useState(false);

  const handleReload = async () => {
    setReloading(true);
    try {
      await api.reload();
      onReload?.();
    } finally {
      setReloading(false);
    }
  };

  return (
    <aside className="w-64 shrink-0 bg-sidebar text-sidebar-foreground border-r border-sidebar-border h-screen sticky top-0 flex flex-col">
      <div className="p-6 border-b border-sidebar-border">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-primary/15 text-primary flex items-center justify-center">
            <Plane className="w-5 h-5" />
          </div>
          <div>
            <div className="font-semibold tracking-tight">RGE Style Travel</div>
            <div className="text-xs text-muted-foreground">Cotizador 2026</div>
          </div>
        </div>
      </div>

      <nav className="p-4 flex-1 space-y-1">
        <NavItem
          active={view === "cotizador"}
          onClick={() => onView("cotizador")}
          icon={<FileSpreadsheet className="w-4 h-4" />}
          label="Cotizador"
        />
        <NavItem
          active={view === "seguimiento"}
          onClick={() => onView("seguimiento")}
          icon={<ListChecks className="w-4 h-4" />}
          label="Seguimiento"
          badge={seguimientoCount}
        />
      </nav>

      <div className="p-4 border-t border-sidebar-border">
        <button
          onClick={handleReload}
          disabled={reloading}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80 text-sm disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${reloading ? "animate-spin" : ""}`} />
          {reloading ? "Recargando..." : "Recargar tarifario"}
        </button>
        <p className="mt-3 text-[11px] text-muted-foreground leading-snug">
          Datos cargados desde el archivo Excel TARIFARIO.xlsx
        </p>
      </div>
    </aside>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  badge,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        active
          ? "bg-primary/10 text-primary"
          : "text-sidebar-foreground/80 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground"
      }`}
    >
      <span className="flex items-center gap-3">
        {icon}
        {label}
      </span>
      {badge !== undefined && badge > 0 && (
        <span
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
            active
              ? "bg-primary/20 text-primary"
              : "bg-sidebar-accent text-sidebar-accent-foreground"
          }`}
        >
          {badge}
        </span>
      )}
    </button>
  );
}
