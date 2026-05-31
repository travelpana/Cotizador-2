import {
  FileSpreadsheet,
  ListChecks,
  LayoutTemplate,
  BookOpen,
  Tag,
  HardDrive,
  Settings2,
  ChevronDown,
  Building2,
} from "lucide-react";
import logoRge from "@assets/style-travel-white_1780208517991.png";
import { useState } from "react";

export type View = "cotizador" | "seguimiento" | "agencias" | "plantillas" | "descriptivos" | "tarifas" | "respaldos";

const CONFIG_VIEWS: View[] = ["plantillas", "descriptivos", "tarifas", "agencias", "respaldos"];

interface Props {
  view: View;
  onView: (v: View) => void;
}

export default function Sidebar({ view, onView }: Props) {
  const isConfigView = CONFIG_VIEWS.includes(view);
  const [configOpen, setConfigOpen] = useState(isConfigView);

  return (
    <div
      className="w-[230px] shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ padding: "12px 0 12px 12px" }}
    >
      <aside
        className="flex-1 flex flex-col text-white overflow-hidden"
        style={{
          backgroundColor: "rgba(4,25,65,0.93)",
          backdropFilter: "blur(10px)",
          WebkitBackdropFilter: "blur(10px)",
          borderRadius: 20,
          border: "1px solid rgba(255,255,255,0.08)",
          boxShadow: "0 4px 24px rgba(4,25,65,0.22), inset 0 1px 0 rgba(255,255,255,0.07)",
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "22px 20px 18px",
            borderBottom: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <img
            src={logoRge}
            alt="RGE Style Travel"
            style={{ display: "block", maxHeight: 82, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Nav */}
        <nav className="p-3 flex-1 space-y-0.5 overflow-y-auto">
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
          />

          <div className="pt-4">
            <div className="mb-3" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }} />
            <button
              onClick={() => {
                setConfigOpen((o) => !o);
                if (!configOpen && !isConfigView) {
                  onView("plantillas");
                }
              }}
              className="w-full flex items-center justify-between gap-2 px-3 py-1.5 rounded-xl text-xs font-semibold uppercase tracking-widest transition-colors"
              style={{ color: isConfigView ? "#eec774" : "rgba(255,255,255,0.4)" }}
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
              <div className="mt-1 space-y-0.5 pl-2 ml-3" style={{ borderLeft: "1px solid rgba(255,255,255,0.08)" }}>
                <NavItem
                  active={view === "plantillas"}
                  onClick={() => onView("plantillas")}
                  icon={<LayoutTemplate className="w-4 h-4" />}
                  label="Plantillas"
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
                  active={view === "agencias"}
                  onClick={() => onView("agencias")}
                  icon={<Building2 className="w-4 h-4" />}
                  label="Agencias"
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
    </div>
  );
}

function NavItem({ active, onClick, icon, label, sub }: {
  active: boolean; onClick: () => void; icon: React.ReactNode; label: string; sub?: boolean;
}) {
  return (
    <div className="relative">
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-r-full" style={{ backgroundColor: "#EEC774" }} />
      )}
      <button
        onClick={onClick}
        className={`w-full flex items-center gap-2 pl-4 pr-3 rounded-xl transition-colors outline-none focus:outline-none focus-visible:outline-none ${sub ? "py-1.5" : "py-2"}`}
        style={{
          fontSize: sub ? 13 : 14,
          fontWeight: 600,
          ...(active
            ? { color: "#EEC774", backgroundColor: "rgba(238,199,116,0.10)" }
            : { color: "rgba(255,255,255,0.7)", backgroundColor: "transparent" }),
        }}
        onMouseEnter={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "rgba(255,255,255,0.07)"; }}
        onMouseLeave={(e) => { if (!active) (e.currentTarget as HTMLButtonElement).style.backgroundColor = "transparent"; }}
      >
        <span className="flex items-center gap-3">
          {icon}
          {label}
        </span>
      </button>
    </div>
  );
}
