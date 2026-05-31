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
import logoRge from "@assets/style-travel-blue__1780204454850.png";
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
      className="w-[240px] shrink-0 h-screen sticky top-0 flex flex-col"
      style={{ padding: "12px 0 12px 12px" }}
    >
      <aside
        className="flex-1 flex flex-col overflow-hidden"
        style={{
          background: "rgba(255, 255, 255, 0.88)",
          backdropFilter: "blur(18px)",
          WebkitBackdropFilter: "blur(18px)",
          border: "1px solid rgba(255, 255, 255, 0.6)",
          boxShadow: "0 12px 40px rgba(4, 25, 65, 0.08)",
          borderRadius: 24,
        }}
      >
        {/* Logo */}
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
            padding: "22px 20px 18px",
            borderBottom: "1px solid rgba(4, 25, 65, 0.07)",
          }}
        >
          <img
            src={logoRge}
            alt="RGE Style Travel"
            style={{ display: "block", maxWidth: 150, maxHeight: 82, width: "auto", objectFit: "contain" }}
          />
        </div>

        {/* Nav */}
        <nav className="flex-1 overflow-y-auto" style={{ padding: "12px 10px" }}>
          <div className="space-y-0.5">
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
          </div>

          <div className="pt-4">
            <div className="mb-2" style={{ borderTop: "1px solid rgba(4, 25, 65, 0.07)" }} />
            <button
              onClick={() => {
                setConfigOpen((o) => !o);
                if (!configOpen && !isConfigView) {
                  onView("plantillas");
                }
              }}
              className="w-full flex items-center justify-between gap-2 rounded-xl text-xs font-semibold uppercase tracking-widest transition-all duration-200 outline-none focus:outline-none"
              style={{
                color: "#64748b",
                padding: "6px 12px",
                background: "transparent",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#004fbb";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLButtonElement).style.color = "#64748b";
              }}
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
              <div
                className="mt-1 space-y-0.5"
                style={{ paddingLeft: 8, marginLeft: 12, borderLeft: "1px solid rgba(4, 25, 65, 0.08)" }}
              >
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

function NavItem({
  active,
  onClick,
  icon,
  label,
  sub,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
  sub?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-3 rounded-2xl outline-none focus:outline-none focus-visible:outline-none"
      style={{
        fontSize: sub ? 13 : 14,
        fontWeight: 600,
        padding: sub ? "7px 12px" : "9px 12px",
        transition: "all 0.2s ease",
        borderLeft: active ? "4px solid #004fbb" : "4px solid transparent",
        ...(active
          ? {
              background: "#edf4ff",
              color: "#004fbb",
            }
          : {
              background: "transparent",
              color: "#07152f",
            }),
      }}
      onMouseEnter={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "rgba(0, 79, 187, 0.06)";
          el.style.color = "#004fbb";
        }
      }}
      onMouseLeave={(e) => {
        if (!active) {
          const el = e.currentTarget as HTMLButtonElement;
          el.style.background = "transparent";
          el.style.color = "#07152f";
        }
      }}
    >
      <span
        style={{
          color: active ? "#004fbb" : "inherit",
          display: "flex",
          alignItems: "center",
        }}
      >
        {icon}
      </span>
      {label}
    </button>
  );
}
