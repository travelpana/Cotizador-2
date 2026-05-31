import {
  Plane,
  FileSpreadsheet,
  ListChecks,
  LayoutTemplate,
  BookOpen,
  Tag,
  HardDrive,
  Settings2,
  ChevronDown,
} from "lucide-react";
import { useState } from "react";

export type View = "cotizador" | "seguimiento" | "plantillas" | "descriptivos" | "tarifas" | "respaldos";

const CONFIG_VIEWS: View[] = ["plantillas", "descriptivos", "tarifas", "respaldos"];

interface Props {
  view: View;
  onView: (v: View) => void;
  seguimientoCount: number;
  plantillasCount: number;
}

export default function Sidebar({ view, onView, seguimientoCount, plantillasCount }: Props) {
  const isConfigView = CONFIG_VIEWS.includes(view);
  const [configOpen, setConfigOpen] = useState(isConfigView);

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

      <nav className="p-4 flex-1 space-y-1 overflow-y-auto">
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

        <div className="pt-5">
          <div className="border-t border-sidebar-border mb-4" />
          <button
            onClick={() => {
              setConfigOpen((o) => !o);
              if (!configOpen && !isConfigView) {
                onView("plantillas");
              }
            }}
            className={`w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-xs font-semibold uppercase tracking-widest transition-colors ${
              isConfigView
                ? "text-primary"
                : "text-sidebar-foreground/40 hover:text-sidebar-foreground/70"
            }`}
          >
            <span className="flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5" />
              Configuración
            </span>
            <ChevronDown
              className={`w-3.5 h-3.5 transition-transform duration-200 ${configOpen ? "rotate-0" : "-rotate-90"}`}
            />
          </button>

          {configOpen && (
            <div className="mt-1 space-y-0.5 pl-2 border-l border-sidebar-border ml-3">
              <NavItem
                active={view === "plantillas"}
                onClick={() => onView("plantillas")}
                icon={<LayoutTemplate className="w-4 h-4" />}
                label="Plantillas"
                badge={plantillasCount}
                sub
              />
              <NavItem
                active={view === "descriptivos"}
                onClick={() => onView("descriptivos")}
                icon={<BookOpen className="w-4 h-4" />}
                label="Descriptivos"
                sub
              />
              <NavItem
                active={view === "tarifas"}
                onClick={() => onView("tarifas")}
                icon={<Tag className="w-4 h-4" />}
                label="Tarifas"
                sub
              />
              <NavItem
                active={view === "respaldos"}
                onClick={() => onView("respaldos")}
                icon={<HardDrive className="w-4 h-4" />}
                label="Respaldos"
                sub
              />
            </div>
          )}
        </div>
      </nav>
    </aside>
  );
}

function NavItem({
  active,
  onClick,
  icon,
  label,
  badge,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  badge?: number;
  sub?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className={`w-full flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-colors ${
        sub ? "py-1.5" : ""
      } ${
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
