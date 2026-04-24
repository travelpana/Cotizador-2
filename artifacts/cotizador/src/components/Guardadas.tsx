import { useEffect, useState } from "react";
import { ChevronDown, ChevronRight, FolderOpen, Trash2 } from "lucide-react";
import type { Acomodacion, Cliente, ServicioSeleccionado } from "@/lib/types";
import { fmt } from "@/lib/calc";

export interface CotizacionGuardada {
  id: string;
  fechaCreacion: string;
  cliente: Cliente;
  servicios: ServicioSeleccionado[];
  acomodaciones: Acomodacion[];
}

const STORAGE_KEY = "cotizador.guardadas";

export function loadGuardadas(): CotizacionGuardada[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as CotizacionGuardada[];
  } catch {
    return [];
  }
}

export function saveGuardadas(items: CotizacionGuardada[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

interface Props {
  refresh: number;
  onLoad: (g: CotizacionGuardada) => void;
}

export default function Guardadas({ refresh, onLoad }: Props) {
  const [open, setOpen] = useState(false);
  const [items, setItems] = useState<CotizacionGuardada[]>([]);

  useEffect(() => {
    setItems(loadGuardadas());
  }, [refresh]);

  const remove = (id: string) => {
    const next = items.filter((x) => x.id !== id);
    saveGuardadas(next);
    setItems(next);
  };

  return (
    <div className="card-white">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between p-4 text-left"
      >
        <div className="flex items-center gap-2">
          {open ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
          <FolderOpen className="w-4 h-4 text-primary" />
          <span className="font-medium text-slate-900">
            Cotizaciones guardadas ({items.length})
          </span>
        </div>
      </button>
      {open && (
        <div className="px-4 pb-4 space-y-2">
          {items.length === 0 ? (
            <div className="text-sm text-slate-500 py-4 text-center border border-dashed border-slate-200 rounded">
              Aún no hay cotizaciones guardadas
            </div>
          ) : (
            items.map((g) => (
              <div
                key={g.id}
                className="border border-slate-200 rounded-md p-3 flex items-center justify-between gap-3"
              >
                <div className="min-w-0">
                  <div className="text-sm font-medium text-slate-900 truncate">
                    {g.cliente.nombre || "(sin nombre)"}
                  </div>
                  <div className="text-xs text-slate-500">
                    {g.cliente.fechaInicio || "—"} · {g.cliente.pasajeros} pax · {g.servicios.length} servicios
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => onLoad(g)}
                    className="px-3 py-1.5 rounded-md bg-primary text-primary-foreground text-xs font-medium"
                  >
                    Cargar
                  </button>
                  <button
                    onClick={() => remove(g.id)}
                    className="p-1.5 rounded-md text-red-600 hover:bg-red-50"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// Helper to format saved snapshot summary
export function summarizeTotal(amount: number) {
  return fmt(amount);
}
