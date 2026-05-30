import {
  Plane,
  FileSpreadsheet,
  RefreshCw,
  ListChecks,
  Check,
  AlertCircle,
  Upload,
  FileText,
  LayoutTemplate,
  BookOpen,
  Tag,
  HardDrive,
} from "lucide-react";
import { useRef, useState } from "react";
import type { CatalogInfo } from "@/lib/api";

export type View = "cotizador" | "seguimiento" | "plantillas" | "descriptivos" | "tarifas" | "respaldos";

interface Props {
  view: View;
  onView: (v: View) => void;
  seguimientoCount: number;
  plantillasCount: number;
  fileInfo?: CatalogInfo | null;
  onReload?: () => Promise<void>;
  onUpload?: (file: File) => Promise<void>;
}

type ActionStatus = "idle" | "loading" | "success" | "error";

function useAsyncAction(timeout = 2800) {
  const [status, setStatus] = useState<ActionStatus>("idle");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const run = async (fn: () => Promise<void>) => {
    if (status === "loading") return;
    setStatus("loading");
    setErrorMsg(null);
    try {
      await fn();
      setStatus("success");
      window.setTimeout(() => setStatus("idle"), timeout);
    } catch (e) {
      console.error(e);
      setErrorMsg((e as Error).message);
      setStatus("error");
      window.setTimeout(() => {
        setStatus("idle");
        setErrorMsg(null);
      }, timeout + 700);
    }
  };

  return { status, errorMsg, run };
}

function formatRelativeTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "hace un momento";
  if (mins < 60) return `hace ${mins} min`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `hace ${hrs} h`;
  const days = Math.floor(hrs / 24);
  return `hace ${days} día${days !== 1 ? "s" : ""}`;
}

export default function Sidebar({
  view,
  onView,
  seguimientoCount,
  plantillasCount,
  fileInfo,
  onReload,
  onUpload,
}: Props) {
  const reload = useAsyncAction();
  const upload = useAsyncAction();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleReload = () =>
    reload.run(async () => {
      await onReload?.();
    });

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = "";
    if (!file.name.toLowerCase().endsWith(".xlsx")) {
      alert("Solo se admiten archivos .xlsx");
      return;
    }
    await upload.run(async () => {
      await onUpload?.(file);
    });
  };

  const reloadLabel = {
    idle: "Recargar tarifario",
    loading: "Actualizando...",
    success: "Tarifario actualizado",
    error: "Error al recargar",
  }[reload.status];

  const reloadIcon =
    reload.status === "loading" ? (
      <RefreshCw className="w-4 h-4 animate-spin" />
    ) : reload.status === "success" ? (
      <Check className="w-4 h-4" />
    ) : reload.status === "error" ? (
      <AlertCircle className="w-4 h-4" />
    ) : (
      <RefreshCw className="w-4 h-4" />
    );

  const reloadCls =
    reload.status === "success"
      ? "bg-emerald-600/15 text-emerald-700"
      : reload.status === "error"
        ? "bg-red-500/10 text-red-600"
        : "bg-sidebar-accent text-sidebar-accent-foreground hover:bg-sidebar-accent/80";

  const uploadLabel = {
    idle: "Subir nuevo tarifario",
    loading: "Subiendo...",
    success: "Nuevo tarifario cargado",
    error: upload.errorMsg ?? "Error al subir",
  }[upload.status];

  const uploadIcon =
    upload.status === "loading" ? (
      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
    ) : upload.status === "success" ? (
      <Check className="w-3.5 h-3.5" />
    ) : upload.status === "error" ? (
      <AlertCircle className="w-3.5 h-3.5" />
    ) : (
      <Upload className="w-3.5 h-3.5" />
    );

  const uploadCls =
    upload.status === "success"
      ? "text-emerald-700 border-emerald-300 bg-emerald-50"
      : upload.status === "error"
        ? "text-red-600 border-red-300 bg-red-50"
        : "text-sidebar-foreground/70 border-sidebar-border hover:bg-sidebar-accent/40 hover:text-sidebar-foreground";

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
        />
        <NavItem
          active={view === "plantillas"}
          onClick={() => onView("plantillas")}
          icon={<LayoutTemplate className="w-4 h-4" />}
          label="Plantillas"
        />
        <NavItem
          active={view === "descriptivos"}
          onClick={() => onView("descriptivos")}
          icon={<BookOpen className="w-4 h-4" />}
          label="Descriptivos"
        />
        <NavItem
          active={view === "tarifas"}
          onClick={() => onView("tarifas")}
          icon={<Tag className="w-4 h-4" />}
          label="Tarifas"
        />
        <NavItem
          active={view === "respaldos"}
          onClick={() => onView("respaldos")}
          icon={<HardDrive className="w-4 h-4" />}
          label="Respaldos"
        />
      </nav>

      <div className="p-4 border-t border-sidebar-border space-y-3">
        <div className="flex items-start gap-2 px-1">
          <FileText className="w-3.5 h-3.5 mt-0.5 text-muted-foreground shrink-0" />
          <div className="min-w-0">
            <p className="text-[11px] font-medium text-sidebar-foreground truncate">
              {fileInfo?.filename ?? "TARIFARIO.xlsx"}
            </p>
            <p className="text-[10px] text-muted-foreground">
              {formatRelativeTime(fileInfo?.loadedAt)}
            </p>
          </div>
        </div>

        <button
          onClick={handleReload}
          disabled={reload.status === "loading" || upload.status === "loading"}
          className={`w-full flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${reloadCls}`}
        >
          {reloadIcon}
          {reloadLabel}
        </button>

        <button
          onClick={() => fileInputRef.current?.click()}
          disabled={upload.status === "loading" || reload.status === "loading"}
          className={`w-full flex items-center justify-center gap-1.5 px-3 py-1.5 rounded-md text-xs border transition-colors disabled:opacity-60 disabled:cursor-not-allowed ${uploadCls}`}
        >
          {uploadIcon}
          <span className="truncate">{uploadLabel}</span>
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept=".xlsx"
          className="hidden"
          onChange={handleFileChange}
        />
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
