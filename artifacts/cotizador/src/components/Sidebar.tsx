import { Plane, FileSpreadsheet, RefreshCw } from "lucide-react";
import { useState } from "react";
import { api } from "@/lib/api";

interface Props {
  onReload?: () => void;
}

export default function Sidebar({ onReload }: Props) {
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
        <a
          href="#cotizador"
          className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary/10 text-primary text-sm"
        >
          <FileSpreadsheet className="w-4 h-4" />
          Cotizador
        </a>
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
